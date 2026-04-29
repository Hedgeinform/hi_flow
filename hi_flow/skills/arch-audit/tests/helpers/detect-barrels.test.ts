import { describe, it, expect } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { detectBarrels } from '../../helpers/detect-barrels.ts'

async function makeProject(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'barrel-'))
  await mkdir(join(dir, 'src/foo'), { recursive: true })
  await mkdir(join(dir, 'src/bar'), { recursive: true })
  return dir
}

describe('detect-barrels', () => {
  it('flags a barrel imported by a sibling module', async () => {
    const dir = await makeProject()
    await writeFile(
      join(dir, 'src/foo/index.ts'),
      `export * from './a.ts'\nexport { B } from './b.ts'\n`,
    )
    await writeFile(join(dir, 'src/foo/a.ts'), 'export const A = 1\n')
    await writeFile(join(dir, 'src/foo/b.ts'), 'export const B = 2\n')
    await writeFile(join(dir, 'src/bar/index.ts'), `export * from '../foo'\n`)

    const findings = await detectBarrels({
      projectPath: dir,
      modulesList: ['foo', 'bar'],
      barrelImports: [{ from: 'bar', to: 'foo', targetFile: 'src/foo/index.ts' }],
    })

    expect(findings).toHaveLength(1)
    expect(findings[0]!.rule_id).toBe('barrel-file')
    expect(findings[0]!.source.module).toBe('bar')
    expect(findings[0]!.target!.module).toBe('foo')

    await rm(dir, { recursive: true })
  })

  it('does NOT flag a barrel that is only imported within its own module', async () => {
    const dir = await makeProject()
    await writeFile(join(dir, 'src/foo/index.ts'), `export * from './a.ts'\n`)
    await writeFile(join(dir, 'src/foo/a.ts'), 'export const A = 1\n')

    const findings = await detectBarrels({
      projectPath: dir,
      modulesList: ['foo'],
      barrelImports: [],
    })

    expect(findings).toHaveLength(0)
    await rm(dir, { recursive: true })
  })

  it('does NOT flag a non-barrel index.ts (has business logic)', async () => {
    const dir = await makeProject()
    await writeFile(
      join(dir, 'src/foo/index.ts'),
      `import { x } from './a.ts'\nexport function doStuff() { return x + 1 }\n`,
    )
    await writeFile(join(dir, 'src/foo/a.ts'), 'export const x = 1\n')

    const findings = await detectBarrels({
      projectPath: dir,
      modulesList: ['foo'],
      barrelImports: [{ from: 'bar', to: 'foo', targetFile: 'src/foo/index.ts' }],
    })

    expect(findings).toHaveLength(0)
    await rm(dir, { recursive: true })
  })

  it('skips modules without index files', async () => {
    const dir = await makeProject()
    await writeFile(join(dir, 'src/foo/a.ts'), 'export const A = 1\n')

    const findings = await detectBarrels({
      projectPath: dir,
      modulesList: ['foo'],
      barrelImports: [],
    })

    expect(findings).toHaveLength(0)
    await rm(dir, { recursive: true })
  })

  it('handles index.tsx and index.js variants', async () => {
    const dir = await makeProject()
    await writeFile(join(dir, 'src/foo/index.tsx'), `export * from './a.ts'\n`)
    await writeFile(join(dir, 'src/foo/a.ts'), 'export const A = 1\n')

    const findings = await detectBarrels({
      projectPath: dir,
      modulesList: ['foo'],
      barrelImports: [{ from: 'bar', to: 'foo', targetFile: 'src/foo/index.tsx' }],
    })

    expect(findings).toHaveLength(1)
    expect(findings[0]!.extras?.barrel_file).toMatch(/index\.tsx$/)
    await rm(dir, { recursive: true })
  })

  it('aggregates multiple importers into extras.importing_modules', async () => {
    const dir = await makeProject()
    await mkdir(join(dir, 'src/baz'), { recursive: true })
    await writeFile(join(dir, 'src/foo/index.ts'), `export * from './a.ts'\n`)
    await writeFile(join(dir, 'src/foo/a.ts'), 'export const A = 1\n')

    const findings = await detectBarrels({
      projectPath: dir,
      modulesList: ['foo', 'bar', 'baz'],
      barrelImports: [
        { from: 'bar', to: 'foo', targetFile: 'src/foo/index.ts' },
        { from: 'baz', to: 'foo', targetFile: 'src/foo/index.ts' },
      ],
    })

    expect(findings).toHaveLength(2)
    expect(findings.map(f => f.source.module).sort()).toEqual(['bar', 'baz'])

    await rm(dir, { recursive: true })
  })
})
