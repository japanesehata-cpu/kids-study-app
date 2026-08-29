export interface PhonicsSound {
  /** distinguishes a letter's two sounds where it has them (vowels: short/long; c/g:
   * hard/soft) — used to build a unique cache key per sound alongside the letter id. */
  variant: 'short' | 'long' | 'hard' | 'soft' | 'plain'
  /** Approximate phonetic spelling fed to the English TTS engine. Typing the bare letter
   * makes an English voice say the letter's NAME ("e" -> "ee"), not its phonics SOUND — this
   * is a standard workaround (same spirit as Jolly Phonics' "pure sounds"): a short spelled-
   * out approximation that reads as the actual sound instead. */
  speech: string
  /** example word starting with this sound — wraps the bare sound for clearer TTS
   * intonation (same role as hiraganaBank.ts's mnemonic) and shown in the explanation. */
  mnemonic: string
}

export interface AlphabetEntry {
  id: string
  upper: string
  lower: string
  /** Most letters have one phonics sound; the five vowels and c/g have two (short/long,
   * hard/soft) that this app's phonics practice deliberately covers both of — e.g. E is
   * "eh" (egg) as well as "ee" (eagle), not just whichever one a plain TTS reading would
   * default to. */
  sounds: PhonicsSound[]
}

export const alphabetBank: AlphabetEntry[] = [
  { id: 'a', upper: 'A', lower: 'a', sounds: [
    { variant: 'short', speech: 'a', mnemonic: 'apple' },
    { variant: 'long', speech: 'ay', mnemonic: 'cake' },
  ] },
  { id: 'b', upper: 'B', lower: 'b', sounds: [{ variant: 'plain', speech: 'buh', mnemonic: 'ball' }] },
  { id: 'c', upper: 'C', lower: 'c', sounds: [
    { variant: 'hard', speech: 'kuh', mnemonic: 'cat' },
    { variant: 'soft', speech: 'ss', mnemonic: 'city' },
  ] },
  { id: 'd', upper: 'D', lower: 'd', sounds: [{ variant: 'plain', speech: 'duh', mnemonic: 'dog' }] },
  { id: 'e', upper: 'E', lower: 'e', sounds: [
    { variant: 'short', speech: 'eh', mnemonic: 'egg' },
    { variant: 'long', speech: 'ee', mnemonic: 'eagle' },
  ] },
  { id: 'f', upper: 'F', lower: 'f', sounds: [{ variant: 'plain', speech: 'ff', mnemonic: 'fish' }] },
  { id: 'g', upper: 'G', lower: 'g', sounds: [
    { variant: 'hard', speech: 'guh', mnemonic: 'goat' },
    { variant: 'soft', speech: 'juh', mnemonic: 'giraffe' },
  ] },
  { id: 'h', upper: 'H', lower: 'h', sounds: [{ variant: 'plain', speech: 'huh', mnemonic: 'hat' }] },
  { id: 'i', upper: 'I', lower: 'i', sounds: [
    { variant: 'short', speech: 'ih', mnemonic: 'ink' },
    { variant: 'long', speech: 'eye', mnemonic: 'kite' },
  ] },
  { id: 'j', upper: 'J', lower: 'j', sounds: [{ variant: 'plain', speech: 'juh', mnemonic: 'jam' }] },
  { id: 'k', upper: 'K', lower: 'k', sounds: [{ variant: 'plain', speech: 'kuh', mnemonic: 'kite' }] },
  { id: 'l', upper: 'L', lower: 'l', sounds: [{ variant: 'plain', speech: 'll', mnemonic: 'lion' }] },
  { id: 'm', upper: 'M', lower: 'm', sounds: [{ variant: 'plain', speech: 'mm', mnemonic: 'moon' }] },
  { id: 'n', upper: 'N', lower: 'n', sounds: [{ variant: 'plain', speech: 'nn', mnemonic: 'nest' }] },
  { id: 'o', upper: 'O', lower: 'o', sounds: [
    { variant: 'short', speech: 'ah', mnemonic: 'octopus' },
    { variant: 'long', speech: 'oh', mnemonic: 'boat' },
  ] },
  { id: 'p', upper: 'P', lower: 'p', sounds: [{ variant: 'plain', speech: 'puh', mnemonic: 'pig' }] },
  { id: 'q', upper: 'Q', lower: 'q', sounds: [{ variant: 'plain', speech: 'kwuh', mnemonic: 'queen' }] },
  { id: 'r', upper: 'R', lower: 'r', sounds: [{ variant: 'plain', speech: 'rr', mnemonic: 'rabbit' }] },
  { id: 's', upper: 'S', lower: 's', sounds: [{ variant: 'plain', speech: 'ss', mnemonic: 'sun' }] },
  { id: 't', upper: 'T', lower: 't', sounds: [{ variant: 'plain', speech: 'tuh', mnemonic: 'tiger' }] },
  { id: 'u', upper: 'U', lower: 'u', sounds: [
    { variant: 'short', speech: 'uh', mnemonic: 'umbrella' },
    { variant: 'long', speech: 'you', mnemonic: 'unicorn' },
  ] },
  { id: 'v', upper: 'V', lower: 'v', sounds: [{ variant: 'plain', speech: 'vv', mnemonic: 'van' }] },
  { id: 'w', upper: 'W', lower: 'w', sounds: [{ variant: 'plain', speech: 'wuh', mnemonic: 'watch' }] },
  { id: 'x', upper: 'X', lower: 'x', sounds: [{ variant: 'plain', speech: 'ks', mnemonic: 'box' }] },
  { id: 'y', upper: 'Y', lower: 'y', sounds: [{ variant: 'plain', speech: 'yuh', mnemonic: 'yoyo' }] },
  { id: 'z', upper: 'Z', lower: 'z', sounds: [{ variant: 'plain', speech: 'zz', mnemonic: 'zebra' }] },
]

export function getAlphabetById(id: string): AlphabetEntry {
  const entry = alphabetBank.find((a) => a.id === id)
  if (!entry) {
    throw new Error(`Unknown alphabet id: ${id}`)
  }
  return entry
}

export function pickRandomSound(entry: AlphabetEntry): PhonicsSound {
  return entry.sounds[Math.floor(Math.random() * entry.sounds.length)]
}

export function getSoundByVariant(entry: AlphabetEntry, variant: string): PhonicsSound {
  return entry.sounds.find((s) => s.variant === variant) ?? entry.sounds[0]
}

/** Same clipped-mora problem as hiraganaSpeechPhrase/katakanaSpeechPhrase, wrapped in the
 * sound's example word instead — and in English, since phonics is English-only content. */
export function phonicsSpeechPhrase(sound: PhonicsSound): string {
  return `${sound.speech}, ${sound.mnemonic}`
}
