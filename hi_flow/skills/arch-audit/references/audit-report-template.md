# Audit Report — {{project_name}}

**Date:** {{audit_timestamp}}
**Audit SHA:** `{{audit_sha}}`
**Stack:** {{stack_adapter_name}} ({{adapter_version}})
**Project:** {{project_name}} (`{{module_root_path}}`, {{module_count}} modules)

---

## Scope

arch-audit покрывает архитектурные нарушения (граф зависимостей, метрики связности, boundaries, structural patterns). Для **гигиены кода** (build correctness, dependency declarations, deprecated packages) запусти параллельно стандартный `npx depcruise --validate` (полный default ruleset) и `npm audit`. Для **code-level качества** (style, common bugs) — eslint с typescript-eslint config. Эти проверки **дополняют** arch-audit, не подменяются им.

{{#if pending_patches_skipped}}
> **Warning:** {{pending_patches_skipped_count}} pending rules-patches не applied на этом запуске. Для актуальной картины — apply через `arch-audit apply-patch <path>` и перезапусти audit.
> Skipped patches: {{pending_patches_skipped_list}}
{{/if}}

---

## Severity roll-up

| Severity | Count | Rules triggered |
|---|---:|---|
| **CRITICAL** | {{severity_counts.CRITICAL}} | {{rules_critical}} |
| **HIGH** | {{severity_counts.HIGH}} | {{rules_high}} |
| **MEDIUM** | {{severity_counts.MEDIUM}} | {{rules_medium}} |
| **LOW** | {{severity_counts.LOW}} | {{rules_low}} |

**Total findings:** {{findings_total}} ({{findings_baseline_count}} baseline + {{findings_informational_count}} informational).
**Total modules:** {{module_count}}.
**Project NCCD:** {{nccd}} (default threshold 1.0{{#if nccd_threshold_overridden}}, project override {{nccd_threshold}}{{/if}}).

---

## Project Dependency Graph (focused view)

Высокоуровневая diagram **business-связей модулей**. Pure utility modules (Ca > 5 AND Ce ≤ 3 AND no findings) скрыты в Foundation diagram ниже — они используются почти всеми и создают visual noise без insight. Cycles — bold red solid; CRITICAL — bold red dashed; HIGH/MEDIUM boundary violations — orange; default edges — light gray opacity 0.5. Hub-like модули — pink fill.

{{#if module_count_over_25}}
> Module count exceeds 25 — overall diagram skipped. Per-cluster diagrams below.
{{else}}
```mermaid
{{project_dependency_graph_mermaid}}
```
{{/if}}

---

{{#if has_foundation_modules}}
## Foundation modules

Pure utility modules скрытые из focused view выше. Эти модули — низкого риска (used widely, no findings), показаны для полноты.

```mermaid
{{foundation_graph_mermaid}}
```

---
{{/if}}

{{#if layered_detected}}
## Layered architecture view

Detected layered structure: {{layered_layers_detected}}. Diagram показывает потоки между слоями; нарушения direction'а helped'ятся.

```mermaid
{{layered_graph_mermaid}}
```

---
{{else}}
## Layered architecture

Layered structure не detected — closed list имён слоёв (domain/core/business/services/api/web/ui/...) не совпал с module naming проекта. Соответствующие conditional rules (`layered-respect`, `port-adapter-direction`, `architectural-layer-cycle`) не применялись.

---
{{/if}}

## Module metrics

| Module | Ca | Ce | I | A | D | LOC |
|---|---:|---:|---:|---:|---:|---:|
{{#each metrics.per_module}}
| `{{@key}}` | {{Ca}} | {{Ce}} | {{I}} | {{A}} | {{D}} | {{LOC}} |
{{/each}}

---

## Findings

{{#each severity_groups}}
### {{severity}} ({{count}})

{{#each findings}}
#### {{rule_id}} — {{source.module}} → {{target.module}}

**Severity:** {{severity}}
**Reason:** {{reason.principle}} — {{reason.explanation}}
**Files:** `{{source.file}}` → `{{target.file}}`
{{#if extras}}
**Details:** {{extras}}
{{/if}}

{{/each}}

{{/each}}

---

## Cluster suggestions

Auto-grouped findings по `reason.principle` + module overlap. Каждый кластер — кандидат на single refactor session в arch-redesign.

{{#each clusters}}
### Cluster {{index}}: {{cluster_name}}

**Root cause:** {{root_cause_prose}}
**Findings ({{findings_count}}):** {{findings_ids}}
**Affected modules:** {{affected_modules}}
**Suggested fix alternatives** (from D9 library): {{fix_alternatives}}

{{#if cluster_mini_graph}}
```mermaid
{{cluster_mini_graph_mermaid}}
```
{{/if}}

{{/each}}

---

## Notes for operator

{{#each operator_notes}}
- {{note}}
{{/each}}

{{#if no_operator_notes}}
_No notes — audit ran with all defaults, no overrides applied, no suppressions fired beyond standard precedence._
{{/if}}
