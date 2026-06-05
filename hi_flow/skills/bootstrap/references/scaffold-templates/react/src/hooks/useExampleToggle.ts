// Convention reference pattern (generic, non-domain). Demonstrates the `hooks/` layer:
// camelCase file (`useX.ts`), NAMED export, a downward import into the `lib/` leaf.
// No domain logic. Deletable without loss of meaning.
import { useState, useCallback } from 'react'
import { clamp } from '../../lib/clamp'

export function useExampleToggle(initial = false): {
  on: boolean
  toggle: () => void
  bump: (n: number) => number
} {
  const [on, setOn] = useState(initial)
  const toggle = useCallback(() => setOn(prev => !prev), [])
  // Trivial use of the lib/ leaf — only to demonstrate a downward (hooks -> lib) import.
  const bump = useCallback((n: number) => clamp(n, 0, 10), [])
  return { on, toggle, bump }
}
