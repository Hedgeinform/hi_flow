import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileToModule } from '../../core/source-scope.ts'
import { readCompileCommands } from './compile-commands.ts'
import { evaluateConfiguredLinks } from './configured-links.ts'

const exec = promisify(execFile)
export interface CmakeTarget { name: string; type: string; sources: { path: string; generated: boolean }[]; includeRoots: string[]; modules: string[]; external: boolean; owner?: string; declarationFile?: string; declarationLine?: number }
export interface CmakeModel { targets: CmakeTarget[]; links: {from: string; to: string}[]; linkLocations: { from: string; to: string; file: string; line: number }[]; translationUnits: string[]; externalTargets: { name: string; includeRoots: string[] }[]; configuration: string; multiConfig: boolean }

export async function readCmakeModel(projectRoot: string, buildDir: string, configuration?: string, moduleRoot = 'src'): Promise<CmakeModel> {
  const root = resolve(projectRoot), build = resolve(buildDir)
  try { await access(join(build, 'CMakeCache.txt')) } catch { throw new Error(`CMake build directory is not configured: ${build}`) }
  const query = join(build, '.cmake/api/v1/query/client-arch-audit')
  await mkdir(query, { recursive: true })
  await writeFile(join(query, 'query.json'), JSON.stringify({ requests: [{ kind: 'codemodel', version: 2 }] }))
  const dot = join(build, 'arch-audit', 'targets.dot')
  await mkdir(join(build, 'arch-audit'), { recursive: true })
  let trace = ''
  try { ({ stderr: trace } = await exec('cmake', ['-S', root, '-B', build, `--graphviz=${dot}`, '--trace-expand', '--trace-format=json-v1'], { maxBuffer: 64 * 1024 * 1024 })) }
  catch (error) { throw new Error(`CMake refresh failed for build ${build}: ${(error as Error).message}`, { cause: error }) }
  const reply = join(build, '.cmake/api/v1/reply')
  const indices = (await readdir(reply)).filter(name => /^index-.*\.json$/.test(name)).sort()
  if (!indices.length) throw new Error(`CMake File API index missing in build ${build}`)
  const readJson = async (file: string): Promise<any> => JSON.parse(await readFile(join(reply, file), 'utf8'))
  const index = await readJson(indices.at(-1)!)
  const modelRef = index.objects?.find((object: any) => object.kind === 'codemodel')
  if (!modelRef?.jsonFile) throw new Error('CMake File API codemodel missing')
  const model = await readJson(modelRef.jsonFile)
  if (resolve(model.paths.source) !== root) throw new Error(`CMake build source root ${model.paths.source} does not match ${root}; run in the original path environment`)
  const configurations: any[] = model.configurations ?? []
  if (!configuration && configurations.length !== 1) throw new Error('CMake build has multiple configurations; select one explicitly')
  const selected = configuration ? configurations.find(item => item.name === configuration) : configurations[0]
  if (!selected) throw new Error(`CMake configuration not found: ${configuration}`)
  const targets: CmakeTarget[] = []
  for (const ref of selected.targets ?? []) {
    const target = await readJson(ref.jsonFile)
    if (target.type === 'UTILITY') continue
    const sources = (target.sources ?? []).map((source: any) => ({ path: isAbsolute(source.path) ? source.path : resolve(root, source.path), generated: source.isGenerated === true }))
    const includeRoots = [...new Set<string>((target.compileGroups ?? []).flatMap((group: any) => (group.includes ?? []).map((include: any) => include.path as string)))]
    const modules = [...new Set<string>(sources.filter((source: {generated: boolean; path: string}) => !source.generated && /\.(c|cc|cpp|cxx|m|mm|h|hh|hpp|hxx|inl|inc)$/i.test(source.path)).map((source: {path: string}) => fileToModule(relative(root, source.path), moduleRoot)).filter((name: string | null): name is string => !!name))]
    const declaration = target.backtraceGraph?.nodes?.[target.backtrace]
    const declarationPath = target.backtraceGraph?.files?.[declaration?.file]
    const sourceDirectory = resolve(root, target.paths?.source ?? '.')
    const external = sourceDirectory === build || sourceDirectory.startsWith(build + '/') || !(sourceDirectory === root || sourceDirectory.startsWith(root + '/'))
    targets.push({ name: target.name, type: target.type, sources, includeRoots, modules, external,
      ...(declarationPath ? { declarationFile: resolve(root, declarationPath) } : {}),
      ...(typeof declaration?.line === 'number' ? { declarationLine: declaration.line } : {}),
    })
  }
  const records: any[] = []
  for (const line of trace.split('\n')) {
    if (!line.startsWith('{')) continue
    try { records.push(JSON.parse(line)) }
    catch (error) { throw new Error('Malformed CMake JSON trace; audit input is incomplete', { cause: error }) }
  }
  // File API omits INTERFACE libraries. Expanded CMake trace distinguishes local
  // declarations from IMPORTED libraries without guessing from Graphviz shapes.
  for (const record of records) {
    if (record.cmd?.toLowerCase() !== 'add_library' || !Array.isArray(record.args)) continue
    const [name, ...args] = record.args as string[]
    if (!name || !args.includes('INTERFACE') || args.includes('IMPORTED') || args.includes('ALIAS')) continue
    if (targets.some(target => target.name === name)) continue
    const file = typeof record.file === 'string' ? resolve(record.file) : ''
    if (!file.startsWith(root + '/')) continue
    targets.push({ name, type: 'INTERFACE_LIBRARY', sources: [], includeRoots: [], modules: [], external: false, declarationFile: file, declarationLine: record.line })
  }
  for (const record of records) {
    if (record.cmd?.toLowerCase() !== 'target_sources' || !Array.isArray(record.args)) continue
    const [name, ...args] = record.args as string[]
    const target = targets.find(item => item.name === name && item.type === 'INTERFACE_LIBRARY')
    if (!target) continue
    for (const source of args.filter(item => !['INTERFACE', 'PUBLIC', 'PRIVATE'].includes(item))) {
      if (source.includes('$<') || ['FILE_SET', 'TYPE', 'HEADERS', 'BASE_DIRS', 'FILES'].includes(source)) {
        throw new Error(`Unsupported interface target_sources for ${name}: ${source}`)
      }
      const path = resolve(dirname(record.file), source)
      target.sources.push({ path, generated: false })
      const module = fileToModule(relative(root, path), moduleRoot)
      if (module && !target.modules.includes(module)) target.modules.push(module)
    }
  }
  // Qt records the generated plugin target on its backing target.
  for (const record of records) {
    if (record.cmd?.toLowerCase() !== 'set_target_properties' || !Array.isArray(record.args)) continue
    const args = record.args as string[]
    const properties = args.indexOf('PROPERTIES')
    const property = args.indexOf('QT_QML_MODULE_PLUGIN_TARGET', properties + 1)
    if (properties < 1 || property < 0 || !args[property + 1]) continue
    const backing = args[0]!, plugin = targets.find(target => target.name === args[property + 1])
    const owner = targets.find(target => target.name === backing)
    if (plugin && owner) { plugin.owner = backing; plugin.modules = [...owner.modules] }
  }
  const imported = new Map<string, Set<string>>()
  for (const record of records) {
    if (!Array.isArray(record.args)) continue
    const args = record.args as string[]
    if (['add_library', 'add_executable'].includes(record.cmd?.toLowerCase()) && args.includes('IMPORTED') && args[0]) imported.set(args[0], new Set())
  }
  for (const record of records) {
    if (record.cmd?.toLowerCase() !== 'set_target_properties' || !Array.isArray(record.args)) continue
    const args = record.args as string[], properties = args.indexOf('PROPERTIES')
    if (properties < 1) continue
    for (let i = properties + 1; i + 1 < args.length; i += 2) {
      if (args[i] !== 'INTERFACE_INCLUDE_DIRECTORIES') continue
      for (const name of args.slice(0, properties)) {
        const roots = imported.get(name)
        if (roots) for (const path of args[i + 1]!.split(';').filter(Boolean)) roots.add(path)
      }
    }
  }
  const externalTargets = [...imported].map(([name, roots]) => ({ name, includeRoots: [...roots] }))
  const text = await readFile(dot, 'utf8')
  const nodes = new Map<string, string>()
  const aliases = new Map<string, string>()
  for (const match of text.matchAll(/^\s*"([^"]+)"\s*\[\s*label\s*=\s*"((?:\\.|[^"\\])*)"[^\]]*\]/gm)) {
    const label = match[2]!, name = label.replace(/\\n.*/, '')
    nodes.set(match[1]!, name)
    const alias = label.match(/\\n\((.*?)\)/)?.[1]
    if (alias) for (const item of alias.split(/,\s*/)) aliases.set(item, name)
  }
  const graphTargets = new Set(nodes.values())
  for (const target of targets) {
    if (target.type !== 'INTERFACE_LIBRARY' && !graphTargets.has(target.name)) {
      throw new Error(`CMake Graphviz missing target ${target.name}; dependency graph is incomplete`)
    }
  }
  const links: {from: string; to: string}[] = []
  for (const match of text.matchAll(/^\s*"([^"]+)"\s*->\s*"([^"]+)"/gm)) {
    const from = nodes.get(match[1]!), to = nodes.get(match[2]!)
    if (!from || !to) throw new Error('Unsupported CMake Graphviz output: unresolved target node')
    links.push({ from, to })
  }
  if (configurations.length > 1) {
    const names = targets.filter(target => !target.external).map(target => target.name)
    const configured = await evaluateConfiguredLinks(root, build, selected.name, names)
    for (let i = links.length - 1; i >= 0; i--) {
      const edge = links[i]!
      const active = configured.get(edge.from)
      if (active && !active.some(value => (aliases.get(value) ?? value) === edge.to)) links.splice(i, 1)
    }
  }
  const linkLocations: CmakeModel['linkLocations'] = []
  for (const record of records) {
    if (record.cmd?.toLowerCase() !== 'target_link_libraries' || !Array.isArray(record.args) || typeof record.file !== 'string' || typeof record.line !== 'number') continue
    const [source, ...args] = record.args as string[]
    for (const arg of args) {
      const from = aliases.get(source!) ?? source
      const to = aliases.get(arg) ?? arg
      if (from && links.some(link => link.from === from && link.to === to)) linkLocations.push({ from, to, file: resolve(record.file), line: record.line })
    }
  }
  const sourceRoot = resolve(root, moduleRoot)
  const translationUnits = [...new Set(targets.flatMap(target => target.sources.filter(source => !source.generated && source.path.startsWith(sourceRoot + '/') && !source.path.startsWith(build + '/') && /\.(c|cc|cpp|cxx|m|mm)$/i.test(source.path)).map(source => source.path)))]
  const commands = await readCompileCommands(build)
  const commandFiles = new Set(commands.map(command => resolve(command.directory, command.file)))
  for (const unit of translationUnits) if (!commandFiles.has(unit)) throw new Error(`Missing compile command for translation unit ${unit}`)
  return { targets, links, linkLocations, translationUnits, externalTargets, configuration: selected.name, multiConfig: configurations.length > 1 }
}
