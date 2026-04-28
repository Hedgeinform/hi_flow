# Architectural Principles (D9)

## Layer A — built-ins

### acyclic-dependencies

**Description:** No cycles in the dependency graph.

**Fix alternatives:**
- Extract shared logic into a third module.
- Invert dependency direction via interface.
- Merge tightly-coupled modules.

**Related:** `god-object-prohibition`, `common-reuse`.

### god-object-prohibition

**Description:** A single module must not have multiple unrelated responsibilities.

**Fix alternatives:**
- Split by responsibility.
- Extract collaborator modules.
