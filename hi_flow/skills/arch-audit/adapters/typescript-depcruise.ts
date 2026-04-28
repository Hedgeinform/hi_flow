import { access, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { ToolingRequirement, DepGraph, RawFinding, ProjectRules } from '../core/types.ts'

export interface ModuleInfo {
  name: string
  path: string
}

export interface TypescriptDepcruiseAdapter {
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
  identifyModules(projectPath: string): Promise<ModuleInfo[]>
  identifyEntryPoints(projectPath: string): Promise<string[]>

  // Structural detection
  detectStructural(args: {
    projectPath: string
    depGraph: DepGraph
    perModuleRaw: Record<string, { ca: number; ce: number; loc: number }>
    projectRules: ProjectRules
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
    requiredTooling: [{ name: 'dependency-cruiser', min: '16.0.0', max: '17.0.0' }],
    testFilePatterns: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx', '__tests__/**/*'],
    channelSdkList,
    layerNamingMap,
    defaultModulePattern: 'src/*/',

    async detect(projectPath: string): Promise<boolean> {
      try {
        await access(join(projectPath, 'package.json'))
        await access(join(projectPath, 'tsconfig.json'))
        return true
      } catch {
        return false
      }
    },

    async identifyModules(projectPath: string): Promise<ModuleInfo[]> {
      const srcDir = join(projectPath, 'src')
      try {
        await access(srcDir)
      } catch {
        throw new Error(
          `'src/' не найдено в '${projectPath}'. Укажи корневую директорию модулей через overrides.module_pattern в .audit-rules.yaml.`,
        )
      }
      const entries = await readdir(srcDir)
      const modules: ModuleInfo[] = []
      for (const e of entries) {
        const fullPath = join(srcDir, e)
        const s = await stat(fullPath)
        if (s.isDirectory()) modules.push({ name: e, path: fullPath })
      }
      return modules
    },

    async identifyEntryPoints(projectPath: string): Promise<string[]> {
      const candidates = ['src/index.ts', 'src/main.ts', 'src/cli.ts']
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
    }): Promise<RawFinding[]> {
      const { depGraph, perModuleRaw, projectRules } = args
      const findings: RawFinding[] = []
      const modules = Object.keys(perModuleRaw)
      const N = modules.length
      const hubThreshold = Math.max(0.2 * N, 10)

      for (const m of modules) {
        const { ca, ce, loc } = perModuleRaw[m]!

        // god-object: Ca>10 AND Ce>10 AND LOC>300
        if (ca > 10 && ce > 10 && loc > 300) {
          findings.push({
            rule_id: 'god-object',
            raw_severity: 'error',
            type: 'coupling',
            source: { module: m, file: '' },
            target: { module: m, file: '' },
            extras: { ca, ce, loc },
          })
        }

        // dependency-hub: Ca > max(20% N, 10)
        if (ca > hubThreshold) {
          findings.push({
            rule_id: 'dependency-hub',
            raw_severity: 'error',
            type: 'coupling',
            source: { module: m, file: '' },
            target: { module: m, file: '' },
            extras: { ca, threshold: hubThreshold },
          })
        }

        // high-fanout: Ce > 15
        if (ce > 15) {
          findings.push({
            rule_id: 'high-fanout',
            raw_severity: 'warn',
            type: 'coupling',
            source: { module: m, file: '' },
            target: { module: m, file: '' },
            extras: { ce },
          })
        }
      }

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
              extras: { cycle: [src, tgt] },
            })
          }
        }
      }

      // Layered detection
      const aliasMap = { ...layerNamingMap, ...(projectRules.overrides?.layer_aliases ?? {}) }
      const detectedLayers = new Set<string>()
      for (const m of modules) {
        if (aliasMap[m]) detectedLayers.add(aliasMap[m])
      }
      if (detectedLayers.size >= 2) {
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
          const sLayer = aliasMap[f.source.module]
          const tLayer = aliasMap[f.target.module]
          if (sLayer && tLayer && sLayer !== tLayer) {
            findings.push({
              rule_id: 'architectural-layer-cycle',
              raw_severity: 'error',
              type: 'cycle',
              source: f.source,
              target: f.target,
              extras: { layers: [sLayer, tLayer] },
            })
          }
        }
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
