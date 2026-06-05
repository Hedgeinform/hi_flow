// Convention reference pattern (generic, non-domain). Demonstrates the `lib/` leaf layer:
// a pure utility, kebab-case file, NAMED export (never `export default`), explicit
// public-API types. The leaf imports nothing internal. Deletable without loss of meaning.
export function clamp(value: number, min: number, max: number): number {
  if (min > max) throw new Error('clamp: min must not be greater than max')
  if (value < min) return min
  if (value > max) return max
  return value
}
