import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'

const exec = promisify(execFile)

/** Evaluate link properties with CMake's own generator, without retaining cache changes. */
export async function evaluateConfiguredLinks(root: string, build: string, configuration: string, names: string[]): Promise<Map<string, string[]>> {
  if (!/^[A-Za-z0-9_.+-]+$/.test(configuration)) throw new Error(`Unsupported CMake configuration name: ${configuration}`)
  if (names.some(name => !/^[A-Za-z0-9_.:+-]+$/.test(name))) throw new Error('Unsupported CMake target name for configuration evaluation')
  const cachePath = join(build, 'CMakeCache.txt')
  const original = await readFile(cachePath)
  if (/^CMAKE_PROJECT_INCLUDE(?::[^=]+)?=/m.test(original.toString())) {
    throw new Error('Cannot evaluate multi-config links when CMAKE_PROJECT_INCLUDE is already set')
  }
  const out = join(build, 'arch-audit')
  if (out.includes(']==]')) throw new Error('Unsupported CMake build path for configuration evaluation')
  const runId = randomUUID()
  const script = join(out, `evaluate-links-${runId}.cmake`)
  const quoted = (value: string) => `[==[${value}]==]`
  const lines = ['unset(CMAKE_PROJECT_INCLUDE CACHE)', 'function(_hiflow_evaluate_links)']
  for (const [i, name] of names.entries()) {
    const dest = join(out, `links-${runId}-${i}-$<CONFIG>.txt`)
    lines.push(`if(TARGET ${quoted(name)})`)
    lines.push(`file(GENERATE OUTPUT ${quoted(dest)} CONTENT ${quoted(`$<TARGET_GENEX_EVAL:${name},$<TARGET_PROPERTY:${name},LINK_LIBRARIES>>\n$<TARGET_GENEX_EVAL:${name},$<TARGET_PROPERTY:${name},INTERFACE_LINK_LIBRARIES>>\n`)})`)
    lines.push('endif()')
  }
  lines.push('endfunction()', 'cmake_language(DEFER CALL _hiflow_evaluate_links)', '')
  await writeFile(script, lines.join('\n'))
  try {
    await exec('cmake', ['-S', root, '-B', build, `-DCMAKE_PROJECT_INCLUDE=${script}`], { maxBuffer: 64 * 1024 * 1024 })
  } catch (error) {
    throw new Error(`CMake configuration-specific link evaluation failed: ${(error as Error).message}`, { cause: error })
  } finally {
    const after = await readFile(cachePath)
    if (!after.equals(original)) await writeFile(cachePath, original)
  }
  const result = new Map<string, string[]>()
  for (const [i, name] of names.entries()) {
    let content: string
    try { content = await readFile(join(out, `links-${runId}-${i}-${configuration}.txt`), 'utf8') }
    catch { throw new Error(`Missing configuration-specific link data for ${name} (${configuration})`) }
    if (content.includes('$<')) throw new Error(`Unresolved CMake generator expression for ${name} (${configuration})`)
    result.set(name, content.split(/[;\n]/).map(value => value.trim()).filter(Boolean))
  }
  return result
}
