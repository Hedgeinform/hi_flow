# Handoff: hi_flow:product-spec v0.7.0 — retrospective improvements design

**Date:** 2026-05-26
**Source session:** Retrospective REH-ERP integration + happy-path анализ 2026-05-26.
**Audience:** будущая design-сессия по v0.7.0 (retrospective improvements). Implementation — deferred до next product-spec trigger event. Self-contained — не предполагает доступа к conversation transcript'у.

**Назначение документа:** дать достаточный контекст следующей сессии, чтобы она стартовала с осмысленного места без перечитывания транскрипта source-сессии. Особенно важно — preserving свежесть retrospective контекста перед его «протуханием».

---

## 1. Что произошло в source-сессии

В сессии 2026-05-26 проведён retrospective REH-ERP боевой сессии product-spec (2026-05-25 / v0.4.0 прогон / 33 функции / 10 модулей). Анализ был двухуровневый:

**Observable pass** — comparing v0.5.0 SKILL.md (post-hoc, после feedback'а сессии REH-ERP) ↔ финальный product-spec artefact + backlog. Выявил 16 observations, классифицированных как INSTRUCTED / IMPROVISATION+USEFUL / IMPROVISATION+HARMFUL / CONTRA-INSTRUCTION.

**Targeted-вопросы сессии REH-ERP** — 11 вопросов про unobservable причинно-следственные narratives (kak именно agent рассуждал в моменте). Ответы сессии в conversation transcript содержат причинные narratives — критические для понимания gap'ов в SKILL.md.

После integration двух passes — 13 improvement пунктов сверх того, что закрыто в D15 v0.5.0. Решено писать v0.7 design **немедленно** для preserving свежести retrospective context, implementation — **deferred** до next product-spec trigger event.

Параллельно — отдельный design v0.6.0 на decomposition phase (D17). Это **другая сессия** — см. `2026-05-26-product-spec-v0.6-decomposition-design-handoff.md`. Эта сессия — только 13 retrospective пунктов.

---

## 2. Что в scope, что вне scope

**В scope этой design-сессии:**

Проектирование retrospective improvements для v0.7.0. Output — `docs/superpowers/specs/2026-05-26-hi_flow-product-spec-v0.7-retrospective-improvements-design.md`. Спека должна определить implementation approach + concrete SKILL.md / template formulations для 13 пунктов.

**Не в scope:**

- Decomposition phase (D17) — отдельный design v0.6.0.
- Implementation. Эта сессия пишет **дизайн**, не code/markdown updates. Implementation — отдельная сессия при наступлении trigger event.
- Пересмотр D15 v0.5.0 fixes. v0.5.0 уже закрыла visibility-defaults в Шаге 5, jargon translation rule, module-level Mermaid, premortem-без-дельты, committed vs shipped terminology, pivot guidance — не дублируем.
- Decision о включении в product-spec vs отдельный скилл — это D17 territory, уже зафиксировано.

---

## 3. 13 пунктов retrospective improvements

Полные формулировки + источник + связи — в `docs/active-issues.md` → MEDIUM → «v0.7.0 product-spec retrospective improvements». Здесь — краткие summaries + sequencing/priority guidance.

### High-impact на quality output'а (fundamental SKILL.md изменения)

**1. Probe-iteration always per module + coverage matrix `function × probe`.**

Текущая SKILL.md говорит «для каждой пользовательской функции — пройти probe-таблицу». На 33 функциях REH-ERP сессия адаптировалась — применила probes per module, что породило silent miss F-id-4 RBAC (probe «RBAC или ABAC?» silent-default'нулся как «embedded в position type»). Design: probe-iteration always per module (unified rule, no threshold) + obligatory coverage matrix `function × probe → applied/skipped/silent-default`, выводится в structured review block Шага 5 (sub-step 6). Visibility сохраняется через матрицу, независимо от того, что probe был задан на уровне модуля.

**2. CCP2 self-application.**

Текущая CCP2 — single-direction: проверяет new operator answer vs current structure. Не проверяет new agent output vs earlier agent output. На REH-ERP скилл пропустил own inconsistency: «contracts = data entity, обслуживается CRM+Soft» (early formulation) → потом «contracts as отдельный wow-модуль с 3 функциями» (later). Поймал оператор, не скилл. Design: перед closure Шага 5 и перед Шагом 12 — explicit revisit pass: скилл re-reads свои earlier closure decisions (классификация модулей, Section 1-3 formulations) и проверяет current scope vs them.

**3. Architectural axes checkpoint после Module assignment.**

Probe-таблица выявляет standard enablers (auth/RBAC/notif/audit/etc.) из карточек функций. Архитектурные оси продукта (org structure, geographic distribution, multi-language, multi-currency, ...) — не покрываются probes; на REH-ERP org-модуль появился из operator dump в момент Sf7, не из probe. Design: после Module assignment, перед Шагом 5 — explicit sub-step «есть ли product axes требующие отдельных модулей помимо probe-detectable enablers?». Конкретные формулировки axes в плэйн-русском (не «axes», а «структура организации», «географическое распределение», «язык интерфейса»).

**4. Module-card revisit после module map pivots.**

Текущий «pivot guidance» в Module assignment (добавлен в v0.5.0) описывает renumber F-ID. Не предписывает revisit карточек затронутых функций для проверки `Зависит от` / `Доступно группам` / `Inherits` post-pivot. На REH-ERP это потенциально породило бы stale references после pivots. Design: при pivot (модуль переклассифицирован / функция перенесена / модули слиты-разделены) — обязательный re-pass карточек затронутых функций.

### Medium-impact (workflow improvements)

**5. Pre-baked Mermaid skeleton в template.**

v0.5.0 указывает Mermaid syntax requirements и стилевые conventions, но в template даны три linkStyle варианта как general guidance, не готовый pre-baked skeleton с правильными subgraph + classDef + linkStyle placeholder'ами per группа. Дизайн: template содержит полный block, агент копирует as-is и наполняет placeholder'ами (имена модулей, связи).

**7. CC naming convention enforcement.**

Format Rule 1 SKILL.md: «CC1, CC2 ...». На REH-ERP появились `CC-X` / `CC-Y` (placeholder остался). Design: автокпроверка перед Шагом 12 — если CC-IDs не sequential CC1, CC2... → autofix или эскалация.

**11. Standing-policy checker при Шаге 12.**

REH-ERP CC-X (Unified events+chat) и CC-Y (Routing vs Escalation) — явные standing candidates (применяются ко всем pipeline objects / любым modules). Не внесены в backlog § Standing. Design: при Шаге 12.3 — для каждой CC проверить «cross-iteration applicability»; кандидатам предложить операторский confirm «эта CC — кандидат на § Standing policies в backlog».

**12. Multi-message dump pattern.**

Оператор иногда требует «не завершай шаг пока не скажу» — Шаг 3 / 4 / 5 могут требовать multi-turn operator dump без promotion. Design: operator может explicitly запросить «продолжаю дамп»; скилл ждёт advance signal от оператора, не promote automatically после первой реплики.

### Low-impact (visibility / format polish)

**6. Описания модулей перед карточками функций.**

Template уже требует «1-2 строки описания модуля» — реализация на REH-ERP пропустила. Design: explicit instruction в Шаге 4 — после Module assignment, для каждого модуля сгенерировать 1-2 строки описания (что делает + для кого + value contribution).

**8. Section 2/3 — explicit permission на адаптивные форматы.**

REH-ERP финал использовал hierarchy (Внутренние / Внешние / External actors) для Section 2 вместо flat list из template, и group-by-context для Section 3 вместо matrix «группа × задачи». Это улучшения, не bugs — skill адаптировал под operator's mental model. Design: template Section 2/3 — добавить варианты flat / matrix / hierarchy-by-context с правилом выбора по operator dump signal.

**9. Premortem сценарии tagging.**

v0.5.0 разрешает «дельты нет — валидный исход» (premortem closure без functions/Sf/scope cuts). Не требует визуального tagging'а сценариев в Section 11. На REH-ERP — 7 сценариев, ни один не tagged. Design: каждый сценарий — `[delta → F-X / Sf-Y / scope cut]` или `[no delta, mitigation external / post-conversion / process]`.

**10. Reason for parking — обязательное поле.**

Backlog template требует Reason for parking — на REH-ERP пропущено. Design: Шаг 12.3 — autocheck перед миграцией; missing reason → block с эскалацией оператору.

**13. Sf-ID gap пометки в спеке.**

REH-ERP — Sf4 и Sf8 deferred в backlog; в Section 5 спеки нумерация Sf1, Sf2, Sf3, Sf5, Sf6, Sf7 без пометок причин пропуска. Design: deferred Sf оставляет placeholder в Section 5 — `### Sf-N. [DEFERRED — см. backlog § Sf-N]`.

**15. Decision log appendix для больших спек (optional).**

Для больших спек (≥20 функций или ≥5 Sf'ов) — optional Section Appendix «Decision log»: timestamp + что обсуждали + что решили. Включается по запросу оператора или auto при size threshold.

---

## 4. Что уже зафиксировано (не переоткрываем)

### 4.1. Что v0.5.0 уже учла (D15)

Visibility presumed defaults в Шаге 5, jargon translation rule (Operational Rule 11), module-level Mermaid с pre-baked categories, premortem-без-дельты, committed vs shipped terminology, pivot guidance с renumber F-ID. **Не дублируем.** Эти 13 пунктов — strictly delta поверх v0.5.0.

### 4.2. D17 (decomposition phase) — отдельный design

v0.6.0 — decomposition phase. v0.7.0 — retrospective improvements. **Параллельные design'ы, не объединяем.** При implementation v0.7 предполагается что v0.6 уже implemented (sequencing — см. §6).

### 4.3. Single entry per layer principle

product-spec — universal entry для «состав продукта». feature-spec — entry для «одна функция / кластер». arch-spec — entry для «архитектура одной функции». Зафиксировано в D17. **Не переоткрываем.**

### 4.4. Active issue с trigger condition

`docs/active-issues.md` → MEDIUM → «v0.7.0 product-spec retrospective improvements» содержит trigger condition implementation: «следующая реальная product-spec session со scope, активирующим affected pathways (probe-iteration на >1 модуле, premortem с дельтой, multi-module pivots; не trivial single-module spec)». **Не переоткрываем trigger.**

---

## 5. Read-list перед стартом дизайн-сессии

В порядке приоритета:

1. **`ARCHITECTURE.md`** — особенно D17 (parallel scope расширение), D15 (предыдущий iteration feedback), P4 (one skill per design session), History 2026-05-26.
2. **`docs/active-issues.md`** — entry «v0.7.0 product-spec retrospective improvements» с 13 пунктами.
3. **`hi_flow/skills/product-spec/SKILL.md`** — current v0.5.0 целиком. Critically: design layered поверх; знание текущей реализации каждого Шага / Operational Rule / Format Rule — обязательно.
4. **`docs/superpowers/specs/2026-05-25-hi_flow-product-spec-v0.5.0-amendment.md`** — что v0.5.0 уже учла; reference для формата amendment design'а (если решаем сделать v0.7 incremental amendment).
5. **`hi_flow/skills/product-spec/references/product-spec-template.md`** — текущий формат спеки. Affects пункты 5, 6, 8, 9, 13.
6. **`hi_flow/skills/product-spec/references/product-backlog-template.md`** — текущий формат бэклога. Affects пункты 10, 11.
7. **`C:/Users/Vegr/Projects/Reh_Erp/docs/feedback/hi_flow-product-spec-feedback.md`** — оригинальный operator feedback после REH-ERP сессии. Source для retrospective findings.
8. **`C:/Users/Vegr/Projects/Reh_Erp/docs/specs/2026-05-25-reh-erp-comm-core-plus-demos-product-spec.md`** — real product-spec для grounding каждого пункта. Все 13 improvements должны быть testable на этом артефакте mentally.
9. **`docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design.md`** — original design rationale (D1-D18 концепции скилла).

---

## 6. Sequencing implementation (out of scope сессии, но влияет на design choices)

Design этой сессии — only design. Implementation — deferred. Но дизайн может **облегчить** будущую implementation сессию через несколько решений:

1. **Incremental vs major bump.** Если v0.6 — major, v0.7 — incremental поверх v0.6. Если v0.6 incremental amendment к v0.5 — v0.7 тоже amendment. Решение в design'е.
2. **Sequencing 13 пунктов между собой.** Какие пункты — изолированные (можно imp вместе), какие — depend on others (sequencing required).
3. **Что в SKILL.md, что в template, что в new reference file.** Например, coverage matrix mechanic в SKILL.md, format в reference file.
4. **Stale-protection при reactivation.** При trigger event — короткий review pass design'а перед implementation. Указать explicit в design'е, что review должен проверить.

---

## 7. Open вопросы для дизайн-сессии (не блокирующие старт)

Эти вопросы появились в source-сессии но не были разрешены — ожидают дизайна:

1. **v0.7 — incremental over v0.6 (если v0.6 уже implemented) или standalone amendment over v0.5.0?** Влияет на структуру design'а.
2. **Coverage matrix format** — table в structured review block Шага 5, separate appendix в spec output, или metadata в каждой function-карточке?
3. **CCP2 self-application — automatic vs prompt-based check?** Automatic — overhead на каждый turn; prompt-based — risk of skip.
4. **Pre-baked Mermaid skeleton — где живёт?** Template directly (full block ready to copy), separate reference file (`references/mermaid-skeleton.md`), or SKILL.md inline?
5. **Architectural axes checkpoint formulation.** Какие конкретные axes-categories предлагаем оператору? «Org / geographic / language / currency» — minimum? Open для extension?
6. **Section 2/3 adaptive format selection criteria.** Скилл должен выбрать формат сам (по operator dump signal) или эскалировать оператору?

---

## 8. Anti-patterns / gotchas

Из накопленного опыта семейства:

1. **Не объединять v0.6 + v0.7 в одну design сессию.** P4 — каждый design в своей сессии. v0.6 (decomposition) — отдельная сессия per `2026-05-26-product-spec-v0.6-decomposition-design-handoff.md`.
2. **v0.7 design — про SKILL.md и template, не code.** Markdown changes. Implementation — отдельная сессия.
3. **Coverage matrix не должна быть обширной.** Concise, fits в structured review block Шага 5. Один visible artefact, не embedded throughout.
4. **CCP2 self-application — narrow scope.** Классификация модулей и Section 1-3 formulations. Не пытаться revisit каждое decision (over-checking → шум).
5. **Не implementить во время design'а.** Output — spec. Implementation — позже, при наступлении trigger event.
6. **Subagent self-review для critical artifacts.** Spec должна пройти 2-3 subagent passes на разных уровнях granularity.
7. **Plain language conditional.** В operator-facing блоках — plain Russian. В чисто инженерных internal docs — инженерный OK. См. P1 в ARCHITECTURE.md.
8. **Stale-protection.** Design написан на retrospective REH-ERP. При implementation через месяцы — короткий review pass: «design написан YYYY-MM-DD; обстоятельства не изменились? Какие наблюдения с момента появились?». Указать explicit в design'е.

---

## 9. После завершения дизайн-сессии

После того как `2026-05-26-hi_flow-product-spec-v0.7-retrospective-improvements-design.md` готов и operator-signed:

1. **Design report** рядом со спекой (стандарт CLAUDE.md). В частности — какие из 13 пунктов merged / split при design'е, какие новые observations возникли.
2. **Update Active Issue** в `docs/active-issues.md` — entry «v0.7.0 product-spec retrospective improvements» теперь содержит pointer на готовый design ('design ready, implementation deferred to trigger event').
3. **ARCHITECTURE.md update** — minimal. Design не меняет factor decisions; разве что Module Map можно обновить «design ready» статус.
4. **PROJECT_META.md update** — decision atoms для design completion.
5. **Pending до trigger event.** При наступлении — открывается implementation session с design'ом + review pass на staleness.

---

**Конец hand-off.**
