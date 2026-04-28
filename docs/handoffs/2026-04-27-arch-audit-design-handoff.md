# Handoff: design `hi_flow:arch-audit`

**Date:** 2026-04-27
**Source session:** дизайн `hi_flow:arch-redesign` (2026-04-27)
**Audience:** будущая сессия дизайна `hi_flow:arch-audit`.

**Назначение документа:** дать достаточный контекст следующей сессии, чтобы она стартовала с осмысленного места без перечитывания всей предыдущей сессии.

---

## 1. Контекст и место в семействе

`arch-audit` — Phase 2 analytical скилл семейства hi_flow. Upstream-зависимость для двух потребителей:
- `arch-redesign` (corrective, BUILT в этой сессии).
- `arch-spec` (prophylactic, design в следующей сессии после arch-audit).

См. ARCHITECTURE.md проекта: D7 (family split), D8 (reason-field contract), D9 (shared library принципов).

---

## 2. Что предсказуемо сложно (внимание)

**arch-audit — самый интеграционно-тяжёлый скилл семейства.** Он работает с детерминированными инструментами (dependency-cruiser, ArchUnit, import-linter, и т.п.) для производства structured findings + computes architectural metrics (Ca/Ce/I/NCCD).

Это не просто markdown design — это **infrastructure-touching skill**.

**Зоны сложности:**

1. **Stack-specificity.** Разные tooling ecosystems по языкам (TS/JS → depcruise, Java → ArchUnit, Python → import-linter, etc.). Скилл должен либо быть language-agnostic с per-stack adapters, либо стартовать с одного стека.
2. **Metric computation.** Ca/Ce/I/NCCD считаются поверх dep-graph. Большинство тулзов это умеют, но их output форматы отличаются — нужна нормализация в D8 schema.
3. **Library curation (D9).** Дизайн формата каталога принципов + сборка начального набора. ~20-30 принципов из SOLID + Мартин's package principles + hexagonal + vertical slices.
4. **Mapping rules → principles.** Как конкретное нарушение в depcruise rule связывается с principle id в D9 библиотеке. Конфиг-файл? Convention?
5. **Tooling configuration management.** Где живут rules файлы (`dependency_rules.yaml` в Zhenka), кто их редактирует, как arch-audit с ними взаимодействует.

---

## 3. Упрощения для старта

Чтобы не утонуть в сложности — **рекомендуемые конкретные сужения** для первой версии arch-audit:

1. **Стартуй с одного стека.** TypeScript + dependency-cruiser (это твой Zhenka). Generalize по другим стекам — отдельно, по эмпирической потребности.
2. **Не реализуй computation сам.** Существующие тулзы (depcruise, NDepend, ArchUnit) уже считают всё нужное. arch-audit — это **adapter + interpretation layer** над их output'ом.
3. **Library стартует малой.** 10-15 принципов из общеизвестного канона. Не пытайся сразу покрыть всё. Расширяется по мере появления новых видов нарушений в реальных проектах.
4. **Mapping rules → principles — operator-curated.** Конфиг (yaml или подобное), оператор явно сопоставляет каждое правило с principle id. Не auto-derive по semantic similarity (галлюциногенно).
5. **Severity-rules — operator-curated тоже.** Какие нарушения CRITICAL / HIGH / MEDIUM / LOW — оператор задаёт. Не try to infer.

Эти упрощения снижают первую версию arch-audit до:
- Запустить depcruise на проекте.
- Прочитать его output.
- Применить rules → principles mapping.
- Применить severity rules.
- Произвести D8-compliant `audit-report.json` + `audit-report.md`.

Это **gigantically simpler**, чем пытаться сделать language-agnostic фундаментальный аудитор. Расширения — по эмпирической потребности.

---

## 4. Что уже зафиксировано (не переоткрываем)

### D8 — semantic reason-field contract

Каждое finding обязано иметь `reason.principle` ссылку на principle id в D9 библиотеке. Без этого arch-redesign clustering галлюциногенный.

**Provisional schema draft** уже написан: `hi_flow/skills/arch-redesign/references/d8-schema.md`. Это starting point. Может быть extended в arch-audit design сессии (новые поля), но не основные структуры.

### D9 — shared library of architectural principles

Библиотека — **референс-артефакт, не скилл**. Owner — arch-audit (создаёт + управляет). Reader'ы — arch-redesign и arch-spec.

**Industry-imported curation.** Не original methodology. Импортируем из:
- SOLID (Robert C. Martin, классы).
- Package principles (Robert C. Martin, модули): REP, CCP, CRP, ADP, SDP, SAP.
- Hexagonal / Ports-Adapters (Cockburn, Vernon).
- Vertical Slice Architecture.
- Common module-graph rules (no cycles, layered architecture).

**Стартовый набор:** 10-15 принципов. Каждая запись — имя + краткая формулировка + 2-3 типичных альтернативы фиксов (для arch-redesign cluster-mode шаг 1) + ссылки на источники.

**Физическое место:** `hi_flow/references/architectural-principles.md` (shared family resource по Module Map). Конкретный формат записи — design в этой сессии.

### Контракт с arch-redesign

arch-redesign читает из arch-audit output:
- Per-finding (id, type, severity, source, target, reason, type-specific extras).
- Project-level метрики (Ca/Ce/I per module, NCCD, severity counts, dep-graph).
- Метаданные (audit_sha — обязательно для freshness check, audit_timestamp + tooling_version — опционально).

См. `hi_flow/skills/arch-redesign/references/d8-schema.md` для полного описания.

### OQ6 — decoupling для market-ready

В текущей среде Known Drift и активные fitness functions проекта живут в `ARCHITECTURE.md` (через скилл `architecture`). Для market-ready — конфигурируемые пути. Не блокирует первую версию arch-audit, но **не зашивай hardcoded paths** на скилл `architecture` в SKILL.md.

---

## 5. Что arch-audit потребляет на вход

- **Existing rules file проекта** (например, `docs/project/dependency_rules.yaml` в Zhenka). Описывает активные fitness functions проекта — какие правила проверять.
- **Existing Known Drift** (из `ARCHITECTURE.md` или эквивалент по OQ6). Список принятых архитектурных долгов — не флагать как новые findings.
- **Existing principles library** (D9). Source каноничных principle id для reason-полей.
- **Project's source tree** (для запуска depcruise / equivalent).

---

## 6. Открытые вопросы для design сессии

### Структура output контракта

- Хватает ли provisional D8 schema, или нужны дополнительные поля? (E.g., `audit_confidence` per finding? `suggested_fix_alternatives`?)
- Формат `dep_graph` — adjacency list, or richer (с весами, type-only флагами)?

### Library формат и стартовый набор

- Формат записи в `architectural-principles.md` — какие поля обязательны, какие опциональны?
- Стартовый список 10-15 принципов — какие именно. Кандидаты обозначены выше (раздел D9).
- Как именовать principle id — kebab-case (`channel-agnosticism`)? snake_case (`channel_agnosticism`)? Free-form имена («No Channel Coupling»)?

### Mapping rules → principles

- В каком виде живёт mapping (yaml? json? markdown table?). Где он живёт (в `<project>/audit-config/`? рядом с rules-файлом?).
- Format в виде «каждое правило ссылается на principle id» или «каждое нарушение получает reason явно при run'е»?

### Workflow скилла

- Один режим («запусти audit») или несколько (full audit / quick audit / targeted на subset модулей)?
- Self-Review + User Review Gate — нужны ли? Output аудита более structured / детерминированный, чем дизайн-артефакты redesign'а — может, гейт избыточен.
- Как обрабатывать unmapped findings (правила, которых нет в mapping → principle)?

### Stack scope

- Confirm: первая версия покрывает только TS/depcruise.
- Архитектурный задел на multi-stack — нужен ли уже сейчас в SKILL.md (e.g., adapter pattern в дизайне), или вообще не закладываем до момента второго стека?

---

## 7. Что НЕ парковать

- Inter-skill контракт (D8 + D9) — если arch-audit design выявит реальные push-back'и на provisional schema, **переоткрываем** `2026-04-27-hi_flow-arch-redesign-design.md` и правим контракт. Не молча отклоняйся.
- Critical findings первого боевого прогона на Zhenka — фиксим сразу, не откладывая.

---

## 8. Что переиспользуется из arch-redesign design сессии

В новых сессиях не нужно переоткрывать:

- **Family split** (D7) — arch-audit точно отдельный скилл, upstream обоих consumer'ов.
- **Cell-based hierarchical fork format** — если arch-audit использует развилки, формат тот же.
- **Self-Review + User Review Gate pattern** — canonical Anthropic pattern, всегда применять (но проверь, нужен ли в audit'е — он более детерминированный).
- **Plain language principle** — output для оператора-продуктолога.
- **Anti-patterns checklist** (`docs/handoffs/2026-04-27-skill-design-anti-patterns.md`) — все 12 пунктов применять.

---

## 9. Метод design сессии (что сработало хорошо)

- **Brainstorming skill для design'а.** С research-субагентами на ключевые вопросы (existing tooling scan, market gap analysis), real example во время design для stress-test (audit-report Zhenka — есть готовый).
- **Spec self-review через изолированного субагента** перед finalization — обязательно.
- **Russian draft → operator review → English final** для SKILL.md (если operator работает в Russian).
- **Anti-patterns checklist** проверять рано (после 2-3 секций), не только в конце.

---

## 10. План на следующие сессии (revised)

1. **Сессия N (next):** design `hi_flow:arch-audit` (используя этот handoff + design spec arch-redesign + ARCHITECTURE.md).
2. **Сессия N+1:** design `hi_flow:arch-spec` (после arch-audit готов, потому что наследует graph machinery).
3. **Сессия N+2:** боевой прогон полного цикла на Zhenka.
4. **Сессия N+3 (low priority):** design `hi_flow:product-spec`.

---

**Свежей сессии:** прочитать этот hand-off + design spec arch-redesign + d8-schema draft + ARCHITECTURE.md. Этого достаточно, чтобы начать.
