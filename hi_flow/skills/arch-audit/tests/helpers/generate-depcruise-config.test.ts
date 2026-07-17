import { describe, it, expect } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { generateDepcruiseConfig } from '../../helpers/generate-depcruise-config.ts'
import { getBaselineRules } from '../../core/baseline-rules.ts'

describe('generate-depcruise-config', () => {
  async function readGeneratedOptions(projectRoot: string): Promise<Record<string, unknown>> {
    const path = await generateDepcruiseConfig({
      baselineRules: [],
      projectRules: { forbidden: [], required: [] },
      projectRoot,
    })
    const content = await readFile(path, 'utf-8')
    await rm(path)
    const json = content.replace(/^module\.exports\s*=\s*/, '').trim()
    return (JSON.parse(json) as { options: Record<string, unknown> }).options
  }

  it('writes a valid CJS file with module.exports', async () => {
    const path = await generateDepcruiseConfig({
      baselineRules: getBaselineRules(),
      projectRules: { forbidden: [], required: [] },
      projectRoot: process.cwd(),
    })
    const content = await readFile(path, 'utf-8')
    expect(content).toMatch(/module\.exports\s*=/)
    expect(content).toMatch(/forbidden/)
    await rm(path)
  })

  it('embeds project forbidden rules', async () => {
    const path = await generateDepcruiseConfig({
      baselineRules: [],
      projectRules: {
        forbidden: [
          {
            name: 'project:test-rule',
            severity: 'HIGH',
            principle: 'p1',
            from: { path: '^src/a' },
            to: { path: '^src/b' },
          },
        ],
        required: [],
      },
      projectRoot: process.cwd(),
    })
    const content = await readFile(path, 'utf-8')
    expect(content).toMatch(/project:test-rule/)
    expect(content).toMatch(/\^src\/a/)
    await rm(path)
  })

  it('omits TypeScript-only options for a JavaScript project', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'depcruise-js-'))
    await writeFile(join(dir, 'package.json'), '{ "type": "module" }')
    const options = await readGeneratedOptions(dir)
    expect(options).not.toHaveProperty('tsConfig')
    expect(options).not.toHaveProperty('tsPreCompilationDeps')
    await rm(dir, { recursive: true })
  })

  it('keeps TypeScript options when tsconfig.json exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'depcruise-ts-'))
    await writeFile(join(dir, 'package.json'), '{}')
    await writeFile(join(dir, 'tsconfig.json'), '{}')
    const options = await readGeneratedOptions(dir)
    expect(options.tsConfig).toEqual({ fileName: 'tsconfig.json' })
    expect(options.tsPreCompilationDeps).toBe(true)
    await rm(dir, { recursive: true })
  })

  it('classifies .mjs and .cjs test files in the production-to-test rule', async () => {
    const path = await generateDepcruiseConfig({
      baselineRules: getBaselineRules(),
      projectRules: { forbidden: [], required: [] },
      projectRoot: process.cwd(),
    })
    const content = await readFile(path, 'utf-8')
    await rm(path)
    const config = JSON.parse(content.replace(/^module\.exports\s*=\s*/, '').trim()) as {
      forbidden: Array<{ name: string; from: { pathNot: string }; to: { path: string } }>
    }
    const rule = config.forbidden.find(candidate => candidate.name === 'baseline:not-to-test-from-prod')
    expect(rule).toBeDefined()
    if (!rule) throw new Error('baseline:not-to-test-from-prod missing from generated config')
    expect(new RegExp(rule.from.pathNot).test('pipeline-runtime/a/foo.test.mjs')).toBe(true)
    expect(new RegExp(rule.to.path).test('pipeline-runtime/a/foo.spec.cjs')).toBe(true)
  })
})
