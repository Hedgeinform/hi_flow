import { describe, it, expect } from 'vitest'
import { access, mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildReportData } from '../../core/report-builder.ts'
import { parseCliArgs, runAudit } from '../../helpers/cli-run-audit.ts'

describe('audit CLI options', () => {
  it('parses C++ stack, build path, configuration, check and existing positional options', () => {
    expect(parseCliArgs(['--stack', 'cpp-cmake', '--build-dir', '/build', '--configuration', 'Debug', '--check', '-o', '/out', '/project', '/d9']))
      .toMatchObject({ stack: 'cpp-cmake', buildDir: '/build', configuration: 'Debug', check: true, outDir: '/out', projectRoot: '/project', d9MdPath: '/d9' })
  })
  it('rejects unknown flags and missing option values', () => {
    expect(() => parseCliArgs(['--bogus', '/project'])).toThrow(/unknown/i)
    expect(() => parseCliArgs(['--build-dir'])).toThrow(/value/i)
    expect(() => parseCliArgs(['--stack', 'other'])).toThrow(/stack/i)
  })
  it('requires explicit stack selection for mixed projects and a build directory for C++', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mixed-stack-'))
    try {
      await writeFile(join(root, 'package.json'), '{}')
      await writeFile(join(root, 'CMakeLists.txt'), '')
      await expect(runAudit(root)).rejects.toThrow(/explicit.*stack/i)
      await expect(runAudit(root, undefined, undefined, undefined, { stack: 'cpp-cmake' })).rejects.toThrow(/build.dir/i)
    } finally { await rm(root, { recursive: true, force: true }) }
  })
  it('invalidates an old machine report before a failed extraction', async () => {
    const root = await mkdtemp(join(tmpdir(), 'audit-stale-'))
    const outDir = join(root, 'out')
    try {
      await mkdir(outDir)
      await writeFile(join(outDir, 'audit-report.json'), '{"old":true}')
      const adapter = { name: 'failed', async collect() { throw new Error('input incomplete') }, async detectStructural() { return [] } }
      await expect(buildReportData(adapter, root, { auditSha: 'test', outDir, check: true })).rejects.toThrow(/input incomplete/)
      await expect(access(join(outDir, 'audit-report.json'))).rejects.toBeTruthy()
      await expect(access(join(outDir, 'audit-report.md'))).rejects.toBeTruthy()
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  it('rejects machine output into an existing full-report directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'audit-check-output-'))
    try {
      await writeFile(join(root, 'package.json'), '{}')
      const out = join(root, 'reports')
      await mkdir(out)
      await writeFile(join(out, 'audit-report.md'), '# completed')
      await expect(runAudit(root, undefined, undefined, out, { stack: 'typescript', check: true })).rejects.toThrow(/separate.*directory/i)
      expect(await readFile(join(out, 'audit-report.md'), 'utf8')).toBe('# completed')
    } finally { await rm(root, { recursive: true, force: true }) }
  })

})
