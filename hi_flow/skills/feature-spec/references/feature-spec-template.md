# <Feature name>

**Status:** draft / awaiting operator review / signed (YYYY-MM-DD, operator)

## Sample dialogs

### Happy path: <короткий лейбл>

```
User:  <первое сообщение пользователя>
Bot:   <ответ бота>
User:  <следующий turn>
Bot:   <финальное подтверждение>
```

### Corrected path: <лейбл>

```
<dialog>
```

### Refused / Edge path: <лейбл>

```
<dialog>
```

---

## Цель

<1-3 предложения: какую задачу пользователя закрываем, какую боль/нужду адресуем>

**Out of scope (если применимо):**
- <явные исключения>

<!-- Однострочники Out of scope могут нести опциональный deferral-тег для backlog-sync
     (harvest-якорь 4). Пример — внутри fenced-блока, чтобы closure scan-валидация
     не ловила слово «backlog» в самом шаблоне: -->

```markdown
**Out of scope:**
- Export CSV → backlog
- Tamper-proof хранение → rejected: вне scope baseline; альтернатива — ASVS L2 пакет
- Multi-language интерфейс                      ← без тега: граница scope, не backlog-bound
```

---

## Контракт входа

### От пользователя (raw)

- **field_name** — обязательно/опционально. Формы:
  - <форма 1>
  - <форма 2>

### Из контекста

- **field_name** — тип, источник, обязательность, default

---

## Контракт выхода

- **Запись в БД:** <таблицы / поля / status enum>
- **Возврат пользователю:** <текстовый формат / структура>
- **Side effects:** <шедулинг / нотификации / лог>

---

## Behavior Registry Changes

<!-- Mandatory. Proposed changes to the living Behavior Registry, consumed by arch-spec / implementation-plan / behavior harness.
     Feature specs are historical reasoning records; the Behavior Registry is the living source of truth.
     First scan existing registry/specs semantically by domain/surface/actor/trigger/object/observable.
     If no registry exists, still scan legacy signed specs; do not assume a new-only change-set.
     Default status for new or updated behavior is `automated`; use `manual` / `blocked` / `obsolete` only with a reason.
     Set status from intended durable verification, not current project wiring.
     Keep rows self-contained: no "same as BS-DOC-007" in Then/Observability. Scope guards belong outside this section. -->

**Behavior Registry:** <path or "to be created by implementation-plan/bootstrap">

### Reviewed existing contracts

| Scenario ID | Relation | Classification | Reason |
|-------------|----------|----------|--------|
| BS-DOC-007  | <same actor/action/object> | Updated / Obsoleted / Unchanged related | <why> |

### New

| Scenario ID | Status | Summary | Given | When | Then | Observability | Source |
|-------------|--------|---------|-------|------|------|---------------|--------|
| BS-DOC-018  | automated | <short behavior summary> | <initial externally visible state> | <user/system action> | <expected externally visible outcome> | <API response / DB state / emitted event / UI state / bot reply / eval criterion> | <F1, CC1, sample happy path> |

**Semantic keys for New:** domain=<...>; surface=<...>; actor=<...>; trigger=<...>; object=<...>; observable=<...>.

### Updated

| Scenario ID | Status | Previous expectation | New expectation | Observability change | Reason | Source |
|-------------|--------|----------------------|-----------------|----------------------|--------|--------|
| BS-DOC-007  | automated | <old current registry expectation> | <new expectation> | <none / changed check> | <why behavior changes> | <F2> |

### Obsoleted

| Scenario ID | Replacement / removal reason | Source |
|-------------|------------------------------|--------|
| BS-DOC-003  | replaced by BS-DOC-018 | <F3> |

### Unchanged related

| Scenario ID | Why unchanged |
|-------------|---------------|
| BS-DOC-011  | <related but different trigger/surface/result> |

---

## Поверхности (UX)

<!-- Conditional: только если фича user-facing (есть поверхность, с которой работает человек).
     Слои 1-2 (UX-структура / IA), НЕ слой 3 (визуальная раскладка / компоненты / стиль → arch-spec).
     Калибровка высоты — two-designers test: два дизайнера могут сделать визуально очень разные
     экраны, оба удовлетворяющие этой секции. Если нет — секция диктует визуал → ушла в arch-spec.
     Поверхность ≠ канал: поверхность — где человек работает; канал — транспорт сообщения. -->

**Перечень поверхностей:** <веб-inbox, Telegram-бот, мобильное приложение, ...>

### <Поверхность 1>

- **Назначение:** <зачем эта поверхность, какую задачу пользователя закрывает>
- **Функциональный состав:** <что на ней функционально — какие возможности / данные / действия; НЕ визуал>
- **Ключевые состояния:** <пусто / загрузка / ошибка / заполнено / ...>

### <Поверхность 2>

- **Назначение:** <...>
- **Функциональный состав:** <...>
- **Ключевые состояния:** <...>

**Навигация:** <как человек переходит между поверхностями>

---

## Развилки

### F1. <название> [decision: <что решаем>] [status: <STATUS>]

**Resolution:** <ответ + reasoning>

**Branches [XOR | OR | OPT]:**
- F1.1 — <label> → <action OR see F1.1>
- F1.2 — <label> → <action OR see F1.2>

**Открыто:** <если есть>
**Связи:** <если есть>
**Examples:** <конкретные сценарии>

<!-- Органическая конвенция `**Backlog:**`: под RESOLVED-развилкой, часть под-функций
     которой отложена, перечисли отложенное буллетами под bold-лейблом `**Backlog:**`.
     Это harvest-якорь (anchor 2) для backlog-sync at closure. Пример — fenced, чтобы
     scan-валидация не ловила его как реальное отложенное: -->

```markdown
### F4.2. Фильтр в audit UI [decision: какой набор фильтров] [status: RESOLVED]

**Resolution:** базовый фильтр по event_type. Категорийный фильтр отложен — ниже.

**Backlog:**
- Category filter (security/pipeline) — отложен: требует классификации event_types.
```

---

## Cross-cutting policies

### CC1. <название> [orthogonal] [status: <STATUS>]

**Pre-empts:** <forks которые перебиваются>
**Resolution:** <что бот делает>
**Pattern:** *Если <условие>, то <действие>*

---

## Reusable sub-policies

### P-<NAME>

<блок, описывающий поведение>

**Used in:** <forks где применяется>

---

## Premortem findings

«Через 3 месяца после запуска — какие жалобы пользователей?»

1. **<жалоба>** — <как закрыто или где зафиксировано>
2. ...

<!-- Premortem-пункт может нести deferral-тег `→ backlog` (harvest-якорь 4), если жалоба
     указывает на сознательно отложенную возможность. Пример — fenced: -->

```markdown
4. **<жалоба про отсутствующую возможность>** → backlog
6. **<жалоба>** — absorbed в F1.6                ← без тега: ушло в развилку, не backlog-bound
```

---

## Open items at closure

| ID                | Severity для следующей фазы | Note                      |
|-------------------|------------------------------|---------------------------|
| <fork-id>         | <вероятный блокер / желательно> | <описание>             |
