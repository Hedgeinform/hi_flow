# Handoff: hi_flow L3 hygiene layer design + active implementation issues

**Date:** 2026-04-29
**Source session:** scope expansion fixation (2026-04-29) — D10 amendment, D14, OQ6 reframe.
**Audience:** будущая сессия дизайна L3 hygiene layer + любая сессия, готовая закрывать active issues из `docs/active-issues.md`.

**Назначение документа:** дать достаточный контекст следующей сессии, чтобы она стартовала с осмысленного места без перечитывания всей предыдущей сессии.

> **UPDATE 2026-06-01 — scope L3 расщеплён, хуки отложены.** Решением 2026-06-01 (D10 amendment, bootstrap design) L3 разделён на **Ф3a** (relocation baselines + CI + `stacks/` внутрь плагина — лёгкое, pre-condition bootstrap) и **Ф3b** (хуки enforcement: PreToolUse git push + `--no-verify` block + arch-audit blocking — §3-§5 этого handoff'а). **Ф3b выведена в research-trigger**: качественно настроенного CI достаточно; к дизайну хуков вернуться, только если CI окажется недостаточен. Поэтому §3-§5 ниже (дизайн хуков) — **НЕ стартовать без явного сигнала «CI не хватает»**. Актуальная активная задача L3 = Ф3a relocation. См. `docs/superpowers/specs/2026-06-01-hi_flow-bootstrap-design.md` §14 + D10 в ARCHITECTURE.md.

---

## 1. Что произошло в source-сессии

Эмпирическое исследование (web research + reading superpowers SKILL.md + проверка состояния tools'ов в zhenka-bot и hi_flow/arch-audit) подтвердило operator-гипотезу: на рынке отсутствуют turnkey hygiene-enforcement plugin'ы для Claude Code, ориентированные на non-engineer аудиторию. Superpowers — это LLM-ревью + behavioral discipline, не deterministic tooling pipeline. У оператора во всех TS-проектах **физически отсутствуют** линтер, CI workflow и pre-commit hooks.

Из этого было принято стратегическое решение **расширить scope hi_flow** с прежнего «только design phases L0-L2» до «design L0-L2 + deterministic hygiene enforcement layer для L3». Implementation methodology (TDD, plan execution, code review, verification, debugging) **остаётся в superpowers** — hi_flow её не дублирует, дополняет инфраструктурой.

Зафиксированные в эту сессию решения:
- **D10 переписан** — новый scope с reviewability clause.
- **D14 добавлен** — complementary layers principle (superpowers = methodology, hi_flow = architectural + hygiene infrastructure).
- **OQ6** переведён в critical path + расширен на relocation stack-файлов внутрь плагина.
- **Active issues** созданы для двух конкретных имплементационных tasks внутри arch-audit.

См. `ARCHITECTURE.md` — D10, D14, OQ6, History 2026-04-29.

---

## 2. Что в этом hand-off, что вне его

**В scope:**
1. **Design session L3 hygiene layer** — крупная design-задача, отдельная сессия (см. §3-§5).
2. **Active issues по arch-audit** — две конкретные implementation tasks, могут идти параллельно дизайн-сессии (см. §6).

**Не в scope:**
- **OQ9 (feature-spec без боевого прогона)** — это **открытый вопрос**, не deferred work. Его решает оператор в свой подходящий момент (планирование open-source релиза). Не пытайтесь закрыть в L3 design session.
- **Рестайлинг zhenka-bot** под новый baseline. Это работа внутри zhenka-сессии, не hi_flow.
- **Open source vs commercial** — operational policy, не архитектура. За scope любой архитектурной сессии.

---

## 3. Design session L3 hygiene — границы и структура

### 3.1. Что считается успехом

Output design-сессии — `docs/superpowers/specs/2026-04-XX-hi_flow-l3-hygiene-design.md`. Спека должна определить:

1. **Точный набор хуков** (на какие events, что они проверяют, что блокируют, что не блокируют).
2. **Архитектура script'ов хуков** (где живут в плагине, как находят project root, как определяют TS-проект, как ведут себя в monorepo).
3. **Bypass policy** (имя env var, когда допустимо, как логируется, кто видит лог).
4. **Smart-cache механика** (что кэшируется, где хранится, как инвалидируется).
5. **arch-audit blocking mode** (как переключается, какие severities блокируют, как конфигурируется).
6. **Distribution mechanics** (как при установке hi_flow plugin'а в Claude Code хуки попадают в target-проект — manual setup-команда? auto-install?).
7. **Decoupling от operator-personal `architecture` skill** (часть OQ6 critical path — как hi_flow-скиллы работают без operator-personal artefактов; нужна ли заглушка / optional dependency / config-driven path resolution).
8. **Stack-files relocation** (как `typescript.md` + `typescript-baseline.md` переезжают внутрь hi_flow и при этом продолжают работать в operator-personal среде; что из себя представляет sync / overlay механизм).
9. **Cross-platform compatibility** (Windows / Mac / Linux; bash vs PowerShell; учитывая, что operator на Windows + Git Bash).
10. **Co-existence с superpowers** (как два набора skill'ов уживаются, нет ли конфликтов в triggering, что происходит когда оба пытаются что-то проверить).

### 3.2. Что предсказуемо сложно

**L3 hygiene — самая инфраструктурно-тяжёлая часть hi_flow.** Это не markdown-only skill, а реальные shell-скрипты, hooks-конфиг, distribution mechanics.

**Зоны сложности:**

1. **Hooks distribution через плагин.** Claude Code plugins могут шипить хуки (`.claude-plugin/plugin.json` декларирует), но как именно — нужно проверить актуальную документацию. Plugin может ставить хуки в `~/.claude/settings.json` оператора, или в `<project>/.claude/settings.json`. Разница принципиальная.
2. **Project-root detection.** Хук срабатывает на `git push` в текущей директории. Как находим корень проекта (или monorepo'а)? Какие маркеры? Что делаем если их нет?
3. **--no-verify blocking.** Технически реализуется через PreToolUse-hook, перехватывающий Bash вызовы и проверяющий аргументы. Стандартный паттерн см. npm-пакет `block-no-verify` (single-purpose реализация). Нужно встроить тот же подход внутрь plugin'а.
4. **arch-audit blocking mode.** Сейчас arch-audit advisory: производит report, не блокирует. Blocking mode — **новый exit-path** в runtime, плюс decision policy «какие severity блокируют push». Эта policy должна быть конфигурируемой проектом (не hard-coded в hi_flow).
5. **Decoupling от `architecture` скилла.** Сейчас `arch-redesign` cluster-mode читает Known Drift из ARCHITECTURE.md проекта через скилл `architecture`. Если плагин шипится без скилла `architecture` (он operator-personal), нужен fallback: stub? optional? config-path? Operator override механизм.
6. **Stack-files relocation, не разрушая operator-personal среду.** Текущие `typescript.md` + `typescript-baseline.md` — **только что написаны** и работают. Перемещение их внутрь плагина не должно ломать operator-personal загрузку (через скилл `architecture`). Возможные паттерны: symlink, plugin shipping + `architecture` skill loads from plugin if available else from `~/.claude/architecture/stacks/`.

### 3.3. Упрощения для старта

Чтобы не утонуть — рекомендуемые сужения для первой версии L3 hygiene:

1. **Стартуй с одного стека — TypeScript + Node/Bun.** Operator пока работает только с TS-проектами. Generalize по Python/Java — отдельно по эмпирической потребности.
2. **Один тип хука — PreToolUse on `git push`.** Не пытайся сразу гейтить commit, Stop, и прочее. Push — один логический gate, ловит большинство проблем.
3. **arch-audit blocking — простой policy.** На старте: блокировать только CRITICAL severity. Расширения (blocking HIGH, configurable thresholds) — по требованию.
4. **Stack-files relocation — overlay-паттерн.** Плагин шипит canonical version в `hi_flow/stacks/typescript.md`, скилл `architecture` (если присутствует) предпочитает plugin'ную версию над `~/.claude/architecture/stacks/typescript.md`. operator-personal версия становится override (для случаев когда оператор хочет локально extended rules). Это сохраняет работоспособность обоих сценариев.
5. **Decoupling — config-driven.** В плагине вводится `hi_flow.config.json` (или подобное), где `architecture_skill_integration: optional | required | disabled`. По умолчанию `optional` — пытается читать ARCHITECTURE.md, при отсутствии работает в reduced-mode без operator-personal artefактов.

Эти упрощения переносят первую версию L3 hygiene в зону «реализуемое за обозримый объём работы».

---

## 4. Что уже зафиксировано (не переоткрываем)

### 4.1. D10 amendment (scope)

hi_flow покрывает design L0-L2 + L3 hygiene enforcement. Phase 3 methodology — superpowers. Reviewability clause существует. **Не возвращаемся к вопросу «может, hi_flow покроет L3 целиком».** Этот вопрос оставлен открытым на будущее, но дизайн-сессия его не решает.

### 4.2. D14 (complementary layers)

superpowers = methodology of implementation. hi_flow = architectural + hygiene infrastructure. При любой scope-развилке: «методология того, как делать?» → superpowers. «Инфраструктура и нормативные правила того, что делать?» → hi_flow. Дизайн-сессия применяет этот критерий, не переопределяет.

### 4.3. typescript.md + typescript-baseline.md существуют

Содержат:
- Operational rules (continuous, semantic) — type/import/error/testing/anti-patterns + cross-tool contracts.
- Setup procedure (mechanical baselines) — tsconfig, biome.json, vitest, gates script, CI workflow, .editorconfig.

Дизайн-сессия их **не переписывает**. Их относительность к плагину решается через relocation/overlay (см. §3.2 пункт 6).

См. `~/.claude/architecture/stacks/typescript.md` и `~/.claude/architecture/stacks/references/typescript-baseline.md`. Также `~/.claude/architecture/stack-file-schema.md` — формат всех стэк-файлов.

### 4.4. arch-audit как existing infrastructure

Arch-audit v0.3.0 production-ready как advisory tool. Дизайн-сессия добавляет blocking mode **поверх** существующего, не переписывает базовый функционал. См. `hi_flow/skills/arch-audit/SKILL.md`.

### 4.5. open-source distribution

hi_flow шипится open source с pitch'ем «install hi_flow + superpowers, делай что говорят». Дизайн-сессия это учитывает (turnkey installation, минимум pre-knowledge от пользователя), но не пересматривает.

---

## 5. Read-list перед стартом дизайн-сессии

В порядке приоритета:

1. **`ARCHITECTURE.md`** — особенно D10, D14, OQ6, OQ9, History 2026-04-29.
2. **`PROJECT_META.md`** — # Суть проекта, последние decision atoms, паттерны разработки оператора (особенно «empirical grounding» и «direct reality-check»).
3. **`~/.claude/architecture/stacks/typescript.md`** — что hi_flow обещает шипить как continuous rules.
4. **`~/.claude/architecture/stacks/references/typescript-baseline.md`** — что обещает шипить как mechanical baselines.
5. **`~/.claude/architecture/stack-file-schema.md`** — формат стэк-файлов (важно при relocation).
6. **`hi_flow/skills/arch-audit/SKILL.md`** — текущий advisory режим, чтобы понять что blocking layer добавляется поверх.
7. **`docs/active-issues.md`** — concurrent work на arch-audit (preflight + baseline rollout).
8. **enji.ai пост про "sanitation layer for vibe-coding founders"** ([ссылка](https://enji.ai/blog/why-vibe-coding-founders-need-sanitation-layer/)) — closest existing industry framing для целевой ниши.
9. **superpowers `requesting-code-review` + `verification-before-completion` SKILL.md** в `~/.claude/plugins/.../superpowers/5.0.7/skills/` — для понимания границы между hi_flow и superpowers.
10. **GitHub issue [anthropic/claude-code #40117](https://github.com/anthropics/claude-code/issues/40117)** — known agent-bypass проблема (`--no-verify`, stash трюки), которую L3 hygiene должна закрывать с первого дня.

---

## 6. Active issues (orthogonal to L3 hygiene design)

Файл: `docs/active-issues.md`. Содержит две MEDIUM-severity tasks:

### 6.1. tsconfig preflight check в arch-audit runtime

Закрывает «where checked» gap из D13. Реализация по образцу commit `f5ede31` (Q-1.5 depcruise version preflight). Self-contained — не требует L3 hygiene дизайна, может делаться отдельно. Подробности — в `docs/active-issues.md`.

### 6.2. baseline rollout в arch-audit как TS-подпроекте

Установка biome, gates script, CI workflow в `hi_flow/skills/arch-audit/` per `~/.claude/architecture/stacks/references/typescript-baseline.md`. Self-referential consistency — мы шипим baseline другим, а сами по нему не живём. Self-contained. Подробности — в `docs/active-issues.md`.

**Связь с L3 hygiene дизайном:** обе active-issues самостоятельны и могут закрываться независимо. Однако при relocation stack-файлов внутрь плагина (часть L3 design'а) baseline canonical source change'ится из operator-personal на plugin-internal — это надо синхронизировать. То есть:
- Если active-issues закрываются **до** L3 design — после relocation надо будет re-verify, что arch-audit baseline всё ещё ссылается на правильный canonical.
- Если **после** — учесть финальный canonical path сразу.

Низко-рисковая координация, не блокер.

---

## 7. Anti-patterns / gotchas

Из накопленного опыта семейства:

1. **Не пытаться объединить design L3 hygiene с другими design-сессиями.** P4 (each skill design — dedicated session). Размер scope хуков + arch-audit blocking + decoupling сам по себе — большая нагрузка.
2. **Не дублировать superpowers.** Если в дизайне появляется ощущение «давайте напишем свой code-reviewer с LLM-ревью» — это нарушение D14. Code review — superpowers.
3. **Не synthesize tsconfig flags из общих соображений.** Список в typescript.md — empirical, выведен из реальных сбоев (zhenka 0.2.3). При расширении (например, для других runtime'ов) — тот же принцип, ground truth = реальный кейс.
4. **Не делать blocking mode arch-audit'а слишком жёстким на старте.** Только CRITICAL по умолчанию. Расширения — по запросу. Operator'ам важна возможность работать локально без бесконечной красноты.
5. **Subagent self-review для critical artifacts.** Spec должна пройти 2-3 subagent passes на разных уровнях granularity (см. PROJECT_META паттерн «Multi-pass subagent self-review»).
6. **Plain language conditional, не universal.** В output-артефактах, где скилл ждёт operator OK — plain Russian. В чисто инженерных артефактах (helper-конфиги, internal docs) — инженерный OK. См. P1 в ARCHITECTURE.md.
7. **Stress-test формата на реальном кейсе.** Если в design'е появляется конкретный пример хука / blocking-сценария — tested на реальном кейсе zhenka, не на synthetic примере.

---

## 8. Open вопросы для дизайн-сессии (не блокирующие старт)

Эти вопросы появились в source-сессии но не были разрешены — ожидают дизайна:

1. **Stack-files: новый owner — hi_flow или operator-personal?** Я предложил overlay (canonical в плагине, override в operator-personal) — но это рекомендация, не зафиксированное решение. Дизайн-сессия может пересмотреть.
2. **Arch-audit blocking mode: общий exit-path или separate command?** Можно сделать `arch-audit --strict` который exit'ит на CRITICAL findings, либо отдельный `arch-audit gate` режим. Trade-off — composability vs explicitness.
3. **Hooks installation: автоматическая на plugin install или explicit setup-команда оператором?** Автоматическая удобнее non-engineer'у, но «менее контролируема». Explicit более прозрачная, но trip-friction. Зависит от Claude Code plugin capabilities.
4. **Bypass mechanism: env var или git-config based?** `BYPASS_HI_FLOW_GATES=1 git push` vs `git config hi_flow.bypass true`. Первое разовое, второе persistent.
5. **Cross-platform — какие platforms shipping с v1?** Windows/Mac/Linux все одновременно или start с подмножества?

---

## 9. После завершения дизайн-сессии

После того как `2026-04-XX-hi_flow-l3-hygiene-design.md` готов и operator-signed:

1. **Implementation report** идёт рядом со спекой (стандарт CLAUDE.md).
2. **Update ARCHITECTURE.md:** D10 → реализованный scope, OQ6 → resolved, открыть OQ для возможной dirty-state cleanup'а.
3. **Update PROJECT_META.md:** decision atoms + status.
4. **Если выявились новые active-issues** в ходе implementation — `docs/active-issues.md` update.
5. **Closure handoff** для market-ready релиза (open-source publishing setup, документация для пользователей, etc.) — отдельная сессия.

---

**Конец hand-off.**
