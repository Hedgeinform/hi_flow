# hi_flow:ops — Design Spec

**Дата:** 2026-06-03
**Статус:** design (signed) → готов к writing-plans
**Закрывает:** D23 (внутренний дизайн ops, был TO DESIGN), уточняет D14 / D20.
**Вход сессии:** D23 (Active Decisions) + `docs/handoffs/2026-06-02-ops-skill-design-handoff.md` (recovery-контекст) + bootstrap (`SKILL.md`, `references/axis-taxonomy.md`, `references/coverage-manifest.md`) + **боевое заземление на реальном субстрате** (VPS `zhenka-vps`, read-only инспекция 2026-06-03) + CD-эталон монорепы `Hedgeinform/zhenka`.
**Spec self-review:** проведён через изолированного субагента 2026-06-03; находки сведены инлайн (см. историю правок ниже секции 13).

---

## 1. Что такое ops и его место в семье

`ops` — **владелец последней мили**: заставить построенный продукт работать на машине, которая **не твоя** (прод / коробка заказчика). Парный по высоте сосед bootstrap: bootstrap строит фундамент (стек, скаффолд, CI-гейты), ops отгружает результат на чужое железо.

**Линия scope — «твоя машина vs не твоя».** Локальный preview (`vite dev` против локального бэкенда) = «твоя машина» = **вне ops**, уже покрыто скаффолдом bootstrap. ops начинается ровно там, где артефакт надо переселить на чужое железо и сделать так, чтобы он там жил.

**Место в цепочке:**

```
… arch-spec → bootstrap (фундамент) → writing-plans (импл фичи)
      → [фича работает на ТВОЕЙ машине] → ops (отгрузка на НЕ-твою машину)
```

ops — терминал в DAG плагина: его выхлоп (Dockerfile, CD-воркфлоу, деплой) никто ниже по цепочке не потребляет (в отличие от bootstrap, чьи артефакты кормят arch-audit). Это центральное свойство, см. §6.

**Природа артефакта.** ops — markdown-скилл + scaffold-templates, как bootstrap. **Не** code-скилл с рантаймом. «Рендер» = инстанцирование шаблонов агентом по инструкции SKILL.md, не TS-движок. Следствие: OQ11 (упаковка code-скилла для public release) на ops **не ложится**.

---

## 2. Заземление: реальный субстрат (поправка к гипотезе хэндоффа)

Хэндофф предполагал «конверт»: голый Postgres + MinIO + pg_cron на коробке. **Реальная инспекция VPS показала другое**, и дизайн строится на факте, не на гипотезе.

**Хост:** один VPS (Ubuntu 24.04, 3 ядра, 8 ГБ, FastVPS), uptime 93 дня. **Мультитенантный** — бок о бок: zhenka-bot (staging+prod), n8n, PHP/MySQL (slideglass), статические SPA, MCP-прокси, CRM. «Personal ops» здесь = **подселить новый проект на уже живущую коробку по заведённой конвенции**, не поднять чистый сервер.

**Спина субстрата:**
- **Рантайм/упаковка:** Docker + Compose v2. Каждый проект = compose-проект в своей папке (`/srv/<proj>` или `/home/ark/<proj>`).
- **CD:** образ собирается **вне коробки** (GitHub Actions → GHCR, docker залогинен в ghcr) → на VPS тянется готовый образ. **staging и prod рядом** (порты 31xx/32xx, теги `:staging`/`:main`).
- **Сеть:** **host-level nginx**, один vhost на (под)домен, `proxy_pass` на localhost-порт контейнера / static-root / php-fpm.
- **TLS:** Let's Encrypt (certbot + acme.sh), автопродление кроном.
- **Секреты:** пер-проектные `.env.<env>` плейн-текстом на коробке (`chmod 600`), через `env_file`. Ни vault, ни docker-secrets.
- **Состояние:** обычно вынесено в **managed (Supabase)** — системный Postgres `inactive`, фронт проксирует `/supabase/` на `*.supabase.co`.
- **Object storage / app-шедулер:** на коробке нет (managed либо не нужно).
- **Recovery:** `restart: unless-stopped` + healthcheck (`wget /health`); systemd держит хост-демоны (docker, nginx, mysql) — это **разовый host-bring-up, вне per-project onboarding** (см. §6 разделение профиль/проект). Оркестратора нет.
- **Наблюдаемость:** на live-коробке **отсутствует**; в замысле (runbook) — UptimeRobot `/health` + Vector-логи + docker log rotation. Это **единственная реально пустая забота**.

**Эталон CD (монорепо `Hedgeinform/zhenka`, оба варианта = вариант Б: GH Actions сам ходит по SSH на VPS):**

Общий хребет: триггер `workflow_dispatch`; CI-гейт (`ci.yml`) переиспользуется через `needs: test`; **SSoT секретов = GitHub repo secrets + GH Environments** (`staging` без гейта / `production` 1 reviewer approval); транспорт — `appleboy/ssh-action` (`VPS_HOST/USER/SSH_KEY`).

- **Вариант 1 — контейнерный (zhenka-bot):** `test → build-push (buildx → ghcr.io/<owner>/<proj>:<tag>) → deploy (ssh: docker compose pull <svc> && up -d <svc>)`.
- **Вариант 2 — статический (zhenka-web):** один job: `npm ci → env из секретов в .env → tsc -b → vite build → rsync --delete dist/ в nginx-root`. Без образа и контейнера.
- **Секреты на коробку (`configure-bot-env.yml`):** отдельный workflow upsert'ит ключи из GH-секретов в серверный `.env` по SSH (идемпотентный sed/append, `chmod 600`, значения не печатаются) + рестарт + healthcheck. **GH-секреты — источник, серверный `.env` — проекция** (principle 3 соблюдён).

**Дрейф для сведения:** runbook (`zhenka-bot/docs/ops/vps-setup.md`) проектировался под **Caddy** (+`caddy_net`), а на живой коробке — **host-nginx**. Профиль фиксирует **фактическое** (nginx); сверка runbook'а — open question (OQ-ops-5).

**Главное следствие:** доставка для **покрытых** форм полностью **шаблонируема** → execution-шов (риск находки A) закрыт **для covered-пути на personal-профиле**. Для best-effort-пути шов остаётся открытым и честно зафиксирован (OQ-ops-7, §8).

---

## 3. Зафиксированные решения сессии

| # | Развилка | Решение |
|---|---|---|
| R1 | Первичный режим | **personal-first.** distributable — честно-пусто, добирается позже как расширение (§10). |
| R2 | Форма скилла | **профиль + рендер.** Не «зеркало bootstrap» (фейкает выбор там, где субстрат один) и не «чистый рендерер» (теряет память о коробке). |
| R3 | Где живёт профиль | **operator-personal область** (не репа проекта, не плагин). Отрендеренные артефакты ссылаются на GH-секреты → repo-safe даже в заказчиковых репах; сырые факты инфры — в personal-профиле. |
| R4 | Модель покрытия | **два уровня (covered / best-effort)** + честность гарантии + промоушен (§6). Не бинар bootstrap'а. |
| R5 | Запись в ARCHITECTURE.md | **не пишет** (decoupled, как arch-spec/D21). Деплой-привязка живёт в `docs/ops/` + профиле. |
| R6 | Граница D14/D23 | **ops владеет deploy/CD-шаблонами и wiring** («что за инфра»); superpowers = методология импла нового кода проекта. Стандартный Dockerfile из шаблона — рендер ops, не superpowers. |
| R7 | Co-tenant дисциплина | Отдельное несущее свойство (не уровень покрытия): **идемпотентные, co-tenant-aware операции + verify-before-done + abort/rollback** на общей живой коробке (§6, §9). |

---

## 4. Костяк: профиль + рендер

**Две операции скилла:**
- **fix-profile** — редкая, на коробку/таргет. Снимает субстрат доставки в переиспользуемый профиль (§5). У оператора сейчас один профиль = `zhenka-vps`. Механика — §5 (inspection checklist), не интервью вслепую (principle 9 — читать текущее состояние).
- **onboard `<project>`** — частая, на проект. Рендерит проверенные шаблоны под (проект × профиль), провязывает CD, делает первый staging-деплой.

**Атом onboarding** (аналог bootstrap'овского probe→scaffold→wire), переиспользуется обеими формами упаковки — **shape → render → wire → verify**:

1. **shape** — определить форму упаковки + собрать проектно-локальные факты.
   - **Правило выбора формы (form-detection):** форма берётся из project class / `## Stack`, зафиксированных bootstrap, **не угадывается**. `frontend` (Vite SPA, статический билд без серверного рантайма) → **static**; `backend-service` / бот / long-running с серверным портом → **container**; `fullstack` → две формы (front=static, back=container), каждая своим атомом. Если класс неоднозначен — спросить оператора (P6), не инферить из репы.
   - Проектно-локальные факты: имя, (под)домен, порт (аллокация — §6), нужные env-ключи (имена). Это **не** «опросить инфру» (инфра = профиль, известна) — probing вырожден (§6).
2. **render** — инстанцировать шаблоны из template-manifest (§7) под выбранную форму.
3. **wire** — подключить к машинерии профиля: GHCR-owner, GH secrets/Environments (staging без гейта / prod аппрув), серверная директория + docker-сеть, vhost через `nginx -t && reload`, серт LE. **Deploy-воркфлоу создаёт ops** (он владелец CD-шаблонов, R6); если в проекте уже есть CD-заглушка (ручная или, если bootstrap позже начнёт её класть — см. §11) — ops её **достраивает, не дублируя**.
   - **Порядок секретов:** перед первым деплоем ops прогоняет `configure-env`-воркфлоу (или просит оператора, если значения не проставлены) — **«секреты присутствуют на коробке» есть precondition staging-деплоя** (§9).
4. **verify** — первый деплой в **staging** зелёный + healthcheck (§9 done-критерий). prod — никогда авто. При красном — abort/rollback (§9), коробка не остаётся в полу-провязанном состоянии.

---

## 5. «Профиль доставки»

Маленький декларативный дескриптор одного таргета, в operator-personal области (напр. `~/.claude/.../ops-profiles/<name>.md`). Читается **динамически**; добавить таргет = добавить профиль, не редактируя скилл (SSoT, principle 4).

**Поля.** `[render-var]` = значение подставляется в шаблоны; `[note]` = operator-facing документация/процедура, не переменная подстановки.

| Поле | Тип | Форма значения (пример из zhenka-vps) |
|---|---|---|
| identity.alias | render-var | `zhenka-vps` |
| identity.ssh | render-var | host `5.45.126.94`, user `ark`, key-ref `~/.ssh/vps1_key` (ссылка, не ключ) |
| reverse-proxy.kind | render-var | `host-nginx` (выбирает vhost-шаблон) |
| reverse-proxy.vhost-apply | note | процедура: положить vhost в `sites-available`, симлинк, `nginx -t && reload` |
| reverse-proxy.static-root | render-var | конвенция пути static-root, напр. `/home/ark/<proj>-site[-<env>]/` |
| tls.mechanism | render-var | `letsencrypt` (certbot) — выбирает блок vhost-шаблона |
| tls.cert-path | render-var | `/etc/letsencrypt/live/<domain>/` |
| registry.owner | render-var | `ghcr.io/hedgeinform` |
| secret-transport.kind | render-var | `gh-secrets→ssh-upsert→server-.env` (выбирает configure-env-шаблон) |
| env-model.environments | render-var | `staging` (no-gate) / `prod` (1 reviewer) |
| env-model.port-convention | render-var | `31xx`=staging / `32xx`=prod → внутр. `3000` |
| deploy-transport | render-var | `appleboy/ssh-action`, триггер `workflow_dispatch` |
| server-layout.project-dir | render-var | `/srv/<proj>` |
| server-layout.docker-network | render-var | имя сети (если есть) |
| observability.wired | note | что заведено (UptimeRobot `/health`, Vector, docker log rotation) и что дыра |

**fix-profile inspection checklist** (read-only, по полям; то, что снято в этой сессии — образец):
- хост/рантайм: `uname`, `os-release`, `docker --version`, `docker compose version`;
- reverse-proxy: процессы (`nginx/caddy/...`), `sites-enabled`, контейнерные прокси;
- TLS: `which certbot/acme.sh`, `/etc/letsencrypt/live`;
- registry: `~/.docker/config.json` (факт логина, без содержимого);
- server-layout: `/srv`, `/home/<user>`, расположение compose-проектов;
- env/секреты: наличие `.env*` (имена, **не** содержимое), `env_file` в compose;
- observability: контейнеры grafana/uptime/vector/portainer/..., `which netdata`, `/etc/docker/daemon.json` (log-opts).

Подтверждение оператором обязательно (профиль фиксирует факт, не догадку).

---

## 6. Пять забот доставки + модель покрытия

**Пять забот** (хост/рантайм, упаковка+CD, секреты, сеть, наблюдаемость+восстановление) — **рабочий чек-лист**, который профиль фиксирует, а onboarding разводит. **Не** закрытая таксономия уровня 8 осей bootstrap (набор на исчерпываемость не проверялся — может расти, §10). Распределение:
- **хост/рантайм** → профиль + shape;
- **упаковка+CD** → render onboarding'а + deploy-воркфлоу;
- **секреты** → transport профиля + проектные ключи (GH secrets → `.env`);
- **сеть** → proxy профиля + проектный vhost/домен;
- **наблюдаемость+восстановление** → проектный healthcheck-контракт + профиль-уровневый мониторинг.

**Разделение профиль-уровень / проект-уровень.**
- *Профиль-уровень (раз на коробку):* docker log rotation, UptimeRobot-аккаунт, host-демоны под systemd, GHCR-auth, docker-сеть, host-hardening (UFW/SSH/fail2ban из runbook). Это host-bring-up — обычно уже сделано (коробка живёт), fix-profile это снимает, onboarding не повторяет.
- *Проект-уровень (на проект):* healthcheck в compose, `/health`-эндпоинт, Vector-конфиг (если нужны логи), uptime-монитор на проектный `/health`, vhost, серт.

**`/health`-контракт (то, что проверяет done-гейт).** Минимум: HTTP `200` на `GET /health` (тело необязательно; если есть — короткий `ok`-маркер для UptimeRobot keyword-проверки). Для статической формы аналог — `200` на корневом `index.html`. Контракт — обязательство **проекта** перед ops (его обеспечивает bootstrap-скаффолд/импл фичи); ops его потребляет, не реализует.

**Аллокация порта.** ops сканирует port-convention-диапазон профиля (`31xx/32xx`), берёт следующий свободный (проверка занятости — часть co-tenant pre-checks, R7), фиксирует выбранный порт в `docs/ops/` проекта.

### Модель покрытия — ключевое отличие от bootstrap

**Почему у bootstrap покрытие — жёсткий гейт:** его покрытые сущности **кормят другие скиллы плагина** (arch-audit без stack-file/adapter/baseline не запустится). Покрытие bootstrap = **гейт целостности цепочки**.

**Почему у ops иначе:** ops **терминален в DAG плагина** — его выхлоп никто ниже не потребляет. Новый рантайм через ops другие скиллы не задевает. Следствие — покрытие деградирует **мягче, два уровня**:
- **covered** (есть вылизанный шаблон) → турнкей render+wire+verify;
- **best-effort** (шаблона нет, но ops может настроить ad-hoc) → пробует, с двумя оговорками.

**Две оговорки (сохраняют то, ради чего coverage-honesty нужна):**
1. **Прозрачность гарантии (principle 5).** Вылизанный шаблон несёт зашитую корректность (healthcheck, restart, secret-transport, hardening, observability). best-effort подаётся **как best-effort** («настроил по месту, не из проверенного шаблона, recovery/секреты/наблюдаемость могли остаться слабее, проверь X/Y/Z»), не молча за турнкей.
2. **Путь промоушена.** Взлетевший best-effort **поднимается в covered** (шаблон + строка template-manifest) — ось роста № 2 (§10), не даёт одноразовым настройкам копиться невылизанным дрейфом. Полная механика промоушена — OQ-ops-4.

**Co-tenant safety (R7) — то, что у ops заменяет «downstream-скиллы» как реальную связность.** ops терминален в плагине, но **не изолирован на субстрате**: на VPS живут боевые демо заказчиков. Кривой onboarding может задеть соседей — коллизия портов, сломанный vhost при `nginx -s reload`, прожор ресурсов. Дисциплина: **идемпотентные, co-tenant-aware операции + verify-before-done** (`nginx -t` перед reload, проверка занятости портов, валидация `compose config` перед `up`) + **abort/rollback при провале** (§9). Применяется одинаково к covered и best-effort (это не уровень покрытия, а сквозное свойство).

**Концептуально:** у bootstrap «coverage» = целостность цепочки; у ops «coverage» = доверие/качество для оператора **плюс безопасность общего субстрата**. Одно слово — разная несущая нагрузка.

**Probing вырожден:** профиль известен и единствен → меню инфры нет, onboarding лишь подтверждает форму + собирает проектно-локальные параметры (как buy-in bootstrap при coverage=1 — не фейкать выбор).

---

## 7. Что ops производит и куда пишет

### Template manifest (covered-набор — ops-аналог coverage-manifest bootstrap)

Реестр шаблонов, читается динамически; новая форма/рантайм = новая строка + файл шаблона, не переписывание (§10). SSoT каждого шаблона — соответствующий файл монорепы `Hedgeinform/zhenka` (§13). Живёт как `references/template-manifest.md` + `references/templates/` внутри скилла.

| Шаблон | Форма | Источник истины (zhenka) |
|---|---|---|
| `Dockerfile` (Node/TS-сервис) | container | `zhenka-bot/Dockerfile` |
| `docker-compose.yml` (сервис: image/restart/ports/env_file/healthcheck) | container | `zhenka-bot/docs/ops/docker-compose-template.yml` |
| `deploy-{staging,prod}.yml` (test→build-push→ssh pull+up) | container | `.github/workflows/deploy-{staging,prod}.yml` |
| `deploy-web-{staging,prod}.yml` (npm ci→build→rsync) | static | `.github/workflows/deploy-web-{staging,prod}.yml` |
| `configure-env.yml` (gh-secrets→ssh-upsert→.env) | обе | `.github/workflows/configure-bot-env.yml` |
| vhost/proxy snippet (proxy_pass / static-root + LE-блок) | обе | nginx vhost `zhenka` (+ runbook caddyfile-snippet) |
| `.env.example` (имена ключей) | обе | из реального `.env`-набора (имена) |
| `docs/ops/`-runbook | обе | `zhenka-bot/docs/ops/vps-setup.md` |
| Vector-конфиг (опц., логи) | container | `zhenka-bot/config/vector.yml` |

**ci.yml — НЕ производит ops.** CI-воркфлоу — артефакт bootstrap (его Scope §5 / Output). ops его **переиспользует** (`needs: test` в deploy-воркфлоу) и **добавляет только** deploy/configure-воркфлоу. Двух писателей `ci.yml` нет.

### Артефакты по месту приземления

*В репу проекта* (repo-safe — ссылаются на GH-секреты, не на сырые факты инфры): `Dockerfile` (container), `docker-compose.yml` (container), `.github/workflows/deploy-*` + `configure-env.yml`, `.env.example`, `docs/ops/`-runbook (+ vhost-шаблон, Vector-конфиг при необходимости).

*В operator-personal области* — профиль (`<name>.md`), создаётся/обновляется fix-profile.

*На стороне GitHub* — repo secrets + GH Environments. Значения секретов ops **не** проставляет (оператор / `gh secret set`) — даёт список + готовые команды.

*На сервере* (раз на проект) — директория `/srv/<proj>`, членство в docker-сети, vhost (`nginx -t && reload`), серт LE. (GHCR-auth/log-rotation/сеть — профиль-уровень, раз на коробку.)

### SSoT-карта
- механика деплоя → воркфлоу/compose/Dockerfile **в репе проекта**;
- факты коробки → **профиль (personal)**;
- значения секретов → **GH secrets** → проекция в серверный `.env`;
- запись о деплой-привязке (профиль, домен, порт, форма, env-ключи, URL) → **`docs/ops/` проекта**.

**ARCHITECTURE.md — ops не пишет (R5).** Decoupled, как arch-spec (D21) — критично для distributable/market-ready (OQ6). Если пойнтер `## Deployment` нужен — это работа living-architecture через его событие, не ops. Избегаем третьего писателя документа (KD2 не расширяется).

---

## 8. Границы

**ops ↔ bootstrap — «конверт рано, машинерию поздно».**
- bootstrap фиксирует **рано** (фундамент): код-абстракцию + CI-гейты + классификацию осей `delegated` («конверт»).
- ops фиксирует **поздно** (на отгрузке): машинерию — конкретный деплой/CD + привязку профиля. **CD-воркфлоу — собственность ops** (R6): ops их создаёт. (Прим.: «усыновление бесхозного `cd.yml`» из хэндоффа было основано на ручном артефакте REH-репы; bootstrap по текущей спеке CD-заглушку **не** кладёт. Если позже решим, чтобы bootstrap оставлял stub под ops — это амендмент bootstrap, §11. Пока: ops создаёт, существующую заглушку достраивает.)
- Два точных шва:
  - **секреты:** *конвенция чтения* (один config-модуль, ничего не хардкодим, читаем из env) = bootstrap; *где физически лежит стор* (GH secrets → серверный `.env`) = ops.
  - **deployment-bound оси (БД/хранилище):** *API/библиотека адаптера* (код говорит на API Supabase/S3) = код-абстракция bootstrap; *конкретный эндпоинт/провайдер* (URL Supabase, MinIO-на-VPS vs AWS-S3) = привязка ops. **На профиле `zhenka-vps`** это в основном «нацелить env на managed-эндпоинт» → схлопывается в заботы секреты+сеть ops. **Общая граница сохраняется** — профиль с self-hosted-хранилищем реактивирует эту привязку.

**ops ↔ D14 (уточнение границы, R6).** D23 говорил «конкретный Dockerfile/CD = superpowers». Заземление меняет: Dockerfile/CD для **покрытой** формы — инстанцирование шаблона, которым владеет ops, не free-hand execution. Граница: **ops владеет deploy/CD-шаблонами и wiring**; superpowers = методология импла нового кода проекта.

**Открытый шов best-effort (OQ-ops-7).** Тезис «рендер+wire детерминирован, writing-plans не нужен» верен **только для covered-пути**. На **best-effort** ops «настраивает ad-hoc» — это и есть недетерминированный config-authoring, про который предупреждала находка #5 хэндоффа; при этом deployment-скилла у superpowers нет. Значит для best-effort-пути остаётся незакрытый execution-шов: ни детерминизма шаблона, ни явного владельца исполнения. Честно фиксируется как open question, не выдаётся за решённое.

**ops ↔ writing-plans.** writing-plans планирует **фичу** над готовой кодовой базой; ops — последняя миля, ортогонален. Своей работе ops writing-plans не требует **на covered-пути** (рендер+wire детерминирован, как скаффолд bootstrap).

**ops ↔ living-architecture.** decoupled (R5); деплой может задокументировать living-architecture своим событием, ops в документ не лезет.

---

## 9. Вход, триггеры, done

**Кто запускает.** Только оператор, никогда авто (P6). Upstream-сигнал может подсказать; решение деплоить на общую заказчико-facing коробку — продуктово-временное. ops сам себя не запускает.

**Триггеры (для description SKILL.md):**
- *fix-profile:* «зафиксируй мой сервер», «настрой deployment-профиль», «опиши таргет доставки».
- *onboard:* «настрой доставку проекта X», «выкати X на VPS», «подключи проект к серверу», «настрой CD для X».

**Анти-триггеры:** «напиши план фичи» → writing-plans; «настрой фундамент / зафиксируй стек» → bootstrap; «обнови архитектуру» → living-architecture; «посмотреть фронт локально» → не ops («твоя машина»).

**Done-критерий (перечислимые гейты).** Для **covered** onboarding:
- CI-гейт зелёный;
- **секреты присутствуют на коробке** (`configure-env` прогнан) — precondition следующего шага;
- первый деплой в **staging** прошёл (образ собран+запушен / статика собрана+rsync'нута);
- **healthcheck зелёный** (`/health` 200) либо статик-index отдаётся;
- reverse-proxy отдаёт (под)домен по TLS (`nginx -t` чистый + серт на месте);
- **co-tenant safety проверена** (нет коллизии портов, конфиг nginx валиден, соседи не задеты);
- запись о деплое в `docs/ops/`.
- prod — отдельный загейченный шаг (GH approval); done onboarding = staging доказанно живой + prod провязан-и-загейчен (не обязательно prod-деплой).

Для **best-effort**: deliverable = настроенное по месту + громкий сигнал «best-effort, гарантии слабее» + предложение промоушена; под турнкей-гейты не подводится (как `unmanaged` bootstrap).

**Failure / abort / rollback (R7, co-tenant-критично).** Гейты идут по порядку; при красном на любом — **abort с откатом до пред-шага**, коробка не остаётся в полу-провязанном состоянии:
- vhost не валиден (`nginx -t` красный) → не делать `reload`, снять добавленный конфиг;
- staging-деплой красный / healthcheck не зелёный в пределах start_period+retries → `docker compose down <svc>` нового сервиса, освободить порт, не трогать соседей;
- любой шаг, задевший бы соседа (занятый порт, конфликт домена) → стоп до шага, сигнал оператору.
Откат логируется (principle 5 — не молча).

**Идемпотентность / повторный onboard.** `onboard X` на уже подключённом проекте — **update, не коллизия**: обнаружить существующие vhost/порт/директорию/воркфлоу и обновить их на месте (как `upsert_env` идемпотентен), а не создать дубликат. Re-run безопасен (субстрат — «подселение на живую коробку», повторы вероятны).

**ops трогает живую коробку при verify:** сам выполняет **staging**-деплой (staging изолирован: свой порт/сабдомен), **prod — никогда авто** (за GH-аппрувом, катит оператор). Перед любым мутирующим сервер шагом — co-tenant-проверки.

---

## 10. Расширяемость — «растёт данными, не переписыванием»

Явный принцип дизайна (паттерн семьи, principle 4). Три оси роста, все — «данные/расширение»:
1. **Больше профилей.** Второй сервер/таргет = добавить профиль, не трогая скилл.
2. **Больше покрытых форм упаковки.** Третья форма (воркер, другой рантайм) = добавить шаблон + строку template-manifest, не переписывая атом.
3. **Distributable как будущий режим.** **Профиль — шов, превращающий distributable в расширение, а не в переписку.** Personal = «один заранее заполненный профиль»; distributable потом = «опросить таргет → заполнить профиль (probe-to-fill)» перед тем же ядром «профиль+рендер». personal-first ничего не закрывает — просто не реализует пока вторую заполнялку.

---

## 11. Архитектурные фиксации (предложить через architecture-скилл после подписания спеки)

> Эти фиксации делает оператор / дизайн-сессия **через architecture-скилл** (process-bookkeeping), а **не** runtime ops — не противоречит R5 (ops в ARCHITECTURE.md не пишет).

- **D23 → закрыть TO-DESIGN**, сослаться на эту спеку.
- **D14 — амендмент:** уточнение границы (R6) — ops владеет deploy/CD-шаблонами и wiring; superpowers = методология нового кода. Снять формулировку D23 «Dockerfile/CD = superpowers».
- **D20 — уточнение:** ops как новый function-cluster сверх трёх портов; зафиксировать decoupling от ARCHITECTURE.md (R5).
- **bootstrap — возможный амендмент (открыто):** решить, должен ли bootstrap оставлять CD-stub под ops, или ops всегда создаёт CD сам (текущее предположение спеки — второе). Сводит §8-несоответствие про `cd.yml`.
- **Module Map:** добавить `hi_flow/skills/ops/` (PLANNED → BUILT после имплементации).
- **Topic Index:** кандидаты — `deployment-profile`, `coverage (ops vs bootstrap)`, `co-tenant-safety`.

---

## 12. Open Questions / отложено

- **OQ-ops-1.** Distributable probe-to-fill: механика опроса неизвестного таргета и заполнения профиля. Отложено (personal-first); шов готов (§10).
- **OQ-ops-2.** Мультипрофиль: UX выбора профиля, когда таргетов >1. Отложено до второго таргета.
- **OQ-ops-3.** Глубина наблюдаемости: пол задан (healthcheck/restart/log-rotation/uptime); метрики/дашборды — отложено.
- **OQ-ops-4.** Механика промоушена best-effort → covered (как проверенный ad-hoc становится шаблоном + строкой template-manifest). Набросок есть (§6), полный механизм — отложен.
- **OQ-ops-5.** Сверка дрейфа runbook'а Женьки (Caddy в замысле vs host-nginx на коробке): профиль фиксирует факт (nginx); нужно ли реконсилить runbook — открыто.
- **OQ-ops-6.** Always-shippable / continuous-deploy + throwaway-staging как опция/режим ops (хэндофф пометил валидным; staging/prod split у оператора уже де-факто есть). К рассмотрению при импле.
- **OQ-ops-7.** Execution-шов для best-effort-пути (§8): недетерминированный config-authoring без явного владельца (у superpowers нет deployment-скилла). Для covered-пути закрыт шаблонами; для best-effort — открыт. К решению при первом best-effort-кейсе.

---

## 13. References

- D23 (Active Decisions, ARCHITECTURE.md) — решение о существовании и границе ops.
- `docs/handoffs/2026-06-02-ops-skill-design-handoff.md` — recovery-контекст предыдущей сессии.
- `hi_flow/skills/bootstrap/SKILL.md` + `references/axis-taxonomy.md` + `references/coverage-manifest.md` — сосед по высоте, паттерн coverage/atom/modes.
- `Hedgeinform/zhenka` монорепо: `.github/workflows/{ci,deploy-staging,deploy-prod,deploy-web-staging,deploy-web-prod,configure-bot-env}.yml`, `zhenka-bot/docs/ops/{vps-setup.md,docker-compose-template.yml}`, `zhenka-bot/Dockerfile`, `zhenka-bot/config/vector.yml` — эталон CD (оба варианта) + runbook + template-manifest источники (§7).
- VPS `zhenka-vps` (read-only инспекция 2026-06-03) — фактический субстрат.

---

## История правок (spec self-review 2026-06-03)

Сведено инлайн по находкам изолированного субагента:
- **Блокер (рендер-контракт):** добавлены form-detection rule (§4), типизация полей профиля render-var/note + value-shapes (§5), fix-profile inspection checklist (§5), template-manifest как ops-аналог coverage-manifest (§7).
- **Блокер (`cd.yml`):** убрана ложная посылка «bootstrap кладёт orphan cd.yml»; ops создаёт CD сам, существующую заглушку достраивает; возможный bootstrap-амендмент вынесен в §11 (§4, §8).
- **Честность:** «находка A закрыта без шва» сужено до covered×personal; best-effort-шов зафиксирован как OQ-ops-7 (§2, §8).
- **Co-tenant:** выделено в отдельное R7; добавлена failure/abort/rollback дисциплина + идемпотентность повторного onboard (§3, §9).
- **Прочее:** configure-env ordering + secrets-precondition (§4, §9); ci.yml — артефакт bootstrap, ops лишь reuse (§7); `/health`-контракт определён (§6); port-allocation rule (§6); §11 vs R5 clarifier; systemd/host-bring-up отнесён к профиль-уровню (§2, §6).

---

## 14. Amendment — sync с реализацией (2026-06-03)

Реализация (report `2026-06-03-hi_flow-ops-design-report.md`) внесла два расширения за пределы подписанных §6/§9; фиксирую в дизайн-записи (принцип 9 — sync docs after changes). Канонические формулировки — в `hi_flow/skills/ops/SKILL.md`.

- **Per-component coverage (Fix 2) — расширяет §6.** Покрытие судится не только по форме упаковки, но и **по требуемому компоненту**: covered-приложение, которому нужен непокрытый on-box компонент (БД/кэш/object-store), рендерится турнкей по app-форме, а каждый непокрытый со-компонент идёт по best-effort-пути (громкий сигнал + промоушен, principle 5). Запрет: молча свернуть непокрытый компонент в covered-рендер (silent-turnkey анти-паттерн). Канон — SKILL.md § Coverage model.
- **Per-environment secrets precondition (Fix 1) — уточняет §9.** `configure-env` параметризован `<ENV>`: precondition «секреты на коробке» — **по-окружению** (staging seeding отдельно от prod), т.к. исходный `configure-bot-env` был prod-only, а §9 делает configure-env precondition именно staging-деплоя.

Обе — кандидаты в будущий формальный amendment §6/§9; пока канон в SKILL.md, здесь pointer. OQ-ops-4 (механика промоушена) остаётся открытым.
