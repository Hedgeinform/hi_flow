import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { readFile, rm, mkdir } from 'node:fs/promises'
import { buildReport } from '../../core/report-builder.ts'
import { createTypescriptDepcruiseAdapter } from '../../adapters/typescript-depcruise.ts'

// Mock: god module Ca=12 (11 reverse deps), Ce=11 (11 forward deps), LOC=400
// a-k modules each import from god (Ca++) and export one function
const mockGodOutput = JSON.stringify({
  summary: { violations: [] },
  modules: [
    {
      source: 'src/god/index.ts',
      metrics: { loc: 400 },
      dependencies: [
        { resolved: 'src/a/index.ts', module: '../a/index.ts' },
        { resolved: 'src/b/index.ts', module: '../b/index.ts' },
        { resolved: 'src/c/index.ts', module: '../c/index.ts' },
        { resolved: 'src/d/index.ts', module: '../d/index.ts' },
        { resolved: 'src/e/index.ts', module: '../e/index.ts' },
        { resolved: 'src/f/index.ts', module: '../f/index.ts' },
        { resolved: 'src/g/index.ts', module: '../g/index.ts' },
        { resolved: 'src/h/index.ts', module: '../h/index.ts' },
        { resolved: 'src/i/index.ts', module: '../i/index.ts' },
        { resolved: 'src/j/index.ts', module: '../j/index.ts' },
        { resolved: 'src/k/index.ts', module: '../k/index.ts' },
      ],
    },
    ...['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'].map(name => ({
      source: `src/${name}/index.ts`,
      metrics: { loc: 5 },
      dependencies: [{ resolved: 'src/god/index.ts', module: '../god/index.ts' }],
    })),
  ],
})

describe('integration: god-object project', () => {
  it('produces a god-object finding (mock depcruise)', async () => {
    const projectRoot = join(process.cwd(), 'tests/fixtures/god-object-project')
    const outDir = join(projectRoot, 'audit-report')
    await rm(outDir, { recursive: true, force: true })
    await mkdir(outDir, { recursive: true })

    const adapter = createTypescriptDepcruiseAdapter()
    const result = await buildReport(adapter, projectRoot, {
      auditSha: 'uuid:god-test',
      depcruiseVersion: '16.3.0',
      outDir,
      runDepcruise: () => mockGodOutput,
    })

    const json = JSON.parse(await readFile(result.json_path, 'utf-8'))
    const godFinding = json.findings.find((f: any) => f.rule_id === 'baseline:god-object')
    expect(godFinding).toBeDefined()
    expect(godFinding.source.module).toBe('god')
  }, 30_000)
})
