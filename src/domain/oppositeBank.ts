/** ろんり「はんたいことば」(opposite words). One entry per opposite PAIR, not per word —
 * a word can belong to several pairs when it has several meanings (たかい: やまが たかい ⇔
 * ひくい, ねだんが たかい ⇔ やすい), and every one of its partners counts as a correct
 * answer: the point is to reward a child who reasons their way to *an* opposite, not to
 * guess the single one an adult had in mind.
 *
 * - `context` is a short phrase that fits BOTH words of the pair, so the explanation can
 *   show the meaning that makes them opposites (「やまが」 たかい ⇔ ひくい). Empty when
 *   no single phrase reads naturally with both (でんしゃに のる / でんしゃから おりる).
 * - `group` is the dimension the pair contrasts (size, temperature, ...). Wrong choices are
 *   never drawn from a group the prompt word belongs to — otherwise e.g. ちいさい could
 *   show up as a "wrong" choice for ひろい, which a child could fairly argue is an opposite.
 * - `pos` keeps wrong choices the same kind of word as the prompt (describing words vs
 *   action words), so the answer can't be spotted just by its word ending. */
export interface OppositePair {
  a: string
  b: string
  context: string
  group: string
  pos: 'adjective' | 'verb'
}

const adj = (a: string, b: string, context: string, group: string): OppositePair => ({ a, b, context, group, pos: 'adjective' })
const verb = (a: string, b: string, context: string, group: string): OppositePair => ({ a, b, context, group, pos: 'verb' })

export const oppositePairs: OppositePair[] = [
  // ようすの ことば
  adj('ながい', 'みじかい', 'ひもが', 'size'),
  adj('たかい', 'ひくい', 'やまが', 'size'),
  adj('たかい', 'やすい', 'ねだんが', 'price'),
  adj('おおきい', 'ちいさい', 'いぬが', 'size'),
  adj('ひろい', 'せまい', 'へやが', 'size'),
  adj('ふとい', 'ほそい', 'きが', 'size'),
  adj('ふかい', 'あさい', 'いけが', 'size'),
  adj('あつい', 'うすい', 'ほんが', 'size'),
  adj('おもい', 'かるい', 'にもつが', 'weight'),
  adj('あつい', 'さむい', 'きょうは', 'temperature'),
  adj('あつい', 'つめたい', 'のみものが', 'temperature'),
  adj('あたたかい', 'つめたい', 'てが', 'temperature'),
  adj('はやい', 'おそい', 'はしるのが', 'speed'),
  adj('あかるい', 'くらい', 'へやが', 'light'),
  adj('あたらしい', 'ふるい', 'くつが', 'newness'),
  adj('つよい', 'よわい', 'ちからが', 'strength'),
  adj('おおい', 'すくない', 'ひとが', 'amount'),
  adj('ちかい', 'とおい', 'がっこうが', 'distance'),
  adj('かたい', 'やわらかい', 'パンが', 'texture'),
  adj('あまい', 'からい', 'あじが', 'taste'),
  adj('おいしい', 'まずい', 'ごはんが', 'taste'),
  adj('うれしい', 'かなしい', 'きもちが', 'feeling'),
  adj('たのしい', 'つまらない', 'あそびが', 'feeling'),
  adj('きれい', 'きたない', 'へやが', 'clean'),
  adj('しずか', 'うるさい', 'きょうしつが', 'sound'),
  adj('やさしい', 'むずかしい', 'もんだいが', 'difficulty'),
  adj('いい', 'わるい', 'てんきが', 'quality'),
  // うごきの ことば
  verb('あける', 'しめる', 'ドアを', 'openClose'),
  verb('あける', 'とじる', 'めを', 'openClose'),
  verb('ひらく', 'とじる', 'ほんを', 'openClose'),
  verb('ひらく', 'しめる', 'おみせを', 'openClose'),
  verb('のぼる', 'おりる', 'かいだんを', 'upDown'),
  verb('あがる', 'さがる', 'ねつが', 'upDown'),
  verb('あげる', 'さげる', 'てを', 'upDown'),
  verb('のる', 'おりる', '', 'ride'),
  verb('はいる', 'でる', '', 'inOut'),
  verb('いれる', 'だす', 'おもちゃを', 'inOut'),
  verb('いく', 'くる', 'がっこうに', 'goCome'),
  verb('たつ', 'すわる', '', 'posture'),
  verb('つける', 'けす', 'でんきを', 'onOff'),
  verb('かく', 'けす', 'じを', 'writeErase'),
  verb('なく', 'わらう', 'あかちゃんが', 'emotion'),
  verb('かつ', 'まける', 'しあいに', 'match'),
  verb('おきる', 'ねる', '', 'sleep'),
  verb('うる', 'かう', 'おみせで やさいを', 'trade'),
  verb('あげる', 'もらう', 'プレゼントを', 'giveTake'),
  verb('ひろう', 'すてる', 'ごみを', 'pickThrow'),
  verb('ふえる', 'へる', 'かずが', 'increase'),
  verb('はじまる', 'おわる', 'じゅぎょうが', 'startEnd'),
  verb('おす', 'ひく', 'ドアを', 'pushPull'),
  verb('きる', 'ぬぐ', 'ふくを', 'clothes'),
]

/** Every pair this word is part of (one per meaning). */
export function pairsFor(word: string): OppositePair[] {
  return oppositePairs.filter((p) => p.a === word || p.b === word)
}

export function partnerIn(pair: OppositePair, word: string): string {
  return pair.a === word ? pair.b : pair.a
}

/** All words that appear in at least one pair — the prompt pool. */
export const oppositeWords: string[] = [...new Set(oppositePairs.flatMap((p) => [p.a, p.b]))]

/** Stable short id for a word, for audio cache keys (filenames stay ASCII). */
export function oppositeWordKey(word: string): string {
  let h = 5381
  for (const ch of word) h = ((h * 33) ^ ch.codePointAt(0)!) >>> 0
  return h.toString(36)
}
