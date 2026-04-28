#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createTypescriptDepcruiseAdapter } from '../adapters/typescript-depcruise.ts'
import { buildReport } from '../core/report-builder.ts'

export async function runAudit(projectRoot: string, d9MdPath?: string): Promise<{ json_path: string; md_path: string }> {
  let depcruiseVersion: string
  try {
    depcruiseVersion = execSync('npx --no-install dependency-cruiser --version', { encoding: 'utf-8' }).trim()
  } catch {
    throw new Error('dependency-cruiser not found. Install: npm install -g dependency-cruiser@^16.0.0')
  }

  const adapter = createTypescriptDepcruiseAdapter()
  return buildReport(adapter, projectRoot, { depcruiseVersion, d9MdPath })
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
    .then(({ json_path, md_path }) => {
      console.log('audit-report.json:', json_path)
      console.log('audit-report.md:  ', md_path)
    })
    .catch((err: unknown) => {
      console.error('ERROR:', err instanceof Error ? err.message : String(err))
      process.exit(1)
    })
}
