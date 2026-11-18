import { relative, resolve, sep, join } from 'node:path'
import { access } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { AuditAdapter, AuditInput } from '../core/audit-adapter.ts'
import type { DepGraph, RawFinding } from '../core/types.ts'
import { computeCoupling, findCycles } from '../core/graph-core.ts'
import { canonicalCycleKey } from '../core/cycle-key.ts'
import { detectMetricFindings } from '../core/metric-findings.ts'
import { fileToModule } from '../core/source-scope.ts'
import { readCmakeModel, type CmakeTarget } from './cpp/cmake-model.ts'
import { collectIncludes } from './cpp/preprocessor.ts'
import { matchCppProjectRules, type CppEdge } from './cpp/project-findings.ts'

function within(path: string, root: string): boolean { return path === root || path.startsWith(root + sep) }
function componentCycles(graph: DepGraph, component: string[]): string[][] {
  const allowed = new Set(component), found = new Map<string, string[]>()
  for (const start of component) {
    const walk = (node: string, path: string[]) => {
      for (const next of graph[node] ?? []) {
        if (!allowed.has(next) || next < start) continue
        if (next === start && path.length > 1) {
          const key = canonicalCycleKey(path)
          if (!found.has(key)) {
            if (found.size >= 10_000) throw new Error('Too many module cycles to enumerate completely; audit input is incomplete')
            found.set(key, path)
          }
        } else if (!path.includes(next)) walk(next, [...path, next])
      }
    }
    walk(start, [start])
  }
  return [...found.values()]
}
export function createCppCmakeAdapter(): AuditAdapter {
  return {
    name: 'cpp-cmake',
    async collect(options): Promise<AuditInput> {
      if (!options.buildDir) throw new Error('C++/CMake audit requires an explicit configured build directory')
      const root = resolve(options.projectRoot), build = resolve(options.buildDir)
      const model = await readCmakeModel(root, build, options.configuration, options.moduleRoot)
      const cmakeVersion = (await promisify(execFile)('cmake', ['--version'])).stdout.split('\n')[0]?.replace(/^cmake version /, '')
      if (!cmakeVersion) throw new Error('Cannot determine CMake version')
      const moduleFiles = new Map<string, Set<string>>()
      const sourceLocators = new Map<string, { module: string; file: string }>()
      const edges: CppEdge[] = []
      const versions = new Set<string>()
      const unresolved = new Set<string>()
      const moduleFor = (path: string) => within(path, build) ? null : fileToModule(relative(root, path).split(sep).join('/'), options.moduleRoot)
      const addSource = (absolute: string) => {
        if (!/\.(c|cc|cpp|cxx|m|mm|h|hh|hpp|hxx|inl|inc)$/i.test(absolute)) return
        const module = moduleFor(absolute)
        if (!module) return
        const file = relative(root, absolute).split(sep).join('/')
        if (!moduleFiles.has(module)) moduleFiles.set(module, new Set())
        moduleFiles.get(module)!.add(file)
        sourceLocators.set(`${module}\0${file}`, { module, file })
      }
      for (const target of model.targets.filter(target => !target.external)) {
        for (const source of target.sources) if (!source.generated) addSource(source.path)
      }
      for (const { command, target: ownerName } of model.compilationCommands) {
        const owner = model.targets.find(item => item.name === ownerName)!
        const reachable = new Set([ownerName])
        const queue = [ownerName]
        for (let i = 0; i < queue.length; i++) {
          for (const link of model.links) if (link.from === queue[i] && !reachable.has(link.to)) {
            reachable.add(link.to)
            queue.push(link.to)
          }
        }
        const result = await collectIncludes(command)
          versions.add(result.compilerVersion)
          for (const file of result.visitedFiles) addSource(file)
          const generatedOrigins = new Map<string, { module: string; file: string }>()
          const unitPath = resolve(command.directory, command.file)
          if (within(unitPath, build)) {
            if (owner.modules.length !== 1) throw new Error(`Ambiguous module ownership for generated translation unit ${unitPath}`)
            const module = owner.modules[0]!
            const file = owner.sources.find(item => !item.generated && moduleFor(item.path) === module)?.path
            if (!file) throw new Error(`Cannot locate module source for generated translation unit ${unitPath}`)
            generatedOrigins.set(unitPath, { module, file: relative(root, file).split(sep).join('/') })
          }
          for (const edge of result.edges) {
            const directModule = moduleFor(edge.from)
            const source = directModule ? { module: directModule, file: relative(root, edge.from).split(sep).join('/') } : generatedOrigins.get(edge.from)
            if (!source) {
              if (within(edge.from, build)) unresolved.add(`Generated header origin unresolved: ${edge.from}`)
              continue
            }
            const generated = !directModule
            const evidenceFile = generated ? relative(root, edge.from).split(sep).join('/') : undefined
            if (generated) unresolved.add(`Generated include attributed to module ${source.module} using representative ${source.file}; evidence: ${evidenceFile}`)
            if (within(edge.to, build)) {
              const previous = generatedOrigins.get(edge.to)
              if (previous && previous.module !== source.module) throw new Error(`Ambiguous module ownership for generated header ${edge.to}`)
              generatedOrigins.set(edge.to, source)
            }
            const sourceModule = source.module
            const ensureGeneratedScope = (target: string) => {
              if (!generated) return
              const prefixes = [`^${options.moduleRoot}/${sourceModule}/`, `^${options.moduleRoot}/`, '.*']
              for (const rule of [...options.projectRules.forbidden, ...options.projectRules.required]) {
                if (rule.to?.path !== undefined && !new RegExp(rule.to.path).test(target)) continue
                const from = rule.from?.path
                if (from !== undefined && !prefixes.includes(from) && !prefixes.some(prefix => from === `${prefix}.*`)) {
                  throw new Error(`Cannot determine generated include source for scoped rule ${rule.name}: ${edge.from}`)
                }
              }
            }
            const targetModule = moduleFor(edge.to)
            if (targetModule) {
              if (targetModule !== sourceModule) ensureGeneratedScope(relative(root, edge.to).split(sep).join('/'))
              edges.push({ kind: 'include', source, target: { module: targetModule, file: relative(root, edge.to).split(sep).join('/') }, line: edge.line, evidenceFile })
              continue
            }
            const matches = model.externalTargets.flatMap(target => target.includeRoots.filter(path => !path.includes('$<') && within(edge.to, resolve(path))).map(path => ({ name: target.name, length: resolve(path).length })))
            const longest = Math.max(0, ...matches.map(match => match.length))
            const implicitLength = Math.max(0, ...result.implicitSearchRoots.filter(path => within(edge.to, path)).map(path => path.length))
            const envRoots = ['CPATH', 'C_INCLUDE_PATH', 'CPLUS_INCLUDE_PATH', 'OBJC_INCLUDE_PATH'].flatMap(name => (process.env[name] ?? '').split(':').filter(Boolean).map(path => resolve(command.directory, path)))
            const commandRoots = [...result.explicitSearchRoots, ...envRoots]
            const commandLength = Math.max(0, ...commandRoots.filter(path => within(edge.to, path)).map(path => path.length))
            const explicitRoots = [...owner.includeRoots, ...commandRoots, ...result.includeSearchRoots.filter(path => !result.implicitSearchRoots.includes(path))].map(path => resolve(path))
            const explicitLength = Math.max(0, ...explicitRoots.filter(path => within(edge.to, path)).map(path => path.length))
            let names = [...new Set(matches.filter(match => match.length === longest).map(match => match.name))]
            const ruleRelevant = (name: string) => [...options.projectRules.forbidden, ...options.projectRules.required].some(rule =>
              (rule.from?.path === undefined || new RegExp(rule.from.path).test(source.file)) && (rule.to?.path === undefined || new RegExp(rule.to.path).test(name)))
            if (names.length > 1) {
              const linked = names.filter(name => reachable.has(name))
              if (linked.length && linked.length < names.length) {
                if (names.some(ruleRelevant)) throw new Error(`Ambiguous external include ${edge.to} is relevant to a project rule: ${names.join(', ')}`)
                unresolved.add(`External header owner uncertain: ${edge.to}; candidates: ${names.join(', ')}; linked: ${linked.join(', ')}`)
                names = linked
              }
            }
            if (implicitLength > 0 && implicitLength >= longest && implicitLength >= explicitLength && implicitLength > commandLength) {
              if (names.some(ruleRelevant)) throw new Error(`Ambiguous external include ${edge.to} is relevant to a project rule: ${names.join(', ')}`)
              if (names.length) unresolved.add(`External header owner unresolved: ${edge.to}; candidates: ${names.join(', ')}`)
              else unresolved.add('Implicit compiler/system headers without identified package ownership are not attributed to external targets.')
              continue
            }
            if (names.length > 1) throw new Error(`Ambiguous external include ${edge.to}: ${names.join(', ')}`)
            if (names.length === 0) {
              if (!within(edge.to, build)) throw new Error(`External include ${edge.to} has no identifiable target for ${ownerName}`)
              unresolved.add(`Generated header owner unresolved: ${edge.to}`)
            }
            if (names.length === 1) ensureGeneratedScope(names[0]!)
            if (names.length === 1) edges.push({ kind: 'include', source, target: { module: names[0]!, file: names[0]! }, line: edge.line, external: true, evidenceFile })
          }
      }
      const locator = async (target: CmakeTarget, module: string): Promise<string> => {
        const moduleDir = join(root, options.moduleRoot, module)
        if (target.declarationFile && within(target.declarationFile, moduleDir)) return relative(root, target.declarationFile).split(sep).join('/')
        const candidate = join(moduleDir, 'CMakeLists.txt')
        try { await access(candidate); return relative(root, candidate).split(sep).join('/') }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
        const file = target.sources.find(source => !source.generated && moduleFor(source.path) === module)?.path
        if (!file) throw new Error(`Cannot determine a file locator for module ${module}, target ${target.name}`)
        return relative(root, file).split(sep).join('/')
      }
      const targetByName = new Map(model.targets.map(target => [target.name, target]))
      const external = new Set(model.externalTargets.map(target => target.name))
      for (const link of model.links) {
        const from = targetByName.get(link.from), to = targetByName.get(link.to)
        if (!from || from.external || !from.declarationFile) continue
        if (from.modules.length > 1) throw new Error(`Ambiguous module ownership for CMake target ${from.name}: ${from.modules.join(', ')}`)
        if (to && !to.external && to.modules.length > 1) throw new Error(`Ambiguous module ownership for CMake target ${to.name}: ${to.modules.join(', ')}`)
        const locations = model.linkLocations.filter(location => location.from === link.from && location.to === link.to)
        const location = locations.length === 1 ? locations[0] : undefined
        const evidenceFile = relative(root, location?.file ?? from.declarationFile).split(sep).join('/')
        for (const sourceModule of from.modules) {
          const source = { module: sourceModule, file: await locator(from, sourceModule) }
          sourceLocators.set(`${source.module}\0${source.file}`, source)
          if (to && !to.external && to.declarationFile) {
            for (const targetModule of to.modules) edges.push({ kind: 'link', source, target: { module: targetModule, file: await locator(to, targetModule) }, line: location?.line, evidenceFile })
          } else if (external.has(link.to) || to?.external || !to) edges.push({ kind: 'link', source, target: { module: link.to, file: link.to }, external: true, line: location?.line, evidenceFile })
        }
      }
      if (!moduleFiles.size) throw new Error(`CMake found no production modules under ${options.moduleRoot}/`)
      const module_names = [...moduleFiles.keys()].sort()
      const dep_graph: DepGraph = Object.fromEntries(module_names.map(name => [name, []]))
      const unique = new Map<string, CppEdge>()
      for (const edge of edges) {
        const key = JSON.stringify(edge)
        unique.set(key, edge)
        if (!edge.external && edge.source.module !== edge.target.module && dep_graph[edge.source.module] && dep_graph[edge.target.module] && !dep_graph[edge.source.module]!.includes(edge.target.module)) dep_graph[edge.source.module]!.push(edge.target.module)
      }
      for (const targets of Object.values(dep_graph)) targets.sort()
      const coupling = computeCoupling(dep_graph)
      const per_module_raw = Object.fromEntries(module_names.map(name => [name, { ...coupling[name]!, loc: 0 }]))
      const source_files_by_module = Object.fromEntries(module_names.map(name => [name, [...moduleFiles.get(name)!].sort()]))
      return {
        findings: matchCppProjectRules([...unique.values()], options.projectRules, [...sourceLocators.values()]), dep_graph, per_module_raw,
        source_files_by_module, sdk_edges: [], module_names, tooling_version: `cpp-cmake@1.0.0; cmake=${cmakeVersion}; compiler=${[...versions].join(', ') || 'none'}; configuration=${model.configuration || 'default'}`,
        operator_notes: [...[...unresolved].sort(), 'Правила, не применённые в C++ аудите: baseline:no-orphans, baseline:not-to-test-from-prod, baseline:barrel-file, baseline:layered-respect, baseline:domain-no-channel-sdk, baseline:port-adapter-direction, baseline:architectural-layer-cycle, baseline:vertical-slice-respect, baseline:frontend-layered-respect, baseline:frontend-layer-cycle.'],
      }
    },
    async detectStructural({ depGraph, perModuleRaw }): Promise<RawFinding[]> {
      const findings = detectMetricFindings(depGraph, perModuleRaw)
      for (const component of findCycles(depGraph)) {
        if (component.length < 2) continue
        for (const members of componentCycles(depGraph, component)) {
          findings.push({ rule_id: members.length === 2 ? 'inappropriate-intimacy' : 'no-circular', raw_severity: 'error', type: 'cycle', source: { module: members[0]!, file: '' }, target: { module: members[1]!, file: '' }, extras: { members } })
        }
      }
      return findings
    },
  }
}
