# Refactor Plan: <Cluster Name>

> Шаблон output cluster-mode сессии скилла `hi_flow:arch-redesign`. Заменяй `<placeholder>` конкретным содержимым. Артефакт читается оператором-продуктологом и потребляется как input spec для `superpowers:writing-plans` или эквивалентного impl-toolchain'а.

**Goal:** <Одно предложение — что чиним на архитектурном уровне.>
**Tech Stack:** <Стек проекта — например, TypeScript / Node, Python / Django, Java / Spring.>
**Type:** Refactor (не new feature). Behavior preservation critical. Использовать characterization tests + verify fitness checkpoints, не классический TDD «failing test → impl».
**Date:** YYYY-MM-DD
**Source roadmap:** <ссылка на campaign roadmap, если кластер пришёл из триажа; пусто если direct cluster-mode>
**Source audit:** <ссылка на audit-report, audit_sha=<...>>

---

## Cluster scope

**Корневая причина** (из audit reason-полей через библиотеку принципов): `<принцип из библиотеки>` — <краткая формулировка>.

**Входящие нарушения** (N findings):

- `<finding_id_1>` — <тип>, <severity> — `<source_module>` → `<target_module>`: <reason из audit'а>.
- `<finding_id_2>` — ...
- ...

**Связь с другими кластерами** (если есть, из roadmap):

- Этот кластер блокируется кластером `<X>`. Причина: <...>.
- Этот кластер блокирует кластер `<Y>`. Причина: <...>.

---

## Архитектурное решение

### R1 [decision: <название выбранной альтернативы>] [status: RESOLVED]

**Альтернативы:**

- a) `<Альтернатива 1>` — плюсы: <...>; минусы: <...>.
- b) `<Альтернатива 2>` — плюсы: <...>; минусы: <...>.
- c) `<Альтернатива 3>` — плюсы: <...>; минусы: <...>.

**Решение:** `<выбранная альтернатива>`.

**Обоснование:** <одно-два предложения, почему этот вариант, а не другие>.

**Связи:**

- Принцип библиотеки: `<имя принципа>`.
- Другие развилки в этом плане: `<R2, R3...>` (если есть).

---

## Target state (module-level)

После refactor'а в проекте должно выполняться:

- <Module-level описание новой структуры. Пример: «Существует модуль `src/transport/`, send-path логика перенесена туда из `pipeline/`.»>
- <...>

Формулировка — на уровне модулей и их границ. Без file-level (это работа `superpowers:writing-plans`).

---

## Success criteria (fitness checkpoints)

После исполнения плана все checkpoints должны быть зелёными в `arch-audit`:

1. <Checkpoint 1 в языке audit'а — например, «нет ребра `dispatcher → pipeline`».>
2. <Checkpoint 2 — например, «нет ребра `pipeline → dispatcher` (кольцо разорвано).»>
3. <...>

Verification: запустить `arch-audit`, проверить, что эти инварианты выполняются. Если хоть один checkpoint остаётся красным — см. Stop conditions ниже.

---

## Stop conditions (bail для импл-сессии)

Если в процессе импл-работы:

- **Fitness checkpoint остаётся красным после добросовестных попыток.** Stop, не коммить partial fix. Reason: target architecturally undeliverable as designed. Notify operator: arch-redesign re-engagement may be needed.

---

## Hidden dependencies

Закрытый чеклист — каждый пункт с judgement (`проверено` / `нужна работа` / `закрыто` / `не применимо`):

- **Runtime-зависимости** (config-load order, lazy imports, dynamic dispatch): `<judgement>` — <детали>.
- **Тестовая инфраструктура** (моки на структуре модулей, fixtures, integration tests): `<judgement>` — <детали>.
- **Миграции данных:** `<judgement>` — <детали>.
- **Внешние потребители** (другие репо, клиенты, integrations): `<judgement>` — <детали>.
- **Конфигурация / ENV:** `<judgement>` — <детали>.

---

## Cluster-cluster relations

(заполняется если в triage'е выявлены, иначе пропускается)

- Этот кластер блокирует выполнение кластера `<X>`. Причина: <...>.
- Этот кластер блокируется кластером `<Y>`. Причина: <...>.

---

## Rules-patch

Кандидаты на project rules, генерируемые из fitness checkpoints этого кластера. Patch — отдельный артефакт, не applied автоматически (см. D11 в `ARCHITECTURE.md`).

**Patch-файл:** `docs/superpowers/specs/<date>-arch-redesign-<cluster-name>-rules-patch.yaml`.

**Список правил в patch'е:**

- `<rule-name-1>` — `<тип>` (forbidden / required), severity `<severity>`, principle `<id>`. Соответствует checkpoint'у `<Checkpoint-N>` выше.
- `<rule-name-2>` — `<...>`.
- `<...>`

**Apply через:** `arch-audit apply-patch <patch-file>` — рекомендуется до Phase 3, чтобы прогресс был виден в audit'ах. Альтернативы: дождаться следующего полного audit'а (он сам спросит про un-applied patches), либо handcraft, либо отложить до post-impl.

---

## Notes

- <Опционально: дополнительные замечания, контекст из обсуждения с оператором, ссылки на референсы.>
