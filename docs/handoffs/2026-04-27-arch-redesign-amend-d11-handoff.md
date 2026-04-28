# Handoff: amend `hi_flow:arch-redesign` для D11 (rules-patches как второй output cluster-mode)

**Date:** 2026-04-27
**Source session:** дизайн `hi_flow:arch-audit` (2026-04-27, в процессе).
**Audience:** будущая отдельная сессия амендмента arch-redesign.

**Назначение документа:** дать достаточный контекст для focused amendment-сессии — без необходимости перечитывать всю arch-audit design сессию.

---

## 1. Что произошло

В arch-audit design сессии вскрылась дыра в существующем дизайне arch-redesign: **gap между fitness checkpoints в refactor plan'е и project rules в depcruise config'е**.

Текущий arch-redesign-design.md в секциях 4-5 говорит:
- cluster-mode производит refactor plan с fitness checkpoints («нет ребра X → Y» в языке audit'а).
- arch-redesign **не пишет** в project rules-файл — это «Phase 3 территория после исполнения refactor'а».

Но Phase 3 = superpowers writing-plans + executing-plans. У них **нет логики** «возьми fitness checkpoint из плана и положи в depcruise config». Они просто выполнят TDD-задачи. Получается gap: checkpoints планируются → код пишется → но rules не закрепляются автоматически. Через несколько рефакторов накапливается silent decay — refactor plans есть, project rules не растут, arch-audit ругается на старые violations, новые правила «потерялись».

---

## 2. Архитектурное решение, которое уже принято (D11)

См. `ARCHITECTURE.md` → D11 + History 2026-04-27.

Распределение ownership:
- **arch-audit** owns project rules-файл: read, validate, apply, baseline.
- **arch-spec** и **arch-redesign** генерируют rules-patches как **второй output** их основной работы.
- **Patches — отдельные артефакты-кандидаты**, не пишутся в rules-файл автоматически.
- **Apply — explicit operator action:** команда `arch-audit apply-patch <path>` или interactive prompt при следующем нормальном audit прогоне (он сам сканирует pending patches и спрашивает).
- **Валидация patch'а** перед merge — ответственность arch-audit.

Это закрывает silent decay (через pending detection в arch-audit) при сохранении trust boundary (нет автозаписи в config из чужого скилла).

D11 фиксация — done. Амендмент arch-redesign — отдельная сессия (эта).

---

## 3. Что нужно изменить в arch-redesign

### 3.1. В дизайн-спеке `docs/superpowers/specs/2026-04-27-hi_flow-arch-redesign-design.md`

**Секция 1 — «Выходные артефакты».** Добавить третий артефакт:

> - **Rules-patch** (cluster-mode, по одному файлу на cluster session): `docs/superpowers/specs/<date>-arch-redesign-<cluster-name>-rules-patch.yaml`. Кандидаты на новые project rules, соответствующие fitness checkpoints этого кластера. Не applied автоматически — apply через `arch-audit apply-patch <path>` или через pending prompt при следующем audit прогоне.

**Секция 4 — «Cluster-mode».** Расширить шаг 3 (целевое состояние + fitness checkpoints):

После определения fitness checkpoints в формате audit'а — **скилл генерирует rules-patch**. Каждый checkpoint конвертируется в depcruise rule (формат TBD в arch-audit design сессии — см. секцию 6 этого handoff'а). Patch — отдельный YAML-файл. В refactor plan'е есть ссылка на patch + краткий список «какие правила добавляются».

**Секция 4 — «Формат output (refactor plan)».** Добавить секцию в template'е plan'а:

```markdown
## Rules-patch

Кандидаты на project rules, генерируемые из fitness checkpoints этого кластера.

**Patch-файл:** `<date>-<cluster>-rules-patch.yaml`

**Список правил в patch'е:**
- `no-dispatcher-to-pipeline` — boundary, severity HIGH.
- `no-pipeline-to-dispatcher` — boundary, severity HIGH.
- `transport-module-exists` — structural, severity MEDIUM.

**Apply через:** `arch-audit apply-patch <patch-file>` (рекомендуется до Phase 3 — прогресс будет виден в audit'ах) либо handcraft, либо отложить до post-impl.
```

**Секция 4 — «Transition offer (после approval)».** Расширить с тремя опциями до четырёх (или в текст добавить упоминание patch'а):

> Refactor plan + rules-patch для кластера `<cluster-name>` готовы и записаны:
> - План: `<plan-path>`
> - Patch: `<patch-path>` (не applied)
>
> Patch применишь когда захочешь: `arch-audit apply-patch <patch-path>` (рекомендуется до Phase 3, чтобы прогресс был виден в audit'ах) или дождись следующего полного audit'а — он сам спросит про un-applied patches.
>
> Что дальше:
> 1. Перейти к следующему кластеру по roadmap (`<next-cluster-name>`).
> 2. Передать этот план в Phase 3 (рекомендуем `superpowers:writing-plans`); к остальным кластерам вернёмся позже.
> 3. Остановиться.

**Секция 5 — «Контракты с другими скиллами».** В подразделе «Shared family resources (read-only для arch-redesign)» — переписать пункт «Активные fitness functions проекта»:

Старая версия говорит «arch-redesign читает, чтобы не предлагать решений, ломающих существующие инварианты. **Не пишет напрямую** — это Phase 3 территория».

Новая версия:
- arch-redesign **читает** project rules (из файла) — чтобы не предлагать решений, ломающих существующие инварианты. Без изменений.
- arch-redesign **генерирует rules-patch** как второй output cluster-mode — кандидата на расширение rules. Apply через arch-audit, не напрямую.
- Старая фраза «не пишет напрямую» остаётся истинной: запись в основной rules-файл идёт **только через arch-audit**, не из arch-redesign.

**Секция 7 — Open Questions.** Удалить упоминание «формат rules-файла», если оно там есть (закрывается в arch-audit design сессии).

### 3.2. В Self-Review checklist для cluster-mode (секция 4 design'а)

Добавить пункт:
- **Rules-patch generation.** Каждый fitness checkpoint имеет соответствующий rule в rules-patch'е. Patch синтаксически валиден. Имена правил в patch'е соответствуют именам checkpoints в плане (для трассируемости).

### 3.3. В SKILL.md `hi_flow/skills/arch-redesign/SKILL.md`

Амендмент cluster-mode workflow (шаг 3 + closure). Полный список изменений выявить при чтении текущего SKILL.md против этого handoff'а.

### 3.4. Новый template `hi_flow/skills/arch-redesign/references/rules-patch-template.yaml`

Шаблон для rules-patch'а. Структура — depcruise YAML rules (или формат, согласованный с arch-audit baseline rule format в текущей сессии).

Минимальный пример:

```yaml
# Rules patch: <cluster-name>
# Generated: <date>
# From refactor plan: <path>

forbidden:
  - name: no-dispatcher-to-pipeline
    severity: error
    from:
      path: ^src/dispatcher/
    to:
      path: ^src/pipeline/
    principle: acyclic-dependencies

  - name: no-pipeline-to-dispatcher
    severity: error
    from:
      path: ^src/pipeline/
    to:
      path: ^src/dispatcher/
    principle: acyclic-dependencies

required:
  - name: transport-module-exists
    severity: warn
    description: Module 'src/transport/' must exist.
    principle: port-adapter-separation
```

Каждое правило обязано иметь поле `principle` — ссылку на canonical principle id в D9 библиотеке. Это требование D8 (semantic reason-field) применённое к rules.

---

## 4. Что НЕ меняется

- Основной workflow cluster-mode (4 шага probing taxonomy).
- Self-Review + User Review Gate структура (canonical Anthropic pattern).
- Escape valve для mis-grouped кластеров.
- Стратегическая позиция arch-redesign в семействе (D7).
- Triage-mode полностью.

Амендмент локальный — только cluster-mode, только output structure, только transition offer. Probing taxonomy не трогается.

---

## 5. Открытые вопросы для амендмент-сессии

- **Granularity rules-patch.** Один patch на cluster (моя рекомендация) или один patch на fitness checkpoint (мельче — больше файлов)? Пока — один на cluster.
- **Apply timing — рекомендация vs дефолт.** Где в transition offer ставить дефолтный путь — «применить сейчас» (auto-apply через invocation arch-audit) или «отложить» (pending). Зависит от того, насколько часто оператор будет хотеть «прогресс виден в audit'ах» vs «не загромождать audit пока импл не закончен».
- **Что делать, если patch не валидируется arch-audit'ом.** Validation fail в момент apply — arch-audit отказывает. Что делает arch-redesign? Регенерирует patch? Просит оператора руками править? — обсудить.

---

## 6. Зависимость от arch-audit design сессии

**Точный формат rules-patch'а и команды `arch-audit apply-patch`** — design в arch-audit сессии. Завершено 2026-04-28. См. `docs/superpowers/specs/2026-04-28-hi_flow-arch-audit-design.md` (Section 7 Apply-patch mode).

**Дополнительные cascade actions, которые амендмент-сессия должна учесть** (после или одновременно с амендментом — зависит от order of operations с D8 cascade сессией):

1. **Severity normalization changes.** D8 schema severity enum жёстко ограничен {CRITICAL, HIGH, MEDIUM, LOW} — без `error`/`warn`/`info`. Текущий `rules-patch-template.yaml` (если использует depcruise native severities) — обновить на normalized values. См. arch-audit baseline rules draft v3 «Severity normalization» section.
2. **`schema_version` field в metadata.** Patches теперь могут включать `metadata.schema_version: "1.0"` (optional но recommended).
3. **`rule_id` field в каждом rule patch'а.** Convention TBD в D8 cascade сессии; rules-patch-template должен accommodate after.
4. **Project rules path** — canonical `<project>/.audit-rules.yaml` в root. Patch references в rules-patch-template должны это отражать (apply'ятся в этот путь).

**Order of operations recommendation:**
1. D8 schema cascade сессия (handoff `2026-04-28-d8-schema-cascade-handoff.md`) — first, обновляет canonical schema.
2. Эта арх-redesign амендмент-сессия — second, использует обновлённую schema + cascade items выше.

Параллельно — risk rework на rules-patch-template.

---

## 7. Метод сессии

Амендмент мелкий — не полная re-design сессия. Достаточно:
1. Прочитать существующую arch-redesign design.md + SKILL.md.
2. Прочитать этот handoff + ARCHITECTURE.md → D11 + arch-audit final design.md.
3. Внести изменения в design.md (амендмент-секция с датой и обоснованием).
4. Обновить SKILL.md cluster-mode workflow + transition offer + closure.
5. Создать rules-patch template.
6. Self-Review через изолированного субагента (legality амендмент'а — что не сломали core workflow).
7. User Review Gate.

Empirical валидация — после первого боевого прогона полного цикла.

---

## 8. Что НЕ парковать

- **Если в амендмент-сессии вылезет push-back на формат rules-patch'а из arch-audit спеки** — переоткрывать arch-audit спеку. Не молчаливо отклоняться.
- **Pending detection mechanism в arch-audit** — это её ответственность, не arch-redesign'а. Не пытайся проектировать здесь.

---

**Свежей сессии:** прочитать этот handoff + текущий arch-redesign-design.md + SKILL.md + ARCHITECTURE.md → D11 + готовую arch-audit-design.md (когда будет). Этого достаточно для амендмента.
