# Implementation Report: C++/CMake ArchAudit and LEA adoption

**Spec:** docs/superpowers/specs/2026-11-16-arch-audit-cpp-qt-lea-design.md
**Date:** 2026-11-18
**Status:** partial

## What was done
- HiFlow: implemented the CMake/GCC collector, shared D8 report path, machine-only CLI and shipped runtime; retained TS/JS and apply-patch routes.
- Added C++ stack guidance and a project-local CMake/Python gate example with staged formatting and clang-tidy checks. Bootstrap/scaffolding remains partial and is recorded in the existing coverage manifest.
- Verified CMake model, direct includes, external/Qt targets, D8 and TS/JS with Linux fixtures: 276 runtime tests passed, along with build, build consistency and TypeScript checks. A standalone copy without `node_modules` exercised the shipped CLI, HIGH/CRITICAL, incomplete input and full Markdown rendering.
- Six real Ubuntu 24.04 tests passed, exercising Clang 18 stages, changed-header diagnostics from two translation units and the complete fixture `gates` path including CMake build, audit and CTest.
- Independent review identified and verified fixes for several incomplete-input and evidence errors. It also found the unresolved shared-system-root case described below.

## Deviations from spec
- Multi-config CMake direct link expressions require a temporary CMake evaluation query. A control fixture verified distinct Debug/Release links and byte-identical cache after the query. Existing `CMAKE_PROJECT_INCLUDE` in that mode fails explicitly rather than being overwritten.
- The C++ collector currently supports Ninja/Ninja Multi-Config and GCC on Linux. Custom `CMakeGraphVizOptions.cmake`, unsupported interface file sets, unresolvable external ownership and source file remapping fail explicitly. Cycle enumeration aborts when more than 10,000 unique cycles would be needed; it does not publish a partial graph as successful.
- Machine reports use a separate output directory; previous JSON and cluster input are moved aside before collection. Bootstrap is deferred as agreed.

## Issues discovered
- **PR readiness blocker:** when multiple reachable imported libraries share `/usr/include`, the collector cannot distinguish a libc header (e.g. `unistd.h`) from a package header by path alone and fails with an ambiguous external include. The LEA Linux configuration contains this case. A reliable ownership strategy is still required; no LEA acceptance is claimed. Explicit include flags supplied via raw compiler options may also be absent from CMake File API include roots and need coverage.
- LEA adoption, its actual Linux CI and full architecture audit have not run. The C++ collector and project gate have been exercised on controlled fixtures, including real Qt and Clang, not accepted on LEA.
- Dependency vulnerability scanning for system packages / FetchContent is not provided by these checks. The existing dependency installation reported 12 npm vulnerabilities (2 moderate, 8 high, 2 critical); dependency upgrades are outside this change.

## Open items
- Resolve shared system-header ownership and raw compiler-option include roots; add regression tests and repeat independent review before marking the HiFlow PR ready. Obtain operator approval before merge.
- After approved HiFlow merge, fetch the actual upstream SHA; inspect current LEA instructions, issues and PRs, then perform tasks 8–9 in a separate LEA branch.
- Capture actual LEA Linux CI, the single full D8 audit and matching configuration/rules, and update this report with their evidence.
- Publication, plugin installation and loading in a new chat remain separate, unperformed delivery stages.
