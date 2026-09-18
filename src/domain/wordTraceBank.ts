/** The 26 words traced in えいご「たんご」 practice (see WordTraceScreen) — one per starting
 * letter, A-Z. Reuses alphabetBank's own A-for-Apple-style mnemonic words (already taught
 * during アルファベット なぞる's review pass) so the association carries straight over, with
 * one deliberate swap: Q uses "quail" instead of alphabetBank's "Queen" — "queen" has no
 * wordBank entry/image, while "quail" already has both, so no new asset generation is
 * needed for any of the 26 words.
 *
 * Each id must resolve via wordBank.ts's getWordById, and every letter of that word's
 * `word` must have stroke data in alphabetStrokePaths (see the consistency test in
 * __tests__/wordTraceBank.test.ts) — there is no per-word data beyond the id itself,
 * WordTraceScreen looks everything else up from wordBank/alphabetStrokes directly. */
export const wordTraceBank: string[] = [
  'apple',
  'ball',
  'cat',
  'dog',
  'elephant',
  'fish',
  'grape',
  'hat',
  'ice',
  'juice',
  'kite',
  'lion',
  'monkey',
  'nose',
  'orange',
  'pig',
  'quail',
  'rabbit',
  'sun',
  'tiger',
  'umbrella',
  'violin',
  'watermelon',
  'xylophone',
  'yak',
  'zebra',
]
