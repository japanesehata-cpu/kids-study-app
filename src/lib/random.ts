export function pickUniform<T>(items: readonly T[]): T {
  if (items.length === 0) throw new Error('pickUniform: empty list')
  return items[Math.floor(Math.random() * items.length)]
}

/** Every (a, b) in the given ranges that satisfies `keep` — for picking a whole problem
 * uniformly. Picking the answer first and then splitting it (sum, then a random addend)
 * is NOT uniform over problems: a sum with a single split (10+10=20) comes up as often as
 * a sum with eight, so that one problem repeats several times more often than any other. */
export function enumeratePairs(
  [aMin, aMax]: [number, number],
  [bMin, bMax]: [number, number],
  keep: (a: number, b: number) => boolean,
): { a: number; b: number }[] {
  const pairs: { a: number; b: number }[] = []
  for (let a = aMin; a <= aMax; a++) {
    for (let b = bMin; b <= bMax; b++) {
      if (keep(a, b)) pairs.push({ a, b })
    }
  }
  return pairs
}
