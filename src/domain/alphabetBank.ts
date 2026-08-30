export interface AlphabetEntry {
  id: string
  upper: string
  lower: string
  /** A common example word starting with this letter (the classic ABC-chart mnemonic
   * style, same idea as hiragana/katakana's own mnemonic field) — TTS pronounces an
   * isolated single letter name poorly/ambiguously in isolation, so speech always wraps
   * it in this short phrase instead (see alphabetSpeechPhrase). */
  mnemonic: string
}

export const alphabetBank: AlphabetEntry[] = [
  { id: 'a', upper: 'A', lower: 'a', mnemonic: 'Apple' },
  { id: 'b', upper: 'B', lower: 'b', mnemonic: 'Ball' },
  { id: 'c', upper: 'C', lower: 'c', mnemonic: 'Cat' },
  { id: 'd', upper: 'D', lower: 'd', mnemonic: 'Dog' },
  { id: 'e', upper: 'E', lower: 'e', mnemonic: 'Elephant' },
  { id: 'f', upper: 'F', lower: 'f', mnemonic: 'Fish' },
  { id: 'g', upper: 'G', lower: 'g', mnemonic: 'Grape' },
  { id: 'h', upper: 'H', lower: 'h', mnemonic: 'Hat' },
  { id: 'i', upper: 'I', lower: 'i', mnemonic: 'Ice' },
  { id: 'j', upper: 'J', lower: 'j', mnemonic: 'Juice' },
  { id: 'k', upper: 'K', lower: 'k', mnemonic: 'Kite' },
  { id: 'l', upper: 'L', lower: 'l', mnemonic: 'Lion' },
  { id: 'm', upper: 'M', lower: 'm', mnemonic: 'Monkey' },
  { id: 'n', upper: 'N', lower: 'n', mnemonic: 'Nose' },
  { id: 'o', upper: 'O', lower: 'o', mnemonic: 'Orange' },
  { id: 'p', upper: 'P', lower: 'p', mnemonic: 'Pig' },
  { id: 'q', upper: 'Q', lower: 'q', mnemonic: 'Queen' },
  { id: 'r', upper: 'R', lower: 'r', mnemonic: 'Rabbit' },
  { id: 's', upper: 'S', lower: 's', mnemonic: 'Sun' },
  { id: 't', upper: 'T', lower: 't', mnemonic: 'Tiger' },
  { id: 'u', upper: 'U', lower: 'u', mnemonic: 'Umbrella' },
  { id: 'v', upper: 'V', lower: 'v', mnemonic: 'Violin' },
  { id: 'w', upper: 'W', lower: 'w', mnemonic: 'Watermelon' },
  { id: 'x', upper: 'X', lower: 'x', mnemonic: 'Xylophone' },
  { id: 'y', upper: 'Y', lower: 'y', mnemonic: 'Yak' },
  { id: 'z', upper: 'Z', lower: 'z', mnemonic: 'Zebra' },
]

export function getAlphabetById(id: string): AlphabetEntry {
  const entry = alphabetBank.find((a) => a.id === id)
  if (!entry) {
    throw new Error(`Unknown alphabet id: ${id}`)
  }
  return entry
}

/** Mirrors hiraganaSpeechPhrase/katakanaSpeechPhrase's "glyph, mnemonic's glyph" pattern
 * (e.g. "あ、ありのあ" — letter, then word, then letter again) in English ABC-chart style:
 * always the upper-case form, since a letter's name doesn't change with case (see
 * AlphabetWritableEntry.upper's comment in HandwritingScreen.tsx for why a bare lower-case
 * letter is unsafe to speak on its own).
 *
 * The two letter occurrences must NOT be adjacent ("B. B for Ball." puts them back-to-back
 * with nothing but a period between them) — confirmed via direct phoneme inspection that
 * Kokoro's G2P drops that period's pause entirely (`bˈi bˈi fɔɹ bˈɔl.`, no pause phoneme
 * between the two `bˈi`s), so the two short syllables blend into what sounds like "bb".
 * Putting the mnemonic word between them ("B. Ball. B.") gives real acoustic separation. */
export function alphabetSpeechPhrase(entry: AlphabetEntry): string {
  return `${entry.upper}. ${entry.mnemonic}. ${entry.upper}.`
}
