import { access } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import type { CompileCommand } from './compile-commands.ts'

const exec = promisify(execFile)
export interface IncludeEdge { from: string; to: string; line?: number; spelling: string }
export interface IncludeResult { translationUnit: string; edges: IncludeEdge[]; visitedFiles: string[]; compilerVersion: string }
interface Pending { from: string; line: number; spelling: string; quoted: boolean; next: boolean }

function preprocessingArguments(argv: string[]): string[] {
  const result: string[] = []
  const takesValue = new Set(['-o', '-MF', '-MT', '-MQ', '-MJ'])
  const remove = new Set(['-c', '-MD', '-MMD', '-MP', '-MG', '-M', '-MM'])
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (takesValue.has(arg)) { if (++i >= argv.length) throw new Error(`Missing value for ${arg}`); continue }
    if (remove.has(arg) || /^-(?:MF|MT|MQ|MJ).+/.test(arg) || /^-o.+/.test(arg)) continue
    if (arg === '-include-pch' || arg.endsWith('.gch') || arg.startsWith('-Wp,-M')) throw new Error(`Unsupported precompiled header or depfile option: ${arg}`)
    result.push(arg)
  }
  return [...result, '-E', '-dI', '-v']
}
function searchPaths(stderr: string, directory: string): { quoted: string[]; system: string[] } {
  const quoted: string[] = [], system: string[] = []
  let mode: 'quoted' | 'system' | null = null, complete = false
  for (const line of stderr.split('\n')) {
    if (line.includes('#include "..." search starts here:')) { mode = 'quoted'; continue }
    if (line.includes('#include <...> search starts here:')) { mode = 'system'; continue }
    if (line.includes('End of search list.')) { complete = true; mode = null; continue }
    if (mode && /^\s/.test(line)) {
      const path = line.trim().replace(/ \(framework directory\)$/, '')
      if (path) (mode === 'quoted' ? quoted : system).push(resolve(directory, path))
    }
  }
  if (!complete) throw new Error('Compiler did not report a complete include search path')
  return { quoted, system }
}
async function resolveSkipped(pending: Pending, paths: { quoted: string[]; system: string[] }): Promise<string> {
  const roots = pending.quoted ? [dirname(pending.from), ...paths.quoted, ...paths.system] : paths.system
  let start = 0
  if (pending.next) {
    const owner = roots.findIndex(root => pending.from.startsWith(root + '/'))
    if (owner < 0) throw new Error(`Cannot resolve include_next in ${pending.from}:${pending.line}`)
    start = owner + 1
  }
  const candidates = isAbsolute(pending.spelling) ? [pending.spelling] : roots.slice(start).map(root => join(root, pending.spelling))
  for (const candidate of candidates) { try { await access(candidate); return resolve(candidate) } catch {} }
  throw new Error(`Cannot resolve include ${pending.spelling} in ${pending.from}:${pending.line}`)
}
export async function collectIncludes(command: CompileCommand): Promise<IncludeResult> {
  if (!command.argv.length) throw new Error(`Missing compiler for ${command.file}`)
  const tool = command.argv[0]!
  const args = preprocessingArguments(command.argv.slice(1))
  const translationUnit = resolve(command.directory, command.file)
  let stdout: string, stderr: string
  try { ({ stdout, stderr } = await exec(tool, args, { cwd: command.directory, maxBuffer: 128 * 1024 * 1024 })) }
  catch (error) {
    const detail = (error as { stderr?: string }).stderr || (error as Error).message
    throw new Error(`Preprocessing failed for ${translationUnit}: ${detail}`, { cause: error })
  }
  if (/^#pragma GCC pch_preprocess/m.test(stdout)) throw new Error(`Precompiled header hides include dependencies for ${translationUnit}`)
  const paths = searchPaths(stderr, command.directory)
  const compiler = ['ccache', 'sccache'].includes(basename(tool)) ? command.argv[1]! : tool
  let compilerVersion: string
  try { compilerVersion = (await exec(compiler, ['--version'], { cwd: command.directory })).stdout.split('\n')[0]! }
  catch (error) { throw new Error(`Cannot determine compiler version for ${translationUnit}`, { cause: error }) }
  const forced: string[] = []
  for (let i = 1; i < command.argv.length; i++) {
    if (command.argv[i] === '-include' || command.argv[i] === '-imacros') {
      const name = command.argv[++i]
      if (!name) throw new Error(`Missing forced include argument for ${translationUnit}`)
      forced.push(name)
    }
  }
  const edges: IncludeEdge[] = [], visited = new Set<string>()
  for (const spelling of forced) {
    const to = await resolveSkipped({ from: join(command.directory, '__forced__'), line: 0, spelling, quoted: true, next: false }, paths)
    edges.push({ from: translationUnit, to, spelling })
    visited.add(to)
  }
  let file = '', lineNumber = 1, pending: Pending | undefined, sawTranslationUnit = false
  const flush = async (to?: string) => {
    if (!pending) return
    const target = to ?? await resolveSkipped(pending, paths)
    edges.push({ from: pending.from, to: target, line: pending.line, spelling: pending.spelling })
    visited.add(target)
    pending = undefined
  }
  for (const line of stdout.split('\n')) {
    const marker = line.match(/^#\s+(\d+)\s+"((?:[^"\\]|\\.)*)"(?:\s+(.*))?$/)
    if (marker) {
      const raw = JSON.parse(`"${marker[2]}"`) as string
      const nextFile = raw.startsWith('<') && raw.endsWith('>') ? '' : resolve(command.directory, raw)
      const flags = (marker[3] ?? '').split(/\s+/)
      if (nextFile === translationUnit) sawTranslationUnit = true
      if (pending && flags.includes('1') && nextFile && nextFile !== pending.from) await flush(nextFile)
      else if (pending && nextFile !== pending.from) await flush()
      if (nextFile && flags.includes('1')) visited.add(nextFile)
      file = nextFile
      lineNumber = Number(marker[1])
      continue
    }
    const include = line.match(/^\s*#\s*(include|include_next)\s*([<"])(.*?)[>"](?:\s.*)?$/)
    if (include && file) {
      await flush()
      pending = { from: file, line: lineNumber, spelling: include[3]!, quoted: include[2] === '"', next: include[1] === 'include_next' }
    } else if (pending) await flush()
    lineNumber++
  }
  await flush()
  if (!sawTranslationUnit) throw new Error(`Compiler output did not contain translation unit ${translationUnit}`)
  visited.add(translationUnit)
  return { translationUnit, edges, visitedFiles: [...visited], compilerVersion }
}
