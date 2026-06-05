# react — convention reference pattern

The green-skeleton example module the bootstrap init flow lays down for the React axis
(SKILL.md → init mode, step 5). Like `scaffold-templates/typescript/`, this is a **hybrid**
of minimal template files plus this instruction on how to lay them out and parameterize them.

The files demonstrate **how a module is built in a React project** — layout, naming, export
form, test location, layer placement. They carry **no project meaning**: the whole `src/`
example can be deleted without losing anything the project is *about*.

## Layer model (the convention this pattern teaches)

A Vite React SPA is organized top → bottom, **imports allowed only downward**:

```
pages/        — route composition (top)            [aliases: routes/, app/]
  ↓
features/     — feature modules, isolated
  ↓
components/   — shared presentational UI
  ↓
hooks/        — shared hooks (incl. data hooks)    [alias: store/]
  ↓
(data-access) — api/ , services/
  ↓
lib/          — pure utilities, types, clients (bottom leaf)   [aliases: shared/, utils/]
```

This is the same vocabulary the arch-audit rule `frontend-layered-respect` enforces
(`hi_flow/skills/arch-audit/references/baseline-rules.md`). An upward / layer-skipping import
is a violation; `lib/` imports nothing internal.

## What the pattern instantiates — and what it deliberately does not

Shipped (the domain-free lower layers, each with a co-located test):

```
src/
  components/ExampleCard/ExampleCard.tsx   + ExampleCard.test.tsx
  hooks/useExampleToggle.ts                + useExampleToggle.test.ts
  lib/clamp.ts                             + clamp.test.ts
```

**`pages/` and `features/` are NOT scaffolded.** A page or a feature is inherently domain
(a feature surface) — scaffolding one would predict feature structure, which is arch-spec
territory (the altitude boundary, P8), not bootstrap's. They are the upper layers that
feature arch-specs fill later.

The example imports go **strictly downward** — `ExampleCard` → `useExampleToggle` → `clamp`
(components → hooks → lib) — so the scaffolded repo is **green** under `frontend-layered-respect`
and demonstrates the allowed direction by example. `components/` + `hooks/` are two of the four
frontend detection-signal dirs, so the scaffold activates the frontend audit profile (≥2).

## Conventions demonstrated (from `~/.claude/architecture/stacks/react.md`)

- **Naming split** — component file **PascalCase** (`ExampleCard.tsx`), hook file **camelCase**
  (`useExampleToggle.ts`), non-component module **kebab-case** (`clamp.ts`).
- **Named exports**, never `export default`.
- **Explicit props type** on the component (`ExampleCardProps`).
- **Co-located tests** (`ExampleCard.tsx` + `ExampleCard.test.tsx`) — Testing Library, query by
  role/text, assert on what the user sees (behavior, not internals); jsdom environment.

## Divergence from the typescript template (intentional)

The `scaffold-templates/typescript/` template uses the **`tests/` mirror** layout (its stack
file mandates it). This React template uses **co-located** tests, because `react.md` § Overrides
mandates co-location for the React stack. The scaffold-templates parent README already encodes
the precedent "specs may say co-located loosely → the authoritative stack file decides"; here the
stack file itself mandates co-located, so it stands. The contrast is deliberate, not an accident.

## How bootstrap parameterizes the template

- The example symbols (`ExampleCard`, `useExampleToggle`, `clamp`) and the `Example` segment stay
  **generic** — keep them generic when laying the template; do **not** rename them to a domain
  concept. The pattern's job is to demonstrate layout and conventions, not to seed a real module.
- File contents are copied verbatim except the placeholder substitution; comments are kept —
  their job is to teach the convention to whoever reads the scaffolded repo.

## Harness dependency (not shipped in this template)

These files rely on the target project's React harness — `package.json`, `tsconfig*.json`,
`vite.config.ts`, `eslint.config.js`, `biome.json`, and the dev-deps (`react`, `vitest`,
`@testing-library/react`, `@testing-library/user-event`, `jsdom`) — all produced by the React
baseline rollout (`~/.claude/architecture/stacks/references/react-baseline.md` §1-8), **not** by
this template. After the baseline is wired and the placeholders are substituted, the example
module compiles and `vitest run` passes — part of the done-criterion gates (the reference test
passes).

## Criterion: convention, not feature

If a reviewer can name the *feature* this template implements, the template is wrong. It teaches
*how any module is built* and where it lives; it answers nothing about *which* modules the project
has. Anti-example: do not ship `src/users/`, `src/auth/`, or anything with business rules.
