import { describe, it, expect } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm, readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildReport, renderReportFromDisk } from '../../core/report-builder.ts'
import { createTypescriptDepcruiseAdapter } from '../../adapters/typescript-depcruise.ts'
import { fixturePath } from '../test-paths.ts'

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
      d9MdPath: fixturePath('d9-sample.md'),
      clusterProsefn: () => ({ name: 'test cluster', root_cause: 'test cause' }),
      // Inject mock depcruise runner to avoid real dependency-cruiser
      runDepcruise: () => cannedDepcruiseOutput,
    })

    await access(result.json_path)
    await access(result.md_path)
    const json = JSON.parse(await readFile(result.json_path, 'utf-8'))
    expect(json.metadata.audit_sha).toBe('uuid:test-sha')
    expect(json.metadata.schema_version).toBe('1.2')
    expect(json.metrics.dep_graph).toBeDefined()
    expect(Array.isArray(json.findings)).toBe(true)
    expect(json.metrics.per_module.a.LOC).toBe(1)
    expect(json.metrics.per_module.b.LOC).toBe(1)
    const md = await readFile(result.md_path, 'utf-8')
    expect(md).toContain('**Project:**')
    expect(md).toContain('## Scope')
    expect(md).toContain('eslint')
    expect(md).toContain('npm audit')
    expect(md).toContain('| Severity | Count | Rules triggered |')
    expect(md).toContain('**Total findings:** 0')
    expect(md).toContain('| Module | Ca | Ce | I | A | D | LOC |')
    expect(md).toContain('### CRITICAL (0)')
    expect(md).toContain('### HIGH (0)')
    expect(md).toContain('### MEDIUM (0)')
    expect(md).toContain('### LOW (0)')
    expect(md).toContain('## Notes for operator')

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
    for (let i = 0; i < 16; i++) {
      await mkdir(join(dir, `src/m${i}`), { recursive: true })
      await writeFile(join(dir, `src/m${i}/index.ts`), `export const m${i} = ${i}\n`)
    }
    const report = await buildReport(adapter, dir, {
      depcruiseVersion: '16.3.0',
      auditSha: 'test-sha',
      runDepcruise: () => mockOutput,
    })
    const json = JSON.parse(await readFile(report.json_path, 'utf-8'))
    expect(json.findings.some((f: any) => f.rule_id === 'baseline:nccd-breach')).toBe(true)
    await rm(dir, { recursive: true })
  })

  it('derives the scan glob and parser root from module_pattern', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rb-js-root-'))
    await mkdir(join(dir, 'pipeline-runtime/a'), { recursive: true })
    await mkdir(join(dir, 'pipeline-runtime/b'), { recursive: true })
    await writeFile(join(dir, 'package.json'), '{ "type": "module" }')
    await writeFile(join(dir, '.audit-rules.yaml'), 'overrides:\n  module_pattern: pipeline-runtime\n')
    await writeFile(join(dir, 'pipeline-runtime/a/index.mjs'), 'export const a = 1\n')
    await writeFile(join(dir, 'pipeline-runtime/b/index.mjs'), 'export const b = 2\n')
    let receivedGlob = ''

    const result = await buildReport(adapter, dir, {
      depcruiseVersion: '16.3.0',
      auditSha: 'test-sha',
      runDepcruise: (_config, scanGlob) => {
        receivedGlob = scanGlob
        return JSON.stringify({
          summary: { violations: [] },
          modules: [
            {
              source: 'pipeline-runtime/a/index.mjs',
              dependencies: [{ resolved: 'pipeline-runtime/b/index.mjs', module: '../b/index.mjs' }],
            },
            { source: 'pipeline-runtime/b/index.mjs', dependencies: [] },
          ],
        })
      },
    })

    const report = JSON.parse(await readFile(result.json_path, 'utf-8'))
    expect(receivedGlob).toBe('pipeline-runtime/**/*.{ts,tsx,js,jsx,mjs,cjs}')
    expect(report.metrics.dep_graph).toEqual({ a: ['b'], b: [] })
    const md = await readFile(result.md_path, 'utf-8')
    expect(md).toContain('module_pattern=pipeline-runtime')
    await rm(dir, { recursive: true })
  })

  it('emits an external channel-SDK boundary without requiring the SDK in dep_graph', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rb-external-sdk-'))
    await mkdir(join(dir, 'src/domain'), { recursive: true })
    await writeFile(join(dir, 'package.json'), '{}')
    await writeFile(join(dir, 'src/domain/index.ts'), "import { Telegraf } from 'telegraf'\nexport { Telegraf }\n")

    const result = await buildReport(adapter, dir, {
      depcruiseVersion: '17.4.3',
      auditSha: 'test-sha',
      runDepcruise: () => JSON.stringify({
        summary: { violations: [] },
        modules: [{
          source: 'src/domain/index.ts',
          dependencies: [{ module: 'telegraf', resolved: 'node_modules/telegraf/index.js' }],
        }],
      }),
    })

    const report = JSON.parse(await readFile(result.json_path, 'utf-8'))
    expect(report.findings).toContainEqual(expect.objectContaining({
      rule_id: 'baseline:domain-no-channel-sdk',
      target: { module: 'telegraf', file: '' },
      extras: expect.objectContaining({ external_target: true }),
    }))
    expect(report.metrics.dep_graph).toEqual({ domain: [] })
    await rm(dir, { recursive: true })
  })

  it('marks a previous completed Markdown report incomplete before a failing rerun', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rb-stale-md-'))
    const outDir = join(dir, 'audit-report')
    await mkdir(join(dir, 'src/a'), { recursive: true })
    await mkdir(outDir, { recursive: true })
    await writeFile(join(dir, 'package.json'), '{}')
    await writeFile(join(dir, 'src/a/index.ts'), 'export const a = 1\n')
    await writeFile(join(outDir, 'audit-report.md'), '# Audit Report — old completed result\n')

    await expect(buildReport(adapter, dir, {
      depcruiseVersion: '17.4.3',
      auditSha: 'test-sha',
      outDir,
      runDepcruise: () => { throw new Error('synthetic depcruise failure') },
    })).rejects.toThrow(/synthetic depcruise failure/)

    const markdown = await readFile(join(outDir, 'audit-report.md'), 'utf-8')
    expect(markdown).toContain('INCOMPLETE')
    expect(markdown).not.toContain('old completed result')
    await rm(dir, { recursive: true })
  })

  it('rejects a rule id tampered between phases using the embedded rule registry', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rb-tampered-rule-'))
    await mkdir(join(dir, 'src/domain'), { recursive: true })
    await writeFile(join(dir, 'package.json'), '{}')
    await writeFile(join(dir, 'src/domain/index.ts'), "import { Telegraf } from 'telegraf'\nexport { Telegraf }\n")
    const result = await buildReport(adapter, dir, {
      depcruiseVersion: '17.4.3',
      auditSha: 'test-sha',
      runDepcruise: () => JSON.stringify({
        summary: { violations: [] },
        modules: [{
          source: 'src/domain/index.ts',
          dependencies: [{ module: 'telegraf', resolved: 'node_modules/telegraf/index.js' }],
        }],
      }),
    })
    const report = JSON.parse(await readFile(result.json_path, 'utf-8'))
    report.findings[0].rule_id = 'project:invented-after-phase-one'
    await writeFile(result.json_path, JSON.stringify(report, null, 2))
    const prosePath = join(dir, 'audit-report', 'cluster-prose.json')
    await writeFile(prosePath, JSON.stringify({
      'channel-agnosticism': { name: 'Channel leak', root_cause: 'Domain imports channel SDK.' },
    }))

    await expect(renderReportFromDisk(result.json_path, prosePath)).rejects.toThrow(/not present in baseline or project rules/i)
    await rm(dir, { recursive: true })
  })

  it('rejects a D8 1.2 report when the embedded rule registry is removed between phases', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rb-missing-registry-'))
    await mkdir(join(dir, 'src/domain'), { recursive: true })
    await writeFile(join(dir, 'package.json'), '{}')
    await writeFile(join(dir, 'src/domain/index.ts'), 'export const value = 1\n')
    const result = await buildReport(adapter, dir, {
      depcruiseVersion: '17.4.3',
      auditSha: 'test-sha',
      runDepcruise: () => JSON.stringify({
        summary: { violations: [] },
        modules: [{ source: 'src/domain/index.ts', dependencies: [] }],
      }),
    })
    const report = JSON.parse(await readFile(result.json_path, 'utf-8'))
    delete report.metadata.known_rule_ids
    await writeFile(result.json_path, JSON.stringify(report, null, 2))
    const prosePath = join(dir, 'audit-report', 'cluster-prose.json')
    await writeFile(prosePath, '{}')

    await expect(renderReportFromDisk(result.json_path, prosePath)).rejects.toThrow(/known_rule_ids/i)
    await rm(dir, { recursive: true })
  })

  it('emits a canonical project rule finding when dependency-cruiser reports its namespaced id', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rb-project-rule-'))
    await mkdir(join(dir, 'src/tools'), { recursive: true })
    await mkdir(join(dir, 'src/dispatcher'), { recursive: true })
    await writeFile(join(dir, 'package.json'), '{}')
    await writeFile(join(dir, 'tsconfig.json'), '{ "compilerOptions": {} }')
    await writeFile(join(dir, 'src/tools/index.ts'), "import '../dispatcher/index.ts'\n")
    await writeFile(join(dir, 'src/dispatcher/index.ts'), 'export const dispatch = true\n')
    await writeFile(
      join(dir, '.audit-rules.yaml'),
      [
        'forbidden:',
        '  - name: no-tools-to-dispatcher',
        '    severity: HIGH',
        '    principle: layered-architecture-respect',
        '    from:',
        '      path: ^src/tools',
        '    to:',
        '      path: ^src/dispatcher',
        '    comment: Tools must not import dispatcher.',
        'required: []',
        '',
      ].join('\n'),
    )

    const mockOutput = JSON.stringify({
      summary: {
        violations: [{
          from: 'src/tools/index.ts',
          to: 'src/dispatcher/index.ts',
          type: 'dependency',
          rule: { name: 'project:no-tools-to-dispatcher', severity: 'error' },
        }],
      },
      modules: [
        {
          source: 'src/tools/index.ts',
          dependencies: [{ resolved: 'src/dispatcher/index.ts', module: '../dispatcher/index.ts' }],
        },
        { source: 'src/dispatcher/index.ts', dependencies: [] },
      ],
    })

    const report = await buildReport(adapter, dir, {
      depcruiseVersion: '16.3.0',
      auditSha: 'test-sha',
      runDepcruise: () => mockOutput,
    })
    const json = JSON.parse(await readFile(report.json_path, 'utf-8'))
    expect(json.findings).toContainEqual(expect.objectContaining({
      rule_id: 'project:no-tools-to-dispatcher',
      severity: 'HIGH',
      reason: {
        principle: 'layered-architecture-respect',
        explanation: 'Tools must not import dispatcher.',
      },
    }))
    await rm(dir, { recursive: true })
  })

  it('fails closed when module_pattern points to a missing root', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rb-missing-root-'))
    await writeFile(join(dir, 'package.json'), '{ "type": "module" }')
    await writeFile(join(dir, '.audit-rules.yaml'), 'overrides:\n  module_pattern: missing-root\n')

    await expect(buildReport(adapter, dir, {
      depcruiseVersion: '16.3.0',
      auditSha: 'test-sha',
      runDepcruise: () => JSON.stringify({ summary: { violations: [] }, modules: [] }),
    })).rejects.toThrow(/missing-root/)
    await rm(dir, { recursive: true })
  })

  it('fails closed when dependency-cruiser returns no production modules', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rb-empty-result-'))
    await mkdir(join(dir, 'pipeline-runtime/a'), { recursive: true })
    await writeFile(join(dir, 'package.json'), '{ "type": "module" }')
    await writeFile(join(dir, '.audit-rules.yaml'), 'overrides:\n  module_pattern: pipeline-runtime\n')
    await writeFile(join(dir, 'pipeline-runtime/a/index.mjs'), 'export const a = 1\n')

    await expect(buildReport(adapter, dir, {
      depcruiseVersion: '16.3.0',
      auditSha: 'test-sha',
      runDepcruise: () => JSON.stringify({ summary: { violations: [] }, modules: [] }),
    })).rejects.toThrow(/no production modules/i)
    await rm(dir, { recursive: true })
  })
})
