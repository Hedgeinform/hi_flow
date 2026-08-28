import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { buildReport } from '../../core/report-builder.ts'
import { createTypescriptDepcruiseAdapter } from '../../adapters/typescript-depcruise.ts'
import { fixturePath, withTempDir } from '../test-paths.ts'

describe('integration: cycle project', () => {
  it('produces exactly one canonical two-module cycle finding', async () => {
    const projectRoot = fixturePath('cycle-project')
    await withTempDir('arch-audit-cycle-project-', async outDir => {

      const adapter = createTypescriptDepcruiseAdapter()
      const result = await buildReport(adapter, projectRoot, {
        auditSha: 'uuid:cycle-test',
        depcruiseVersion: '16.3.0',
        outDir,
      })

      const json = JSON.parse(await readFile(result.json_path, 'utf-8'))
      const cycles = json.findings.filter((f: any) => f.type === 'cycle')
      expect(cycles).toHaveLength(1)
      expect(cycles[0]).toEqual(expect.objectContaining({
        rule_id: 'baseline:inappropriate-intimacy',
        extras: { members: ['a', 'b'] },
      }))
    })
  }, 60_000)
})
