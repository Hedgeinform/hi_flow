import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, readFile } from 'node:fs/promises'
import { buildReport } from '../../core/report-builder.ts'
import { createTypescriptDepcruiseAdapter } from '../../adapters/typescript-depcruise.ts'

describe('integration: barrel project', () => {
  it('produces a barrel-file finding for foo (imported by bar via index)', async () => {
    const projectRoot = join(process.cwd(), 'tests/fixtures/barrel-project')
    const outDir = join(projectRoot, 'audit-report')
    await rm(outDir, { recursive: true, force: true })
    await mkdir(outDir, { recursive: true })

    const adapter = createTypescriptDepcruiseAdapter()
    const result = await buildReport(adapter, projectRoot, {
      auditSha: 'uuid:barrel-test',
      depcruiseVersion: '16.3.0',
      outDir,
    })

    const json = JSON.parse(await readFile(result.json_path, 'utf-8'))
    const barrelFindings = json.findings.filter((f: any) => f.rule_id === 'baseline:barrel-file')
    expect(barrelFindings.length).toBeGreaterThan(0)
    // bar imports through foo's barrel
    expect(barrelFindings.some((f: any) => f.source.module === 'bar' && f.target.module === 'foo')).toBe(true)
    // baz imports foo/a.ts directly — NO barrel finding for baz
    expect(barrelFindings.some((f: any) => f.source.module === 'baz')).toBe(false)
  }, 60_000)
})
