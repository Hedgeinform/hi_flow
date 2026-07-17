import { describe, expect, it } from 'vitest'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { createTypescriptDepcruiseAdapter } from '../../adapters/typescript-depcruise.ts'
import { buildReport } from '../../core/report-builder.ts'
import { readBundledDepcruiseVersion } from '../../core/depcruise-runtime.ts'

describe('JavaScript ESM project integration', () => {
  it('builds a non-empty D8 graph with an a -> b .mjs edge', async () => {
    const projectRoot = resolve('tests/fixtures/js-esm-project')
    const outDir = await mkdtemp(join(tmpdir(), 'arch-audit-js-esm-'))
    const runtimeRoot = resolve('.')

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
    await rm(outDir, { recursive: true })
  })
})
