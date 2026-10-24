# HiFlow — текущая архитектура

Компактный снимок семейства скиллов и его действующих обязанностей. Состояние
поставки и следующая задача — в [PROJECT_STATE.md](PROJECT_STATE.md).
История решений сохранена в [архиве](docs/architecture/history/2026-10-24-architecture-v2.md),
который не определяет текущие требования. Порядок поддержки снимка —
[architecture-snapshot.md](hi_flow/references/architecture-snapshot.md).

## Stack

- Инструкции скиллов: Markdown и YAML frontmatter, общие для Codex, Claude Code и Cursor.
- Исполняемый ArchAudit: TypeScript/Node.js, Vitest; исходники в `hi_flow/skills/arch-audit/`.
- Поставляемый runtime: готовые Node.js ES modules в `hi_flow/skills/arch-audit/dist/`, включая dependency-cruiser. Потребителю не требуется установка пакетов в кэш плагина.
- Упаковка: три plugin manifest в `hi_flow/` и marketplace в корне репозитория; версии сверяются при выпуске.
- Состав и команды runtime: [package.json](hi_flow/skills/arch-audit/package.json); размещение пакета — [README](hi_flow/README.md).

## Technical Topology

Двенадцать скиллов обслуживают продуктовую декомпозицию, фичи, приём сигналов,
состояние проекта, миграцию поведения, исправление нарушенного контракта,
архитектурный аудит/дизайн/редизайн, план реализации, фундамент и доставку.
Точный маршрут задаёт [workflow-routing.md](hi_flow/references/workflow-routing.md).

ArchAudit строит наблюдаемый граф и проверяет его по явно заданным правилам.
`arch-spec` и `arch-redesign` предлагают изменения целевого контракта; принятие
наблюдаемой реализации за норму запрещено. Методология выполнения планов
остаётся у Superpowers либо совместимого исполнителя. Для документов скиллов
действует P2 ниже; для TypeScript runtime нужны подходящие автоматические проверки.

## Domain Ownership / SSoT Map

| Область | Владелец и текущий источник |
|---|---|
| Маршруты семейства и граница с исполнителем | [workflow-routing.md](hi_flow/references/workflow-routing.md) |
| Продуктовая декомпозиция и backlog | `product-spec`; [backlog-integration.md](hi_flow/references/backlog-integration.md) для вкладов downstream |
| Форма текущих поведенческих контрактов | [behavior-registry.md](hi_flow/references/behavior-registry.md); сценарии живут в проектах-потребителях |
| Исполнимая проверка поведения | [behavior-harness.md](hi_flow/references/behavior-harness.md), project-native mapping/runner |
| Архитектурный снимок и миграция legacy | [architecture-snapshot.md](hi_flow/references/architecture-snapshot.md); создаёт bootstrap, обновляет исполнитель изменения |
| Машинный архитектурный контракт | [target-architecture-contract.md](hi_flow/references/target-architecture-contract.md) |
| Формат аудита | [d8-schema.md](hi_flow/skills/arch-audit/references/d8-schema.md), [JSON Schema](hi_flow/skills/arch-audit/references/d8-schema.json) |
| Статические принципы и базовые правила | [architectural-principles.md](hi_flow/references/architectural-principles.md), [baseline-rules.md](hi_flow/skills/arch-audit/references/baseline-rules.md); owner — ArchAudit |
| Поддерживаемое основание проекта | [coverage-manifest.md](hi_flow/skills/bootstrap/references/coverage-manifest.md), [стековые файлы](hi_flow/references/stacks/) |
| Шаблоны доставки | `ops`, [template-manifest.md](hi_flow/skills/ops/references/template-manifest.md) |
| Собственные действующие проектные нормы из прежних D-записей | [current-contracts.md](docs/architecture/current-contracts.md) — адресные указатели и нормы без другого владельца |
| Дефекты и сохранённые открытые вопросы самого HiFlow | [docs/active-issues.md](docs/active-issues.md) |

У самого репозитория HiFlow нет полного Behavior Registry продукта. Общий
`hi_flow/references/behavior-registry.md` описывает формат, а не является реестром
поведения самого плагина. Полноту покрытия не заявляем; принятые спеки и отчёты
сопоставляются с текущими инструкциями/runtime по затронутой области.

## Project-specific принципы

Применяются в дополнение к глобальным инструкциям оператора. Содержание P1–P8 сохранено при миграции.

### P1. Аудитория артефактов скиллов — продуктолог, не инженер.

Все скиллы семейства `hi_flow` производят артефакты, адресованные оператору в продуктовой роли. Английский жаргон допустим только если он широко известен (MVP, KPI, UX, BMI, ИМТ, ROI) или объективно компактнее русского эквивалента и без потери смысла. Engineering-only терминология (extract-all, payload, throughput, idempotency, retry-strategy) — переводится или раскрывается. Плэйн-нейминг переменных (target_weight, current_weight) — ОК как структурные идентификаторы.

### P2. Skill = LLM instructions в markdown, не код.

Скиллы — инструкции для агента, не runtime-код. Следствия:
- TDD неприменим. Заменяется structural validation (file structure, frontmatter, sections) + behavioral validation (subagent simulation сценариев + spec compliance review).
- Worktree избыточен (изолированные markdown-правки, низкий conflict risk).
- «Code review» в smysl pull requests неприменим. Заменяется spec compliance review (соответствие design'у) + behavioral review (clarity instructions).

### P3. End-to-end validation through real-world pipeline.

Качество семейства проверяется не unit-тестами скиллов в изоляции, а полноценным прогоном через цепочку (product-spec → feature-spec → arch-spec → impl-plan) на реальной задаче. Изолированный тест одного скилла менее ценен — методология имеет смысл как pipeline.

### P4. Каждый скилл — дедикейтная design-сессия.

Объединение дизайнов нескольких скиллов в одну сессию даёт хуже качество (контекст загрязняется, parking decisions смешиваются). Свежая сессия per skill design дороже по setup, но даёт чище решения и тестирует self-sufficiency артефактов.

### P5. Subagent-driven implementation с прагматичной адаптацией.

Strict «fresh subagent per task + 2-stage review» из superpowers даёт ~54 dispatch'а на 18 задач — избыточно для documentation work. Адаптация: батчинг последовательных markdown-задач в один dispatch + selective review (spec compliance после batch, behavioral validation после complete skill). Quality gate сохраняется, dispatch count снижается до ~10-12.

### P6. Дисциплина обращения к оператору.

Скилл соблюдает чёткое разграничение, когда обращаться к оператору, а когда действовать самостоятельно, по двум осям:

1. Не принимает решения за оператора в зонах его сильной экспертизы. Для hi_flow по умолчанию это продуктовые решения (что входит в продукт, какие приоритеты, какие компромиссы, кто целевая аудитория). Инженерные решения скилл может принимать самостоятельно — у hi_flow аудитории инженерная экспертиза слабее продуктовой (см. P1).

2. Не задаёт оператору вопросы по детерминированным действиям — те, ответ на которые однозначно выводится из правил (смена статуса спеки, проверка целостности, валидация формата, проверка замкнутости зависимостей, миграция содержимого между артефактами). К оператору обращаться только если событие требует продуктового суждения (выбор между альтернативами с компромиссами, разрешение неоднозначности, решения о составе продукта).

Антипаттерн «лишний вопрос оператору»: «спрошу-ка на всякий случай», когда ответ однозначен.

Антипаттерн «решение за оператора»: «решу сам», когда вопрос про продуктовые компромиссы.

Применяется ко всем скиллам семейства hi_flow.

### P7. Coverage-honesty — предлагать только полностью покрытое плагином.

Скиллы, ведущие оператора через выбор технологий/компонентов (напр. bootstrap probing стека), предлагают только компоненты, **полностью покрытые плагином** (stack-file + baseline + audit-adapter + scaffold-template). SSoT покрытия — явный coverage-manifest. Непокрытое — не молчаливое предложение, а громкий сигнал + degrade «unmanaged» (global принцип 5). Запрет обещать turnkey-hygiene там, где плагин её не довезёт. Coverage читается динамически (не хардкод), растёт вместе с плагином. Триггер фиксации — bootstrap design 2026-06-01.

### P8. Разграничение высот: project-level foundation vs feature-level structure.

Скилл не залезает на чужую высоту. bootstrap (project-level) задаёт «КАК устроен модуль в проекте» (toolchain, conventions, scaffold-convention); arch-spec (feature-level) решает «КАКИЕ модули у фичи». project-foundation не предугадывает feature-структуру; feature-design не фиксирует project-стек. Системное разрешение границы находок A↔C. Обобщается на уровни семейства (product / feature / project-foundation / impl). Триггер фиксации — bootstrap design 2026-06-01.

---

## Active Issues

Единственный список — [docs/active-issues.md](docs/active-issues.md). Не дублировать
его здесь. Старый [architecture-pending.md](docs/architecture-pending.md) оставлен
как исторический указатель; непринятые предложения не становятся требованиями
при переносе документа.

## Accepted Drift / Accepted Exceptions

- **Два вида проверок:** Markdown-скиллы проверяются структурно и сценариями по P2;
  runtime ArchAudit — его исполняемыми тестами. Это не разрешение пропускать
  проверки исполняемого кода.
- **Граница с Superpowers пересматриваема:** не поглощать методологию выполнения
  планов без подтверждённого пробела. Триггер — воспроизводимый недостаток
  существующей границы; соответствующая развилка требует решения оператора.
- **Хуки запрета обхода локальных проверок не вводятся:** текущий минимальный путь
  — CI/gates. Возврат к специальным хукам только при доказанной недостаточности
  этого пути (прежний D10, уточнение 2026-06-01).

Прежние KD1 (имя другой локальной папки), KD2 (будущий living-architecture) и KD3
(личная копия React baseline) не описывают нынешний пакет. Их происхождение
сохранено в архиве; дальнейшая поддержка использует текущие источники выше.
