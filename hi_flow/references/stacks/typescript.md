# typescript - operational rules

## Header

Loaded when the project's `ARCHITECTURE.md` Stack section contains `typescript`.

Global architectural principles: `hi_flow/references/architectural-principles.md`.
Setup procedure for new projects: `hi_flow/references/stacks/references/typescript-baseline.md`.

This file fixes what an agent applies in every session on a TypeScript project:
deterministic quality gates, type/import/error/testing discipline, anti-patterns,
and cross-tool preconditions.

## Working interface

The agent works with TS projects through standard file and shell tools. State lives
in files (`src/`, `tests/`, `package.json`, `tsconfig.json`, `biome.json`,
`vitest.config.ts`).

"Read current state" means reading actual TypeScript source on disk, not relying
on documentation or memory of a prior session. Type information comes from
`tsc --noEmit`; lint/format state from `biome check`; test state from the
project's test command (`bun test` or `vitest run` per project).

The agent operates within the project's existing runtime. Runtime is a per-project
decision fixed during bootstrap, not a stack-level invariant. Test runner choice
follows runtime: Bun -> `bun test`; Node -> `vitest`. Both expose a Vitest-like
API (`describe` / `it` / `expect`), so test code is mostly portable.

## Deterministic quality gates

Before closing any substantive task in a TypeScript project, all four gates must
be green:

- **typecheck** - `tsc --noEmit`. Green = exit code 0.
- **lint** - `biome check .`. Green = exit code 0.
- **tests** - `bun test` (Bun projects) or `vitest run` (Node projects). Green = exit code 0.
- **audit** - `npm audit --audit-level=high` or `bun audit`. Green = exit code 0; `high` and `critical` vulnerabilities break the gate.

If a gate is missing, that is either a bootstrap task or an explicit project
override recorded in `ARCHITECTURE.md`.

## Operational rules

### Type discipline

**Use of `any` requires inline justification.**
Replace with `unknown` plus narrowing, a concrete type, or a generic. If `any` is
genuinely the only honest option, keep it with `// any: <reason>`.

**Type assertions (`as Type`) require justification; `as const` is excluded.**
Prefer runtime validation or a type guard. Double-casts (`as any as Foo`,
`as unknown as Foo`) need explicit operator override or a narrow inline reason.

**`// @ts-ignore` is forbidden; `// @ts-expect-error` requires inline reason.**
Use `// @ts-expect-error <reason>` so the suppression self-destructs when the
underlying compiler error disappears.

**Public API requires explicit type annotations; local variables use inference.**
Exported functions/classes/constants should have explicit parameter and return
types. Local variables may rely on inference unless inference widens the type.

### Import discipline

**Barrel files are an anti-pattern for internal modules.**
Non-root `index.ts` files that only re-export siblings become aggregation points
with no purpose of their own. Import from concrete files. A root public API barrel
for a published library is acceptable.

**Circular dependencies between modules are forbidden.**
Extract shared concerns into a third module. Do not hide a design issue with
dynamic imports. If a cycle is accepted for now, record it as Accepted Drift in
`ARCHITECTURE.md`.

**Import order: external -> internal absolute -> relative.**
Let Biome organize imports.

**Use relative imports by default. Path aliases require project-level justification.**
If a project already uses aliases, follow its convention. Do not introduce aliases
without updating all affected tools.

### Error handling

**Error propagation strategy is pragmatic-hybrid by call site.**
Private calls inside a module may throw. Module/public boundaries that can fail
should return a Result-like type or document thrown errors explicitly. Top-level
entrypoints convert failures into structured responses and visible logs.

**Silent `catch` is forbidden.**
Every `catch` either rethrows, returns a typed error result, or logs visibly with
the error and enough context to debug.

### Naming

**Files: kebab-case.**
Exception: React component/hook naming is governed by `react.md`.

**Exports follow case convention by kind.**
Use `PascalCase` for types/interfaces/classes, `camelCase` for functions and
variables, `SCREAMING_SNAKE_CASE` only for fixed module-level constants, and
affirmative boolean names (`isReady`, `hasAccess`, `canEdit`, `shouldRetry`).

**Test files: `<source>.test.ts`.**
Do not use `.spec.ts` unless a project override explicitly says so.

### Testing

**Test location:** `tests/` directory mirroring `src/` structure.
React overrides this with co-located component/hook tests.

**Test fixtures:** under `tests/fixtures/<feature>/` for real input/output samples.
Extract inline mock objects when they grow beyond a small example.

**Coverage:** visible, not a hard gate by default. Critical paths and regressions
must have tests; line coverage thresholds often incentivize useless assertions.

## Anti-patterns

**Use `const obj as const` over `enum`.**
TS `enum` emits runtime code and has surprising behavior. Prefer literal objects
plus companion union types.

**Use named exports, not default exports.**
Named exports are safer for refactors and more consistent across agents.

**Extract repeated or long inline type literals into named types.**

**`Function` and `Object` types are banned.**
Use concrete call signatures, `Record<string, unknown>`, or a specific shape.

**Non-null assertion (`x!`) requires inline justification.**
Prefer narrowing or optional chaining. Keep `!` only with a short reason.

## Cross-tool contracts

`hi_flow:arch-audit` analyzes TypeScript dependency graphs via dependency-cruiser.
Correct resolution requires:

- `tsconfig.json` exists at project root.
- `compilerOptions.moduleResolution` matches the project's module style.
- `include` / `files` covers the directories the audit must analyze.
- path aliases, if used, are consistent with real directory structure.
- `allowImportingTsExtensions: true` when source imports use explicit `.ts` extensions.

`strict: true` is recommended for project quality and required by the type
discipline this stack expects.

## Reference

Setup procedure: `hi_flow/references/stacks/references/typescript-baseline.md`.
