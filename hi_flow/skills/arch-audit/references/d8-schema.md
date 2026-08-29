# D8 Schema: Audit-Report Contract

**Owner:** `hi_flow:arch-audit` (produces output in this schema).
**Consumers:** `hi_flow:arch-redesign` (validates input against this schema during pre-condition check), `hi_flow:arch-spec` (planned, downstream consumer).
**Anchor:** Active Decision D8 in project ARCHITECTURE.md.

## File structure

The audit-report directory contains two final artifacts plus one Phase 1 handoff:

- `audit-report.json` — machine-readable structured data (consumed by arch-redesign, arch-spec).
- `audit-report.md` — human-readable report (consumed by the operator for context).
- `clusters-input.json` — deterministic Phase 1 handoff for cluster prose generation.

During the two-phase build, Phase 1 writes an explicit `INCOMPLETE` marker to `audit-report.md`. Only successful Phase 2 semantic validation and rendering replaces it with the completed report.

Default path: `<project>/audit-report/`. Operator may pass an alternative path on skill invocation.

## audit-report.json schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["metadata", "findings", "metrics"],
  "properties": {
    "metadata": {
      "type": "object",
      "required": ["audit_sha", "schema_version"],
      "properties": {
        "audit_sha": {
          "type": "string",
          "description": "Git commit hash on which audit was run. Used by arch-redesign for freshness check."
        },
        "schema_version": {
          "type": "string",
          "enum": ["1.1", "1.2"],
          "description": "Supported D8 schema version. Current producer: 1.2; 1.1 remains readable for legacy reports."
        },
        "audit_timestamp": {
          "type": "string",
          "format": "date-time",
          "description": "ISO 8601 timestamp of audit run. Optional, used for debug and session log."
        },
        "audit_tooling_version": {
          "type": "string",
          "description": "Version string of audit tooling (e.g., dependency-cruiser version). Optional, helps interpret rule sets behind the run."
        },
        "project_name": { "type": "string", "description": "Project name for the completed Markdown header." },
        "module_root": { "type": "string", "description": "Relative source root used to derive module ids." },
        "operator_notes": {
          "type": "array",
          "description": "Deterministic notes about explicit overrides, parsing gaps, and suppression effects."
        },
        "known_rule_ids": {
          "type": "array",
          "description": "Exact baseline/project registry used in Phase 1 and rechecked before Phase 2 rendering."
        },
        "parsing_errors": {
          "type": "array",
          "description": "Optional array of `{file, error}` objects describing TypeScript source files that dependency-cruiser could not parse. Allows producing a partial audit report when some files have syntax errors."
        }
      },
      "allOf": [{
        "if": { "properties": { "schema_version": { "const": "1.2" } } },
        "then": { "required": ["project_name", "module_root", "known_rule_ids"] }
      }]
    },
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "rule_id", "type", "severity", "source", "reason"],
        "properties": {
          "id": {
            "type": "string",
            "description": "Stable identifier for the finding."
          },
          "rule_id": {
            "type": "string",
            "description": "Canonical namespaced cross-reference to the rule: `baseline:<kebab-case-id>` or `project:<kebab-case-id>`. Plain rule names are invalid."
          },
          "type": {
            "type": "string",
            "enum": ["boundary", "cycle", "sdp", "coupling", "nccd"],
            "description": "Violation type."
          },
          "severity": {
            "type": "string",
            "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
          },
          "source": {
            "type": "object",
            "properties": {
              "module": { "type": "string" },
              "file":   { "type": "string" }
            }
          },
          "target": {
            "type": "object",
            "properties": {
              "module": { "type": "string" },
              "file":   { "type": "string" }
            }
          },
          "reason": {
            "type": "object",
            "required": ["principle", "explanation"],
            "properties": {
              "principle": {
                "type": "string",
                "description": "Reference to architectural principle from D9 library at hi_flow/references/architectural-principles.md. Use the canonical principle id."
              },
              "explanation": {
                "type": "string",
                "description": "Free-form formulation invoking the principle in concrete terms (e.g., 'validator is channel-agnostic middleware')."
              }
            }
          },
          "extras": {
            "type": "object",
            "description": "Type-specific extras: cycle members for cycles, type-only flag for boundary, etc."
          }
        }
      }
    },
    "metrics": {
      "type": "object",
      "required": ["per_module", "nccd", "nccd_threshold", "severity_counts", "dep_graph"],
      "properties": {
        "per_module": {
          "type": "object",
          "additionalProperties": {
            "type": "object",
            "required": ["Ca", "Ce", "I", "LOC"],
            "properties": {
              "Ca": { "type": "number", "description": "Afferent coupling — incoming dependencies." },
              "Ce": { "type": "number", "description": "Efferent coupling — outgoing dependencies." },
              "I":  { "type": "number", "description": "Instability metric, 0..1." },
              "LOC": { "type": "integer", "minimum": 0, "description": "Physical lines across audited source files assigned to the module." }
            }
          }
        },
        "nccd":           { "type": "number" },
        "nccd_threshold": { "type": "number" },
        "severity_counts": {
          "type": "object",
          "properties": {
            "CRITICAL": { "type": "integer" },
            "HIGH":     { "type": "integer" },
            "MEDIUM":   { "type": "integer" },
            "LOW":      { "type": "integer" }
          }
        },
        "dep_graph": {
          "type": "object",
          "description": "Module dependency graph as adjacency list, e.g., { 'moduleA': ['moduleB', 'moduleC'], ... }."
        }
      }
    }
  }
}
```

## Severity normalization

Depcruise native severities (`error`, `warn`, `info`) are normalized by the arch-audit adapter before being written to D8 findings:

- depcruise `error` → D8 `HIGH` (or `CRITICAL` if the rule is project-promoted).
- depcruise `warn` → D8 `MEDIUM`.
- depcruise `info` → D8 `LOW`.

D8 `severity` is always one of `{CRITICAL, HIGH, MEDIUM, LOW}` — depcruise native values never appear in `audit-report.json`.

## Validation rules used by arch-redesign

The skill validates the incoming `audit-report.json` per the Pre-condition checks (see SKILL.md):

1. **Existence.** File `audit-report.json` must be readable at the configured path. Failure → hard fail with operator-facing message.
2. **Schema compliance.**
   - Every finding must have `reason.principle` and `rule_id` fields.
   - Metadata must include `audit_sha` and `schema_version`; D8 1.2 additionally requires `project_name`, `module_root`, and `known_rule_ids` so Phase 2 cannot bypass the Phase 1 rule registry.
   - `reason.principle` must reference a known canonical principle id from the bundled D9 library (`hi_flow/references/architectural-principles.md`). Unknown ids hard-fail before a report is emitted as complete.
   - Cycle findings must contain unique ordered module ids in `extras.members`; every consecutive edge including the closing edge must exist in `metrics.dep_graph`. A two-module cycle has one owner: a matching specialized layer-cycle rule, otherwise `baseline:inappropriate-intimacy`; `baseline:no-circular` is reserved for 3+ modules.
   - Every finding source must be a module in `metrics.dep_graph`, with one reserved project-aggregate exception: `type: nccd` / `rule_id: baseline:nccd-breach` must use `source.module: "<project>"`. The `<project>` sentinel is invalid for every other finding. Internal cross-module boundary findings must match an edge in `metrics.dep_graph`. File-level boundaries within one module use non-empty file locators because the module graph omits self-edges. External SDK boundaries set `extras.external_target: true` and `extras.sdk` equal to `target.module`; external targets are intentionally absent from the internal graph.
   - Ca/Ce/I, severity counts, module sets, finding edges, and non-zero total LOC are recomputed and checked deterministically.
   - Failure → hard fail with operator-facing message naming the specific violation.
3. **Freshness.** `metadata.audit_sha` is compared with the current `git rev-parse HEAD`. Mismatch → soft ask with operator override.

**Strict object boundaries:** The companion JSON Schema (`d8-schema.json`) declares `additionalProperties: false` on `metadata`, `source`, `target`, and `reason` objects. Validators using that file will reject extra fields in those objects. The markdown schema above is a human-readable summary; `d8-schema.json` is authoritative for machine validation.

## Notes for integrators producing audit-report outside arch-audit

If you produce `audit-report.json` from a tool other than `hi_flow:arch-audit` (for example, by writing a converter from a CodeScene / SonarQube / dependency-cruiser native output):

- All required fields above must be present, including `rule_id` and `schema_version`; a 1.2 producer must also embed `project_name`, `module_root`, and the complete `known_rule_ids` registry.
- `reason.principle` values must reference principle ids from the canonical D9 library. Custom principle names will fail schema check.
- `audit_sha` is mandatory — without it, freshness check is impossible (and proceeding without it is unsafe).
- Set `schema_version` to the D8 version your output conforms to (current: `"1.2"`).

If your audit tool does not natively know about D9 principles, add a mapping layer in your converter that translates native rule names into D9 principle ids.

## Changelog

- 1.2 (2026-08-29): source-derived LOC and semantic consistency checks; ordered module cycles; explicit external-boundary encoding; required project header and embedded rule registry for equivalent Phase 1/Phase 2 validation; optional operator-note metadata.
- 1.1 (2026-04-28): added optional metadata.parsing_errors for partial-parse audits.
- 1.0: initial schema.
