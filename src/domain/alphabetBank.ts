export interface AlphabetEntry {
  id: string
  upper: string
  lower: string
}

export const alphabetBank: AlphabetEntry[] = [
  { id: 'a', upper: 'A', lower: 'a' },
  { id: 'b', upper: 'B', lower: 'b' },
  { id: 'c', upper: 'C', lower: 'c' },
  { id: 'd', upper: 'D', lower: 'd' },
  { id: 'e', upper: 'E', lower: 'e' },
  { id: 'f', upper: 'F', lower: 'f' },
  { id: 'g', upper: 'G', lower: 'g' },
  { id: 'h', upper: 'H', lower: 'h' },
  { id: 'i', upper: 'I', lower: 'i' },
  { id: 'j', upper: 'J', lower: 'j' },
  { id: 'k', upper: 'K', lower: 'k' },
  { id: 'l', upper: 'L', lower: 'l' },
  { id: 'm', upper: 'M', lower: 'm' },
  { id: 'n', upper: 'N', lower: 'n' },
  { id: 'o', upper: 'O', lower: 'o' },
  { id: 'p', upper: 'P', lower: 'p' },
  { id: 'q', upper: 'Q', lower: 'q' },
  { id: 'r', upper: 'R', lower: 'r' },
  { id: 's', upper: 'S', lower: 's' },
  { id: 't', upper: 'T', lower: 't' },
  { id: 'u', upper: 'U', lower: 'u' },
  { id: 'v', upper: 'V', lower: 'v' },
  { id: 'w', upper: 'W', lower: 'w' },
  { id: 'x', upper: 'X', lower: 'x' },
  { id: 'y', upper: 'Y', lower: 'y' },
  { id: 'z', upper: 'Z', lower: 'z' },
]

export function getAlphabetById(id: string): AlphabetEntry {
  const entry = alphabetBank.find((a) => a.id === id)
  if (!entry) {
    throw new Error(`Unknown alphabet id: ${id}`)
  }
  return entry
}
