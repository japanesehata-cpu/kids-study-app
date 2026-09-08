export interface CounterEntry {
  id: string
  /** Hiragana reading, shown on choice buttons — kids at this level read hiragana, not
   * kanji, so this (not `kanji`) is what the UI actually displays; see explanations.ts for
   * where `kanji` gets its one supplementary appearance. */
  kana: string
  kanji: string
  /** wordBank id (or a words-folder image id with no wordBank entry — family/house/
   * birthdaycake, generated specifically for this feature; see WordIcon, which only needs
   * the id string to resolve `images/words/{id}.png` and never requires a wordBank entry). */
  exampleWordId: string
  /** Full hand-authored prompt sentence per entry — same "one fixed sentence per item"
   * shape as colorSentenceBank/animalSentenceBank, not a template composed at runtime, so
   * every sentence can be proofread and cached as a single fixed VOICEVOX audio file
   * (see scripts/generate-tts-cache.mjs's counterBank loop). */
  promptJa: string
  promptEn: string
}

/** 助数詞 (Japanese counter word) bank — replaces the old "count these icons" counting
 * game entirely (see questionGenerators/counting.ts). No ★ levels: like englishSentence,
 * this teaches a fixed set of real vocabulary, not a difficulty ladder, so every entry is
 * drawn from one flat pool (see CATEGORY_MAX_LEVEL.counting).
 *
 * ~18 of the counters a Japanese child meets earliest and most often in daily life, each
 * anchored to one concrete example so the question is never ambiguous. Reuses existing
 * wordBank photos wherever one already fits (see colorSentenceBank.ts's "existing art
 * only" reasoning) — apple/leaf/car/pencil/plate/dog/bird/elephant/book/pea/cup/shoes/
 * shirt/ball/chair. Three examples had no suitable existing photo and got dedicated new
 * art: family (にん — a flat-illustration family portrait, not a photograph, since this
 * codebase deliberately avoids generating photorealistic human faces/bodies — see
 * EXTRA_NEGATIVE's "place"/"bodyPart" entries in generate-word-images-local.py), house
 * (けん), and birthdaycake (さい, lit candles standing in for "age" since a number alone
 * isn't a countable object). つぶ deliberately uses `pea` rather than `grape` — a bunch of
 * grapes photographs as one cluster, not individually countable grains, which is exactly
 * what つぶ needs to show. */
export const counterBank: CounterEntry[] = [
  {
    id: 'nin',
    kana: 'にん',
    kanji: '人',
    // A generic faceless silhouette, not a photo — see
    // scripts/generate-person-icon.py's comment for why. Repeated N times (see
    // CountingQuestionView) so it doubles as the actual counted group in the picture,
    // unlike the old single "family of 4" illustration this replaced (that photo showed
    // a fixed scene, not a group that could be shown at any count).
    exampleWordId: 'person',
    promptJa: 'ひとを かぞえる ときは、なんと いうかな？',
    promptEn: 'What counter word do you use to count people?',
  },
  {
    id: 'ko',
    kana: 'こ',
    kanji: '個',
    exampleWordId: 'apple',
    promptJa: 'りんごを かぞえる ときは、なんと いうかな？',
    promptEn: 'What counter word do you use to count an apple?',
  },
  {
    id: 'mai',
    kana: 'まい',
    kanji: '枚',
    exampleWordId: 'leaf',
    promptJa: 'はっぱを かぞえる ときは、なんと いうかな？',
    promptEn: 'What counter word do you use to count a leaf?',
  },
  {
    id: 'dai',
    kana: 'だい',
    kanji: '台',
    exampleWordId: 'car',
    promptJa: 'くるまを かぞえる ときは、なんと いうかな？',
    promptEn: 'What counter word do you use to count a car?',
  },
  {
    id: 'hon',
    kana: 'ほん',
    kanji: '本',
    exampleWordId: 'pencil',
    promptJa: 'えんぴつを かぞえる ときは、なんと いうかな？',
    promptEn: 'What counter word do you use to count a pencil?',
  },
  {
    id: 'sara',
    kana: 'さら',
    kanji: '皿',
    exampleWordId: 'plate',
    promptJa: 'おさらを かぞえる ときは、なんと いうかな？',
    promptEn: 'What counter word do you use to count a plate?',
  },
  {
    id: 'hiki',
    kana: 'ひき',
    kanji: '匹',
    exampleWordId: 'dog',
    promptJa: 'いぬを かぞえる ときは、なんと いうかな？',
    promptEn: 'What counter word do you use to count a dog?',
  },
  {
    id: 'wa',
    kana: 'わ',
    kanji: '羽',
    exampleWordId: 'bird',
    promptJa: 'とりを かぞえる ときは、なんと いうかな？',
    promptEn: 'What counter word do you use to count a bird?',
  },
  {
    id: 'tou',
    kana: 'とう',
    kanji: '頭',
    exampleWordId: 'elephant',
    promptJa: 'ぞうを かぞえる ときは、なんと いうかな？',
    promptEn: 'What counter word do you use to count an elephant?',
  },
  {
    id: 'satsu',
    kana: 'さつ',
    kanji: '冊',
    exampleWordId: 'book',
    promptJa: 'ほんを かぞえる ときは、なんと いうかな？',
    promptEn: 'What counter word do you use to count a book?',
  },
  {
    id: 'tsubu',
    kana: 'つぶ',
    kanji: '粒',
    exampleWordId: 'pea',
    promptJa: 'まめを かぞえる ときは、なんと いうかな？',
    promptEn: 'What counter word do you use to count a pea?',
  },
  {
    id: 'ken',
    kana: 'けん',
    kanji: '軒',
    exampleWordId: 'house',
    promptJa: 'いえを かぞえる ときは、なんと いうかな？',
    promptEn: 'What counter word do you use to count a house?',
  },
  {
    id: 'sai',
    kana: 'さい',
    kanji: '歳',
    exampleWordId: 'birthdaycake',
    promptJa: 'たんじょうびで としを かぞえる ときは、なんと いうかな？',
    promptEn: "What counter word do you use to count someone's age?",
  },
  {
    id: 'hai',
    kana: 'はい',
    kanji: '杯',
    exampleWordId: 'cup',
    promptJa: 'コップに はいった のみものを かぞえる ときは、なんと いうかな？',
    promptEn: 'What counter word do you use to count a cup of a drink?',
  },
  {
    id: 'soku',
    kana: 'そく',
    kanji: '足',
    exampleWordId: 'shoes',
    promptJa: 'くつを かぞえる ときは、なんと いうかな？',
    promptEn: 'What counter word do you use to count shoes?',
  },
  {
    id: 'chaku',
    kana: 'ちゃく',
    kanji: '着',
    exampleWordId: 'shirt',
    promptJa: 'ふくを かぞえる ときは、なんと いうかな？',
    promptEn: 'What counter word do you use to count a piece of clothing?',
  },
  {
    id: 'tsu',
    kana: 'つ',
    kanji: 'つ',
    exampleWordId: 'ball',
    promptJa: 'ボールを かぞえる ときは、なんと いうかな？',
    promptEn: 'What counter word do you use to count a ball?',
  },
  {
    id: 'kyaku',
    kana: 'きゃく',
    kanji: '脚',
    exampleWordId: 'chair',
    promptJa: 'いすを かぞえる ときは、なんと いうかな？',
    promptEn: 'What counter word do you use to count a chair?',
  },
]

export function getCounterById(id: string): CounterEntry {
  const entry = counterBank.find((c) => c.id === id)
  if (!entry) {
    throw new Error(`Unknown counter id: ${id}`)
  }
  return entry
}
