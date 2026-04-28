import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

export function resolveAuditSha(projectRoot: string): string {
  try {
    const out = execSync('git rev-parse --short HEAD', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    if (/^[0-9a-f]{7,}$/.test(out)) return out
  } catch {
    // not a git repo or git not available
  }
  return `uuid:${randomUUID()}`
}
