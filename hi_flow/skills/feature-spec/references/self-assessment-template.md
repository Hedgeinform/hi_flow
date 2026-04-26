# Self-Assessment Proposal Template

При активации скилл генерирует proposal в этом формате (заполняй <placeholders> по контексту):

```
[Self-assessment: hi_flow:feature-spec]

Предлагаю: <brainstorm | direct | skip>
Причина: <одно-два предложения, почему именно этот путь>

Факторы:
- Input completeness: <high | medium | low>
- Scope: <small | medium | large>
- Stakes: <low | high>
- Similarity: <new | template available>
- Cross-feature touches: <isolated | many>

Подтверди / измени.
```

## Heuristics для определения каждого фактора

**Input completeness:**
- *high* — оператор уже дал список forks с альтернативами или решениями.
- *medium* — оператор описал общую идею + несколько specifics.
- *low* — однострочник или vague description.

**Scope:**
- *small* — ожидаемо ≤ 3-4 forks; одна tool / простая фича.
- *medium* — 5-10 forks; стандартная фича.
- *large* — 10+ forks; крупная фича с многими аспектами.

**Stakes:**
- *low* — нейтральный домен (UI, settings, list/fetch).
- *high* — медицина / финансы / privacy / safety / age / vulnerability.

**Similarity:**
- *new* — первая в своём роде.
- *template available* — есть похожая существующая фича в проекте.

**Cross-feature touches:**
- *isolated* — фича не взаимодействует с существующими.
- *many* — фича читает/пишет/триггерит несколько существующих модулей.

## Когда какой path рекомендовать

**Skip:**
- Чистый refactor / cosmetic change / fix опечатки. Нет продуктовой составляющей.

**Direct:**
- Все условия одновременно: input=high, scope=small, stakes=low, similarity=template available, cross-feature=isolated.

**Brainstorm (default):**
- Любой случай, не подходящий под Direct.
- В сомнении — brainstorm.
