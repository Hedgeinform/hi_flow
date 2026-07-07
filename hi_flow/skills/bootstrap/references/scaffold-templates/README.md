# scaffold-templates — convention reference patterns

This directory holds the **convention reference patterns** the bootstrap init flow lays
down as the green skeleton's *one example module* (see SKILL.md → init mode, step 5).
Each subdirectory is named for a technology row in
`references/coverage-manifest.md`; the atom's scaffold step lays the template whose name
matches the technology chosen for the axis.

Currently shipped:

- `typescript/` — the TypeScript / Node convention pattern.
- `react/` — the React / Vite convention pattern.

## Form: hybrid (template files + this instruction)

These templates are a **hybrid** of minimal template files plus the instruction below on how
to lay them out and parameterize them. The files show the convention concretely; this README
records how to substitute placeholders and what the pattern must (and must not) contain.

### How bootstrap parameterizes the template

The template ships with a generic placeholder name. When scaffolding into a target project,
substitute the placeholder consistently:

- The example directory segment `example/` → a generic placeholder name. Keep it generic
  (`example/`, `sample/`) — **do not** rename it to a domain concept. The pattern's job is to
  demonstrate layout and conventions, not to seed a real module.
- The exported symbol(s) stay generic utilities. Do not swap in business logic.
- File contents are copied verbatim except the placeholder substitution; comments are kept,
  because their job is to teach the convention to whoever reads the scaffolded repo.

After substitution the scaffolded module must still compile and its test must pass — it is part
of the done-criterion gates (the reference test passes).

## Criterion: convention, not feature

The pattern demonstrates **how any module is built in this project** — directory layout, file
naming (kebab-case), the export form (named, not default), explicit public-API types, and where
the test lives. It carries **no project meaning**: you can delete the whole `example/` module
(and its test) without losing anything the project is *about*.

**Anti-example.** Do **not** ship a domain module (`src/users/`, `src/audit/`, anything with
auth / business rules). That answers "WHICH modules the project has" — feature-level structure,
which is arch-spec territory, not bootstrap's. bootstrap fixes only the project-level "HOW a
module is built". If a reviewer can name the *feature* a template implements, the template is
wrong.

## Test-location convention demonstrated

The TypeScript stack convention is **tests live in `tests/` mirroring `src/`** (see
`hi_flow/references/stacks/typescript.md` -> Testing: "test location"), not literally
co-located in the same directory as the source. The design spec (§7) says "co-located test"
loosely; the authoritative convention is the stack file, so the template follows the `tests/`
mirror form:

```
src/example/index.ts          →  tests/example/index.test.ts
```

The test filename uses the `<source>.test.ts` form. This mirror layout is itself one of the
conventions the pattern is teaching.
