# hi_flow

hi_flow is a Codex/agent skill family for feature-and-above solo+AI development.
It turns product intent into signed specs, architecture decisions, behavior
contracts, implementation plans, foundation wiring, and deployment rails.

## Routing

Use hi_flow when the work is a feature, product slice, architecture change, new
project foundation, behavior contract, or delivery setup.

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
  -> feature-spec (Behavior Contract)
  -> arch-spec (architecture gate or full arch-spec)
  -> implementation-plan (behavior-first, Superpowers-compatible)
  -> execution workflow
```

`bootstrap` may run before the first implementation, or later when a feature
forces a missing infrastructure axis. `ops` runs after the product works locally
and must be shipped to a non-local target.

## Skills

- `hi_flow:product-spec` - product decomposition and backlog.
- `hi_flow:feature-spec` - feature-level product spec plus Behavior Contract.
- `hi_flow:arch-audit` - architecture snapshot and rule validation.
- `hi_flow:arch-redesign` - corrective refactor campaign planning.
- `hi_flow:arch-spec` - architecture gate and per-feature architecture design.
- `hi_flow:implementation-plan` - behavior-first implementation plan compatible
  with Superpowers execution skills.
- `hi_flow:bootstrap` - project foundation: stack, scaffold, audit, CI/gates,
  and optional behavior-gate rails.
- `hi_flow:ops` - last-mile delivery profile, CD, deploy scaffold, and staging
  verification.

## Behavior Harness

hi_flow does not require Cucumber by default.

The required guarantee is:

1. A canonical Behavior Contract in the feature spec.
2. Executable mapping from scenario IDs to checks.
3. One behavior runner command, such as `npm run behavior:test` or a
   stack-native equivalent.
4. A CI gate that fails when automated behavior scenarios fail.

Cucumber/Gherkin is useful when cross-role, business-readable executable
scenarios are more valuable than the extra parser and step-definition layer.
For solo/agent-first projects, the default is a project-native harness.

## References

- `hi_flow/references/workflow-routing.md`
- `hi_flow/references/behavior-harness.md`
- `hi_flow/references/coverage-manifest.md`
