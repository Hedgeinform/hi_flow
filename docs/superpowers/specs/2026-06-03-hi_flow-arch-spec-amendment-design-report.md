# Implementation Report: arch-spec amendment (B + C + D + E)

**Spec:** `docs/superpowers/specs/2026-06-03-hi_flow-arch-spec-amendment-design.md`
**Date:** 2026-06-03
**Status:** completed

## What was done

- **B (§10 split)** — `SKILL.md` item-10 → §10.1 code-sight forks (→ writing-plans) / §10.2 deployment-bound bindings (рекоменд. дефолт + констрейнт + «unblocks when the deployment model is fixed», НЕ writing-plans); separation test + post-bootstrap boundary note (D20/P8); «Sorting feature-spec deferred items» расщеплён на три (code-sight→§10.1 / deployment-bound→§10.2 / else→§3); «Reading feature-spec statuses» RESOLVED-direction → §10.1; Escalation→Foreseen уточнён; blanket reference rule соблюдён (block-map `D = §7,8,10` не тронут). `arch-spec-template.md` §10 → §10.1+§10.2 с обоими паттернами + separation-test filling-note.
- **C (green-field signal)** — `SKILL.md` новый абзац-note под таблицей «Three situations by audit»: «инфра-ось не зафиксирована → запусти bootstrap; arch-spec стек не фиксирует и таксономию не дублирует (P8/D20, axis-taxonomy path)». + строка в Common Rationalizations.
- **D (composition-root-aware rules-patch)** — `SKILL.md` generation rule: type-1 «только X→Y» кладёт composition-root-пути в отдельный ортогональный `from.pathNot` (baseline-константа, не вплавляется в lookahead). `rules-patch-template.yaml` пример `no-feature-code-to-audit-emitter` — сохранён `from.path` lookahead + добавлен `from.pathNot: ^src/(main\.ts|bootstrap/|composition/)` + комментарии.
- **E (security tag + D14 boundary)** — `SKILL.md` конвенция тега; канонический литерал `[trust-chain review required — not diff-local]` (em-dash, byte-identical в SKILL.md + template + checklist); `arch-spec-template.md` §8 инлайн-суффикс + filling-note; `self-review-checklist.md` три новых чека (B/D/E). ARCHITECTURE.md D14 += boundary-clause (closes OQ12).
- **Closure** — ARCHITECTURE.md: D24, D14-clause, OQ12 removed, Module Map note, History (2026-06-03). active-issues HIGH обновлён.

## Implementation method

Subagent-driven (P5), by-file split (SKILL.md / три references) для conflict-safety при параллельных правках. После — изолированный субагент-ревью (spec-compliance + canonical-string + §2 guard + coherence + clarity) → **PASS** (без issues, без autofix). Осознанный P4-override (impl в design-сессии; rationale: overhead передачи в отдельную сессию > выигрыш изоляции для полностью прописанного markdown-amendment'а).

## Deviations from spec

None. Все правки применены как специфицированы. Развилки spec self-review (F1–F4) запинены в спеке ДО impl (canonical tag literal, from.pathNot encoding, §10-blanket-rule, green-field placement), поэтому холодные субагенты не имели открытых развилок.

## Issues discovered

None в ходе impl. Изолированный ревью — PASS по всем измерениям. Канонический тег верифицирован byte-identical (em-dash U+2014) во всех четырёх вхождениях. §2-механизмы (extract-before-probing, density-factor, green-field block-C skip, ACL anti-trigger, two-level triage, isolated self-review, backlog idempotency, sync-in-txn) не тронуты.

## Open items

- **Release (D16)** — bump версии `hi_flow/.claude-plugin/plugin.json` + корневой `.claude-plugin/marketplace.json` синхронно → commit → push → fetch+ff в marketplace cache. Pending operator greenlight (commit — по команде оператора).
