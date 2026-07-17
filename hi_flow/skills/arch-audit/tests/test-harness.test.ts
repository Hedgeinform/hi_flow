import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { packagePath } from './test-paths.ts'

const historicallyMutatingIntegrations = [
  'barrel-project.test.ts',
  'cycle-project.test.ts',
  'god-object-project.test.ts',
  'layered-project.test.ts',
] as const

describe('integration test harness', () => {
  it.each(historicallyMutatingIntegrations)('%s writes reports to a temporary directory', async source => {
    const contents = await readFile(packagePath('tests', 'integration', source), 'utf8')

    expect(contents).not.toContain("join(projectRoot, 'audit-report')")
    expect(contents).toContain('withTempDir')
  })
})
