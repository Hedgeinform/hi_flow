# Handoff: hi_flow:product-spec v0.6.1+ — deferred amendments design

**Date:** 2026-05-27
**Source session:** v0.6.0 decomposition phase design + implementation 2026-05-26.
**Audience:** будущая design-сессия по v0.6.1+ amendments. Self-contained — не предполагает доступа к conversation transcript'у.

**Назначение документа:** дать достаточный контекст следующей сессии, чтобы она стартовала с осмысленного места без перечитывания транскрипта source-сессии.

---

## 1. Что произошло до этого hand-off'а

В сессии 2026-05-26 реализована v0.6.0 decomposition phase для `hi_flow:product-spec` (D17, D18 в ARCHITECTURE.md). Подписана и имплементирована:

- **Two entry points** — explicit gate в Шаге 12.5 (Entry A, fresh mode after closure) + session setup detection (Entry B, update mode initial decomposition).
- **Cluster boundary dialog** — default «один module = один cluster» + LLM/deterministic detection split/merge candidates + structured operator dialog.
- **Topological sort** — Kahn's algorithm на cluster-level dep graph, tie-breaking visibility («взаимозаменяемый порядок»).
- **Cluster-level cycle handling** — 3 варианта резолва (merge clusters / move function / focused mini-12.2 recovery).
- **Bundle generation** — 8 элементов per cluster, pointer/verbatim split, strict filter by formal references.
- **Output** — subdirectory `<product-slug>-iteration-<N>-plan/` с `roadmap.md` + `bundle-<cluster-slug>.md` × N.
- **Standing-policy candidates flag** — pt 11 minimum (full mechanism в v0.7).

**Scope v0.6.0 был ограничен сознательно** — только **initial decomposition** в Fresh + Update session modes. Несколько features были defer'нуты в v0.6.1+ (см. §3 ниже) для управляемости scope первой версии. Эта сессия — об implementation defer'нутых amendments.

**Боевой прогон v0.6.0 на REH-ERP ещё не выполнен** на момент handoff'а. Это **важный context** — empirical findings из боевого прогона могут изменить приоритизацию amendments или surface новые. Recommended sequence: боевой прогон first → retrospective findings → re-prioritize v0.6.1+ scope. Если эта сессия запускается **до** боевого прогона — операторское решение, явно зафиксировать в design'е, что некоторые amendments могут быть пересмотрены post-прогон.

---

## 2. Что в scope, что вне scope

**В scope этой design-сессии:**

Проектирование amendments для v0.6.1+. Output — `docs/superpowers/specs/<date>-hi_flow-product-spec-v0.6.1-amendments-design.md` (или decomposed на несколько specs если operator решит slice scope).

**Не в scope:**

- Изменения в `hi_flow:feature-spec` (auto-read bundle файла) — отдельный design на feature-spec, не product-spec amendment. Может идти параллельно но не in scope этой сессии.
- v0.7 retrospective improvements — отдельный design (handoff exists, implementation deferred per active issue).
- arch-spec scope — не реализован, отдельная territory.
- Migration mechanism legacy backlog terminology (Shipped → Committed) — отдельная небольшая задача, не v0.6.1 scope если operator явно не решит включить.

---

## 3. Defer'нутые features из v0.6.0 (candidate scope для v0.6.1+)

Сгруппированы по логической независимости. Operator выбирает в design-сессии, какие включать в v0.6.1, какие отложить дальше (v0.6.2 / v0.7+).

### Group A — Re-decomposition mechanism (update mode amendments)

**Что:** при изменениях функций в active `signed` спеке (add / remove / split / merge через update mode mechanics D14) — re-decomposition существующего plan'а.

**Почему deferred в v0.6.0:** требует более сложного diff/affected cluster detection и dialog'а — отдельный design surface. v0.6.0 workaround — manual delete plan directory + re-trigger Entry B (full re-gen).

**Design surface для следующей сессии:**

- Detection: что считается «affected cluster» при изменении функции X? (cluster владеющий X + clusters с upstream/downstream к X + всё, что зависит от resolution Sf, упомянутого в X).
- Re-generation scope: affected bundles only (partial re-gen) vs full re-gen всех bundles (safe but expensive). Trade-off: partial — быстрее, но риск drift при cluster boundary shift; full — медленнее, но clean state.
- Operator dialog: explicit re-decomposition gate в update mode closure? Или auto-detect changes и предложить?
- Cluster boundary changes: новая функция может попасть в существующий cluster или потребовать нового — кто решает (operator dialog vs deterministic placement)?
- Roadmap status preservation: если cluster был `готов` и в нём поменялась функция — статус сбросить или оставить с warning?

### Group B — New iteration mode handling

**Что:** при старте новой итерации продукта (предыдущая итерация уже committed в backlog) — decomposition phase для новых функций + reuse committed pointers как upstream contracts в bundles.

**Почему deferred в v0.6.0:** требует mechanics чтения backlog committed pointers + bundle reference resolution на cross-iteration boundary. Q7 handoff'а v0.6 — резолвится здесь.

**Design surface:**

- **Q7 resolution:** bundle reference на committed predecessor — на `backlog § F-X` (pointer на backlog entry) или на original spec (pointer на iter1 spec § F-X)? Trade-off: backlog ref — single source через iterations; spec ref — больше context (full carded). Возможен hybrid: backlog ref + spec ref. См. v0.6 handoff §6 Q7 для рассуждений.
- Detection: как скилл понимает, что это new iteration mode vs update mode vs fresh? Существует backlog с iteration index + новая спека стартует — это new iteration. v0.6.0 session setup уже это detects, но flow в decomposition phase для new iteration пока undefined.
- Committed predecessors filter: какие committed pointers попадают в bundle upstream contracts? Только те, на которые ссылается `Зависит от` функций нового кластера? (deterministic filter same as v0.6.0 logic).
- Backlog terminology resilience: v0.7 issue, но может частично понадобиться здесь — если existing backlog ещё в legacy «Shipped» terminology, скилл должен корректно читать.

### Group C — Hard enforcement frozen invariant

**Что:** file-level guard rails для plan directory immutability. В v0.6.0 — soft (только guideline в SKILL.md + frontmatter declaration).

**Почему deferred:** реальная файловая защита требует tooling (file modification detection, validation at re-read, guard rails в скилле против edits помимо `Статус` field).

**Design surface:**

- Detection mechanism: при re-read plan'а скилл сравнивает с последним known state? Где хранится «known state»?
- What to do on detected unauthorized edit: warn operator? Block? Force re-decomposition?
- Edge cases: operator вручную поправил typo в bundle — это violation? Manual `Статус` update в roadmap — permitted, как distinguish'ать?
- Trade-off: enforcement strictness vs operator flexibility. v0.6.0 soft policy работает на trust. Hard enforcement может frustrate'ить.

### Group D — Status auto-update via feature-spec callback

**Что:** когда feature-spec session завершается успешно — автоматический update `Статус: запланирован → в работе → готов` в roadmap entry соответствующего cluster.

**Почему deferred:** требует cross-skill integration (feature-spec знает про parent product-spec plan'а), не in scope v0.6.0 unilateral changes.

**Design surface:**

- Detection: feature-spec session работает на cluster X — откуда оно знает, что parent plan'а это `<slug>-iteration-N-plan/roadmap.md`? Через filesystem (bundle-X.md → parent plan dir → roadmap)?
- Callback mechanism: feature-spec пишет в roadmap напрямую (Edit tool)? Или генерирует marker файл, который скилл product-spec обновит при next session?
- Granularity статусов: `запланирован` / `в работе` / `готов` достаточно? Или нужно more: `в feature-spec` / `feature-spec подписан` / `в impl` / `impl завершён`?
- Operator override: должен ли operator confirm'ить auto-update, или silent?
- Pre-step companion: это depends on feature-spec amendment (см. §2 «не в scope этой сессии»). Может идти после feature-spec amendment.

### Group E — Visualization amendments

**Что:** optional Mermaid в roadmap.md при large cluster counts.

**Почему deferred:** v0.6.0 не имеет empirical signal что text-only sequence неудобен. Premature optimization. Боевой прогон на REH-ERP (~10-13 кластеров) — natural test для этого.

**Design surface:**

- Threshold для проактивного предложения скиллом: ≥10 кластеров? Operator explicit request?
- Mermaid layout: subgraph группировка по cluster category (по аналогии с module-level v0.5.0 Mermaid)? Plain TD graph?
- Syntax constraints: те же что у module-level (quoted labels, ASCII edges, alphanumeric node IDs).
- Splitting plan'а при very large products (≥15 кластеров): single plan file достаточен или нужно splitting на multiple files / sub-directories?
- Relation к Mermaid в product-spec.md `## Modules` section (module-level): cluster-level Mermaid в roadmap — это другой view (cluster ≠ module после splits/merges), но операторы могут спутать. Visual distinguishing — color scheme, layout, или explicit naming.

---

## 4. Что уже зафиксировано (не переоткрываем)

### 4.1. v0.6.0 architectural decisions (D17, D18)

**Не возвращаемся к** trigger logic (two entry points), default cluster boundary («один module = один cluster»), topo sort algorithm (Kahn's на cluster-level deps), cycle handling (3 варианта), bundle composition (8 элементов), output layout (subdirectory + roadmap + bundles), pointer/verbatim split для bundle elements, plain language constraint для new artefacts.

Эти решения работают; amendments — расширения, не пересмотр.

### 4.2. Scope v0.6.0 был ограничен Fresh + Update session modes / initial decomposition only

Этот scope **выполнен** в v0.6.0. Расширения scope (Group A, B) — это **add'ы** на existing implementation, не пересмотр.

### 4.3. Plan directory frozen invariant — soft enforcement в v0.6.0

Group C (hard enforcement) — это **extension** soft policy, не пересмотр policy itself. Frozen invariant как concept — locked.

### 4.4. Single source of truth для plan existence — directory existence, не metadata

D17 spirit. v0.6.0 использует existence check `<slug>-iteration-<N>-plan/` directory как ground truth «план существует». Не добавлять competing metadata состояние (типа `plan_status: generated` в spec frontmatter) в v0.6.1+.

### 4.5. Operator escalation discipline для cluster boundary decisions

P6 ARCHITECTURE. Cluster boundary changes в любой forme (initial generation, re-decomposition, splits/merges) — продуктовое решение, не агентское. Silent autoclustering запрещён. Это применимо ко всем amendments Group A.

---

## 5. Read-list перед стартом дизайн-сессии

В порядке приоритета:

1. **`ARCHITECTURE.md`** — особенно D17 (decomposition scope), D18 (v0.6.0 mechanics), D14 (update mode), D18 (frozen invariant), P6 (operator escalation), History 2026-05-26 (D18 implemented).
2. **`hi_flow/skills/product-spec/SKILL.md`** — current v0.6.0. Особенно новый раздел `## Decomposition phase` + Шаг 12.5 (Entry A) + Session setup branch (Entry B) + Operational Rule 11 extension + Format Rules 12-14.
3. **`docs/superpowers/specs/2026-05-26-hi_flow-product-spec-v0.6-decomposition-design.md`** — full design spec v0.6.0, особенно Out of scope section (что defer'нуто и почему) и Open Questions section (handoff §6 mapping table — что закрыто, что defer).
4. **`docs/superpowers/specs/2026-05-26-hi_flow-product-spec-v0.6-decomposition-design-report.md`** — implementation report. Деviations / Issues discovered / Open items секции.
5. **`hi_flow/skills/product-spec/references/roadmap-template.md`** — current roadmap skeleton.
6. **`hi_flow/skills/product-spec/references/bundle-template.md`** — current bundle skeleton.
7. **Если боевой прогон v0.6.0 на REH-ERP уже выполнен** — read retrospective findings (документ создаётся при прогоне; путь определяется по факту). Findings могут изменить приоритизацию amendments.
8. **`docs/handoffs/2026-05-26-product-spec-v0.6-decomposition-design-handoff.md`** — original handoff v0.6 для context про предшествующие trade-off'ы.

---

## 6. Open вопросы для дизайн-сессии (не блокирующие старт)

Эти вопросы появились на этапе planning amendments, требуют дизайнерского suggestion + operator decision:

1. **Sequencing v0.6.1+ groups.** Какие из Group A-E включать в v0.6.1, какие в v0.6.2 / v0.7? Может быть атомарный v0.6.1 со всеми (один design + impl session), либо decomposition на меньшие amendments. Recommended approach — обсудить в начале сессии перед deep design.
2. **Dependency между Group A (re-decomposition) и Group D (auto status update).** Auto status update предполагает что cluster может вернуться в `в работе` после `готов` если re-decomposition его изменил. Эти features нужно проектировать coherently либо ordering важен.
3. **Group B (new iteration mode) — implementation cost.** Это наиболее сложный из defer'нутых items: requires backlog reading, cross-iteration pointer resolution, possibly migration of legacy terminology. Может быть свой dedicated amendment (v0.6.2 или даже v0.7).
4. **Group C (hard enforcement) — necessity gate.** Если боевые прогоны v0.6.0 показали, что soft enforcement достаточен (operator не нарушает frozen invariant accidentally) — Group C может быть deprioritized или dropped. Empirical signal нужен.
5. **Group E (Mermaid in roadmap) — threshold for trigger.** v0.6.0 explicitly stated «no Mermaid в roadmap, ordered list suffices». Reversing требует empirical justification (REH-ERP прогон с 10-13 cluster — был ли operator confused by text-only sequence?). Если signal weak — defer ещё дальше.
6. **Companion feature-spec amendment ordering.** Group D (status auto-update) depends on feature-spec being able to write back to roadmap. Если feature-spec amendment не написан — Group D undeliverable. Sequencing: feature-spec amendment first → product-spec Group D after. Это **out of scope этой сессии** (per §2), но dependency'и нужно зафиксировать.

---

## 7. Anti-patterns / gotchas

Из опыта семейства и v0.6.0 implementation lessons:

1. **Не объединять design + implementation в одной сессии без явного operator decision.** v0.6.0 это сделал per explicit override (см. implementation report deviation). Для v0.6.1+ — default обратно к anti-pattern #8 хенд-оффа v0.6 (separate sessions). Если operator решит иначе — фиксировать как conscious override.
2. **Не writeXLarger без empirical signal.** Group E (Mermaid) — классический пример: «возможно понадобится при scale» — нужен real signal до design'а. Premature feature design = wasted token.
3. **Subagent self-review для critical artifacts.** Spec должна пройти isolated subagent review. v0.6.0 этим словил несколько критических issues — confirmation bias реален.
4. **Не пересматривать v0.6.0 decisions.** Amendments расширяют, не пересматривают. Если в ходе session всплывёт желание «давайте переделаем cluster boundary algorithm» — это сигнал что нужен **другой** session focus, не v0.6.1.
5. **Plain language conditional.** В operator-facing артефактах (roadmap, bundle, dialog patterns) — plain Russian. В чисто инженерных артефактах (design specs, ARCHITECTURE.md) — инженерный OK. См. P1 в ARCHITECTURE.md + Operational Rule 11 SKILL.md.
6. **Stress-test на реальном кейсе.** Если в design'е появляется конкретный пример affected cluster detection / re-decomposition flow — tested на real REH-ERP, не на synthetic примере. REH-ERP — working ground truth.
7. **Cross-skill changes — отдельные sessions.** Если v0.6.1 потребует change'ей в feature-spec (например, для status callback) — это **другая** design-сессия (P4 ARCHITECTURE). Можно их chain'ить sequentially, но не объединять.
8. **Sequencing per dependency graph.** Если Group D depends on feature-spec amendment — нельзя начинать impl Group D до merged feature-spec amendment в main. CLAUDE.md global principle 10. Документы (specs) можно писать parallel.
9. **Backlog terminology resilience при boevом прогоне.** Если operator решит делать new iteration mode (Group B) — pre-step migration backlog'а (Shipped → Committed) либо в spec, либо отдельный fix. Decide upfront, не leave silent.

---

## 8. После завершения design-сессии

После того как `<date>-hi_flow-product-spec-v0.6.1-amendments-design.md` (или несколько specs если decomposed scope) готовы и operator-signed:

1. **Implementation report** идёт рядом со спекой (стандарт CLAUDE.md). Каждый spec — отдельный report.
2. **Update ARCHITECTURE.md:** D18 → реализованный extended scope (или новый D-N entry per amendment); Module Map → BUILT v0.6.1; History entries.
3. **Update active-issues.md:** если какие-то v0.7 pt'ы становятся obsolete с v0.6.1 mechanism (например, pt 11 standing-policy могло частично слиться с something в Group C) — удалить из active issue либо обновить scope.
4. **Companion sessions** для cross-skill changes (если Group D в scope) — feature-spec amendment отдельно, sequencing per dependency graph.
5. **Боевой прогон v0.6.1** — после implementation, на REH-ERP либо новом продукте. Retrospective findings → потенциальные v0.6.2 amendments либо v0.7 items.
6. **Cleanup pending hand-off'ов и planned items в ARCHITECTURE.md** — если v0.6.1 закрывает какие-то planned/deferred items, обновить refs.

---

**Конец hand-off.**
