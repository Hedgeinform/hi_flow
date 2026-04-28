# arch-audit v1 — Post-Impl Review Fixes

**Source plan:** `docs/superpowers/plans/2026-04-28-arch-audit-impl.md`
**Source impl-spec:** `docs/superpowers/specs/2026-04-28-hi_flow-arch-audit-impl-spec.md`
**Date:** 2026-04-28
**Status:** post-impl review identified 2 CRITICAL + 7 HIGH + 7 MEDIUM + 7 LOW findings. This document is a fix-list for the impl session.

**Working directory for ALL commands:** `hi_flow/skills/arch-audit/` (relative to project root).

**Test gate:** after each fix-task, run `npm run typecheck && npm run test`. All 62 existing tests + new tests added per task must pass before commit.

**Commit prefix convention:** `fix(arch-audit): <short>` for bug fixes; `feat(arch-audit): <short>` for missing-feature implementation.

**Anti-impr-improvising rule:** if a finding's fix uncovers a deeper issue not described here, STOP and ask the operator. Do not improvise. Do not extend scope.

---

## Priority gates

- **Phase 1 (stop-ship):** Tasks F1, F2, F3, F4, F5. Cannot ship v1 without these.
- **Phase 2 (significant gaps):** Tasks F6, F7, F8, F9, F10. Should be done before public use.
- **Phase 3 (cleanup):** Tasks F11–F14. After Phase 2.

Operator may choose to ship Phase 1 only as v0.1-experimental and defer Phase 2+3.

---

## Phase 1 — Stop-ship fixes

### Task F1: Implement preflight depcruise version check (Q-1.5)

**Source:** impl-spec section 1.5. **Severity:** CRITICAL.

**Problem.** `requiredTooling: [{name:"dependency-cruiser",min:"16.0.0",max:"17.0.0"}]` declared in `adapters/typescript-depcruise.ts:81` but never read. `report-builder.ts:100` accepts `opts.depcruiseVersion: string` and passes it through without validation. Zhenka smoke ran on depcruise 17.0.0 (which is `>= MAX exclusive`) and audit succeeded — should have hard-failed.

**Files:**
- Create: `core/preflight.ts`
- Create: `tests/core/preflight.test.ts`
- Modify: `core/report-builder.ts` (call preflight at start of `buildReport`)

- [ ] **F1.1: Write failing tests**

`tests/core/preflight.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { checkDepcruiseVersion } from '../../core/preflight.ts'
import type { ToolingRequirement } from '../../core/types.ts'

const req: ToolingRequirement = { name: 'dependency-cruiser', min: '16.0.0', max: '17.0.0' }

describe('preflight.checkDepcruiseVersion', () => {
  it('passes for version in range', () => {
    expect(() => checkDepcruiseVersion('16.3.0', req)).not.toThrow()
    expect(() => checkDepcruiseVersion('16.0.0', req)).not.toThrow()
    expect(() => checkDepcruiseVersion('16.99.99', req)).not.toThrow()
  })

  it('throws for version below min', () => {
    expect(() => checkDepcruiseVersion('15.5.0', req)).toThrow(/15\.5\.0.*16\.0\.0/)
  })

  it('throws for version at or above max (exclusive)', () => {
    expect(() => checkDepcruiseVersion('17.0.0', req)).toThrow(/17\.0\.0.*17\.0\.0/)
    expect(() => checkDepcruiseVersion('18.1.0', req)).toThrow(/18\.1\.0/)
  })

  it('throws on unparseable version string', () => {
    expect(() => checkDepcruiseVersion('not-a-version', req)).toThrow(/parse|version/)
  })

  it('parses version from `dependency-cruiser --version` output containing extras', () => {
    expect(() => checkDepcruiseVersion('dependency-cruiser@16.3.0\n', req)).not.toThrow()
  })
})
```

- [ ] **F1.2: Implement `core/preflight.ts`**

```typescript
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
```

- [ ] **F1.3: Wire preflight into `core/report-builder.ts`**

Add import at top:
```typescript
import { checkDepcruiseVersion } from './preflight.ts'
```

In `buildReport`, BEFORE `const configPath = await generateDepcruiseConfig(...)`:
```typescript
checkDepcruiseVersion(opts.depcruiseVersion, adapter.requiredTooling[0])
```

- [ ] **F1.4: Run tests, ensure existing report-builder integration test still passes** (uses `depcruiseVersion: '16.3.0'` which is in range).

- [ ] **F1.5: Commit**

```bash
npm run typecheck && npm run test
git add core/preflight.ts tests/core/preflight.test.ts core/report-builder.ts
git commit -m "feat(arch-audit): implement Q-1.5 depcruise version preflight check"
```

---

### Task F2: Wire `parsing_errors` from depcruise output to metadata (Q-1.3)

**Source:** impl-spec section 1.3. **Severity:** HIGH.

**Problem.** `helpers/parse-depcruise-output.ts` returns `{findings, dep_graph, per_module_raw}` but no `parsing_errors`. `report-builder.ts` builds metadata without `parsing_errors`. The conditional warning block at md-render fires only on `metadata.parsing_errors?.length` which is always falsy. Q-1.3 declared implemented, in fact dead code.

**Files:**
- Modify: `helpers/parse-depcruise-output.ts`
- Modify: `tests/helpers/parse-depcruise-output.test.ts`
- Create: `tests/fixtures/depcruise-with-errors.json`
- Modify: `core/report-builder.ts`
- Modify: `core/types.ts` (extend ParseResult)

- [ ] **F2.1: Create fixture with parse errors**

`tests/fixtures/depcruise-with-errors.json`:

```json
{
  "summary": {
    "violations": [],
    "totalCruised": 3,
    "totalDependenciesCruised": 1
  },
  "modules": [
    { "source": "src/a/index.ts", "dependencies": [{ "resolved": "src/b/index.ts", "module": "../b" }] },
    { "source": "src/b/index.ts", "dependencies": [] },
    { "source": "src/c/broken.ts", "dependencies": [], "valid": false, "error": "SyntaxError: Unexpected token" }
  ]
}
```

- [ ] **F2.2: Add failing test**

Append to `tests/helpers/parse-depcruise-output.test.ts`:

```typescript
it('extracts parsing_errors from broken modules', async () => {
  const raw = await readFile('tests/fixtures/depcruise-with-errors.json', 'utf-8')
  const result = parseDepcruiseOutput(raw)
  expect(result.parsing_errors).toBeDefined()
  expect(result.parsing_errors).toHaveLength(1)
  expect(result.parsing_errors![0].file).toBe('src/c/broken.ts')
  expect(result.parsing_errors![0].error).toMatch(/SyntaxError/)
})

it('parsing_errors absent when no broken modules', async () => {
  const raw = await readFile('tests/fixtures/depcruise-sample.json', 'utf-8')
  const result = parseDepcruiseOutput(raw)
  expect(result.parsing_errors === undefined || result.parsing_errors.length === 0).toBe(true)
})
```

- [ ] **F2.3: Extend ParseResult in `core/types.ts`** (or wherever it's defined — if inside parse-depcruise-output.ts, modify there).

Add field to `ParseResult` interface:
```typescript
parsing_errors?: { file: string; error: string }[]
```

- [ ] **F2.4: Implement extraction in `helpers/parse-depcruise-output.ts`**

After the modules loop, before returning:

```typescript
const parsing_errors: { file: string; error: string }[] = []
for (const m of modules) {
  if (m.valid === false || m.error) {
    parsing_errors.push({ file: m.source ?? '<unknown>', error: m.error ?? 'invalid module' })
  }
}
return {
  findings,
  dep_graph,
  per_module_raw,
  ...(parsing_errors.length > 0 ? { parsing_errors } : {}),
}
```

- [ ] **F2.5: Wire into `core/report-builder.ts`**

After `const parsed = parseDepcruiseOutput(depcruiseOut)`:
```typescript
// ... existing code
```

In the `report.metadata` assembly, change:
```typescript
metadata: {
  audit_sha: opts.auditSha,
  audit_timestamp: new Date().toISOString(),
  audit_tooling_version: adapter.getToolingVersionString(),
  schema_version: '1.1',
  ...(parsed.parsing_errors ? { parsing_errors: parsed.parsing_errors } : {}),
},
```

- [ ] **F2.6: Run tests + commit**

```bash
npm run typecheck && npm run test
git add helpers/parse-depcruise-output.ts core/report-builder.ts tests/helpers/parse-depcruise-output.test.ts tests/fixtures/depcruise-with-errors.json core/types.ts
git commit -m "fix(arch-audit): wire parsing_errors from depcruise output into metadata"
```

---

### Task F3: Filter fake modules from dep_graph (node_modules, std builtins, top-level files)

**Source:** review finding H5. **Severity:** HIGH.

**Problem.** `helpers/parse-depcruise-output.ts:fileToModule` falls back to `parts[0]` when path doesn't contain `src/`, producing fake module names like `node_modules`, `crypto`, `fs`, `bun:test`. Also `src/index.ts` (no subdir) becomes module `index.ts`. Zhenka audit shows `index_ts`, `bun_test`, `node_modules`, `crypto`, `fs` in the dep_graph — pollutes Ca/Ce, NCCD, triggers false high-fanout finding on `index_ts`.

**Files:**
- Modify: `helpers/parse-depcruise-output.ts`
- Modify: `tests/helpers/parse-depcruise-output.test.ts`

- [ ] **F3.1: Add failing tests**

Append:

```typescript
it('skips edges to node_modules / node-builtins', async () => {
  const raw = JSON.stringify({
    summary: { violations: [] },
    modules: [
      {
        source: 'src/a/index.ts',
        dependencies: [
          { resolved: 'node_modules/lodash/index.js', module: 'lodash' },
          { resolved: 'crypto', module: 'node:crypto' },
          { resolved: 'src/b/index.ts', module: '../b' },
        ],
      },
      { source: 'src/b/index.ts', dependencies: [] },
    ],
  })
  const result = parseDepcruiseOutput(raw)
  expect(Object.keys(result.dep_graph).sort()).toEqual(['a', 'b'])
  expect(result.dep_graph.a).toEqual(['b'])
})

it('skips top-level src/*.ts files (only src/<dir>/ counts)', async () => {
  const raw = JSON.stringify({
    summary: { violations: [] },
    modules: [
      { source: 'src/index.ts', dependencies: [{ resolved: 'src/a/index.ts', module: './a' }] },
      { source: 'src/a/index.ts', dependencies: [] },
    ],
  })
  const result = parseDepcruiseOutput(raw)
  expect(Object.keys(result.dep_graph)).toEqual(['a'])
})
```

- [ ] **F3.2: Modify `fileToModule` to return `null` for non-modular paths**

```typescript
function fileToModule(filePath: string, modulePattern = 'src'): string | null {
  if (!filePath) return null
  // Skip node_modules
  if (filePath.startsWith('node_modules/') || filePath.includes('/node_modules/')) return null
  // Skip node:* and bun:* runtime imports
  if (/^[a-z]+:/.test(filePath)) return null
  // Skip bare core modules (no slash, no extension)
  if (!filePath.includes('/') && !filePath.includes('.')) return null
  // Require src/<dir>/* — top-level files in src/ are not modules
  const parts = filePath.split('/')
  const srcIdx = parts.indexOf(modulePattern)
  if (srcIdx === -1) return null
  if (srcIdx + 1 >= parts.length) return null
  // Must have at least one path segment after src/<dir>/
  if (srcIdx + 2 >= parts.length) return null
  return parts[srcIdx + 1]!
}
```

- [ ] **F3.3: Update callers to handle `null`**

In `parseDepcruiseOutput`, both inside violation extraction and dep_graph build:

```typescript
// Inside violations loop
const srcMod = fileToModule(sourceFile, modulePattern)
const tgtMod = fileToModule(targetFile, modulePattern)
if (!srcMod || !tgtMod) continue  // skip violations on non-modular paths

// Inside modules loop
const srcMod = fileToModule(m.source, modulePattern)
if (!srcMod) continue
// ... and inside deps loop:
const tgtMod = fileToModule(dep.resolved, modulePattern)
if (!tgtMod || tgtMod === srcMod) continue
```

- [ ] **F3.4: Run tests + commit**

```bash
npm run typecheck && npm run test
git add helpers/parse-depcruise-output.ts tests/helpers/parse-depcruise-output.test.ts
git commit -m "fix(arch-audit): filter node_modules, builtins, and top-level src files from dep_graph"
```

---

### Task F4: Implement missing baseline rules — port-adapter-direction + domain-no-channel-sdk + nccd-breach

**Source:** review findings M4 + M6. **Severity:** HIGH (3 of 14 baseline rules dead).

**Problem.** Three baseline rules are declaratively present in `core/baseline-rules.ts` but no code emits them:
- `port-adapter-direction` — should fire when `domain/` imports `infrastructure/` (without going through `ports/adapters/`).
- `domain-no-channel-sdk` — should fire when `domain/` imports any package from `adapter.channelSdkList`.
- `nccd-breach` — should fire when project NCCD > threshold (Zhenka NCCD=8.13, threshold=1.0, no finding emitted).

**Files:**
- Modify: `adapters/typescript-depcruise.ts` (extend `detectStructural`)
- Modify: `core/report-builder.ts` (emit nccd-breach)
- Modify: `tests/adapters/typescript-depcruise.test.ts`
- Modify: `tests/core/report-builder.test.ts`

- [ ] **F4.1: Add failing tests for port-adapter-direction in adapter**

Append to `tests/adapters/typescript-depcruise.test.ts` inside the structural detection block:

```typescript
it('detects port-adapter-direction when domain imports infrastructure', async () => {
  const a = createTypescriptDepcruiseAdapter()
  const findings = await a.detectStructural({
    projectPath: '/tmp/x',
    depGraph: { domain: ['infrastructure'], infrastructure: [] },
    perModuleRaw: { domain: { ca: 0, ce: 1, loc: 100 }, infrastructure: { ca: 1, ce: 0, loc: 100 } },
    projectRules: { forbidden: [], required: [] },
  })
  expect(findings.some(f => f.rule_id === 'port-adapter-direction')).toBe(true)
})

it('detects domain-no-channel-sdk when domain imports a known channel SDK', async () => {
  const a = createTypescriptDepcruiseAdapter()
  // The adapter needs a way to learn that an edge target is a channel SDK; pass via extras
  const findings = await a.detectStructural({
    projectPath: '/tmp/x',
    depGraph: { domain: ['__sdk_telegraf__'] },  // SDK pseudo-module marker
    perModuleRaw: { domain: { ca: 0, ce: 1, loc: 100 } },
    projectRules: { forbidden: [], required: [] },
    sdkEdges: [{ from: 'domain', sdk: 'telegraf' }],
  })
  expect(findings.some(f => f.rule_id === 'domain-no-channel-sdk')).toBe(true)
})
```

**Note on SDK detection mechanics:** depcruise output's `dependencies[].module` field contains the bare package name (e.g. `"telegraf"`) before resolution. We need `parseDepcruiseOutput` to surface SDK edges separately, since after resolution they typically point into `node_modules` and would be filtered by F3. Add `sdk_edges` to `ParseResult` AND pass through `detectStructural` args.

- [ ] **F4.2: Update `parseDepcruiseOutput` to extract SDK candidate edges**

```typescript
// Add to ParseResult:
sdk_edges: { from: string; sdk: string }[]

// Inside modules loop, before src/<dir> filter, capture bare-name external imports:
const srcMod = fileToModule(m.source, modulePattern)
if (!srcMod) continue
for (const dep of m.dependencies ?? []) {
  // Look at the unresolved 'module' field — bare package names
  const bareName = dep.module ?? ''
  if (/^[a-z@]/.test(bareName) && !bareName.startsWith('.') && !bareName.startsWith('/')) {
    sdk_edges.push({ from: srcMod, sdk: bareName })
  }
  // ... existing resolved-path handling
}

return { findings, dep_graph, per_module_raw, sdk_edges, ...(parsing_errors.length > 0 ? { parsing_errors } : {}) }
```

- [ ] **F4.3: Update `detectStructural` signature and implement port-adapter + channel-sdk**

Update interface signature to include `sdkEdges`:

```typescript
detectStructural(args: {
  projectPath: string
  depGraph: DepGraph
  perModuleRaw: Record<string, { ca: number; ce: number; loc: number }>
  projectRules: ProjectRules
  sdkEdges?: { from: string; sdk: string }[]
}): Promise<RawFinding[]>
```

In implementation, after existing detection, add:

```typescript
// port-adapter-direction
const aliasMap2 = { ...this.layerNamingMap, ...(projectRules.overrides?.layer_aliases ?? {}) }
for (const [src, tgts] of Object.entries(depGraph)) {
  if (aliasMap2[src] !== 'domain') continue
  for (const tgt of tgts) {
    if (aliasMap2[tgt] === 'infrastructure') {
      findings.push({
        rule_id: 'port-adapter-direction',
        raw_severity: 'warn',
        type: 'layer-violation',
        source: { module: src, file: '' },
        target: { module: tgt, file: '' },
        extras: {},
      })
    }
  }
}

// domain-no-channel-sdk
const channelSdkSet = new Set([...this.channelSdkList, ...(projectRules.overrides?.channel_sdk_extras ?? [])])
for (const edge of args.sdkEdges ?? []) {
  if (aliasMap2[edge.from] !== 'domain') continue
  if (channelSdkSet.has(edge.sdk)) {
    findings.push({
      rule_id: 'domain-no-channel-sdk',
      raw_severity: 'warn',
      type: 'layer-violation',
      source: { module: edge.from, file: '' },
      target: { module: edge.sdk, file: '' },
      extras: { sdk: edge.sdk },
    })
  }
}
```

- [ ] **F4.4: Wire `sdkEdges` through report-builder**

In `report-builder.ts`, after `parsed = parseDepcruiseOutput(depcruiseOut)`:

```typescript
const structural = await adapter.detectStructural({
  projectPath: projectRoot,
  depGraph: parsed.dep_graph,
  perModuleRaw: parsed.per_module_raw,
  projectRules,
  sdkEdges: parsed.sdk_edges,
})
```

- [ ] **F4.5: Add failing test for nccd-breach emission**

Append to `tests/core/report-builder.test.ts`:

```typescript
it('emits baseline:nccd-breach finding when NCCD exceeds threshold (and N>15)', async () => {
  // Use clusterProsefn stub + mock runDepcruise that produces graph with NCCD > 1
  const mockOutput = JSON.stringify({
    summary: { violations: [] },
    modules: Array.from({ length: 16 }, (_, i) => ({
      source: `src/m${i}/index.ts`,
      dependencies: i < 15 ? [{ resolved: `src/m${i + 1}/index.ts`, module: `../m${i + 1}` }] : [],
    })),
  })
  // ... build report with this; assert nccd-breach in findings
})
```

- [ ] **F4.6: Implement nccd-breach emission in report-builder**

After `const nccd = computeNCCD(parsed.dep_graph)` and before `enrichFindings`:

```typescript
const moduleCount = Object.keys(parsed.dep_graph).length
const nccdRaw: RawFinding[] = []
if (moduleCount > 15 && nccd > nccd_threshold) {
  nccdRaw.push({
    rule_id: 'nccd-breach',
    raw_severity: 'error',
    type: 'metric',
    source: { module: '<project>', file: '' },
    target: { module: '<project>', file: '' },
    extras: { nccd, threshold: nccd_threshold, module_count: moduleCount },
  })
}

// Then merge into rawFindings input to enrichFindings:
let findings = enrichFindings({
  rawFindings: [...parsed.findings, ...structural, ...nccdRaw],
  baselineRules,
  projectRules,
})
```

- [ ] **F4.7: Run tests + commit**

```bash
npm run typecheck && npm run test
git add adapters/typescript-depcruise.ts helpers/parse-depcruise-output.ts core/report-builder.ts tests/adapters/typescript-depcruise.test.ts tests/core/report-builder.test.ts tests/helpers/parse-depcruise-output.test.ts core/types.ts
git commit -m "feat(arch-audit): implement port-adapter-direction, domain-no-channel-sdk, nccd-breach emission"
```

---

### Task F5: Implement `audit_sha` git/UUID resolution helper (Q-1.2)

**Source:** impl-spec section 1.2. **Severity:** HIGH.

**Problem.** `BuildOpts.auditSha` accepted as plain string, no helper to resolve. Smoke depended on operator passing `git rev-parse` output manually. Q-1.2 specified `uuid:<v4>` fallback for non-git — completely absent in code.

**Files:**
- Create: `core/audit-sha.ts`
- Create: `tests/core/audit-sha.test.ts`
- Modify: `core/report-builder.ts` (call resolver if `auditSha` not passed)

- [ ] **F5.1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
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
```

- [ ] **F5.2: Implement `core/audit-sha.ts`**

```typescript
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
```

- [ ] **F5.3: Wire into `report-builder.ts`**

Make `auditSha` optional in `BuildOpts`:

```typescript
export interface BuildOpts {
  auditSha?: string
  // ... rest
}
```

At top of `buildReport`:

```typescript
const { resolveAuditSha } = await import('./audit-sha.ts')
const auditSha = opts.auditSha ?? resolveAuditSha(projectRoot)
```

Then use `auditSha` in the metadata block (replacing `opts.auditSha`).

- [ ] **F5.4: Run tests + commit**

```bash
npm run typecheck && npm run test
git add core/audit-sha.ts tests/core/audit-sha.test.ts core/report-builder.ts
git commit -m "feat(arch-audit): implement audit_sha resolver with git/UUID fallback"
```

---

## Phase 2 — Significant gaps

### Task F6: Normalize `project:` prefix on `loadProjectRules`

**Source:** impl-spec section 1.1. **Severity:** HIGH.

**Problem.** Spec says `core/project-rules.ts` should prepend `project:` prefix on load when absent. Currently `enrich-findings.ts` works around this at lookup time — but that's not where spec located the responsibility.

**Files:**
- Modify: `core/project-rules.ts`
- Modify: `tests/core/project-rules.test.ts`

- [ ] **F6.1: Add failing test**

```typescript
it('prepends project: prefix to rule names lacking it on load', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pr-'))
  await writeFile(
    join(dir, '.audit-rules.yaml'),
    `forbidden:\n  - name: legacy-rule\n    severity: HIGH\n    principle: p1\nrequired: []\n`,
    'utf-8',
  )
  const rules = await loadProjectRules(dir)
  expect(rules.forbidden[0].name).toBe('project:legacy-rule')
  await rm(dir, { recursive: true })
})

it('preserves existing project: prefix', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pr-'))
  await writeFile(
    join(dir, '.audit-rules.yaml'),
    `forbidden:\n  - name: project:already-prefixed\n    severity: HIGH\n    principle: p1\nrequired: []\n`,
    'utf-8',
  )
  const rules = await loadProjectRules(dir)
  expect(rules.forbidden[0].name).toBe('project:already-prefixed')
  await rm(dir, { recursive: true })
})
```

- [ ] **F6.2: Implement normalization in `loadProjectRules`**

After parsing YAML, before return:

```typescript
function normalizeName(r: Rule): Rule {
  if (r.name.startsWith('project:') || r.name.startsWith('baseline:')) return r
  return { ...r, name: `project:${r.name}` }
}
return {
  forbidden: (parsed.forbidden ?? []).map(normalizeName),
  required: (parsed.required ?? []).map(normalizeName),
  overrides: parsed.overrides,
}
```

- [ ] **F6.3: Run tests + commit**

```bash
npm run typecheck && npm run test
git add core/project-rules.ts tests/core/project-rules.test.ts
git commit -m "fix(arch-audit): normalize project: prefix on loadProjectRules"
```

---

### Task F7: Fix D9 loader regex to not capture `**Related:**` block

**Source:** review finding H6. **Severity:** HIGH (breaks cluster suggestions output).

**Problem.** Regex `\*\*Fix alternatives:\*\*\s*([\s\S]*?)(?=\n\n###|\n\n##|$)` greedily captures the `**Related:**` block that follows. Bullet matcher then includes Related lines in fix-alternatives list. Zhenka md output shows `- **Related:** \`god-object-prohibition\`...` as a "fix alternative".

**Files:**
- Modify: `core/d9-loader.ts`
- Modify: `tests/core/d9-loader.test.ts`
- Modify: `tests/fixtures/d9-sample.md` (add a Related block to test for non-capture)

- [ ] **F7.1: Update fixture to include `**Related:**`**

`tests/fixtures/d9-sample.md` add at end of `acyclic-dependencies` entry, AFTER fix alternatives:

```markdown
**Related:** `god-object-prohibition`, `common-reuse`.
```

- [ ] **F7.2: Add failing test**

```typescript
it('does not include Related block in fix_alternatives', async () => {
  const d9 = await loadD9('tests/fixtures/d9-sample.md')
  const alts = d9.principles['acyclic-dependencies'].fix_alternatives
  expect(alts.every(a => !a.includes('Related'))).toBe(true)
  expect(alts.every(a => !a.includes('god-object-prohibition'))).toBe(true)
})
```

- [ ] **F7.3: Fix regex**

Change `core/d9-loader.ts`:

```typescript
const fixMatch = section.match(/\*\*Fix alternatives:\*\*\s*([\s\S]*?)(?=\n\*\*[A-Z]|\n###|\n##|$)/)
```

The lookahead now stops at the next `**Xxx`-style bold field, the next `###`, the next `##`, or end of text.

- [ ] **F7.4: Run tests + commit**

```bash
npm run typecheck && npm run test
git add core/d9-loader.ts tests/core/d9-loader.test.ts tests/fixtures/d9-sample.md
git commit -m "fix(arch-audit): D9 loader regex stops fix-alternatives block at next bold field"
```

---

### Task F8: Skip self-edges in cluster Mermaid

**Source:** review finding H7. **Severity:** HIGH (unreadable diagrams).

**Problem.** `adapters/typescript-depcruise.ts` god-object/dependency-hub/high-fanout findings have `source.module === target.module`. `helpers/generate-mermaid.ts` renders these as `module --> module` self-loops. Cluster diagrams in Zhenka output show `channels --> channels`.

**Files:**
- Modify: `helpers/generate-mermaid.ts`
- Modify: `tests/helpers/generate-mermaid.test.ts`

- [ ] **F8.1: Add failing test**

```typescript
it('does not render self-edges in cluster diagrams', () => {
  const report = minimalReport({
    findings: [
      {
        id: 'f-001',
        rule_id: 'baseline:god-object',
        type: 'metric',
        severity: 'HIGH',
        source: { module: 'a', file: '' },
        target: { module: 'a', file: '' },  // self-loop
        reason: { principle: 'god-object-prohibition', explanation: '' },
      },
    ],
    metrics: { ...minimalReport().metrics, dep_graph: { a: [] } },
  })
  const result = generateMermaid(report)
  for (const block of Object.values(result.clusters)) {
    expect(block).not.toMatch(/a --> a/)
  }
})
```

- [ ] **F8.2: Fix `buildClusters` and `buildOverall`**

In `helpers/generate-mermaid.ts`, in `buildClusters`:

```typescript
for (const f of group) {
  if (f.source.module === f.target.module) {
    // self-rule: render as single node, not edge
    const node = escId(f.source.module)
    if (!seen.has(node)) {
      lines.push(`    ${node}`)
      seen.add(node)
    }
    continue
  }
  const e = `${escId(f.source.module)} --> ${escId(f.target.module)}`
  if (!seen.has(e)) { lines.push(`    ${e}`); seen.add(e) }
}
```

Same logic in `buildOverall` for findings-driven edges (the dep_graph edges remain as-is — those are real graph edges, not findings).

- [ ] **F8.3: Run tests + commit**

```bash
npm run typecheck && npm run test
git add helpers/generate-mermaid.ts tests/helpers/generate-mermaid.test.ts
git commit -m "fix(arch-audit): skip self-edges in cluster Mermaid diagrams"
```

---

### Task F9: Detect non-namespaced rule_id in adapter detectStructural — sync with namespace contract

**Source:** review finding H3. **Severity:** MEDIUM.

**Problem.** Adapter emits `rule_id: 'god-object'` etc. without `baseline:` prefix. Works because `enrich-findings.ts:31-33` does dual lookup (by name AND id). But contract drift: spec section 2 pipeline note says structural detection emits findings with rule_id (no prefix yet), and helper #4 prepends prefix. So this is technically correct.

**Decision needed:** keep current behavior (adapter emits names, enrich namespaces) OR change adapter to emit namespaced ids directly.

**Recommendation:** keep current behavior — the design is consistent: helper #2 (depcruise) and adapter both emit RawFinding with non-namespaced rule_id; helper #4 enriches. ADD A COMMENT in adapter at top of detectStructural making this explicit:

```typescript
// NOTE: rule_id values here are bare names without baseline: prefix.
// Namespacing happens in helpers/enrich-findings.ts during enrichment.
// See impl-spec section 2 pipeline note.
```

- [ ] **F9.1: Add the comment**

- [ ] **F9.2: Commit**

```bash
git add adapters/typescript-depcruise.ts
git commit -m "docs(arch-audit): clarify rule_id namespacing happens in enrich-findings"
```

---

### Task F10: Sync SKILL.md references to renamed files

**Source:** review finding L6. **Severity:** MEDIUM (documentation drift).

**Problem.** `SKILL.md:139` mentions `normalize-severity.js` — file was renamed to `enrich-findings.ts` per impl-spec section 2.

**Files:**
- Modify: `hi_flow/skills/arch-audit/SKILL.md`

- [ ] **F10.1: Find all references and fix**

```bash
grep -n "normalize-severity" SKILL.md
```

Replace with `enrich-findings`. Also check for other stale references (`apply-suppression.js` if present — was consolidated into `core/suppression.ts`).

- [ ] **F10.2: Commit**

```bash
git add SKILL.md
git commit -m "docs(arch-audit): sync SKILL.md helper names with implementation"
```

---

## Phase 3 — Cleanup

### Task F11: Add `validateRulesPatchSchema` export OR explicit deviation note

**Source:** review finding C2. **Severity:** MEDIUM (downgraded — runtime validation in helper #8 substitutes).

**Decision required from operator:** spec section 3.4 says `core/d8-schema-validator.ts` should export both `validateD8Report` AND `validateRulesPatchSchema`. The latter requires a `references/rules-patch-schema.json` JSON Schema that doesn't exist. Helper #8 does runtime field-level validation but no JSON Schema check.

**Two options:**

**Option A (full impl):** create `references/rules-patch-schema.json`, add export, call from helper #8 first.

**Option B (deviation note):** keep current runtime validation, document deviation in impl-report. Justification: field-level validation is sufficient; JSON Schema would be belt-and-suspenders.

**Default:** Option B unless operator specifies A.

- [ ] **F11.1: If Option B — append to `docs/superpowers/plans/2026-04-28-arch-audit-impl-report.md`** under "Deviations from spec":

```markdown
- **`validateRulesPatchSchema` not implemented:** spec section 3.4 specified two exports for d8-schema-validator. v1 only exports `validateD8Report`; patch validation in helper #8 uses field-level runtime checks instead of JSON Schema. Decision: acceptable for v1, defense-in-depth schema validation parked for v2.
```

- [ ] **F11.2: Commit**

```bash
git add docs/superpowers/plans/2026-04-28-arch-audit-impl-report.md
git commit -m "docs(arch-audit): document validateRulesPatchSchema deviation"
```

---

### Task F12: Surface silent `npx --yes` install in report-builder (principle 5 violation)

**Source:** review finding L2. **Severity:** LOW.

**Problem.** `core/report-builder.ts:39-49` falls back to `npx --yes dependency-cruiser` if not present. Silent install side-effect violates global principle 5 ("Fallback-на-дефолт молча запрещён").

**Recommendation:** require depcruise to be pre-installed (the preflight from F1 already enforces this — if it can't query version, throw). Drop `--yes` fallback in runner.

- [ ] **F12.1: Modify `report-builder.ts` runner default**

```typescript
const runner = opts.runDepcruise ?? ((cfg: string, src: string) => {
  return execSync(
    `npx --no-install dependency-cruiser --output-type json --config ${cfg} ${src}`,
    { cwd: projectRoot, encoding: 'utf-8' },
  )
})
```

- [ ] **F12.2: Run tests** (existing tests inject mock runner — should continue passing).

- [ ] **F12.3: Commit**

```bash
npm run typecheck && npm run test
git add core/report-builder.ts
git commit -m "fix(arch-audit): drop --yes fallback in depcruise runner (no silent install)"
```

---

### Task F13: Fix Windows-incompatible CLI guard in regenerate-principles-index

**Source:** review finding L1. **Severity:** LOW (Windows-specific).

**Files:**
- Modify: `helpers/regenerate-principles-index.ts`

- [ ] **F13.1: Replace fragile guard**

Current:
```typescript
if (import.meta.url === `file://${process.argv[1]}`) {
```

Replace with:
```typescript
import { pathToFileURL } from 'node:url'
// ...
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
```

- [ ] **F13.2: Commit**

```bash
git add helpers/regenerate-principles-index.ts
git commit -m "fix(arch-audit): use pathToFileURL for Windows-compatible CLI entry detection"
```

---

### Task F14: Cluster prose default — explicit warning instead of silent empty

**Source:** review finding M3. **Severity:** LOW (principle 5 again).

**Problem.** `report-builder.ts:86` default `clusterProsefn` returns `{name: id, root_cause: ''}` silently — empty Root cause in markdown. SKILL.md promises LLM-generated cluster prose; silent empty is fallback-on-default.

**Recommendation:** if `clusterProsefn` not provided, render markdown with explicit placeholder text noting "Cluster prose was not generated — pass clusterProsefn to populate." Visible signal beats silent emptiness.

- [ ] **F14.1: Modify default**

```typescript
const clusterProse = opts.clusterProsefn ?? ((id: string) => ({
  name: id,
  root_cause: '_(cluster prose not generated — clusterProsefn not provided to buildReport)_',
}))
```

- [ ] **F14.2: Commit**

```bash
git add core/report-builder.ts
git commit -m "fix(arch-audit): explicit fallback marker when clusterProsefn missing"
```

---

## Final smoke re-run + impl-report update

- [ ] **F15.1: Re-run smoke on Zhenka with all fixes applied**

```bash
cd hi_flow/skills/arch-audit
# operator runs the smoke command from original Task 21.3 (or equivalent)
# verify:
# - depcruise version preflight fires if pinned to 17.x (should hard fail with clear message)
# - on supported version, audit runs end-to-end
# - audit-report.json: no fake modules (node_modules, crypto, fs, bun:test, index_ts)
# - audit-report.json: nccd-breach finding present if NCCD > threshold
# - audit-report.md: cluster diagrams have no self-loops
# - audit-report.md: Fix alternatives sections do NOT contain "Related:" lines
# - audit_sha is either git short-SHA OR uuid:* (depending on smoke target)
```

- [ ] **F15.2: Update `docs/superpowers/plans/2026-04-28-arch-audit-impl-report.md`**

Append new section:

```markdown
## Post-review fixes (2026-04-28)

Per `docs/superpowers/plans/2026-04-28-arch-audit-review-fixes.md`:

- F1: preflight depcruise version check implemented (`core/preflight.ts`).
- F2: `metadata.parsing_errors` populated end-to-end.
- F3: fake modules (node_modules, builtins, top-level src files) filtered from dep_graph.
- F4: `port-adapter-direction`, `domain-no-channel-sdk`, `nccd-breach` baseline rules now emit findings.
- F5: `audit_sha` resolver with git/UUID fallback (`core/audit-sha.ts`).
- F6: `project:` prefix normalized on `loadProjectRules`.
- F7: D9 loader regex fixed to skip Related blocks in fix_alternatives.
- F8: cluster Mermaid no longer renders self-edges.
- F9: documentation comment in adapter clarifying namespacing pipeline.
- F10: SKILL.md helper names synced.
- F11: validateRulesPatchSchema parked for v2 (operator decision).
- F12: silent `--yes` install removed from depcruise runner.
- F13: Windows-compatible CLI guard.
- F14: explicit cluster prose fallback marker.

All 62 + N new tests passing. Smoke on Zhenka re-validated.
```

- [ ] **F15.3: Final commit**

```bash
git add docs/superpowers/plans/2026-04-28-arch-audit-impl-report.md
git commit -m "docs(arch-audit): post-review fixes summary"
```

---

## Self-review checklist (impl agent runs before declaring done)

- [ ] All Phase 1 tasks (F1-F5) committed and tests green.
- [ ] `npm run typecheck && npm run test` passes — total test count > 62 (added tests for F1, F2, F3, F4, F5, F6, F7, F8).
- [ ] Re-run smoke on Zhenka — `audit-report.json` has zero fake modules, `nccd-breach` present if applicable, valid `audit_sha`.
- [ ] No regressions: existing 62 tests still green.
- [ ] No emoji introduced.
- [ ] No operator-local paths leaked into produced artifacts.
- [ ] If any task in this fix-list uncovered an issue not described — STOPPED and asked operator, did not improvise.

---

## Out of scope for this fix-pass (parked)

- Foundation Mermaid diagram (real implementation, not stub) — design spec section 8, not blocking v1.
- LOC extraction quality from depcruise (depcruise itself doesn't always emit metrics.loc) — known limitation, parked.
- vertical-slice-respect detection — Layer C optional rule, parked.
- LLM cluster prose integration — SKILL.md responsibility, not in code path.
- Performance benchmarking on large projects.
- Forward-deterministic finding ids (currently sequential f-001, f-002 — sufficient for v1).
- AJV `format: date-time` warning — non-blocking, parked.
- `helpers/merge-rules-patch.ts` `rules_updated` always 0 (no real upsert logic) — parked unless operator wants it.
