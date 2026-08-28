import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { parseDepcruiseOutput } from '../../helpers/parse-depcruise-output.ts'
import { fixturePath } from '../test-paths.ts'

describe('parse-depcruise-output', () => {
  it('does not duplicate a two-module cycle owned by inappropriate-intimacy', async () => {
    const raw = await readFile(fixturePath('depcruise-sample.json'), 'utf-8')
    const result = parseDepcruiseOutput(raw)

    expect(result.findings).toEqual([])
  })

  it('builds dep_graph at module level (top-level src/<dir>)', async () => {
    const raw = await readFile(fixturePath('depcruise-sample.json'), 'utf-8')
    const result = parseDepcruiseOutput(raw)
    expect(result.dep_graph).toEqual({ a: ['b'], b: ['a'], c: [] })
  })

  it('aggregates per_module_raw with counts', async () => {
    const raw = await readFile(fixturePath('depcruise-sample.json'), 'utf-8')
    const result = parseDepcruiseOutput(raw)
    expect(result.per_module_raw['a']!.ce).toBe(1) // a→b
    expect(result.per_module_raw['a']!.ca).toBe(1) // b→a
    expect(result.per_module_raw['c']!.ce).toBe(0)
    expect(result.per_module_raw['c']!.ca).toBe(0)
  })

  it('returns the audited source files grouped by module for LOC aggregation', async () => {
    const raw = await readFile(fixturePath('depcruise-sample.json'), 'utf-8')
    const result = parseDepcruiseOutput(raw)

    expect(result.source_files_by_module).toEqual({
      a: ['src/a/index.ts'],
      b: ['src/b/index.ts'],
      c: ['src/c/index.ts'],
    })
  })

  it('normalizes dependency-cruiser cycle objects to ordered module members', () => {
    const raw = JSON.stringify({
      summary: {
        violations: [{
          type: 'cycle',
          from: 'src/a/one.ts',
          to: 'src/b/two.ts',
          rule: { name: 'no-circular', severity: 'warn' },
          cycle: [
            { name: 'src/b/two.ts', dependencyTypes: ['local'] },
            { name: 'src/c/three.ts', dependencyTypes: ['local'] },
            { name: 'src/a/one.ts', dependencyTypes: ['local'] },
          ],
        }],
      },
      modules: [
        { source: 'src/a/one.ts', dependencies: [{ resolved: 'src/b/two.ts', module: '../b/two.ts' }] },
        { source: 'src/b/two.ts', dependencies: [{ resolved: 'src/c/three.ts', module: '../c/three.ts' }] },
        { source: 'src/c/three.ts', dependencies: [{ resolved: 'src/a/one.ts', module: '../a/one.ts' }] },
      ],
    })

    const result = parseDepcruiseOutput(raw)

    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]!.extras).toEqual({ members: ['a', 'b', 'c'] })
  })

  it('drops file-level cycles that collapse to one module', () => {
    const raw = JSON.stringify({
      summary: {
        violations: [{
          type: 'cycle',
          from: 'src/a/one.ts',
          to: 'src/a/two.ts',
          rule: { name: 'no-circular', severity: 'warn' },
          cycle: ['src/a/one.ts', 'src/a/two.ts', 'src/a/one.ts'],
        }],
      },
      modules: [
        { source: 'src/a/one.ts', dependencies: [{ resolved: 'src/a/two.ts', module: './two.ts' }] },
        { source: 'src/a/two.ts', dependencies: [{ resolved: 'src/a/one.ts', module: './one.ts' }] },
      ],
    })

    expect(parseDepcruiseOutput(raw).findings).toEqual([])
  })

  it('throws on invalid JSON', () => {
    expect(() => parseDepcruiseOutput('not json')).toThrow(/JSON/)
  })

  it('extracts parsing_errors from broken modules', async () => {
    const raw = await readFile(fixturePath('depcruise-with-errors.json'), 'utf-8')
    const result = parseDepcruiseOutput(raw)
    expect(result.parsing_errors).toBeDefined()
    expect(result.parsing_errors).toHaveLength(1)
    expect(result.parsing_errors![0]!.file).toBe('src/c/broken.ts')
    expect(result.parsing_errors![0]!.error).toMatch(/SyntaxError/)
  })

  it('does NOT treat valid:false-without-error as a parse error (no-orphans violation marker)', () => {
    const raw = JSON.stringify({
      summary: { violations: [] },
      modules: [
        { source: 'src/a/index.ts', dependencies: [] },
        // Real orphan that depcruise marked valid:false but with no error message —
        // this is a violation flag, NOT a parse error.
        { source: 'src/b/index.ts', dependencies: [], valid: false, orphan: true },
      ],
    })
    const result = parseDepcruiseOutput(raw)
    expect(result.parsing_errors === undefined || result.parsing_errors!.length === 0).toBe(true)
  })

  it('parsing_errors absent when no broken modules', async () => {
    const raw = await readFile(fixturePath('depcruise-sample.json'), 'utf-8')
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

  it('surfaces barrel_imports for edges resolving to an index file', async () => {
    const raw = await readFile(fixturePath('depcruise-barrel-sample.json'), 'utf-8')
    const result = parseDepcruiseOutput(raw)
    expect(result.barrel_imports).toBeDefined()
    // bar -> foo, target file is src/foo/index.ts
    const edge = result.barrel_imports!.find(e => e.from === 'bar' && e.to === 'foo')
    expect(edge).toBeDefined()
    expect(edge!.targetFile).toBe('src/foo/index.ts')
  })

  it('builds a configured-root graph and recognizes an imported index.mjs barrel', () => {
    const raw = JSON.stringify({
      summary: { violations: [] },
      modules: [
        {
          source: 'pipeline-runtime/a/index.mjs',
          dependencies: [
            { resolved: 'pipeline-runtime/b/index.mjs', module: '../b/index.mjs' },
          ],
        },
        { source: 'pipeline-runtime/b/index.mjs', dependencies: [] },
      ],
    })
    const result = parseDepcruiseOutput(raw, 'pipeline-runtime')
    expect(result.dep_graph).toEqual({ a: ['b'], b: [] })
    expect(result.barrel_imports).toEqual([
      { from: 'a', to: 'b', targetFile: 'pipeline-runtime/b/index.mjs' },
    ])
  })

  it('does NOT surface barrel_imports for non-index targets', async () => {
    const raw = JSON.stringify({
      summary: { violations: [] },
      modules: [
        { source: 'src/a/index.ts', dependencies: [{ resolved: 'src/b/specific.ts', module: '../b/specific' }] },
        { source: 'src/b/specific.ts', dependencies: [] },
      ],
    })
    const result = parseDepcruiseOutput(raw)
    expect(result.barrel_imports ?? []).toHaveLength(0)
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
