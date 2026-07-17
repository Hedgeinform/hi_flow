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
    expect(a.requiredTooling[0]!.max).toBe('18.0.0')
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

  it('lists production modules below a configured JavaScript root', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'tda-js-'))
    await mkdir(join(dir, 'pipeline-runtime/a'), { recursive: true })
    await mkdir(join(dir, 'pipeline-runtime/b'), { recursive: true })
    await writeFile(join(dir, 'pipeline-runtime/a/index.mjs'), 'export const a = 1\n')
    await writeFile(join(dir, 'pipeline-runtime/b/index.cjs'), 'exports.b = 2\n')

    const a = createTypescriptDepcruiseAdapter()
    const modules = await a.identifyModules(dir, 'pipeline-runtime')
    expect(modules.map(m => m.name).sort()).toEqual(['a', 'b'])
    await rm(dir, { recursive: true })
  })

  it('hard-fails when a configured root has no production modules', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'tda-empty-'))
    await mkdir(join(dir, 'pipeline-runtime/a'), { recursive: true })
    await writeFile(join(dir, 'pipeline-runtime/a/README.md'), 'not production code\n')

    const a = createTypescriptDepcruiseAdapter()
    await expect(a.identifyModules(dir, 'pipeline-runtime')).rejects.toThrow(/production modules/i)
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

  it('returns true for a JavaScript project with package.json and no tsconfig.json', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'tda-js-'))
    await writeFile(join(dir, 'package.json'), '{ "type": "module" }')
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

  it('detects port-adapter-direction when domain imports infrastructure', async () => {
    const a = createTypescriptDepcruiseAdapter()
    const findings = await a.detectStructural({
      projectPath: '/tmp/x',
      depGraph: { domain: ['infrastructure'], infrastructure: [] },
      perModuleRaw: { domain: { ca: 0, ce: 1, loc: 100 }, infrastructure: { ca: 1, ce: 0, loc: 100 } },
      projectRules: { forbidden: [], required: [] },
    })
    expect(findings.some(f => f.rule_id === 'port-adapter-direction')).toBe(true)
  })

  it('detects domain-no-channel-sdk when domain imports a known channel SDK', async () => {
    const a = createTypescriptDepcruiseAdapter()
    const findings = await a.detectStructural({
      projectPath: '/tmp/x',
      depGraph: { domain: [] },
      perModuleRaw: { domain: { ca: 0, ce: 1, loc: 100 } },
      projectRules: { forbidden: [], required: [] },
      sdkEdges: [{ from: 'domain', sdk: 'telegraf' }],
    })
    expect(findings.some(f => f.rule_id === 'domain-no-channel-sdk')).toBe(true)
  })

  it('emits barrel-file findings via detectBarrels integration', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'tda-barrel-'))
    await mkdir(join(dir, 'src/foo'), { recursive: true })
    await mkdir(join(dir, 'src/bar'), { recursive: true })
    await writeFile(join(dir, 'src/foo/index.ts'), `export * from './a.ts'\n`)
    await writeFile(join(dir, 'src/foo/a.ts'), 'export const A = 1\n')
    await writeFile(join(dir, 'src/bar/index.ts'), `export * from '../foo'\n`)

    const a = createTypescriptDepcruiseAdapter()
    const findings = await a.detectStructural({
      projectPath: dir,
      depGraph: { foo: [], bar: ['foo'] },
      perModuleRaw: { foo: { ca: 1, ce: 0, loc: 1 }, bar: { ca: 0, ce: 1, loc: 1 } },
      projectRules: { forbidden: [], required: [] },
      barrelImports: [{ from: 'bar', to: 'foo', targetFile: 'src/foo/index.ts' }],
      modulesList: ['foo', 'bar'],
    })

    expect(findings.some(f => f.rule_id === 'barrel-file')).toBe(true)

    await rm(dir, { recursive: true })
  })
})

describe('typescript-depcruise adapter — frontend layered detection', () => {
  const fe = (depGraph: Record<string, string[]>, names: string[]) => {
    const perModuleRaw: Record<string, { ca: number; ce: number; loc: number }> = {}
    for (const n of names) perModuleRaw[n] = { ca: 1, ce: 1, loc: 50 }
    return createTypescriptDepcruiseAdapter().detectStructural({
      projectPath: '/tmp/x', depGraph, perModuleRaw, projectRules: { forbidden: [], required: [] },
    })
  }

  it('flags an upward import (component -> page) as frontend-layered-respect', async () => {
    const findings = await fe(
      { components: ['pages'], pages: [], hooks: [], lib: [] },
      ['components', 'pages', 'hooks', 'lib'],
    )
    expect(findings.some(f => f.rule_id === 'frontend-layered-respect'
      && f.source.module === 'components' && f.target?.module === 'pages')).toBe(true)
    // backend layered rule must be skipped in a frontend profile
    expect(findings.some(f => f.rule_id === 'layered-respect')).toBe(false)
  })

  it('passes a clean downward chain (pages -> components -> hooks -> lib)', async () => {
    const findings = await fe(
      { pages: ['components'], components: ['hooks'], hooks: ['lib'], lib: [] },
      ['pages', 'components', 'hooks', 'lib'],
    )
    expect(findings.some(f => f.rule_id === 'frontend-layered-respect')).toBe(false)
  })

  it('flags a frontend layer cycle (components <-> hooks) as frontend-layer-cycle', async () => {
    const findings = await fe(
      { components: ['hooks'], hooks: ['components'], pages: [], lib: [] },
      ['components', 'hooks', 'pages', 'lib'],
    )
    expect(findings.some(f => f.rule_id === 'frontend-layer-cycle')).toBe(true)
  })

  it('does NOT emit a false app -> api violation in a frontend profile', async () => {
    // app/ and api/ are in the BACKEND map (application / presentation); under the
    // backend layered rule app->api would be order 2>1 = violation. In a frontend
    // profile app=pages(1), api=data-access(5): 1>5 false -> no violation.
    const findings = await fe(
      { app: ['api'], api: [], components: [], hooks: [] },
      ['app', 'api', 'components', 'hooks'],
    )
    expect(findings.some(f => f.rule_id === 'layered-respect')).toBe(false)
    expect(findings.some(f => f.rule_id === 'frontend-layered-respect')).toBe(false)
  })

  it('leaves a backend project on the backend layered rule (no frontend signal dirs)', async () => {
    const findings = await fe(
      { infrastructure: ['domain'], domain: [] },
      ['infrastructure', 'domain'],
    )
    expect(findings.some(f => f.rule_id === 'layered-respect')).toBe(true)
    expect(findings.some(f => f.rule_id === 'frontend-layered-respect')).toBe(false)
  })
})

describe('typescript-depcruise adapter — declarative frontend profile', () => {
  const run = (
    depGraph: Record<string, string[]>,
    names: string[],
    overrides?: Record<string, unknown>,
  ) => {
    const perModuleRaw: Record<string, { ca: number; ce: number; loc: number }> = {}
    for (const n of names) perModuleRaw[n] = { ca: 1, ce: 1, loc: 50 }
    return createTypescriptDepcruiseAdapter().detectStructural({
      projectPath: '/tmp/x',
      depGraph,
      perModuleRaw,
      projectRules: { forbidden: [], required: [], ...(overrides ? { overrides } : {}) },
    })
  }

  it('activates on a feature-sliced layout when profile:frontend is declared', async () => {
    // Custom feature names, zero literal signal dirs; layer_aliases map onto fe layers.
    // comm=data-access(5) imports shell=pages(1): 5>1 -> upward -> frontend-layered-respect.
    const findings = await run(
      { comm: ['shell'], shell: [] },
      ['comm', 'shell'],
      { profile: 'frontend', layer_aliases: { comm: 'data-access', shell: 'pages' } },
    )
    expect(findings.some(f => f.rule_id === 'frontend-layered-respect'
      && f.source.module === 'comm' && f.target?.module === 'shell')).toBe(true)
    expect(findings.some(f => f.rule_id === 'layered-respect')).toBe(false)
  })

  it('does NOT activate on a feature-sliced layout without declaration (no auto-detect)', async () => {
    const findings = await run(
      { comm: ['shell'], shell: [] },
      ['comm', 'shell'],
      { layer_aliases: { comm: 'data-access', shell: 'pages' } }, // aliases but no profile
    )
    expect(findings.some(f => f.rule_id === 'frontend-layered-respect')).toBe(false)
  })

  it('honors profile:backend as an escape hatch despite frontend-looking dirs', async () => {
    // components+pages+hooks = 3 literal signal dirs -> heuristic alone would activate FE.
    // profile:backend forces it off.
    const findings = await run(
      { components: ['pages'], pages: [], hooks: [] },
      ['components', 'pages', 'hooks'],
      { profile: 'backend' },
    )
    expect(findings.some(f => f.rule_id === 'frontend-layered-respect')).toBe(false)
  })

  it('regression: horizontal layout (zhenka-web shape) still activates via literals, no declaration', async () => {
    // components+hooks+pages+features = 4 literal signal dirs, no profile -> FE active.
    const findings = await run(
      { components: ['pages'], pages: [], hooks: [], features: [], lib: [], contexts: [] },
      ['components', 'pages', 'hooks', 'features', 'lib', 'contexts'],
    )
    expect(findings.some(f => f.rule_id === 'frontend-layered-respect'
      && f.source.module === 'components' && f.target?.module === 'pages')).toBe(true)
  })
})
