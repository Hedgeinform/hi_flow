// Co-located test, jsdom environment + Testing Library `renderHook`.
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExampleToggle } from './useExampleToggle'

describe('useExampleToggle', () => {
  it('starts off and toggles on', () => {
    const { result } = renderHook(() => useExampleToggle())
    expect(result.current.on).toBe(false)
    act(() => result.current.toggle())
    expect(result.current.on).toBe(true)
  })

  it('bump clamps into [0, 10]', () => {
    const { result } = renderHook(() => useExampleToggle())
    expect(result.current.bump(42)).toBe(10)
    expect(result.current.bump(-1)).toBe(0)
  })
})
