# Handoff: hi_flow:product-spec v0.6.3+ — deferred amendments design

**Date:** 2026-05-27
**Source sessions:** v0.6.0 decomposition phase design + implementation 2026-05-26 + v0.6.1 terminology cleanup 2026-05-27 + v0.6.2 feature-spec compatibility patch 2026-05-27.
**Audience:** будущая design-сессия по v0.6.3+ amendments. Self-contained — не предполагает доступа к conversation transcript'у.

**Назначение документа:** дать достаточный контекст следующей сессии, чтобы она стартовала с осмысленного места без перечитывания транскрипта source-сессий.

**Note on filename:** изначально handoff назывался `v0.6.1+`, потом `v0.6.2+`. v0.6.1 был выделен под terminology cleanup (D19), v0.6.2 — под feature-spec compatibility patch (bundle hint correction + minimal Group F). Defer scope для deferred substantive amendments (Group A-E + расширение Group F) сдвинут на v0.6.3+. Filename и internal references обновлены.

---

## 1. Что произошло до этого hand-off'а

### v0.6.0 (released 2026-05-26 — D17/D18)

В сессии 2026-05-26 реализована decomposition phase для `hi_flow:product-spec`. Подписана и имплементирована:

- **Two entry points** — explicit gate в Шаге 12.5 (Entry A, fresh mode after closure) + session setup detection (Entry B, update mode initial decomposition).
- **Feature boundary refinement dialog** — default «фичи из Feature assignment Шага 4-5 без изменений» + LLM/deterministic detection split/merge candidates + structured operator dialog.
- **Topological sort** — Kahn's algorithm на feature-level dep graph, tie-breaking visibility («взаимозаменяемый порядок»).
- **Inter-feature cycle handling** — 3 варианта резолва (merge cycle features / move function / focused mini-12.2 recovery).
- **Bundle generation** — 8 элементов per фичу, pointer/verbatim split, strict filter by formal references.
- **Output** — subdirectory `<product-slug>-iteration-<N>-plan/` с `roadmap.md` + `bundle-<feature-slug>.md` × N.
- **Standing-policy candidates flag** — pt 11 minimum (full mechanism в v0.7).

### v0.6.1 (released 2026-05-27 — D19, terminology realignment)

После v0.6.0 implementation эмпирически выявлен terminology drift: SKILL.md narrow definition «feature = function» (atomic) конфликтовала с industry standard / operator's mental model (фича = aggregate of capabilities). REH-ERP decomposition output подтвердил semantic misalignment.

V0.6.1 — terminology cleanup без structural mechanics changes:
- **Фича** (feature) = группа связанных функций, блок функциональности продукта.
- **Функция** (function/capability) = атомарная пользовательская задача per D2.
- Module / cluster / feature концепты product-spec'а collapse в один — фича.
- F-* identifiers preserved (структурно `F-<feature-slug>-<N>` parses естественно).
- Module Map в ARCHITECTURE.md preserved as separate concept (code-modules).
- REH-ERP existing artefacts cleanup find-replace применён в product-spec, backlog, iteration-1-plan directory.

### v0.6.2 (released 2026-05-27 — feature-spec compatibility patch + Group F minimal start)

Post-release discovery: implementation bug в v0.6.1 — bundle-template.md usage hint содержал неверный per-function workflow. Operator caught contradiction перед feature-spec прогоном (не было fact damage). Fix:

- **`bundle-template.md`** — hint corrected на правильный aggregate workflow («Bundle описывает фичу целиком; feature-spec работает с фичей как единый scope; output — один feature-spec.md на всю фичу с hierarchical развилками per capability area»).
- **13 REH-ERP existing bundles** — corrected hint header inserted в каждый файл.
- **`feature-spec/SKILL.md`** — added «Feature scope clarification» section: explicit aggregate scope explanation + 8 probes масштабирование на feature-level + bundle input pattern + Direct path criterion clarification + extraction guidance для ultra-deep capabilities.

V0.6.2 = **minimal Group F start** — full feature-spec amendment остаётся открытым (auto-read bundle, formal aggregate mode flag, capability-spec consideration — defer'нуты до empirical signal post-v0.6.2 прогона).

**Scope v0.6.0 + v0.6.1 + v0.6.2 был ограничен сознательно** — только **initial decomposition** в Fresh + Update session modes + terminology realignment + feature-spec compatibility hint correction. Несколько features были defer'нуты в v0.6.3+ (см. §3 ниже). Эта сессия — об implementation defer'нутых amendments.

### Боевой прогон ещё не выполнен

**Боевой прогон v0.6.0/v0.6.1/v0.6.2 на REH-ERP feature-spec не выполнен** на момент handoff'а. Это **важный context** — empirical findings из боевого прогона могут изменить приоритизацию amendments или surface новые. Recommended sequence: боевой прогон first → retrospective findings → re-prioritize v0.6.3+ scope. Если эта сессия запускается **до** боевого прогона — операторское решение, явно зафиксировать в design'е, что некоторые amendments могут быть пересмотрены post-прогон.

---

## 2. Что в scope, что вне scope

**В scope этой design-сессии:**

Проектирование amendments для v0.6.3+. Output — `docs/superpowers/specs/<date>-hi_flow-product-spec-v0.6.3-amendments-design.md` (или decomposed на несколько specs если operator решит slice scope).

**Не в scope:**

- Изменения в `hi_flow:feature-spec` (auto-read bundle файла, aggregate feature spec mode) — отдельный design на feature-spec, не product-spec amendment. Может идти параллельно но не in scope этой сессии.
- v0.7 retrospective improvements — отдельный design (handoff exists, implementation deferred per active issue).
- arch-spec scope — не реализован, отдельная territory.
- Migration mechanism legacy backlog terminology (Shipped → Committed) — частично выполнено в v0.6.1 для REH-ERP бэклога, full mechanism как фича остаётся отдельной задачей.

---

## 3. Defer'нутые features из v0.6.0+v0.6.1 (candidate scope для v0.6.3+)

Сгруппированы по логической независимости. Operator выбирает в design-сессии, какие включать в v0.6.3, какие отложить дальше (v0.6.3 / v0.7+).

### Group A — Re-decomposition mechanism (update mode amendments)

**Что:** при изменениях функций в active `signed` спеке (add / remove / split / merge через update mode mechanics D14) — re-decomposition существующего plan'а.

**Почему deferred в v0.6.0:** требует более сложного diff/affected feature detection и dialog'а — отдельный design surface. v0.6.0 workaround — manual delete plan directory + re-trigger Entry B (full re-gen).

**Design surface для следующей сессии:**

- Detection: что считается «affected фича» при изменении функции X? (фича владеющая X + фичи с upstream/downstream к X + всё, что зависит от resolution Sf, упомянутого в X).
- Re-generation scope: affected bundles only (partial re-gen) vs full re-gen всех bundles (safe but expensive). Trade-off: partial — быстрее, но риск drift при feature boundary shift; full — медленнее, но clean state.
- Operator dialog: explicit re-decomposition gate в update mode closure? Или auto-detect changes и предложить?
- Feature boundary changes: новая функция может попасть в существующую фичу или потребовать новой — кто решает (operator dialog vs deterministic placement)?
- Roadmap status preservation: если фича была `готов` и в ней поменялась функция — статус сбросить или оставить с warning?

### Group B — New iteration mode handling

**Что:** при старте новой итерации продукта (предыдущая итерация уже committed в backlog) — decomposition phase для новых функций + reuse committed pointers как upstream contracts в bundles.

**Почему deferred в v0.6.0:** требует mechanics чтения backlog committed pointers + bundle reference resolution на cross-iteration boundary. Q7 handoff'а v0.6 — резолвится здесь.

**Design surface:**

- **Q7 resolution:** bundle reference на committed predecessor — на `backlog § F-X` (pointer на backlog entry) или на original spec (pointer на iter1 spec § F-X)? Trade-off: backlog ref — single source через iterations; spec ref — больше context (full carded). Возможен hybrid: backlog ref + spec ref. См. v0.6 handoff §6 Q7 для рассуждений.
- Detection: как скилл понимает, что это new iteration mode vs update mode vs fresh? Существует backlog с iteration index + новая спека стартует — это new iteration. v0.6.0 session setup уже это detects, но flow в decomposition phase для new iteration пока undefined.
- Committed predecessors filter: какие committed pointers попадают в bundle upstream contracts? Только те, на которые ссылается `Зависит от` функций новой фичи? (deterministic filter same as v0.6.0 logic).
- Backlog terminology resilience: v0.7 issue, но может частично понадобиться здесь — если existing backlog ещё в legacy «Shipped» terminology, скилл должен корректно читать. **Note:** REH-ERP бэклог migrated в v0.6.1 (Shipped → Committed) для consistency; для других существующих продуктов может потребоваться runtime detection.

### Group C — Hard enforcement frozen invariant

**Что:** file-level guard rails для plan directory immutability. В v0.6.0 — soft (только guideline в SKILL.md + frontmatter declaration).

**Почему deferred:** реальная файловая защита требует tooling (file modification detection, validation at re-read, guard rails в скилле против edits помимо `Статус` field).

**Design surface:**

- Detection mechanism: при re-read plan'а скилл сравнивает с последним known state? Где хранится «known state»?
- What to do on detected unauthorized edit: warn operator? Block? Force re-decomposition?
- Edge cases: operator вручную поправил typo в bundle — это violation? Manual `Статус` update в roadmap — permitted, как distinguish'ать?
- Trade-off: enforcement strictness vs operator flexibility. v0.6.0 soft policy работает на trust. Hard enforcement может frustrate'ить.

### Group D — Status auto-update via feature-spec callback

**Что:** когда feature-spec session завершается успешно — автоматический update `Статус: запланирован → в работе → готов` в roadmap entry соответствующей фичи.

**Почему deferred:** требует cross-skill integration (feature-spec знает про parent product-spec plan'а), не in scope v0.6.0 unilateral changes.

**Design surface:**

- Detection: feature-spec session работает на фиче X — откуда оно знает, что parent plan это `<slug>-iteration-N-plan/roadmap.md`? Через filesystem (bundle-X.md → parent plan dir → roadmap)?
- Callback mechanism: feature-spec пишет в roadmap напрямую (Edit tool)? Или генерирует marker файл, который скилл product-spec обновит при next session?
- Granularity статусов: `запланирован` / `в работе` / `готов` достаточно? Или нужно more: `в feature-spec` / `feature-spec подписан` / `в impl` / `impl завершён`?
- Operator override: должен ли operator confirm'ить auto-update, или silent?
- Pre-step companion: это depends on feature-spec amendment (см. §2 «не в scope этой сессии»). Может идти после feature-spec amendment.

### Group E — Visualization amendments

**Что:** optional Mermaid в roadmap.md при large feature counts.

**Почему deferred:** v0.6.0 не имеет empirical signal что text-only sequence неудобен. Premature optimization. Боевой прогон на REH-ERP (~10-13 фич) — natural test для этого.

**Design surface:**

- Threshold для проактивного предложения скиллом: ≥10 фич? Operator explicit request?
- Mermaid layout: subgraph группировка по feature category (по аналогии с module-level v0.5.0 Mermaid в product-spec.md Section 4)? Plain TD graph?
- Syntax constraints: те же что у feature-level Mermaid в Section 4 (quoted labels, ASCII edges, alphanumeric node IDs).
- Splitting plan'а при very large products (≥15 фич): single plan file достаточен или нужно splitting на multiple files / sub-directories?
- Relation к Mermaid в product-spec.md § 4 (feature-level): roadmap Mermaid — это другой view (фича boundary может refine'ться через splits/merges в decomposition phase), но операторы могут спутать. Visual distinguishing — color scheme, layout, или explicit naming.

### Group F — Feature-spec compatibility refinement (частично сделано в v0.6.2; остаток открыт)

**Что:** улучшение workflow handoff'а между product-spec output (bundle файлы) и feature-spec input. Эволюция группы:

- **v0.6.1 первоначально:** добавлен usage hint header в bundle-template с **неверным** per-function workflow («указать одну функцию из списка как target»).
- **v0.6.2 fix:** hint **исправлен** на правильный aggregate workflow («Bundle описывает фичу целиком; feature-spec работает с фичей как единый scope; output — один feature-spec.md на всю фичу с hierarchical развилками per capability area»). Hint also inserted в 13 REH-ERP existing bundles. feature-spec SKILL.md получил clarification note «Feature scope clarification (post product-spec v0.6.1 / D19 terminology alignment)» — explicit aggregate scope + 8 probes масштабирование + Direct path criterion adjustment + extraction guidance для ultra-deep capabilities.

**Что остаётся в Group F для v0.6.3+ (post-empirical-signal):**

- **Auto-read bundle file feature-spec'ом** — path discovery через filesystem (bundle path → parent plan dir → roadmap). v0.6.2 — operator manually attach'ит bundle; auto-read = next iteration.
- **Formal aggregate mode flag в feature-spec SKILL.md** — current v0.6.2 = clarification note; формальный mode (например, frontmatter `mode: aggregate` либо detection bundle attach) — может быть useful если empirical use surface'ит mode confusion.
- **Capability-spec skill** consideration — если в боевом прогоне feature-spec на large aggregate (≥5 capabilities) окажется unwieldy и operator захочет ultra-deep dive на specific capability отдельно, capability-spec может стать legitimate fourth layer. **Per current YAGNI assessment — drop**, fallback к extraction capability в свою фичу через update mode product-spec'а.
- **Cross-skill terminology consistency expansion** — v0.6.2 added clarification note. Если empirical use surface'ит больше terminology gaps в feature-spec — full SKILL.md refresh.

**Почему остаток deferred:** требует empirical signal — реальный feature-spec прогон на REH-ERP bundle (например, bundle-tickets с 5 capabilities либо bundle-accounts с 6) покажет какие из above items actually нужны, а какие YAGNI. **Recommended sequence:** боевой прогон post-v0.6.2 → retrospective findings → priority decision для остатка Group F в v0.6.3+.

**Note:** Group F discovered post-v0.6.1 (operator interrupt про feature-spec workflow). v0.6.2 — minimal Group F start; остаток открыт.

---

## 4. Что уже зафиксировано (не переоткрываем)

### 4.1. v0.6.0 architectural decisions (D17, D18)

**Не возвращаемся к** trigger logic (two entry points), default feature boundary («фичи из Feature assignment Шага 4-5 без изменений»), topo sort algorithm (Kahn's на feature-level deps), cycle handling (3 варианта), bundle composition (8 элементов), output layout (subdirectory + roadmap + bundles), pointer/verbatim split для bundle elements, plain language constraint для new artefacts.

Эти решения работают; amendments — расширения, не пересмотр.

### 4.2. v0.6.1 terminology realignment (D19)

**Не возвращаемся к** core terminology pair: фича = aggregate, функция = capability. Module/cluster/feature concepts collapsed в один — фича. F-* identifiers preserved structurally. Module Map ARCHITECTURE.md preserved as separate concept (code-modules). Operational Rule 11 translation table extended.

Если v0.6.3+ session обнаружит дополнительные terminology gaps (например, в feature-spec интеграции) — это **add'ы** к D19 mapping, не пересмотр core.

### 4.3. Scope v0.6.0 был ограничен Fresh + Update session modes / initial decomposition only

Этот scope **выполнен** в v0.6.0. Расширения scope (Group A, B) — это **add'ы** на existing implementation, не пересмотр.

### 4.4. Plan directory frozen invariant — soft enforcement в v0.6.0

Group C (hard enforcement) — это **extension** soft policy, не пересмотр policy itself. Frozen invariant как concept — locked.

### 4.5. Single source of truth для plan existence — directory existence, не metadata

D17 spirit. v0.6.0 использует existence check `<slug>-iteration-<N>-plan/` directory как ground truth «план существует». Не добавлять competing metadata состояние (типа `plan_status: generated` в spec frontmatter) в v0.6.3+.

### 4.6. Operator escalation discipline для feature boundary decisions

P6 ARCHITECTURE. Feature boundary changes в любой форме (initial Feature assignment в Шаге 4-5, refinement в decomposition phase Sub-phase 1, re-decomposition splits/merges) — продуктовое решение, не агентское. Silent autoclustering запрещён. Это применимо ко всем amendments Group A.

---

## 5. Read-list перед стартом дизайн-сессии

В порядке приоритета:

1. **`ARCHITECTURE.md`** — особенно D17 (decomposition scope), D18 (v0.6.0 mechanics), D19 (terminology realignment v0.6.1), D14 (update mode), D18 (frozen invariant), P6 (operator escalation), History 2026-05-26 (D18 implemented), History 2026-05-27 (D19 terminology cleanup).
2. **`hi_flow/skills/product-spec/SKILL.md`** — current v0.6.1. Особенно новый раздел `## Decomposition phase` + Шаг 12.5 (Entry A) + Session setup branch (Entry B) + Operational Rule 11 extension с v0.6.1 entries + Format Rules 12-15.
3. **`docs/superpowers/specs/2026-05-26-hi_flow-product-spec-v0.6-decomposition-design.md`** — full design spec v0.6.0, особенно Out of scope section (что defer'нуто и почему) и Open Questions section (handoff §6 mapping table — что закрыто, что defer).
4. **`docs/superpowers/specs/2026-05-26-hi_flow-product-spec-v0.6-decomposition-design-report.md`** — implementation report v0.6.0. Deviations / Issues discovered / Open items секции.
5. **`docs/superpowers/specs/2026-05-27-hi_flow-product-spec-v0.6.1-terminology-cleanup-design.md`** — terminology realignment design spec.
6. **`docs/superpowers/specs/2026-05-27-hi_flow-product-spec-v0.6.1-terminology-cleanup-design-report.md`** — implementation report v0.6.1.
7. **`hi_flow/skills/product-spec/references/roadmap-template.md`** — current roadmap skeleton (v0.6.1 wording).
8. **`hi_flow/skills/product-spec/references/bundle-template.md`** — current bundle skeleton (v0.6.1 wording + usage hint header).
9. **Если боевой прогон v0.6.0/v0.6.1 на REH-ERP feature-spec уже выполнен** — read retrospective findings (документ создаётся при прогоне; путь определяется по факту). Findings могут изменить приоритизацию amendments.
10. **`docs/handoffs/2026-05-26-product-spec-v0.6-decomposition-design-handoff.md`** — original handoff v0.6 для context про предшествующие trade-off'ы.

---

## 6. Open вопросы для дизайн-сессии (не блокирующие старт)

Эти вопросы появились на этапе planning amendments, требуют дизайнерского suggestion + operator decision:

1. **Sequencing v0.6.3+ groups.** Какие из Group A-F включать в v0.6.3, какие в v0.6.3 / v0.7? Может быть атомарный v0.6.3 со всеми (один design + impl session), либо decomposition на меньшие amendments. Recommended approach — обсудить в начале сессии перед deep design.
2. **Dependency между Group A (re-decomposition) и Group D (auto status update).** Auto status update предполагает что фича может вернуться в `в работе` после `готов` если re-decomposition её изменил. Эти features нужно проектировать coherently либо ordering важен.
3. **Group B (new iteration mode) — implementation cost.** Это наиболее сложный из defer'нутых items: requires backlog reading, cross-iteration pointer resolution, possibly migration of legacy terminology. Может быть свой dedicated amendment (v0.6.3 или даже v0.7).
4. **Group C (hard enforcement) — necessity gate.** Если боевые прогоны v0.6.0/v0.6.1 показали, что soft enforcement достаточен (operator не нарушает frozen invariant accidentally) — Group C может быть deprioritized или dropped. Empirical signal нужен.
5. **Group E (Mermaid in roadmap) — threshold for trigger.** v0.6.0 explicitly stated «no Mermaid в roadmap, ordered list suffices». Reversing требует empirical justification (REH-ERP прогон с 10-13 фич — был ли operator confused by text-only sequence?). Если signal weak — defer ещё дальше.
6. **Group F (feature-spec compatibility) — separate skill amendment vs в v0.6.3 scope?** Group F crosses skill boundary (feature-spec). P4 ARCHITECTURE рекомендует separate design sessions per skill. Может пойти как parallel design + sequential implementation, либо feature-spec amendment first, потом v0.6.3 product-spec.
7. **Companion feature-spec amendment ordering.** Group D (status auto-update) depends on feature-spec being able to write back to roadmap. Если feature-spec amendment не написан — Group D undeliverable. Sequencing: feature-spec amendment first → product-spec Group D after. Это **out of scope этой сессии** (per §2), но dependency'и нужно зафиксировать.

---

## 7. Anti-patterns / gotchas

Из опыта семейства и v0.6.0/v0.6.1 implementation lessons:

1. **Не объединять design + implementation в одной сессии без явного operator decision.** v0.6.0 и v0.6.1 это сделали per explicit override (см. implementation report deviation). Для v0.6.3+ — default обратно к anti-pattern #8 хенд-оффа v0.6 (separate sessions). Если operator решит иначе — фиксировать как conscious override.
2. **Не writeXLarger без empirical signal.** Group E (Mermaid) — классический пример: «возможно понадобится при scale» — нужен real signal до design'а. Premature feature design = wasted token.
3. **Subagent self-review для critical artifacts.** Spec должна пройти isolated subagent review. v0.6.0 и v0.6.1 этим словили несколько критических issues — confirmation bias реален.
4. **Не пересматривать v0.6.0 / v0.6.1 decisions.** Amendments расширяют, не пересматривают. Если в ходе session всплывёт желание «давайте переделаем feature boundary algorithm» или «пересмотрим terminology» — это сигнал что нужен **другой** session focus, не v0.6.3.
5. **Plain language conditional.** В operator-facing артефактах (roadmap, bundle, dialog patterns) — plain Russian. В чисто инженерных артефактах (design specs, ARCHITECTURE.md) — инженерный OK. См. P1 в ARCHITECTURE.md + Operational Rule 11 SKILL.md (с v0.6.1 extensions).
6. **Stress-test на реальном кейсе.** Если в design'е появляется конкретный пример affected feature detection / re-decomposition flow — tested на real REH-ERP, не на synthetic примере. REH-ERP — working ground truth.
7. **Cross-skill changes — отдельные sessions.** Если v0.6.3 потребует change'ей в feature-spec (например, для status callback Group D или для Group F compatibility) — это **другая** design-сессия (P4 ARCHITECTURE). Можно их chain'ить sequentially, но не объединять.
8. **Sequencing per dependency graph.** Если Group D depends on feature-spec amendment — нельзя начинать impl Group D до merged feature-spec amendment в main. CLAUDE.md global principle 10. Документы (specs) можно писать parallel.
9. **Backlog terminology resilience при боевом прогоне.** REH-ERP бэклог migrated в v0.6.1 (Shipped → Committed), но для других существующих backlog'ов может потребоваться runtime detection. Если operator решит делать new iteration mode (Group B) на новом продукте — decide upfront, не leave silent.
10. **Terminology consistency check.** V0.6.1 фиксирует core terminology (фича = aggregate, функция = capability) в product-spec. При work на v0.6.3+ — verify consistency в новых artefacts. Operational Rule 11 translation table — single source of truth.

---

## 8. После завершения design-сессии

После того как `<date>-hi_flow-product-spec-v0.6.3-amendments-design.md` (или несколько specs если decomposed scope) готовы и operator-signed:

1. **Implementation report** идёт рядом со спекой (стандарт CLAUDE.md). Каждый spec — отдельный report.
2. **Update ARCHITECTURE.md:** D18/D19 → реализованный extended scope (или новый D-N entry per amendment); Module Map → BUILT v0.6.3; History entries.
3. **Update active-issues.md:** если какие-то v0.7 pt'ы становятся obsolete с v0.6.3 mechanism (например, pt 11 standing-policy могло частично слиться с something в Group C) — удалить из active issue либо обновить scope.
4. **Companion sessions** для cross-skill changes (если Group D или Group F в scope) — feature-spec amendment отдельно, sequencing per dependency graph.
5. **Боевой прогон v0.6.3** — после implementation, на REH-ERP либо новом продукте. Retrospective findings → потенциальные v0.6.3 amendments либо v0.7 items.
6. **Cleanup pending hand-off'ов и planned items в ARCHITECTURE.md** — если v0.6.3 закрывает какие-то planned/deferred items, обновить refs.

---

**Конец hand-off.**
