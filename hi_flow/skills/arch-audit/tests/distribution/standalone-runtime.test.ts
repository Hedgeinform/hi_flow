import { execFileSync } from 'node:child_process'
import { cp, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PACKAGE_ROOT, withTempDir } from '../test-paths.ts'

const PLUGIN_ROOT = join(PACKAGE_ROOT, '..', '..')

function npmCliPath(): string {
  const path = process.env.npm_execpath
  if (!path) throw new Error('npm_execpath is required for the distribution smoke test')
  return path
}

function runNpm(cwd: string, args: string[]): string {
  return execFileSync(process.execPath, [npmCliPath(), ...args], {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, npm_config_ignore_scripts: 'true' },
  })
}

describe('standalone installed runtime', () => {
  it('runs preflight and audits a project without node_modules in the plugin', async () => {
    await withTempDir('arch-audit-installed-plugin-', async tempRoot => {
      const installedPluginRoot = join(tempRoot, 'hi_flow')
      await cp(PLUGIN_ROOT, installedPluginRoot, {
        recursive: true,
        filter(source) {
          const segments = relative(PLUGIN_ROOT, source).split(sep)
          return !segments.includes('node_modules')
        },
      })

      const installedRuntimeRoot = join(installedPluginRoot, 'skills', 'arch-audit')
      const fixtureProject = join(tempRoot, 'aliased-project')
      const outDir = join(tempRoot, 'audit-output')

      await mkdir(join(fixtureProject, 'src', 'api'), { recursive: true })
      await mkdir(join(fixtureProject, 'src', 'domain'), { recursive: true })
      await writeFile(join(fixtureProject, 'package.json'), '{"type":"module"}\n')
      await writeFile(
        join(fixtureProject, 'src', 'api', 'index.ts'),
        "import type { Result } from '@domain/value'\nexport const result: Result = { value: 1 }\n",
      )
      await writeFile(
        join(fixtureProject, 'src', 'domain', 'value.ts'),
        'export interface Result { value: number }\n',
      )
      await writeFile(join(fixtureProject, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: { '@domain/*': ['src/domain/*'] },
        },
      }))

      const versionOutput = runNpm(installedRuntimeRoot, ['run', 'depcruise:version'])
      expect(versionOutput).toContain('17.4.3')

      const infoOutput = execFileSync(
        process.execPath,
        [join(installedRuntimeRoot, 'dist', 'dependency-cruise.mjs'), '--info'],
        { cwd: installedRuntimeRoot, encoding: 'utf-8' },
      )
      expect(infoOutput).toContain('acorn@')

      runNpm(installedRuntimeRoot, [
        'run',
        'audit',
        '--',
        '--out-dir',
        outDir,
        fixtureProject,
      ])

      const report = JSON.parse(await readFile(join(outDir, 'audit-report.json'), 'utf-8'))
      expect(report.metrics.dep_graph.api).toContain('domain')

      const clusterProsePath = join(outDir, 'cluster-prose.json')
      await writeFile(clusterProsePath, '{}\n')
      runNpm(installedRuntimeRoot, [
        'run',
        'render-md',
        '--',
        join(outDir, 'audit-report.json'),
        clusterProsePath,
      ])
      expect(await readFile(join(outDir, 'audit-report.md'), 'utf-8')).toContain('# Audit Report')

      const patchProject = join(tempRoot, 'patch-project')
      const patchPath = join(tempRoot, 'sample-patch.yaml')
      await mkdir(patchProject)
      await copyFile(join(installedRuntimeRoot, 'tests', 'fixtures', 'sample-patch.yaml'), patchPath)
      runNpm(installedRuntimeRoot, [
        'run',
        'apply-patch',
        '--',
        patchPath,
        patchProject,
        join(installedPluginRoot, 'references', 'architectural-principles.md'),
      ])
      expect(await readFile(join(patchProject, '.audit-rules.yaml'), 'utf-8')).toContain('project:dispatcher-no-pipeline')

      const d9Path = join(tempRoot, 'd9-sample.md')
      await copyFile(join(installedRuntimeRoot, 'tests', 'fixtures', 'd9-sample.md'), d9Path)
      runNpm(installedRuntimeRoot, ['run', 'regenerate-principles-index', '--', d9Path])
      expect(JSON.parse(await readFile(join(tempRoot, 'd9-sample-index.json'), 'utf-8')).principles).toBeDefined()
    })
  }, 60_000)
})
