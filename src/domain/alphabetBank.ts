export interface AlphabetEntry {
  id: string
  upper: string
  lower: string
  /** A common example word starting with this letter (the classic ABC-chart mnemonic
   * style, same idea as hiragana/katakana's own mnemonic field) — TTS pronounces an
   * isolated single letter name poorly/ambiguously in isolation, so speech always wraps
   * it in this short phrase instead (see alphabetSpeechPhrase). */
  mnemonic: string
  /** A short English sentence built around `mnemonic`, read aloud during the review pass
   * after all 52 trace glyphs are done (see AlphabetTraceScreen) — the same role
   * exampleSentenceJa/En play for かんじ/ひらがな/カタカナ. English only: alphabet practice
   * is inherently English content, so there's no Japanese counterpart to pair it with. */
  exampleSentenceEn: string
}

export const alphabetBank: AlphabetEntry[] = [
  { id: 'a', upper: 'A', lower: 'a', mnemonic: 'Apple', exampleSentenceEn: 'I ate a red apple.' },
  { id: 'b', upper: 'B', lower: 'b', mnemonic: 'Ball', exampleSentenceEn: 'Throw me the ball.' },
  { id: 'c', upper: 'C', lower: 'c', mnemonic: 'Cat', exampleSentenceEn: 'The cat is sleeping.' },
  { id: 'd', upper: 'D', lower: 'd', mnemonic: 'Dog', exampleSentenceEn: 'My dog can run fast.' },
  { id: 'e', upper: 'E', lower: 'e', mnemonic: 'Elephant', exampleSentenceEn: 'The elephant is very big.' },
  { id: 'f', upper: 'F', lower: 'f', mnemonic: 'Fish', exampleSentenceEn: 'The fish swims in the water.' },
  { id: 'g', upper: 'G', lower: 'g', mnemonic: 'Grape', exampleSentenceEn: 'I like to eat grapes.' },
  { id: 'h', upper: 'H', lower: 'h', mnemonic: 'Hat', exampleSentenceEn: 'She wears a blue hat.' },
  { id: 'i', upper: 'I', lower: 'i', mnemonic: 'Ice', exampleSentenceEn: 'The ice is cold.' },
  { id: 'j', upper: 'J', lower: 'j', mnemonic: 'Juice', exampleSentenceEn: 'I drink orange juice.' },
  { id: 'k', upper: 'K', lower: 'k', mnemonic: 'Kite', exampleSentenceEn: 'We fly a kite in the park.' },
  { id: 'l', upper: 'L', lower: 'l', mnemonic: 'Lion', exampleSentenceEn: 'The lion is the king of the jungle.' },
  { id: 'm', upper: 'M', lower: 'm', mnemonic: 'Monkey', exampleSentenceEn: 'The monkey climbs the tree.' },
  { id: 'n', upper: 'N', lower: 'n', mnemonic: 'Nose', exampleSentenceEn: 'Point to your nose.' },
  { id: 'o', upper: 'O', lower: 'o', mnemonic: 'Orange', exampleSentenceEn: 'The orange is sweet.' },
  { id: 'p', upper: 'P', lower: 'p', mnemonic: 'Pig', exampleSentenceEn: 'The pig lives on the farm.' },
  { id: 'q', upper: 'Q', lower: 'q', mnemonic: 'Queen', exampleSentenceEn: 'The queen wears a crown.' },
  { id: 'r', upper: 'R', lower: 'r', mnemonic: 'Rabbit', exampleSentenceEn: 'The rabbit hops in the grass.' },
  { id: 's', upper: 'S', lower: 's', mnemonic: 'Sun', exampleSentenceEn: 'The sun is bright today.' },
  { id: 't', upper: 'T', lower: 't', mnemonic: 'Tiger', exampleSentenceEn: 'The tiger has orange stripes.' },
  { id: 'u', upper: 'U', lower: 'u', mnemonic: 'Umbrella', exampleSentenceEn: 'Bring your umbrella when it rains.' },
  { id: 'v', upper: 'V', lower: 'v', mnemonic: 'Violin', exampleSentenceEn: 'She plays the violin.' },
  { id: 'w', upper: 'W', lower: 'w', mnemonic: 'Watermelon', exampleSentenceEn: 'The watermelon is juicy.' },
  { id: 'x', upper: 'X', lower: 'x', mnemonic: 'Xylophone', exampleSentenceEn: 'He plays the xylophone.' },
  { id: 'y', upper: 'Y', lower: 'y', mnemonic: 'Yak', exampleSentenceEn: 'The yak lives on the mountain.' },
  { id: 'z', upper: 'Z', lower: 'z', mnemonic: 'Zebra', exampleSentenceEn: 'The zebra has black and white stripes.' },
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
  // Only used by the live-fallback TTS path (cache miss) — the actual cached audio (see
  // generate-alphabet-audio-en.py) doesn't synthesize this string directly at all. It
  // synthesizes the letter and "for <word>" as two separate clips and splices in an
  // explicit silence gap, because measuring it directly showed punctuation-driven pauses
  // (comma/ellipsis/period) only run ~30-70ms regardless of which mark is used — far too
  // short to read as a real pause between the letter and "for". The "..." here is the best
  // this single-string fallback path can do, which is why the real audio is generated the
  // other way instead of trusting this text alone.
  return `${entry.upper}... for ${entry.mnemonic}!`
}
