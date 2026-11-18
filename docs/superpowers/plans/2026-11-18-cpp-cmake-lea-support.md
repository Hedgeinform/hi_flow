# C++/CMake Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. При выборе субагентов используй superpowers:subagent-driven-development и сохраняй последовательность зависимых задач.

**Goal:** Добавить правила C++/CMake, архитектурный аудит и поэтапные проверки CI с приёмкой на LEA под Linux.

**Architecture:** Сборщик C++/CMake передаёт фактические зависимости существующему отчётному контуру ArchAudit. Локальная цель `gates` и Linux CI LEA используют одинаковые режимы проверок. Архитектурные находки любого уровня попадают в отчёт, код завершения аудита отражает корректность выполнения.

**Tech Stack:** TypeScript/Node.js, Vitest, CMake 3.25+, Ninja, GCC, clang-format/clang-tidy, Python 3 standard library, Qt Test/CTest, GitHub Actions.

**Spec:** [Согласованный дизайн](../specs/2026-11-16-arch-audit-cpp-qt-lea-design.md), утверждён оператором 18 ноября 2026 года.

## Global Constraints

- Приёмка на LEA под Linux. Один полный сквозной аудит границ и фактический запуск Linux CI.
- Bootstrap отложен. Стековый файл и базовая настройка применяются к существующему проекту.
- Сборка и существующие Linux-тесты блокируют CI сразу.
- Этап 1 — форматирование и clang-tidy публикуют замечания. Этап 2 — форматирование блокирует изменяемые файлы, затем всю подготовленную область. Этап 3 — выбранные правила clang-tidy блокируют изменяемые файлы, затем весь подготовленный проект.
- HIGH/CRITICAL и остальные архитектурные findings сохраняются при коде завершения `0`. Ошибка выполнения или неполные данные аудита дают ненулевой код.
- QML нужен только при конкретном правиле межмодульных импортов. Три принятых запрета LEA извлекаются из C++ и CMake. Проверки macOS/Windows адресные.
- Формат D8 1.2, существующие TS/JS-входы, `apply-patch` и двухфазный полный отчёт сохраняют совместимость.
- Используем имеющиеся графовые алгоритмы, загрузчик правил, severity overrides и suppression. Перечень возможностей фиксируется в существующем coverage-manifest.
- Внедрение в LEA начинается после слияния upstream-реализации HiFlow в актуальную основную ветку. Модель графа не становится целевым архитектурным контрактом.

## Review Focus

1. Повторный include из другого заголовка, пропущенный компилятором из-за include guard, должен остаться прямой зависимостью владельца директивы. Проверка в задаче 3.
2. Отсутствующая единица трансляции и ошибочный разбор не должны выглядеть как успешный пустой граф. Сверка состава в задачах 2–3.
3. Каталог сборки с путями `/src` и `/build` из другого окружения требует запуска в исходном пространстве путей. Ошибка входа объясняется, пути не переписываются догадками. Проверка в задачах 2 и 5.
4. Заголовок, изменённый в PR, влияет на несколько единиц трансляции. Анализ охватывает потребителей, а блокировка определяется местом диагностики в затронутом файле. Проверка в задаче 6.
5. HIGH/CRITICAL, стадия Markdown INCOMPLETE, сбой инструмента и замечание режима отчёта имеют разные последствия. Коды завершения проверяются в задачах 5–6.

## Исходное состояние и порядок

План составлен по HiFlow `b8d63f1f74b73bb13fdd08dfc05a8fa1754427f8` и доступному `origin/master` LEA `3d5a5b89790e02b33ce4cc95ae48f7e554df2881`. Перед исполнением обнови refs и сверь относящийся к задаче код с актуальной базой. Текущая рабочая копия HiFlow содержит отдельное изменение `docs/architecture/current-contracts.md`, которое сохраняет своего владельца. Спека пока находится в рабочей копии.

Порядок реализации — `1 → 2 → 3 → 4 → 5 → 6 → 7 → merge HiFlow → 8 → 9`. Общие файлы отчёта, сборщика runtime и LEA CMake/CI редактируются последовательно. Рабочая область для реализации выбирается через `superpowers:using-git-worktrees` с учётом текущих разрешений. В планировании создан только документ.

До правок LEA исполнитель читает актуальный `/home/codex/projects/LEA/AGENTS.md`, сверяет открытые Issues/PR и координирует пересечения. Исходная копия `/home/codex/projects/LEA/spec-grid-correction-reports` принадлежит другой задаче. Для внедрения нужна своя копия и ветка от свежего `origin/master`, без копирования `node_modules` и каталогов сборки. Стенд `preview` остаётся ресурсом работающего проекта.

Команды тестов HiFlow ниже выполняются из `hi_flow/skills/arch-audit`. Используй имеющиеся зависимости либо восстанови lock-файл разрешённым способом. Для исполняемого кода обязательны `superpowers:test-driven-development` и `superpowers:verification-before-completion`. Документы проверяются ссылками, сценариями и сверкой требований. Каждая задача заканчивается отдельным проверяемым коммитом с перечислением только своих файлов.

## Файлы и ответственность

Пути относительно корня HiFlow, кроме явно обозначенных LEA.

| Файлы | Ответственность |
|---|---|
| `hi_flow/skills/arch-audit/core/audit-adapter.ts` | Общий результат извлечения и узкий интерфейс сборщика |
| `adapters/typescript-depcruise.ts`, `helpers/parse-depcruise-output.ts` внутри arch-audit | Существующее извлечение TS/JS и его тестовые точки |
| `adapters/cpp-cmake.ts` | Оркестрация CMake/C++ и полнота входа |
| `adapters/cpp/{cmake-model,compile-commands,preprocessor,project-findings}.ts` | Состав сборки, argv, непосредственные includes, правила по рёбрам |
| `core/report-builder.ts`, `core/metric-findings.ts`, `helpers/cli-run-audit.ts` | Общие метрики и отчёт, выбор адаптера, машинный запуск |
| `tests/{core,adapters,helpers,integration,distribution}/`, `tests/fixtures/cpp-cmake-project/` | Исполнимые проверки конкретных регрессий |
| `hi_flow/references/stacks/{cpp.md,references/cpp-baseline.md}` | Правила агента и подключение проверок к существующему проекту |
| `hi_flow/references/stacks/references/cpp-checks/{CppGates.cmake,check_quality.py}` | Небольшой проектный пример команды gates и её шагов |
| LEA `cmake/LeaGates.cmake`, `tools/check_quality.py`, `.audit-rules.yaml`, `.github/workflows/ci.yml`, `CMakeLists.txt` | Внедрение проверенных инструментов в текущий LEA |

### Task 1. Отделить извлечение TS/JS от сборки отчёта

**Files** — создать `core/audit-adapter.ts`; изменить `core/report-builder.ts`, `adapters/typescript-depcruise.ts`, `helpers/parse-depcruise-output.ts`; проверить `tests/core/report-builder.test.ts`, `tests/adapters/typescript-depcruise.test.ts`.

**Interfaces**

`AuditInput` переносит существующий результат парсера с полями `findings`, `dep_graph`, `per_module_raw`, `source_files_by_module`, `sdk_edges`, необязательными `parsing_errors` и `barrel_imports`. Добавь `module_names: string[]`, необязательный `entry_modules: string[]`, `tooling_version: string` и `operator_notes: string[]`.

`CollectionOptions` содержит `projectRoot`, `moduleRoot`, `projectRules`, `baselineRules`, необязательные `buildDir`, `configuration`, `depcruiseVersion`, `runDepcruise`. Типы правил и графа берутся из `core/types.ts`, сигнатура `runDepcruise` сохраняется.

`AuditAdapter.collect(options: CollectionOptions): Promise<AuditInput>` инкапсулирует preflight и извлечение стека. Общий интерфейс также содержит `name` и `detectStructural` с существующими аргументами плюс необязательный `entryModules`. Имеющиеся `identifyModules` и другие TS-методы остаются совместимыми методами TypeScript-адаптера. Общий builder получает список модулей из `module_names` результата коллектора.

- [ ] Добавить тест `builds_report_from_collected_input_without_depcruise`: искусственный адаптер возвращает два модуля и ребро, `depcruiseVersion` отсутствует, отчёт валиден. Сохранить прежние TS-тесты с `runDepcruise`.

```ts
expect(data.report.metrics.dep_graph).toEqual({ core: [], engine: ['core'] })
expect(data.report.metadata.audit_tooling_version).toBe('fixture-collector@1')
expect(data.report.metadata.schema_version).toBe('1.2')
```
- [ ] Запустить `npx --no-install vitest run tests/core/report-builder.test.ts`. Новый случай должен выявить прямую зависимость builder от depcruise.
- [ ] Перенести preflight, генерацию конфига, запуск и парсинг TS/JS внутрь `collect`. `BuildOpts.depcruiseVersion` сделать необязательным для общего builder, а проверку наличия версии оставить у TS-адаптера. Общий builder получает данные через `collect` и продолжает enrichment, suppression, D8 и Markdown.
- [ ] Проверить прежние JS/TS integration cases, override `--out-dir`, typecheck и порядок findings. Команды `npx --no-install vitest run tests/core/report-builder.test.ts tests/adapters/typescript-depcruise.test.ts tests/integration` и `npm run typecheck` должны пройти.
- [ ] Зафиксировать коммит с извлечённым интерфейсом и неизменившимися TS/JS-результатами.

### Task 2. Прочитать фактическую конфигурацию CMake и прямые связи целей

**Files** — создать `adapters/cpp/cmake-model.ts`, `adapters/cpp/compile-commands.ts`, `tests/adapters/cpp-cmake-model.test.ts`, `tests/adapters/cpp-compile-commands.test.ts`, `tests/fixtures/cpp-cmake-project/{CMakeLists.txt,src/core/core.cpp,src/core/Core.h,src/engine/engine.cpp}`.

**Interfaces**

`readCmakeModel(projectRoot: string, buildDir: string, configuration?: string): Promise<CmakeModel>` возвращает активные собственные цели, их исходники, generated-флаги, include roots внешних библиотек и прямые связи линковки с владельцами. `CmakeModel` также содержит ожидаемые производственные единицы трансляции и выбранную конфигурацию.

`readCompileCommands(buildDir: string): Promise<CompileCommand[]>`, где `CompileCommand = { directory: string; file: string; argv: string[]; output?: string }`.

- [ ] Написать случаи для `A → B → external`, alias цели, Qt-плагина, `add_dependencies`, двух конфигураций, пути с пробелами и отсутствующей единицы трансляции.
- [ ] Для `command` реализовать разбор аргументов POSIX-цитирования без выполнения строки shell. `arguments` используется напрямую. Тесты включают макрос с пробелом, response file и отказ на shell-конвейере вместо команды компилятора. Response file разворачивается в контексте `directory` с проверкой циклической ссылки.
- [ ] Зафиксировать контракт обновления. Внутри явного build-dir создать запрос клиента File API, затем выполнить `cmake -S <root> -B <build> --graphviz=<build>/arch-audit/targets.dot` с сохранением уже настроенного cache. Прочитать последнюю ответную модель через index JSON. Несовпадение source root или недоступные пути объяснить в ошибке.
- [ ] Разобрать прямые DOT-рёбра CMake с узлами и aliases. Данные order-only из File API не добавлять в граф линковки. Не добавлять транзитивное `A → external`, когда его нет среди прямых рёбер. Проверить совместимость PUBLIC/PRIVATE/INTERFACE на контрольном проекте. При обнаружении неподдержанного вывода вернуть конкретную ошибку извлечения.
- [ ] Привязать собственные цели к модулю по файлам под `moduleRoot`; external и generated определить по происхождению CMake. Generated plugin имеет владельца своей QML backing target, без хардкода имени LEA. Сверить model и compile database для каждой собственной производственной единицы. Header-only цели остаются в составе модели.
- [ ] Запустить два новых файла тестов и реальную конфигурацию мини-проекта CMake/Ninja. Отдельно проверить неправильный build-dir, неоднозначный multi-config и пропавшую команду компиляции. Проверки должны завершаться ошибкой с именем цели или файла.
- [ ] Зафиксировать коммит модели сборки.

### Task 3. Извлечь прямые includes штатным препроцессором Linux

**Files** — создать `adapters/cpp/preprocessor.ts`, `tests/adapters/cpp-preprocessor.test.ts`; расширить контрольную фикстуру заголовками `Engine.h`, `Shared.h` и макросным include.

**Interfaces**

`collectIncludes(command: CompileCommand): Promise<IncludeResult>`, где `IncludeResult = { translationUnit: string; edges: IncludeEdge[]; visitedFiles: string[]; compilerVersion: string }`, `IncludeEdge = { from: string; to: string; line?: number; spelling: string }`.

- [ ] Написать реальные проверки `HeaderA → Shared` и `HeaderB → Shared`, когда Shared уже пропущен по include guard, а также макросный include, неактивный `#if`, разные одноимённые заголовки в quote/system paths, missing header и зависимость из вложенного заголовка. Обязательная проверка — ни один результат не приписывает все транзитивные заголовки корневому `.cpp`.
- [ ] Для Linux GCC использовать штатный compiler из compile database в режиме `-E -dI -v`. Сохранить макросы, language, sysroot, include options и рабочую директорию, убрать только выход объектного файла и опции записи depfiles. Запускать argv без shell. Разбор line markers устанавливает владельца директивы и строку, expanded directive сохраняет имя после раскрытия макросов.
- [ ] Для include, за которым следует вход в файл, использовать путь от компилятора. Для пропущенного guarded include разрешить уже раскрытое имя по фактическому порядку поиска, выведенному тем же компилятором. Quote lookup учитывает каталог владельца директивы. Неоднозначное разрешение или неподдержанная директива собственного кода даёт ошибку с файлом и строкой. Это обязательная часть теста guard, а не повод убрать ребро.
- [ ] Учитывать принудительные includes как зависимости единицы трансляции. Поддерживаемые флаги проверяются на Linux-компиляторе LEA. Если PCH скрывает необходимые includes и его команду нельзя воспроизвести, вывести неполный вход с конкретной причиной. Потребность в другом интерфейсе компилятора сначала доказывается падающим случаем этих проверок.
- [ ] Проверить полноту по списку из задачи 2. Каждая активная собственная единица завершает препроцессор успешно. Диагностический код ошибки, отсутствие нужного generated-заголовка, обрезанный вывод или неразрешённый собственный include прерывают сбор данных. Generated-заголовки при необходимости создаются штатной build-целью; `gates` запускается после сборки.
- [ ] Запустить `npx --no-install vitest run tests/adapters/cpp-preprocessor.test.ts`. Ожидаются точные владельцы и строки, два сохранённых guarded-ребра и ошибка на каждом неполном входе. Сохранить коммит сборщика.

```ts
expect(result.edges).toEqual(expect.arrayContaining([
  expect.objectContaining({ from: headerA, to: sharedHeader, line: 3 }),
  expect.objectContaining({ from: headerB, to: sharedHeader, line: 5 }),
]))
expect(result.edges.some(edge => edge.to.endsWith('Inactive.h'))).toBe(false)
```

Решение основано на выводе реального препроцессора. Во время планирования на GCC 13.3 подтверждены expanded include и вывод повторной guarded-директивы без нового file-entry marker. Полнота восстановления на фикстуре и LEA проверяется при реализации. [Флаги и порядок поиска GCC](https://gcc.gnu.org/onlinedocs/cpp/Invocation.html) · [Прямые связи CMake](https://cmake.org/cmake/help/v3.25/module/CMakeGraphVizOptions.html)

### Task 4. Подключить граф C++/CMake к правилам и общим метрикам

**Files** — создать `adapters/cpp-cmake.ts`, `adapters/cpp/project-findings.ts`, `core/metric-findings.ts`; изменить `adapters/typescript-depcruise.ts`; добавить `tests/adapters/cpp-cmake.test.ts`, `tests/core/metric-findings.test.ts`.

**Interfaces**

`createCppCmakeAdapter(): AuditAdapter` собирает `AuditInput` из задач 2–3. `matchCppProjectRules(edges: CppEdge[], rules: ProjectRules): RawFinding[]` проверяет стандартные from/to regex. `CppEdge` хранит source/target locator, `kind: 'include' | 'link'`, строку, признак external и его каноническое имя.

`detectMetricFindings(depGraph: DepGraph, perModuleRaw: Record<string, { ca: number; ce: number; loc: number }>): RawFinding[]` выносит существующие числовые проверки god-object, dependency-hub и high-fanout без изменения формул.

- [ ] Написать случаи для семи модулей, CMake-only границы, include-only границы, цикла из link и обратного include, aliases, собственного `.h` и внешнего QtGui. Одинаковое ребро из разных единиц не увеличивает Ca/Ce и LOC.
- [ ] Построить `dep_graph` через существующий `fileToModule` и активный состав CMake. Собственные заголовки и `.cpp` считаются в LOC один раз. Для внешнего Qt-include назначение определяется фактическим include root и каноническим именем соответствующего imported target. Tests, third_party, generated остаются вне производственных метрик.
- [ ] Реализовать forbidden/required по source/target путям из стандартного контракта. Link-ребро использует CMake-файлы владельцев; include-ребро использует реальные файлы. External Qt-назначение для обоих видов нормализуется в `Qt6::Gui` и аналогичные имена. В finding сохранить `extras.external_target`, `extras.sdk` по действующему D8 и доказательство исходного ребра. Required проверяется только после полного извлечения.
- [ ] Вынести общие числовые проверки и использовать их в обоих адаптерах. Для C++ применять модульные циклы через `graph-core`, текущую единственность владельца cycle, NCCD и общие метрики. TS/React-специфичные barrel/слоевые эвристики оставить у их адаптера. Неприменённые baseline-правила перечислить в operator_notes C++-отчёта. Baseline no-orphans активировать только при надёжно установленных entry-модулях CMake.
- [ ] В контрольных `.audit-rules.yaml` запретить `core → engine`, `core → Qt6::Gui|Qml|Quick|QuickControls2` и `engine →` те же Qt-назначения. Идентификаторы `project:core-no-engine`, `project:core-no-gui`, `project:engine-no-gui`; severity HIGH, D9 principle `layered-architecture-respect`, русское обоснование в comment.
- [ ] Запустить новые тесты, TS-адаптер и `tests/core/d8-schema-validator.test.ts`. Ожидается валидный D8 внешней границы и сохранение существующих TS-порогов. Зафиксировать коммит адаптера.

### Task 5. Штатный CLI, машинный режим и готовый runtime

**Files** — изменить `helpers/cli-run-audit.ts`, `core/report-builder.ts`, `scripts/build-runtime.mjs`, при необходимости `core/audit-adapter.ts`; расширить `tests/helpers/cli-run-audit.test.ts`, `tests/core/report-builder.test.ts`, `tests/distribution/standalone-runtime.test.ts`; добавить `tests/integration/cpp-cmake-project.test.ts`.

**Interfaces**

CLI получает `--stack typescript|cpp-cmake`, `--build-dir <dir>`, `--configuration <name>` и `--check`. Прежние позиционные аргументы и `--out-dir` сохраняются. `runAudit` принимает дополнительные настройки последним необязательным аргументом, сохраняя четыре существующих аргумента.

- [ ] Написать CLI-случаи для прежнего TS-вызова, CMake-only проекта, смешанного package.json/CMakeLists.txt с требованием явного выбора, отсутствующего build-dir, неизвестного флага и конкретной конфигурации.
- [ ] Добавить выбор адаптера. TS-версию depcruise читать только для TS-сборщика. C++-сборщик возвращает свою строку инструментов вида `cpp-cmake@<version>; cmake=<version>; compiler=<version>; configuration=<name>`, которая сохраняется в `audit_tooling_version`.
- [ ] Режим `--check` завершает только машинную фазу. При полном извлечении и валидном JSON возвращает `0` даже при HIGH/CRITICAL. Ошибка входа/извлечения/валидации возвращает `1`. Сохраняет JSON и сводку findings. Для CI использовать отдельный out-dir под build-dir. Обычный вызов сохраняет существующий INCOMPLETE Markdown до успешной фазы 2. Оба режима используют один builder и одни правила.
- [ ] Обновить текст Scope отчёта по установленному типу сборщика, чтобы C++-отчёт перечислял CMake, CTest и Clang-инструменты. Полный отчёт по-прежнему завершается генерацией cluster prose и `render-md`. Извлечение с ошибкой не публикует прошлый JSON как новый успешный результат.
- [ ] Собрать runtime через `npm run build`; затем `npm run build:check`, `npm run typecheck`, `npm test`. В distribution case запустить C++ CLI из копии поставки без node_modules, с доступными внешними CMake/компилятором. Проверить код `0` с findings, `1` на missing TU, прежний TS-run и завершение фазы 2.
- [ ] Зафиксировать исходники и соответствующий `dist` одним коммитом. Финальный runtime должен исполняться из закреплённого checkout HiFlow.

```ts
expect(highRun.status).toBe(0)
expect(highReport.findings.some(finding => finding.severity === 'HIGH')).toBe(true)
expect(criticalRun.status).toBe(0)
expect(missingUnitRun.status).toBe(1)
```

### Task 6. Стековые правила и переиспользуемый проектный пример трёх этапов

**Files** — создать `hi_flow/references/stacks/cpp.md`, `hi_flow/references/stacks/references/cpp-baseline.md`, `hi_flow/references/stacks/references/cpp-checks/CppGates.cmake`, `hi_flow/references/stacks/references/cpp-checks/check_quality.py`. Тестировать runner через standard-library unittest в `hi_flow/skills/arch-audit/tests/fixtures/cpp-checks/test_check_quality.py`.

**Interfaces**

`check_quality.py <format|tidy|architecture> --project-root <root> --build-dir <build> --stage 1|2|3 --format-scope changed|all --tidy-scope changed|all --base <sha> --tidy-errors <patterns>` выполняет один именованный шаг. Путь к runtime задаётся `--hiflow-root <checkout>`. CMake-цель `gates` получает production/test targets через `DEPENDS` и выполняет последовательные COMMAND проверок и CTest после их сборки. Вложенный запуск той же Ninja-сборки из gates не нужен. Конкретные параметры CTest и audit runtime передаются из проекта.

- [ ] Описать в cpp.md владение/RAII и Qt, заголовки и зависимости, ошибки, тесты, существующие имена и ограничения потоков LEA. В cpp-baseline зафиксировать Linux-комплект CMake 3.25+, Ninja, GCC, Python 3, Node 20+ и Clang-инструменты 18 для Ubuntu 24.04. Объяснить штатные проектные overrides и видимость отсутствующего механизма проверки уязвимостей.
- [ ] Реализовать пример через Python standard library и CMake. Этап и scopes передаются существующими CMake cache options, по умолчанию stage 1. Stage 2 активирует только format, stage 3 — также выбранные tidy-errors. Пример печатает фактический этап, базовую ревизию, scopes и версию каждого инструмента. Фиксированная очередь останавливается на первой блокирующей ошибке, каждый шаг можно вызвать отдельно.
- [ ] Список changed получить из diff базового коммита PR с HEAD, включая новые/переименованные файлы. Форматировать по правилам весь затронутый файл. Все настроенные файлы продолжают давать отчёт и вне блокирующего scope. Для машинного отделения замечаний форматирования использовать XML replacements штатного clang-format; неполное форматирование или сбой инструмента классифицировать как ошибку выполнения. При блокирующем scope дополнительно проверить `--dry-run --Werror`.
- [ ] Для tidy использовать действительную compile database собственных единиц трансляции, включая потребителей изменённого заголовка. На всех стадиях запускать с `--warnings-as-errors=-*`, что снимает исходный wildcard `WarningsAsErrors: '*'` LEA, и отключённым цветом диагностики. Runner разбирает file/line/check-name из диагностик и блокирует только совпавшие с выбранными patterns замечания внутри текущего scope. Замечания вне scope сохраняются в полном отчёте. Ненулевой код самого инструмента при снятом повышении warnings означает ошибку выполнения. Известные исключения Qt из `.clang-tidy` сохраняются. [Параметры clang-tidy](https://clang.llvm.org/extra/clang-tidy/)
- [ ] На маленьких примерах проверить этапы 1/2/3, старое замечание в незатронутом файле, старый формат в затронутом файле, renamed/new файл и изменённый заголовок с двумя потребителями. В первой стадии замечания дают отчёт и `0`; во второй формат в changed даёт `1`; в третьей выбранная tidy-ошибка в changed даёт `1`. Ошибка самого инструмента даёт `1` во всех стадиях.
- [ ] Выполнить `python3 -m unittest discover -s tests/fixtures/cpp-checks -p 'test_*.py'` из runtime-пакета. Проверить пример на Linux CMake-фикстуре из задач 2–3. Области all включать только после подтверждения чистого прогона выбранных правил на всей области. Зафиксировать коммит документации и работающего примера.

В unittest для одной фикстуры с диагностикой форматирования и одной tidy-диагностикой выполнить отдельные шаги и закрепить исходы.

```python
self.assertEqual(format_stage1.returncode, 0)
self.assertEqual(format_stage2_changed.returncode, 1)
self.assertEqual(tidy_stage2.returncode, 0)
self.assertEqual(tidy_stage3_changed.returncode, 1)
self.assertEqual(tidy_stage3_outside_scope.returncode, 0)
self.assertNotEqual(tool_failure.returncode, 0)
```

### Task 7. Оформить поддержку в HiFlow и зафиксировать upstream

**Files** — изменить `hi_flow/skills/arch-audit/SKILL.md`, `hi_flow/skills/arch-audit/references/baseline-rules.md`, `hi_flow/skills/bootstrap/references/coverage-manifest.md`, `ARCHITECTURE.md`, `hi_flow/README.md` и четыре текущих plugin/marketplace manifest в рамках существующего порядка выпуска.

- [ ] Описать новый выбор адаптера, machine-only режим, внешние инструменты, Linux-пределы, отдельный out-dir и три этапа проверок. Добавить ссылку на cpp.md из документа аудита и из текущего архитектурного снимка LEA при внедрении.
- [ ] В существующий coverage-manifest добавить строку C++/CMake с имеющимися файлами и адаптером. Scaffold/new-project подготовка остаются absent-pending, строка PARTIAL. Принятые правила и настройки CI не требуют новой универсальной схемы учёта.
- [ ] Обновить архитектурный снимок HiFlow по фактическим изменённым источникам. Согласованную спеку, план и итоговый отчёт реализации включить в артефакты ветки. Соблюсти единые версии поставки по действующему процессу, выбрав следующую доступную версию после сверки актуальной основной ветки.
- [ ] Повторить финальные runtime-проверки из задачи 5 только после последнего изменения runtime/dist. Для документов проверить ссылки, frontmatter скилла, четыре версии и `git diff --check`.
- [ ] Подготовить PR HiFlow с проверками, точной версией и ограничениями. После разрешённого слияния выполнить fetch и `git merge-base --is-ancestor <upstream-sha> origin/master`. Зафиксировать этот SHA как вход LEA. До этого задачу 8 оставлять ожидающей upstream.

### Task 8. Подключить проверки в отдельной ветке LEA

**Files в LEA** — создать `cmake/LeaGates.cmake`, `tools/check_quality.py`, `.audit-rules.yaml`; изменить `CMakeLists.txt`, `.github/workflows/ci.yml`, текущий архитектурный документ `docs/architecture.md` адресной ссылкой на стековые правила и команду проверок. Сохранить имя обязательного задания `Linux build and core tests`.

**Interfaces**

Основной вход `cmake --build build --target gates`. CMake cache options `LEA_CHECK_STAGE=1`, `LEA_FORMAT_SCOPE=changed`, `LEA_TIDY_SCOPE=changed`, `LEA_CHECK_BASE=<sha>`, `LEA_HIFLOW_ROOT=<checkout>`, `LEA_TIDY_ERROR_CHECKS=<patterns>` передаются runner из задачи 6. Для stage 1 scopes дают только отчёт. Runtime-путь указывает на закреплённый upstream HiFlow из задачи 7.

- [ ] Выполнить актуальные правила координации LEA перед первой правкой. Зафиксировать собственную ветку, базу, пути и issue. Issue и PR для LEA — часть внедрения, согласование пересечений определяется его AGENTS.
- [ ] Подключить проверенный пример из задачи 6 к проекту, сохранив текущие `.clang-format`, `.clang-tidy` и `lea_set_warnings`. Зарегистрировать gates после объявления production/tests. Сборка использует текущий профиль Release и `LEA_WITH_ONNXRUNTIME=OFF`; CTest сохраняет точный существующий список Linux-исключений и `--no-tests=error`.
- [ ] Добавить три HIGH-правила из задачи 4 в `.audit-rules.yaml`. До этого сверить их с принятым контрактом LEA. Целевой `module_pattern` — `src`. В change summary показать весь согласованный набор правил.
- [ ] Из существующего Linux CI вызвать gates с stage 1. Добавить Node 20+, clang-format-18 и clang-tidy-18 по текущему устройству раннера. Получать готовый HiFlow по точному upstream SHA через actions/checkout во вспомогательный каталог. Базовый SHA для changed-проверок — база сравнения конкретного PR, передаваемая тем же способом локальному воспроизведению. Шаги с диагностикой сохраняются как artifacts даже при ошибке выполнения.
- [ ] Проверить отдельно, что вручную запускаемый workflow имеет явный base для changed-mode. При отсутствии base в stage 2/3 выводить инструкцию его задать. В stage 1 допустим полный анализ с явной подписью режима. Защитить источник анализа от попадания вспомогательного checkout HiFlow.
- [ ] Выполнить локальный stage-1 прогон. При findings формата/tidy получить опубликованные замечания и `0`, если сборка/тесты/инструменты исправны. Разобрать фактические ошибки запуска отдельно от замечаний. Реальные ошибки сборки/тестов остаются блокирующими.
- [ ] Открыть PR LEA и получить фактический Linux CI на его актуальной базе. Сохранить URL, head/tested SHA, base SHA, upstream HiFlow SHA, версии и выбранный профиль. Merge и публикация LEA требуют обычного решения оператора по процессу проекта.

### Task 9. Принять на Linux и передать результат

**Files** — итоговые `audit-report.json`, `audit-report.md` в принятом каталоге LEA и `docs/superpowers/specs/2026-11-16-arch-audit-cpp-qt-lea-design-report.md` в HiFlow. Обновить `PROJECT_STATE.md` существующим способом после проверки фактической поставки.

- [ ] На том же зафиксированном коммите LEA, профиле и побайтово одинаковом `.audit-rules.yaml` выполнить один полный аудит через C++/CMake CLI. Если CI использует merge-коммит, локальная приёмка использует его же. Проверить семь модулей и конкретные `LEA → lea_ui`, `lea_editor → lea_engine` и `MaExport.h → Project.h` до проекции графа.
- [ ] Выполнить фазу 2 штатным агентом по `clusters-input.json`, затем `render-md`. D8 schema и semantic validation должны пройти. Любые реальные архитектурные findings имеют доказательства и сохраняются при успешном машинном коде `0`. При неполном извлечении приёмку обозначить partial с точным пробелом.
- [ ] Сопоставить локальный gates и фактический Linux CI из задачи 8. Подтвердить stage 1, блокировку сборки/тестов и отчётность форматирования/tidy. Привести результаты контрольных стадий 2/3 из задачи 6. До очистки соответствующей области оставить production-настройки этапа 1 и записать условия перехода из спеки.
- [ ] Создать обязательный implementation report рядом со спекой с completed/partial/blocked, изменениями, отклонениями, обнаруженными проблемами и открытыми пунктами. Записать результаты CI и полного аудита, статус PR/merge, закреплённые ревизии и пределы проверки уязвимостей.
- [ ] Отдельно перечислить подготовку исходников, публикацию плагина, установку и загрузку в новом чате. Если какая-то поставочная стадия ожидает решения оператора, сохранить точную инструкцию продолжения и честный статус этой стадии.
- [ ] Убрать собственные временные сборки и процессы в пределах разрешений. Сохранить отчёты и нужный для приёмки каталог сборки с владельцем и назначением. Worktree и ресурсы `preview` обслуживаются по действующим правилам проекта. Перед передачей открыть актуальные план и отчёт в Codex, приложить результаты проверки.

## Самопроверка плана

Требования сопоставлены с задачами. Стековые правила и применимый пример CI — 6–8; извлечение CMake/C++ и полнота — 2–4; совместимость TS/JS и D8 — 1, 4–5; архитектура только в отчёте — 5, 8–9; три этапа с изменёнными заголовками и общей базой — 6, 8; Linux-приёмка и отчёт — 9. Предшествующее внедрение HiFlow закрепляется до изменения LEA. QML, Bootstrap и обязательная матрица платформ дополнительных задач не образуют.
