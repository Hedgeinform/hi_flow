# Текущие проектные контракты HiFlow

Этот документ связывает действующие нормы с их владельцами. Он не копирует
содержимое скиллов и не возобновляет отменённые решения. Исходные D1–D29 и история
сохранены в [архиве](history/2026-10-24-architecture-v2.md). Более поздние
[решения о разделении состояния и архитектуры](../superpowers/specs/2026-07-07-hi_flow-project-state-architecture-notes.md)
заменяют старый план переноса living-architecture и старую границу планирования.

## Действующие обязанности и источники

| Старый ID | Сохранённая обязанность / изменение | Текущий владелец |
|---|---|---|
| D1, D6 | Пакет называется `hi_flow`; marketplace в корне, общие скиллы внутри пакета | [README](../../hi_flow/README.md), manifests |
| D2, D3 | Иерархические развилки, структурный минимум probes и адаптивная глубина; закрытие по покрытию | [feature-spec](../../hi_flow/skills/feature-spec/SKILL.md), [product-spec](../../hi_flow/skills/product-spec/SKILL.md), [arch-spec](../../hi_flow/skills/arch-spec/SKILL.md) |
| D4, D5 | Понятный язык и прагматичная пакетная работа субагентов | P1, P5, P6 в [ARCHITECTURE.md](../../ARCHITECTURE.md) |
| D7 | Аудит анализирует, arch-spec проектирует фичу, arch-redesign исправляет архитектурный долг | [workflow-routing](../../hi_flow/references/workflow-routing.md) |
| D8 | Finding имеет семантическое обоснование; формат проверяется | [D8 schema](../../hi_flow/skills/arch-audit/references/d8-schema.md) |
| D9 | Общая библиотека статически проверяемых принципов; её индекс — проекция | [architectural-principles](../../hi_flow/references/architectural-principles.md), [ArchAudit](../../hi_flow/skills/arch-audit/SKILL.md) |
| D10, D14 | HiFlow владеет нормативными источниками, планом и фундаментом; выполнение — у совместимого исполнителя. Старое «impl-plan не делаем» отменено | [workflow-routing](../../hi_flow/references/workflow-routing.md), [implementation-plan](../../hi_flow/skills/implementation-plan/SKILL.md) |
| D11 | Патч правил — кандидат, применение явное; наблюдаемый граф не меняет целевую норму | [target-architecture-contract](../../hi_flow/references/target-architecture-contract.md) |
| D12 | Barrel rule проверяет внешний импорт агрегатора, не запрещает всякий index.ts | [baseline-rules](../../hi_flow/skills/arch-audit/references/baseline-rules.md), runtime/tests ArchAudit |
| D13 | TS preconditions должны быть известны; наличие документа не доказывает runtime-проверку | [typescript stack](../../hi_flow/references/stacks/typescript.md); открытый preflight — в [issues](../active-issues.md) |
| D15 | Предположенные продуктовые значения видимы; жаргон переводится; граф читаем на уровне фич | [product-spec](../../hi_flow/skills/product-spec/SKILL.md) |
| D16 | Версии всех упаковок синхронны; публикация, обновление установленного пакета и загрузка новым чатом — разные состояния | Правило выпуска ниже, [README](../../hi_flow/README.md) |
| D17, D18 | product-spec завершает декомпозицию roadmap и pointer-based bundles, не отдельным скиллом | [product-spec](../../hi_flow/skills/product-spec/SKILL.md) и его templates |
| D19 | Фича — группа функций; функция — атомарная пользовательская задача; кодовый модуль — отдельное понятие | [product-spec](../../hi_flow/skills/product-spec/SKILL.md), [feature-spec](../../hi_flow/skills/feature-spec/SKILL.md) |
| D20 | Старый план отдельного living-architecture отменён. Bootstrap создаёт снимок; исполнитель поддерживает его; project-state хранит статус | [architecture-snapshot](../../hi_flow/references/architecture-snapshot.md) и июльские решения |
| D21 | Архитектурная спека фичи и rules-patch передаются в `hi_flow:implementation-plan`, не напрямую в generic writing-plans | [arch-spec](../../hi_flow/skills/arch-spec/SKILL.md) |
| D22 | Backlog имеет одного владельца структуры; downstream вносит изменения общим механизмом | [backlog-integration](../../hi_flow/references/backlog-integration.md) |
| D23 | Bootstrap — фундамент; Ops — привязки, шаблоны и доставка; covered deploy не пишется заново произвольным способом | [ops](../../hi_flow/skills/ops/SKILL.md) |
| D24 | Code-sight и deployment-bound развилки разделены; composition root учитывается; security-critical инварианты получают сигнал на review | [arch-spec](../../hi_flow/skills/arch-spec/SKILL.md), [rules-patch template](../../hi_flow/skills/arch-spec/references/rules-patch-template.yaml) |
| D25 | UX-поведение/структура — feature-spec; архитектура UI — arch-spec, визуальное исполнение не подменяется ею | [feature-spec](../../hi_flow/skills/feature-spec/SKILL.md), [arch-spec](../../hi_flow/skills/arch-spec/SKILL.md) |
| D26 | Проверять влияние первой фичи на общие порты; отдельный реестр возможностей без доказанной нужды не создавать. Триггер пересмотра: реальный поток 4+ потребителей одной способности в боевом проекте → рассмотреть реестр с якорем в backlog-механизме D22 и детектором в product-spec | Shared-capability lookahead в [arch-spec](../../hi_flow/skills/arch-spec/SKILL.md); триггер сохраняется здесь |
| D27, D28 | Покрытие React честное; fullstack анализируется по деревьям; ограничения mixed-src/shared packages видимы | [coverage-manifest](../../hi_flow/skills/bootstrap/references/coverage-manifest.md), [arch-spec](../../hi_flow/skills/arch-spec/SKILL.md) |
| D29 | Bootstrap сеет принцип feature-backbone, arch-spec проектирует конкретные narrow-public-entry границы | [feature-backbone-convention](../../hi_flow/references/feature-backbone-convention.md) |

## Выпуск и границы

- При выпуске синхронизировать `hi_flow/.claude-plugin/plugin.json`,
  `hi_flow/.codex-plugin/plugin.json`, `hi_flow/.cursor-plugin/plugin.json` и
  запись HiFlow в `.claude-plugin/marketplace.json`.
- После публикации проверить установленную версию на нужном хосте. Старый
  Claude Code обход с ручным обновлением marketplace clone относится только
  к той установке, для которой он подтверждён; не применять его вслепую ко всем
  хостам и кэшам. Не утверждать, что push изменил уже загруженный каталог скиллов.
- Методология security review остаётся у исполнителя; HiFlow обозначает
  необходимость проверки trust chain, а не выдаёт тег за выполненный аудит.
- Новые специальные хуки и расширение HiFlow до всей методологии исполнения
  возможны только после подтверждения недостаточности действующего разделения;
  условия сохранены в Accepted Exceptions корневого снимка.
- Неразрешённые OQ не становятся принятой новой функциональностью при миграции.
  Их текущая очередь и триггеры — [docs/active-issues.md](../active-issues.md).
