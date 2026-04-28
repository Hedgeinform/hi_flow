#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createTypescriptDepcruiseAdapter } from '../adapters/typescript-depcruise.ts'
import { buildReportData, renderReport, type ClusterProseFn } from '../core/report-builder.ts'

/**
 * Phase 1 entrypoint — produces audit-report.json + clusters-input.json.
 *
 * Returns the data structure needed by phase 2. The CLI form writes JSON and prints paths;
 * the agent then generates per-cluster prose and invokes cli-render-md.ts for phase 2.
 *
 * Programmatic callers can pass `clusterProsefn` to render the markdown in a single call
 * (legacy single-shot mode — used by tests). Production agent flow is two-phase.
 */
export async function runAudit(
  projectRoot: string,
  d9MdPath?: string,
  clusterProsefn?: ClusterProseFn,
): Promise<{ json_path: string; md_path: string | null; clusters_input_path: string }> {
  let depcruiseVersion: string
  try {
    depcruiseVersion = execSync('npx --no-install dependency-cruiser --version', { encoding: 'utf-8' }).trim()
  } catch {
    throw new Error('dependency-cruiser not found. Install: npm install -g dependency-cruiser@^16.0.0')
  }

  const adapter = createTypescriptDepcruiseAdapter()
  const data = await buildReportData(adapter, projectRoot, { depcruiseVersion, d9MdPath })
  const clusters_input_path = `${data.outDir}/clusters-input.json`

  if (clusterProsefn) {
    const { md_path } = await renderReport(data, clusterProsefn)
    return { json_path: data.json_path, md_path, clusters_input_path }
  }

  return { json_path: data.json_path, md_path: null, clusters_input_path }
}

// CLI entry: invoked via `npx tsx helpers/cli-run-audit.ts <project-root> [d9-md-path]`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const projectRoot = process.argv[2]
  if (!projectRoot) {
    console.error('Usage: npx tsx helpers/cli-run-audit.ts <project-root> [d9-md-path]')
    process.exit(1)
  }
  const d9MdPath = process.argv[3]
  runAudit(resolve(projectRoot), d9MdPath ? resolve(d9MdPath) : undefined)
    .then(({ json_path, clusters_input_path }) => {
      console.log('audit-report.json:    ', json_path)
      console.log('clusters-input.json:  ', clusters_input_path)
      console.log('')
      console.log('Phase 1 complete. Next steps for the skill agent:')
      console.log('  1. Read clusters-input.json — list of cluster ids + finding ids + affected modules.')
      console.log('  2. Generate per-cluster prose: { "<principle-id>": { "name": "...", "root_cause": "..." }, ... }')
      console.log('  3. Write the prose to <out-dir>/cluster-prose.json.')
      console.log('  4. Run cli-render-md.ts <audit-report.json> <cluster-prose.json> [d9-md-path] to emit audit-report.md.')
    })
    .catch((err: unknown) => {
      console.error('ERROR:', err instanceof Error ? err.message : String(err))
      process.exit(1)
    })
}
