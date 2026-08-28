import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { D9Index, PrincipleMetadata } from './types.ts'

export function resolveBundledD9Path(runtimeRoot: string): string {
  return join(runtimeRoot, '..', '..', 'references', 'architectural-principles.md')
}

export async function loadD9(mdPath: string): Promise<D9Index> {
  const content = (await readFile(mdPath, 'utf-8')).replace(/\r\n?/g, '\n')
  const principles: Record<string, PrincipleMetadata> = {}
  const fix_alternatives: Record<string, string[]> = {}

  // Split by ### headings (level-3 — principle entries)
  const sections = content.split(/^### /m).slice(1)
  for (const section of sections) {
    const lines = section.split('\n')
    const fullHeading = lines[0]?.trim() ?? ''
    if (!fullHeading || fullHeading.startsWith('#')) continue
    // Canonical id is the first token before any whitespace or parenthesised
    // suffix. Headings carry human-friendly abbreviations (e.g.
    // `acyclic-dependencies (ADP)`) for readability, but the id used by
    // baseline-rules.ts and rules-patch principle: refs is the short form.
    // Without this, lookups by short form silently miss and Fix alternatives
    // disappear from the report for 4/17 principles.
    const id = fullHeading.replace(/\s*\([^)]*\)\s*$/, '').split(/\s+/)[0] ?? ''
    if (!id) continue

    const descriptionLine = lines.find(line =>
      /^\s*-?\s*\*\*(?:Description|Formulation):\*\*/.test(line),
    )
    const description = descriptionLine
      ?.replace(/^\s*-?\s*\*\*(?:Description|Formulation):\*\*\s*/, '')
      .trim() ?? ''

    const alternatives: string[] = []
    const alternativesStart = lines.findIndex(line => /^\s*-?\s*\*\*Fix alternatives:\*\*/.test(line))
    if (alternativesStart >= 0) {
      for (const line of lines.slice(alternativesStart + 1)) {
        if (/^\s*-?\s*\*\*[A-Z][^*]*:\*\*/.test(line)) break
        const match = line.match(/^\s*(?:[-*]|\d+\.)\s+(.+)$/)
        if (match?.[1]) alternatives.push(match[1].trim())
      }
    }

    principles[id] = { id, name: id, description, fix_alternatives: alternatives }
    fix_alternatives[id] = alternatives
  }

  return { principles, fix_alternatives }
}
