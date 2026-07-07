# react - operational rules

## Header

Loaded when the project's `ARCHITECTURE.md` Stack section contains `react`.

This stack applies `hi_flow/references/stacks/typescript.md` as its base. React
projects are also TypeScript projects; this file adds the frontend delta.
Setup procedure: `hi_flow/references/stacks/references/react-baseline.md`.

## Working interface

The agent works through standard file and shell tools. A frontend project is a
Vite SPA. State lives in files (`src/`, `package.json`, `tsconfig*.json`,
`eslint.config.js`, `biome.json`, `vite.config.ts`).

Frontend baseline runtime is Node + npm, test runner Vitest with jsdom. "Read
current state" means reading actual `.tsx`/`.ts` source on disk; type state from
`tsc -b`, lint state from `eslint .`, format state from `biome format --check`,
and test state from `vitest run`.

## Overrides from TypeScript

- **Lint tool** - TypeScript base uses Biome for lint+format. React uses ESLint
  for linting and keeps Biome formatter-only. Reason: `eslint-plugin-react-hooks`
  covers the Rules of Hooks and exhaustive-deps.
- **File naming** - component files are `PascalCase` (`UserCard.tsx`), hook files
  are `camelCase` (`useAuth.ts`), other modules stay kebab-case.
- **Test location** - component/hook tests are co-located with source files.
  Backend/package TypeScript keeps mirrored `tests/`.

## Deterministic quality gates

Before closing any substantive task in a React project, all gates must be green:

- **typecheck** - `tsc -b`.
- **lint** - `eslint .`.
- **format** - `biome format --check .`.
- **tests** - `vitest run`.
- **audit** - `npm audit --audit-level=high`.

If a gate is missing, that is a bootstrap task or an explicit project override.

## Operational rules

### Component discipline

**One component per file; logic extracted to hooks.**
Keep components focused on rendering. Extract reusable or complex logic into
custom hooks.

**Props are typed explicitly.**
Declare a props type/interface for every component with props.

**Component and hook files follow the naming override.**

### Hooks discipline

**Rules of Hooks and exhaustive deps are enforced by ESLint.**
Fix warnings. Suppressing an exhaustive-deps warning requires an inline reason.

### State & data

**Server state via TanStack Query, not hand-rolled `useEffect` caches.**

**Client state: local first, Context next, store only if outgrown.**
Reach for Zustand or another store only when Context is no longer appropriate.

### Styling

**Tailwind utility-first; theme/tokens in config.**
Do not scatter recurring magic design values across components.

### Security

**No secrets in the frontend bundle.**
Only values intended to be public may appear in `VITE_` variables.

**Access control is backend/RLS, not frontend.**
Client-side checks are UX, never a security boundary.

**`dangerouslySetInnerHTML` is banned without sanitization.**
Use DOMPurify or avoid the pattern.

**Supply-chain: audit gate + committed lockfile + dependency review.**

### Testing

**Test user-visible behavior, not implementation.**
Use Testing Library queries by role/text/label and assert what the user sees.

**Co-located, jsdom environment.**
Component/hook tests live next to the source file.

## Cross-tool contracts

`hi_flow:arch-audit` currently uses the TypeScript dependency graph. It can apply
frontend layer rules through the TypeScript adapter and frontend profile, but it
does not have a separate React component graph adapter. Hook correctness stays
with ESLint.

## Reference

Setup procedure: `hi_flow/references/stacks/references/react-baseline.md`.
Base stack: `hi_flow/references/stacks/typescript.md`.
