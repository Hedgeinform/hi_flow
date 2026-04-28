# D8 Schema: Audit-Report Contract

**Owner:** `hi_flow:arch-audit` (produces output in this schema).
**Consumers:** `hi_flow:arch-redesign` (validates input against this schema during pre-condition check), `hi_flow:arch-spec` (planned, downstream consumer).
**Anchor:** Active Decision D8 in project ARCHITECTURE.md.

## File structure

The audit-report is a directory containing two artifacts:

- `audit-report.json` — machine-readable structured data (consumed by arch-redesign, arch-spec).
- `audit-report.md` — human-readable report (consumed by the operator for context).

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
          "pattern": "^\\d+\\.\\d+(\\.\\d+)?$",
          "description": "Semver D8 schema version. Current: 1.1. Protects downstream consumers from breaking changes without warning."
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
        "parsing_errors": {
          "type": "array",
          "description": "Optional array of `{file, error}` objects describing TypeScript source files that dependency-cruiser could not parse. Allows producing a partial audit report when some files have syntax errors."
        }
      }
    },
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "rule_id", "type", "severity", "source", "target", "reason"],
        "properties": {
          "id": {
            "type": "string",
            "description": "Stable identifier for the finding."
          },
          "rule_id": {
            "type": "string",
            "description": "Cross-reference to the baseline rule or project rule whose violation is recorded in this finding. Naming convention: `baseline:no-circular`, `project:custom-rule-name`. Plain rule names are acceptable when no disambiguation is needed. Exact convention — TBD in arch-audit implementation."
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
            "required": ["principle"],
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
      "properties": {
        "per_module": {
          "type": "object",
          "additionalProperties": {
            "type": "object",
            "required": ["Ca", "Ce", "I"],
            "properties": {
              "Ca": { "type": "number", "description": "Afferent coupling — incoming dependencies." },
              "Ce": { "type": "number", "description": "Efferent coupling — outgoing dependencies." },
              "I":  { "type": "number", "description": "Instability metric, 0..1." }
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
   - Metadata must include `audit_sha` and `schema_version`.
   - `reason.principle` should reference a known principle id from the D9 library (`hi_flow/references/architectural-principles.md`). Unknown ids should be flagged as `unmapped` in the audit run, not silently emitted.
   - Failure → hard fail with operator-facing message naming the specific violation.
3. **Freshness.** `metadata.audit_sha` is compared with the current `git rev-parse HEAD`. Mismatch → soft ask with operator override.

**Strict object boundaries:** The companion JSON Schema (`d8-schema.json`) declares `additionalProperties: false` on `metadata`, `source`, `target`, and `reason` objects. Validators using that file will reject extra fields in those objects. The markdown schema above is a human-readable summary; `d8-schema.json` is authoritative for machine validation.

## Notes for integrators producing audit-report outside arch-audit

If you produce `audit-report.json` from a tool other than `hi_flow:arch-audit` (for example, by writing a converter from a CodeScene / SonarQube / dependency-cruiser native output):

- All required fields above must be present, including `rule_id` and `schema_version`.
- `reason.principle` values must reference principle ids from the canonical D9 library. Custom principle names will fail schema check.
- `audit_sha` is mandatory — without it, freshness check is impossible (and proceeding without it is unsafe).
- Set `schema_version` to the D8 version your output conforms to (current: `"1.0"`).

If your audit tool does not natively know about D9 principles, add a mapping layer in your converter that translates native rule names into D9 principle ids.

## Changelog

- 1.1 (2026-04-28): added optional metadata.parsing_errors for partial-parse audits.
- 1.0: initial schema.
