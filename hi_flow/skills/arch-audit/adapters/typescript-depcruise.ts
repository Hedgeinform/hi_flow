import { detectMetricFindings } from '../core/metric-findings.ts'
import type { AuditAdapter, CollectionOptions, AuditInput } from '../core/audit-adapter.ts'
import { checkDepcruiseVersion } from '../core/preflight.ts'
import { resolveRuntimeRoot, runBundledDepcruise } from '../core/depcruise-runtime.ts'
import { generateDepcruiseConfig } from '../helpers/generate-depcruise-config.ts'
import { parseDepcruiseOutput } from '../helpers/parse-depcruise-output.ts'
import { buildSourceScanGlob } from '../core/source-scope.ts'
import { access } from 'node:fs/promises'
import { join } from 'node:path'
import type { ToolingRequirement, DepGraph, RawFinding, ProjectRules } from '../core/types.ts'
import { detectBarrels } from '../helpers/detect-barrels.ts'
import { discoverProductionModules, normalizeModuleRoot } from '../core/source-scope.ts'

export interface ModuleInfo {
  name: string
  path: string
}

export interface TypescriptDepcruiseAdapter extends AuditAdapter {
  // Identity
  readonly name: string
  readonly version: string
  readonly requiredTooling: ToolingRequirement[]
  readonly testFilePatterns: string[]
  readonly channelSdkList: string[]
  readonly layerNamingMap: Record<string, string>
  readonly defaultModulePattern: string

  // Detection
  detect(projectPath: string): Promise<boolean>
  identifyModules(projectPath: string, moduleRoot?: string): Promise<ModuleInfo[]>
  identifyEntryPoints(projectPath: string, moduleRoot?: string): Promise<string[]>

  // Structural detection
  detectStructural(args: {
    projectPath: string
    depGraph: DepGraph
    perModuleRaw: Record<string, { ca: number; ce: number; loc: number }>
    projectRules: ProjectRules
    sdkEdges?: { from: string; sdk: string }[]
    barrelImports?: { from: string; to: string; targetFile: string }[]
    modulesList?: string[]
    moduleRoot?: string
  }): Promise<RawFinding[]>

  // Tooling reporting
  getToolingVersionString(): string
  setDetectedDepcruiseVersion(version: string): void
}

export function createTypescriptDepcruiseAdapter(): TypescriptDepcruiseAdapter {
  let detectedDepcruiseVersion = 'unknown'

  const layerNamingMap: Record<string, string> = {
    domain: 'domain',
    core: 'domain',
    business: 'domain',
    service: 'application',
    services: 'application',
    application: 'application',
    app: 'application',
    usecases: 'application',
    api: 'presentation',
    web: 'presentation',
    ui: 'presentation',
    presentation: 'presentation',
    interface: 'presentation',
    controllers: 'presentation',
    handlers: 'presentation',
    infra: 'infrastructure',
    infrastructure: 'infrastructure',
    gateway: 'infrastructure',
    gateways: 'infrastructure',
    persistence: 'infrastructure',
    repositories: 'infrastructure',
    repos: 'infrastructure',
    adapters: 'infrastructure',
    ports: 'domain',
  }

  const channelSdkList = [
    'node-telegram-bot-api', 'telegraf', 'grammy',
    'discord.js', 'eris',
    'express', 'fastify', 'koa', 'hapi', '@hapi/hapi', '@nestjs/core',
    '@slack/bolt', '@slack/web-api', 'whatsapp-web.js', '@adiwajshing/baileys', 'viber-bot', '@line/bot-sdk', 'twilio',
    'socket.io', 'ws',
    'nodemailer',
    'amqplib', 'kafkajs', '@aws-sdk/client-sqs', 'mqtt',
  ]

  return {
    name: 'typescript-depcruise',
    version: '1.0.0',
    requiredTooling: [{ name: 'dependency-cruiser', min: '16.0.0', max: '18.0.0' }],
    testFilePatterns: [
      '*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx',
      '*.test.js', '*.test.jsx', '*.test.mjs', '*.test.cjs',
      '*.spec.js', '*.spec.jsx', '*.spec.mjs', '*.spec.cjs',
      '__tests__/**/*',
    ],
    channelSdkList,
    layerNamingMap,
    defaultModulePattern: 'src/*/',

    async collect(options: CollectionOptions): Promise<AuditInput> {
      const { projectRoot, moduleRoot, projectRules, baselineRules, depcruiseVersion } = options
      if (!depcruiseVersion) throw new Error('Dependency-cruiser version is required for the TypeScript adapter.')
      checkDepcruiseVersion(depcruiseVersion, this.requiredTooling[0]!)
      const module_names = (await this.identifyModules(projectRoot, moduleRoot)).map(module => module.name)
      const config = await generateDepcruiseConfig({ baselineRules, projectRules, projectRoot })
      const runtimeRoot = resolveRuntimeRoot(import.meta.url)
      const runner = options.runDepcruise ?? ((cfg: string, src: string) => runBundledDepcruise(runtimeRoot, projectRoot, cfg, src))
      const parsed = parseDepcruiseOutput(runner(config, buildSourceScanGlob(moduleRoot)), moduleRoot)
      if (Object.keys(parsed.per_module_raw).length === 0) {
        throw new Error(`Dependency-cruiser returned no production modules for '${moduleRoot}/'. Audit aborted to prevent an empty successful D8 snapshot.`)
      }
      this.setDetectedDepcruiseVersion(depcruiseVersion)
      return { ...parsed, module_names, tooling_version: this.getToolingVersionString(), operator_notes: [] }
    },

    async detect(projectPath: string): Promise<boolean> {
      try {
        await access(join(projectPath, 'package.json'))
        return true
      } catch {
        return false
      }
    },

    async identifyModules(projectPath: string, moduleRoot = 'src'): Promise<ModuleInfo[]> {
      return discoverProductionModules(projectPath, moduleRoot)
    },

    async identifyEntryPoints(projectPath: string, moduleRoot = 'src'): Promise<string[]> {
      const root = normalizeModuleRoot(moduleRoot)
      const candidates = ['index', 'main', 'cli'].flatMap(name =>
        ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].map(extension => `${root}/${name}.${extension}`),
      )
      const found: string[] = []
      for (const c of candidates) {
        try {
          await access(join(projectPath, c))
          found.push(c)
        } catch {}
      }
      return found
    },

    async detectStructural(args: {
      projectPath: string
      depGraph: DepGraph
      perModuleRaw: Record<string, { ca: number; ce: number; loc: number }>
      projectRules: ProjectRules
      sdkEdges?: { from: string; sdk: string }[]
      barrelImports?: { from: string; to: string; targetFile: string }[]
      modulesList?: string[]
      moduleRoot?: string
    }): Promise<RawFinding[]> {
      // NOTE: rule_id values here are bare names without baseline: prefix.
      // Namespacing happens in helpers/enrich-findings.ts during enrichment.
      // Keep adapter output un-namespaced; enrichment owns rule_id namespacing.
      const { depGraph, perModuleRaw, projectRules } = args
      const findings: RawFinding[] = []
      const modules = Object.keys(perModuleRaw)
      findings.push(...detectMetricFindings(depGraph, perModuleRaw))

      // inappropriate-intimacy: 2-cycles in depGraph
      for (const [src, tgts] of Object.entries(depGraph)) {
        for (const tgt of tgts) {
          if (depGraph[tgt]?.includes(src) && src < tgt) {
            findings.push({
              rule_id: 'inappropriate-intimacy',
              raw_severity: 'error',
              type: 'cycle',
              source: { module: src, file: '' },
              target: { module: tgt, file: '' },
              extras: { members: [src, tgt] },
            })
          }
        }
      }

      // Frontend vs backend profile (run-level — no subtree model; module = flat top-level dir).
      // A run is frontend-profiled when `overrides.profile === 'frontend'` is declared, or (fallback)
      // when >=2 React-distinctive dirs are present; `overrides.profile === 'backend'` opts out of the
      // heuristic. In a frontend profile the backend layered rules are SKIPPED: the backend map
      // classifies api/app/services and would emit false positives (e.g. app->api). See spec sect 4.5
      // and docs/superpowers/specs/2026-06-06-hi_flow-frontend-slice-governance-amendment-design.md.
      const FRONTEND_SIGNAL_DIRS = ['components', 'hooks', 'pages', 'features']
      const declaredProfile = projectRules.overrides?.profile
      const literalFrontendSignal = modules.filter(m => FRONTEND_SIGNAL_DIRS.includes(m)).length >= 2
      const isFrontendProfile =
        declaredProfile === 'frontend' ||
        (declaredProfile !== 'backend' && literalFrontendSignal)

      // Layered detection (backend) — only when NOT frontend-profiled.
      const aliasMap = { ...layerNamingMap, ...(projectRules.overrides?.layer_aliases ?? {}) }
      const detectedLayers = new Set<string>()
      for (const m of modules) {
        if (aliasMap[m]) detectedLayers.add(aliasMap[m])
      }
      if (!isFrontendProfile && detectedLayers.size >= 2) {
        const order: Record<string, number> = { presentation: 1, application: 2, domain: 3, infrastructure: 4 }
        for (const [src, tgts] of Object.entries(depGraph)) {
          const srcLayer = aliasMap[src]
          if (!srcLayer) continue
          for (const tgt of tgts) {
            const tgtLayer = aliasMap[tgt]
            if (!tgtLayer) continue
            if ((order[srcLayer] ?? 99) > (order[tgtLayer] ?? 99)) {
              findings.push({
                rule_id: 'layered-respect',
                raw_severity: 'warn',
                type: 'boundary',
                source: { module: src, file: '' },
                target: { module: tgt, file: '' },
                extras: { source_layer: srcLayer, target_layer: tgtLayer },
              })
            }
          }
        }
        // architectural-layer-cycle: inappropriate-intimacy where modules are in different layers
        for (const f of findings.filter(f => f.rule_id === 'inappropriate-intimacy')) {
          if (!f.target) continue
          const sLayer = aliasMap[f.source.module]
          const tLayer = aliasMap[f.target.module]
          if (sLayer && tLayer && sLayer !== tLayer) {
            findings.push({
              rule_id: 'architectural-layer-cycle',
              raw_severity: 'error',
              type: 'cycle',
              source: f.source,
              target: f.target,
              extras: { members: [f.source.module, f.target.module], layers: [sLayer, tLayer] },
            })
          }
        }
      }

      // Frontend layered detection — horizontal direction
      // (pages -> features -> components -> hooks -> data-access -> lib; imports allowed downward).
      if (isFrontendProfile) {
        const frontendLayerMap: Record<string, string> = {
          pages: 'pages', routes: 'pages', app: 'pages',
          features: 'features',
          components: 'components',
          hooks: 'hooks', store: 'hooks',
          api: 'data-access', services: 'data-access',
          lib: 'lib', shared: 'lib', utils: 'lib',
        }
        const frontendOrder: Record<string, number> = {
          pages: 1, features: 2, components: 3, hooks: 4, 'data-access': 5, lib: 6,
        }
        const feAlias = { ...frontendLayerMap, ...(projectRules.overrides?.layer_aliases ?? {}) }
        for (const [src, tgts] of Object.entries(depGraph)) {
          const srcLayer = feAlias[src]
          if (!srcLayer) continue
          for (const tgt of tgts) {
            const tgtLayer = feAlias[tgt]
            if (!tgtLayer) continue
            if ((frontendOrder[srcLayer] ?? 99) > (frontendOrder[tgtLayer] ?? 99)) {
              findings.push({
                rule_id: 'frontend-layered-respect',
                raw_severity: 'warn',
                type: 'boundary',
                source: { module: src, file: '' },
                target: { module: tgt, file: '' },
                extras: { source_layer: srcLayer, target_layer: tgtLayer },
              })
            }
          }
        }
        // frontend-layer-cycle: inappropriate-intimacy across two different frontend layers
        for (const f of findings.filter(f => f.rule_id === 'inappropriate-intimacy')) {
          if (!f.target) continue
          const sLayer = feAlias[f.source.module]
          const tLayer = feAlias[f.target.module]
          if (sLayer && tLayer && sLayer !== tLayer) {
            findings.push({
              rule_id: 'frontend-layer-cycle',
              raw_severity: 'error',
              type: 'cycle',
              source: f.source,
              target: f.target,
              extras: { members: [f.source.module, f.target.module], layers: [sLayer, tLayer] },
            })
          }
        }
      }

      // port-adapter-direction: domain imports infrastructure directly — backend only.
      const aliasMap2 = { ...layerNamingMap, ...(projectRules.overrides?.layer_aliases ?? {}) }
      if (!isFrontendProfile) {
        for (const [src, tgts] of Object.entries(depGraph)) {
          if (aliasMap2[src] !== 'domain') continue
          for (const tgt of tgts) {
            if (aliasMap2[tgt] === 'infrastructure') {
              findings.push({
                rule_id: 'port-adapter-direction',
                raw_severity: 'warn',
                type: 'boundary',
                source: { module: src, file: '' },
                target: { module: tgt, file: '' },
                extras: {},
              })
            }
          }
        }
      }

      // domain-no-channel-sdk: domain layer imports channel SDK
      const channelSdkSet = new Set([...channelSdkList, ...(projectRules.overrides?.channel_sdk_extras ?? [])])
      for (const edge of args.sdkEdges ?? []) {
        if (aliasMap2[edge.from] !== 'domain') continue
        if (channelSdkSet.has(edge.sdk)) {
          findings.push({
            rule_id: 'domain-no-channel-sdk',
            raw_severity: 'warn',
            type: 'boundary',
            source: { module: edge.from, file: '' },
            target: { module: edge.sdk, file: '' },
            extras: { sdk: edge.sdk, external_target: true },
          })
        }
      }

      if (args.modulesList && args.barrelImports) {
        const barrelFindings = await detectBarrels({
          projectPath: args.projectPath,
          moduleRoot: args.moduleRoot ?? 'src',
          modulesList: args.modulesList,
          barrelImports: args.barrelImports,
        })
        findings.push(...barrelFindings)
      }

      return findings
    },

    getToolingVersionString(): string {
      return `typescript-depcruise (${detectedDepcruiseVersion})`
    },

    setDetectedDepcruiseVersion(version: string): void {
      detectedDepcruiseVersion = version
    },
  }
}
