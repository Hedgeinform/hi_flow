import { describe, it, expect } from 'vitest'
import { loadD9 } from '../../core/d9-loader.ts'

describe('d9-loader', () => {
  it('loads two principles from sample fixture', async () => {
    const d9 = await loadD9('tests/fixtures/d9-sample.md')
    expect(Object.keys(d9.principles)).toHaveLength(2)
    expect(d9.principles['acyclic-dependencies']).toBeDefined()
    expect(d9.principles['god-object-prohibition']).toBeDefined()
  })

  it('extracts description and fix_alternatives', async () => {
    const d9 = await loadD9('tests/fixtures/d9-sample.md')
    const p = d9.principles['acyclic-dependencies']!
    expect(p.description).toMatch(/No cycles/)
    expect(p.fix_alternatives).toHaveLength(3)
    expect(p.fix_alternatives[0]).toMatch(/Extract shared logic/)
  })

  it('throws on missing file', async () => {
    await expect(loadD9('tests/fixtures/missing.md')).rejects.toThrow()
  })

  it('does not include Related block in fix_alternatives', async () => {
    const d9 = await loadD9('tests/fixtures/d9-sample.md')
    const alts = d9.principles['acyclic-dependencies']!.fix_alternatives
    expect(alts.every(a => !a.includes('Related'))).toBe(true)
    expect(alts.every(a => !a.includes('god-object-prohibition'))).toBe(true)
  })
})
