# Handoff: D8 schema cascade update после arch-audit design

**Date:** 2026-04-28
**Source session:** дизайн `hi_flow:arch-audit` (2026-04-28).
**Audience:** будущая отдельная сессия для cascade updates D8 schema.

**Назначение:** дать достаточный контекст следующей сессии для синхронизации D8 schema artifact с новыми требованиями из arch-audit спеки.

---

## 1. Что произошло

В сессии arch-audit design (2026-04-28) были введены два новых поля в D8 schema:

1. **`metadata.schema_version`** — semver string, версия D8 schema. Защищает downstream consumers от breaking changes без warning.
2. **`finding.rule_id`** — string, cross-reference к baseline rule или project rule, нарушение которого зафиксировано в finding'е. Дополняет `reason.principle` (principle id) — даёт downstream возможность pull rule definition.

Также — severity normalization fix: D8 schema допускает только `{CRITICAL, HIGH, MEDIUM, LOW}`. Depcruise native severities (`error`, `warn`, `info`) нормализуются adapter'ом arch-audit'а в этот scheme. Schema без изменений в этой части — нужна только проверка, что enum явно ограничен.

---

## 2. Зачем cascade

D8 schema в текущей среде живёт в `hi_flow/skills/arch-redesign/references/d8-schema.md` (provisional draft из arch-redesign design сессии). Оригинальный owner (по дизайн-плану) — arch-audit. Cascade actions:

1. **Перенос D8 schema в `hi_flow/skills/arch-audit/references/d8-schema.md`** (canonical location — arch-audit owns).
2. **Создание `hi_flow/skills/arch-audit/references/d8-schema.json`** — отдельный JSON file для tools (validators, jsonschema cli). См. Self-Review checklist v2 (требование).
3. **Обновление D8 schema:** добавить `metadata.schema_version` (required, default "1.0"), `finding.rule_id` (required), confirm severity enum только {CRITICAL, HIGH, MEDIUM, LOW}.
4. **Замена в arch-redesign references** — старый файл становится pointer'ом на arch-audit canonical location, либо удаляется. Обновить arch-redesign-design.md ссылки.

---

## 3. Что нужно сделать

### 3.1. Создать canonical D8 schema files

**Markdown spec:** `hi_flow/skills/arch-audit/references/d8-schema.md`
- Перенести содержимое из `hi_flow/skills/arch-redesign/references/d8-schema.md`.
- Обновить ownership header: «Owner: hi_flow:arch-audit. Consumers: hi_flow:arch-redesign, hi_flow:arch-spec.»
- Добавить новые поля (см. ниже).
- Обновить anchor-ссылку в ARCHITECTURE.md → D8.

**JSON schema:** `hi_flow/skills/arch-audit/references/d8-schema.json`
- Полная JSON Schema (draft-07 или draft-2020-12) — для использования validators.
- Содержимое 1-в-1 соответствует markdown spec.

### 3.2. Schema additions

**`metadata.schema_version`:**

```json
{
  "metadata": {
    "type": "object",
    "required": ["audit_sha", "schema_version"],
    "properties": {
      "schema_version": {
        "type": "string",
        "pattern": "^\\d+\\.\\d+(\\.\\d+)?$",
        "description": "Semver D8 schema version. Current: 1.0. Защищает downstream от breaking changes."
      }
    }
  }
}
```

**`finding.rule_id`:**

```json
{
  "findings": {
    "type": "array",
    "items": {
      "required": ["id", "rule_id", "type", "severity", "source", "target", "reason"],
      "properties": {
        "rule_id": {
          "type": "string",
          "description": "Cross-reference к baseline rule или project rule. Naming convention: `baseline:no-circular`, `project:custom-rule-name`. Plain rule names допустимы (если не требуется disambiguation). Точный convention — TBD в impl arch-audit."
        }
      }
    }
  }
}
```

**Severity enum confirmation:**

```json
{
  "severity": {
    "type": "string",
    "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
  }
}
```

(Без `error`, `warn`, `info` — depcruise native severities нормализуются adapter'ом arch-audit'а.)

### 3.3. Update arch-redesign references

Старый `hi_flow/skills/arch-redesign/references/d8-schema.md` — варианты:

- **(a) Удалить, обновить ссылки arch-redesign-design.md** на canonical `hi_flow/skills/arch-audit/references/d8-schema.md`.
- **(b) Заменить на pointer-stub** «D8 schema moved to canonical location: `hi_flow/skills/arch-audit/references/d8-schema.md`».

Recommend **(b)** — backward-compat для existing references, не оставляет broken paths.

### 3.4. Update ARCHITECTURE.md

D8 запись в Active Decisions ссылается на provisional location в arch-redesign references. Обновить:

**Было:**
```
**Spec:** required-input contract в `docs/superpowers/specs/2026-04-27-hi_flow-arch-redesign-design.md` (текущая сессия); required-output contract в спеке arch-audit (future session).
```

**Стало:**
```
**Spec:** canonical schema в `hi_flow/skills/arch-audit/references/d8-schema.md` (markdown) + `hi_flow/skills/arch-audit/references/d8-schema.json` (JSON Schema). Consumer contracts в `docs/superpowers/specs/2026-04-27-hi_flow-arch-redesign-design.md` и `docs/superpowers/specs/2026-04-28-hi_flow-arch-audit-design.md`.
```

Также в History — добавить entry «2026-04-XX — D8 schema migration to canonical arch-audit location + schema_version + rule_id fields added.»

---

## 4. Что НЕ делать

- **Не менять semantic D8 contracts** (reason.principle, type enum, severity values уже зафиксированы). Только additions.
- **Не реализовывать tools** (validators, helper scripts) — это impl phase для arch-audit. Cascade сессия — только schema documents.
- **Не трогать D9 library** — она otrhogonal этому cascade.
- **Не trigger'ить ещё одного arch-redesign амендмента** — handoff `2026-04-27-arch-redesign-amend-d11-handoff.md` уже covers амендмент-сессию, эта cascade сессия — pre-cursor.

---

## 5. Order of operations

Recommend:

1. **Сначала эта сессия (D8 schema cascade)** — создать canonical files, добавить новые поля, обновить ARCHITECTURE.md.
2. **Потом arch-redesign амендмент-сессия** (handoff `2026-04-27-arch-redesign-amend-d11-handoff.md`) — уже подхватит обновлённую D8 schema. Также добавить severity normalization update в template'ах.
3. После того и другого — Russian SKILL.md drafting сессия для arch-audit.

Параллелить D8 cascade и arch-redesign амендмент **не рекомендуется** — амендмент работает с D8 schema, нужна свежая.

---

## 6. Метод сессии

Cascade сессия — небольшая. Достаточно:

1. Прочитать этот handoff + текущий `d8-schema.md` в arch-redesign references + arch-audit design spec (Section 8 Output + Section 10 Контракты).
2. Создать новые файлы по plan'у выше.
3. Обновить arch-redesign-design.md ссылки (pointer-stub вариант).
4. Обновить ARCHITECTURE.md → D8 + History entry.
5. Self-Review через изолированного субагента (минимальный — только schema validity и references consistency).
6. Закрыть.

Empirical валидация — наступит при первом боевом прогоне arch-audit (D8 validation в Self-Review checklist v2 + downstream consumption arch-redesign).

---

## 7. Что НЕ парковать

- **Если в cascade сессии вылезут push-back'и** на новые поля или naming conventions — переоткрываем arch-audit спеку, поправляем.
- **rule_id naming convention** (`baseline:`/`project:` prefix vs plain) — open question в arch-audit design (см. Section 11 OQ). Cascade сессия может **finalize convention**, или park'нуть до impl.

---

**Свежей сессии:** прочитать этот handoff + arch-audit design spec + текущий d8-schema.md. Этого достаточно.
