# arch-audit — Barrel Detection (15th baseline rule)

**Source:** new feature, unparked from design spec section 11 ("`no-deep-internal-import` rule — требует barrel/index discipline detection").
**Date:** 2026-04-28
**Status:** ready for implementation. Additive feature — does not modify existing 14 rules. All existing 81 tests must continue to pass.

**Working directory for ALL commands:** `hi_flow/skills/arch-audit/`.

**Test gate:** after each task, run `npm run typecheck && npm run test`. Must keep green; only test count grows.

**Commit prefix convention:** `feat(arch-audit): <short>` for new functionality, `docs(...)` for D9, `test(...)` for fixtures.

**Anti-improvising rule:** if a task uncovers a deeper issue not described here, STOP and ask the operator. Do not improvise. Do not extend scope (e.g., do not add second variant of barrel detection — variant B is locked).

---

## Design summary

**What is detected.** A "bad barrel" = `index.ts` (or `index.tsx`/`index.js`/`index.jsx`) at `src/<module>/` root that:
1. Contains only re-exports (≥80% of non-comment, non-import top-level statements are `export ... from '...'` or `export * from '...'`).
2. Has no value declarations with bodies (`function`, `class`, `const = ...`, `let`, `var`).
3. Is imported by AT LEAST ONE other top-level module — i.e., there exists an edge `<other> → <this-module>` where `<other> != <this-module>` and the resolved target file ends with the barrel's filename.

**Variant lock (per operator decision):** variant **B** — only barrels imported by sibling modules. Barrels imported only from sub-files within the same module are NOT flagged (legitimate package-internal API).

**Severity:** MEDIUM (per operator). Override via project rules `severity_overrides` if needed.

**Principle:** new D9 entry `barrel-discipline` (per operator).

**Detection location:** `helpers/detect-barrels.ts` (per operator — separation of concerns, testability).

**Wire-up:** adapter `detectStructural` calls helper, merges barrel findings into structural findings list. Helper consumes `projectPath`, `depGraph`, and a new `barrelImports` array surfaced from `parse-depcruise-output`.

---

## Task BR0: Pre-flight check (existing test gate)

- [ ] **BR0.1: Verify clean baseline before starting**

```bash
npm run typecheck && npm run test
```

Expected: typecheck PASS; 81 tests across 19 test files PASS. If any RED — STOP, surface to operator. Do not proceed until green.

---

## Task BR1: Add D9 principle `barrel-discipline`

**Files:**
- Modify: `hi_flow/references/architectural-principles.md`
- Regenerate: `hi_flow/references/architectural-principles-index.json` (if exists; otherwise skip — generated on demand by helper #7)

- [ ] **BR1.1: Add new entry to D9 markdown**

Open `hi_flow/references/architectural-principles.md`. Locate the **Index by id** section (around line 33-53). Insert in alphabetical order between ``acyclic-dependencies`` and `channel-agnosticism`:

```markdown
- [`barrel-discipline`](#barrel-discipline) — Structural Classics
```

Update the count line below from `**17 principles total.**` to `**18 principles total.**`.

Then locate group `## Group 4 — Structural Classics` (or wherever `module-boundary-awareness` lives). Insert this entry alphabetically (it goes after `acyclic-dependencies` topically; place it next to `module-boundary-awareness` since they're related):

```markdown
### barrel-discipline

- **Source:** Family-imported from package-design conventions; informal industry convention against opaque re-export aggregation.
- **Formulation:** A module's `index.ts` should not be a pure re-export aggregator (a "barrel") when the module is imported by sibling modules. Barrels hide the real dependency structure — consumers think they import "the module", but actually pull through opaque indirection that may re-export internals across boundaries.
- **Why:** Barrels distort the dependency graph for static analysis (Ca/Ce metrics under-count true coupling), provoke circular-dependency hazards (when sibling barrels re-export each other), break tree-shaking at build time, and make refactor risk invisible (changing an internal file silently affects all consumers via the barrel).
- **Detection:** Static. (1) Identify `index.ts`/`.tsx`/`.js`/`.jsx` files at module roots. (2) Parse content; if ≥80% of non-comment, non-import top-level statements are `export ... from`/`export * from` AND there are no value declarations with bodies → it is a barrel. (3) For each barrel, check the dependency graph: is it imported by at least one sibling top-level module? If yes — fire finding.
- **Fix alternatives:**
  1. Replace barrel with explicit deep imports — sibling modules import directly from the specific submodule (`src/foo/sub/specific.ts`), not from `src/foo`.
  2. Reduce re-export surface — if barrel is desired as a public API surface, make consumers import only from a stable subset; move internal re-exports into a different file not re-exported by the barrel.
  3. Document accepted barrel — if barrel is the explicit public API of the module (package boundary), document in project rules `overrides.baseline_disables` with reason; the rule won't fire for that module.
- **Related:** `module-boundary-awareness`, `single-responsibility-module`, `interface-segregation`.
```

- [ ] **BR1.2: Verify markdown renders correctly**

```bash
grep -c "^### " /c/Users/Vegr/Projects/Owners/agent_orchesration_skills/hi_flow/references/architectural-principles.md
```

Expected: 18 (was 17, +1 for `barrel-discipline`).

- [ ] **BR1.3: Commit**

```bash
git add hi_flow/references/architectural-principles.md
git commit -m "docs(d9): add barrel-discipline principle (18 total)"
```

---

## Task BR2: Add baseline rule `baseline:barrel-file`

**Files:**
- Modify: `hi_flow/skills/arch-audit/core/baseline-rules.ts`
- Modify: `hi_flow/skills/arch-audit/tests/core/baseline-rules.test.ts`

- [ ] **BR2.1: Add failing test**

Open `tests/core/baseline-rules.test.ts`. Update the existing test `'returns 14 baseline rules'` to expect 15:

```typescript
it('returns 15 baseline rules', () => {
  const rules = getBaselineRules()
  expect(rules).toHaveLength(15)
})
```

Add a new test:

```typescript
it('contains baseline:barrel-file rule with MEDIUM severity and barrel-discipline principle', () => {
  const rule = getBaselineRules().find(r => r.id === 'baseline:barrel-file')
  expect(rule).toBeDefined()
  expect(rule?.severity).toBe('MEDIUM')
  expect(rule?.principle).toBe('barrel-discipline')
})
```

- [ ] **BR2.2: Run tests, expect FAIL**

```bash
npx vitest run tests/core/baseline-rules.test.ts
```

Expected: 2 failures (count mismatch + missing rule).

- [ ] **BR2.3: Add rule to `core/baseline-rules.ts`**

In the `RULES` array, in the Layer B group (universal custom — alongside `god-object`, `dependency-hub`, etc.), add:

```typescript
{
  id: 'baseline:barrel-file',
  name: 'barrel-file',
  principle: 'barrel-discipline',
  severity: 'MEDIUM',
  threshold_default: 0.8,  // re-export ratio threshold
  explanation: 'Module {module} has a barrel index file ({barrel_file}) imported by sibling modules ({importing_modules}). Barrels obscure the real dependency graph; prefer explicit deep imports.',
},
```

- [ ] **BR2.4: Run tests, expect PASS**

```bash
npx vitest run tests/core/baseline-rules.test.ts
```

Expected: 8 tests PASS (7 original + 1 new).

- [ ] **BR2.5: Commit**

```bash
git add core/baseline-rules.ts tests/core/baseline-rules.test.ts
git commit -m "feat(arch-audit): add baseline:barrel-file rule (15 total)"
```

---

## Task BR3: Surface barrel-mediated import edges from parse-depcruise-output

**Files:**
- Modify: `hi_flow/skills/arch-audit/helpers/parse-depcruise-output.ts`
- Modify: `hi_flow/skills/arch-audit/tests/helpers/parse-depcruise-output.test.ts`
- Create: `hi_flow/skills/arch-audit/tests/fixtures/depcruise-barrel-sample.json`

We need to know, per import edge, whether the resolved target was an `index.ts`/`.tsx`/`.js`/`.jsx` file. detect-barrels uses this to confirm "barrel was actually used by a sibling".

- [ ] **BR3.1: Create fixture with barrel-mediated import**

`tests/fixtures/depcruise-barrel-sample.json`:

```json
{
  "summary": { "violations": [] },
  "modules": [
    {
      "source": "src/foo/index.ts",
      "dependencies": [
        { "resolved": "src/foo/internal/a.ts", "module": "./internal/a" },
        { "resolved": "src/foo/internal/b.ts", "module": "./internal/b" }
      ]
    },
    {
      "source": "src/foo/internal/a.ts",
      "dependencies": []
    },
    {
      "source": "src/foo/internal/b.ts",
      "dependencies": []
    },
    {
      "source": "src/bar/index.ts",
      "dependencies": [
        { "resolved": "src/foo/index.ts", "module": "../foo" }
      ]
    }
  ]
}
```

This represents: `bar` imports from `foo` (resolved via `foo/index.ts`); `foo/index.ts` re-exports its own internals.

- [ ] **BR3.2: Add failing test**

Append to `tests/helpers/parse-depcruise-output.test.ts`:

```typescript
it('surfaces barrel_imports for edges resolving to an index file', async () => {
  const raw = await readFile('tests/fixtures/depcruise-barrel-sample.json', 'utf-8')
  const result = parseDepcruiseOutput(raw)
  expect(result.barrel_imports).toBeDefined()
  // bar -> foo, target file is src/foo/index.ts
  const edge = result.barrel_imports!.find(e => e.from === 'bar' && e.to === 'foo')
  expect(edge).toBeDefined()
  expect(edge!.targetFile).toBe('src/foo/index.ts')
})

it('does NOT surface barrel_imports for non-index targets', async () => {
  const raw = JSON.stringify({
    summary: { violations: [] },
    modules: [
      { source: 'src/a/index.ts', dependencies: [{ resolved: 'src/b/specific.ts', module: '../b/specific' }] },
      { source: 'src/b/specific.ts', dependencies: [] },
    ],
  })
  const result = parseDepcruiseOutput(raw)
  expect(result.barrel_imports ?? []).toHaveLength(0)
})
```

- [ ] **BR3.3: Run, FAIL**

- [ ] **BR3.4: Update ParseResult and implement extraction**

Open `helpers/parse-depcruise-output.ts`. Locate the `ParseResult` interface (or wherever it is defined). Extend it:

```typescript
interface ParseResult {
  findings: RawFinding[]
  dep_graph: DepGraph
  per_module_raw: Record<string, PerModuleRaw>
  parsing_errors?: { file: string; error: string }[]
  sdk_edges: { from: string; sdk: string }[]
  barrel_imports?: { from: string; to: string; targetFile: string }[]
}
```

Inside the modules-loop where dep_graph is built, when an edge crosses module boundaries, also check for index-file resolution:

```typescript
const INDEX_FILENAME_RE = /\/index\.(ts|tsx|js|jsx)$/

const barrel_imports: { from: string; to: string; targetFile: string }[] = []

// Inside existing loop, after `if (!tgtMod || tgtMod === srcMod) continue;`:
if (INDEX_FILENAME_RE.test(dep.resolved ?? '')) {
  barrel_imports.push({ from: srcMod, to: tgtMod, targetFile: dep.resolved })
}
```

Include `barrel_imports` in the return object only if non-empty (to avoid changing existing test expectations):

```typescript
return {
  findings,
  dep_graph,
  per_module_raw,
  sdk_edges,
  ...(parsing_errors.length > 0 ? { parsing_errors } : {}),
  ...(barrel_imports.length > 0 ? { barrel_imports } : {}),
}
```

- [ ] **BR3.5: Run, PASS, commit**

```bash
npx vitest run tests/helpers/parse-depcruise-output.test.ts
git add helpers/parse-depcruise-output.ts tests/helpers/parse-depcruise-output.test.ts tests/fixtures/depcruise-barrel-sample.json
git commit -m "feat(arch-audit): surface barrel_imports edges from depcruise output"
```

---

## Task BR4: Implement `helpers/detect-barrels.ts`

**Files:**
- Create: `hi_flow/skills/arch-audit/helpers/detect-barrels.ts`
- Create: `hi_flow/skills/arch-audit/tests/helpers/detect-barrels.test.ts`

This is the core detection helper. Reads `index.*` files from disk, parses content, decides barrel-ness, cross-references with barrel_imports edges, emits RawFindings.

- [ ] **BR4.1: Write failing tests**

`tests/helpers/detect-barrels.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { detectBarrels } from '../../helpers/detect-barrels.ts'

async function makeProject(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'barrel-'))
  await mkdir(join(dir, 'src/foo'), { recursive: true })
  await mkdir(join(dir, 'src/bar'), { recursive: true })
  return dir
}

describe('detect-barrels', () => {
  it('flags a barrel imported by a sibling module', async () => {
    const dir = await makeProject()
    await writeFile(
      join(dir, 'src/foo/index.ts'),
      `export * from './a.ts'\nexport { B } from './b.ts'\n`,
    )
    await writeFile(join(dir, 'src/foo/a.ts'), 'export const A = 1\n')
    await writeFile(join(dir, 'src/foo/b.ts'), 'export const B = 2\n')
    await writeFile(join(dir, 'src/bar/index.ts'), `export * from '../foo'\n`)

    const findings = await detectBarrels({
      projectPath: dir,
      modulesList: ['foo', 'bar'],
      barrelImports: [{ from: 'bar', to: 'foo', targetFile: 'src/foo/index.ts' }],
    })

    expect(findings).toHaveLength(1)
    expect(findings[0].rule_id).toBe('barrel-file')
    expect(findings[0].source.module).toBe('bar')
    expect(findings[0].target.module).toBe('foo')

    await rm(dir, { recursive: true })
  })

  it('does NOT flag a barrel that is only imported within its own module', async () => {
    const dir = await makeProject()
    await writeFile(join(dir, 'src/foo/index.ts'), `export * from './a.ts'\n`)
    await writeFile(join(dir, 'src/foo/a.ts'), 'export const A = 1\n')

    const findings = await detectBarrels({
      projectPath: dir,
      modulesList: ['foo'],
      barrelImports: [], // no sibling imports
    })

    expect(findings).toHaveLength(0)
    await rm(dir, { recursive: true })
  })

  it('does NOT flag a non-barrel index.ts (has business logic)', async () => {
    const dir = await makeProject()
    await writeFile(
      join(dir, 'src/foo/index.ts'),
      `import { x } from './a.ts'\nexport function doStuff() { return x + 1 }\n`,
    )
    await writeFile(join(dir, 'src/foo/a.ts'), 'export const x = 1\n')

    const findings = await detectBarrels({
      projectPath: dir,
      modulesList: ['foo'],
      barrelImports: [{ from: 'bar', to: 'foo', targetFile: 'src/foo/index.ts' }],
    })

    expect(findings).toHaveLength(0)
    await rm(dir, { recursive: true })
  })

  it('skips modules without index files', async () => {
    const dir = await makeProject()
    await writeFile(join(dir, 'src/foo/a.ts'), 'export const A = 1\n')

    const findings = await detectBarrels({
      projectPath: dir,
      modulesList: ['foo'],
      barrelImports: [],
    })

    expect(findings).toHaveLength(0)
    await rm(dir, { recursive: true })
  })

  it('handles index.tsx and index.js variants', async () => {
    const dir = await makeProject()
    await writeFile(join(dir, 'src/foo/index.tsx'), `export * from './a.ts'\n`)
    await writeFile(join(dir, 'src/foo/a.ts'), 'export const A = 1\n')

    const findings = await detectBarrels({
      projectPath: dir,
      modulesList: ['foo'],
      barrelImports: [{ from: 'bar', to: 'foo', targetFile: 'src/foo/index.tsx' }],
    })

    expect(findings).toHaveLength(1)
    expect(findings[0].extras?.barrel_file).toMatch(/index\.tsx$/)
    await rm(dir, { recursive: true })
  })

  it('aggregates multiple importers into extras.importing_modules', async () => {
    const dir = await makeProject()
    await mkdir(join(dir, 'src/baz'), { recursive: true })
    await writeFile(join(dir, 'src/foo/index.ts'), `export * from './a.ts'\n`)
    await writeFile(join(dir, 'src/foo/a.ts'), 'export const A = 1\n')

    const findings = await detectBarrels({
      projectPath: dir,
      modulesList: ['foo', 'bar', 'baz'],
      barrelImports: [
        { from: 'bar', to: 'foo', targetFile: 'src/foo/index.ts' },
        { from: 'baz', to: 'foo', targetFile: 'src/foo/index.ts' },
      ],
    })

    // One finding per (importer, barrel) pair — more useful for cluster grouping
    expect(findings).toHaveLength(2)
    expect(findings.map(f => f.source.module).sort()).toEqual(['bar', 'baz'])

    await rm(dir, { recursive: true })
  })
})
```

- [ ] **BR4.2: Run, FAIL** (`npx vitest run tests/helpers/detect-barrels.test.ts`)

- [ ] **BR4.3: Implement `helpers/detect-barrels.ts`**

```typescript
import { readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import type { RawFinding } from '../core/types.ts'

interface DetectBarrelsArgs {
  projectPath: string
  modulesList: string[]                                                // top-level module names from adapter.identifyModules
  barrelImports: { from: string; to: string; targetFile: string }[]    // edges where target was an index.* file (from parse-depcruise-output)
  threshold?: number                                                   // re-export ratio threshold; default 0.8
}

const INDEX_FILES = ['index.ts', 'index.tsx', 'index.js', 'index.jsx']

// Strip block comments /* ... */ and line comments // ...
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
}

// Coarse top-level statement count: split on `;` and newlines, drop empty lines / pure imports.
// Re-export pattern: starts with `export` and contains ` from `.
// Value declaration pattern: `export (function|class|const|let|var)` or top-level `function|class|const|let|var`.
function classifyStatements(src: string): { reexports: number; valueDecls: number; otherStatements: number } {
  const stripped = stripComments(src)
  // Statements: split on semicolons, then trim and drop empty.
  const rawStatements = stripped
    .split(/[\n;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  let reexports = 0
  let valueDecls = 0
  let otherStatements = 0

  for (const s of rawStatements) {
    // Pure imports — not counted (they are setup, not "logic")
    if (/^import\s/.test(s)) continue
    // Re-export with from
    if (/^export\s+(\*|\{[^}]*\}|type\s+\{?[^}]*\}?)\s+from\s+['"]/.test(s)) {
      reexports++
      continue
    }
    // Value declaration with body (function, class, const = ..., let = ..., var = ...)
    if (/^export\s+(function|class|const|let|var)\s/.test(s) || /^(function|class|const|let|var)\s/.test(s)) {
      valueDecls++
      continue
    }
    // type/interface declarations — re-export-style, count as low-impact (treat as reexport)
    if (/^export\s+(type|interface|enum)\s/.test(s) || /^(type|interface|enum)\s/.test(s)) {
      reexports++
      continue
    }
    otherStatements++
  }

  return { reexports, valueDecls, otherStatements }
}

function isBarrelContent(src: string, threshold: number): boolean {
  const { reexports, valueDecls, otherStatements } = classifyStatements(src)
  if (valueDecls > 0) return false
  const total = reexports + otherStatements
  if (total === 0) return false
  return reexports / total >= threshold
}

async function findIndexFile(modulePath: string): Promise<string | null> {
  for (const filename of INDEX_FILES) {
    const candidate = join(modulePath, filename)
    try {
      await access(candidate)
      return candidate
    } catch {}
  }
  return null
}

export async function detectBarrels(args: DetectBarrelsArgs): Promise<RawFinding[]> {
  const threshold = args.threshold ?? 0.8
  const findings: RawFinding[] = []

  for (const moduleName of args.modulesList) {
    const modulePath = join(args.projectPath, 'src', moduleName)
    const indexPath = await findIndexFile(modulePath)
    if (!indexPath) continue

    const content = await readFile(indexPath, 'utf-8')
    if (!isBarrelContent(content, threshold)) continue

    // Find sibling importers
    const importers = args.barrelImports
      .filter(e => e.to === moduleName && e.from !== moduleName)
      .map(e => e.from)

    if (importers.length === 0) continue

    const indexRelative = indexPath.replace(args.projectPath + '/', '').replace(args.projectPath + '\\', '').replace(/\\/g, '/')

    for (const importer of importers) {
      findings.push({
        rule_id: 'barrel-file',
        raw_severity: 'warn',
        type: 'module-boundary',
        source: { module: importer, file: '' },
        target: { module: moduleName, file: indexRelative },
        extras: {
          barrel_file: indexRelative,
          importing_modules: importers,
        },
      })
    }
  }

  return findings
}
```

- [ ] **BR4.4: Run, PASS**

```bash
npx vitest run tests/helpers/detect-barrels.test.ts
```

Expected: 6 tests PASS.

- [ ] **BR4.5: Commit**

```bash
git add helpers/detect-barrels.ts tests/helpers/detect-barrels.test.ts
git commit -m "feat(arch-audit): implement detect-barrels helper"
```

---

## Task BR5: Wire detect-barrels into adapter detectStructural

**Files:**
- Modify: `hi_flow/skills/arch-audit/adapters/typescript-depcruise.ts`
- Modify: `hi_flow/skills/arch-audit/tests/adapters/typescript-depcruise.test.ts`
- Modify: `hi_flow/skills/arch-audit/core/report-builder.ts` (pass barrel_imports through)

- [ ] **BR5.1: Extend adapter detectStructural signature**

In `adapters/typescript-depcruise.ts`, find the `detectStructural` interface declaration and the implementation. Add to args:

```typescript
detectStructural(args: {
  projectPath: string
  depGraph: DepGraph
  perModuleRaw: Record<string, { ca: number; ce: number; loc: number }>
  projectRules: ProjectRules
  sdkEdges?: { from: string; sdk: string }[]
  barrelImports?: { from: string; to: string; targetFile: string }[]   // NEW
  modulesList?: string[]                                                // NEW — needed by detect-barrels
}): Promise<RawFinding[]>
```

- [ ] **BR5.2: Add failing adapter test**

Append to `tests/adapters/typescript-depcruise.test.ts` inside the structural detection describe block:

```typescript
it('emits barrel-file findings via detectBarrels integration', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tda-barrel-'))
  await mkdir(join(dir, 'src/foo'), { recursive: true })
  await mkdir(join(dir, 'src/bar'), { recursive: true })
  await writeFile(join(dir, 'src/foo/index.ts'), `export * from './a.ts'\n`)
  await writeFile(join(dir, 'src/foo/a.ts'), 'export const A = 1\n')
  await writeFile(join(dir, 'src/bar/index.ts'), `export * from '../foo'\n`)

  const a = createTypescriptDepcruiseAdapter()
  const findings = await a.detectStructural({
    projectPath: dir,
    depGraph: { foo: [], bar: ['foo'] },
    perModuleRaw: { foo: { ca: 1, ce: 0, loc: 1 }, bar: { ca: 0, ce: 1, loc: 1 } },
    projectRules: { forbidden: [], required: [] },
    barrelImports: [{ from: 'bar', to: 'foo', targetFile: 'src/foo/index.ts' }],
    modulesList: ['foo', 'bar'],
  })

  expect(findings.some(f => f.rule_id === 'barrel-file')).toBe(true)

  await rm(dir, { recursive: true })
})
```

(Make sure imports `mkdtemp`, `mkdir`, `writeFile`, `rm`, `join`, `tmpdir` are present at top of file — most adapter tests already import them.)

- [ ] **BR5.3: Run, FAIL**

- [ ] **BR5.4: Wire detect-barrels into detectStructural**

At top of `adapters/typescript-depcruise.ts`, add:

```typescript
import { detectBarrels } from '../helpers/detect-barrels.ts'
```

Inside the `detectStructural` implementation, AFTER all existing detection logic and BEFORE `return findings`, add:

```typescript
// Barrel detection — only runs if modulesList + barrelImports provided (degrades gracefully)
if (args.modulesList && args.barrelImports) {
  const barrelFindings = await detectBarrels({
    projectPath: args.projectPath,
    modulesList: args.modulesList,
    barrelImports: args.barrelImports,
  })
  findings.push(...barrelFindings)
}
```

- [ ] **BR5.5: Wire through report-builder**

In `core/report-builder.ts`, locate the `adapter.detectStructural({ ... })` call. Add the new args:

```typescript
const modulesList = (await adapter.identifyModules(projectRoot)).map(m => m.name)
const structural = await adapter.detectStructural({
  projectPath: projectRoot,
  depGraph: parsed.dep_graph,
  perModuleRaw: parsed.per_module_raw,
  projectRules,
  sdkEdges: parsed.sdk_edges,
  barrelImports: parsed.barrel_imports,    // NEW
  modulesList,                              // NEW
})
```

(Place `modulesList` computation before the call so it can be reused; verify `adapter.identifyModules` is still needed elsewhere — if not, this becomes the only call site.)

- [ ] **BR5.6: Run all tests, PASS**

```bash
npm run typecheck && npm run test
```

Expected: 81 + 6 (BR4 detect-barrels) + 1 (BR5 adapter) + 2 (BR3 parse) + 1 (BR2 baseline) = 91 tests, all green.

- [ ] **BR5.7: Commit**

```bash
git add adapters/typescript-depcruise.ts core/report-builder.ts tests/adapters/typescript-depcruise.test.ts
git commit -m "feat(arch-audit): wire barrel detection into adapter detectStructural"
```

---

## Task BR6: Integration test on a barrel fixture project

**Files:**
- Create: `hi_flow/skills/arch-audit/tests/fixtures/barrel-project/{package.json,tsconfig.json,src/foo/{index.ts,a.ts,b.ts},src/bar/index.ts,src/baz/main.ts}`
- Create: `hi_flow/skills/arch-audit/tests/integration/barrel-project.test.ts`

End-to-end test: real depcruise on a synthetic project with a clear barrel + sibling consumers.

- [ ] **BR6.1: Create fixture project**

```bash
mkdir -p tests/fixtures/barrel-project/src/foo tests/fixtures/barrel-project/src/bar tests/fixtures/barrel-project/src/baz
```

`tests/fixtures/barrel-project/package.json`:
```json
{ "name": "barrel-fixture", "version": "0.0.0", "private": true }
```

`tests/fixtures/barrel-project/tsconfig.json`:
```json
{ "compilerOptions": { "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler", "strict": true } }
```

`tests/fixtures/barrel-project/src/foo/a.ts`:
```typescript
export const A = 1
```

`tests/fixtures/barrel-project/src/foo/b.ts`:
```typescript
export const B = 2
```

`tests/fixtures/barrel-project/src/foo/index.ts` (the barrel):
```typescript
export * from './a.ts'
export * from './b.ts'
```

`tests/fixtures/barrel-project/src/bar/index.ts` (sibling importer of barrel):
```typescript
export { A, B } from '../foo'
```

`tests/fixtures/barrel-project/src/baz/main.ts` (no index — direct import, NOT through barrel):
```typescript
import { A } from '../foo/a.ts'
export const usesA = A + 1
```

Note: bar imports through foo's barrel → should fire `barrel-file`. baz imports `foo/a.ts` directly → should NOT fire (correct deep import).

- [ ] **BR6.2: Write integration test**

`tests/integration/barrel-project.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, readFile } from 'node:fs/promises'
import { buildReport } from '../../core/report-builder.ts'
import { createTypescriptDepcruiseAdapter } from '../../adapters/typescript-depcruise.ts'

describe('integration: barrel project', () => {
  it('produces a barrel-file finding for foo (imported by bar via index)', async () => {
    const projectRoot = join(process.cwd(), 'tests/fixtures/barrel-project')
    const outDir = join(projectRoot, 'audit-report')
    await rm(outDir, { recursive: true, force: true })
    await mkdir(outDir, { recursive: true })

    const adapter = createTypescriptDepcruiseAdapter()
    const result = await buildReport(adapter, projectRoot, {
      auditSha: 'uuid:barrel-test',
      depcruiseVersion: '16.3.0',
      outDir,
    })

    const json = JSON.parse(await readFile(result.json_path, 'utf-8'))
    const barrelFindings = json.findings.filter((f: any) => f.rule_id === 'baseline:barrel-file')
    expect(barrelFindings.length).toBeGreaterThan(0)
    // bar imports through foo's barrel
    expect(barrelFindings.some((f: any) => f.source.module === 'bar' && f.target.module === 'foo')).toBe(true)
    // baz imports foo/a.ts directly — NO barrel finding for baz
    expect(barrelFindings.some((f: any) => f.source.module === 'baz')).toBe(false)
  }, 60_000)
})
```

- [ ] **BR6.3: Run integration test, PASS**

```bash
npx vitest run tests/integration/barrel-project.test.ts
```

(Requires depcruise installed and version in `[16.0.0, 17.0.0)`. If preflight blocks, that's a separate issue — not part of this task.)

- [ ] **BR6.4: Commit**

```bash
git add tests/fixtures/barrel-project/ tests/integration/barrel-project.test.ts
git commit -m "test(arch-audit): integration test for barrel detection"
```

---

## Task BR7: Final smoke + impl-report update

- [ ] **BR7.1: Run full test suite**

```bash
npm run typecheck && npm run test
```

Expected: typecheck PASS; total tests >= 92 (81 baseline + 11 added across BR2/3/4/5/6); all green.

- [ ] **BR7.2: (Optional, requires compatible depcruise) re-run smoke on Zhenka**

If operator has depcruise in supported range — re-run boevoy. Verify whether barrel-file findings show up on real Zhenka code (depends on whether Zhenka uses barrel pattern). If preflight blocks (depcruise out of range), skip with note.

- [ ] **BR7.3: Append to impl-report**

Open `docs/superpowers/plans/2026-04-28-arch-audit-impl-report.md`. Append at the end:

```markdown
## Barrel detection (added 2026-04-XX per `docs/superpowers/plans/2026-04-28-arch-audit-barrel-detection.md`)

- BR1: D9 principle `barrel-discipline` added (18 principles total).
- BR2: baseline rule `baseline:barrel-file` added (15 baseline rules total, severity MEDIUM).
- BR3: `parse-depcruise-output` surfaces `barrel_imports` edges resolving to index files.
- BR4: `helpers/detect-barrels.ts` — content classification + sibling-importer cross-reference.
- BR5: adapter `detectStructural` integrates barrel detection via injected modulesList + barrelImports.
- BR6: integration test on `tests/fixtures/barrel-project` — barrel detected for `bar → foo`, not for direct `baz → foo/a.ts`.

Variant locked: B (barrels imported by sibling modules). Per-module-internal barrels are NOT flagged.
```

- [ ] **BR7.4: Final commit**

```bash
git add docs/superpowers/plans/2026-04-28-arch-audit-impl-report.md
git commit -m "docs(arch-audit): impl-report — barrel detection added"
```

---

## Self-review checklist

- [ ] All 7 BR tasks committed with conventional prefixes.
- [ ] `npm run typecheck && npm run test` — total tests >= 92, all green.
- [ ] No regressions: existing 81 tests still passing unchanged.
- [ ] D9 has 18 principles total, including `barrel-discipline`.
- [ ] `core/baseline-rules.ts` has 15 entries, including `baseline:barrel-file`.
- [ ] No emoji introduced.
- [ ] No operator-local paths leaked into produced artifacts.
- [ ] If a task uncovered an issue not described — STOPPED and asked operator, did not improvise.

---

## Out of scope for this fix-pass

- AST-based content parsing (regex is sufficient for v1; AST upgrade parked).
- Detection variant A (any barrel) or C (re-export-from-sibling-subdirs only). Variant B is locked per operator decision.
- Threshold tuning (default 0.8 — operator can override via project rules `severity_overrides` or write a custom rule).
- Detecting "good" barrels at package boundaries (not in scope — let operators disable per-module via project rules `baseline_disables`).
- Post-implementation merge of barrel-related findings into existing cluster suggestions logic. report-builder will cluster by `reason.principle` automatically — barrel findings will form their own cluster under `barrel-discipline`.
