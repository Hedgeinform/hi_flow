import { writeFile } from 'node:fs/promises'
import { dirname, join, basename } from 'node:path'
import { loadD9 } from '../core/d9-loader.ts'

interface Args {
  principlesMdPath: string
}

interface Result {
  regenerated_count: number
  index_path: string
}

export async function regeneratePrinciplesIndex(args: Args): Promise<Result> {
  const d9 = await loadD9(args.principlesMdPath)
  const dir = dirname(args.principlesMdPath)
  const stem = basename(args.principlesMdPath, '.md')
  const indexPath = join(dir, `${stem === 'architectural-principles' ? 'architectural-principles-index' : stem + '-index'}.json`)
  await writeFile(indexPath, JSON.stringify(d9, null, 2), 'utf-8')
  return { regenerated_count: Object.keys(d9.principles).length, index_path: indexPath }
}

// CLI entry: invoked via `npx tsx hi_flow/skills/arch-audit/helpers/regenerate-principles-index.ts <md-path>`
if (import.meta.url === `file://${process.argv[1]}`) {
  const path = process.argv[2]
  if (!path) {
    console.error('Usage: regenerate-principles-index <md-path>')
    process.exit(1)
  }
  regeneratePrinciplesIndex({ principlesMdPath: path }).then(r => {
    console.log(`Regenerated ${r.regenerated_count} principles → ${r.index_path}`)
  }).catch(e => {
    console.error(`ERROR: ${e.message}`)
    process.exit(1)
  })
}
