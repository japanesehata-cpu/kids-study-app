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

/** English ABC-chart mnemonic style ("X for Xylophone"), always the upper-case form since a
 * letter's name doesn't change with case (see AlphabetWritableEntry.upper's comment in
 * HandwritingScreen.tsx for why a bare lower-case letter is unsafe to speak on its own).
 *
 * A single occurrence only — an earlier "letter, word, letter" version (mirroring hiragana/
 * katakana's own "あ、ありのあ" pattern) put two adjacent same-letter utterances too close
 * together in one phrasing ("B. B for Ball."), which Kokoro rendered with no real pause
 * between them (confirmed via phoneme inspection: `bˈi bˈi fɔɹ bˈɔl.`, no pause phoneme),
 * blending into what sounded like "bb". One occurrence sidesteps that entirely. */
export function alphabetSpeechPhrase(entry: AlphabetEntry): string {
  // "!" rather than "." — a small, low-risk nudge toward livelier, less flat/monotone
  // delivery (Kokoro's prosody is otherwise fixed by its acoustic model; text/punctuation
  // is the only lever available here). The actual pacing is controlled separately by
  // generate-alphabet-audio-en.py's SPEED constant, not by anything in this phrase text.
  return `${entry.upper} for ${entry.mnemonic}!`
}
