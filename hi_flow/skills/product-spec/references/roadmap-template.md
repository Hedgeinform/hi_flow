# <Product> — План реализации (итерация <N>)

[Метаданные: дата создания, статус, исходная спека, общая статистика. Заполнить при generation.]

**Дата создания:** YYYY-MM-DD
**Статус:** signed (план зафиксирован) | shipped (итерация отгружена)
**Исходная спека:** ../YYYY-MM-DD-<product-slug>-<iteration-slug>-product-spec.md
**Всего блоков:** N
**Всего функций:** M

---

## Последовательность реализации

Порядок блоков с учётом межблочных зависимостей. Каждый блок реализуется после своих предшественников. Блоки без относительной зависимости (отмечены «Взаимозаменяем с:») можно делать в любом порядке или параллельно.

<!--
Skeleton entry для одного cluster'а. Скилл заполняет per cluster в топологическом порядке.

Поля:
- Заголовок: `### N. <Human name> (<slug>)` — N это позиция в топологическом порядке (1, 2, 3...).
  Human name — plain Russian, 1-3 слова, отражает суть блока. Slug — стабильный идентификатор, kebab-case
  (по умолчанию = module-slug, при splits — operator-defined типа `tickets-intake`).
- **Назначение:** — 1-2 строки plain-language summary, что блок делает в продукте. Derivation rule:
  LLM-aggregation Назначений функций кластера + cluster slug semantics. Operator review мандаторен
  (продуктовое решение).
- **Функции:** — список F-ID функций в блоке + общее количество. Cross-reference в спеку: § F-... .
- **Реализуем после:** — список upstream cluster names (human names). «ничего (это первый блок)»
  если нет upstream.
- **Дальше используется в:** — список downstream cluster names (human names). «нигде (это последний блок)»
  если нет downstream.
- **Взаимозаменяем с:** — list peer cluster names. Появляется ТОЛЬКО при tie-break в топо-sort'е
  (нет относительной зависимости с peer'ами). Иначе omit field целиком.
- **Статус:** — initial value «запланирован». Mutable single field в plan'е (manual operator update
  по мере реализации в v0.6.0; auto-callback от feature-spec — v0.6.1+).
- **Контекст для feature-spec:** — markdown-link на bundle файл. Relative path.

Plain language constraint: plain Russian, без англицизмов. Slug'и и F-ID — stable identifiers,
не переводятся. Per Operational Rule 11.
-->

### 1. <Human name блока> (<slug>)
**Назначение:** 1-2 plain-language строки, что блок делает в продукте.
**Функции:** F-..., F-... (N штук).
**Реализуем после:** <upstream cluster names>, или «ничего (это первый блок)».
**Дальше используется в:** <downstream cluster names>, или «нигде».
**Взаимозаменяем с:** <peer cluster names> — поле появляется ТОЛЬКО при tie-break, иначе omit.
**Статус:** запланирован | в работе | готов.
**Контекст для feature-spec:** [bundle-<slug>.md](./bundle-<slug>.md)

### 2. ...

<!--
Optional section ниже — только если есть standing-policy candidates (Sub-phase 5 decomposition).
Если кандидатов нет — секция полностью omitted (не пишем «нет кандидатов»).
-->

## Кандидаты в standing policies (опционально)

Эти сквозные политики потенциально применимы ко всем будущим итерациям продукта. Можно явно зафиксировать как standing в backlog § Standing cross-cutting policies — это сэкономит дублирование в спеках следующих итераций.

- **CC<N>.** <CC name>.
- **CC<M>.** <CC name>.

Полный mechanism standing-policy auto-detection и migration — дизайн v0.7. Здесь — только flagging. Зафиксировать сейчас можно вручную в backlog.
