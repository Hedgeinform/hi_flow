# Mermaid Preview — пример диаграммы зависимостей кластеров

Это preview-файл, не артефакт скилла. Открой в Markdown viewer'е (GitHub, IDE с Mermaid-расширением, Obsidian, Markdown Preview Enhanced в VS Code и т.д.) — диаграмма ниже должна отрендериться как графическое изображение. Если видишь только текст в code block'е — viewer не поддерживает Mermaid.

---

## Образец: campaign roadmap фрагмент с диаграммой зависимостей

**Сценарий-плейсхолдер:** проект-условный, в аудите выявлено 6 кластеров архитектурного долга, между ними есть зависимости.

### Кластеры в кампании

| ID | Название | Корневая причина | Размер | Приоритет |
|----|----------|------------------|--------|-----------|
| C1 | Send-path tangle | Нет выделенного transport-слоя | 7 findings | CRITICAL |
| C2 | Tool layer bypass | Бизнес-логика goal обходит dispatcher | 2 findings | HIGH |
| C3 | Pre-processors purity | Pre-processors зовут pipeline обратно | 5 findings | HIGH |
| C4 | Channel-agnostic violation | Validator/notifications импортируют channels | 2 findings | CRITICAL |
| C5 | Tools cross-coupling | Tools импортируют друг друга напрямую | 1 finding | MEDIUM |
| C6 | Config-observability init cycle | Циклическая инициализация | 1 finding | MEDIUM |

### Таблица зависимостей

| Что от чего зависит | Тип зависимости | Объяснение |
|---------------------|------------------|------------|
| C2 → C1 | Технический блокер | Tool routing зависит от transport-слоя, который выделяется в C1 |
| C4 → C1 | Технический блокер | Channel-agnostic restoration в notifications проще после extract transport/ |
| C3 ↔ ничего | Independent | Может идти параллельно остальным |
| C5 ↔ ничего | Independent | Изолированный, не блокирует другие |
| C6 ↔ ничего | Independent | Изолированный, не блокирует другие |

### Диаграмма зависимостей (Mermaid)

```mermaid
flowchart TD
    C1["C1 — Send-path tangle<br/>CRITICAL · 7 findings"]
    C2["C2 — Tool layer bypass<br/>HIGH · 2 findings"]
    C3["C3 — Pre-processors purity<br/>HIGH · 5 findings"]
    C4["C4 — Channel-agnostic<br/>CRITICAL · 2 findings"]
    C5["C5 — Tools cross-coupling<br/>MEDIUM · 1 finding"]
    C6["C6 — Config-observability init<br/>MEDIUM · 1 finding"]

    C1 --> C2
    C1 --> C4

    classDef critical fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef high fill:#ffd43b,stroke:#f08c00,color:#000
    classDef medium fill:#74c0fc,stroke:#1971c2,color:#000

    class C1,C4 critical
    class C2,C3 high
    class C5,C6 medium
```

### Рекомендуемый порядок проработки

1. **C1** — первым (CRITICAL, разблокирует C2 и C4 через extract transport/).
2. **C4** — после C1 (вторая половина channel-agnostic — notifications уже сидит на transport-слое).
3. **C3** — параллельно с C1 / C4 (independent, HIGH severity, 5 findings — стоит momentum).
4. **C2** — после C1 (требует устаканенного transport-слоя).
5. **C5**, **C6** — в конце, по очереди (independent, MEDIUM, мелкие).

---

## Что в этом примере проверять

- **Текст диаграммы рендерится как графика?** Если да — Mermaid в твоём окружении работает.
- **Цветовая дифференциация по severity** (через `classDef`) — видна?
- **Подписи на двух строках** (через `<br/>`) — отрисовываются корректно?
- **Стрелки направлены логично** (от блокирующего к блокируемому)?
- **При увеличении количества узлов до 10-15** диаграмма всё ещё читается? (этот тест на боевых данных будет, не сейчас).

---

## Несколько вариантов layout'а

Mermaid поддерживает разные направления — можно подобрать по вкусу:

### `flowchart LR` (left-to-right) — компактнее по вертикали

```mermaid
flowchart LR
    C1["C1 — Send-path"] --> C2["C2 — Tool bypass"]
    C1 --> C4["C4 — Channel-agnostic"]
    C3["C3 — Pre-processors purity"]
    C5["C5 — Tools cross"]
    C6["C6 — Config-obs cycle"]
```

### `graph TB` (top-bottom, более formal стиль)

```mermaid
graph TB
    C1[Send-path tangle]
    C2[Tool layer bypass]
    C3[Pre-processors purity]
    C4[Channel-agnostic]
    C5[Tools cross-coupling]
    C6[Config-observability cycle]

    C1 -.blocks.-> C2
    C1 -.blocks.-> C4
```

---

**Этот файл можно удалить после просмотра** — это sandbox для проверки рендера, не часть проекта.
