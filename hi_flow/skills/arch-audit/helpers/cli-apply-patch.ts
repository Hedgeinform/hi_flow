#!/usr/bin/env node
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadProjectRules, PROJECT_RULES_FILENAME } from '../core/project-rules.ts'
import { loadD9 } from '../core/d9-loader.ts'
import { validateRulesPatch } from './validate-rules-patch.ts'
import { mergeRulesPatch } from './merge-rules-patch.ts'

/**
 * Apply-patch mode CLI entrypoint per SKILL.md.
 *
 * Validate-then-merge a rules-patch into the project rules file. On validation
 * failure: hard fail (exit 1) with actionable diagnostics — the patch is the
 * arch-redesign / arch-spec output, an error there is *their* bug. On success:
 * merge into `<project>/.audit-rules.yaml`, archive the patch to
 * `<project>/audit-report/applied-patches/<date>-<original-name>.yaml`.
 */
export async function applyPatch(
  patchPath: string,
  projectRoot: string,
  d9MdPath?: string,
): Promise<{ success: boolean; rules_added: number; archive_path: string }> {
  const projectRulesPath = join(projectRoot, PROJECT_RULES_FILENAME)
  const archiveDir = join(projectRoot, 'audit-report', 'applied-patches')

  const projectRules = await loadProjectRules(projectRoot)

  // D9 location resolution: explicit arg wins; otherwise fall back to the
  // bundled hi_flow/references/architectural-principles.md relative to this
  // helper file inside the plugin.
  const resolvedD9Path = d9MdPath ?? join(
    dirname(fileURLToPath(import.meta.url)),
    '..', '..', '..', 'references', 'architectural-principles.md',
  )
  const d9Index = await loadD9(resolvedD9Path)

  const validation = await validateRulesPatch({ patchPath, projectRules, d9Index })
  if (!validation.valid) {
    const lines = [`ERROR: patch validation failed for ${patchPath}`, '']
    for (const e of validation.errors) {
      const loc = [e.rule_name, e.field].filter(Boolean).join('.')
      lines.push(`  - ${loc ? loc + ': ' : ''}${e.message}`)
      if (e.suggestion) lines.push(`      ${e.suggestion}`)
    }
    throw new Error(lines.join('\n'))
  }

  const result = await mergeRulesPatch({ patchPath, projectRulesPath, archiveDir })
  if (!result.success) {
    throw new Error(`merge failed: ${result.error}`)
  }
  return { success: true, rules_added: result.rules_added, archive_path: result.archive_path }
}

// CLI entry: invoked via `npx tsx helpers/cli-apply-patch.ts <patch-path> [project-root] [d9-md-path]`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const patchArg = process.argv[2]
  const projectArg = process.argv[3] ?? process.cwd()
  const d9Arg = process.argv[4]
  if (!patchArg) {
    console.error('Usage: npx tsx helpers/cli-apply-patch.ts <patch-path> [project-root] [d9-md-path]')
    process.exit(1)
  }
  applyPatch(resolve(patchArg), resolve(projectArg), d9Arg ? resolve(d9Arg) : undefined)
    .then(({ rules_added, archive_path }) => {
      console.log(`√ Patch applied: ${rules_added} rule(s) merged.`)
      console.log(`  Archived to: ${archive_path}`)
    })
    .catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    })
}
