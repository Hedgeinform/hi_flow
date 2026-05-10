# <Product> — Backlog

[Метаданные: дата создания, дата последнего обновления, версия структуры]

## Iteration index

| Дата | Slug | Статус | Spec |
|------|------|--------|------|

(пусто на старте; запись добавляется при closure каждой итерации)

## Shipped features

[Asymmetric pointers — см. форматы ниже. Сгруппированы по модулям для читаемости.]

(пусто на старте; entries добавляются при closure итерации — in-scope features migrate как pointers)

<!--
Pointer formats:

**Shipped enabler** (5-6 строк, нужны Входит / Не входит для scope match при reuse):

### F-<module>-N. <Name> [shipped iter<N>: <slug>]
**Module:** <Module>
**Type:** enabler
**Назначение:** <одна строка>
**Входит:** <что покрывает>
**Не входит:** <что явно за рамками>
**Spec:** <path to originating spec> § F-<module>-N

**Shipped domain** (3 строки — name-level dedup, scope inquiry через spec read on-demand):

### F-<module>-N. <Name> [shipped iter<N>: <slug>]
**Module:** <Module>
**Type:** domain
**Назначение:** <одна строка>
**Spec:** <path to originating spec> § F-<module>-N

При появлении entries сгруппировать их по модулям:

### Module: <Module name>
[shipped enabler / domain pointers]
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

Template entry:

### F-<module>-X. <Name> (level: <detailed|partial|note|fragment>)
[full card как была на момент парковки + reason for parking + originating spec]
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

- F-<module>-Z. <Name> — отвергнуто iter<N>, причина: <одна фраза>; альтернатива — <если есть>.
-->

## Standing cross-cutting policies

(пусто на старте; pointer добавляется когда CC помечена как cross-iteration или повторно вводится в новой итерации)

<!--
Template entry:

- CC<N>. <Name> → spec <path to originating spec> § CC<N>.
-->
