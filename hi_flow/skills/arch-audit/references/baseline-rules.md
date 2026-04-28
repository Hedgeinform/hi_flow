# arch-audit Baseline Rule Set — Draft v3

**Date:** 2026-04-28
**Context:** черновик baseline rules для скилла `hi_flow:arch-audit` (TS/Node + dependency-cruiser стек). Производно от 17 принципов D9 library (`hi_flow/references/architectural-principles.md`).
**Status:** draft v3. После двух subagent validation pass'ов:
- v1→v2: 1 CRITICAL + 5 HIGH + 3 MEDIUM applied (rule overlap fix, hub-like-dependency, layer list expansion, NCCD conditional, etc.).
- v2→v3: severity scheme normalization (depcruise error/warn → HIGH/MEDIUM/LOW), schema_version + rule_id fields added.

---

## Структура baseline

14 правил в трёх слоях:

- **Слой A — depcruise built-ins** (3 правила): переиспользуем existing default rule set, навешиваем `principle:` ссылки.
- **Слой B — universal custom** (6 правил): работают на любом проекте без operator-declared контекста, через метрики и граф.
- **Слой C — conditional structural** (5 правил): применяются автоматически, если detected конкретные конвенциональные структуры (layered naming, feature folders).

Метрики (Ca/Ce/I/A/D/LOC/NCCD) считаются всегда, идут в `audit-report.json → metrics` как сырые числа для контекста.

**Out-of-scope built-ins:** `not-to-unresolvable`, `no-non-package-json`, `not-to-dev-dep`, `no-duplicate-dep-types`, `no-deprecated-core/npm` — это **dependency hygiene / build correctness**, не архитектура. Покрываются стандартным depcruise default config'ом и npm audit. Оператору рекомендуется через scope-reminder в audit-report.md (см. ниже).

---

## Severity normalization (важно)

depcruise native severities (`error`, `warn`, `info`) **не используются напрямую** в D8 schema findings. Adapter (typescript-depcruise) **normalize'ит** depcruise output в наш scheme:

- depcruise `error` → D8 `HIGH` (или `CRITICAL` если правило project-promote'нуто).
- depcruise `warn` → D8 `MEDIUM`.
- depcruise `info` → D8 `LOW`.

D8 schema findings всегда содержат severity ∈ {CRITICAL, HIGH, MEDIUM, LOW}. depcruise specifics инкапсулированы в adapter, не утекают наружу.

---

## Слой A — depcruise built-ins (3)

### `no-circular`
- **Principle:** `acyclic-dependencies`
- **Detection:** depcruise built-in, **сконфигурирован с `minCycleLength: 3`** (циклы длины 2 ловит `inappropriate-intimacy` в Слое B, чтобы избежать double-finding).
- **What:** циклы длины 3+ в графе зависимостей модулей.
- **Severity:** **HIGH** (depcruise error → normalized).

### `no-orphans`
- **Principle:** `dead-code-elimination`
- **Detection:** depcruise built-in.
- **What:** модули с нулевым in-degree, не являющиеся entry points.
- **Severity:** **MEDIUM** (depcruise warn → normalized).

### `not-to-test-from-prod`
- **Principle:** `no-test-prod-coupling`
- **Detection:** depcruise built-in.
- **What:** production-код импортирует тестовые файлы.
- **Severity:** **HIGH** (depcruise error → normalized).

---

## Слой B — universal custom (6)

### `god-object`
- **Principle:** `god-object-prohibition`
- **Detection:** custom — Ca > 10 AND Ce > 10 AND LOC > 300.
- **What:** модуль одновременно зависит от многих и от него зависят многие, и большой по размеру.
- **Severity:** HIGH.

### `dependency-hub`
- **Principle:** `hub-like-dependency`
- **Detection:** custom — Ca > max(20% от total project modules, 10), независимо от Ce.
- **What:** модуль с непропорционально высокой afferent coupling — концентратор blast radius при изменениях. Дополняет `god-object` (тот требует AND по Ce; hub-like ловит только Ca).
- **Severity:** HIGH.

### `inappropriate-intimacy`
- **Principle:** `acyclic-dependencies` (subcase — cycle length 2)
- **Detection:** custom — bidirectional dependency между двумя модулями (A↔B). Покрывает случай, исключённый из `no-circular` через `minCycleLength: 3`.
- **What:** взаимные импорты двух модулей — особый случай ADP.
- **Severity:** HIGH.

### `nccd-breach`
- **Principle:** `acyclic-dependencies` (aggregate)
- **Detection:** custom — applies **только если N модулей в проекте > 15** (на меньших NCCD статистически не информативен — false positives на маленьких проектах). Threshold default NCCD > 0.5, **tunable** через project rules.
- **What:** общая запутанность проекта превышает порог.
- **Severity:** HIGH.

### `high-fanout`
- **Principle:** `single-responsibility-module`
- **Detection:** custom — Ce > 15 для конкретного модуля.
- **What:** модуль использует слишком многих — намёк на разнородные ответственности внутри.
- **Severity:** MEDIUM.

### `cross-module-import-info`
- **Principle:** `module-boundary-awareness`
- **Detection:** custom — любой импорт через границу top-level директории под `src/`.
- **What:** информативный сигнал о cross-module dependency. Не ругает, напоминает оператору осознать.
- **Severity:** LOW.
- **Suppression:** **подавляется**, если на этом импорте сработало одно из более специфичных правил Слоя C (`layered-respect`, `port-adapter-direction`, `vertical-slice-respect`). Иначе оператор видит double/triple findings на одном импорте.

---

## Слой C — conditional structural (5)

Правила применяются автоматически, если в проекте обнаружены соответствующие условия. Если нет — skipped silently.

### `layered-respect`
- **Principle:** `layered-architecture-respect`
- **Detection:** custom — applies, если в `src/` найдено ≥2 директории из **расширенного closed list** имён слоёв:
  - **Domain/business:** `domain/`, `core/`, `business/`
  - **Infrastructure:** `infrastructure/`, `infra/`, `gateway/`, `gateways/`, `persistence/`, `repositories/`, `repos/`
  - **Application:** `application/`, `app/`, `services/`, `usecases/`
  - **Presentation:** `presentation/`, `ui/`, `interface/`, `api/`, `controllers/`, `web/`, `handlers/`
  - **Hexagonal:** `adapters/`, `ports/`
- Layer order: presentation → application → domain → infrastructure (стандарт). Hexagonal interpretation: ports == domain interfaces, adapters == infrastructure implementations.
- **Operator override:** project rules могут декларировать **alias map** (например, `mybiz/` — это domain layer). Это позволяет работать с custom naming conventions.
- **What:** запрет imports снизу вверх или через слой.
- **Severity:** MEDIUM.

### `domain-no-channel-sdk`
- **Principle:** `channel-agnosticism`
- **Detection:** custom — applies, если detected `domain/` (или `core/business/` после alias map). Запрет импорта известных channel SDK:
  - **Telegram:** `node-telegram-bot-api`, `telegraf`, `grammy`
  - **Discord:** `discord.js`, `eris`
  - **HTTP frameworks:** `express`, `fastify`, `koa`, `hapi`, `@hapi/hapi`, `@nestjs/core`
  - **Other messaging:** `@slack/bolt`, `@slack/web-api`, `whatsapp-web.js`, `@adiwajshing/baileys`, `viber-bot`, `@line/bot-sdk`, `twilio`
  - **Real-time / sockets:** `socket.io`, `ws`
  - **Email:** `nodemailer`
  - **Message buses:** `amqplib`, `kafkajs`, `@aws-sdk/client-sqs`, `mqtt`
- **Source maintenance:** список curated industry-standard, обновляется при empirical обнаружении новых channel-SDKs в audited проектах.
- **What:** бизнес-слой не должен знать о канале коммуникации.
- **Severity:** MEDIUM (operator can override до CRITICAL для проектов где channel-agnosticism foundational, как в Zhenka).

### `port-adapter-direction`
- **Principle:** `port-adapter-separation`
- **Detection:** custom — applies, если detected layered (см. layered-respect). Запрет `domain/` → `infrastructure/` импортов.
- **What:** домен взаимодействует с инфраструктурой только через ports (interfaces).
- **Severity:** MEDIUM.

### `architectural-layer-cycle`
- **Principle:** `layered-architecture-respect` (escalation)
- **Detection:** custom — applies, если detected layered AND обнаружен cycle между двумя слоями (например, `domain ↔ infrastructure`).
- **What:** взаимная зависимость слоёв — фундаментальное противоречие layered архитектуры.
- **Severity:** **CRITICAL**.

### `vertical-slice-respect`
- **Principle:** `vertical-slice-cohesion`
- **Detection:** custom — applies, если detected feature-folder structure: `src/tools/<feature>/`, `src/features/<name>/` или эквивалент с ≥2 sub-folders. Запрет cross-imports между sub-folders, кроме `shared/` или `common/`.
- **What:** features изолированы, общая логика только через shared subfolder.
- **Severity:** MEDIUM.

---

## Метрики в audit-report (computed always, не findings)

- **Per-module:**
  - Ca (afferent coupling) — incoming dependencies.
  - Ce (efferent coupling) — outgoing dependencies.
  - I (instability) = Ce / (Ca + Ce).
  - A (abstractness) — где computable (ratio абстрактных классов/interfaces).
  - D (distance from main sequence) = |A + I − 1|, где A computable. **Diagnostic-only**, не finding.
  - LOC.
- **Project-level:**
  - NCCD (Normalized Cumulative Component Dependency).
  - Severity counts по findings.
  - **N (total module count)** — используется как условие для `nccd-breach` triggering.
- **Dependency graph:** adjacency list для downstream consumers (arch-redesign, arch-spec).

---

## Suppression precedence

Правила с более специфичной семантикой подавляют общие informational findings на том же импорте. Это предотвращает double/triple findings на одном нарушении.

**Precedence chain (high → low):**
1. CRITICAL: `architectural-layer-cycle`
2. HIGH: `god-object`, `dependency-hub`, `inappropriate-intimacy`, `nccd-breach`
3. MEDIUM: `layered-respect`, `port-adapter-direction`, `vertical-slice-respect`, `domain-no-channel-sdk`, `high-fanout`
4. LOW (suppressed by higher): `cross-module-import-info`

**Suppression rule:** если на конкретном импорте срабатывает правило выше в chain, finding для `cross-module-import-info` на том же импорте подавляется.

---

## Severity distribution (после normalization)

- **CRITICAL:** 1 (architectural-layer-cycle, conditional).
- **HIGH:** 6 (no-circular, not-to-test-from-prod, god-object, dependency-hub, inappropriate-intimacy, nccd-breach).
- **MEDIUM:** 6 (no-orphans, high-fanout, layered-respect, domain-no-channel-sdk, port-adapter-direction, vertical-slice-respect).
- **LOW:** 1 (cross-module-import-info).

Все severity ∈ {CRITICAL, HIGH, MEDIUM, LOW} — D8 schema valid.

---

## Принципы D9, не покрытые baseline rule (с обоснованием)

| Принцип | Почему не в baseline |
|---|---|
| `interface-segregation` | Нужен AST + usage analysis на code-level (depcruise это не делает). Будущее расширение. |
| `dependency-inversion` | Покрывается косвенно через `layered-respect` + `port-adapter-direction`. Standalone rule требует semantic знания. |
| `stable-dependencies` | Без operator-declared «модуль X должен быть стабильным» нет threshold. Метрики Ca/Ce/I в audit-report для контекста. |
| `stable-abstractions` | Без operator-declared «X должен быть абстрактным» нет finding'а. Метрика A в audit-report. |
| `common-reuse` | Без declared boundaries даёт много noise. Skip для baseline. |
| `law-of-demeter` | Chain analysis на code-level требует AST. Module-level transitive analysis спорно полезен vs noise. |

---

## Override mechanism (для project rules)

Project rules могут:
- **Disable** baseline rule (с обязательным `comment` поле — обоснование).
- **Tune threshold** (например, повысить `god-object` порог для большого core модуля; повысить `nccd-breach` threshold до 0.7 для сложного domain).
- **Lower/raise severity** (например, поднять `domain-no-channel-sdk` до CRITICAL для своего проекта где channel-agnosticism foundational).
- **Add layer alias map** (например, `mybiz/` → domain) — расширяет detection для conditional rules.
- **Add custom rules**, ссылающиеся на любые принципы из D9 — включая принципы без baseline rule (например, custom правило с `principle: stable-dependencies` для модулей которые оператор объявил стабильными).

---

## Scope reminder в audit-report.md (для оператора)

В шапку audit-report.md (human-readable) добавляется секция:

> **Scope:** arch-audit покрывает архитектурные нарушения (граф зависимостей, метрики связности, boundaries, structural patterns). Для **гигиены кода** (build correctness, dependency declarations, deprecated packages) запусти параллельно стандартный `npx depcruise --validate` (полный default ruleset) и `npm audit`. Для **code-level качества** (style, common bugs) — eslint с typescript-eslint config. Эти проверки **дополняют** arch-audit, не подменяются им.

Это **scope clarification**, не часть baseline functionality. Tooling onboarding для новых проектов — отдельный механизм (см. OQ7 в `ARCHITECTURE.md`).

---

## Validation history

- **2026-04-28 — Subagent validation v1 pass (Opus, изолированный контекст) для baseline coverage.** Проверена полнота покрытия 16 D9 принципов 13 baseline правилами. Найдены и применены:
  - **CRITICAL D.1** — overlap `no-circular` ⇄ `inappropriate-intimacy` на 2-циклах. **Fixed:** `no-circular` сконфигурирован с `minCycleLength: 3`, `inappropriate-intimacy` owns 2-циклы.
  - **HIGH B.1** — пропущен принцип `hub-like-dependency`. **Fixed:** добавлен в D9 (17 принципов) + baseline rule `dependency-hub`.
  - **HIGH B.5/B.6** — пропущены trivial built-ins (`not-to-unresolvable`, `no-non-package-json`). **Decided not to fix:** это dependency hygiene, не архитектура. Отнесено к scope-reminder для соседних tools.
  - **HIGH D.2** — отсутствие suppression precedence. **Fixed:** добавлен раздел Suppression precedence.
  - **HIGH E.1** — layer name list неполный. **Fixed:** расширен с 8 до 17 имён + operator-overridable alias map.
  - **HIGH C** — `nccd-breach` magic threshold 0.5 на маленьких проектах = false positives. **Fixed:** conditional triggering (N > 15) + tunable threshold.
  - **MEDIUM E.2** — channel SDK list неполный. **Fixed:** расширен с 7 до 22 SDK.
  - **MEDIUM B.3** — пропущен `no-deep-internal-import`. **Decided not to fix в v1:** требует barrel/index discipline detection, добавим эмпирически если будет нужно.
  - **MEDIUM B.4** — пропущен `no-duplicate-dep-types`. **Decided not to fix:** dependency hygiene, scope-reminder.
  - **LOW** — SRP coverage, D-metric diagnostic, Conway's law — приняты как in-scope-by-design.
- **2026-04-28 — Subagent validation v2 pass (Opus, изолированный контекст) для Self-Review checklist.** Surface'нула severity scheme mismatch между D8 schema и Слой A baseline rules (depcruise error/warn vs schema CRITICAL/HIGH/MEDIUM/LOW). **Fixed in v3 (this draft):** adapter normalize'ит depcruise severities в D8 scheme; обновлены severity assignments всех Слой A правил; обновлена severity distribution.
- Также **fixed in v3:** D8 schema добавляет `metadata.schema_version` field + `finding.rule_id` field (cross-reference к baseline rule или project rule). Эти изменения требуют синхронизации с D8 schema document в arch-redesign references — будет cascade'нуто после approval этого draft'а.
- Полные отчёты subagent'ов — в conversation log этой design сессии.
