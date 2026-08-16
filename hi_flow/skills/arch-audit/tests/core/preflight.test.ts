import { describe, it, expect } from 'vitest'
import { checkDepcruiseVersion } from '../../core/preflight.ts'
import type { ToolingRequirement } from '../../core/types.ts'

const req: ToolingRequirement = { name: 'dependency-cruiser', min: '16.0.0', max: '17.0.0' }

function errorMessage(run: () => void): string {
  try {
    run()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  throw new Error('Expected function to throw')
}

describe('preflight.checkDepcruiseVersion', () => {
  it('passes for version in range', () => {
    expect(() => checkDepcruiseVersion('16.3.0', req)).not.toThrow()
    expect(() => checkDepcruiseVersion('16.0.0', req)).not.toThrow()
    expect(() => checkDepcruiseVersion('16.99.99', req)).not.toThrow()
  })
  it('throws for version below min', () => {
    const message = errorMessage(() => checkDepcruiseVersion('15.5.0', req))
    expect(message).toMatch(/15\.5\.0.*16\.0\.0/)
    expect(message).toMatch(/update the hi_flow plugin.*new session/i)
    expect(message).not.toMatch(/npm install/i)
  })
  it('throws for version at or above max (exclusive)', () => {
    expect(() => checkDepcruiseVersion('17.0.0', req)).toThrow(/17\.0\.0.*17\.0\.0/)
    const message = errorMessage(() => checkDepcruiseVersion('18.1.0', req))
    expect(message).toMatch(/18\.1\.0/)
    expect(message).toMatch(/update the hi_flow plugin.*new session/i)
    expect(message).not.toMatch(/npm install/i)
  })
  it('throws on unparseable version string', () => {
    expect(() => checkDepcruiseVersion('not-a-version', req)).toThrow(/parse|version/)
  })
  it('parses version from `dependency-cruiser --version` output containing extras', () => {
    expect(() => checkDepcruiseVersion('dependency-cruiser@16.3.0\n', req)).not.toThrow()
  })
})
