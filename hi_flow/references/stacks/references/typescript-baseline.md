# typescript - baseline setup procedure

How to roll out the TypeScript stack in a new project. Loaded on demand, not at
every session bootstrap.

The companion stack file (`hi_flow/references/stacks/typescript.md`) fixes what
the agent applies in every session. This file fixes how to set up a new project
so those rules can be enforced.

Audience: `hi_flow:bootstrap` during first-time stack rollout or incremental
foundation repair.

---

## 1. Choose runtime

The TS stack supports two runtimes. Choose one per project.

- **Bun** - preferred for new projects that benefit from native TypeScript execution, native test runner, and single-binary ergonomics.
- **Node** - for projects that need Node-only tooling, libraries, or deployment targets.

Subsequent sections branch on this choice where it matters.

---

## 2. tsconfig.json

Single canonical template. Place at project root.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Adapt `include` to project structure. If the project introduces other top-level
dirs (`scripts/`, `migrations/`), add them.

---

## 3. Linter / formatter - Biome

Single tool for lint, format, and import organization.

Install:

```bash
bun add --dev --exact @biomejs/biome
```

or:

```bash
npm install --save-dev --save-exact @biomejs/biome
```

Canonical `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "warn",
        "noConsoleLog": "off"
      },
      "style": {
        "noDefaultExport": "error",
        "noNonNullAssertion": "warn",
        "useNamingConvention": {
          "level": "warn",
          "options": {
            "strictCase": false
          }
        }
      },
      "complexity": {
        "noBannedTypes": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded",
      "trailingCommas": "all"
    }
  },
  "files": {
    "ignore": ["dist", "node_modules", "*.generated.ts"]
  }
}
```

Run:

```bash
bunx biome check .
bunx biome check --write .
```

or the npm equivalents.

---

## 4. Test runner

### Bun runtime

No extra install is needed:

```bash
bun test
bun test --watch
```

Use:

```typescript
import { describe, expect, it } from 'bun:test'
```

### Node runtime

Install Vitest:

```bash
npm install --save-dev vitest
```

Add `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
```

Use:

```typescript
import { describe, expect, it } from 'vitest'
```

---

## 5. package.json scripts

Bun:

```json
{
  "scripts": {
    "typecheck": "bunx tsc --noEmit",
    "lint": "bunx biome check .",
    "lint:fix": "bunx biome check --write .",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "audit": "bun audit",
    "gates": "bun run typecheck && bun run lint && bun run test && bun run audit"
  }
}
```

Node:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "audit": "npm audit --audit-level=high",
    "gates": "npm run typecheck && npm run lint && npm run test && npm run audit"
  }
}
```

`gates` is the canonical local and CI gate.

---

## 6. CI - GitHub Actions

Place at `.github/workflows/ci.yml` and choose exactly one runtime block.

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Bun projects:
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun run gates

      # Node projects use this block instead:
      # - uses: actions/setup-node@v4
      #   with:
      #     node-version: '20'
      #     cache: 'npm'
      # - run: npm ci
      # - run: npm run gates
```

---

## 7. .editorconfig

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

---

## 8. Pre-commit hooks - none

No default pre-commit hook. Agents run `gates` before claiming completion and CI
runs them again. If a multi-developer team later needs hooks, add a project
override to `ARCHITECTURE.md`.

---

## 9. Dependency security & updates

`npm audit` / `bun audit` is a quality gate. Dependabot or Renovate is optional
and project-specific; do not enable it silently.

---

## 10. Rollout checklist

1. Choose runtime.
2. Initialize repo and package manager.
3. Add `tsconfig.json`.
4. Install Biome and add `biome.json`.
5. Bun: use built-in tests. Node: install Vitest and add `vitest.config.ts`.
6. Add canonical package scripts.
7. Add CI workflow.
8. Add `.editorconfig`.
9. Create/update `ARCHITECTURE.md` through `hi_flow:bootstrap`; ensure Stack records the applied TypeScript runtime.
10. Verify gates locally.

After this, the project is ready for `hi_flow/references/stacks/typescript.md`
operational rules.

---

## Reference

Operational rules: `hi_flow/references/stacks/typescript.md`.
