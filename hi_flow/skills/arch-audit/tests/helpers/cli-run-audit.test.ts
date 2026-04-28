import { describe, it, expect } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm, access, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runAudit } from '../../helpers/cli-run-audit.ts'

// Inject mock depcruise binary by stubbing PATH? Simpler: use buildReportData via runAudit
// which calls execSync('npx ... --version') for preflight. We can't easily mock that here.
// Skip the depcruise-version check by going through buildReportData directly is tested
// elsewhere. For this test we just want to verify outDir routing — but runAudit hits
// depcruise. So we test outDir wiring via buildReportData instead.
import { buildReportData } from '../../core/report-builder.ts'
import { createTypescriptDepcruiseAdapter } from '../../adapters/typescript-depcruise.ts'

describe('cli-run-audit outDir override', () => {
  it('writes audit-report.json and clusters-input.json to the supplied outDir, not <root>/audit-report/', async () => {
    // Project root + a separate explicit out-dir on the side. Verifies the flag path
    // doesn't fall back to default `<root>/audit-report/` when overridden.
    const root = await mkdtemp(join(tmpdir(), 'cli-runaudit-root-'))
    const altOut = await mkdtemp(join(tmpdir(), 'cli-runaudit-out-'))
    await mkdir(join(root, 'src/a'), { recursive: true })
    await mkdir(join(root, 'src/b'), { recursive: true })
    await writeFile(join(root, 'package.json'), '{}')
    await writeFile(join(root, 'tsconfig.json'), '{ "compilerOptions": {} }')
    await writeFile(join(root, 'src/a/index.ts'), 'export const x = 1\n')
    await writeFile(join(root, 'src/b/index.ts'), 'export const y = 2\n')

    const cannedDepcruise = JSON.stringify({
      summary: { violations: [] },
      modules: [
        { source: 'src/a/index.ts', dependencies: [] },
        { source: 'src/b/index.ts', dependencies: [] },
      ],
    })

    const adapter = createTypescriptDepcruiseAdapter()
    const data = await buildReportData(adapter, root, {
      depcruiseVersion: '16.3.0',
      runDepcruise: () => cannedDepcruise,
      outDir: altOut,
    })

    expect(data.outDir).toBe(altOut)
    // Output files in altOut
    await access(join(altOut, 'audit-report.json'))
    await access(join(altOut, 'clusters-input.json'))
    // Default location must NOT have been used
    await expect(access(join(root, 'audit-report'))).rejects.toBeTruthy()

    await rm(root, { recursive: true })
    await rm(altOut, { recursive: true })
  })

  it('falls back to <root>/audit-report when outDir is not supplied', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cli-runaudit-default-'))
    await mkdir(join(root, 'src/a'), { recursive: true })
    await writeFile(join(root, 'package.json'), '{}')
    await writeFile(join(root, 'tsconfig.json'), '{ "compilerOptions": {} }')
    await writeFile(join(root, 'src/a/index.ts'), 'export const x = 1\n')

    const cannedDepcruise = JSON.stringify({
      summary: { violations: [] },
      modules: [{ source: 'src/a/index.ts', dependencies: [] }],
    })
    const adapter = createTypescriptDepcruiseAdapter()
    const data = await buildReportData(adapter, root, {
      depcruiseVersion: '16.3.0',
      runDepcruise: () => cannedDepcruise,
    })

    expect(data.outDir).toBe(join(root, 'audit-report'))
    await access(data.json_path)
    const s = await stat(data.outDir)
    expect(s.isDirectory()).toBe(true)

    await rm(root, { recursive: true })
  })
})
