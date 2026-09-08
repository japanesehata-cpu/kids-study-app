export type KatakanaRow =
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
  /** 拗音 (youon) — mirrors hiraganaBank.ts's own 'youon' row exactly, same 11 consonant
   * groups, one flat row (see questionGenerators/katakana.ts's ★4). */
  | 'youon'
  /** Extended katakana used specifically to spell foreign-loanword sounds that don't exist
   * in native Japanese (ファ=fa, ティ=ti, ウィ=wi, ...) — hiragana has no equivalent of this
   * row, since loanwords are always written in katakana (see questionGenerators/katakana.ts's
   * ★5, the level above youon). */
  | 'gairaigo'

export interface KatakanaEntry {
  id: string
  char: string
  row: KatakanaRow
  /** a common example word starting with this character, written in katakana as it actually
   * is in real use — loanwords (アイス) or the katakana-by-convention spelling of an animal
   * name (ウサギ) — mirrors hiraganaBank.ts's same mnemonic role for TTS/explanation text. */
  mnemonic?: string
  /** Short natural sentence using this kana in context — mirrors hiraganaBank.ts's own
   * field exactly (see its comment). Set only for the 46 seion entries; KanaTraceScreen's
   * review pass is the only reader. ヲ is essentially unused in real modern Japanese (を is
   * always written in hiragana even in otherwise-katakana text), so its sentence honestly
   * says so rather than forcing a fake "natural" usage; ン appears constantly in ordinary
   * loanwords (パン) so gets a real one. */
  exampleSentenceJa?: string
  exampleSentenceEn?: string
}

export const katakanaBank: KatakanaEntry[] = [
  {
    id: 'a',
    char: 'ア',
    row: 'a',
    mnemonic: 'アイス',
    exampleSentenceJa: 'アイスを たべました。',
    exampleSentenceEn: 'I ate ice cream.',
  },
  {
    id: 'i',
    char: 'イ',
    row: 'a',
    mnemonic: 'イルカ',
    exampleSentenceJa: 'イルカが およいでいます。',
    exampleSentenceEn: 'A dolphin is swimming.',
  },
  {
    id: 'u',
    char: 'ウ',
    row: 'a',
    mnemonic: 'ウサギ',
    exampleSentenceJa: 'ウサギが はねました。',
    exampleSentenceEn: 'The rabbit hopped.',
  },
  {
    id: 'e',
    char: 'エ',
    row: 'a',
    mnemonic: 'エビ',
    exampleSentenceJa: 'エビを たべました。',
    exampleSentenceEn: 'I ate shrimp.',
  },
  {
    id: 'o',
    char: 'オ',
    row: 'a',
    mnemonic: 'オレンジ',
    exampleSentenceJa: 'オレンジは あまいです。',
    exampleSentenceEn: 'The orange is sweet.',
  },
  {
    id: 'ka',
    char: 'カ',
    row: 'ka',
    mnemonic: 'カメラ',
    exampleSentenceJa: 'カメラで しゃしんを とりました。',
    exampleSentenceEn: 'I took a photo with the camera.',
  },
  {
    id: 'ki',
    char: 'キ',
    row: 'ka',
    mnemonic: 'キリン',
    exampleSentenceJa: 'キリンの くびは ながいです。',
    exampleSentenceEn: "The giraffe's neck is long.",
  },
  {
    id: 'ku',
    char: 'ク',
    row: 'ka',
    mnemonic: 'クマ',
    exampleSentenceJa: 'クマが もりに います。',
    exampleSentenceEn: 'A bear is in the forest.',
  },
  {
    id: 'ke',
    char: 'ケ',
    row: 'ka',
    mnemonic: 'ケーキ',
    exampleSentenceJa: 'ケーキを たべました。',
    exampleSentenceEn: 'I ate cake.',
  },
  {
    id: 'ko',
    char: 'コ',
    row: 'ka',
    mnemonic: 'コアラ',
    exampleSentenceJa: 'コアラが きに います。',
    exampleSentenceEn: 'The koala is in the tree.',
  },
  {
    id: 'sa',
    char: 'サ',
    row: 'sa',
    mnemonic: 'サル',
    exampleSentenceJa: 'サルが きに のぼりました。',
    exampleSentenceEn: 'The monkey climbed the tree.',
  },
  {
    id: 'shi',
    char: 'シ',
    row: 'sa',
    mnemonic: 'シマウマ',
    exampleSentenceJa: 'シマウマには しまが あります。',
    exampleSentenceEn: 'The zebra has stripes.',
  },
  {
    id: 'su',
    char: 'ス',
    row: 'sa',
    mnemonic: 'スイカ',
    exampleSentenceJa: 'スイカは あまいです。',
    exampleSentenceEn: 'Watermelon is sweet.',
  },
  {
    id: 'se',
    char: 'セ',
    row: 'sa',
    mnemonic: 'セミ',
    exampleSentenceJa: 'セミが ないています。',
    exampleSentenceEn: 'A cicada is buzzing.',
  },
  {
    id: 'so',
    char: 'ソ',
    row: 'sa',
    mnemonic: 'ソファ',
    exampleSentenceJa: 'ソファに すわりました。',
    exampleSentenceEn: 'I sat on the sofa.',
  },
  {
    id: 'ta',
    char: 'タ',
    row: 'ta',
    mnemonic: 'タコ',
    exampleSentenceJa: 'タコが うみに います。',
    exampleSentenceEn: 'There is an octopus in the sea.',
  },
  {
    id: 'chi',
    char: 'チ',
    row: 'ta',
    mnemonic: 'チーズ',
    exampleSentenceJa: 'チーズを たべました。',
    exampleSentenceEn: 'I ate cheese.',
  },
  {
    id: 'tsu',
    char: 'ツ',
    row: 'ta',
    mnemonic: 'ツバメ',
    exampleSentenceJa: 'ツバメが そらを とびます。',
    exampleSentenceEn: 'A swallow flies in the sky.',
  },
  {
    id: 'te',
    char: 'テ',
    row: 'ta',
    mnemonic: 'テレビ',
    exampleSentenceJa: 'テレビを みました。',
    exampleSentenceEn: 'I watched TV.',
  },
  {
    id: 'to',
    char: 'ト',
    row: 'ta',
    mnemonic: 'トマト',
    exampleSentenceJa: 'トマトを たべました。',
    exampleSentenceEn: 'I ate a tomato.',
  },
  {
    id: 'na',
    char: 'ナ',
    row: 'na',
    mnemonic: 'ナス',
    exampleSentenceJa: 'ナスを たべました。',
    exampleSentenceEn: 'I ate an eggplant.',
  },
  {
    id: 'ni',
    char: 'ニ',
    row: 'na',
    mnemonic: 'ニンジン',
    exampleSentenceJa: 'ニンジンを たべました。',
    exampleSentenceEn: 'I ate a carrot.',
  },
  {
    id: 'nu',
    char: 'ヌ',
    row: 'na',
    mnemonic: 'ヌイグルミ',
    exampleSentenceJa: 'ヌイグルミと あそびます。',
    exampleSentenceEn: 'I play with a stuffed toy.',
  },
  {
    id: 'ne',
    char: 'ネ',
    row: 'na',
    mnemonic: 'ネクタイ',
    exampleSentenceJa: 'ネクタイを しめました。',
    exampleSentenceEn: 'I put on a necktie.',
  },
  {
    id: 'no',
    char: 'ノ',
    row: 'na',
    mnemonic: 'ノート',
    exampleSentenceJa: 'ノートに かきました。',
    exampleSentenceEn: 'I wrote in my notebook.',
  },
  {
    id: 'ha',
    char: 'ハ',
    row: 'ha',
    mnemonic: 'ハチ',
    exampleSentenceJa: 'ハチが とんでいます。',
    exampleSentenceEn: 'A bee is flying.',
  },
  {
    id: 'hi',
    char: 'ヒ',
    row: 'ha',
    mnemonic: 'ヒヨコ',
    exampleSentenceJa: 'ヒヨコが ぴよぴよ ないています。',
    exampleSentenceEn: 'The chick is peeping.',
  },
  {
    id: 'fu',
    char: 'フ',
    row: 'ha',
    mnemonic: 'フクロウ',
    exampleSentenceJa: 'フクロウが きに とまりました。',
    exampleSentenceEn: 'The owl perched on the tree.',
  },
  {
    id: 'he',
    char: 'ヘ',
    row: 'ha',
    mnemonic: 'ヘビ',
    exampleSentenceJa: 'ヘビが にょろにょろ うごきます。',
    exampleSentenceEn: 'The snake slithers.',
  },
  {
    id: 'ho',
    char: 'ホ',
    row: 'ha',
    mnemonic: 'ホシ',
    exampleSentenceJa: 'ホシが きらきら ひかっています。',
    exampleSentenceEn: 'The stars twinkle brightly.',
  },
  {
    id: 'ma',
    char: 'マ',
    row: 'ma',
    mnemonic: 'マメ',
    exampleSentenceJa: 'マメを たべました。',
    exampleSentenceEn: 'I ate beans.',
  },
  {
    id: 'mi',
    char: 'ミ',
    row: 'ma',
    mnemonic: 'ミルク',
    exampleSentenceJa: 'ミルクを のみました。',
    exampleSentenceEn: 'I drank milk.',
  },
  {
    id: 'mu',
    char: 'ム',
    row: 'ma',
    mnemonic: 'ムシ',
    exampleSentenceJa: 'ムシが とんでいます。',
    exampleSentenceEn: 'A bug is flying.',
  },
  {
    id: 'me',
    char: 'メ',
    row: 'ma',
    mnemonic: 'メガネ',
    exampleSentenceJa: 'メガネを かけました。',
    exampleSentenceEn: 'I put on my glasses.',
  },
  {
    id: 'mo',
    char: 'モ',
    row: 'ma',
    mnemonic: 'モモ',
    exampleSentenceJa: 'モモを たべました。',
    exampleSentenceEn: 'I ate a peach.',
  },
  {
    id: 'ya',
    char: 'ヤ',
    row: 'ya',
    mnemonic: 'ヤギ',
    exampleSentenceJa: 'ヤギが くさを たべています。',
    exampleSentenceEn: 'The goat is eating grass.',
  },
  {
    id: 'yu',
    char: 'ユ',
    row: 'ya',
    mnemonic: 'ユキ',
    exampleSentenceJa: 'ユキが ふっています。',
    exampleSentenceEn: 'Snow is falling.',
  },
  {
    id: 'yo',
    char: 'ヨ',
    row: 'ya',
    mnemonic: 'ヨット',
    exampleSentenceJa: 'ヨットが うみを はしります。',
    exampleSentenceEn: 'The yacht sails across the sea.',
  },
  {
    id: 'ra',
    char: 'ラ',
    row: 'ra',
    mnemonic: 'ライオン',
    exampleSentenceJa: 'ライオンが ほえました。',
    exampleSentenceEn: 'The lion roared.',
  },
  {
    id: 'ri',
    char: 'リ',
    row: 'ra',
    mnemonic: 'リンゴ',
    exampleSentenceJa: 'リンゴを たべました。',
    exampleSentenceEn: 'I ate an apple.',
  },
  {
    id: 'ru',
    char: 'ル',
    row: 'ra',
    mnemonic: 'ルビー',
    exampleSentenceJa: 'ルビーは あかい いしです。',
    exampleSentenceEn: 'A ruby is a red stone.',
  },
  {
    id: 're',
    char: 'レ',
    row: 'ra',
    mnemonic: 'レモン',
    exampleSentenceJa: 'レモンは すっぱいです。',
    exampleSentenceEn: 'The lemon is sour.',
  },
  {
    id: 'ro',
    char: 'ロ',
    row: 'ra',
    mnemonic: 'ロボット',
    exampleSentenceJa: 'ロボットが うごきました。',
    exampleSentenceEn: 'The robot moved.',
  },
  {
    id: 'wa',
    char: 'ワ',
    row: 'wa',
    mnemonic: 'ワニ',
    exampleSentenceJa: 'ワニが みずに います。',
    exampleSentenceEn: 'The crocodile is in the water.',
  },
  {
    id: 'wo',
    char: 'ヲ',
    row: 'wa',
    exampleSentenceJa: 'ヲは あまり つかいません。',
    exampleSentenceEn: 'Wo is rarely used.',
  },
  {
    id: 'n',
    char: 'ン',
    row: 'wa',
    exampleSentenceJa: 'パンを たべます。',
    exampleSentenceEn: 'I eat bread.',
  },
  // 濁音・半濁音 (dakuten/handakuten) — added after the plain 46, same as they're taught
  // after the base gojuon chart in practice. Kept parallel to hiraganaBank.ts's picks where
  // a natural katakana equivalent exists (ぜ/ゼ=jelly, ぞ/ゾ=elephant, ば/バ=banana, ...).
  { id: 'ga', char: 'ガ', row: 'ga', mnemonic: 'ガム' },
  { id: 'gi', char: 'ギ', row: 'ga', mnemonic: 'ギター' },
  { id: 'gu', char: 'グ', row: 'ga', mnemonic: 'グミ' },
  { id: 'ge', char: 'ゲ', row: 'ga', mnemonic: 'ゲーム' },
  { id: 'go', char: 'ゴ', row: 'ga', mnemonic: 'ゴリラ' },
  { id: 'za', char: 'ザ', row: 'za', mnemonic: 'ザリガニ' },
  { id: 'ji', char: 'ジ', row: 'za', mnemonic: 'ジュース' },
  { id: 'zu', char: 'ズ', row: 'za', mnemonic: 'ズボン' },
  { id: 'ze', char: 'ゼ', row: 'za', mnemonic: 'ゼリー' },
  { id: 'zo', char: 'ゾ', row: 'za', mnemonic: 'ゾウ' },
  { id: 'da', char: 'ダ', row: 'da', mnemonic: 'ダチョウ' },
  // ヂ/ヅ have essentially no common katakana word starting with them — left without a
  // mnemonic, same as hiraganaBank.ts's ぢ/づ.
  { id: 'di', char: 'ヂ', row: 'da' },
  { id: 'du', char: 'ヅ', row: 'da' },
  { id: 'de', char: 'デ', row: 'da', mnemonic: 'デザート' },
  { id: 'do', char: 'ド', row: 'da', mnemonic: 'ドーナツ' },
  { id: 'ba', char: 'バ', row: 'ba', mnemonic: 'バナナ' },
  { id: 'bi', char: 'ビ', row: 'ba', mnemonic: 'ビスケット' },
  { id: 'bu', char: 'ブ', row: 'ba', mnemonic: 'ブタ' },
  { id: 'be', char: 'ベ', row: 'ba', mnemonic: 'ベル' },
  { id: 'bo', char: 'ボ', row: 'ba', mnemonic: 'ボール' },
  { id: 'pa', char: 'パ', row: 'pa', mnemonic: 'パン' },
  { id: 'pi', char: 'ピ', row: 'pa', mnemonic: 'ピアノ' },
  { id: 'pu', char: 'プ', row: 'pa', mnemonic: 'プリン' },
  { id: 'pe', char: 'ペ', row: 'pa', mnemonic: 'ペンギン' },
  { id: 'po', char: 'ポ', row: 'pa', mnemonic: 'ポケット' },
  // 拗音 (youon) — mirrors hiraganaBank.ts's own set exactly (see ★4). Several morae have no
  // common katakana loanword that actually starts with them — left without a mnemonic, same
  // as ヂ/ヅ above, rather than reaching for an obscure one. A few use a real, if less
  // universally common, loanword rather than hiragana's native onomatopoeia equivalent,
  // since katakana content should read as genuinely katakana in origin.
  { id: 'kya', char: 'キャ', row: 'youon', mnemonic: 'キャベツ' },
  { id: 'kyu', char: 'キュ', row: 'youon', mnemonic: 'キュート' },
  { id: 'kyo', char: 'キョ', row: 'youon', mnemonic: 'キョロキョロ' },
  { id: 'sha', char: 'シャ', row: 'youon', mnemonic: 'シャツ' },
  { id: 'shu', char: 'シュ', row: 'youon', mnemonic: 'シュート' },
  { id: 'sho', char: 'ショ', row: 'youon', mnemonic: 'ショートケーキ' },
  { id: 'cha', char: 'チャ', row: 'youon', mnemonic: 'チャイム' },
  { id: 'chu', char: 'チュ', row: 'youon', mnemonic: 'チューリップ' },
  { id: 'cho', char: 'チョ', row: 'youon', mnemonic: 'チョコレート' },
  { id: 'nya', char: 'ニャ', row: 'youon', mnemonic: 'ニャンコ' },
  { id: 'nyu', char: 'ニュ', row: 'youon', mnemonic: 'ニュース' },
  { id: 'nyo', char: 'ニョ', row: 'youon' },
  { id: 'hya', char: 'ヒャ', row: 'youon' },
  { id: 'hyu', char: 'ヒュ', row: 'youon', mnemonic: 'ヒュー' },
  { id: 'hyo', char: 'ヒョ', row: 'youon', mnemonic: 'ヒョウ' },
  { id: 'mya', char: 'ミャ', row: 'youon', mnemonic: 'ミャンマー' },
  { id: 'myu', char: 'ミュ', row: 'youon', mnemonic: 'ミュージック' },
  { id: 'myo', char: 'ミョ', row: 'youon' },
  { id: 'rya', char: 'リャ', row: 'youon' },
  { id: 'ryu', char: 'リュ', row: 'youon', mnemonic: 'リュック' },
  { id: 'ryo', char: 'リョ', row: 'youon' },
  { id: 'gya', char: 'ギャ', row: 'youon', mnemonic: 'ギャング' },
  { id: 'gyu', char: 'ギュ', row: 'youon' },
  { id: 'gyo', char: 'ギョ', row: 'youon', mnemonic: 'ギョーザ' },
  { id: 'ja', char: 'ジャ', row: 'youon', mnemonic: 'ジャム' },
  { id: 'ju', char: 'ジュ', row: 'youon', mnemonic: 'ジュース' },
  { id: 'jo', char: 'ジョ', row: 'youon', mnemonic: 'ジョギング' },
  { id: 'bya', char: 'ビャ', row: 'youon' },
  { id: 'byu', char: 'ビュ', row: 'youon', mnemonic: 'ビュッフェ' },
  { id: 'byo', char: 'ビョ', row: 'youon' },
  { id: 'pya', char: 'ピャ', row: 'youon' },
  { id: 'pyu', char: 'ピュ', row: 'youon', mnemonic: 'ピュア' },
  { id: 'pyo', char: 'ピョ', row: 'youon' },
  // 外来語表記 (gairaigo) — extended katakana for foreign sounds with no native equivalent
  // (see ★5). Every entry here has a genuinely common loanword, unlike several youon morae
  // above — this row exists specifically because these sounds show up constantly in real
  // katakana words, so a weak/obscure mnemonic would defeat the point.
  { id: 'fa', char: 'ファ', row: 'gairaigo', mnemonic: 'ファン' },
  { id: 'fi', char: 'フィ', row: 'gairaigo', mnemonic: 'フィギュア' },
  { id: 'fe', char: 'フェ', row: 'gairaigo', mnemonic: 'フェリー' },
  { id: 'fo', char: 'フォ', row: 'gairaigo', mnemonic: 'フォーク' },
  { id: 'ti', char: 'ティ', row: 'gairaigo', mnemonic: 'ティッシュ' },
  // 'di2'/'wo2': plain 'di'/'wo' are already taken by the base bank's ヂ/ヲ entries above —
  // this ディ/ウォ is a different, unrelated character that just happens to romanize the
  // same way.
  { id: 'di2', char: 'ディ', row: 'gairaigo', mnemonic: 'ディズニー' },
  { id: 'wi', char: 'ウィ', row: 'gairaigo', mnemonic: 'ウィンク' },
  { id: 'we', char: 'ウェ', row: 'gairaigo', mnemonic: 'ウェーブ' },
  { id: 'wo2', char: 'ウォ', row: 'gairaigo', mnemonic: 'ウォーター' },
  { id: 'che', char: 'チェ', row: 'gairaigo', mnemonic: 'チェリー' },
  { id: 'je', char: 'ジェ', row: 'gairaigo', mnemonic: 'ジェット' },
  { id: 'she', char: 'シェ', row: 'gairaigo', mnemonic: 'シェフ' },
]

export function getKatakanaById(id: string): KatakanaEntry {
  const entry = katakanaBank.find((k) => k.id === id)
  if (!entry) {
    throw new Error(`Unknown katakana id: ${id}`)
  }
  return entry
}

/** Speaking a lone mora often comes out clipped or unclear from TTS engines, which is exactly the
 * intonation problem this works around: wrap it in a short natural phrase ("a, like aisu") instead.
 * Unlike hiraganaSpeechPhrase, no particle-reading substitution is needed here — VOICEVOX/
 * OpenJTalk's は/へ/を-as-particle heuristic only applies to hiragana input; katakana text
 * (this bank's char is already katakana) is never parsed as a grammatical particle. */
export function katakanaSpeechPhrase(entry: KatakanaEntry): string {
  if (entry.mnemonic) return `${entry.char}、${entry.mnemonic}の　${entry.char}`
  return `${entry.char}、${entry.char}`
}
