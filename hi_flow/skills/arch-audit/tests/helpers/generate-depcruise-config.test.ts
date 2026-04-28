import { describe, it, expect } from 'vitest'
import { readFile, rm } from 'node:fs/promises'
import { generateDepcruiseConfig } from '../../helpers/generate-depcruise-config.ts'
import { getBaselineRules } from '../../core/baseline-rules.ts'

describe('generate-depcruise-config', () => {
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
})
