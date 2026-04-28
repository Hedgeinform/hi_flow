#!/usr/bin/env node
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { renderReportFromDisk } from '../core/report-builder.ts'

/**
 * Phase 2 entrypoint — renders audit-report.md from JSON + LLM-generated cluster prose.
 *
 * Inputs:
 *   - audit-report.json  (produced by cli-run-audit.ts)
 *   - cluster-prose.json — { "<principle-id>": { "name": "...", "root_cause": "..." }, ... }
 *   - [optional] d9-md-path — D9 architectural-principles.md to load fix_alternatives from
 */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const jsonPath = process.argv[2]
  const prosePath = process.argv[3]
  const d9MdPath = process.argv[4]
  if (!jsonPath || !prosePath) {
    console.error('Usage: npx tsx helpers/cli-render-md.ts <audit-report.json> <cluster-prose.json> [d9-md-path]')
    process.exit(1)
  }
  renderReportFromDisk(resolve(jsonPath), resolve(prosePath), d9MdPath ? resolve(d9MdPath) : undefined)
    .then(({ md_path }) => {
      console.log('audit-report.md:', md_path)
    })
    .catch((err: unknown) => {
      console.error('ERROR:', err instanceof Error ? err.message : String(err))
      process.exit(1)
    })
}
