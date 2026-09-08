/** 8 thematic groups covering all 80 grade-1 kyōiku kanji (文部科学省 学年別漢字配当表) —
 * grouped by meaning/topic rather than stroke count, so unlocking one row teaches a
 * coherent little vocabulary set (numbers, then days-of-week/nature, ...) instead of an
 * arbitrary slice. Two theme pairs are merged onto a shared ★level (see LEVEL_ROWS in
 * questionGenerators/kanji.ts) to fit the existing 6-level ceiling every other multi-level
 * category shares, rather than widening Level again for a 7th/8th step. */
export type KanjiRow =
  | 'numbers'
  | 'nature'
  | 'people'
  | 'body'
  | 'colorSize'
  | 'animals'
  | 'places'
  | 'study'

export interface KanjiEntry {
  id: string
  char: string
  /** The one reading this app teaches for this kanji — most grade-1 kanji have several
   * (on'yomi/kun'yomi), so this is deliberately the single most common textbook reading
   * for THIS character specifically, not a fixed on'yomi-only or kun'yomi-only rule. */
  reading: string
  row: KanjiRow
  /** A common word starting with `reading`, used to wrap the bare reading in natural
   * speech (see kanjiSpeechPhrase) — the same fix hiraganaBank.ts uses for lone morae
   * sounding clipped in TTS, but doing double duty here: several grade-1 kanji share an
   * identical reading (九/休 both きゅう, 先/千 both せん, 生/正 both せい), so the
   * mnemonic word is what actually keeps the *spoken* prompt unambiguous, not just
   * pronunciation quality. */
  mnemonic: string
}

export const kanjiBank: KanjiEntry[] = [
  // numbers
  { id: 'k1', char: '一', reading: 'いち', row: 'numbers', mnemonic: 'いちご' },
  { id: 'k2', char: '二', reading: 'に', row: 'numbers', mnemonic: 'にじ' },
  { id: 'k3', char: '三', reading: 'さん', row: 'numbers', mnemonic: 'さんかく' },
  { id: 'k4', char: '四', reading: 'よん', row: 'numbers', mnemonic: 'よんこ' },
  { id: 'k5', char: '五', reading: 'ご', row: 'numbers', mnemonic: 'ごはん' },
  { id: 'k6', char: '六', reading: 'ろく', row: 'numbers', mnemonic: 'ろくがつ' },
  { id: 'k7', char: '七', reading: 'なな', row: 'numbers', mnemonic: 'ななつ' },
  { id: 'k8', char: '八', reading: 'はち', row: 'numbers', mnemonic: 'はちみつ' },
  { id: 'k9', char: '九', reading: 'きゅう', row: 'numbers', mnemonic: 'きゅうきゅうしゃ' },
  { id: 'k10', char: '十', reading: 'じゅう', row: 'numbers', mnemonic: 'じゅうす' },
  // nature (days of the week use their 曜日 on'yomi — the one context where all 7 are
  // taught together with zero reading collisions, unlike their everyday kun'yomi
  // readings which overlap heavily, e.g. 日/火 both read ひ)
  { id: 'k11', char: '日', reading: 'にち', row: 'nature', mnemonic: 'にちようび' },
  { id: 'k12', char: '月', reading: 'げつ', row: 'nature', mnemonic: 'げつようび' },
  { id: 'k13', char: '火', reading: 'か', row: 'nature', mnemonic: 'かようび' },
  { id: 'k14', char: '水', reading: 'すい', row: 'nature', mnemonic: 'すいようび' },
  { id: 'k15', char: '木', reading: 'もく', row: 'nature', mnemonic: 'もくようび' },
  { id: 'k16', char: '金', reading: 'きん', row: 'nature', mnemonic: 'きんようび' },
  { id: 'k17', char: '土', reading: 'ど', row: 'nature', mnemonic: 'どようび' },
  { id: 'k18', char: '空', reading: 'そら', row: 'nature', mnemonic: 'そらまめ' },
  { id: 'k19', char: '雨', reading: 'あめ', row: 'nature', mnemonic: 'あめだま' },
  { id: 'k20', char: '天', reading: 'てん', row: 'nature', mnemonic: 'てんき' },
  // people
  { id: 'k21', char: '人', reading: 'ひと', row: 'people', mnemonic: 'ひとで' },
  { id: 'k22', char: '名', reading: 'な', row: 'people', mnemonic: 'なまえ' },
  { id: 'k23', char: '女', reading: 'おんな', row: 'people', mnemonic: 'おんなのこ' },
  { id: 'k24', char: '男', reading: 'おとこ', row: 'people', mnemonic: 'おとこのこ' },
  { id: 'k25', char: '子', reading: 'こ', row: 'people', mnemonic: 'こども' },
  { id: 'k26', char: '王', reading: 'おう', row: 'people', mnemonic: 'おうさま' },
  { id: 'k27', char: '先', reading: 'せん', row: 'people', mnemonic: 'せんせい' },
  { id: 'k28', char: '生', reading: 'せい', row: 'people', mnemonic: 'せいかつ' },
  { id: 'k29', char: '学', reading: 'がく', row: 'people', mnemonic: 'がっこう' },
  { id: 'k30', char: '校', reading: 'こう', row: 'people', mnemonic: 'こうえん' },
  // body (& a few common early verbs taught alongside body parts)
  { id: 'k31', char: '目', reading: 'め', row: 'body', mnemonic: 'めだま' },
  { id: 'k32', char: '耳', reading: 'みみ', row: 'body', mnemonic: 'みみせん' },
  { id: 'k33', char: '口', reading: 'くち', row: 'body', mnemonic: 'くちぶえ' },
  { id: 'k34', char: '手', reading: 'て', row: 'body', mnemonic: 'てぶくろ' },
  { id: 'k35', char: '足', reading: 'あし', row: 'body', mnemonic: 'あしあと' },
  { id: 'k36', char: '音', reading: 'おと', row: 'body', mnemonic: 'おとうと' },
  { id: 'k37', char: '見', reading: 'みる', row: 'body', mnemonic: 'みるく' },
  { id: 'k38', char: '立', reading: 'たつ', row: 'body', mnemonic: 'たつまき' },
  { id: 'k39', char: '出', reading: 'でる', row: 'body', mnemonic: 'でぐち' },
  { id: 'k40', char: '入', reading: 'はいる', row: 'body', mnemonic: 'はいいろ' },
  // color / size / direction
  { id: 'k41', char: '赤', reading: 'あか', row: 'colorSize', mnemonic: 'あかちゃん' },
  { id: 'k42', char: '青', reading: 'あお', row: 'colorSize', mnemonic: 'あおぞら' },
  { id: 'k43', char: '白', reading: 'しろ', row: 'colorSize', mnemonic: 'しろくま' },
  { id: 'k44', char: '大', reading: 'おおきい', row: 'colorSize', mnemonic: 'おおきいくま' },
  { id: 'k45', char: '小', reading: 'ちいさい', row: 'colorSize', mnemonic: 'ちいさいくま' },
  { id: 'k46', char: '上', reading: 'うえ', row: 'colorSize', mnemonic: 'うえのやま' },
  { id: 'k47', char: '下', reading: 'した', row: 'colorSize', mnemonic: 'したじき' },
  { id: 'k48', char: '中', reading: 'なか', row: 'colorSize', mnemonic: 'なかよし' },
  { id: 'k49', char: '左', reading: 'ひだり', row: 'colorSize', mnemonic: 'ひだりて' },
  { id: 'k50', char: '右', reading: 'みぎ', row: 'colorSize', mnemonic: 'みぎて' },
  // animals & nature
  { id: 'k51', char: '犬', reading: 'いぬ', row: 'animals', mnemonic: 'いぬごや' },
  { id: 'k52', char: '貝', reading: 'かい', row: 'animals', mnemonic: 'かいがら' },
  { id: 'k53', char: '虫', reading: 'むし', row: 'animals', mnemonic: 'むしめがね' },
  { id: 'k54', char: '石', reading: 'いし', row: 'animals', mnemonic: 'いしころ' },
  { id: 'k55', char: '花', reading: 'はな', row: 'animals', mnemonic: 'はなび' },
  { id: 'k56', char: '草', reading: 'くさ', row: 'animals', mnemonic: 'くさばな' },
  { id: 'k57', char: '竹', reading: 'たけ', row: 'animals', mnemonic: 'たけのこ' },
  { id: 'k58', char: '森', reading: 'もり', row: 'animals', mnemonic: 'もりのくま' },
  { id: 'k59', char: '林', reading: 'はやし', row: 'animals', mnemonic: 'はやしのなか' },
  { id: 'k60', char: '山', reading: 'やま', row: 'animals', mnemonic: 'やまのぼり' },
  // places & daily life
  { id: 'k61', char: '川', reading: 'かわ', row: 'places', mnemonic: 'かわぎし' },
  { id: 'k62', char: '田', reading: 'た', row: 'places', mnemonic: 'たまご' },
  { id: 'k63', char: '町', reading: 'まち', row: 'places', mnemonic: 'まちあわせ' },
  { id: 'k64', char: '村', reading: 'むら', row: 'places', mnemonic: 'むらまつり' },
  { id: 'k65', char: '円', reading: 'えん', row: 'places', mnemonic: 'えんぴつ' },
  { id: 'k66', char: '千', reading: 'せん', row: 'places', mnemonic: 'せんえん' },
  { id: 'k67', char: '百', reading: 'ひゃく', row: 'places', mnemonic: 'ひゃくえん' },
  { id: 'k68', char: '玉', reading: 'たま', row: 'places', mnemonic: 'たまねぎ' },
  { id: 'k69', char: '車', reading: 'くるま', row: 'places', mnemonic: 'くるまいす' },
  { id: 'k70', char: '糸', reading: 'いと', row: 'places', mnemonic: 'いとまき' },
  // study & time
  { id: 'k71', char: '気', reading: 'き', row: 'study', mnemonic: 'きりん' },
  { id: 'k72', char: '休', reading: 'きゅう', row: 'study', mnemonic: 'きゅうしょく' },
  { id: 'k73', char: '字', reading: 'じ', row: 'study', mnemonic: 'じてんしゃ' },
  { id: 'k74', char: '正', reading: 'せい', row: 'study', mnemonic: 'せいかい' },
  { id: 'k75', char: '夕', reading: 'ゆう', row: 'study', mnemonic: 'ゆうがた' },
  { id: 'k76', char: '早', reading: 'はやい', row: 'study', mnemonic: 'はやいでんしゃ' },
  { id: 'k77', char: '年', reading: 'ねん', row: 'study', mnemonic: 'ねんがじょう' },
  { id: 'k78', char: '文', reading: 'ぶん', row: 'study', mnemonic: 'ぶんぼうぐ' },
  { id: 'k79', char: '本', reading: 'ほん', row: 'study', mnemonic: 'ほんだな' },
  { id: 'k80', char: '力', reading: 'ちから', row: 'study', mnemonic: 'ちからもち' },
]

export function getKanjiById(id: string): KanjiEntry {
  const entry = kanjiBank.find((k) => k.id === id)
  if (!entry) {
    throw new Error(`Unknown kanji id: ${id}`)
  }
  return entry
}

/** Speaks the reading, not the character (a kanji glyph isn't itself phonetic) — always
 * wrapped in its mnemonic word, both for TTS clarity on short readings and, more
 * importantly, to disambiguate the handful of grade-1 kanji that share an identical
 * reading (see KanjiEntry.mnemonic). */
export function kanjiSpeechPhrase(entry: KanjiEntry): string {
  return `${entry.reading}、${entry.mnemonic}の　${entry.reading}`
}
