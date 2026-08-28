export function canonicalCycleKey(members: readonly string[]): string {
  if (members.length === 0) return '[]'
  const candidates: string[] = []
  const directions = [members, [...members].reverse()]
  for (const direction of directions) {
    for (let offset = 0; offset < direction.length; offset++) {
      candidates.push(JSON.stringify([
        ...direction.slice(offset),
        ...direction.slice(0, offset),
      ]))
    }
  }
  return candidates.sort()[0]!
}
