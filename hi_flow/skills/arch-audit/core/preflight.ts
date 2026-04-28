import type { ToolingRequirement } from './types.ts'

const SEMVER_RE = /(\d+)\.(\d+)\.(\d+)/

interface SemVer { major: number; minor: number; patch: number }

function parseSemver(s: string): SemVer {
  const m = s.match(SEMVER_RE)
  if (!m) throw new Error(`cannot parse semver from '${s}'`)
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) }
}

function cmp(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major - b.major
  if (a.minor !== b.minor) return a.minor - b.minor
  return a.patch - b.patch
}

export function checkDepcruiseVersion(versionString: string, req: ToolingRequirement): void {
  const got = parseSemver(versionString)
  const min = parseSemver(req.min)
  if (cmp(got, min) < 0) {
    throw new Error(
      `depcruise version ${versionString.trim()} is older than required ${req.min}. ` +
      `Update: \`npm install -g dependency-cruiser@latest\` or \`npm install -D dependency-cruiser@^${req.min}\`.`,
    )
  }
  if (req.max) {
    const max = parseSemver(req.max)
    if (cmp(got, max) >= 0) {
      throw new Error(
        `depcruise version ${versionString.trim()} is at or beyond tested upper bound ${req.max} (exclusive). ` +
        `Adapter may behave incorrectly. Downgrade: \`npm install -g dependency-cruiser@^${req.min}\` ` +
        `or wait for adapter update.`,
      )
    }
  }
}
