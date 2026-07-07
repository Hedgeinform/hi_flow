# react - baseline setup procedure

How to roll out the React frontend stack in a new project. Loaded on demand, not
at every session bootstrap.

React builds on the TypeScript baseline
(`hi_flow/references/stacks/references/typescript-baseline.md`). This file covers
the frontend layer and intentional overrides.

Audience: `hi_flow:bootstrap` during first-time React stack rollout.

Fixed choices: Vite SPA, React 19, TypeScript, ESLint for lint, Biome for
formatting, Tailwind CSS, TanStack Query, react-router-dom, Vitest, Testing
Library, jsdom, Node + npm.

---

## 1. Scaffold

```bash
npm create vite@latest <project-name> -- --template react-ts
cd <project-name>
npm install
```

Then align configs to this baseline.

---

## 2. tsconfig project references

`tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2023",
    "useDefineForClassFields": true,
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["vite/client"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "types": ["node"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

Typecheck gate uses `tsc -b`.

---

## 3. Lint - ESLint flat config

```bash
npm install --save-dev eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals
```

`eslint.config.js`:

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
])
```

Do not add stylistic ESLint rules; formatting belongs to Biome.

---

## 4. Formatter - Biome formatter-only

```bash
npm install --save-dev --save-exact @biomejs/biome
```

`biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "linter": { "enabled": false },
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
    "ignore": ["dist", "node_modules"]
  }
}
```

Format gate: `biome format --check .`.

---

## 5. Styling - Tailwind CSS

```bash
npm install tailwindcss @tailwindcss/vite
```

Add the plugin in `vite.config.ts`, then import Tailwind in `src/index.css`:

```css
@import "tailwindcss";
```

Project design tokens go in CSS `@theme` as the design system grows.

---

## 6. Data & routing

```bash
npm install @tanstack/react-query react-router-dom
```

Minimal wiring in `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
```

Server state -> TanStack Query hooks. Client state -> local state and Context.

---

## 7. vite.config.ts

```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @vitejs/plugin-react
```

`vite.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
```

`src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

---

## 8. package.json scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b",
    "lint": "eslint .",
    "format": "biome format --write .",
    "format:check": "biome format --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "audit": "npm audit --audit-level=high",
    "gates": "npm run typecheck && npm run lint && npm run format:check && npm run test && npm run audit"
  }
}
```

---

## 9. CI - GitHub Actions

`.github/workflows/ci.yml`:

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
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run gates
```

---

## 10. .editorconfig

Same as TypeScript baseline.

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

## 11. Pre-commit hooks - none

Same rationale as TypeScript baseline: agents run gates and CI repeats them.

---

## 12. Security setup notes

- Only `VITE_` vars are exposed to browser bundle. Never put secrets there.
- Keep `.env` out of git; commit `.env.example` with placeholder names.
- Commit `package-lock.json`; keep `npm audit --audit-level=high` green.

---

## 13. Rollout checklist

1. Scaffold via Vite react-ts template.
2. Replace the three tsconfig files with canonical shape.
3. Install and configure ESLint.
4. Install Biome and add formatter-only config.
5. Install and wire Tailwind.
6. Install and wire TanStack Query + react-router-dom.
7. Install test stack, write `vite.config.ts` and `src/test-setup.ts`.
8. Add canonical scripts.
9. Add CI workflow and `.editorconfig`.
10. Add `.env.example`; ensure `.env` is gitignored.
11. Create/update `ARCHITECTURE.md` through `hi_flow:bootstrap`; ensure Stack records both TypeScript and React.
12. Verify gates locally.

After this, the project is ready for `hi_flow/references/stacks/react.md` and
the TypeScript base rules.

---

## Reference

Operational rules: `hi_flow/references/stacks/react.md`.
Base stack: `hi_flow/references/stacks/typescript.md`.
