# feature-backbone-convention — module-monolith feature backbone (hi_flow shared reference)

**Owner:** `hi_flow:bootstrap` (seeds it into new projects). **Read-only consumer:** `hi_flow:arch-spec` (consumes a project's declaration + emits enforcement). Single source of the convention's text — both skills reference it (DRY at the plugin level).

## What this is

The canonical **feature-backbone convention** of the modular monolith: the structural stance hi_flow seeds by default into new backend-service / fullstack projects and that arch-spec instantiates per feature. The module-monolith canon (Brown, Grzybek): a narrow published API per module, private internals, schema-per-feature ownership, boundaries held by **tooling** (depcruise) — not by language privacy.

## Scope / honesty

This is the **modular-monolith** style — hi_flow's recommended default for a single-deployable backend (and the backend tree of a fullstack), especially for solo+AI development where microservices are premature. It is NOT a universal law:

- It is **intra-codebase** module discipline (how modules inside one `src/` relate). It applies even to a single microservice's internals; it does NOT govern cross-service topology.
- Other styles (microservices topology, event-driven, layered-only) are not carried by this convention. Declining it is legitimate (see Consumer contract → bootstrap).
- The convention is the only structural style the plugin covers end-to-end today (P7); a declined / other style → structural governance is `unmanaged` for that project (existing graceful-degradation posture), not an error.

(Style orientation is documented for distribution in the project README at market-ready time, not re-litigated in seeded artifacts.)

## Two-axis frame

- **High cohesion within a feature** — everything one feature needs lives together (vertical slice); a change to a feature touches one place.
- **Low coupling between features** — a feature reaches another only through its declared **narrow public surface**; internals are private. Boundaries are enforced by tooling (depcruise), not by language access modifiers.

## The canonical principle — verbatim seed block

bootstrap copies the block below into a new project's `## Project-specific принципы` (rendered in the project's document language; Russian original). `P<N>` = next free principle number in that section (greenfield → `P1`).

```markdown
### P<N>. Фича — вертикальный модуль с узкой публичной поверхностью (backbone модульного монолита).

Каждая фича `<feature>` — вертикальный модуль: высокая связность внутри, низкое зацепление снаружи. Канон:
- фича **декларирует узкую публичную поверхность** — набор модулей фичи, импортируемых ИЗВНЕ фичи; все прочие модули фичи приватны;
- зависимости направлены **вниз**, без циклов; store — стабильное дно;
- **store фичи — единственный источник (SSoT)** данных фичи. Ownership персистентности — структурный слот, независимый от того, какой БД его подпирает; фича без состояния просто без store-модуля;
- границы держит **тулинг** (depcruise-правила), не приватность языка.

**Дефолтная форма скелета (типовая инстанциация, НЕ жёсткий мандат):** `<f>-shared` (типы, 0 зависимостей) → `<f>-store` (персистентность-SSoT, приватный) → `<f>-rules`/chokepoint (чистая функция инварианта, если есть) → домен-модули → read-model (проекция view-DTO) → `<f>-app` (секвенсинг — ТОЛЬКО при multi-module use-cases) → `<f>-api` (тонкий фасад). **Дефолтная публичная поверхность = {`<f>-shared`, read-model, `<f>-api`}.**

**Легальные вариации (потому принцип, а не шаблон):** platform-порты, которые фича намеренно отдаёт наружу, — тоже публичны; фича без единого фасада (эмиссия через bottleneck-хосты вместо facade).

Enforce машинно (per фича, эмитит `hi_flow:arch-spec`): narrow-public-entry forbidden-правило + направление вниз + ацикличность. Конкретная форма правила — по реальной раскладке модулей (arch-spec), не зафиксирована здесь.

Конвенция-источник: `hi_flow/references/feature-backbone-convention.md`. Согласуется со scaffold-конвенцией проекта (named exports, импорт по конкретному пути не через barrel, явный public-API).
```

## Machine form — narrow public entry (for arch-spec)

When a project declares this standard, arch-spec emits a per-feature `forbidden` rule:

```yaml
- name: <feature>-narrow-public-entry
  severity: HIGH
  principle: module-boundary-awareness        # D9 — no new principle needed
  from:
    path: ^src/                               # from outside the feature...
    pathNot: ^src/<feature>-|^src/main\.ts$   # ...except the feature itself + composition-root
  to:
    path: ^src/<feature>-                     # the feature's modules...
    pathNot: ^src/<feature>-(shared|<read-model>|api)/   # ...EXCEPT its public surface (+ platform ports)
```

- `<public-surface-allowlist>` = the feature's **declared** public surface (default `shared|<read-model>|api`, plus platform ports the feature deliberately exposes — Shared-capability lookahead, D26). **List the feature's ACTUAL public-surface module names** — resolve the `read-model` token to the real projection module, or **prune it** if the feature has no projection; never emit a literal `<read-model>`. The allowlist **must equal the public surface declared in §5** of the arch-spec (no drift between the §5 declaration and the rules-patch rule).
- **Layout-dependent.** `^src/<feature>-` is the flat-prefix default; for a nested layout (`^src/features/<feature>/`) adapt the regex to the project's actual module layout. The stance is fixed; the regex form is per-project (arch-spec resolves it, P8).
- Generalizes a store-encapsulation rule from the store to the whole feature.
- D9: cite `module-boundary-awareness`; related `vertical-slice-cohesion`. No new D9 principle needed.

## Consumer contract

**bootstrap (owner / forward carrier).**
- Seeds the verbatim principle block into `## Project-specific принципы` for project class `backend-service` / `fullstack` **only** (NOT frontend / CLI / library — frontend feature-isolation is a separate track; CLI/library are not module-monolith shaped). For fullstack, the backbone applies to the **backend tree**.
- Seeds the **layout-agnostic stance** + default form labeled "typical instantiation, not a mandate" — never a hardcoded regex (that is arch-spec's per feature, P8).
- `store = SSoT` is a structural slot, independent of whether the `database` axis is fixed yet.
- **Posture:** informing confirmation in product terms (P1/P6); the operator may decline (other architectural style → not seeded; structural governance `unmanaged` for that style — no silent fallback, principle 5).
- **Copy-on-seed:** the project's copy is independent thereafter; it is NOT re-synced if this reference later changes (self-containedness over plugin-side DRY for the project's own SSoT).

**arch-spec (read-only consumer + emitter).**
- Reads the declared standard from the project's `ARCHITECTURE.md` `## Project-specific принципы` (a **READ** — decoupling D21 forbids *writing* to ARCHITECTURE.md, not reading it).
- **If declared:** derive the module breakdown to conform + declare the feature's public surface (§5); emit `<feature>-narrow-public-entry` (§8 type-1 invariant + rules-patch rule), resolving the regex to the project's real layout, with platform ports in the allowlist. The narrow-entry allowlist must **equal the §5 public-surface declaration**.
- **`store = SSoT` is a structural slot, not a license to design persistence on an unfixed axis.** The store module exists in the breakdown regardless of which DB backs it; but if a greenfield feature forces an unfixed persistence axis, arch-spec's existing infra-axis signal still applies (run `hi_flow:bootstrap` first — arch-spec does not fix the stack, P8). Structural slot ≠ silently designing the persistence binding.
- **If absent:** inert — derive from responsibilities (unchanged behavior); emit nothing backbone-specific. This is the graceful degradation for mid-life adoption.

## Relationship to the scaffold convention

Consistent with bootstrap's scaffold reference pattern (`scaffold-templates/`): named exports (not `default`), explicit public-API types, and importing from a concrete path rather than a barrel (shown in the scaffold example's test). The scaffold demonstrates generic per-module mechanics; this backbone declares feature-composition on top. Different altitudes (P8) — they do not contradict, and the scaffold does not instantiate a feature (that is arch-spec's job).

## Principle, not template — legal variations

Because it is a principle, legitimate variations exist and must not be flagged as violations:
- platform ports a feature deliberately exposes are also public (belong in the allowlist);
- a feature with no single facade (emission through bottleneck hosts instead of a facade module).

Enforce mechanically: the **per-feature emitted rule is narrow-public-entry** (arch-spec → rules-patch). **Downward direction (SDP) and acyclicity are honored by arch-audit's existing whole-graph checks** (cycle detection + instability/SDP), NOT separate per-feature templates — do not invent bespoke per-feature acyclicity rules unless a specific risk warrants one.

## References

- `hi_flow/references/architectural-principles.md` — D9 library; `module-boundary-awareness` (cited by narrow-entry), `vertical-slice-cohesion` (related).
- `hi_flow/skills/arch-spec/references/rules-patch-template.yaml` — rules-patch format + a `<feature>-narrow-public-entry` example.
- Provenance: Reh_Erp `ARCHITECTURE.md` P2 (first instance); brief `Reh_Erp/docs/specs/2026-06-07-hi_flow-backbone-propagation-brief.md`; design `docs/superpowers/specs/2026-06-08-hi_flow-backbone-propagation-design.md`.
