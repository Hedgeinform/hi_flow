# Контекст для feature-spec: <Human name> (<slug>)

[Метаданные: итерация, ссылка на исходную спеку. Заполнить при generation.]

**Итерация:** <N>
**Исходная спека:** ../../YYYY-MM-DD-<product-slug>-<iteration-slug>-product-spec.md

---

<!--
Skeleton bundle файла. 8 секций, каждая ВСЕГДА присутствует — даже если пусто
(visibility принцип: оператор видит что скилл проверил).

Per-section derivation rules:

1. Функции этого блока — cluster membership. F-id (Name) + § ref + 1-line из Назначение.
   Filter: только функции, входящие в данный cluster (определён в Sub-phase 1).

2. Зависим от (working pre-conditions) — `Зависит от` функций кластера, отфильтровано на функции ВНЕ кластера.
   F-id (Name) + § ref + 1-line summary + ссылка на upstream cluster slug.

3. Используется (downstream consumers) — reverse pass на `Зависит от` всех функций спеки.
   Кто извне кластера зависит от наших функций. F-id (Name) + § ref + 1-line + downstream cluster slug.

4. Сквозные политики, применимые к блоку — § Сквозные политики + `Применяется к` filter.
   VERBATIM full CC entry. CC помеченные «всем функциям» — включаются всегда.

5. Стратегические развилки — § Стратегические развилки + `Связи:` filter mentioning ≥1 cluster function.
   VERBATIM full Sf entry. Только RESOLVED статусы (DEFERRED мигрированы в backlog при Шаге 12.3,
   не reads backlog в v0.6.0).

6. Из бэклога — отброшенное / отложенное — cluster cards' `Не делаем вообще` + backlog § Parked match.
   Если semantic match → pointer + audit marker `[matched semantically from carded phrase «...»]`.
   Если match fail → verbatim phrase без backlog ref.

7. Группы пользователей — § Section 2 + `Доступно группам` функций кластера.
   VERBATIM group definition. Groups mentioned by ≥1 cluster function.

8. Сценарии — § Section 9 + scenario references. VERBATIM scenario text.
   Scenarios mentioning ≥1 cluster function by F-id.

Plain language constraint: bundle — operator-facing артефакт. Pointer'ы и F-ID — stable identifiers,
не переводятся. Free text (1-line summaries, edge case explanations) — plain Russian.
Per Operational Rule 11.

Если секция пусто после filter'а — оставить заголовок + короткая placeholder фраза
(см. примеры ниже). Не omit'ать секции — visibility принцип.
-->

## Функции этого блока

- **F-...** (<Название>) — § F-... в спеке. Назначение: <1-line из карточки>.
- **F-...** (<Название>) — § F-... в спеке. Назначение: <1-line>.

## Зависим от (working pre-conditions)

Эти функции должны быть готовы перед началом реализации этого блока. Их feature-spec / реализация — upstream.

- **F-...** (<Название>) — § F-... в спеке. Назначение: <1-line>. Из блока: <upstream cluster slug>.

(Если пусто после filter'а — оставить: «Блок не зависит от других в этой итерации.»)

## Используется (downstream consumers)

Эти функции будут использовать результат этого блока. Их feature-spec — downstream.

- **F-...** (<Название>) — § F-... в спеке. Назначение: <1-line>. Из блока: <downstream cluster slug>.

(Если пусто после filter'а — оставить: «Блок не имеет потребителей в этой итерации.»)

## Сквозные политики, применимые к блоку (verbatim из спеки)

### CC<N>. <Название>
**Применяется к:** F-..., F-... | всем функциям
**Resolution:** <verbatim из спеки>
**Pattern:** <verbatim из спеки, если есть>

(Если пусто после filter'а — оставить: «Сквозные политики не применяются к функциям блока.»)

## Стратегические развилки, упоминающие функции блока (verbatim из спеки)

### Sf<N>. <Название> [decision: <decision text>] [status: RESOLVED]
**Resolution:** <verbatim>
**Branches [XOR | OR | OPT]:**
- Sf<N>.1 — <label> → <impact>
- Sf<N>.2 — <label> → <impact>
**Связи:** F-..., F-...

(Если пусто после filter'а — оставить: «Развилки итерации не упоминают функции блока.»)

## Из бэклога — отброшенное / отложенное

(Упоминания в `Не делаем вообще` карточек функций блока. При semantic match с backlog parked entry — pointer + audit marker; если match не найден — verbatim phrase без ref.)

- **F-...** (<Название>) — parked, level: <detailed|partial|note|fragment>. Reason: <reason>. См. backlog § Parked features. **[matched semantically from carded phrase «<original text>»]**
- «<verbatim фраза из «Не делаем вообще» карточки кластера, не resolved'и в backlog>».

(Если пусто после filter'а — оставить: «Карточки блока не ссылаются на отложенное.»)

## Группы пользователей, использующие функции блока (verbatim из спеки)

### <Group name>
<verbatim group definition из § Section 2>

(Если пусто после filter'а — оставить: «Функции блока без group-specific access — общедоступны.»)

## Сценарии работы, упоминающие функции блока (verbatim из § Section 9 спеки)

### Сценарий: <название>
<verbatim narrative из спеки>

(Если пусто после filter'а — оставить: «В § Section 9 спеки сценариев с функциями блока нет.»)
