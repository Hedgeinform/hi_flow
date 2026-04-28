import { readFile } from 'node:fs/promises'
import type { D9Index, PrincipleMetadata } from './types.ts'

export async function loadD9(mdPath: string): Promise<D9Index> {
  const content = await readFile(mdPath, 'utf-8')
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

    const descMatch = section.match(/\*\*Description:\*\*\s*([\s\S]*?)(?=\n\n|\*\*|$)/)
    const description = descMatch?.[1]?.trim() ?? ''

    const fixMatch = section.match(/\*\*Fix alternatives:\*\*\s*([\s\S]*?)(?=\n\*\*[A-Z]|\n###|\n##|$)/)
    const alternatives: string[] = []
    if (fixMatch) {
      const block = fixMatch[1] ?? ''
      for (const line of block.split('\n')) {
        const m = line.match(/^-\s+(.+)$/)
        if (m && m[1]) alternatives.push(m[1].trim())
      }
    }

    principles[id] = { id, name: id, description, fix_alternatives: alternatives }
    fix_alternatives[id] = alternatives
  }

  return { principles, fix_alternatives }
}
