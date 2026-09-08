export type HiraganaRow =
  | 'a'
  | 'ka'
  | 'sa'
  | 'ta'
  | 'na'
  | 'ha'
  | 'ma'
  | 'ya'
  | 'ra'
  | 'wa'
  | 'ga'
  | 'za'
  | 'da'
  | 'ba'
  | 'pa'
  /** 拗音 (youon) — a consonant kana + small ゃ/ゅ/ょ read as one mora (きゃ, しゅ, ちょ, ...).
   * One flat row for all 11 consonant groups (rather than a group per consonant, like the
   * base rows) since they're taught and practiced together as a single milestone — see
   * questionGenerators/hiragana.ts's ★4. */
  | 'youon'

export interface HiraganaEntry {
  id: string
  char: string
  row: HiraganaRow
  /** a common example word starting with this character (the standard あいうえお表 mnemonic
   * style) — TTS engines pronounce an isolated single mora poorly, so speech always wraps the
   * character in this short phrase for clearer, more natural-sounding intonation. */
  mnemonic?: string
  /** Short natural sentence using this kana in context, shown (and read aloud) on
   * KanaTraceScreen's review pass — the same role kanjiBank.ts's exampleSentenceJa plays
   * for かんじ's なぞる review pass, reinforcing "you can spot this in real use," not just
   * trace its shape. Set only for the 46 清音 (seion) entries — see KanaTraceScreen's deck
   * filter, which is the only thing that reads this field. を/ん have no mnemonic (neither
   * starts a real word), so their sentences use the kana mid-word/as a particle instead of
   * word-initial — still a completely natural, common sentence either way. */
  exampleSentenceJa?: string
  exampleSentenceEn?: string
}

export const hiraganaBank: HiraganaEntry[] = [
  {
    id: 'a',
    char: 'あ',
    row: 'a',
    mnemonic: 'あり',
    exampleSentenceJa: 'ありが あるいています。',
    exampleSentenceEn: 'An ant is walking.',
  },
  {
    id: 'i',
    char: 'い',
    row: 'a',
    mnemonic: 'いぬ',
    exampleSentenceJa: 'いぬが しっぽを ふりました。',
    exampleSentenceEn: 'The dog wagged its tail.',
  },
  {
    id: 'u',
    char: 'う',
    row: 'a',
    mnemonic: 'うさぎ',
    exampleSentenceJa: 'うさぎが ぴょんぴょん はねます。',
    exampleSentenceEn: 'The rabbit hops.',
  },
  {
    id: 'e',
    char: 'え',
    row: 'a',
    mnemonic: 'えんぴつ',
    exampleSentenceJa: 'えんぴつで じを かきます。',
    exampleSentenceEn: 'I write letters with a pencil.',
  },
  {
    id: 'o',
    char: 'お',
    row: 'a',
    mnemonic: 'おかし',
    exampleSentenceJa: 'おかしを たべました。',
    exampleSentenceEn: 'I ate a snack.',
  },
  {
    id: 'ka',
    char: 'か',
    row: 'ka',
    mnemonic: 'かめ',
    exampleSentenceJa: 'かめが ゆっくり あるきます。',
    exampleSentenceEn: 'The turtle walks slowly.',
  },
  {
    id: 'ki',
    char: 'き',
    row: 'ka',
    mnemonic: 'きりん',
    exampleSentenceJa: 'きりんの くびは ながいです。',
    exampleSentenceEn: "The giraffe's neck is long.",
  },
  {
    id: 'ku',
    char: 'く',
    row: 'ka',
    mnemonic: 'くつ',
    exampleSentenceJa: 'くつを はきました。',
    exampleSentenceEn: 'I put on my shoes.',
  },
  {
    id: 'ke',
    char: 'け',
    row: 'ka',
    mnemonic: 'けむし',
    exampleSentenceJa: 'けむしが はっぱを たべています。',
    exampleSentenceEn: 'A caterpillar is eating a leaf.',
  },
  {
    id: 'ko',
    char: 'こ',
    row: 'ka',
    mnemonic: 'こま',
    exampleSentenceJa: 'こまが くるくる まわります。',
    exampleSentenceEn: 'The spinning top whirls around.',
  },
  {
    id: 'sa',
    char: 'さ',
    row: 'sa',
    mnemonic: 'さかな',
    exampleSentenceJa: 'さかなが およいでいます。',
    exampleSentenceEn: 'A fish is swimming.',
  },
  {
    id: 'shi',
    char: 'し',
    row: 'sa',
    mnemonic: 'しか',
    exampleSentenceJa: 'しかの つのは りっぱです。',
    exampleSentenceEn: "The deer's antlers are splendid.",
  },
  {
    id: 'su',
    char: 'す',
    row: 'sa',
    mnemonic: 'すいか',
    exampleSentenceJa: 'すいかは あまくて おいしいです。',
    exampleSentenceEn: 'Watermelon is sweet and delicious.',
  },
  {
    id: 'se',
    char: 'せ',
    row: 'sa',
    mnemonic: 'せみ',
    exampleSentenceJa: 'せみが みんみん ないています。',
    exampleSentenceEn: 'A cicada is buzzing.',
  },
  {
    id: 'so',
    char: 'そ',
    row: 'sa',
    mnemonic: 'そら',
    exampleSentenceJa: 'そらが まっさおです。',
    exampleSentenceEn: 'The sky is deep blue.',
  },
  {
    id: 'ta',
    char: 'た',
    row: 'ta',
    mnemonic: 'たいこ',
    exampleSentenceJa: 'たいこを たたきました。',
    exampleSentenceEn: 'I beat the drum.',
  },
  {
    id: 'chi',
    char: 'ち',
    row: 'ta',
    mnemonic: 'ちょうちょ',
    exampleSentenceJa: 'ちょうちょが とんでいます。',
    exampleSentenceEn: 'A butterfly is flying.',
  },
  {
    id: 'tsu',
    char: 'つ',
    row: 'ta',
    mnemonic: 'つき',
    exampleSentenceJa: 'つきが きれいに ひかっています。',
    exampleSentenceEn: 'The moon is shining beautifully.',
  },
  {
    id: 'te',
    char: 'て',
    row: 'ta',
    mnemonic: 'てがみ',
    exampleSentenceJa: 'てがみを かきました。',
    exampleSentenceEn: 'I wrote a letter.',
  },
  {
    id: 'to',
    char: 'と',
    row: 'ta',
    mnemonic: 'とけい',
    exampleSentenceJa: 'とけいを みました。',
    exampleSentenceEn: 'I looked at the clock.',
  },
  {
    id: 'na',
    char: 'な',
    row: 'na',
    mnemonic: 'なす',
    exampleSentenceJa: 'なすを たべました。',
    exampleSentenceEn: 'I ate an eggplant.',
  },
  {
    id: 'ni',
    char: 'に',
    row: 'na',
    mnemonic: 'にじ',
    exampleSentenceJa: 'にじが そらに でました。',
    exampleSentenceEn: 'A rainbow came out in the sky.',
  },
  {
    id: 'nu',
    char: 'ぬ',
    row: 'na',
    mnemonic: 'ぬいぐるみ',
    exampleSentenceJa: 'ぬいぐるみと あそびます。',
    exampleSentenceEn: 'I play with my stuffed toy.',
  },
  {
    id: 'ne',
    char: 'ね',
    row: 'na',
    mnemonic: 'ねこ',
    exampleSentenceJa: 'ねこが にゃあと なきました。',
    exampleSentenceEn: 'The cat meowed.',
  },
  {
    id: 'no',
    char: 'の',
    row: 'na',
    mnemonic: 'のり',
    exampleSentenceJa: 'のりを ごはんに まきます。',
    exampleSentenceEn: 'I wrap seaweed around rice.',
  },
  {
    id: 'ha',
    char: 'は',
    row: 'ha',
    mnemonic: 'はな',
    exampleSentenceJa: 'はなが きれいに さきました。',
    exampleSentenceEn: 'The flower bloomed beautifully.',
  },
  {
    id: 'hi',
    char: 'ひ',
    row: 'ha',
    mnemonic: 'ひこうき',
    exampleSentenceJa: 'ひこうきが そらを とびます。',
    exampleSentenceEn: 'An airplane flies in the sky.',
  },
  {
    id: 'fu',
    char: 'ふ',
    row: 'ha',
    mnemonic: 'ふうせん',
    exampleSentenceJa: 'ふうせんが とんでいきました。',
    exampleSentenceEn: 'The balloon flew away.',
  },
  {
    id: 'he',
    char: 'へ',
    row: 'ha',
    mnemonic: 'へび',
    exampleSentenceJa: 'へびが にょろにょろ うごきます。',
    exampleSentenceEn: 'The snake slithers.',
  },
  {
    id: 'ho',
    char: 'ほ',
    row: 'ha',
    mnemonic: 'ほし',
    exampleSentenceJa: 'ほしが きらきら ひかっています。',
    exampleSentenceEn: 'The stars twinkle brightly.',
  },
  {
    id: 'ma',
    char: 'ま',
    row: 'ma',
    mnemonic: 'まめ',
    exampleSentenceJa: 'まめを たべました。',
    exampleSentenceEn: 'I ate some beans.',
  },
  {
    id: 'mi',
    char: 'み',
    row: 'ma',
    mnemonic: 'みかん',
    exampleSentenceJa: 'みかんの かわを むきました。',
    exampleSentenceEn: 'I peeled a mandarin orange.',
  },
  {
    id: 'mu',
    char: 'む',
    row: 'ma',
    mnemonic: 'むし',
    exampleSentenceJa: 'むしが とんでいます。',
    exampleSentenceEn: 'A bug is flying.',
  },
  {
    id: 'me',
    char: 'め',
    row: 'ma',
    mnemonic: 'めがね',
    exampleSentenceJa: 'めがねを かけました。',
    exampleSentenceEn: 'I put on my glasses.',
  },
  {
    id: 'mo',
    char: 'も',
    row: 'ma',
    mnemonic: 'もも',
    exampleSentenceJa: 'ももを たべました。',
    exampleSentenceEn: 'I ate a peach.',
  },
  {
    id: 'ya',
    char: 'や',
    row: 'ya',
    mnemonic: 'やま',
    exampleSentenceJa: 'やまに のぼりました。',
    exampleSentenceEn: 'I climbed the mountain.',
  },
  {
    id: 'yu',
    char: 'ゆ',
    row: 'ya',
    mnemonic: 'ゆき',
    exampleSentenceJa: 'ゆきが ふっています。',
    exampleSentenceEn: 'Snow is falling.',
  },
  {
    id: 'yo',
    char: 'よ',
    row: 'ya',
    mnemonic: 'よる',
    exampleSentenceJa: 'よるに ほしが みえます。',
    exampleSentenceEn: 'You can see stars at night.',
  },
  {
    id: 'ra',
    char: 'ら',
    row: 'ra',
    mnemonic: 'らいおん',
    exampleSentenceJa: 'らいおんが ほえました。',
    exampleSentenceEn: 'The lion roared.',
  },
  {
    id: 'ri',
    char: 'り',
    row: 'ra',
    mnemonic: 'りんご',
    exampleSentenceJa: 'りんごを たべました。',
    exampleSentenceEn: 'I ate an apple.',
  },
  {
    id: 'ru',
    char: 'る',
    row: 'ra',
    mnemonic: 'るすばん',
    exampleSentenceJa: 'るすばんを しました。',
    exampleSentenceEn: 'I watched the house while everyone was out.',
  },
  {
    id: 're',
    char: 'れ',
    row: 'ra',
    mnemonic: 'れいぞうこ',
    exampleSentenceJa: 'れいぞうこに ぎゅうにゅうが あります。',
    exampleSentenceEn: 'There is milk in the refrigerator.',
  },
  {
    id: 'ro',
    char: 'ろ',
    row: 'ra',
    mnemonic: 'ろうそく',
    exampleSentenceJa: 'ろうそくの ひが ゆれています。',
    exampleSentenceEn: "The candle's flame is flickering.",
  },
  {
    id: 'wa',
    char: 'わ',
    row: 'wa',
    mnemonic: 'わに',
    exampleSentenceJa: 'わには おおきい くちを あけました。',
    exampleSentenceEn: 'The crocodile opened its big mouth.',
  },
  {
    id: 'wo',
    char: 'を',
    row: 'wa',
    exampleSentenceJa: 'ほんを よみます。',
    exampleSentenceEn: 'I read a book.',
  },
  {
    id: 'n',
    char: 'ん',
    row: 'wa',
    exampleSentenceJa: 'パンを たべます。',
    exampleSentenceEn: 'I eat bread.',
  },
  // 濁音・半濁音 (dakuten/handakuten) — added after the plain 46, same as they're taught
  // after the base gojuon chart in practice.
  { id: 'ga', char: 'が', row: 'ga', mnemonic: 'がっこう' },
  { id: 'gi', char: 'ぎ', row: 'ga', mnemonic: 'ぎゅうにゅう' },
  { id: 'gu', char: 'ぐ', row: 'ga', mnemonic: 'ぐるぐる' },
  { id: 'ge', char: 'げ', row: 'ga', mnemonic: 'げんき' },
  { id: 'go', char: 'ご', row: 'ga', mnemonic: 'ごはん' },
  { id: 'za', char: 'ざ', row: 'za', mnemonic: 'ざる' },
  { id: 'ji', char: 'じ', row: 'za', mnemonic: 'じてんしゃ' },
  { id: 'zu', char: 'ず', row: 'za', mnemonic: 'ずかん' },
  { id: 'ze', char: 'ぜ', row: 'za', mnemonic: 'ぜりー' },
  { id: 'zo', char: 'ぞ', row: 'za', mnemonic: 'ぞう' },
  { id: 'da', char: 'だ', row: 'da', mnemonic: 'だいこん' },
  // ぢ/づ have essentially no common word that actually starts with them in modern
  // Japanese (both almost always appear mid-word, e.g. はなぢ、ちぢむ) — left without a
  // mnemonic, same as を/ん above, rather than reaching for an obscure one.
  { id: 'di', char: 'ぢ', row: 'da' },
  { id: 'du', char: 'づ', row: 'da' },
  { id: 'de', char: 'で', row: 'da', mnemonic: 'でんしゃ' },
  { id: 'do', char: 'ど', row: 'da', mnemonic: 'どうぶつ' },
  { id: 'ba', char: 'ば', row: 'ba', mnemonic: 'ばなな' },
  { id: 'bi', char: 'び', row: 'ba', mnemonic: 'びっくり' },
  { id: 'bu', char: 'ぶ', row: 'ba', mnemonic: 'ぶた' },
  { id: 'be', char: 'べ', row: 'ba', mnemonic: 'べんとう' },
  { id: 'bo', char: 'ぼ', row: 'ba', mnemonic: 'ぼうし' },
  { id: 'pa', char: 'ぱ', row: 'pa', mnemonic: 'ぱん' },
  { id: 'pi', char: 'ぴ', row: 'pa', mnemonic: 'ぴあの' },
  { id: 'pu', char: 'ぷ', row: 'pa', mnemonic: 'ぷりん' },
  { id: 'pe', char: 'ぺ', row: 'pa', mnemonic: 'ぺんぎん' },
  { id: 'po', char: 'ぽ', row: 'pa', mnemonic: 'ぽけっと' },
  // 拗音 (youon) — taught as their own milestone after the base chart + dakuten/handakuten
  // (see questionGenerators/hiragana.ts's ★4). A few morae (myu, rya, bya, pya) have no
  // common Japanese word that actually starts with them — left without a mnemonic, same
  // as を/ん/ぢ/づ above, rather than reaching for an obscure one.
  { id: 'kya', char: 'きゃ', row: 'youon', mnemonic: 'きゃべつ' },
  { id: 'kyu', char: 'きゅ', row: 'youon', mnemonic: 'きゅうり' },
  { id: 'kyo', char: 'きょ', row: 'youon', mnemonic: 'きょうりゅう' },
  { id: 'sha', char: 'しゃ', row: 'youon', mnemonic: 'しゃしん' },
  { id: 'shu', char: 'しゅ', row: 'youon', mnemonic: 'しゅくだい' },
  { id: 'sho', char: 'しょ', row: 'youon', mnemonic: 'しょうぼうしゃ' },
  { id: 'cha', char: 'ちゃ', row: 'youon', mnemonic: 'ちゃいろ' },
  { id: 'chu', char: 'ちゅ', row: 'youon', mnemonic: 'ちゅうしゃ' },
  { id: 'cho', char: 'ちょ', row: 'youon', mnemonic: 'ちょきん' },
  { id: 'nya', char: 'にゃ', row: 'youon', mnemonic: 'にゃんこ' },
  { id: 'nyu', char: 'にゅ', row: 'youon', mnemonic: 'にゅうがく' },
  { id: 'nyo', char: 'にょ', row: 'youon', mnemonic: 'にょろにょろ' },
  { id: 'hya', char: 'ひゃ', row: 'youon', mnemonic: 'ひゃくえん' },
  { id: 'hyu', char: 'ひゅ', row: 'youon', mnemonic: 'ひゅうひゅう' },
  { id: 'hyo', char: 'ひょ', row: 'youon', mnemonic: 'ひょう' },
  { id: 'mya', char: 'みゃ', row: 'youon', mnemonic: 'みゃく' },
  { id: 'myu', char: 'みゅ', row: 'youon' },
  { id: 'myo', char: 'みょ', row: 'youon', mnemonic: 'みょうじ' },
  { id: 'rya', char: 'りゃ', row: 'youon' },
  { id: 'ryu', char: 'りゅ', row: 'youon', mnemonic: 'りゅう' },
  { id: 'ryo', char: 'りょ', row: 'youon', mnemonic: 'りょこう' },
  { id: 'gya', char: 'ぎゃ', row: 'youon', mnemonic: 'ぎゃく' },
  { id: 'gyu', char: 'ぎゅ', row: 'youon', mnemonic: 'ぎゅっと' },
  { id: 'gyo', char: 'ぎょ', row: 'youon', mnemonic: 'ぎょうざ' },
  { id: 'ja', char: 'じゃ', row: 'youon', mnemonic: 'じゃがいも' },
  { id: 'ju', char: 'じゅ', row: 'youon', mnemonic: 'じゅう' },
  { id: 'jo', char: 'じょ', row: 'youon', mnemonic: 'じょうぎ' },
  { id: 'bya', char: 'びゃ', row: 'youon' },
  { id: 'byu', char: 'びゅ', row: 'youon', mnemonic: 'びゅーん' },
  { id: 'byo', char: 'びょ', row: 'youon', mnemonic: 'びょういん' },
  { id: 'pya', char: 'ぴゃ', row: 'youon' },
  { id: 'pyu', char: 'ぴゅ', row: 'youon', mnemonic: 'ぴゅう' },
  { id: 'pyo', char: 'ぴょ', row: 'youon', mnemonic: 'ぴょんぴょん' },
]

export function getHiraganaById(id: string): HiraganaEntry {
  const entry = hiraganaBank.find((h) => h.id === id)
  if (!entry) {
    throw new Error(`Unknown hiragana id: ${id}`)
  }
  return entry
}

// VOICEVOX/OpenJTalk's reading estimation defaults a bare は/へ/を to its grammatical-particle
// reading (wa/e/o) instead of the mora's own reading (ha/he/wo) whenever there's no
// surrounding word to disambiguate it — an isolated single character is exactly that
// ambiguous case (e.g. へ alone came out as "え"). Katakana isn't subject to that particle
// heuristic (the dictionary's function-word entries are hiragana-only), so substitute it just
// for the spoken text; the on-screen glyph (entry.char) is left untouched.
const PARTICLE_READING_FIX: Partial<Record<string, string>> = { は: 'ハ', へ: 'ヘ', を: 'ヲ' }

function speechSafeChar(char: string): string {
  return PARTICLE_READING_FIX[char] ?? char
}

/** Speaking a lone mora often comes out clipped or unclear from TTS engines, which is exactly the
 * intonation problem this works around: wrap it in a short natural phrase ("a, like ari") instead. */
export function hiraganaSpeechPhrase(entry: HiraganaEntry): string {
  const spoken = speechSafeChar(entry.char)
  if (entry.mnemonic) return `${spoken}、${entry.mnemonic}の　${spoken}`
  return `${spoken}、${spoken}`
}
