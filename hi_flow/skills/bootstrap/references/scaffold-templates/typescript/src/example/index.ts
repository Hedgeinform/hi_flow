// Convention reference pattern (generic, non-domain).
// This module exists only to demonstrate HOW a module is built in this project.
// It carries no project meaning and can be deleted without loss.
//
// Conventions demonstrated:
//   - file naming: kebab-case (`index.ts`)
//   - export form: NAMED export, never `export default`
//   - public API: explicit parameter and return types (no relying on inference)
//   - test location: the test lives at `tests/example/index.test.ts`
//     (tests/ mirrors src/), not co-located in this directory.

/**
 * Clamp a number into the inclusive range [min, max].
 *
 * A trivial pure utility chosen specifically because it is domain-free:
 * no business logic, no I/O, no state. Replace nothing here when scaffolding —
 * it is a convention example, not a feature.
 */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new Error('clamp: min must not be greater than max')
  }
  if (value < min) return min
  if (value > max) return max
  return value
}
