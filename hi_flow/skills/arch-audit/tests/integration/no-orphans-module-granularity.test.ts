import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { createTypescriptDepcruiseAdapter } from '../../adapters/typescript-depcruise.ts'
import { buildReport } from '../../core/report-builder.ts'
import { fixturePath, withTempDir } from '../test-paths.ts'

describe('integration: no-orphans module granularity', () => {
  it('does not report an imported module because one of its files is unused', async () => {
    await withTempDir('arch-audit-no-orphans-module-granularity-', async outDir => {
      const result = await buildReport(
        createTypescriptDepcruiseAdapter(),
        fixturePath('no-orphans-mixed-module-project'),
        {
          auditSha: 'uuid:no-orphans-module-granularity',
          depcruiseVersion: '17.4.3',
          outDir,
        },
      )
      const report = JSON.parse(await readFile(result.json_path, 'utf-8'))

      expect(report.metrics.per_module['office-integration-app'].Ca).toBe(2)
      expect(report.findings).not.toContainEqual(expect.objectContaining({
        rule_id: 'baseline:no-orphans',
        source: expect.objectContaining({ module: 'office-integration-app' }),
      }))
      expect(report.metrics.per_module.orphan.Ca).toBe(0)
      expect(report.findings).toContainEqual(expect.objectContaining({
        rule_id: 'baseline:no-orphans',
        source: expect.objectContaining({ module: 'orphan', file: 'src/orphan/index.ts' }),
      }))
    })
  }, 60_000)
})
