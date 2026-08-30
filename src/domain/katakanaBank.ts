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
}

export const katakanaBank: KatakanaEntry[] = [
  { id: 'a', char: 'ア', row: 'a', mnemonic: 'アイス' },
  { id: 'i', char: 'イ', row: 'a', mnemonic: 'イルカ' },
  { id: 'u', char: 'ウ', row: 'a', mnemonic: 'ウサギ' },
  { id: 'e', char: 'エ', row: 'a', mnemonic: 'エビ' },
  { id: 'o', char: 'オ', row: 'a', mnemonic: 'オレンジ' },
  { id: 'ka', char: 'カ', row: 'ka', mnemonic: 'カメラ' },
  { id: 'ki', char: 'キ', row: 'ka', mnemonic: 'キリン' },
  { id: 'ku', char: 'ク', row: 'ka', mnemonic: 'クマ' },
  { id: 'ke', char: 'ケ', row: 'ka', mnemonic: 'ケーキ' },
  { id: 'ko', char: 'コ', row: 'ka', mnemonic: 'コアラ' },
  { id: 'sa', char: 'サ', row: 'sa', mnemonic: 'サル' },
  { id: 'shi', char: 'シ', row: 'sa', mnemonic: 'シマウマ' },
  { id: 'su', char: 'ス', row: 'sa', mnemonic: 'スイカ' },
  { id: 'se', char: 'セ', row: 'sa', mnemonic: 'セミ' },
  { id: 'so', char: 'ソ', row: 'sa', mnemonic: 'ソファ' },
  { id: 'ta', char: 'タ', row: 'ta', mnemonic: 'タコ' },
  { id: 'chi', char: 'チ', row: 'ta', mnemonic: 'チーズ' },
  { id: 'tsu', char: 'ツ', row: 'ta', mnemonic: 'ツバメ' },
  { id: 'te', char: 'テ', row: 'ta', mnemonic: 'テレビ' },
  { id: 'to', char: 'ト', row: 'ta', mnemonic: 'トマト' },
  { id: 'na', char: 'ナ', row: 'na', mnemonic: 'ナス' },
  { id: 'ni', char: 'ニ', row: 'na', mnemonic: 'ニンジン' },
  { id: 'nu', char: 'ヌ', row: 'na', mnemonic: 'ヌイグルミ' },
  { id: 'ne', char: 'ネ', row: 'na', mnemonic: 'ネクタイ' },
  { id: 'no', char: 'ノ', row: 'na', mnemonic: 'ノート' },
  { id: 'ha', char: 'ハ', row: 'ha', mnemonic: 'ハチ' },
  { id: 'hi', char: 'ヒ', row: 'ha', mnemonic: 'ヒヨコ' },
  { id: 'fu', char: 'フ', row: 'ha', mnemonic: 'フクロウ' },
  { id: 'he', char: 'ヘ', row: 'ha', mnemonic: 'ヘビ' },
  { id: 'ho', char: 'ホ', row: 'ha', mnemonic: 'ホシ' },
  { id: 'ma', char: 'マ', row: 'ma', mnemonic: 'マメ' },
  { id: 'mi', char: 'ミ', row: 'ma', mnemonic: 'ミルク' },
  { id: 'mu', char: 'ム', row: 'ma', mnemonic: 'ムシ' },
  { id: 'me', char: 'メ', row: 'ma', mnemonic: 'メガネ' },
  { id: 'mo', char: 'モ', row: 'ma', mnemonic: 'モモ' },
  { id: 'ya', char: 'ヤ', row: 'ya', mnemonic: 'ヤギ' },
  { id: 'yu', char: 'ユ', row: 'ya', mnemonic: 'ユキ' },
  { id: 'yo', char: 'ヨ', row: 'ya', mnemonic: 'ヨット' },
  { id: 'ra', char: 'ラ', row: 'ra', mnemonic: 'ライオン' },
  { id: 'ri', char: 'リ', row: 'ra', mnemonic: 'リンゴ' },
  { id: 'ru', char: 'ル', row: 'ra', mnemonic: 'ルビー' },
  { id: 're', char: 'レ', row: 'ra', mnemonic: 'レモン' },
  { id: 'ro', char: 'ロ', row: 'ra', mnemonic: 'ロボット' },
  { id: 'wa', char: 'ワ', row: 'wa', mnemonic: 'ワニ' },
  { id: 'wo', char: 'ヲ', row: 'wa' },
  { id: 'n', char: 'ン', row: 'wa' },
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
