#!/usr/bin/env node
import { access } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createTypescriptDepcruiseAdapter } from '../adapters/typescript-depcruise.ts'
import { createCppCmakeAdapter } from '../adapters/cpp-cmake.ts'
import { readBundledDepcruiseVersion, resolveRuntimeRoot } from '../core/depcruise-runtime.ts'
import { buildReportData, renderReport, type ClusterProseFn } from '../core/report-builder.ts'
import type { SeverityCounts } from '../core/types.ts'

export interface AuditOptions { stack?: 'typescript' | 'cpp-cmake'; buildDir?: string; configuration?: string; check?: boolean }
async function exists(path: string): Promise<boolean> {
  try { await access(path); return true } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error }
}
export async function runAudit(
  projectRoot: string,
  d9MdPath?: string,
  clusterProsefn?: ClusterProseFn,
  outDir?: string,
  options: AuditOptions = {},
): Promise<{ json_path: string; md_path: string | null; clusters_input_path: string; severity_counts: SeverityCounts }> {
  const [hasTs, hasCmake] = await Promise.all([exists(join(projectRoot, 'package.json')), exists(join(projectRoot, 'CMakeLists.txt'))])
  if (!options.stack && hasTs && hasCmake) throw new Error('Mixed project requires explicit --stack selection')
  const stack = options.stack ?? (hasCmake ? 'cpp-cmake' : 'typescript')
  if (stack === 'cpp-cmake' && !options.buildDir) throw new Error('C++/CMake requires --build-dir')
  const adapter = stack === 'cpp-cmake' ? createCppCmakeAdapter() : createTypescriptDepcruiseAdapter()
  const depcruiseVersion = stack === 'typescript' ? readBundledDepcruiseVersion(resolveRuntimeRoot(import.meta.url)) : undefined
  const reportOut = outDir ?? (options.check && options.buildDir ? join(options.buildDir, 'arch-audit', 'check') : undefined)
  const data = await buildReportData(adapter, projectRoot, { depcruiseVersion, d9MdPath, outDir: reportOut, buildDir: options.buildDir, configuration: options.configuration, check: options.check })
  const clusters_input_path = join(data.outDir, 'clusters-input.json')
  const md_path = clusterProsefn && !options.check ? (await renderReport(data, clusterProsefn)).md_path : null
  return { json_path: data.json_path, md_path, clusters_input_path, severity_counts: data.report.metrics.severity_counts }
}
export interface ParsedCliArgs extends AuditOptions { projectRoot?: string; d9MdPath?: string; outDir?: string; help: boolean }
export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const out: ParsedCliArgs = { help: false }
  const positional: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (arg === '--help' || arg === '-h') { out.help = true; continue }
    if (arg === '--check') { out.check = true; continue }
    const [name, inline] = arg.startsWith('--') && arg.includes('=') ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)] : [arg, undefined]
    if (['--out-dir', '-o', '--stack', '--build-dir', '--configuration'].includes(name!)) {
      const value = inline ?? argv[++i]
      if (!value || value.startsWith('-')) throw new Error(`Missing value for ${name}`)
      if (name === '--stack') {
        if (value !== 'typescript' && value !== 'cpp-cmake') throw new Error(`Unknown stack: ${value}`)
        out.stack = value
      } else if (name === '--build-dir') out.buildDir = value
      else if (name === '--configuration') out.configuration = value
      else out.outDir = value
    } else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`)
    else positional.push(arg)
  }
  if (positional.length > 2) throw new Error('Too many positional arguments')
  out.projectRoot = positional[0]
  out.d9MdPath = positional[1]
  return out
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void (async () => {
    const args = parseCliArgs(process.argv.slice(2))
    if (args.help || !args.projectRoot) {
      console.error('Usage: audit [--stack typescript|cpp-cmake] [--build-dir path] [--configuration name] [--check] [--out-dir path] <project-root> [d9-md-path]')
      if (!args.help) process.exitCode = 1
      return
    }
    const result = await runAudit(resolve(args.projectRoot), args.d9MdPath ? resolve(args.d9MdPath) : undefined, undefined,
      args.outDir ? resolve(args.outDir) : undefined,
      { stack: args.stack, buildDir: args.buildDir ? resolve(args.buildDir) : undefined, configuration: args.configuration, check: args.check })
    console.log('audit-report.json:    ', result.json_path)
    console.log('clusters-input.json:  ', result.clusters_input_path)
    if (args.check) console.log('Findings:', JSON.stringify(result.severity_counts))
    else {
      console.log('Phase 1 data complete. The architecture gate remains INCOMPLETE until Phase 2 succeeds.')
      console.log('Generate cluster-prose.json from clusters-input.json, then run render-md.')
    }
  })().catch((error: unknown) => { console.error('ERROR:', error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
}
