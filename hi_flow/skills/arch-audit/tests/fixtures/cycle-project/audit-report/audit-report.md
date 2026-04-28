# Audit Report

**Date:** 2026-04-28T12:00:19.801Z
**Audit SHA:** `uuid:cycle-test`
**Stack:** typescript-depcruise (16.3.0)
**Total modules:** 2

## Severity roll-up

| Severity | Count |
|---|---:|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 0 |
| LOW | 0 |

**NCCD:** 2.00 (threshold 1)

## Project Dependency Graph

```mermaid
flowchart TD
    a ==>|cycle| b
    b --> a
```

## Findings (2)

### f-001 — baseline:no-circular (HIGH)
**Source → Target:** `a` → `b`
**Reason:** acyclic-dependencies — Circular dependency detected between modules.

### f-002 — baseline:inappropriate-intimacy (HIGH)
**Source → Target:** `a` → `b`
**Reason:** acyclic-dependencies — Two-module cycle — modules know each other intimately.

## Cluster suggestions

### acyclic-dependencies (2 findings)
**Root cause:** _(cluster prose not generated — clusterProsefn not provided to buildReport)_

```mermaid
flowchart TD
    a --> b
```
