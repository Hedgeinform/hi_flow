# arch-audit Self-Review Checklist — Draft v2

**Date:** 2026-04-28 (v2 после subagent validation pass)
**Context:** черновик Self-Review checklist для скилла `hi_flow:arch-audit`. После генерации `audit-report.json` + `audit-report.md`, до предъявления оператору, скилл запускает Self-Review через изолированного субагента.

---

## Subagent invocation

**Передаётся субагенту:**
- Path к `audit-report.json`.
- Path к `audit-report.md`.
- Path к `D8 schema` как **отдельный .json файл** (`hi_flow/skills/arch-audit/references/d8-schema.json`) — для jsonschema validation, не markdown с inline schema.
- Path к D9 library (`hi_flow/references/architectural-principles.md`) — для validation principle ids.
- Path к baseline rules definitions — для validation rule references.
- **Project root path** — для validation file paths existence + freshness checks.
- **Conversation history НЕ передаётся** (canonical pattern).

**Subagent в начале своей работы explicit declares available tools:**

> Available tools: ajv-cli (yes/no), mmdc/mermaid-cli (yes/no), jq (yes/no), git (yes/no).
> Affected checks при отсутствии: [list].

Это ловит «failed-due-to-no-tool» vs «failed-because-bad-output» в reports.

**Required tools для checklist'а:**
- `jq` — для JSON queries / metric recompute. Critical, fail если absent.
- `ajv-cli` (или `python -m jsonschema`) — для D8 schema validation. Fallback — manual structural check.
- `mmdc` — для Mermaid syntax validation. Fallback — visual scan, fallible.
- `git` — для freshness check. Fallback — skip freshness.

---

## Checklist (7 групп)

### Группа 1 — D8 schema compliance

- `audit-report.json` валиден против D8 schema (через ajv-cli если доступен; fallback — manual structural check).
- `metadata.audit_sha` присутствует и непустой.
- `metadata.schema_version` присутствует (например, "1.0").
- Каждое finding содержит required поля: `id`, `type`, `severity`, `source`, `target`, `reason.principle`.
- Каждое finding имеет `rule_id` (cross-reference к baseline rules или project rules).
- `type` в enum {boundary, cycle, sdp, coupling, nccd}.
- `severity` в enum {CRITICAL, HIGH, MEDIUM, LOW} — **без** `error`/`warn` (depcruise severities normalize'ятся adapter'ом в наш scheme; см. baseline draft).
- `source.module` и `target.module` присутствуют и непустые.
- Cycle findings (`type: cycle`) имеют `extras.members` — array module ids участвующих в цикле.
- Boundary findings (`type: boundary`) имеют `extras.type_only` boolean (если применимо).
- Каждый `reason.principle` ссылается на existing canonical id в D9 library (cross-check файла).
- Каждый `rule_id` ссылается на baseline rule или project rule (cross-check baseline rules файла + project rules файла).
- `metrics.dep_graph` присутствует и непустой.

### Группа 2 — Внутренняя консистентность

**Finding ↔ dep_graph cross-checks (критично):**
- Каждое finding'а `source.module` присутствует как ключ в `metrics.dep_graph`.
- Каждое finding'а `target.module` присутствует в dep_graph (либо как ключ, либо как value в каком-то списке).
- Если finding type=`boundary` с source=A, target=B — `dep_graph[A]` должен содержать `B`. Иначе finding выдуман.
- Если finding type=`cycle` с `extras.members` [A, B, C] — для каждой пары последовательных в cycle должен существовать соответствующий edge в dep_graph (A→B, B→C, C→A).

**Метрики ↔ dep_graph (deterministic recompute):**
- `metrics.per_module[X].Ce` для каждого X равно `len(metrics.dep_graph[X])`.
- `metrics.per_module[X].Ca` для каждого X равно числу модулей Y таких что X ∈ `metrics.dep_graph[Y]`.
- `metrics.per_module[X].I` равно `Ce / (Ca + Ce)` (округление до 0.001).

**Severity counts:**
- `metrics.severity_counts` соответствует actual count findings по severity (deterministic recount).
- `total findings = sum(severity_counts.values())`.

**Modules consistency:**
- Modules в `metrics.per_module` — set совпадает с modules в `metrics.dep_graph` (никто не пропущен, нет лишних).

**NCCD bidirectional check:**
- Если `metrics.nccd > nccd_threshold` → должно быть finding `nccd-breach` в findings array.
- Если есть finding `nccd-breach` → `metrics.nccd > nccd_threshold` должно выполняться.
- Если `metrics.nccd_threshold` отсутствует → используется default из baseline (1.0).

**Suppression precedence (с алгоритмом):**

Для каждого finding F с rule = `cross-module-import-info` (LOW):
- Construct matching key: `(F.source.module, F.target.module)`.
- Iterate findings array, ищем другое finding F' с тем же matching key И rule ∈ {`layered-respect`, `port-adapter-direction`, `vertical-slice-respect`, `domain-no-channel-sdk`}.
- Если найден F' — F должен быть suppressed (отсутствовать в final findings array).
- Если F присутствует, а F' тоже есть → suppression precedence не применён → flag.

### Группа 3 — Markdown report quality

- Mermaid syntax валидный (через mmdc если доступен; fallback — visual scan).
- Все Mermaid `linkStyle` indices — within bounds (< total edges count в diagram).
- **Каждый помеченный linkStyle index** указывает на edge, семантически соответствующий помеченному классу:
  - Indices с `stroke:#d32f2f,stroke-width:3px` (red solid) — edges из cycles (cross-check pairwise + transitive в dep_graph).
  - Indices с `stroke-dasharray` (red dashed) — edges соответствующих CRITICAL findings.
  - Indices с `stroke:#f57c00` (orange) — edges соответствующих HIGH/MEDIUM boundary findings.
- Цвета/стили — exact match конвенции:
  - **Цикл-edges:** `stroke:#d32f2f,stroke-width:3px` (red solid).
  - **CRITICAL violations:** `stroke:#d32f2f,stroke-width:3px,stroke-dasharray:6 4`.
  - **HIGH/MEDIUM boundary:** `stroke:#f57c00,stroke-width:2-2.5px`.
  - **Default:** `stroke:#bdbdbd,stroke-width:1px,opacity:0.5`.
  - **Hub modules class:** `fill:#fce5f3,stroke:#c2185b`.
- Foundation diagram присутствует если есть hidden utility modules (Ca > 5 AND Ce ≤ 3 AND no findings).
- Layered diagram **либо** присутствует если detected layered architecture (≥2 директории из layer naming list), **либо** явно объявлен «not detected» абзацем (negative case явно обработан, не молчаливый skip).
- Cap respected: если N modules > 25 → overall project diagram skipped (вместо неё — textual summary), per-cluster diagrams показаны.
- **Edges на main diagram ⊆ edges в dep_graph** (если в diagram есть edge, которого нет в JSON — markdown лжёт).
- **Module nodes на main diagram ⊆ modules в metrics.per_module** (нет invented модулей).

### Группа 4 — Coverage (forward + reverse)

**Forward — каждое finding в JSON отражено в markdown:**
- Matching key для cross-check: finding `id`. Каждый id из JSON должен встречаться в markdown (либо в severity-grouped section, либо в cluster suggestions, либо в обоих).
- **Suppressed-aware:** finding с rule = `cross-module-import-info`, который suppressed (см. Group 2 suppression algorithm), может отсутствовать в markdown без flag — это намеренный gap.
- Cluster suggestions не пропускают findings — каждое finding попадает хотя бы в один cluster или explicitly помечен как «standalone» (isolated finding, не группируется).
- Если есть hub-like findings → они упомянуты в cluster suggestions (даже если cluster size = 1, отдельным).

**Reverse — markdown не ссылается на несуществующие finding ids:**
- Каждый finding id, упомянутый в markdown (в severity sections, cluster suggestions) → существует в JSON `findings` array.

**Cluster suggestions structure:**
- Каждый cluster имеет: name, root cause, included findings list, **recommended fix from D9** (must be one of `fix_alternatives` for the cluster's referenced principle — cross-check D9), size assessment.

### Группа 5 — Format compliance

- Шапка содержит: Date, Audit SHA, Stack (с adapter version, формат `<adapter-name> (<version>)`), Project info (включая total modules count).
- `metadata.audit_tooling_version` присутствует.
- Scope reminder section присутствует (рекомендация по соседним tools — eslint, npm audit).
- Severity roll-up table с counts.
- Module Metrics table — все модули из `metrics.per_module`, все метрики (Ca/Ce/I/A/D/LOC если computed; явно `—` если не computed).
- Findings секция grouped by severity (CRITICAL → HIGH → MEDIUM → LOW).
- Cluster suggestions section.
- Notes for operator секция — суммирует non-trivial decisions (override applied, suppression rules fired, threshold tuned). Если ничего non-trivial — explicit «None».
- Все обязательные поля в шапке непустые (например, `**Date:** ` без даты — fail).

### Группа 6 — Prohibited content

- **Никакой emoji.** Subagent выполняет: `grep -P '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]' audit-report.md` — пусто.
- Никаких placeholders (TBD / TODO / `<placeholder>`).
- Никаких размытых формулировок типа «возможно», «вероятно», «может быть», «потенциально», «иногда» в finding reasons (reason — детерминированная цитата из rule + principle).
- Никаких файловых path'ов с абсолютными usernames (`C:/Users/<name>/...`, `/home/<name>/...`).
- Никаких stack traces от adapter ошибок в reports.
- Никаких URL'ов наружу (`https://*` в reasons / cluster fix descriptions — недопустимо без explicit reason).
- **Sensitive paths не expose'нуты:** subagent проверяет, что в findings нет ссылок на `/.env`, `/secrets/`, `/credentials*`, `/.ssh/`, или иные patterns sensitive material.
- Никаких внутренних разработческих комментариев (`// FIXME`, `// HACK`, `// TODO: ` внутри report content).
- Никаких дубликатов content blocks (тот же Mermaid вставлен дважды).

### Группа 7 — JSON ↔ MD consistency (новая)

Кросс-проверки между структурными данными в JSON и человеко-читаемым markdown. Каждая через explicit matching key.

- **`metrics.severity_counts` ↔ severity roll-up table в markdown.** Числа должны биться 1-в-1 (CRITICAL count, HIGH count, etc.).
- **`findings` array ↔ markdown finding items.** Forward + reverse coverage (см. Group 4).
- **`metrics.dep_graph` ↔ edges в Mermaid diagrams.** Каждый edge в main diagram должен соответствовать edge в dep_graph (см. Group 3, последний пункт).
- **`metrics.per_module` ↔ Module Metrics table.** Все модули из JSON в таблице, все метрики (Ca/Ce/I) совпадают.
- **Cycle findings ↔ Mermaid cycle visualization.** Number cycles в отдельной diagram «Pairwise cycles» = number cycle findings в JSON.
- **Cluster suggestions ↔ findings.** Cluster A «N findings» должен включать те же N finding ids, что в JSON (matching через id).
- **`metrics.nccd` value ↔ NCCD finding text** (если есть). Если NCCD finding в JSON показывает 2.34, markdown тоже должен сказать 2.34.

---

## Apply fixes inline — categorized

Не все fixes safe для autoапply. Категоризация:

### Safe-to-autofix (subagent применяет inline без re-review):

- Typos в text content.
- Forматирование (выравнивание таблиц, добавление пустых строк, fix indentation).
- Add missing field в metadata (если default известен — например, `schema_version: "1.0"`).
- Append missing «None» в notes section если она пустая.
- Capitalize severity values если adapter эмитит lowercase.

### Human-required (subagent flag'ает, не fix'ит):

- **Structural changes** (added/removed sections, headings hierarchy) — могут cascade на TOC, ссылки.
- **Mermaid edges/nodes changes** — нумерация linkStyle сдвигается, ломает clean diagrams (cascading fix).
- **Severity changes** (HIGH → CRITICAL и т.п.) — semantic decision, нужен оператор.
- **Cluster regrouping** — может потребовать re-cluster других findings.
- **Schema/contract changes** — требуют coordination с downstream.
- **Suppression-related fixes** — могут unhide намеренно скрытые findings.

### Safety rule

Если safe-to-autofix fixes count > 5 ИЛИ есть human-required findings → subagent делает **lightweight verification pass** (повторно run только Group 2 — internal consistency) после fixes. Это ловит cascading effects от множественных safe fixes.

Это compromise между «inline fix and move on» (canonical) и «full re-review» (overkill для маленьких fix). Lightweight verification — middle ground.

---

## Когда Self-Review не запускается

- В **apply-patch mode** Self-Review не нужен — там нет генерируемого markdown, только validation report patch'а (детерминированный output, schema-checked).
- В будущих режимах (quick / targeted / incremental) — checklist может быть subset (например, без cluster suggestions если quick mode не их генерит).

---

## Reference output formate

Образец ожидаемого output см. `examples/zhenka-audit-report-mock.md`.

---

## Park'нутые refinements (TBD via empirical use)

Эти findings из subagent validation pass признаны valid, но требуют design decisions, которые лучше принимать после первых боевых прогонов:

- **#16 Reproducibility / deterministic finding ids.** Требуется решить scheme: hash(source+target+rule)? UUID v5? sequential? Решение в adapter implementation, не в checklist. Refine после первого прогона.
- **#17 Languages mixing policy.** Текущий output намеренно смешан (Russian для operator-facing prose, English для technical terms). Strict policy (one language) противоречит этому дизайну. Refine после operator usage feedback.
- **#21 Markdown size limit.** Magic threshold (N KB) без empirical baseline. Refine после первых audit'ов на real проектах разного размера.
- **#22 Mermaid дополнительные caps** (foundation cap, cluster cap). Magic numbers без validation. Refine эмпирически.
- **#11 Linкование principle ↔ finding type семантически.** Без semantic analyzer — невозможно. Out of scope для статического tooling.
- **Conditional cases — explicit negative handling.** Сейчас Layered diagram имеет «not detected» absent — добавлено. Foundation diagram — может потребовать аналогичного «no utility modules» статуса для пустого случая. Refine когда появится случай.

---

## Validation history

- **2026-04-28 — Subagent validation v1 pass (Opus, изолированный контекст).** Проверена полнота checklist'а на 6 группах. Найдены 8 CRITICAL + 7 HIGH + 8 MEDIUM. Apply'нуто 8 CRITICAL + selected HIGH + 4 MEDIUM. Park'нуто 4 MEDIUM + остальные HIGH/LOW. См. парковка above.
- Полный отчёт subagent'а — в conversation log этой design сессии.
