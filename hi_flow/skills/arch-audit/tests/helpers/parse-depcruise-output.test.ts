import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { parseDepcruiseOutput } from '../../helpers/parse-depcruise-output.ts'

describe('parse-depcruise-output', () => {
  it('parses sample fixture', async () => {
    const raw = await readFile('tests/fixtures/depcruise-sample.json', 'utf-8')
    const result = parseDepcruiseOutput(raw)

    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]!.rule_id).toBe('no-circular')
    expect(result.findings[0]!.raw_severity).toBe('warn')
    expect(result.findings[0]!.source.module).toBe('a')
    expect(result.findings[0]!.target!.module).toBe('b')
    expect(result.findings[0]!.type).toBe('cycle')
  })

  it('builds dep_graph at module level (top-level src/<dir>)', async () => {
    const raw = await readFile('tests/fixtures/depcruise-sample.json', 'utf-8')
    const result = parseDepcruiseOutput(raw)
    expect(result.dep_graph).toEqual({ a: ['b'], b: ['a'], c: [] })
  })

  it('aggregates per_module_raw with counts', async () => {
    const raw = await readFile('tests/fixtures/depcruise-sample.json', 'utf-8')
    const result = parseDepcruiseOutput(raw)
    expect(result.per_module_raw['a']!.ce).toBe(1) // a→b
    expect(result.per_module_raw['a']!.ca).toBe(1) // b→a
    expect(result.per_module_raw['c']!.ce).toBe(0)
    expect(result.per_module_raw['c']!.ca).toBe(0)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseDepcruiseOutput('not json')).toThrow(/JSON/)
  })

  it('extracts parsing_errors from broken modules', async () => {
    const raw = await readFile('tests/fixtures/depcruise-with-errors.json', 'utf-8')
    const result = parseDepcruiseOutput(raw)
    expect(result.parsing_errors).toBeDefined()
    expect(result.parsing_errors).toHaveLength(1)
    expect(result.parsing_errors![0]!.file).toBe('src/c/broken.ts')
    expect(result.parsing_errors![0]!.error).toMatch(/SyntaxError/)
  })

  it('parsing_errors absent when no broken modules', async () => {
    const raw = await readFile('tests/fixtures/depcruise-sample.json', 'utf-8')
    const result = parseDepcruiseOutput(raw)
    expect(result.parsing_errors === undefined || result.parsing_errors!.length === 0).toBe(true)
  })

  it('skips edges to node_modules / node-builtins', async () => {
    const raw = JSON.stringify({
      summary: { violations: [] },
      modules: [
        {
          source: 'src/a/index.ts',
          dependencies: [
            { resolved: 'node_modules/lodash/index.js', module: 'lodash' },
            { resolved: 'crypto', module: 'node:crypto' },
            { resolved: 'src/b/index.ts', module: '../b' },
          ],
        },
        { source: 'src/b/index.ts', dependencies: [] },
      ],
    })
    const result = parseDepcruiseOutput(raw)
    expect(Object.keys(result.dep_graph).sort()).toEqual(['a', 'b'])
    expect(result.dep_graph['a']).toEqual(['b'])
  })

  it('skips top-level src/*.ts files (only src/<dir>/ counts)', async () => {
    const raw = JSON.stringify({
      summary: { violations: [] },
      modules: [
        { source: 'src/index.ts', dependencies: [{ resolved: 'src/a/index.ts', module: './a' }] },
        { source: 'src/a/index.ts', dependencies: [] },
      ],
    })
    const result = parseDepcruiseOutput(raw)
    expect(Object.keys(result.dep_graph)).toEqual(['a'])
  })
})
