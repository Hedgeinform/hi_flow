import { readFile, realpath } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'

export interface CompileCommand { directory: string; file: string; argv: string[]; output?: string }

// Parse shell-style compiler arguments, never execute shell syntax.
function splitArguments(input: string, responseFile = false): string[] {
  const result: string[] = []
  let token = '', quote = '', started = false
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!
    if (quote === "'") { if (ch === "'") quote = ''; else token += ch; continue }
    if (ch === '"') { quote = quote === '"' ? '' : '"'; started = true; continue }
    if (!quote && ch === "'") { quote = "'"; started = true; continue }
    if (ch === '\\') {
      if (++i >= input.length) throw new Error('Invalid trailing escape in compiler command')
      const escaped = input[i]!
      if (!responseFile && escaped === '\n') continue
      if (!responseFile && quote === '"' && !['$', '`', '"', '\\'].includes(escaped)) token += '\\'
      token += escaped; started = true; continue
    }
    if (!responseFile && ((quote === '"' && /[`$]/.test(ch)) || (!quote && /[|;&<>`$\n]/.test(ch)))) throw new Error('Shell operators are not supported in compiler command')
    if (!quote && /\s/.test(ch)) { if (started) { result.push(token); token = ''; started = false }; continue }
    token += ch; started = true
  }
  if (quote) throw new Error('Unterminated quote in compiler command')
  if (started) result.push(token)
  return result
}
async function expand(argv: string[], directory: string, stack: Set<string>): Promise<string[]> {
  const out: string[] = []
  for (const arg of argv) {
    if (!arg.startsWith('@') || arg.length === 1) { out.push(arg); continue }
    const path = await realpath(resolve(directory, arg.slice(1)))
    if (stack.has(path)) throw new Error(`Cyclic response file: ${path}`)
    const next = new Set(stack); next.add(path)
    out.push(...await expand(splitArguments(await readFile(path, 'utf8'), true), directory, next))
  }
  return out
}
export async function readCompileCommands(buildDir: string): Promise<CompileCommand[]> {
  const entries: unknown = JSON.parse(await readFile(join(buildDir, 'compile_commands.json'), 'utf8'))
  if (!Array.isArray(entries)) throw new Error('compile_commands.json must contain an array')
  const result: CompileCommand[] = []
  for (const entry of entries) {
    if (!entry || typeof entry.directory !== 'string' || typeof entry.file !== 'string' || !isAbsolute(entry.directory)) throw new Error('Invalid compile command directory or file')
    const argv = Array.isArray(entry.arguments) && entry.arguments.every((arg: unknown) => typeof arg === 'string') ? entry.arguments : typeof entry.command === 'string' ? splitArguments(entry.command) : null
    if (!argv?.length) throw new Error(`Missing compiler command for ${entry.file}`)
    result.push({ directory: entry.directory, file: entry.file, argv: await expand(argv, entry.directory, new Set()), ...(typeof entry.output === 'string' ? { output: entry.output } : {}) })
  }
  return result
}
