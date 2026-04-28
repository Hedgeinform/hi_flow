import { describe, it, expect } from 'vitest'
import { checkDepcruiseVersion } from '../../core/preflight.ts'
import type { ToolingRequirement } from '../../core/types.ts'

const req: ToolingRequirement = { name: 'dependency-cruiser', min: '16.0.0', max: '17.0.0' }

describe('preflight.checkDepcruiseVersion', () => {
  it('passes for version in range', () => {
    expect(() => checkDepcruiseVersion('16.3.0', req)).not.toThrow()
    expect(() => checkDepcruiseVersion('16.0.0', req)).not.toThrow()
    expect(() => checkDepcruiseVersion('16.99.99', req)).not.toThrow()
  })
  it('throws for version below min', () => {
    expect(() => checkDepcruiseVersion('15.5.0', req)).toThrow(/15\.5\.0.*16\.0\.0/)
  })
  it('throws for version at or above max (exclusive)', () => {
    expect(() => checkDepcruiseVersion('17.0.0', req)).toThrow(/17\.0\.0.*17\.0\.0/)
    expect(() => checkDepcruiseVersion('18.1.0', req)).toThrow(/18\.1\.0/)
  })
  it('throws on unparseable version string', () => {
    expect(() => checkDepcruiseVersion('not-a-version', req)).toThrow(/parse|version/)
  })
  it('parses version from `dependency-cruiser --version` output containing extras', () => {
    expect(() => checkDepcruiseVersion('dependency-cruiser@16.3.0\n', req)).not.toThrow()
  })
})
