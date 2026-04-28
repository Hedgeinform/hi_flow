import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, readFile } from 'node:fs/promises'
import { buildReport } from '../../core/report-builder.ts'
import { createTypescriptDepcruiseAdapter } from '../../adapters/typescript-depcruise.ts'

describe('integration: layered project', () => {
  it('detects layered structure, port-adapter-direction violation, and foundation modules', async () => {
    const projectRoot = join(process.cwd(), 'tests/fixtures/layered-project')
    const outDir = join(projectRoot, 'audit-report')
    await rm(outDir, { recursive: true, force: true })
    await mkdir(outDir, { recursive: true })

    const adapter = createTypescriptDepcruiseAdapter()
    const result = await buildReport(adapter, projectRoot, {
      auditSha: 'uuid:layered-test',
      depcruiseVersion: '16.3.0',
      outDir,
    })

    const json = JSON.parse(await readFile(result.json_path, 'utf-8'))
    const ruleIds = json.findings.map((f: any) => f.rule_id)

    // D7 layered detection: port-adapter-direction fires when domain → infrastructure
    expect(ruleIds).toContain('baseline:port-adapter-direction')

    // D1: utils metrics — Ca should equal number of distinct importers (6: api, application,
    // domain, infrastructure, m1, m2). With pre-fix raw counting, Ca would have been inflated.
    expect(json.metrics.per_module.utils.Ca).toBe(6)
    expect(json.metrics.per_module.utils.Ce).toBe(0)

    // D5: dep_graph contains utils as key (even though Ce=0) via per_module metrics.
    expect(json.metrics.per_module).toHaveProperty('utils')

    // D7 markdown: Foundation section + Layered detected section + linkStyle directives.
    const md = await readFile(result.md_path, 'utf-8')
    expect(md).toMatch(/## Foundation modules/)
    expect(md).toMatch(/`utils`/)
    expect(md).toMatch(/## Layered architecture view/)
    expect(md).not.toMatch(/Layered structure не detected/)
    expect(md).toMatch(/linkStyle \d+ stroke:#/)

    // D4: Module Metrics table present with all 7 modules.
    expect(md).toMatch(/## Module Metrics/)
    for (const m of ['api', 'application', 'domain', 'infrastructure', 'utils', 'm1', 'm2']) {
      expect(md).toMatch(new RegExp(`\\| \`${m}\` \\|`))
    }
  }, 60_000)
})
