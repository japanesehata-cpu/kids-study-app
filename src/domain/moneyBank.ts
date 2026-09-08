export interface CoinEntry {
  id: string
  value: number
}

/** The 6 Japanese coin denominations (no bills — see the level-design discussion this was
 * scoped from: 1000円 notes are usually a grade-2+ topic). `id` doubles as the
 * words-image id (public/images/words/{id}.png — see scripts/generate-coin-images.py),
 * following the same "no wordBank entry needed" pattern as かぞえる's family/house/
 * birthdaycake images. */
export const coinBank: CoinEntry[] = [
  { id: 'yen1', value: 1 },
  { id: 'yen5', value: 5 },
  { id: 'yen10', value: 10 },
  { id: 'yen50', value: 50 },
  { id: 'yen100', value: 100 },
  { id: 'yen500', value: 500 },
]

export function getCoinById(id: string): CoinEntry {
  const entry = coinBank.find((c) => c.id === id)
  if (!entry) {
    throw new Error(`Unknown coin id: ${id}`)
  }
  return entry
}
