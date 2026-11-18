import { relative, resolve, sep } from 'node:path'
import type { AuditAdapter, AuditInput } from '../core/audit-adapter.ts'
import type { DepGraph, RawFinding } from '../core/types.ts'
import { computeCoupling, findCycles } from '../core/graph-core.ts'
import { canonicalCycleKey } from '../core/cycle-key.ts'
import { detectMetricFindings } from '../core/metric-findings.ts'
import { fileToModule } from '../core/source-scope.ts'
import { readCmakeModel } from './cpp/cmake-model.ts'
import { readCompileCommands } from './cpp/compile-commands.ts'
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
          if (!found.has(key)) found.set(key, path)
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
      const commands = await readCompileCommands(build)
      const moduleFiles = new Map<string, Set<string>>()
      const sourceLocators = new Map<string, { module: string; file: string }>()
      const edges: CppEdge[] = []
      const versions = new Set<string>()
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
      for (const unit of model.translationUnits) {
        let matching = commands.filter(command => resolve(command.directory, command.file) === unit)
        if (model.multiConfig) {
          if (matching.some(command => !command.argv.some(arg => arg.startsWith('-DCMAKE_INTDIR=')))) throw new Error(`Cannot determine compile configuration for ${unit}`)
          matching = matching.filter(command => command.argv.some(arg => arg === `-DCMAKE_INTDIR=\"${model.configuration}\"` || arg === `-DCMAKE_INTDIR=${model.configuration}`))
        }
        if (!matching.length) throw new Error(`Missing compile command for ${unit} in configuration ${model.configuration}`)
        for (const command of matching) {
          const result = await collectIncludes(command)
          versions.add(result.compilerVersion)
          for (const file of result.visitedFiles) addSource(file)
          for (const edge of result.edges) {
            const sourceModule = moduleFor(edge.from)
            if (!sourceModule) continue
            const source = { module: sourceModule, file: relative(root, edge.from).split(sep).join('/') }
            const targetModule = moduleFor(edge.to)
            if (targetModule) {
              edges.push({ kind: 'include', source, target: { module: targetModule, file: relative(root, edge.to).split(sep).join('/') }, line: edge.line })
              continue
            }
            const matches = model.externalTargets.flatMap(target => target.includeRoots.filter(path => !path.includes('$<') && within(edge.to, resolve(path))).map(path => ({ name: target.name, length: resolve(path).length })))
            const longest = Math.max(0, ...matches.map(match => match.length))
            const names = [...new Set(matches.filter(match => match.length === longest).map(match => match.name))]
            if (names.length > 1) throw new Error(`Ambiguous external include ${edge.to}: ${names.join(', ')}`)
            if (names.length === 1) edges.push({ kind: 'include', source, target: { module: names[0]!, file: names[0]! }, line: edge.line, external: true })
          }
        }
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
        const sourceFile = relative(root, location?.file ?? from.declarationFile).split(sep).join('/')
        for (const sourceModule of from.modules) {
          const source = { module: sourceModule, file: sourceFile }
          sourceLocators.set(`${source.module}\0${source.file}`, source)
          if (to && !to.external && to.declarationFile) {
            for (const targetModule of to.modules) edges.push({ kind: 'link', source, target: { module: targetModule, file: relative(root, to.declarationFile).split(sep).join('/') }, line: location?.line })
          } else if (external.has(link.to) || to?.external) edges.push({ kind: 'link', source, target: { module: link.to, file: link.to }, external: true, line: location?.line })
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
        source_files_by_module, sdk_edges: [], module_names, tooling_version: `cpp-cmake (${[...versions].join('; ')})`,
        operator_notes: ['Правила, не применённые в C++ аудите: baseline:no-orphans, baseline:not-to-test-from-prod, baseline:barrel-file, baseline:layered-respect, baseline:domain-no-channel-sdk, baseline:port-adapter-direction, baseline:architectural-layer-cycle, baseline:vertical-slice-respect, baseline:frontend-layered-respect, baseline:frontend-layer-cycle.'],
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
