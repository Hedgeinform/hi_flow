# Behavior harness contract

The behavior harness is the executable gate for a feature's externally observable behavior. It is not synonymous with Cucumber.

## Required guarantees

Every hi_flow project that opts into behavior-gated implementation must provide:

1. **Canonical behavior contract** - `feature-spec.md` contains stable scenario IDs and expected externally observable behavior.
2. **Executable mapping** - every automated scenario maps from `scenario_id` to a test or harness case.
3. **Single runner command** - one project command runs the behavior gate, for example `npm run behavior:test`, `bun run behavior:test`, `pytest -m behavior`, or an equivalent stack-native command.
4. **CI gate** - the behavior runner is part of CI before merge or delivery. A broken automated scenario blocks completion.
5. **Visible non-automation** - scenarios that are `manual`, `blocked`, or `obsolete` are explicit debt, not silent omissions.

Hardness comes from the contract + executable mapping + CI gate. Cucumber is only one possible backend.

## Default backend policy

Default to a project-native harness:

- TypeScript / JavaScript: Vitest, Bun test, Playwright, or a small custom runner over the project's public API/handlers.
- Python: pytest with behavior markers or a small custom runner.
- Browser-heavy flows: Playwright.
- LLM-agent flows: a project harness that calls the agent entry point and validates deterministic outputs, state changes, or explicit eval criteria.

Recommend Cucumber/Gherkin only when its social and workflow benefits outweigh the extra parser/step-definition layer.

## When Cucumber is useful

Recommend Cucumber when:

- product, QA, engineering, or customer roles all need to read and discuss the same scenarios;
- scenarios are negotiated as text before code;
- the domain is business-process heavy: orders, payments, approvals, ERP/CRM workflows, status machines;
- the team is willing to maintain a shared step vocabulary;
- standard Gherkin is valuable outside hi_flow.

Do not recommend Cucumber by default for solo/agent-first projects where the scenarios are mostly consumed by agents and a native test runner already exists.

## Required scenario statuses

- `automated` - mapped to a runnable behavior test; must pass.
- `manual` - intentionally checked by a person; must say why automation is not worth it yet.
- `blocked` - not automatable until a named foundation/harness dependency exists.
- `obsolete` - superseded by a newer scenario; must point to the replacement or removal reason.

Changing product behavior means changing the Behavior Contract first or in the same PR. Silent drift is a failure.
