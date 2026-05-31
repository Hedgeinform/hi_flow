# <Product> — Backlog

[Метаданные: дата создания, дата последнего обновления, версия структуры]

## Iteration index

| Дата | Slug | Статус | Spec |
|------|------|--------|------|

(пусто на старте; запись добавляется при closure каждой итерации)

## Committed features

[Asymmetric pointers — см. форматы ниже. Сгруппированы по фичам для читаемости.]

(пусто на старте; entries добавляются при closure итерации — in-scope functions migrate как pointers)

<!--
Terminology: «Committed» = функция в спеке со статусом signed или shipped (commitment по продуктовому дизайну). Не значит «отгружено в production» — статус реальной отгрузки фиксируется отдельно полем `Статус` в Iteration index.

Pointer formats:

**Committed enabler** (5-6 строк, нужны Входит / Не входит для scope match при reuse):

### F-<feature-slug>-N. <Name> [committed iter<N>: <slug>]
**Фича:** <Feature name>
**Type:** enabler
**Назначение:** <одна строка>
**Входит:** <что покрывает>
**Не входит:** <что явно за рамками>
**Spec:** <path to originating spec> § F-<feature-slug>-N

**Committed domain** (3 строки — name-level dedup, scope inquiry через spec read on-demand):

### F-<feature-slug>-N. <Name> [committed iter<N>: <slug>]
**Фича:** <Feature name>
**Type:** domain
**Назначение:** <одна строка>
**Spec:** <path to originating spec> § F-<feature-slug>-N

При появлении entries сгруппировать их по фичам:

### Фича: <Feature name>
[committed enabler / domain pointers]
-->

## Parked features

[Полный контент. Каждая запись имеет level — detailed / partial / note / fragment.]

(пусто на старте; entries добавляются при closure — parked-this-iteration features migrate с full content + level + reason for parking)

<!--
Level definitions:
- `detailed` — полная карточка D6 (все поля заполнены), reasoning'и проработаны
- `partial` — часть полей карточки заполнена (Назначение + 1-2 других), остальное TBD
- `note` — 2-5 строк свободного текста с описанием идеи
- `fragment` — 1 строка — keyword или вопрос

Template entry (named fields — это формат-авторитет для shared `backlog-integration` механизма; `**Originating analysis:**` — канонический ключ идемпотентности downstream-контрибуций, D22):

### F-<feature-slug>-X[-<suffix>]. <Name> (level: <detailed|partial|note|fragment>)
**Status:** parked
**Originating analysis:** <spec-path> § <fork-id>
**Reason for parking:** <причина>
**Carry-over candidate for:** <target iteration / phase>
**Описание:** <опционально — для note/partial: full card как была на момент парковки>

ID: `-X` маркирует parked (не committed); `-<suffix>` — опциональный короткий kebab-тег для нескольких отложенных пунктов одной фичи (`F-audit-X-export`, `F-audit-X-category-filter`); опускается когда фича паркует один пункт (`F-objects-X`).
-->

## Deferred strategic forks

(пусто на старте; entries добавляются при closure — deferred forks migrate с full cell + reason for deferring)

<!--
Template entry:

### Sf-<N>. <Fork name>
[full cell + reason for deferring + originating spec]
-->

## Out-of-scope (rejected)

(пусто на старте; entries добавляются при closure — rejected features migrate как one-liner с причиной)

<!--
Template entry:

- F-<feature-slug>-Z. <Name> — отвергнуто iter<N>, причина: <одна фраза>; альтернатива — <если есть>.
-->

## Standing cross-cutting policies

(пусто на старте; pointer добавляется когда CC помечена как cross-iteration или повторно вводится в новой итерации)

<!--
Template entry:

- CC<N>. <Name> → spec <path to originating spec> § CC<N>.
-->
