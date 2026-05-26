# Handoff: hi_flow:product-spec v0.6.0 — decomposition phase design

**Date:** 2026-05-26
**Source session:** Retrospective REH-ERP integration + happy-path анализ 2026-05-26.
**Audience:** будущая design-сессия по v0.6.0 (decomposition phase). Otherwise self-contained — не предполагает доступа к conversation transcript'у.

**Назначение документа:** дать достаточный контекст следующей сессии, чтобы она стартовала с осмысленного места без перечитывания транскрипта source-сессии.

---

## 1. Что произошло в source-сессии

В сессии 2026-05-26 оператор задал happy-path вопрос: «куда я иду после product-spec REH-ERP?». Анализ свеже-подписанной product-spec (33 функции, 10 модулей, 7 Sf-резолюций, 2 CC) на вход feature-spec выявил структурный gap между двумя скиллами:

- **product-spec output:** замороженная спека на N функций (33 в REH-ERP) с dependency graph через поле `Зависит от` в карточках.
- **feature-spec input:** одна функция или кластер функций с локальным контекстом (upstream/downstream, CC, Sf).

Между ними отсутствовал механизм: (а) кластеризация функций в feature-spec сессии, (б) топологический sort по DAG, (в) передача релевантного контекста (CC, Sf, upstream/downstream, parked refs) в feature-spec на вход.

Series trade-off обсуждений (отдельный скилл `iteration-plan` vs расширение feature-spec vs расширение product-spec) завершилась решением **D17 — decomposition phase = closure-phase product-spec'а, не отдельный скилл**. Подробности обоснования — в самом D17 (ARCHITECTURE.md) + History 2026-05-26.

Параллельно та же сессия выявила 13 retrospective improvement пунктов от REH-ERP (сверх того, что уже закрыто в v0.5.0 per D15). Эти пункты вынесены в **отдельный** design v0.7.0 с deferred implementation — это **out of scope** текущего handoff'а, см. `2026-05-26-product-spec-v0.7-retrospective-improvements-handoff.md`.

---

## 2. Что в scope, что вне scope

**В scope этой design-сессии:**

Проектирование decomposition phase product-spec для v0.6.0. Output — `docs/superpowers/specs/2026-05-26-hi_flow-product-spec-v0.6-decomposition-design.md`. Спека должна определить (см. §3-§4).

**Не в scope:**

- 13 retrospective improvement пунктов v0.7.0 — отдельный design.
- Изменения в `hi_flow:feature-spec` SKILL.md, чтобы он умел читать bundle на вход — это **open question** §6, решается в этой сессии (включать в v0.6.0 или amendment в feature-spec отдельно), но **дизайн feature-spec changes** — отдельная сессия, не эта.
- arch-spec scope — не трогаем, ещё не реализован.
- Migration mechanism для legacy backlog terminology (Shipped→Committed) — отложено.

---

## 3. Design-сессия — границы и структура

### 3.1. Что считается успехом

Spec должна определить:

1. **Where decomposition phase runs.** После Шага 12.4 (`signed` transition) или integrated в 12.4 как explicit gate? Если integrated — какой gate prompt оператору?
2. **Trigger mechanism.** Auto vs operator-gated. Если operator-gated — что значит «нет, не нужно decomposition этой сессией»? Откладывание или не делать вовсе?
3. **Кластеризация functions в feature-spec sessions.** Default — module-level (один модуль = один кластер)? Cross-module lifecycle случаи (F-tickets-1..5 + F-comm-2 upstream — один lifecycle, разные модули) — как обрабатываются?
4. **Topological sort.** Алгоритм по полю `Зависит от` в карточках. Output — упорядоченная последовательность кластеров для feature-spec sessions. Циклы — блокирующая ошибка (уже есть в Шаге 12.2 integrity check).
5. **Bundle card format.** Lightweight pointers (см. §4) — что конкретно в каждой карточке. Verbatim для коротких items (CC, Sf), pointers для длинных (function cards).
6. **Output artefact format.** Третий файл `<product-slug>-iteration-<N>-plan.md` рядом с product-spec и backlog. Структура: roadmap (ordered cluster list) + bundle cards per cluster.
7. **Behavior в update mode.** При добавлении/удалении/разделении/слиянии функций в активной спеке — re-decomposition автоматически или manual trigger? Affected кластеры — все или только затронутые?
8. **Behavior в new iteration mode.** Только новые функции попадают в новый plan. Функции из § Committed backlog'а (previous iterations) переиспользуются через committed pointer в bundle, не feature-spec'аются заново.
9. **Accommodation смежных retrospective пунктов.** Пункт 11 (standing-policy checker при closure) и пункт 14 (backlog terminology) — частично intersect с decomposition phase. Включить минимальное, не полный fix (полный fix — в v0.7.0 design).
10. **Размер v0.6.0.** Incremental amendment v0.5.0 (как D15 был для v0.5.0) или major bump? Affects whether design spec — amendment-style or full new design.

### 3.2. Что предсказуемо сложно

**Re-decomposition в update mode.** При добавлении функции — нужно ли перегенерировать все bundles или только затронутые? Cluster boundary может смещаться (новая функция расширяет module, может попадать в новый кластер). Risk: silent staleness — bundles не пересинхронизированы с обновлённой product-spec. Решение, вероятно, через **explicit re-decomposition gate** в update mode closure.

**Cluster boundary heuristic.** Module-level cohesion (один модуль = один кластер) — простой default, но может быть incorrect для:
- Большой модуль (F-tickets имеет 5 функций — один кластер или разделить на «inbound» F-tickets-1+2 и «outbound» F-tickets-3+4+5?).
- Cross-module lifecycle (F-tickets-1..5 + F-comm-2 — один lifecycle разработки, но разные модули).
Operator decision, не agent autoclustering. Скилл предлагает дефолт (module-level), оператор правит через явный диалог. Risk: оператор не имеет ясного критерия — нужен guidance в спеке.

**Iteration plan vs backlog interaction.** В new iteration mode — backlog хранит committed pointers из предыдущих итераций, plan хранит новые функции текущей итерации. Bundle для feature-spec может ссылаться на committed pointer как на upstream contract — feature-spec должен уметь читать backlog. Это пересечение с feature-spec scope (см. §2 не-in-scope замечание).

**Bundle size on real specs.** REH-ERP — 33 функции / ~10 кластеров. Каждый bundle — 30-50 строк pointers. Один plan-файл — 300-500 строк. Reasonable. Но при product-spec'ах ≥ 50 функций — plan-файл становится heavy. Threshold для splitting (один файл на iteration vs файл per кластер) — design decision.

### 3.3. Упрощения для старта

Чтобы не утонуть — рекомендуемые сужения для v0.6.0:

1. **Только fresh mode в v0.6.0.** Update mode re-decomposition + new iteration mode handling — могут идти как amendments в v0.6.1+. Risk small: оператор сейчас на fresh-mode use case (REH-ERP just signed), update/new iteration придёт позже.
2. **Default cluster boundary — один модуль = один кластер.** Manual override оператором через explicit диалог при «мы хотим один bundle на cross-module lifecycle». Critically: скилл задаёт операторский вопрос для каждого модуля «один кластер или разбить?» — visibility, не silent autoclustering.
3. **Topological sort — точно по полю `Зависит от` без дополнительных весов.** Cluster A до cluster B если ≥1 функция cluster A зависит от ≥1 функции cluster B. Ambiguity (mutual deps) — escalation оператору.
4. **Один plan-файл per итерация.** Splitting на per-cluster файлы — at threshold (например, ≥10 кластеров) — может быть amendment.
5. **Feature-spec read bundle as input — отдельная задача.** На v0.6.0 product-spec emits plan, feature-spec тоже может его принимать manually (оператор копирует bundle card в feature-spec session). Auto-read — отдельный amendment feature-spec'а.

---

## 4. Что уже зафиксировано (не переоткрываем)

### 4.1. D17 (decomposition phase = часть product-spec)

См. ARCHITECTURE.md → Active Decisions → D17. **Не возвращаемся к вопросу «может быть, decomposition — отдельный скилл».** Trade-off analysis в source-сессии показал — единственный layer entry per concern (product-spec для «состав», feature-spec для «одна функция», arch-spec для «архитектура одной»). Decomposition нужна во всех трёх режимах product-spec (fresh / update / new iteration), вынос в отдельный скилл создаёт три точки операторской координации.

### 4.2. Bundle format = lightweight pointers, not embed

Bundle card = pointers refs на оригинальный product-spec + короткие inline для CC и Sf (они короткие). Embed of content создал бы SSoT violation (product-spec + bundle = две копии).

Конкретный перечень элементов bundle:

1. Cluster cards — pointers на `product-spec.md § F-<module>-N..M`.
2. Upstream contracts — pointers + 1-line summary каждого upstream.
3. Downstream consumers — pointers + 1-line summary каждого downstream.
4. CC inheritance — verbatim (CC короткие).
5. Sf resolutions — verbatim тех Sf'ов, что в `Связи:` упоминают функции кластера.
6. Backlog parked references — pointers на parked items, упомянутые в `Не делаем вообще` карточек кластера.
7. User groups — pointers на Section 2 (verbatim definitions для тех групп, что в `Доступно группам`).
8. Relevant scenarios — pointers на Section 9 (verbatim, потому что они короткие).

Design детализирует это в SKILL.md и template форматы.

### 4.3. Single entry per layer principle

product-spec — universal entry для «состав продукта» (fresh / update / new iteration режимы автоматически distinguished через session setup detection). feature-spec — entry для «одна функция / кластер». arch-spec — entry для «архитектура одной функции». Это **зафиксировано** в D17 reasoning.

### 4.4. v0.5.0 уже учла

Visibility presumed defaults в Шаге 5, structured гейт после probes, jargon translation rule (Operational Rule 11), module-level Mermaid с pre-baked skeleton. См. D15. Не дублируем.

### 4.5. Retrospective improvements v0.7.0 отделены

Параллельный design `2026-05-26-hi_flow-product-spec-v0.7-retrospective-improvements-design.md` обрабатывает 13 пунктов. Implementation deferred. Эта сессия — **только decomposition**, retrospective пункты включает только в minimal accommodation (пункт 11 — standing-policy checker, пункт 14 — backlog terminology resilience).

---

## 5. Read-list перед стартом дизайн-сессии

В порядке приоритета:

1. **`ARCHITECTURE.md`** — особенно D17, D15, D14, P4 (one skill per design session), History 2026-05-26.
2. **`hi_flow/skills/product-spec/SKILL.md`** — current v0.5.0. Особенно Шаги 4-6, Backlog mechanics, Шаг 12 closure, Operational Rules.
3. **`hi_flow/skills/product-spec/references/product-spec-template.md`** — текущий формат спеки.
4. **`hi_flow/skills/product-spec/references/product-backlog-template.md`** — текущий формат бэклога.
5. **`hi_flow/skills/feature-spec/SKILL.md`** — что feature-spec ждёт на вход (8 probes, ARCHITECTURE.md context read, anti-triggers). Особенно `## Out of scope` и `## Anti-triggers`.
6. **`C:/Users/Vegr/Projects/Reh_Erp/docs/specs/2026-05-25-reh-erp-comm-core-plus-demos-product-spec.md`** — real product-spec для grounding. 33 функции / 10 модулей / 7 Sf — это working example для всех cluster boundary решений.
7. **`C:/Users/Vegr/Projects/Reh_Erp/docs/specs/reh-erp-product-backlog.md`** — real backlog (в legacy Shipped terminology). Demonstrates что decomposition должна работать с обеими terminology до миграции.
8. **`docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design.md`** — original design rationale (D1-D18 концепции скилла).
9. **`docs/superpowers/specs/2026-05-25-hi_flow-product-spec-v0.5.0-amendment.md`** — last amendment, формат образца для текущего design'а.

---

## 6. Open вопросы для дизайн-сессии (не блокирующие старт)

Эти вопросы появились в source-сессии но не были разрешены — ожидают дизайна:

1. **Trigger decomposition phase** — auto после Шага 12.4 или operator-gated? Если gated — что предлагаем при «нет, отложу»?
2. **Cluster boundary** — module-level default или более sophisticated heuristic? Cross-module lifecycle handling (F-tickets-1..5 пример) — какой mechanism у оператора?
3. **Bundle output** — отдельный файл `<plan>.md`, секция в product-spec, или серия файлов `bundle-<cluster>.md` per cluster?
4. **Plan-файл metadata** — только ordering или дополнительные (estimated complexity, cluster-to-cluster dependencies)?
5. **Update mode handling** — на v0.6.0 включаем или откладываем (вместе с new iteration mode handling)?
6. **Companion update feature-spec'а** — нужен ли его update в v0.6.0, чтобы feature-spec auto-read bundle? Или ручная передача bundle оператором — норм для v0.6.0?
7. **Aliasing committed-functions из backlog в bundles** — в new iteration mode upstream может быть committed (предыдущая iteration). Bundle reference — на `backlog § F-X` или на оригинальную spec?

---

## 7. Anti-patterns / gotchas

Из накопленного опыта семейства:

1. **Не делать decomposition full-blown design с probing taxonomy.** Это **wrap-up phase**, не design phase. Topological sort — детерминистика. Кластеризация — короткий продуктовый диалог (5-10 решений на 30 функций). Не пытаться сделать «8 categories of decomposition probes».
2. **Не embed content в bundles.** SSoT violation. Только pointers + короткие inline для CC/Sf.
3. **Cluster boundary — operator decision, не agent autoclustering.** Скилл предлагает дефолт (module-level), оператор правит через явный диалог. Silent autoclustering = повторение Шага 5 silent-defaults gap из v0.4.0 (закрытого в v0.5.0).
4. **Не пытаться решить v0.7 пункты в v0.6 design.** Только пункт 16 + минимум 11, 14 как accommodation. Все остальные — параллельный design v0.7.
5. **Subagent self-review для critical artifacts.** Spec должна пройти 2-3 subagent passes на разных уровнях granularity (см. PROJECT_META паттерн «Multi-pass subagent self-review»; CLAUDE.md дополнение к superpowers:brainstorming).
6. **Plain language conditional.** В output-артефактах, где скилл ждёт operator OK — plain Russian. В чисто инженерных артефактах (helper-конфиги, internal docs) — инженерный OK. См. P1 в ARCHITECTURE.md.
7. **Stress-test формата на реальном кейсе.** Если в design'е появляется конкретный пример bundle / cluster boundary — tested на real REH-ERP, не на synthetic примере.
8. **Не реализовывать во время design'а.** Output design-сессии — spec, не SKILL.md update. Implementation — отдельная сессия после design'а.

---

## 8. После завершения design-сессии

После того как `2026-05-26-hi_flow-product-spec-v0.6-decomposition-design.md` готов и operator-signed:

1. **Implementation report** идёт рядом со спекой (стандарт CLAUDE.md).
2. **Update ARCHITECTURE.md:** D17 → реализованный scope; Module Map → BUILT v0.6.0; History entry о implementation.
3. **Update PROJECT_META.md:** decision atoms + status.
4. **Manual fix REH-ERP backlog terminology** перед прогоном (`Shipped` → `Committed` find-replace в `reh-erp-product-backlog.md`). Migration mechanism как фичу — откладываем до v0.7+.
5. **Боевой прогон decomposition** на REH-ERP — после implementation v0.6.0. Output — `reh-erp-iteration-1-plan.md` с roadmap и bundles. Передаём в feature-spec sessions по очереди.
6. **Retrospective прогона.** Если выявятся новые findings → дополнение v0.7 design (если mergeable; иначе — новый v0.8 design).

---

**Конец hand-off.**
