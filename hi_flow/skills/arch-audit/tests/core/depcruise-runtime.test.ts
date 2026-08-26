import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  readBundledDepcruiseVersion,
  resolveBundledDepcruiseCli,
  runBundledDepcruise,
} from '../../core/depcruise-runtime.ts'
import { withTempDir } from '../test-paths.ts'

const LARGE_JSON_PAYLOAD_BYTES = 2 * 1024 * 1024

describe('depcruise-runtime', () => {
  it('resolves the shipped dependency-cruiser cli under the runtime root', () => {
    expect(resolveBundledDepcruiseCli('C:/runtime-root').replaceAll('\\', '/')).toBe(
      'C:/runtime-root/dist/dependency-cruise.mjs',
    )
  })

  it('reads the bundled dependency-cruiser version through node', () => {
    const version = readBundledDepcruiseVersion('C:/runtime-root', ((_file: string, args: readonly string[]) => {
      expect(args[0]?.replaceAll('\\', '/')).toBe(
        'C:/runtime-root/dist/dependency-cruise.mjs',
      )
      expect(args[1]).toBe('--version')
      return '17.4.3\n'
    }) as any)

    expect(version).toBe('17.4.3')
  })

  it('returns stdout when the bundled depcruise exits non-zero with JSON output', () => {
    const stdout = runBundledDepcruise(
      'C:/runtime-root',
      'C:/project-root',
      'C:/tmp/.dependency-cruiser.cjs',
      'src/**/*.{ts,tsx}',
      ((_file: string, args: readonly string[], opts: { cwd?: string; encoding?: string }) => {
        expect(args[0]?.replaceAll('\\', '/')).toBe(
          'C:/runtime-root/dist/dependency-cruise.mjs',
        )
        expect(args.slice(1)).toEqual([
          '--output-type',
          'json',
          '--config',
          'C:/tmp/.dependency-cruiser.cjs',
          'src/**/*.{ts,tsx}',
        ])
        expect(opts).toMatchObject({ cwd: 'C:/project-root', encoding: 'utf-8' })
        throw { stdout: '{"summary":{"violations":[]}}' }
      }) as any,
    )

    expect(stdout).toBe('{"summary":{"violations":[]}}')
  })

  it('returns complete JSON from a non-zero depcruise exit when output exceeds the default child-process buffer', async () => {
    await withTempDir('hi-flow-large-depcruise-', async runtimeRoot => {
      const distDir = join(runtimeRoot, 'dist')
      await mkdir(distDir)
      await writeFile(
        join(distDir, 'dependency-cruise.mjs'),
        [
          `process.stdout.write(JSON.stringify({ padding: 'x'.repeat(${LARGE_JSON_PAYLOAD_BYTES}) }))`,
          'process.exitCode = 1',
          '',
        ].join('\n'),
        'utf-8',
      )

      const stdout = runBundledDepcruise(
        runtimeRoot,
        runtimeRoot,
        join(runtimeRoot, '.dependency-cruiser.cjs'),
        'src/**/*.{ts,tsx}',
      )
      const parsed = JSON.parse(stdout) as { padding: string }

      expect(stdout.length).toBeGreaterThan(1024 * 1024)
      expect(parsed.padding).toHaveLength(LARGE_JSON_PAYLOAD_BYTES)
    })
  })

  it('rejects partial stdout when bundled depcruise exceeds its configured buffer', () => {
    expect(() =>
      runBundledDepcruise(
        'C:/runtime-root',
        'C:/project-root',
        'C:/tmp/.dependency-cruiser.cjs',
        'src/**/*.{ts,tsx}',
        (() => {
          throw Object.assign(new Error('spawnSync node ENOBUFS'), {
            code: 'ENOBUFS',
            stdout: '{"partial":',
          })
        }) as any,
      ),
    ).toThrow(/buffer/i)
  })
})
