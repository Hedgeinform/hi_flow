import { describe, it, expect } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm, readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildReport } from '../../core/report-builder.ts'
import { createTypescriptDepcruiseAdapter } from '../../adapters/typescript-depcruise.ts'

const adapter = createTypescriptDepcruiseAdapter()

// Canned depcruise JSON for a 2-module project with no violations
const cannedDepcruiseOutput = JSON.stringify({
  summary: { violations: [] },
  modules: [
    { source: 'src/a/index.ts', dependencies: [] },
    { source: 'src/b/index.ts', dependencies: [] },
  ],
})

describe('report-builder', () => {
  it('produces audit-report.json + audit-report.md from a tiny synthetic project', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rb-'))
    await mkdir(join(dir, 'src/a'), { recursive: true })
    await mkdir(join(dir, 'src/b'), { recursive: true })
    await writeFile(join(dir, 'package.json'), '{}')
    await writeFile(join(dir, 'tsconfig.json'), '{ "compilerOptions": {} }')
    await writeFile(join(dir, 'src/a/index.ts'), 'export const x = 1\n')
    await writeFile(join(dir, 'src/b/index.ts'), 'export const y = 2\n')

    const result = await buildReport(adapter, dir, {
      auditSha: 'uuid:test-sha',
      depcruiseVersion: '16.3.0',
      d9MdPath: 'tests/fixtures/d9-sample.md',
      clusterProsefn: () => ({ name: 'test cluster', root_cause: 'test cause' }),
      // Inject mock depcruise runner to avoid real dependency-cruiser
      runDepcruise: () => cannedDepcruiseOutput,
    })

    await access(result.json_path)
    await access(result.md_path)
    const json = JSON.parse(await readFile(result.json_path, 'utf-8'))
    expect(json.metadata.audit_sha).toBe('uuid:test-sha')
    expect(json.metadata.schema_version).toBe('1.1')
    expect(json.metrics.dep_graph).toBeDefined()
    expect(Array.isArray(json.findings)).toBe(true)

    await rm(dir, { recursive: true })
  })

  it('emits baseline:nccd-breach finding when NCCD exceeds threshold (and N>15)', async () => {
    const mockOutput = JSON.stringify({
      summary: { violations: [] },
      modules: Array.from({ length: 16 }, (_, i) => ({
        source: `src/m${i}/index.ts`,
        dependencies: i < 15 ? [{ resolved: `src/m${i + 1}/index.ts`, module: `../m${i + 1}` }] : [],
      })),
    })
    const dir = await mkdtemp(join(tmpdir(), 'rb-nccd-'))
    const report = await buildReport(adapter, dir, {
      depcruiseVersion: '16.3.0',
      auditSha: 'test-sha',
      runDepcruise: () => mockOutput,
    })
    const json = JSON.parse(await readFile(report.json_path, 'utf-8'))
    expect(json.findings.some((f: any) => f.rule_id === 'baseline:nccd-breach')).toBe(true)
    await rm(dir, { recursive: true })
  })
})
