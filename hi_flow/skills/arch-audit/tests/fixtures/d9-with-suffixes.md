# Architectural Principles (D9 with suffixes)

## Layer A

### acyclic-dependencies (ADP)

**Description:** No cycles allowed.

**Fix alternatives:**
- Extract shared logic.
- Invert via interface.

### stable-dependencies (SDP)

**Description:** Depend in the direction of stability.

**Fix alternatives:**
- Move volatile parts toward leaves.

### god-object-prohibition

**Description:** No module with too many responsibilities.

**Fix alternatives:**
- Split by responsibility.
