import { describe, expect, it } from 'vitest'
import {
  readBundledDepcruiseVersion,
  resolveBundledDepcruiseCli,
  runBundledDepcruise,
} from '../../core/depcruise-runtime.ts'

describe('depcruise-runtime', () => {
  it('resolves the bundled dependency-cruiser cli under the runtime root', () => {
    expect(resolveBundledDepcruiseCli('C:/runtime-root')).toContain('node_modules')
    expect(resolveBundledDepcruiseCli('C:/runtime-root')).toContain('dependency-cruiser')
    expect(resolveBundledDepcruiseCli('C:/runtime-root')).toContain('dependency-cruise.mjs')
  })

  it('reads the bundled dependency-cruiser version through node', () => {
    const version = readBundledDepcruiseVersion('C:/runtime-root', ((_file: string, args: readonly string[]) => {
      expect(args[0]?.replaceAll('\\', '/')).toBe(
        'C:/runtime-root/node_modules/dependency-cruiser/bin/dependency-cruise.mjs',
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
          'C:/runtime-root/node_modules/dependency-cruiser/bin/dependency-cruise.mjs',
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
})
