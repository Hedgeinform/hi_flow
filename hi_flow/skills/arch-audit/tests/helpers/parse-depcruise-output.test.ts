import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { parseDepcruiseOutput } from '../../helpers/parse-depcruise-output.ts'

describe('parse-depcruise-output', () => {
  it('parses sample fixture', async () => {
    const raw = await readFile('tests/fixtures/depcruise-sample.json', 'utf-8')
    const result = parseDepcruiseOutput(raw)

    expect(result.findings).toHaveLength(1)
    expect(result.findings[0].rule_id).toBe('no-circular')
    expect(result.findings[0].raw_severity).toBe('warn')
    expect(result.findings[0].source.module).toBe('a')
    expect(result.findings[0].target.module).toBe('b')
    expect(result.findings[0].type).toBe('cycle')
  })

  it('builds dep_graph at module level (top-level src/<dir>)', async () => {
    const raw = await readFile('tests/fixtures/depcruise-sample.json', 'utf-8')
    const result = parseDepcruiseOutput(raw)
    expect(result.dep_graph).toEqual({ a: ['b'], b: ['a'], c: [] })
  })

  it('aggregates per_module_raw with counts', async () => {
    const raw = await readFile('tests/fixtures/depcruise-sample.json', 'utf-8')
    const result = parseDepcruiseOutput(raw)
    expect(result.per_module_raw['a'].ce).toBe(1) // a→b
    expect(result.per_module_raw['a'].ca).toBe(1) // b→a
    expect(result.per_module_raw['c'].ce).toBe(0)
    expect(result.per_module_raw['c'].ca).toBe(0)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseDepcruiseOutput('not json')).toThrow(/JSON/)
  })
})
