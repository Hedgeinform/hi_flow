# hi_flow

hi_flow is a Codex/agent skill family for feature-and-above solo+AI development.
It turns product intent into signed specs, architecture decisions, behavior
registry changes, implementation plans, foundation wiring, and deployment rails.

## Routing

Use hi_flow when the work is a feature, product slice, architecture change, new
project foundation, behavior registry change, or delivery setup.

Use a generic implementation workflow directly for small local bugfixes and
isolated code changes. For implementation, hi_flow recommends Superpowers as the
execution layer, especially `superpowers:subagent-driven-development`,
`superpowers:test-driven-development`, and
`superpowers:verification-before-completion`.

Inside the hi_flow chain, do not route signed hi_flow specs directly to
`superpowers:writing-plans`. Use `hi_flow:implementation-plan`; it produces a
Superpowers-compatible plan.

## Main Chain

```text
product-spec
  -> feature-spec (Behavior Registry Changes)
  -> arch-spec (architecture gate or full arch-spec)
  -> implementation-plan (behavior-first, Superpowers-compatible)
  -> execution workflow
```

`bootstrap` may run before the first implementation, or later when a feature
forces a missing infrastructure axis. `ops` runs after the product works locally
and must be shipped to a non-local target.

## Skills

- `hi_flow:product-spec` - product decomposition and backlog.
- `hi_flow:feature-spec` - feature-level product spec plus Behavior Registry Changes.
- `hi_flow:arch-audit` - architecture snapshot and rule validation.
- `hi_flow:arch-redesign` - corrective refactor campaign planning.
- `hi_flow:arch-spec` - architecture gate and per-feature architecture design.
- `hi_flow:implementation-plan` - behavior-first implementation plan compatible
  with Superpowers execution skills.
- `hi_flow:bootstrap` - project foundation: stack, scaffold, audit, CI/gates,
  and optional behavior-registry / behavior-gate rails.
- `hi_flow:ops` - last-mile delivery profile, CD, deploy scaffold, and staging
  verification.

## Packaging

hi_flow is packaged for Claude Code, Codex, and Cursor.

- Claude Code metadata lives in `.claude-plugin/` files.
- Codex metadata lives in `hi_flow/.codex-plugin/plugin.json`.
- Cursor metadata lives in `hi_flow/.cursor-plugin/plugin.json`.
- The Codex marketplace entry lives in `.agents/plugins/marketplace.json`
  and points at `./hi_flow`.

The packaging layers share the same `hi_flow/skills/` source. Do not fork
skill contents per host unless a host-specific runtime constraint makes it
unavoidable.

Cursor packaging currently declares the shared skills directory only. It does
not declare hooks; add Cursor hooks only after a verified smoke test proves the
runtime needs a session-start bootstrap.

For Codex, add this repository as the `hi_flow-marketplace` marketplace, then
install `hi_flow` from `hi_flow-marketplace`. During local development, use the
same marketplace entry from the working checkout. Start a new Codex thread after
installing or reinstalling so the updated skills are picked up.

## Behavior Harness

hi_flow does not require Cucumber by default.

The required guarantee is:

1. A canonical Behavior Registry as the living source of current behavior.
2. Signed feature specs propose Behavior Registry Changes and preserve history.
3. Executable mapping from scenario IDs to checks.
4. One behavior runner command, such as `npm run behavior:test` or a
   stack-native equivalent.
5. A CI gate that fails when automated behavior scenarios fail.

Cucumber/Gherkin is useful when cross-role, business-readable executable
scenarios are more valuable than the extra parser and step-definition layer.
For solo/agent-first projects, the default is a project-native harness.

## References

- `hi_flow/references/workflow-routing.md`
- `hi_flow/references/behavior-registry.md`
- `hi_flow/references/behavior-harness.md`
- `hi_flow/skills/bootstrap/references/coverage-manifest.md`
