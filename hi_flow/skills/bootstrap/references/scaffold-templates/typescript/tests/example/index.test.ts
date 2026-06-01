// Co-located-by-mirror test: `tests/example/` mirrors `src/example/`
// (the project's test-location convention — see the stack file's Testing section).
//
// Import line is the only thing that differs between runtimes:
//   - Node  : import { describe, it, expect } from 'vitest'
//   - Bun   : import { describe, it, expect } from 'bun:test'
// The Vitest-compatible API (describe / it / expect) is identical for both.
import { describe, it, expect } from 'vitest'

// Import from the concrete file path, not from a barrel (import discipline).
import { clamp } from '../../src/example/index'

describe('clamp', () => {
  it('returns the value when it is inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('clamps to the bounds when the value is outside the range', () => {
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(42, 0, 10)).toBe(10)
  })

  it('throws when min is greater than max', () => {
    expect(() => clamp(1, 10, 0)).toThrow()
  })
})
