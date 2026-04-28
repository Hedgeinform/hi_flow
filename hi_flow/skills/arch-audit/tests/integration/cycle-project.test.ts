import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, readFile } from 'node:fs/promises'
import { buildReport } from '../../core/report-builder.ts'
import { createTypescriptDepcruiseAdapter } from '../../adapters/typescript-depcruise.ts'

describe('integration: cycle project', () => {
  it('produces audit-report.json with inappropriate-intimacy or no-circular finding', async () => {
    const projectRoot = join(process.cwd(), 'tests/fixtures/cycle-project')
    const outDir = join(projectRoot, 'audit-report')
    await rm(outDir, { recursive: true, force: true })
    await mkdir(outDir, { recursive: true })

    const adapter = createTypescriptDepcruiseAdapter()
    const result = await buildReport(adapter, projectRoot, {
      auditSha: 'uuid:cycle-test',
      depcruiseVersion: '16.3.0',
      outDir,
    })

    const json = JSON.parse(await readFile(result.json_path, 'utf-8'))
    const ruleIds = json.findings.map((f: any) => f.rule_id)
    const hasCycleFinding = ruleIds.includes('baseline:no-circular') || ruleIds.includes('baseline:inappropriate-intimacy')
    expect(hasCycleFinding).toBe(true)
  }, 60_000)
})
