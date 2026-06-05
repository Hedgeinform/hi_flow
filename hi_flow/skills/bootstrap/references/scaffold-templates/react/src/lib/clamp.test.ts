// Co-located test (React stack convention — react.md § Overrides), NOT a tests/ mirror.
import { describe, it, expect } from 'vitest'
import { clamp } from './clamp'

describe('clamp', () => {
  it('returns the value inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })
  it('clamps to the bounds', () => {
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(42, 0, 10)).toBe(10)
  })
  it('throws when min > max', () => {
    expect(() => clamp(1, 10, 0)).toThrow()
  })
})
