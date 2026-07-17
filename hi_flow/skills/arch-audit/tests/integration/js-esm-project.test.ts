import { describe, expect, it } from 'vitest'
import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createTypescriptDepcruiseAdapter } from '../../adapters/typescript-depcruise.ts'
import { buildReport } from '../../core/report-builder.ts'
import { readBundledDepcruiseVersion } from '../../core/depcruise-runtime.ts'
import { fixturePath, PACKAGE_ROOT, withTempDir } from '../test-paths.ts'

describe('JavaScript ESM project integration', () => {
  it('builds a non-empty D8 graph with an a -> b .mjs edge', async () => {
    const projectRoot = fixturePath('js-esm-project')
    const runtimeRoot = PACKAGE_ROOT
    await withTempDir('arch-audit-js-esm-', async outDir => {

      const result = await buildReport(createTypescriptDepcruiseAdapter(), projectRoot, {
        auditSha: 'fixture-js-esm-sha',
        depcruiseVersion: readBundledDepcruiseVersion(runtimeRoot),
        outDir,
        clusterProsefn: id => ({ name: id, root_cause: 'fixture' }),
      })

      await access(result.json_path)
      await access(result.md_path)
      await access(join(outDir, 'clusters-input.json'))
      const report = JSON.parse(await readFile(result.json_path, 'utf-8'))
      expect(Object.keys(report.metrics.per_module).sort()).toEqual(['a', 'b'])
      expect(report.metrics.dep_graph).toEqual({ a: ['b'], b: [] })
      expect(report.metadata.parsing_errors).toBeUndefined()
    })
  })
})
