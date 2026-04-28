import { describe, it, expect } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createTypescriptDepcruiseAdapter } from '../../adapters/typescript-depcruise.ts'

describe('typescript-depcruise adapter — identity', () => {
  it('exposes constants', () => {
    const a = createTypescriptDepcruiseAdapter()
    expect(a.name).toBe('typescript-depcruise')
    expect(a.version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(a.requiredTooling[0]!.name).toBe('dependency-cruiser')
    expect(a.requiredTooling[0]!.min).toBe('16.0.0')
    expect(a.requiredTooling[0]!.max).toBe('17.0.0')
  })

  it('layerNamingMap covers canonical layer names from baseline-rules', () => {
    const a = createTypescriptDepcruiseAdapter()
    expect(a.layerNamingMap['domain']).toBeDefined()
    expect(a.layerNamingMap['core']).toBe('domain')
    expect(a.layerNamingMap['infrastructure']).toBeDefined()
    expect(a.layerNamingMap['ports']).toBeDefined()
  })

  it('channelSdkList has the canonical SDKs', () => {
    const a = createTypescriptDepcruiseAdapter()
    expect(a.channelSdkList).toContain('telegraf')
    expect(a.channelSdkList).toContain('express')
    expect(a.channelSdkList).toContain('@slack/web-api')
  })
})

describe('typescript-depcruise adapter — identifyModules', () => {
  it('lists top-level subdirs of src/', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'tda-'))
    await mkdir(join(dir, 'src/a'), { recursive: true })
    await mkdir(join(dir, 'src/b'), { recursive: true })
    await writeFile(join(dir, 'src/a/index.ts'), '')
    await writeFile(join(dir, 'src/b/index.ts'), '')

    const a = createTypescriptDepcruiseAdapter()
    const modules = await a.identifyModules(dir)
    expect(modules.map(m => m.name).sort()).toEqual(['a', 'b'])
    await rm(dir, { recursive: true })
  })

  it('hard-fails when src/ does not exist', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'tda-'))
    const a = createTypescriptDepcruiseAdapter()
    await expect(a.identifyModules(dir)).rejects.toThrow(/src\//)
    await rm(dir, { recursive: true })
  })
})

describe('typescript-depcruise adapter — detect', () => {
  it('returns true for a TS project (has package.json + tsconfig.json)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'tda-'))
    await writeFile(join(dir, 'package.json'), '{}')
    await writeFile(join(dir, 'tsconfig.json'), '{}')
    const a = createTypescriptDepcruiseAdapter()
    expect(await a.detect(dir)).toBe(true)
    await rm(dir, { recursive: true })
  })

  it('returns false when neither marker present', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'tda-'))
    const a = createTypescriptDepcruiseAdapter()
    expect(await a.detect(dir)).toBe(false)
    await rm(dir, { recursive: true })
  })
})

describe('typescript-depcruise adapter — structural detection', () => {
  it('detects god-object when Ca>10 AND Ce>10 AND LOC>300', async () => {
    const a = createTypescriptDepcruiseAdapter()
    const findings = await a.detectStructural({
      projectPath: '/tmp/x',
      depGraph: {},
      perModuleRaw: { hub: { ca: 12, ce: 11, loc: 400 } },
      projectRules: { forbidden: [], required: [] },
    })
    expect(findings.some(f => f.rule_id === 'god-object')).toBe(true)
  })

  it('detects dependency-hub when Ca > max(20% N, 10)', async () => {
    const a = createTypescriptDepcruiseAdapter()
    const perModuleRaw: Record<string, { ca: number; ce: number; loc: number }> = {}
    for (let i = 0; i < 30; i++) perModuleRaw[`m${i}`] = { ca: 0, ce: 0, loc: 100 }
    perModuleRaw['hub'] = { ca: 12, ce: 5, loc: 100 }
    const findings = await a.detectStructural({
      projectPath: '/tmp/x',
      depGraph: {},
      perModuleRaw,
      projectRules: { forbidden: [], required: [] },
    })
    // 20% of 31 = 6.2, max(6.2, 10) = 10. hub.ca = 12 > 10 → fires
    expect(findings.some(f => f.rule_id === 'dependency-hub' && f.source.module === 'hub')).toBe(true)
  })

  it('detects high-fanout when Ce > 15', async () => {
    const a = createTypescriptDepcruiseAdapter()
    const findings = await a.detectStructural({
      projectPath: '/tmp/x',
      depGraph: {},
      perModuleRaw: { fanout: { ca: 0, ce: 16, loc: 100 } },
      projectRules: { forbidden: [], required: [] },
    })
    expect(findings.some(f => f.rule_id === 'high-fanout')).toBe(true)
  })
})
