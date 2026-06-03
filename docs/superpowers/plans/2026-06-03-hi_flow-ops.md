# hi_flow:ops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать скилл `hi_flow:ops` (SKILL.md + references + scaffold-templates) — владелец последней мили (отгрузка построенного проекта на удалённый сервер), personal-first, форма «профиль + рендер».

**Architecture:** Markdown-скилл (P2 — не код). Две операции: `fix-profile` (снять субстрат в operator-personal профиль) + `onboard <project>` (рендер проверенных шаблонов под проект×профиль). Атом onboarding: shape→render→wire→verify. Покрытие двухуровневое (covered/best-effort). Источник содержания секций — **design-спека** `docs/superpowers/specs/2026-06-03-hi_flow-ops-design.md` (§-ссылки в задачах). Источник содержания шаблонов — **боевая монорепа `Hedgeinform/zhenka`** (CD-эталон, оба варианта).

**Tech Stack:** Markdown (`SKILL.md` + `references/` + `references/templates/`). Формат — Claude Code plugin skill (frontmatter `name`/`description` + body). Образец формата/стиля — соседний `hi_flow/skills/bootstrap/SKILL.md`.

**Validation-модель (P2 — TDD неприменим, заменяется):**
- **Structural validation:** frontmatter валиден; обязательные секции на месте; формат как у bootstrap; plain Russian в operator-facing блоках (P1); шаблоны параметризованы (нет утёкших zhenka-литералов: реальных доменов, owner, секретов).
- **Behavioral validation:** subagent-симуляция сценариев на черновике SKILL.md (fix-profile; onboard container covered; onboard static covered; onboard off-profile → best-effort honesty; co-tenant: коллизия порта + `nginx -t`; re-onboard идемпотентность).
- **Spec compliance review:** subagent сверяет SKILL.md + references со спекой §1-13 (изолированный контекст).

**Sequencing-зависимости:**
- references (template-manifest, profile-schema) Task 1 — словарь, на который ссылается SKILL.md → раньше SKILL.md.
- templates (Tasks 2-3) — рендер-цели; могут идти параллельно с SKILL.md, но раньше behavioral-валидации.
- SKILL.md (Tasks 4-8) — ядро.
- Registration (Task 9) — после готового SKILL.md.
- Validation + фиксации (Task 10) — последняя.

**Параметризация шаблонов (единый токен-набор, Tasks 2-3):** `<PROJECT>` (slug), `<GHCR_OWNER>` (lowercased), `<DOMAIN>`, `<PORT_STAGING>`/`<PORT_PROD>` (внутр. порт сервиса), `<SERVER_DIR>` (напр. `/srv/<PROJECT>`), `<STATIC_ROOT>`, `<ENV_KEYS>` (список имён), `<HEALTH_PATH>` (`/health`). Все берутся из (проект × профиль) на рендере, не хардкодятся.

**Commit-политика:** коммиты — решение оператора (standing-правило). Шаги «Commit» — точки фиксации; исполнитель предлагает, не коммитит без согласия. Версия плагина — bump в обоих манифестах синхронно (D16) на финале.

---

### Task 1: references — template-manifest + profile-schema

**Files:**
- Create: `hi_flow/skills/ops/references/template-manifest.md`
- Create: `hi_flow/skills/ops/references/profile-schema.md`

**Источник:** спека §5 (поля профиля + типизация render-var/note + value-shapes + fix-profile inspection checklist), §7 (template-manifest строки), §10 (растёт строкой, не переписыванием).

- [ ] **Step 1: Создать `profile-schema.md`.**
  Таблица полей профиля из §5 (identity / reverse-proxy / tls / registry / secret-transport / env-model / server-layout / observability), каждое помечено `[render-var]` (value-shape) или `[note]`. Ниже — **fix-profile inspection checklist** (§5): read-only команды по полям (uname/os-release/docker; процессы прокси + sites-enabled; certbot/letsencrypt; `~/.docker/config.json` факт; `/srv`+`/home`; наличие `.env*` по именам **не содержимому**; observability-контейнеры + daemon.json). Зафиксировать: профиль живёт в **operator-personal** области (R3), это контракт/схема, не сам профиль; подтверждение оператором обязательно (principle 9). Включить sanitized-скелет заполненного профиля (плейсхолдеры, без реальных фактов).

- [ ] **Step 2: Создать `template-manifest.md`.**
  Таблица §7: `шаблон → форма (container/static/обе) → источник истины (файл zhenka)`. Строки: Dockerfile(container), docker-compose(container), deploy-{staging,prod}(container), deploy-web-{staging,prod}(static), configure-env(обе), vhost-snippet(обе), .env.example(обе), docs/ops-runbook(обе), vector(опц. container). Правило (§10): читается динамически; новая форма/рантайм = новая строка + файл, не переписывание. covered-набор сегодня = {container, static}. Явно: `ci.yml` — **артефакт bootstrap, не ops** (ops его reuse через `needs: test`).

- [ ] **Step 3: Structural check.** Оба файла существуют; в profile-schema каждое поле типизировано; checklist покрывает все поля; в template-manifest все строки имеют форму + источник; `ci.yml`-исключение зафиксировано; covered-набор не выдуман сверх реального (coverage-honesty на самом манифесте).

- [ ] **Step 4: Commit** (предложить): `docs(ops): template-manifest + profile-schema references`.

---

### Task 2: references/templates — контейнерная форма

**Files:**
- Create: `hi_flow/skills/ops/references/templates/container/Dockerfile`
- Create: `hi_flow/skills/ops/references/templates/container/docker-compose.yml`
- Create: `hi_flow/skills/ops/references/templates/container/deploy-staging.yml`
- Create: `hi_flow/skills/ops/references/templates/container/deploy-prod.yml`

**Источник истины (читать и параметризовать, НЕ сочинять с нуля):**
- Dockerfile: `C:\Users\Vegr\Projects\zhenka\zhenka-bot\Dockerfile` (локально).
- compose: `C:\Users\Vegr\Projects\zhenka\zhenka-bot\docs\ops\docker-compose-template.yml` (локально).
- deploy-{staging,prod}: GitHub `Hedgeinform/zhenka` — `gh api -H "Accept: application/vnd.github.raw" "repos/Hedgeinform/zhenka/contents/.github/workflows/deploy-staging.yml"` (и `deploy-prod.yml`).

- [ ] **Step 1: `container/Dockerfile`.** Прочитать zhenka Dockerfile; обобщить до generic Node/TS-сервиса (multi-stage build, как в источнике); заменить проектные литералы на токены. Без доменной специфики Женьки.

- [ ] **Step 2: `container/docker-compose.yml`.** Из docker-compose-template.yml: один сервис (+опц. staging-сосед) с `image: <GHCR_OWNER>/<PROJECT>:<tag>`, `restart: unless-stopped`, `ports: "<PORT_STAGING|PROD>:3000"`, `env_file: .env.<env>`, `healthcheck` (wget `<HEALTH_PATH>`, interval/timeout/retries как в источнике).

- [ ] **Step 3: `container/deploy-staging.yml`.** Из zhenka deploy-staging.yml: jobs `test (uses ci.yml) → build-push (buildx → ghcr.io/<GHCR_OWNER>/<PROJECT>:staging, cache gha) → deploy (environment: staging; appleboy/ssh-action: cd <SERVER_DIR>; docker compose pull <svc>-staging; up -d <svc>-staging; ps)`. Параметризовать context/tags/service.

- [ ] **Step 4: `container/deploy-prod.yml`.** Тот же скелет, что staging, **дельта:** `environment: production` (это включает 1-reviewer-аппрув на стороне GH Environments), сервис/тег `:main`/prod-порт. Подтвердить дельту по `gh api ... deploy-prod.yml`.

- [ ] **Step 5: Structural check.** Все 4 файла параметризованы; нет реального `hedgeinform`-литерала вне токена, нет реальных доменов/портов Женьки, нет секретов; staging↔prod различаются только `environment` + tag/port; deploy ссылается на `ci.yml` через `needs/uses`, не создаёт его.

- [ ] **Step 6: Commit** (предложить): `feat(ops): container-form scaffold templates`.

---

### Task 3: references/templates — статическая форма + shared

**Files:**
- Create: `hi_flow/skills/ops/references/templates/static/deploy-web-staging.yml`
- Create: `hi_flow/skills/ops/references/templates/static/deploy-web-prod.yml`
- Create: `hi_flow/skills/ops/references/templates/shared/configure-env.yml`
- Create: `hi_flow/skills/ops/references/templates/shared/vhost-snippet.md` (два варианта: proxy + static-root)
- Create: `hi_flow/skills/ops/references/templates/shared/.env.example`
- Create: `hi_flow/skills/ops/references/templates/shared/docs-ops-runbook.md`
- Create (опц.): `hi_flow/skills/ops/references/templates/container/vector.yml`

**Источник истины:**
- deploy-web-*: `gh api ... .github/workflows/deploy-web-staging.yml` (+ prod).
- configure-env: `gh api ... .github/workflows/configure-bot-env.yml`.
- vhost: nginx vhost `zhenka` (снят инспекцией; при нужде `ssh zhenka-vps "cat /etc/nginx/sites-enabled/zhenka"` — read-only).
- runbook: `C:\Users\Vegr\Projects\zhenka\zhenka-bot\docs\ops\vps-setup.md`.
- vector: `C:\Users\Vegr\Projects\zhenka\zhenka-bot\config\vector.yml`.

- [ ] **Step 1: `static/deploy-web-{staging,prod}.yml`.** Из zhenka deploy-web-staging.yml: один job `build-deploy` (environment), working-directory `<PROJECT>`, `npm ci` → пишет `.env.<env>` из `<ENV_KEYS>` (VITE_*) → `tsc -b` → `vite build --mode <env>` → verify `dist/index.html` → setup SSH → `rsync -avz --delete dist/ → <STATIC_ROOT>`. prod-дельта: `environment: production` + prod static-root. Параметризовать env-ключи + target.

- [ ] **Step 2: `shared/configure-env.yml`.** Из configure-bot-env.yml: **обобщить** идемпотентный `upsert_env` (убрать OpenAI/Женька-специфику; принимать generic `<ENV_KEYS>` из GH-секретов), `environment: production`, appleboy/ssh-action, `chmod 600`, рестарт сервиса + healthcheck. Сохранить свойство: значения не печатаются, транспорт SSH-encrypted (principle 3).

- [ ] **Step 3: `shared/vhost-snippet.md`.** Два блока nginx-vhost (из реального `zhenka` vhost): **(a) proxy** — `server_name <DOMAIN>`, `location / { proxy_pass http://localhost:<PORT>; ... }` + LE-блок (`ssl_certificate /etc/letsencrypt/live/<DOMAIN>/...`) + HTTP→HTTPS 301; **(b) static-root** — `root <STATIC_ROOT>; try_files $uri $uri/ /index.html;` + LE-блок. Инструкция применения: положить в sites-available, симлинк, **`nginx -t` перед `reload`** (co-tenant safety). OQ-ops-5: шаблон под фактический профиль (nginx); Caddy-расхождение runbook'а отмечено.

- [ ] **Step 4: `shared/.env.example`.** Имена ключей (плейсхолдеры), без значений. Generic-набор + комментарий «заполняется per-project, источник значений = GH secrets».

- [ ] **Step 5: `shared/docs-ops-runbook.md`.** Из vps-setup.md: обобщить до per-profile runbook'а. Разделить **host-bring-up (раз на коробку:** UFW/SSH-hardening/Docker/reverse-proxy/GHCR-auth/log-rotation/unattended-upgrades) и **per-project onboarding (директория/сеть/vhost/env/первый деплой).** Привести reverse-proxy к фактическому профилю (nginx), не Caddy (зафиксировать как профиль-зависимое).

- [ ] **Step 6 (опц.): `container/vector.yml`.** Из zhenka vector.yml — generic-конфиг сбора логов; пометить как опциональный observability-шаблон.

- [ ] **Step 7: Structural check.** Параметризованы; нет утёкших литералов/секретов; configure-env generic (не OpenAI); vhost содержит `nginx -t`-инструкцию; runbook разделяет host-уровень и project-уровень.

- [ ] **Step 8: Commit** (предложить): `feat(ops): static-form + shared scaffold templates`.

---

### Task 4: SKILL.md — frontmatter + Overview + scope-line + место в цепочке + природа артефакта

**Files:**
- Create: `hi_flow/skills/ops/SKILL.md`

**Источник:** спека §1 (идентичность, scope-линия «твоя машина vs не твоя», место в цепочке, природа артефакта), §9 (триггеры — для description). Образец формата — `hi_flow/skills/bootstrap/SKILL.md`.

- [ ] **Step 1: Frontmatter.** `name: ops`; `description:` — триггеры (RU+EN): «настрой доставку / выкати X на VPS / подключи проект к серверу / настрой CD для X / зафиксируй мой сервер / настрой deployment-профиль / set up delivery / deploy X to VPS»; одна строка про вход (готовый проект + профиль) и выход (CD-воркфлоу + compose/Dockerfile + docs/ops + первый staging-деплой). Anti-triggers (§9): не writing-plans (план фичи), не bootstrap (фундамент/стек), не living-architecture (документ), не локальный preview («твоя машина»).

- [ ] **Step 2: Overview + scope-линия + место в цепочке.** Из §1: владелец последней мили; **«твоя машина vs не твоя»** (локальный preview вне ops); цепочка `…bootstrap → writing-plans → [работает на твоей машине] → ops (на не-твою)`; ops терминален в DAG плагина.

- [ ] **Step 3: Природа артефакта.** Markdown-скилл + scaffold-templates, не code-скилл с рантаймом; рендер = инстанцирование шаблонов агентом; следствие — OQ11 на ops не ложится.

- [ ] **Step 4: Structural check.** Frontmatter валиден; Overview/scope-линия/место/природа на месте; anti-triggers перечисляют 4 случая; plain Russian.

- [ ] **Step 5: Commit** (предложить): `feat(ops): SKILL.md frontmatter + overview + scope`.

---

### Task 5: SKILL.md — костяк (профиль+рендер, две операции, атом, form-detection)

**Files:**
- Modify: `hi_flow/skills/ops/SKILL.md`

**Источник:** спека §4 (две операции, атом shape→render→wire→verify, form-detection rule, порядок секретов), §5 (профиль — pointer на `references/profile-schema.md`).

- [ ] **Step 1: Секция «Две операции».** `fix-profile` (редкая, снять субстрат в operator-personal профиль — pointer на profile-schema.md + inspection checklist) + `onboard <project>` (частая, рендер под проект×профиль). Не дублировать схему профиля — pointer (size discipline).

- [ ] **Step 2: Секция «Атом onboarding» shape→render→wire→verify.** §4: **shape** (form-detection rule: форма из project class/`## Stack` bootstrap, не угадывать; frontend→static, backend/бот→container, fullstack→две; неоднозначно→спросить, P6 + проектные факты: имя/домен/порт/env-ключи); **render** (из template-manifest по форме); **wire** (GHCR-owner, GH secrets/Environments, серверная директория+сеть, vhost через `nginx -t && reload`, серт; **CD-воркфлоу создаёт ops**, существующую заглушку достраивает — не дублирует; **порядок секретов:** configure-env перед первым деплоем, «секреты на коробке» = precondition); **verify** (staging-деплой зелёный + healthcheck; prod никогда авто; при красном — abort/rollback, см. Task 8).

- [ ] **Step 3: Structural check.** Обе операции описаны; атом — 4 шага; form-detection явно «из bootstrap, не угадывать»; CD создаёт ops (не «усыновляет bootstrap-stub» — этой посылки нет); порядок секретов зафиксирован; профиль/манифест — pointers.

- [ ] **Step 4: Commit** (предложить): `feat(ops): core model — profile+render, atom, form-detection`.

---

### Task 6: SKILL.md — пять забот + модель покрытия + co-tenant safety

**Files:**
- Modify: `hi_flow/skills/ops/SKILL.md`

**Источник:** спека §6 (пять забот, профиль/проект-уровень, `/health`-контракт, port-allocation, двухуровневое покрытие covered/best-effort + две оговорки, co-tenant safety R7, probing вырожден, концептуальное отличие от bootstrap).

- [ ] **Step 1: Секция «Пять забот».** Чек-лист (хост/рантайм, упаковка+CD, секреты, сеть, наблюдаемость+восстановление) — **рабочий, не закрытый** (§10). Распределение по профиль/проект-уровню (§6): host-bring-up раз на коробку vs per-project. `/health`-контракт (200; статика — index 200) — обязательство проекта, ops потребляет. Port-allocation: скан диапазона профиля → следующий свободный.

- [ ] **Step 2: Секция «Модель покрытия».** Два уровня: **covered** (есть шаблон → турнкей) / **best-effort** (нет шаблона → ad-hoc) + две оговорки: (1) прозрачность гарантии (best-effort подаётся как best-effort, principle 5), (2) путь промоушена (взлетевший → covered, ось роста §10; полная механика — OQ-ops-4). Концептуально: bootstrap coverage = целостность цепочки (кормит др. скиллы); ops coverage = доверие/качество + безопасность субстрата (ops терминален в DAG). Probing вырожден (профиль единствен → не фейкать выбор).

- [ ] **Step 3: Секция «Co-tenant safety» (R7).** ops терминален в плагине, но не изолирован на субстрате (живые демо заказчиков). Идемпотентные, co-tenant-aware операции + verify-before-done (`nginx -t` до reload, проверка занятости портов, `compose config` до up) + abort/rollback (Task 8). Применяется к covered и best-effort (сквозное, не уровень покрытия).

- [ ] **Step 4: Structural check.** Пять забот + профиль/проект-разделение; `/health` определён; покрытие двухуровневое с оговорками; co-tenant — отдельная секция; концептуальное отличие от bootstrap явно.

- [ ] **Step 5: Commit** (предложить): `feat(ops): five concerns + coverage model + co-tenant safety`.

---

### Task 7: SKILL.md — что производит/куда пишет + границы + расширяемость

**Files:**
- Modify: `hi_flow/skills/ops/SKILL.md`

**Источник:** спека §7 (артефакты по месту, SSoT-карта, decoupling ARCHITECTURE.md), §8 (границы bootstrap/D14/writing-plans/living-architecture, два шва, best-effort open seam OQ-ops-7), §10 (расширяемость).

- [ ] **Step 1: Секция «Что производит и куда пишет».** §7: артефакты по месту (репа проекта / operator-personal профиль / GitHub secrets+Environments / сервер). SSoT-карта (механика→репа, факты коробки→профиль, значения секретов→GH→`.env`-проекция, деплой-привязка→`docs/ops/`). **ARCHITECTURE.md ops не пишет** (R5, decoupled как arch-spec/D21).

- [ ] **Step 2: Секция «Границы».** §8: bootstrap («конверт рано, машинерию поздно»; CD — собственность ops, создаёт сам); два шва (секреты: конвенция чтения=bootstrap / стор=ops; deployment-bound оси: адаптер-API=bootstrap / эндпоинт=ops, на профиле zhenka-vps схлопывается в секреты+сеть, общая граница сохраняется); D14-уточнение (R6: ops владеет deploy/CD-шаблонами; superpowers=методология нового кода); writing-plans (ops последняя миля, своей работе на covered-пути не требует); living-architecture (decoupled).

- [ ] **Step 3: Секция «Открытый шов best-effort» (OQ-ops-7).** Честно: «детерминизм без writing-plans» верно только для covered; best-effort = недетерминированный config-authoring без владельца исполнения (у superpowers нет deployment-скилла) → шов открыт, не выдаётся за решённое.

- [ ] **Step 4: Секция «Расширяемость».** §10: три оси (больше профилей / больше форм / distributable как probe-to-fill перед тем же ядром). Принцип «растёт данными, не переписыванием»; профиль — шов distributable.

- [ ] **Step 5: Structural check.** SSoT-карта полна; R5 (не пишет ARCHITECTURE.md) явно; границы покрывают bootstrap/D14/writing-plans/living-architecture + два шва; best-effort-шов честно открыт; расширяемость — три оси.

- [ ] **Step 6: Commit** (предложить): `feat(ops): outputs/SSoT + boundaries + extensibility`.

---

### Task 8: SKILL.md — вход/триггеры + done + failure/rollback + идемпотентность + anti-patterns

**Files:**
- Modify: `hi_flow/skills/ops/SKILL.md`

**Источник:** спека §9 (кто запускает, триггеры, анти-триггеры, done-критерий, failure/abort/rollback, идемпотентность повторного onboard, prod-гейт).

- [ ] **Step 1: Секция «Вход и триггеры».** §9: только оператор, никогда авто (P6); upstream-сигнал подсказывает, не запускает. Триггеры fix-profile / onboard + анти-триггеры (writing-plans / bootstrap / living-architecture / локальный preview).

- [ ] **Step 2: Секция «Done-критерий».** covered onboarding: CI зелёный → секреты на коробке (precondition) → staging-деплой → healthcheck зелёный → reverse-proxy+TLS (`nginx -t`+серт) → co-tenant проверена → запись в `docs/ops/`. prod — отдельный загейченный шаг (GH approval); done = staging живой + prod провязан-и-загейчен. best-effort: deliverable = настройка + громкий сигнал + предложение промоушена, под турнкей-гейты не подводится.

- [ ] **Step 3: Секция «Failure / abort / rollback» (R7).** При красном на любом гейте — abort с откатом до пред-шага (vhost невалиден→не reload, снять конфиг; деплой/healthcheck красный→`compose down` нового сервиса, освободить порт, соседей не трогать; шаг задел бы соседа→стоп+сигнал). Откат логируется (principle 5).

- [ ] **Step 4: Секция «Идемпотентность повторного onboard».** `onboard X` на уже подключённом → update (обнаружить vhost/порт/директорию/воркфлоу, обновить на месте), не дубль. Re-run безопасен.

- [ ] **Step 5: Секция «Anti-patterns».** Не авто-запуск; не молча best-effort за турнкей; не писать ARCHITECTURE.md; не трогать соседей (co-tenant); не хардкодить факты коробки (профиль); не фейкать probing-выбор.

- [ ] **Step 6: Structural check.** Триггеры+анти-триггеры; done перечислим; failure/rollback явно (co-tenant-критично); идемпотентность; anti-patterns покрывают R5/R7/probing.

- [ ] **Step 7: Commit** (предложить): `feat(ops): entry/triggers + done + rollback + anti-patterns`.

---

### Task 9: Plugin registration + version bump

**Files:**
- Modify: `hi_flow/.claude-plugin/plugin.json` (если требуется явная декларация скилла)
- Modify: `.claude-plugin/marketplace.json` (version bump — синхронно, D16)

**Источник:** D16 (release flow — bump в обоих манифестах синхронно), D6 (структура плагина).

- [ ] **Step 1: Проверить механизм регистрации.** Авто-обнаружение `hi_flow/skills/<name>/SKILL.md` или декларация в plugin.json? Свериться с тем, как зарегистрированы bootstrap/arch-spec. Действовать по факту.

- [ ] **Step 2: Version bump (D16).** Поднять версию в `hi_flow/.claude-plugin/plugin.json` И в записи `hi_flow` корневого `.claude-plugin/marketplace.json` — **синхронно**. Текущая (свериться) → minor bump (новый скилл).

- [ ] **Step 3: Structural check.** Версии совпадают; ops-скилл обнаруживается.

- [ ] **Step 4: Commit** (предложить): `chore(ops): register skill + bump plugin`. NB оператору: после push — manual `git fetch && git merge --ff-only` в marketplace cache (D16).

---

### Task 10: Validation + report + ARCHITECTURE.md фиксации

**Files:**
- (правки по находкам — inline)
- Create: `docs/superpowers/specs/2026-06-03-hi_flow-ops-design-report.md`

**Источник:** P2 (validation-модель), P5 (apply + move on), спека §1-13 (compliance), §11 (фиксации).

- [ ] **Step 1: Structural validation pass.** Frontmatter валиден; секции §1-10 покрыты; pointers (manifest/profile-schema/templates) корректны; plain Russian operator-facing; size discipline (профиль/манифест не дублированы в SKILL.md); шаблоны без утёкших литералов/секретов.

- [ ] **Step 2: Behavioral validation (dispatch fresh subagent).** Сценарии на черновике SKILL.md: (a) **fix-profile** на zhenka-vps (read-only инспекция → профиль создан корректной формы); (b) **onboard container covered** (рендер compose+deploy+configure; staging-гейт; healthcheck); (c) **onboard static covered** (rsync-вариант, deploy-web); (d) **onboard off-profile** (нужен Postgres на коробке → best-effort сигнал + честность, не молча турнкей); (e) **co-tenant** (коллизия порта обнаружена; `nginx -t` до reload; abort при красном); (f) **re-onboard** (идемпотентный update, не дубль). Субагент: ведут ли инструкции к корректному поведению; где двусмысленность.

- [ ] **Step 3: Spec compliance review (dispatch fresh subagent, изолированный контекст).** Сверить SKILL.md + references со спекой §1-13. Особо: scope-линия, R1-R7, граница D14, decoupling ARCHITECTURE.md, best-effort-шов честно открыт, co-tenant.

- [ ] **Step 4: Apply safe fixes inline; human-required findings → оператору.** Без повторного полного review (P5).

- [ ] **Step 5: Implementation report.** `docs/superpowers/specs/2026-06-03-hi_flow-ops-design-report.md` (стандарт CLAUDE.md: what was done / deviations / issues discovered / open items). Отметить статус OQ-ops-1..7.

- [ ] **Step 6: ARCHITECTURE.md фиксации (через скилл `architecture`, proposal-flow).** §11 спеки: D23 → закрыть TO-DESIGN (ссылка на спеку); **D14 — амендмент** (снять «Dockerfile/CD=superpowers», ops владеет шаблонами); D20 — уточнение (ops как function-cluster + decoupling); Module Map → `hi_flow/skills/ops/` BUILT; Topic Index кандидаты (`deployment-profile`, `coverage (ops vs bootstrap)`, `co-tenant-safety`); **bootstrap-амендмент (открыто)** — кладёт ли bootstrap CD-stub под ops. Каждое — через proposal-flow architecture-скилла (оператор подтверждает).

- [ ] **Step 7: Commit** (предложить): `test(ops): structural+behavioral+compliance validation + report`.

---

## Self-Review (выполнено при написании плана)

**Spec coverage:** §1 → Task 4; §2 (субстрат/эталон) → Tasks 2-3 (источники шаблонов); §3 (R1-R7) → распределено (R1/R2 костяк Task 5; R3 Task 1; R4/R7 Task 6; R5 Task 7; R6 Task 7); §4 → Task 5; §5 → Task 1; §6 → Task 6; §7 → Task 1 (manifest) + Task 7 (что пишет); §8 → Task 7; §9 → Task 8; §10 → Task 7; §11 → Task 10 Step 6; §12 (OQ) → Task 10 report + соотв. секции SKILL.md; §13 → источники Tasks 2-3. Gap: нет.

**Placeholder scan:** содержание секций задаётся через §-ссылки на спеку + ключевые пункты (structural contract markdown-скилла), шаблоны — через источник+токены параметризации. Нет «add appropriate X», нет код-плейсхолдеров.

**Type/имя consistency:** имена артефактов (`template-manifest.md`, `profile-schema.md`, `references/templates/{container,static,shared}/...`) консистентны между Task 1-3 (создание) и Tasks 4-8 (ссылки-pointers). Токены параметризации (`<PROJECT>`/`<GHCR_OWNER>`/`<DOMAIN>`/`<PORT_*>`/`<SERVER_DIR>`/`<STATIC_ROOT>`/`<ENV_KEYS>`/`<HEALTH_PATH>`) едины во всех template-задачах. Термины (профиль/рендер, covered/best-effort, co-tenant, shape→render→wire→verify, R1-R7, OQ-ops-1..7) — из спеки, единообразны.
