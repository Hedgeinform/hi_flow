# Audit Report

**Date:** 2026-04-28T22:25:26.599Z
**Audit SHA:** `uuid:god-test`
**Stack:** typescript-depcruise (16.3.0)
**Total modules:** 12

## Severity roll-up

| Severity | Count |
|---|---:|
| CRITICAL | 0 |
| HIGH | 13 |
| MEDIUM | 0 |
| LOW | 0 |

**NCCD:** 12.00 (threshold 1)

## Project Dependency Graph

```mermaid
flowchart TD
    god
    a
    b
    c
    d
    e
    f
    g
    h
    i
    j
    k
    god ==>|cycle| a
    god ==>|cycle| b
    god ==>|cycle| c
    god ==>|cycle| d
    god ==>|cycle| e
    god ==>|cycle| f
    god ==>|cycle| g
    god ==>|cycle| h
    god ==>|cycle| i
    god ==>|cycle| j
    god ==>|cycle| k
    a ==>|cycle| god
    b ==>|cycle| god
    c ==>|cycle| god
    d ==>|cycle| god
    e ==>|cycle| god
    f ==>|cycle| god
    g ==>|cycle| god
    h ==>|cycle| god
    i ==>|cycle| god
    j ==>|cycle| god
    k ==>|cycle| god
    linkStyle 0 stroke:#d32f2f,stroke-width:3px
    linkStyle 1 stroke:#d32f2f,stroke-width:3px
    linkStyle 2 stroke:#d32f2f,stroke-width:3px
    linkStyle 3 stroke:#d32f2f,stroke-width:3px
    linkStyle 4 stroke:#d32f2f,stroke-width:3px
    linkStyle 5 stroke:#d32f2f,stroke-width:3px
    linkStyle 6 stroke:#d32f2f,stroke-width:3px
    linkStyle 7 stroke:#d32f2f,stroke-width:3px
    linkStyle 8 stroke:#d32f2f,stroke-width:3px
    linkStyle 9 stroke:#d32f2f,stroke-width:3px
    linkStyle 10 stroke:#d32f2f,stroke-width:3px
    linkStyle 11 stroke:#d32f2f,stroke-width:3px
    linkStyle 12 stroke:#d32f2f,stroke-width:3px
    linkStyle 13 stroke:#d32f2f,stroke-width:3px
    linkStyle 14 stroke:#d32f2f,stroke-width:3px
    linkStyle 15 stroke:#d32f2f,stroke-width:3px
    linkStyle 16 stroke:#d32f2f,stroke-width:3px
    linkStyle 17 stroke:#d32f2f,stroke-width:3px
    linkStyle 18 stroke:#d32f2f,stroke-width:3px
    linkStyle 19 stroke:#d32f2f,stroke-width:3px
    linkStyle 20 stroke:#d32f2f,stroke-width:3px
    linkStyle 21 stroke:#d32f2f,stroke-width:3px
    classDef hubModule fill:#fce5f3,stroke:#c2185b
    class god hubModule
```

## Layered architecture

Layered structure не detected — closed list имён слоёв (domain / core / business / services / api / web / ui / infrastructure / ...) не совпал с module naming проекта. Conditional rules `baseline:layered-respect`, `baseline:port-adapter-direction`, `baseline:architectural-layer-cycle` не применялись.

## Module Metrics

| Module | Ca | Ce | I | LOC |
|---|---:|---:|---:|---:|
| `a` | 1 | 1 | 0.50 | 5 |
| `b` | 1 | 1 | 0.50 | 5 |
| `c` | 1 | 1 | 0.50 | 5 |
| `d` | 1 | 1 | 0.50 | 5 |
| `e` | 1 | 1 | 0.50 | 5 |
| `f` | 1 | 1 | 0.50 | 5 |
| `g` | 1 | 1 | 0.50 | 5 |
| `god` | 11 | 11 | 0.50 | 400 |
| `h` | 1 | 1 | 0.50 | 5 |
| `i` | 1 | 1 | 0.50 | 5 |
| `j` | 1 | 1 | 0.50 | 5 |
| `k` | 1 | 1 | 0.50 | 5 |

## Findings (13)

### f-001 — baseline:god-object (HIGH)
**Module:** `god`
**Reason:** god-object-prohibition — Module has high incoming AND outgoing coupling AND large LOC — multiple responsibilities.

### f-002 — baseline:dependency-hub (HIGH)
**Module:** `god`
**Reason:** hub-like-dependency — Module is a dependency hub: Ca exceeds max(20% of total modules, 10).

### f-003 — baseline:inappropriate-intimacy (HIGH)
**Source → Target:** `god` → `h`
**Reason:** acyclic-dependencies — Two-module cycle — modules know each other intimately.

### f-004 — baseline:inappropriate-intimacy (HIGH)
**Source → Target:** `god` → `i`
**Reason:** acyclic-dependencies — Two-module cycle — modules know each other intimately.

### f-005 — baseline:inappropriate-intimacy (HIGH)
**Source → Target:** `god` → `j`
**Reason:** acyclic-dependencies — Two-module cycle — modules know each other intimately.

### f-006 — baseline:inappropriate-intimacy (HIGH)
**Source → Target:** `god` → `k`
**Reason:** acyclic-dependencies — Two-module cycle — modules know each other intimately.

### f-007 — baseline:inappropriate-intimacy (HIGH)
**Source → Target:** `a` → `god`
**Reason:** acyclic-dependencies — Two-module cycle — modules know each other intimately.

### f-008 — baseline:inappropriate-intimacy (HIGH)
**Source → Target:** `b` → `god`
**Reason:** acyclic-dependencies — Two-module cycle — modules know each other intimately.

### f-009 — baseline:inappropriate-intimacy (HIGH)
**Source → Target:** `c` → `god`
**Reason:** acyclic-dependencies — Two-module cycle — modules know each other intimately.

### f-010 — baseline:inappropriate-intimacy (HIGH)
**Source → Target:** `d` → `god`
**Reason:** acyclic-dependencies — Two-module cycle — modules know each other intimately.

### f-011 — baseline:inappropriate-intimacy (HIGH)
**Source → Target:** `e` → `god`
**Reason:** acyclic-dependencies — Two-module cycle — modules know each other intimately.

### f-012 — baseline:inappropriate-intimacy (HIGH)
**Source → Target:** `f` → `god`
**Reason:** acyclic-dependencies — Two-module cycle — modules know each other intimately.

### f-013 — baseline:inappropriate-intimacy (HIGH)
**Source → Target:** `g` → `god`
**Reason:** acyclic-dependencies — Two-module cycle — modules know each other intimately.

## Cluster suggestions

### god-object-prohibition (1 findings)
**Root cause:** _(cluster prose not generated — clusterProsefn not provided to buildReport)_

```mermaid
flowchart TD
    god
```

### hub-like-dependency (1 findings)
**Root cause:** _(cluster prose not generated — clusterProsefn not provided to buildReport)_

```mermaid
flowchart TD
    god
```

### acyclic-dependencies (11 findings)
**Root cause:** _(cluster prose not generated — clusterProsefn not provided to buildReport)_

```mermaid
flowchart TD
    god --> h
    god --> i
    god --> j
    god --> k
    a --> god
    b --> god
    c --> god
    d --> god
    e --> god
    f --> god
    g --> god
```
