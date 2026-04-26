# Agent Orchestration System — Draft

**Статус:** draft-предложение, накопленное в стратегической сессии 2026-04-24. Требует отдельной проектной сессии для формализации.

**Назначение документа:** дать будущей сессии достаточный контекст, чтобы начать проектирование системы без перечитывания исходного разговора. Это не спека, это handoff brief.

**Возможное место для итогового проекта:** отдельный репозиторий либо часть meta-hub. Решение за оператором.

---

## 1. Контекст возникновения

Оператор (solo-founder с продуктовым/архитектурным, но не разработческим background'ом) работает с Claude Code на TypeScript/Node проектах. В проекте Zhenka (fitness-бот, миграция с n8n на TS) накопился значимый технический долг несмотря на соблюдение дисциплины Superpowers (brainstorming, TDD, plan review, spec review).

Симптомы:
- За 44 коммита в одной ветке `inbound-pipeline.ts` вырос до 934 строк с Ce=32, Ca=1, I=0.97 — классический God Object. Ни один механизм Superpowers его не поймал.
- После cutover — серия hotfix-train'ов (PR #13-#43), двойные guard'ы, silent fallback pattern, SSoT нарушения, dual paths.
- Alpha на 3 пользователях выдала столько ошибок, что продолжать патчить нецелесообразно.
- Hex-graph audit (ln-644) нашёл 45 проблем в консолидированном прогоне четырёх аудиторов.

Оператор потратил ~15 часов лично на стабилизацию альфы. Признаёт, что продолжение цикла заплаток ведёт к неподдерживаемому продукту.

**Ключевая установка:** это не провал компетенций оператора. Это провал методологии «Superpowers + интуиция» для solo+AI сценария на brownfield проекте. Methodology не закрывает архитектурный governance gap.

Стратегическая цель — не бот, а возможность строить системы **ERP-уровня для малого бизнеса** без привлечения команды разработки. Текущий Superpowers-стек для этого недостаточен.

---

## 2. Принципиальные диагнозы

### D1. TDD закрывает корректность функций, не здоровье структуры

Superpowers TDD и spec review хороши за то, что делают — проверяют поведение функций и замысел фичи. Они структурно слепы к:
- Накопительной деградации модулей (God Object растёт постепенно, каждый коммит выглядит разумным)
- Cross-cutting pattern'ам (silent fallback появляется в 8+ местах как общий стиль)
- SSoT нарушениям и dual paths
- Cycles на уровне модулей

Нужен отдельный слой дисциплины — **архитектурный**, параллельный функциональному.

### D2. Cognitive overload от монолитной spec

Superpowers brainstorming производит spec с перемешанными продуктовыми, архитектурными, техническими решениями. Для автора (разработчика) это удобно — все три измерения в одной голове. Для оператора с асимметрией компетенций (глубоко в продукте, санкционирующий в архитектуре, отсутствующий в технике) — это **когнитивная перегрузка**. Результат: spec читается по диагонали, качество решений падает, «похуистичное» отношение.

Двойное согласование (посекционно + целиком) усугубляет — оператор не понимает контракт «что я согласовываю сейчас».

### D3. Session drift и межсессионный разрыв

Две связанные, но разные проблемы:

- **Drift внутри сессии.** В длинной разработческой сессии модель начинает противоречить собственным ранним решениям, забывает архитектурные constraints, ревёртится к дефолтам.
- **Разрыв между сессиями.** Новая сессия не знает, где остановилась предыдущая. Параллельные сессии наступают друг другу на shared state (наглядный пример — race на `.mcp.json` внутри самой текущей сессии).

Лечатся разными инструментами, нужны оба.

### D4. Отсутствие архитектурного gate'а

В человеческой команде senior-реceнзент смотрит не на diff, а на **состояние** модуля после изменений и даёт «нет». У solo-оператора такой роли нет. Skill `architecture` — documentation tool, не gate tool.

Автоматические gate'ы (file-size, cyclomatic, dependency direction) ловят 80% грубых нарушений без участия оператора. Остаток 20% — семантическое суждение «это God Object или плоский lookup» — требует отдельной роли.

### D5. Инструмент существует, готового решения нет

После адверсариального market-scan подтверждено: **AI-native architectural governance для solo-developers** как готовый SaaS-продукт — пока не существует. Есть точечные утилиты (Drift, Archexa, CodeRabbit, Qodo, CodeScene) и open-source OSS стек (ArchUnitTS, dependency-cruiser, ln-644-dependency-graph-auditor, hex-graph-mcp), но цельного продукта нет. Это формирующаяся ниша.

**Стек инструментов, валидированный в Zhenka (2026-04-24):**

| Инструмент | Роль | Статус |
|---|---|---|
| `dependency-cruiser` (npm dev-dep) | **Module-level граф** (деterministic AST, понимает TS/type-only/path aliases) | **Основной для dep-graph** |
| `hex-graph-mcp` (@levnikolaevich) | **File-level hotspots + symbol-level inspect** | Complementary |
| Custom validator script (~300 строк JS) | **Применение проектных YAML rules поверх JSON графа** | Project-specific thin layer |

Изначально рассчитывали на hex-graph как единственное ядро. При smoke-тесте выяснилось: для single-package TypeScript проектов (не monorepo) hex-graph `analyze_architecture` коллапсирует всё в один модуль — by-design ограничение (package.json как boundary). Перешли на **hybrid-подход**:
- dep-cruiser строит детерминированный module-level граф,
- custom thin validator применяет проектные правила из `dependency_rules.yaml` (severity names, reasons, boundary classification),
- hex-graph остаётся для file-level hotspots и symbol-level `inspect_symbol` (работает).

Это радикально меняет представление о «готовом ядре»: **не один инструмент, а скомбинированный стек**. Но главное подтверждено — детерминированные инструменты для module-level анализа существуют, гибриды работают.

### D6. Skill-as-instruction для детерминированных задач — архитектурный антипаттерн

Отдельное наблюдение, обнаруженное при работе с `ln-644-dependency-graph-auditor`. Skill описывает Phase 2 «Build Dependency Graph» псевдокодом: «делай Grep по таким regex-паттернам, получишь импорты, резолви в модули». **Реального кода парсинга в skill нет.** Каждый прогон skill'а — агент пишет свой скрипт с нуля.

Следствия:
- **Невоспроизводимость.** Разные прогоны дают разные результаты (разная обработка type-only imports, re-exports, path aliases, dynamic imports, tsconfig.paths). Подтверждено на практике: ad-hoc скрипт параллельной сессии дал 45 boundary violations, depcruise-based дал 14 — разница 31 ложноположительных.
- **Baseline freeze невозможен.** Если baseline заснапшотился на одном парсере, а следующий прогон пишет другой — он покажет «новые» нарушения, которых реально нет.
- **Токены.** Каждый прогон = полная реализация парсера заново. Для 127-файлового проекта это существенно.
- **Отладка непрозрачна.** Скрипт живёт в runtime и исчезает. Если результат странный — читать ad-hoc код модели в своём run-folder.

Правильный дизайн skill для такой задачи: **skill оркестрирует стабильный специализированный инструмент** (dep-cruiser / madge / codeql для TS), интерпретирует его вывод, применяет проектные правила. Тонкий markdown-слой поверх industry-tested парсера.

Операторская оценка формулировки: «вайб-кодинговая поебень, которая симптоматично ссылается на Agile» — гибкость через псевдокод как оправдание отсутствия инженерии, одна из Agile-патологий.

**Это общий урок дизайна skill-фреймворка, не только про ln-644.** Любой skill, претендующий на выполнение детерминированной задачи (парсинг, метрики, диффинг, валидация), должен оркестрировать реальный tool, а не воспроизводить его алгоритм псевдокодом в инструкции агенту.

---

## 3. Накопленные предложения

### Группа A — Three-Phase Development Flow

Переработка Superpowers brainstorming с явным разделением ownership по трём режимам мышления оператора.

**Phase 1 — Product Discovery** (зона оператора, deep mode):
- Оператор + агент проходят through user needs, UX implications, edge cases, product constraints
- Выход: `product-spec.md` — короткий, plain-language, без технического жаргона
- **Никаких архитектурных и технических решений здесь нет.** Всплывающие assumption'ы помечаются как «to validate in Phase 2»
- Superpowers brainstorming подтягивается на эту роль — хорошо делает discovery user intent, ему отсекается архитектурно-техническая часть

**Phase 2 — Architecture Translation** (зона агента, оператор санкционирует):
- Агент читает `product-spec.md` + текущий state через hex-graph + ARCHITECTURE.md (Module Map, Known Drift, P-принципы)
- Выход: `architecture-spec.md` — архитектурный дизайн: модули, интерфейсы, budget ограничения, взаимодействие с Known Drift
- Режим оператора: санкционирующий. Читается за 5-10 минут. Вопросы уровня «не противоречит ли направлению / не усугубляет ли Drift / соразмерны ли затраты цели»
- Это **новый skill**, которого нет ни в Superpowers, ни в Cherny-handbook

**Phase 3 — Implementation Plan + TDD** (зона агента, approval формальный):
- Superpowers writing-plans + executing-plans + subagent-driven-development + TDD
- Операторский review plan'а — минимальный, потому что решения уже утверждены в фазах 1 и 2

**Feedback loop:** Phase 2 может возвращать в Phase 1, если продуктовое решение требует непропорционального архитектурного ресурса. Оператор переоткрывает продуктовый режим, пересматривает решение. Защита от silent compromise'ов, когда агент переинтерпретирует продукт, чтобы влезть в архитектуру.

### Группа B — Session Handoff Discipline

Адаптация «Four Continuity Documents» из Cherny-handbook под контекст оператора с ARCHITECTURE.md как первоклассным артефактом.

Компоненты:
- `.claude/handoff/current.md` — живой state-документ с разделами «Where we left off / Active branches of thought / Do NOT forget»
- **SessionStart hook** — автоматически инжектит `current.md` при старте новой сессии
- **Skill `close-session`** — ручной при завершении; пишет `current.md` + архивирует старое состояние в `.claude/handoff/archive/YYYY-MM-DD-hhmm.md`
- **Stop hook с агентом** — отложено. Добавляется только если ручная дисциплина через `close-session` не выдерживается. Защита от over-engineering.
- **40-50% rule** — из Cherny-handbook (community convention, не Anthropic-canon). Как disciplinary trigger для смены сессии.
- **Параллельные сессии** — явные записи в `current.md` типа «parallel session active on file X» — защита от race'ов типа `.mcp.json`.

### Группа C — Stack integration (dep-cruiser + hex-graph + custom validator)

Основной стек валидирован в Zhenka 2026-04-24. Не один инструмент, а три слоя с разными ролями:

**Слой 1 — dep-cruiser (module-level граф):**
- `bunx depcruise src --output-type json` даёт детерминированный граф импортов.
- Различает type-only vs runtime, re-exports, dynamic imports, tsconfig.paths.
- Не используем native depcruise rules — пишем свой validator поверх (см. Слой 3).

**Слой 2 — hex-graph MCP (file/symbol-level):**
- `inspect_symbol` для точных Ca/Ce/I per-function/per-class.
- File-level hotspots для поиска центров связности.
- `analyze_architecture` на Zhenka коллапсирует в один модуль (by-design), не используем для module-level.

**Слой 3 — Custom thin validator (project-specific rules):**
- ~300 строк JS, читает JSON от dep-cruiser + проектный `dependency_rules.yaml`.
- Применяет проектные severity names, reasons, boundary classification.
- Строит cycle detection (pairwise + transitive DFS, type-only исключены из runtime-циклов), считает Ca/Ce/I + NCCD.
- Пишет отчёт в том же формате, что ожидает ln-644 (обратная совместимость с существующим шаблоном).

Использование по flow:

- **Phase 2 (Architecture Translation)** — validator на текущем состоянии для проектирования. Агент читает отчёт как current state.
- **Pre-merge audit** — validator на feature-ветке + diff против baseline.
- **Post-impl architectural review** — сравнение после реализации с baseline из main.
- **Baseline freeze** через `docs/project/dependency_rules.yaml` (`baseline: enabled: true` после первого clean прогона).

**Ключевой паттерн — «агент + детерминированные инструменты»:**
- Этап 1: детерминированные инструменты собирают факты (граф, метрики, циклы, churn).
- Этап 2: агент читает готовые факты (JSON) и интерпретирует.
- Этап 3: агент предлагает действия, оператор решает.

**Принципиальное следствие для orchestration system:** skill не *алгоритмизирует* анализ — он *оркестрирует* инструменты. См. D6 диагноз. Каждый skill с детерминированной задачей должен: (а) вызывать стабильный tool, (б) интерпретировать его вывод, (в) применять проектные правила тонким слоем. Не писать парсер заново.

**Custom validator — не обязательно навсегда.** Если native depcruise/madge rules вдруг станут достаточно выразительными для наших severity/reasons — thin validator может уйти. Пока — compromise между удобством проектных формулировок и готовностью industry tool.

### Группа D — Definition of Done и анти-drift

- **Definition of Done** как явный раздел ARCHITECTURE.md (или CLAUDE.md) с чеклистом 4-6 пунктов завершения фичи. Из Cherny-handbook, автор называет «one of the highest-value additions».
- **Skill `sanity-check`** — вызывается оператором при ощущении drift'а. Заставляет Claude перечитать ключевые принципы ARCHITECTURE.md и явно проверить соответствие последнего предложения.
- **Known Drift check в Phase 2** — spec-предложение не должно усугублять уже зафиксированный drift. Если усугубляет — эксплицитно flag'ается с тремя опциями: рефакторинг drift'а первым / принять усугубление осознанно / переформулировать фичу.
- **Two-document architectural debt tracking** (валидировано в Zhenka 2026-04-24): разделить `ARCHITECTURE.md → Known Drift` (accepted debt — живём, живёт много сессий, грузится при каждом старте) и `docs/active-issues.md` (планируем исправить, закрытие = удаление строк + git log как history). Критерий попадания — **«исправим ли мы это?»**, не severity. CRITICAL-must-fix идёт в active-issues, MEDIUM-decision-to-accept остаётся в KD. Устраняет антипаттерн «зафиксировали в KD → через 3 итерации пометили Resolved» (тривиальное доказательство что запись не была accepted debt). Принцип #9 «read current state, not target state» усилен: living-документ описывает только current state, без зомби-секций с ✅ RESOLVED. Переносимо в любой orchestration flow, где архитектурный долг копится в monolithic TODO-документе.

---

## 4. Открытые вопросы (в порядке приоритета)

### Вопрос 1. Критерий «тривиальная задача vs полный flow»

Не каждая задача требует все три фазы + handoff + audit. Нужен explicit критерий включения полной машины. Кандидаты триггеров:
- Touch points > N файлов
- LOC delta > M
- Пересечение с Known Drift
- Новый модуль (vs изменения в существующем)
- Hexagonal boundary crossing

Без критерия — bureaucracy even на мелких фиксах. Нужна экономичная выборка.

### Вопрос 2. Форма артефакта Phase 1 (product-spec.md)

**Самый важный вопрос из всех.** Определяет интерфейс между Phase 1 и Phase 2.

Что именно оператор хочет видеть на выходе Product Discovery? Кандидаты формата:
- User stories (As-A / I-Want / So-That)
- User flows (step-by-step сценарии)
- Constraints list (что продукт делает, что не делает)
- Функциональные требования Given/When/Then
- Комбинация выше

Оператор на прямой вопрос ответил: «не знаю, есть ощущение, но требует вербализации, формализации». **Требует отдельного brainstorm-штурма в следующей сессии.**

### Вопрос 3. ARCHITECTURE.md токеновая проблема

ARCHITECTURE.md Zhenka — 1100+ строк, ~35K токенов. Грузится на каждом SessionStart через hook. Проблема двумерная:
- $: без prompt caching — платит 35K input tokens каждую сессию. С caching — меньше, но не ноль.
- Attention dilution: длинный контекст в начале сессии снижает качество внимания модели к актуальной задаче.

Решение — **стратификация документа**:
- **Core** (всегда inline в SessionStart) — P-принципы, критичный Known Drift, текущий статус, Module Map (имена модулей, не полные описания)
- **Details** (on-demand через skill) — История решений, Active Decisions развёрнуто, Sub-workflow контракты, Database Model

Критерий разделения — частота access'а. Что читается каждую сессию — core. Что нужно 1 раз в неделю при конкретной задаче — details.

Требует дизайна: как skill будет эффективно подгружать details по запросу.

### Вопрос 4. Superpowers сохраняем или переупаковываем

Моё рекомендуемое решение — **сохраняем, но сужаем scope**:
- brainstorming → Phase 1 (с отсечённой архитектурно-технической частью)
- writing-plans + executing-plans + TDD → Phase 3
- Phase 2 — новый skill, который пишем сами

Альтернатива — fork Superpowers + упаковка всего в собственный плагин. Больше работы, больше контроля. Развилка к фиксации.

### Вопрос 5. Как применяется flow к существующему Zhenka

Zhenka в post-cutover состоянии с 45 проблемами из ln-644 audit. Новый flow нужен для **новых** решений, но Zhenka требует рефакторинга существующего.

Два варианта:
- (а) Сначала закрываем техдолг по старому flow, потом включаем новый
- (б) Новый flow применяем **уже к рефакторингу** как первый живой кейс

Склоняюсь к (б) — рефакторинг God Object'а через Phase 1/2/3 будет отличным training'ом и сразу validation методологии на реальной задаче.

### Вопрос 6. Когнитивный контракт оператор ↔ система

Режимы мышления оператора (deep in product, sanctioning in architecture, absent in tech) — это не UX спеки, это **мета-контракт** между оператором и системой. Должен быть явно записан где-то в OPERATOR_META или root CLAUDE.md.

Без явной записи система не будет консистентна — разные skill'ы будут ожидать разных режимов от оператора.

### Вопрос 7. Multi-session discipline как живой эксперимент

В текущем режиме работы оператор уже использует параллельные сессии (Desktop + Telegram-bridge), что приводит к race'ам на shared state. Из этого опыта можно вытащить **практические паттерны** для multi-session discipline.

Тема заслуживает отдельного раздела методологии: когда использовать параллельные сессии, как их координировать, какие shared-файлы требуют блокировки, какие нет.

---

## 5. Требует brainstorm в следующей сессии

Эти вопросы не решаются прямолинейным обсуждением — требуют штурма, пробных формулировок, переформулирований:

1. **Форма артефакта Phase 1** (вопрос 2). Нужен пример на 2-3 реальных задачах разной сложности. Вероятно, не единый формат, а family of templates.
2. **Когнитивный контракт оператора** (вопрос 6). Какой режим в какой фазе, что оператор делегирует, что нет, как система его информирует о смене режима.
3. **Стратификация ARCHITECTURE.md** (вопрос 3). Что именно попадает в core, что в details, как skill их балансирует.
4. **Критерий полного flow vs трivialного** (вопрос 1). Измеримые триггеры, а не интуитивные «это большая задача».

---

## 6. Что система должна закрыть

Итоговая цель — **solo-оператор с AI-агентами может строить системы ERP-уровня для малого бизнеса** без команды разработки, с сохранением архитектурной целостности на 6-12+ месяцев эволюции проекта.

Специфические успешные критерии:
- Циклы «15 часов заплаток» не повторяются.
- God Object не вырастает незаметно — ловится механическими gate'ами до merge.
- Рефакторинг перестаёт быть emergency-режимом, становится plannable activity с предсказуемым результатом.
- Разделение продуктовых/архитектурных/технических решений эксплицитно — оператор знает, где его зона, где агента.
- Межсессионный drift контролируется через handoff-дисциплину.
- Архитектурные решения фиксируются в документации в момент принятия, переиспользуются в будущих brainstorm'ах.
- Metrics-driven — hex-graph baseline позволяет видеть регрессии объективно, не по ощущениям.

---

## 7. Anti-patterns, которых избегаем

- **Cargo cult.** Не устанавливаем инструменты ради инструментов. Каждый новый элемент системы должен закрывать конкретный диагноз из §2.
- **Over-engineering.** Не запускаем архитектурный audit на каждую мелочь. Критерий выборки (вопрос 1) обязателен.
- **Bureaucratic cascade.** Три фазы не должны превращаться в «три формальных документа для галочки». Если Phase 2 занимает дольше, чем сама реализация — что-то не так.
- **Ещё один skill поверх.** Текущая дисциплина оператора (Superpowers + skill `architecture`) уже требует внимания. Новые skill'ы добавляются с удалением или сужением существующих, а не сверху.
- **Full automation fantasy.** Оператор остаётся в санкционирующей роли во всех фазах. Цель — убрать когнитивную перегрузку, не убрать оператора из петли.
- **Tight coupling между фазами.** Phase 1 не должна зависеть от конкретного формата Phase 2. Артефакты — текстовые документы с явным контрактом, не структурированные state'ы в памяти агента.
- **Single-point-of-failure skill.** Ни один skill не должен быть единственным путём к рабочему flow. Если `architectural-translation` не работает — должен существовать fallback на ручной режим.
- **Skill-as-pseudocode для детерминированных задач.** Skill, описывающий алгоритм парсинга/анализа/метрик псевдокодом вместо оркестрации реального tool. Каждый прогон — агент пишет свой скрипт с нуля, результаты расходятся, baseline freeze ломается, edge cases не покрыты. Любой skill с AST-подобной/парсер-подобной задачей должен: (а) вызывать стабильный специализированный инструмент, (б) интерпретировать его вывод, (в) применять проектные правила тонким слоем. См. D6 подробно.
- **Native rules DSL любой ценой.** Когда у проекта уже есть свой формат архитектурных правил (severity, reasons, bespoke классификация), не переписывать его в native формат стандартного инструмента ради «меньше кода». Тонкий custom validator (~300 строк) + industry tool для графа — чище и сохраняет проектную семантику. Native DSL имеет смысл, если проектная модель действительно покрывается им без потерь; чаще — не покрывается.

---

## Отправная точка следующей сессии

Предлагаемый первый шаг в новой сессии:

1. Перечитать этот документ целиком.
2. Подтвердить диагнозы §2 — есть ли что добавить/снять.
3. **Начать с вопроса 2 (форма артефакта Phase 1)** — через brainstorm на 2-3 реальных примерах задач разной сложности (например: новый tool для Zhenka / рефакторинг inbound-pipeline.ts / новая фича в dom-byta).
4. Сформулировать рабочий формат product-spec.md, даже если он пока компромиссный.
5. После этого проще будут вопросы 6 (когнитивный контракт) и 1 (критерий полного flow) — они частично выводятся из формата Phase 1.

Вопросы 3 (ARCHITECTURE.md стратификация), 4 (Superpowers sаохранять / форкать), 5 (применение к Zhenka), 7 (multi-session) — в последующих сессиях.

---

## Артефакты из исходной сессии, на которые опирается этот документ

**Reference implementation hybrid-стека (Zhenka, 2026-04-24):**
- `c:\Users\Vegr\Projects\zhenka\.dependency-cruiser.cjs` — минимальный depcruise config (только scan paths + tsconfig, без native rules)
- `c:\Users\Vegr\Projects\zhenka\scripts\depgraph-audit.mjs` — custom thin validator (~300 строк JS): YAML-parser + cycle detection + Ca/Ce/I/NCCD + report writer
- `c:\Users\Vegr\Projects\zhenka\audit-report\644-dep-graph.md` — пример output формата (совместим с ожидаемым от ln-644)
- `c:\Users\Vegr\Projects\zhenka\docs\project\dependency_rules.yaml` — custom boundary rules (18 modules, 36 forbidden, 4 allowed, severity + reasons), `baseline: enabled: false`

**Two-document architectural debt tracking (Zhenka, 2026-04-24):**
- `c:\Users\Vegr\Projects\zhenka\ARCHITECTURE.md` — KD section (992 строки, 19 живых KD, Resolved KD удалены, не помечаются ✅)
- `c:\Users\Vegr\Projects\zhenka\docs\active-issues.md` — planned issues (13 записей, группировка по severity, закрытие = удаление)
- `c:\Users\Vegr\Projects\zhenka\docs\session-handoff.md` — пример handoff документа для Zhenka-сессий (не confuse с этим файлом — тот tactical, этот strategic)

**Прочее:**
- `c:\Users\Vegr\Projects\zhenka\.mcp.json` — hex-graph MCP зарегистрирован (для file/symbol-level, не для module-level)
- `c:\Users\Vegr\Projects\zhenka\.claude\skills\ln-644-dependency-graph-auditor\` — локально установленный skill (reference для критики skill-as-pseudocode, см. D6)
- `c:\Users\Vegr\Projects\zhenka\.claude\skills\shared\references\` — shared dependencies skill'а
- Global `~/.claude/CLAUDE.md` — 10 архитектурных принципов (принцип #9 «read current state» подтверждён операционно через two-doc split), OPERATOR_META отсылки
- `c:\Users\Vegr\Projects\zhenka\PROJECT_META.md` — обновлён 2026-04-24 с exports-паттернами из этой сессии (hybrid stack, two-doc tracking, skill-as-pseudocode антипаттерн)
- Insight-hub: #203 (Cherny handbook validation-anchor), #116 (multi-agent handoff failures 35%), #183/#175 (rejected «трюизм»), #98/#103 (context engineering как управленческая функция)

Исходный разговор не сохраняется — принципиальные выводы упакованы в этот документ. Если следующей сессии потребуется уточнение — запросить у оператора.

---

**Дата создания:** 2026-04-24
**Последнее обновление:** 2026-04-24 (по итогам tactical audit сессии Zhenka)
**Автор:** Claude (Opus 4.7), в диалоге с оператором
**Статус:** draft, к обсуждению в отдельной сессии

## Лог изменений документа

- **2026-04-24 init** — первая версия, 7 секций (§1 контекст, §2 диагнозы D1-D5, §3 группы A/B/C/D, §4 открытые вопросы 1-7, §5 требует brainstorm, §6 цели, §7 anti-patterns).
- **2026-04-24 update** — по итогам tactical audit сессии Zhenka:
  - D5 актуализирован: «один hex-graph как ядро» → «hybrid-стек (dep-cruiser + hex-graph + thin validator)». Причина: hex-graph MCP module-level collapse для single-package TS проектов.
  - Добавлен D6 «skill-as-instruction для детерминированных задач — архитектурный антипаттерн». Вывод из наблюдения за ln-644 SKILL.md (Phase 2 алгоритм псевдокодом).
  - Группа C переписана: 3 слоя (dep-cruiser / hex-graph / custom validator) с разными ролями, принципиальный вывод про «skill оркестрирует, не алгоритмизирует».
  - Группа D +1 паттерн: two-document architectural debt tracking (KD vs active-issues, критерий «исправим?»).
  - §7 anti-patterns +2: skill-as-pseudocode, native DSL любой ценой.
  - Артефакты обновлены: reference implementation hybrid-стека (config + validator + audit report), two-doc tracking (ARCHITECTURE.md + active-issues.md + session-handoff.md), PROJECT_META.md обновлённый.
