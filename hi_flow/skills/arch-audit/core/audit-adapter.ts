import type { BaselineRule, DepGraph, ProjectRules, RawFinding } from './types.ts'

export interface AuditInput {
  findings: RawFinding[]
  dep_graph: DepGraph
  per_module_raw: Record<string, { ca: number; ce: number; loc: number }>
  source_files_by_module: Record<string, string[]>
  sdk_edges: { from: string; sdk: string }[]
  parsing_errors?: { file: string; error: string }[]
  barrel_imports?: { from: string; to: string; targetFile: string }[]
  module_names: string[]
  entry_modules?: string[]
  tooling_version: string
  operator_notes: string[]
}
export interface CollectionOptions {
  projectRoot: string
  moduleRoot: string
  projectRules: ProjectRules
  baselineRules: BaselineRule[]
  buildDir?: string
  configuration?: string
  depcruiseVersion?: string
  runDepcruise?: (configPath: string, srcPath: string) => string
}
export interface AuditAdapter {
  readonly name: string
  collect(options: CollectionOptions): Promise<AuditInput>
  detectStructural(args: {
    projectPath: string
    depGraph: DepGraph
    perModuleRaw: Record<string, { ca: number; ce: number; loc: number }>
    projectRules: ProjectRules
    sdkEdges?: { from: string; sdk: string }[]
    barrelImports?: { from: string; to: string; targetFile: string }[]
    modulesList?: string[]
    moduleRoot?: string
    entryModules?: string[]
  }): Promise<RawFinding[]>
}
