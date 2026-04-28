import { describe, it, expect } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { resolveAuditSha } from '../../core/audit-sha.ts'

describe('resolveAuditSha', () => {
  it('returns git short SHA when projectRoot is a git repo', () => {
    const cwd = process.cwd()
    const sha = resolveAuditSha(cwd)
    expect(sha).toMatch(/^[0-9a-f]{7,}$/)
  })
  it('returns uuid: prefix when projectRoot is not a git repo', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'as-'))
    const sha = resolveAuditSha(dir)
    expect(sha.startsWith('uuid:')).toBe(true)
    expect(sha.length).toBeGreaterThan(10)
    await rm(dir, { recursive: true })
  })
  it('returns uuid: when projectRoot does not exist', () => {
    const sha = resolveAuditSha('/this/does/not/exist/anywhere')
    expect(sha.startsWith('uuid:')).toBe(true)
  })
})
