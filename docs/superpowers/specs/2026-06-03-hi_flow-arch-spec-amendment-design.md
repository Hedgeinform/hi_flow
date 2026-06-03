# hi_flow:arch-spec amendment (B + C + D + E) — Design

**Date:** 2026-06-03
**Status:** signed
**Type:** amendment (incremental) к BUILT `hi_flow:arch-spec`
**Scope source:** первый боевой прогон arch-spec (REH ERP audit, green field, 2026-05-31). Scope финализирован 2026-06-02 (после impl bootstrap — C переоценён, B/D уточнены). Развилка E решена оператором 2026-06-03.
**Consumer:** отдельная сессия имплементации (P4 + handoff anti-pattern #2) → `superpowers:writing-plans` → subagent-driven batched impl (P5).

**First sources:**
- `docs/feedback/hi_flow-arch-spec-feedback.md` (3 пункта per-skill).
- `docs/feedback/hi_flow-session-retro-2026-05-31.md` (chain-level).
- `docs/handoffs/2026-06-01-arch-spec-feedback-roadmap-handoff.md` (находки A–G, порядок сессий).
- `docs/active-issues.md` § HIGH (scope finalized 2026-06-02).

---

## 1. Контекст и stale-check

Первый боевой прогон цепочки `feature-spec → arch-spec → writing-plans → impl` на REH ERP (green field) дал работающий софт и выявил 7 находок (A–G). A закрыта постройкой `hi_flow:bootstrap` (BUILT v0.7.1, боевой прогон 2026-06-02). Эта спека закрывает arch-spec-находки **B, C, D, E**. F (denylist REH-проекта) и G (plan-баги REH) — вне scope (проектные REH, backported).

**Stale-check (2026-06-03):** scope финализирован 2026-06-02 — уже после постройки bootstrap. Именно bootstrap схлопнул C из «моста» в «сигнал» и сдвинул baseline-часть D. Коммиты после 2026-06-02 только фиксируют этот scope. Обстоятельства не менялись — scope актуален.

## 2. Что отработало правильно — НЕ трогать (guard)

Боевой прогон **подтвердил** корректность соседних механизмов. Правки B/C/D/E не должны их задевать (урок handoff §2 + ложная находка «green-field cross-cutting слепое пятно block C» — снята, не переоткрывать):

- **Extract-before-probing** (Operational rule 1) — работает.
- **Density-factor self-assessment** — корректно оценил плотно-решённую фичу как `direct`.
- **Green-field block-C skip** — по дизайну; forward-контракты ушли в инварианты + rules-patch (слот type-1 → rules-patch существует, D11 cumulative cycle).
- **Probing-таксономия** — floor 1-4 + сработавшие ceiling + **корректный анти-триггер ACL** (не паддил пустую категорию).
- **Two-level operability triage**, изолированный self-review субагентом, backlog-sync с idempotency.
- **Эмиссия sync-in-txn** — корректный вывод, что глобальный принцип 7 не нарушается (single-DB fate-sharing), без ложной эскалации.

## 3. Находка B — разведение §10 на два под-канала (главная)

### Проблема
Контракт §10 — *«choose having seen the code, mind the constraint»* → потребитель `superpowers:writing-plans`. Но решения вида «выбор scheduler для retention purge», «выбор object-storage backend (S3/MinIO/свой)» этот тест НЕ проходят: они deployment-bound (решаются знанием deployment-модели), а не code-sight. Отданные writing-plans, они либо спунтуют (cargo-cult, нарушение «never delegate understanding» + «фиксация решений в момент принятия»), либо угадаются без контекста. §10 валит оба типа в один бакет.

### Решение
Развести §10 на два под-раздела с явно противопоставленными потребителями. **Пост-bootstrap граница:** §10.2 = привязки ВНУТРИ уже зафиксированной оси (конкретный scheduler, конкретный blob-backend), **НЕ** фиксация самой оси — фиксация осей теперь у bootstrap (D20, P8). Тест разведения: «разрешается ли решение разглядыванием кода?» Нет → §10.2.

### Конкретные правки

**`hi_flow/skills/arch-spec/SKILL.md`:**

1. «Output document → Structure — 10 sections», п.10 (текущее: *«10. Delegated to implementation — explicit forks for writing-plans...»*) → переписать в два под-канала:
   - **§10.1 Code-sight forks** → writing-plans. Формулировка как сейчас: «choose having seen the code, mind the constraint».
   - **§10.2 Deployment-bound bindings** → отдельный канал: рекомендованный дефолт + констрейнт + явная отметка «unblocks when the deployment model is fixed». **НЕ** open choice для writing-plans.
   - Добавить **separation test** в текст: *"Resolvable by reading the code? No → §10.2 (deployment-bound), not §10.1."*
   - Добавить **post-bootstrap boundary note:** §10.2 — bindings inside an already-fixed axis (concrete scheduler, blob-backend); fixing the axis itself is bootstrap's job (D20, P8). Не путать «привязка внутри оси» с «фиксацией оси».

2. «Sorting feature-spec deferred items (severity → destination)»: строка *«желательно / RESOLVED-direction → §10 (delegated to implementation) if it needs code-sight, else §3»* расщепляется:
   - code-sight fork → **§10.1**
   - deployment-bound binding → **§10.2**
   - иначе → §3 (deferred-pointer).

3. «Reading feature-spec statuses» (RESOLVED-direction → §10 delegated): уточнить ссылку — code-sight → §10.1.

4. «Escalation → Foreseen» (*«delegated to implementation (→ section 10, with an instruction)»*): уточнить, что делегация идёт в §10.1 или §10.2 по separation test.

5. «Analysis blocks A-E → document sections» таблица: D-строка остаётся `7, 8, 10` (10 теперь с под-разделами; block-map не плывёт — под-разделы, а не новая §11).

6. **Blanket reference rule (для холодного имплементатора).** Голые ссылки на §10 как на целый delegated-кластер **остаются `§10`** (block-map D = `7,8,10`; template line-9 `D = §7,8,10`; anti-patterns; «No open questions» контекст). Расщепляются на §10.1/§10.2 **только routing-решения** (edits #2/#3/#4 — куда класть конкретный delegated item). Правило: ссылка на «куда писать конкретную делегацию» → §10.1 или §10.2 по separation test; ссылка на «секцию delegated вообще» → §10.

**`hi_flow/skills/arch-spec/references/arch-spec-template.md`:**
- §10 (текущее: один блок «Delegated to implementation») → §10.1 + §10.2 с двумя паттернами заполнения и separation test в filling-note. Сохранить 10-секционную нумерацию (под-разделы §10.1/§10.2).

**`hi_flow/skills/arch-spec/references/self-review-checklist.md`:**
- Новый чек в секцию про §10/derivation: *«§10 delegations split correctly: code-sight → §10.1, deployment-bound → §10.2. No deployment-bound binding sent to writing-plans as an open choice.»*

## 4. Находка C — схлопывание в чистый сигнал

### Проблема (исходная) и переоценка
Исходно (C-High, мостовой): первый arch-spec на green field обязан кристаллизовать минимально-необходимое подмножество стека + нужна таксономия инфра-осей. **После постройки bootstrap** (D20 Функция 1, P7, P8): bootstrap забрал app-stack fixation + таксономию инфра-осей (живёт в `hi_flow/skills/bootstrap/references/axis-taxonomy.md`). Мостовое бремя снято. C сводится к **чистому сигналу** (High-мост → Low-сигнал).

### Решение
arch-spec не фиксирует стек и не дублирует таксономию. В green-field-ветке — громкий сигнал: «инфра-ось не зафиксирована → запусти bootstrap». Это **чистый ADD** сигнала: в SKILL.md фиксации стека никогда не было, удалять мостовое бремя не из чего.

### Конкретные правки

**`hi_flow/skills/arch-spec/SKILL.md`:**

1. Pre-conditions → **новый короткий абзац-note под таблицей «Three situations by audit»** (НЕ в ячейку green-field row — сигнал многострочный): добавить —
   > *Green field + app-stack/infra-axis not yet fixed: this is bootstrap's territory, not arch-spec's. Loud signal (principle 5): «The feature forces an infra-axis (DB / blob / scheduler / ...) that the project has not fixed. Run `hi_flow:bootstrap` first — it owns app-stack fixation + the infra-axis taxonomy (`bootstrap/references/axis-taxonomy.md`). arch-spec does NOT fix the stack and does NOT duplicate the taxonomy (P8 — altitude: project-foundation ≠ feature-design).» Cross-ref D20, P8.*

2. «Common Rationalizations» — опционально добавить строку: *«Green field, no stack — I'll just fix it in the spec» → Stack fixation is project-level (bootstrap, D20/P8). arch-spec signals, does not fix.* (если не раздувает — один ряд).

3. Убедиться, что нигде не появляется мостовая формулировка «arch-spec фиксирует feature-forced подмножество» — её быть не должно (anti-pattern handoff §8.3: C-мост сознательно НЕ возвращать).

## 5. Находка D — composition-root-aware rules-patch

### Проблема
Сгенерированный rules-patch содержит type-1 правила «только X→Y» (строгие negative-lookahead `from`-паттерны), не оставляющие легального места central composition-root (`src/main.ts` / wiring-слой), который по природе импортирует много модулей. depcruise флагует composition-root как нарушителя. В REW примирено руками (exemption в depcruise .yaml + .cjs).

### Решение
arch-spec при генерации type-1 правил «только X→Y» кладёт composition-root-пути в `from.pathNot`. Перечень composition-root-путей — **проектная константа baseline-уровня** (P8: project-level, определяется один раз, не изобретается per-feature). arch-spec ссылается на baseline-определение если оно есть, иначе использует дефолт-список `src/main.ts` / `src/bootstrap/` / `src/composition/`. **Технический нюанс:** в depcruise exemption должен быть в `from.pathNot` каждого forbidden-правила (отдельное «allowed»-правило не отменяет forbidden) — поэтому baseline владеет *определением* перечня, а arch-spec *применяет* его в каждом сгенерированном правиле.

**Каноническое encoding (устраняет двусмысленность для имплементатора).** В сгенерированном type-1 правиле блок `from` несёт **два ортогональных под-поля**, склеиваемых depcruise по AND:
- `from.path` — **feature-allowlist** через negative-lookahead (`^src/(?!auth-middleware|pipeline-engine|admin-crud)/`): «модуль-источник, не входящий в список разрешённых импортёров».
- `from.pathNot` — **composition-root exemption** (baseline-константа): `^src/(main\.ts|bootstrap/|composition/)`.

Composition-root идёт **в отдельный `from.pathNot`, НЕ вплавляется в lookahead `from.path`** — это сохраняет project-wide exemption (baseline) отделимым от per-feature allowlist (фича). Folding в один regex смешал бы две высоты (P8) и сломал бы единообразное применение baseline-конвенции ко всем правилам. SKILL.md-формулировка «negative-lookahead `from`» описывает форму allowlist'а (`from.path`), а не механизм exemption'а — exemption всегда отдельным `from.pathNot`.

### Конкретные правки

**`hi_flow/skills/arch-spec/SKILL.md`:**
- Fitness invariants → «rules-patch format = same as arch-redesign (D11)» (или рядом): добавить правило генерации — *«When generating type-1 "only X→Y" rules (negative-lookahead `from`), include composition-root paths in `from.pathNot` so the wiring layer is legal. The composition-root path set (`src/main.ts` / `src/bootstrap/` / `src/composition/`) is a project-level baseline constant — reference the baseline definition if present, else use the default list; do not invent it per-feature (P8). Without the exemption depcruise flags the composition-root as a violator.»*

**`hi_flow/skills/arch-spec/references/rules-patch-template.yaml`:**
- Обновить пример forbidden-правила `no-feature-code-to-audit-emitter`: **сохранить** существующий `from.path` (negative-lookahead allowlist) и **добавить отдельное** `from.pathNot: ^src/(main\.ts|bootstrap/|composition/)` + комментарий, что список — baseline-конвенция (project-wide, не per-feature), что `pathNot` ортогонален `path` (AND), и зачем exemption нужен (иначе depcruise флагует wiring-слой).

**`hi_flow/skills/arch-spec/references/self-review-checklist.md`:**
- Новый чек в «rules-patch validity»: *«type-1 "only X→Y" rules include composition-root exemption in `from.pathNot` (wiring layer `src/main.ts`/`src/bootstrap/`/`src/composition/` not flagged).»*

### Вне scope D
Правка самого baseline-файла (`~/.claude/architecture/stacks/references/typescript-baseline.md` — формальное документирование composition-root-конвенции) — **baseline/bootstrap-территория**, не эта сессия. arch-spec лишь ссылается «if defined at baseline, use it; else default list».

## 6. Находка E — security-тег + D14-клауза

### Проблема
Adversarial-ревью (трассировал trust-chain за границу диффа: emitter → redactSecrets) поймал реальный security-баг, внесённый на шаге **writing-plans**: secret-filter не рекурсил в массивы → секреты текли в `payload_json` / offload-blob. arch-spec был **корректен** (инвариант §8 #5 верен), баг — в референс-коде плана. Урок: для security-инвариантов «matches the spec» недостаточно; нужно ревью, прослеживающее trust-chain, а не дифф-локальное.

### Решение (выбор оператора 2026-06-03: пометка §8 + D14-клауза)
arch-spec **тегает** security-critical инварианты маркером — сигнал downstream. Сам ревью — методология, остаётся в superpowers (D14). Плюс — явная D14-клауза в ARCHITECTURE.md, чтобы тег не прочитался как «hi_flow теперь владеет security-ревью». Закрывает OQ12 целиком.

**Canonical tag (pinned — идентично во всех трёх файлах, имплементатор не варьирует):**
- **Литерал тега:** `[trust-chain review required — not diff-local]`
- **Placement:** инлайн-суффикс в ячейке `Invariant` таблицы §8 (не отдельная колонка — таблица `# | Invariant | Mechanism | D9 principle` остаётся 4-колоночной; тег висит на формулировке инварианта).
- **Когда ставится:** инвариант security-critical (секреты / PII / trust-boundary — триггеры §5.7).
Один и тот же литерал — в SKILL.md (определение конвенции), template (filling-note + пример), self-review-checklist (matching). Никаких вариантов формулировки.

### Конкретные правки

**`hi_flow/skills/arch-spec/SKILL.md`:**
- Fitness invariants → «Classification by check mechanism» (или рядом): ввести конвенцию тега с **каноническим литералом** (см. pin выше). *«A security-critical invariant (secrets / PII / trust boundary — §5.7 triggers) carries the inline marker `[trust-chain review required — not diff-local]` on its §8 statement. This is a downstream signal to writing-plans / reviewer: "matches the spec" is insufficient; the invariant needs adversarial review tracing the data flow past the diff boundary. arch-spec only TAGS — the review methodology is superpowers (D14), not hi_flow.»* Опц. мотивирующий кейс одной строкой (secret-filter array-recursion) — без раздувания.

**`hi_flow/skills/arch-spec/references/arch-spec-template.md`:**
- §8 invariants table — инлайн-суффикс `[trust-chain review required — not diff-local]` в ячейке `Invariant` (4-колоночная таблица не меняется) + пример строки с тегом + filling-note: когда тег ставится (security-critical: секреты/PII/trust-boundary, триггеры §5.7) и что это downstream-сигнал, не реализация ревью.

**`hi_flow/skills/arch-spec/references/self-review-checklist.md`:**
- Новый чек в «Fitness invariants»: *«Security-critical invariants (secrets / PII / trust boundaries) carry the `[trust-chain review required — not diff-local]` tag on their §8 statement.»*

**`ARCHITECTURE.md` (через скилл `architecture`, на закрытии):**
- D14 += boundary-клауза: *«Security-review methodology (adversarial trust-chain review of security invariants) = superpowers, не hi_flow. arch-spec только ТЕГАЕТ security-critical инварианты как требующие trust-chain ревью (downstream-сигнал §8); сам ревью не выполняет и не определяет.»* Закрывает OQ12.

## 7. Out of scope (не переоткрывать)

- **Системное владение app-stack** — это A → bootstrap (BUILT). C здесь = только сигнал.
- **Правка baseline-файла** (D composition-root-конвенция) — baseline/bootstrap-территория.
- **Review methodology** (E) — superpowers (D14).
- **Имплементация amendment'а** — отдельная сессия (P4, P2/P5, handoff anti-pattern #2). Эта спека — design + report.
- **F (denylist), G (plan-баги)** — проектные REH, backported.
- Соседние механизмы §2 — НЕ «улучшать».

## 8. Закрытие (через скилл `architecture`, после approval спеки)

Per handoff §9 + CLAUDE.md стандарт:
1. **Design report** рядом со спекой (`{spec}-report.md`) — на сессию имплементации (отчёт о реализации). Эта design-сессия пишет саму спеку.
2. **ARCHITECTURE.md** (через `architecture` write-flow, с confirmation для Active Decisions / D14):
   - Новый **D (amendment)** — pointer: «arch-spec amendment: §10 split (code-sight §10.1 / deployment-bound §10.2), green-field stack-fixation signal (C→сигнал), composition-root-aware rules-patch (D), security-tag + D14 boundary (E)». **Spec:** эта спека.
   - **D14** += E boundary-клауза.
   - **OQ12** → закрыт (Open Questions удалить, отражено в D14 + новом D).
   - **Module Map** arch-spec — отметить amendment-design-ready; version-sync на сессию имплементации.
3. **active-issues.md** § HIGH «arch-spec amendment (B+C+D+E)» → обновить: «design signed (`docs/superpowers/specs/2026-06-03-...`), impl pending». Полное удаление записи — после имплементации.
4. **Version bump** манифестов (D16 release flow) — на **сессию имплементации**, не design (контент скилла меняется при impl).

## 9. Implementation notes (для следующей сессии)

- P2 (skill = LLM instructions) + P5 (subagent-driven batched): правки markdown layered поверх текущего SKILL.md + 3 references. Батчить по находкам или по файлам.
- Read current state перед правкой (global принцип 9): SKILL.md/references могли измениться.
- После impl: behavioral validation (clarity) опц.; isolated subagent self-review спеки — для этой design-спеки (см. §10 ниже), не для skill-контента.
- D16: bump `hi_flow/.claude-plugin/plugin.json` И запись в корневом `marketplace.json` синхронно → commit → push → fetch+ff в cache.

## 10. Spec self-review (изолированный субагент)

Per глобальная инструкция (brainstorming Spec Self-Review через изолированного субагента) + handoff §8.6. После записи — dispatch свежего субагента (Agent tool, isolated context) на поиск проблем спеки: placeholders, противоречия, неоднозначность, scope. Применить safe-fixes, human-required — оператору.

---

**Конец design-спеки.**
