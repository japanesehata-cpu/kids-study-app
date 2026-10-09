/** Thematic groups for the grade-1 (80) and grade-2 (160) kyōiku kanji (文部科学省
 * 学年別漢字配当表) — grouped by meaning/topic rather than stroke count, so unlocking one row
 * teaches a coherent little vocabulary set instead of an arbitrary slice. Each grade has
 * more themes than the shared 6-level ceiling, so a few theme pairs share a ★level (see
 * LEVEL_ROWS in questionGenerators/kanji.ts). */
export type KanjiRow =
  | 'numbers'
  | 'nature'
  | 'people'
  | 'body'
  | 'colorSize'
  | 'animals'
  | 'places'
  | 'study'
  | 'g2Nature'
  | 'g2Time'
  | 'g2People'
  | 'g2Things'
  | 'g2Places'
  | 'g2Actions'
  | 'g2Study'

export type KanjiGrade = 1 | 2

export interface KanjiEntry {
  id: string
  char: string
  grade: KanjiGrade
  /** The one reading this app teaches for this kanji — most kanji have several
   * (on'yomi/kun'yomi), so this is deliberately the single most common textbook reading
   * for THIS character specifically, not a fixed on'yomi-only or kun'yomi-only rule. */
  reading: string
  row: KanjiRow
  /** A short everyday phrase that genuinely USES this kanji in this reading (雨 → 雨が
   * ふる, 車 → 車に のる), spoken right after the reading — it pins down which of several
   * same-sounding kanji is meant (先/千 both せん) and shows the word in real use.
   *
   * This replaced an older `mnemonic` field that was merely a word *starting with the same
   * sound*, often with nothing to do with the kanji (雨 → あめだま "candy", 一 → いちご
   * "strawberry", 車 → くるまいす "wheelchair") — children heard 雨 explained as candy.
   * Written with the kanji itself so TTS gets each word's real pronunciation. */
  hint: string
  /** Set only for kanji in the なぞる (trace-to-write) practice pool — see
   * KanjiTraceScreen, which filters kanjiBank down to entries where this AND
   * kanjiStrokePaths[char] are both present. A word image id (images/words/{id}.png).
   * Omitted for kanji whose meaning isn't easily pictured. */
  traceImageId?: string
  /** Short meaning gloss shown after tracing, alongside traceImageId's image — set
   * together with traceImageId, never alone. */
  meaningJa?: string
  meaningEn?: string
  /** Short natural sentence using this kanji in context, shown and read aloud right after
   * each kanji is traced. Set together with traceImageId/meaningJa/meaningEn, never alone.
   * Written with only this kanji plus kana (no other kanji character). */
  exampleSentenceJa?: string
  exampleSentenceEn?: string
}

type Row = [char: string, reading: string, hint: string]

interface TraceInfo {
  image: string
  ja: string
  en: string
  sentenceJa: string
  sentenceEn: string
}

const GRADE1_ROWS: [KanjiRow, Row[]][] = [
  [
    'numbers',
    [
      ['一', 'いち', '一ねんせい'],
      ['二', 'に', '二ねんせい'],
      ['三', 'さん', '三かく'],
      ['四', 'よん', '四ひき'],
      ['五', 'ご', '五にん'],
      ['六', 'ろく', '六がつ'],
      ['七', 'なな', '七つ'],
      ['八', 'はち', '八がつ'],
      ['九', 'きゅう', '九さい'],
      ['十', 'じゅう', '十えん'],
    ],
  ],
  [
    'nature',
    [
      // Days of the week use their 曜日 on'yomi — the one context where all 7 are taught
      // together with zero reading collisions (日/火 both read ひ otherwise).
      ['日', 'にち', '日よう日'],
      ['月', 'げつ', '月よう日'],
      ['火', 'か', '火よう日'],
      ['水', 'すい', '水よう日'],
      ['木', 'もく', '木よう日'],
      ['金', 'きん', '金よう日'],
      ['土', 'ど', '土よう日'],
      ['空', 'そら', 'あおい 空'],
      ['雨', 'あめ', '雨が ふる'],
      ['天', 'てん', '天気'],
    ],
  ],
  [
    'people',
    [
      ['人', 'ひと', 'やさしい 人'],
      ['名', 'な', '名まえ'],
      ['女', 'おんな', '女の子'],
      ['男', 'おとこ', '男の子'],
      ['子', 'こ', '子ども'],
      ['王', 'おう', '王さま'],
      ['先', 'せん', '先生'],
      ['生', 'せい', 'がく生'],
      ['学', 'がく', '学しゅう'],
      ['校', 'こう', '学校'],
    ],
  ],
  [
    'body',
    [
      ['目', 'め', '目で 見る'],
      ['耳', 'みみ', '耳で きく'],
      ['口', 'くち', '口を あける'],
      ['手', 'て', '手を あらう'],
      ['足', 'あし', '足で はしる'],
      ['音', 'おと', '大きな 音'],
      ['見', 'みる', 'テレビを 見る'],
      ['立', 'たつ', 'いすから 立つ'],
      ['出', 'でる', 'そとに 出る'],
      ['入', 'はいる', 'おふろに 入る'],
    ],
  ],
  [
    'colorSize',
    [
      ['赤', 'あか', '赤い りんご'],
      ['青', 'あお', '青い そら'],
      ['白', 'しろ', '白い くも'],
      ['大', 'おおきい', '大きい ぞう'],
      ['小', 'ちいさい', '小さい あり'],
      ['上', 'うえ', 'つくえの 上'],
      ['下', 'した', 'つくえの 下'],
      ['中', 'なか', 'はこの 中'],
      ['左', 'ひだり', '左て'],
      ['右', 'みぎ', '右て'],
    ],
  ],
  [
    'animals',
    [
      ['犬', 'いぬ', '犬が ほえる'],
      ['貝', 'かい', '貝がら'],
      ['虫', 'むし', '虫を つかまえる'],
      ['石', 'いし', '石を ひろう'],
      ['花', 'はな', '花が さく'],
      ['草', 'くさ', '草むら'],
      ['竹', 'たけ', '竹の子'],
      ['森', 'もり', 'ふかい 森'],
      ['林', 'はやし', '林で あそぶ'],
      ['山', 'やま', '山に のぼる'],
    ],
  ],
  [
    'places',
    [
      ['川', 'かわ', '川で およぐ'],
      ['田', 'た', '田んぼ'],
      ['町', 'まち', '町の おみせ'],
      ['村', 'むら', '村の おまつり'],
      ['円', 'えん', '百円'],
      ['千', 'せん', '千円'],
      ['百', 'ひゃく', '百てん'],
      ['玉', 'たま', '玉入れ'],
      ['車', 'くるま', '車に のる'],
      ['糸', 'いと', '糸と はり'],
    ],
  ],
  [
    'study',
    [
      ['気', 'き', '元気'],
      ['休', 'きゅう', '休けい'],
      ['字', 'じ', 'かん字'],
      ['正', 'せい', '正解'],
      ['夕', 'ゆう', '夕がた'],
      ['早', 'はやい', 'あさが 早い'],
      ['年', 'ねん', '一年生'],
      ['文', 'ぶん', '文しょう'],
      ['本', 'ほん', '本を よむ'],
      ['力', 'ちから', '力もち'],
    ],
  ],
]

const GRADE2_ROWS: [KanjiRow, Row[]][] = [
  [
    'g2Nature',
    [
      ['雲', 'くも', '白い 雲'],
      ['雪', 'ゆき', '雪が ふる'],
      ['星', 'ほし', '星が ひかる'],
      ['晴', 'はれ', 'あしたは 晴れ'],
      ['風', 'かぜ', '風が ふく'],
      ['光', 'ひかり', '月の 光'],
      ['海', 'うみ', '海で およぐ'],
      ['池', 'いけ', '池の こい'],
      ['谷', 'たに', 'ふかい 谷'],
      ['岩', 'いわ', '大きな 岩'],
      ['原', 'はら', '野原'],
      ['野', 'や', '野菜'],
      ['地', 'ち', '地きゅう'],
    ],
  ],
  [
    'g2Time',
    [
      ['春', 'はる', '春が くる'],
      ['夏', 'なつ', 'あつい 夏'],
      ['秋', 'あき', '秋の もみじ'],
      ['冬', 'ふゆ', 'さむい 冬'],
      ['朝', 'あさ', '朝ごはん'],
      ['昼', 'ひる', '昼ごはん'],
      ['夜', 'よる', '夜に ねる'],
      ['午', 'ご', '午前'],
      ['前', 'まえ', '前に すすむ'],
      ['後', 'うしろ', '後ろを 見る'],
      ['時', 'じ', '何時'],
      ['間', 'あいだ', 'ふたりの 間'],
      ['週', 'しゅう', 'らい週'],
      ['曜', 'よう', '日曜日'],
      ['毎', 'まい', '毎日'],
      ['今', 'いま', '今 なんじ'],
      ['半', 'はん', '半分'],
    ],
  ],
  [
    'g2People',
    [
      ['父', 'ちち', '父の日'],
      ['母', 'はは', '母の日'],
      ['兄', 'あに', 'わたしの 兄'],
      ['姉', 'あね', 'わたしの 姉'],
      ['弟', 'おとうと', '弟と あそぶ'],
      ['妹', 'いもうと', '妹と あそぶ'],
      ['友', 'とも', '友だち'],
      ['親', 'おや', '親子'],
      ['自', 'じ', '自分'],
      ['頭', 'あたま', '頭を なでる'],
      ['顔', 'かお', '顔を あらう'],
      ['首', 'くび', 'きりんの 首'],
      ['毛', 'け', '髪の毛'],
      ['心', 'こころ', 'やさしい 心'],
      ['体', 'からだ', '体を うごかす'],
      ['声', 'こえ', '大きな 声'],
    ],
  ],
  [
    'g2Things',
    [
      ['牛', 'うし', '牛が なく'],
      ['馬', 'うま', '馬に のる'],
      ['鳥', 'とり', '鳥が とぶ'],
      ['魚', 'さかな', '魚が およぐ'],
      ['羽', 'はね', '鳥の 羽'],
      ['肉', 'にく', '肉を やく'],
      ['米', 'こめ', 'お米を たく'],
      ['麦', 'むぎ', '麦ちゃ'],
      ['茶', 'ちゃ', 'お茶を のむ'],
      ['食', 'たべる', 'ごはんを 食べる'],
      ['弓', 'ゆみ', '弓を ひく'],
      ['矢', 'や', '矢が とぶ'],
      ['刀', 'かたな', 'さむらいの 刀'],
      ['紙', 'かみ', '紙を おる'],
      ['絵', 'え', '絵を かく'],
      ['色', 'いろ', 'すきな 色'],
      ['黒', 'くろ', '黒い ねこ'],
      ['黄', 'き', '黄いろ'],
      ['丸', 'まる', '丸い ボール'],
      ['角', 'かく', '三角'],
      ['線', 'せん', '線を ひく'],
      ['点', 'てん', '百点'],
      ['形', 'かたち', 'まるい 形'],
    ],
  ],
  [
    'g2Places',
    [
      ['東', 'ひがし', '東の そら'],
      ['西', 'にし', '西の そら'],
      ['南', 'みなみ', '南の しま'],
      ['北', 'きた', '北の くに'],
      ['方', 'ほう', '右の 方'],
      ['内', 'うち', '内がわ'],
      ['外', 'そと', '外で あそぶ'],
      ['門', 'もん', '学校の 門'],
      ['戸', 'と', '戸を しめる'],
      ['家', 'いえ', '家に かえる'],
      ['寺', 'てら', 'お寺の かね'],
      ['店', 'みせ', 'お店で かう'],
      ['道', 'みち', '道を あるく'],
      ['京', 'きょう', 'とう京'],
      ['国', 'くに', 'あたたかい 国'],
      ['市', 'し', '市やくしょ'],
      ['里', 'さと', '里山'],
      ['園', 'えん', 'どうぶつ園'],
      ['場', 'ば', '広場'],
      ['社', 'しゃ', 'かい社'],
      ['公', 'こう', '公園'],
      ['工', 'こう', '工さく'],
      ['室', 'しつ', 'きょう室'],
      ['船', 'ふね', '船に のる'],
      ['汽', 'き', '汽車'],
      ['電', 'でん', '電車'],
      ['台', 'だい', '台所'],
    ],
  ],
  [
    'g2Actions',
    [
      ['言', 'いう', 'ありがとうと 言う'],
      ['話', 'はなす', '友だちと 話す'],
      ['語', 'ご', 'えい語'],
      ['読', 'よむ', '本を 読む'],
      ['書', 'かく', '字を 書く'],
      ['聞', 'きく', 'おとを 聞く'],
      ['歌', 'うた', '歌を うたう'],
      ['楽', 'たのしい', '楽しい あそび'],
      ['鳴', 'なく', '鳥が 鳴く'],
      ['歩', 'あるく', 'みちを 歩く'],
      ['走', 'はしる', 'はやく 走る'],
      ['止', 'とまる', '車が 止まる'],
      ['来', 'くる', 'ともだちが 来る'],
      ['帰', 'かえる', 'いえに 帰る'],
      ['行', 'いく', 'がっこうへ 行く'],
      ['通', 'とおる', 'みちを 通る'],
      ['引', 'ひく', 'つなを 引く'],
      ['切', 'きる', 'かみを 切る'],
      ['売', 'うる', 'おみせで 売る'],
      ['買', 'かう', 'おかしを 買う'],
      ['答', 'こたえ', '答えを かく'],
      ['考', 'かんがえる', 'よく 考える'],
      ['思', 'おもう', 'そう 思う'],
      ['知', 'しる', 'なまえを 知る'],
      ['教', 'おしえる', '字を 教える'],
      ['作', 'つくる', 'ごはんを 作る'],
      ['用', 'よう', '用じ'],
      ['会', 'あう', 'ともだちに 会う'],
      ['合', 'あう', '目が 合う'],
      ['交', 'こう', '交つう'],
      ['回', 'まわる', 'こまが 回る'],
      ['活', 'かつ', '活どう'],
    ],
  ],
  [
    'g2Study',
    [
      ['算', 'さん', '算数'],
      ['数', 'かず', '数を かぞえる'],
      ['計', 'けい', 'と計'],
      ['記', 'き', '日記'],
      ['図', 'ず', '図かん'],
      ['画', 'が', 'まん画'],
      ['理', 'り', 'りょう理'],
      ['科', 'か', '理科'],
      ['番', 'ばん', '一番'],
      ['才', 'さい', '六才'],
      ['元', 'げん', '元気'],
      ['古', 'ふるい', '古い いえ'],
      ['新', 'あたらしい', '新しい くつ'],
      ['長', 'ながい', '長い へび'],
      ['高', 'たかい', '高い 山'],
      ['広', 'ひろい', '広い こうえん'],
      ['遠', 'とおい', '遠い まち'],
      ['近', 'ちかい', '近い いえ'],
      ['強', 'つよい', '強い 風'],
      ['弱', 'よわい', '弱い 力'],
      ['多', 'おおい', 'ひとが 多い'],
      ['少', 'すくない', 'のこりが 少ない'],
      ['太', 'ふとい', '太い 木'],
      ['細', 'ほそい', '細い 糸'],
      ['明', 'あかるい', '明るい へや'],
      ['同', 'おなじ', '同じ いろ'],
      ['当', 'とう', '本当'],
      ['直', 'なおす', 'こわれた おもちゃを 直す'],
      ['分', 'わける', 'なかよく 分ける'],
      ['万', 'まん', '一万円'],
      ['何', 'なに', '何いろ'],
      ['組', 'くみ', '組を つくる'],
    ],
  ],
]

const TRACE: Record<string, TraceInfo> = {
  // grade 1
  日: { image: 'sun', ja: 'たいよう', en: 'sun', sentenceJa: 'あさ、日が のぼりました。', sentenceEn: 'The sun rose in the morning.' },
  月: { image: 'moon', ja: 'つき', en: 'moon', sentenceJa: 'よるに 月が でました。', sentenceEn: 'The moon came out at night.' },
  水: { image: 'water', ja: 'みず', en: 'water', sentenceJa: '水を いっぱい のみました。', sentenceEn: 'I drank a lot of water.' },
  木: { image: 'tree', ja: 'き', en: 'tree', sentenceJa: '木に とりが とまりました。', sentenceEn: 'A bird landed on the tree.' },
  金: { image: 'gold', ja: 'きんいろ', en: 'gold', sentenceJa: 'ぴかぴかの 金の メダル。', sentenceEn: 'A shiny gold medal.' },
  雨: { image: 'rain', ja: 'あめ', en: 'rain', sentenceJa: '雨が ざあざあ ふっています。', sentenceEn: 'The rain is pouring down.' },
  犬: { image: 'dog', ja: 'いぬ', en: 'dog', sentenceJa: '犬が わんわん ないています。', sentenceEn: 'The dog is barking woof woof.' },
  貝: { image: 'seashell', ja: 'かい', en: 'seashell', sentenceJa: 'うみで 貝を ひろいました。', sentenceEn: 'I picked up a shell at the sea.' },
  花: { image: 'flower', ja: 'はな', en: 'flower', sentenceJa: '花が きれいに さきました。', sentenceEn: 'The flower bloomed beautifully.' },
  草: { image: 'grass', ja: 'くさ', en: 'grass', sentenceJa: '草の うえで ねころびました。', sentenceEn: 'I lay down on the grass.' },
  森: { image: 'forest', ja: 'もり', en: 'forest', sentenceJa: '森の なかを あるきました。', sentenceEn: 'I walked through the forest.' },
  山: { image: 'mountain', ja: 'やま', en: 'mountain', sentenceJa: '山に のぼりました。', sentenceEn: 'I climbed the mountain.' },
  石: { image: 'rock', ja: 'いし', en: 'rock', sentenceJa: '石を なげて あそびました。', sentenceEn: 'I played by throwing stones.' },
  川: { image: 'river', ja: 'かわ', en: 'river', sentenceJa: '川で さかなを つりました。', sentenceEn: 'I caught a fish in the river.' },
  車: { image: 'car', ja: 'くるま', en: 'car', sentenceJa: '車に のって でかけました。', sentenceEn: 'I got in the car and went out.' },
  本: { image: 'book', ja: 'ほん', en: 'book', sentenceJa: '本を たくさん よみました。', sentenceEn: 'I read many books.' },
  // grade 2
  雲: { image: 'cloud', ja: 'くも', en: 'cloud', sentenceJa: 'そらに しろい 雲が うかんでいます。', sentenceEn: 'A white cloud is floating in the sky.' },
  雪: { image: 'snow', ja: 'ゆき', en: 'snow', sentenceJa: '雪が たくさん つもりました。', sentenceEn: 'A lot of snow piled up.' },
  星: { image: 'star', ja: 'ほし', en: 'star', sentenceJa: 'よぞらに 星が ひかっています。', sentenceEn: 'Stars are shining in the night sky.' },
  晴: { image: 'sunshine', ja: 'はれ', en: 'sunny', sentenceJa: 'きょうは よく 晴れています。', sentenceEn: 'It is very sunny today.' },
  風: { image: 'wind', ja: 'かぜ', en: 'wind', sentenceJa: 'つよい 風が ふいています。', sentenceEn: 'A strong wind is blowing.' },
  海: { image: 'ocean', ja: 'うみ', en: 'sea', sentenceJa: 'なつに 海で およぎました。', sentenceEn: 'I swam in the sea in summer.' },
  池: { image: 'pond', ja: 'いけ', en: 'pond', sentenceJa: '池に さかなが います。', sentenceEn: 'There are fish in the pond.' },
  谷: { image: 'valley', ja: 'たに', en: 'valley', sentenceJa: 'やまと やまの あいだに 谷が あります。', sentenceEn: 'There is a valley between the mountains.' },
  牛: { image: 'cow', ja: 'うし', en: 'cow', sentenceJa: '牛が モーと なきました。', sentenceEn: 'The cow went moo.' },
  馬: { image: 'horse', ja: 'うま', en: 'horse', sentenceJa: '馬が はやく はしります。', sentenceEn: 'The horse runs fast.' },
  鳥: { image: 'bird', ja: 'とり', en: 'bird', sentenceJa: '鳥が そらを とんでいます。', sentenceEn: 'A bird is flying in the sky.' },
  魚: { image: 'fish', ja: 'さかな', en: 'fish', sentenceJa: '魚が すいすい およいでいます。', sentenceEn: 'A fish is swimming smoothly.' },
  船: { image: 'ship', ja: 'ふね', en: 'ship', sentenceJa: 'おおきな 船が うみを すすみます。', sentenceEn: 'A big ship sails across the sea.' },
  家: { image: 'house', ja: 'いえ', en: 'house', sentenceJa: 'あかい やねの 家に すんでいます。', sentenceEn: 'I live in a house with a red roof.' },
  首: { image: 'neck', ja: 'くび', en: 'neck', sentenceJa: 'マフラーを 首に まきます。', sentenceEn: 'I wrap a scarf around my neck.' },
  心: { image: 'heart', ja: 'こころ', en: 'heart', sentenceJa: 'やさしい 心を もっています。', sentenceEn: 'I have a kind heart.' },
  米: { image: 'rice', ja: 'こめ', en: 'rice', sentenceJa: 'お米を たいて たべました。', sentenceEn: 'I cooked rice and ate it.' },
  茶: { image: 'tea', ja: 'ちゃ', en: 'tea', sentenceJa: 'あたたかい お茶を のみました。', sentenceEn: 'I drank some warm tea.' },
  黒: { image: 'black', ja: 'くろ', en: 'black', sentenceJa: '黒い ねこが います。', sentenceEn: 'There is a black cat.' },
  黄: { image: 'yellow', ja: 'きいろ', en: 'yellow', sentenceJa: '黄いろい はなが さきました。', sentenceEn: 'A yellow flower bloomed.' },
  丸: { image: 'circle', ja: 'まる', en: 'circle', sentenceJa: '丸い ボールで あそびました。', sentenceEn: 'I played with a round ball.' },
  走: { image: 'running', ja: 'はしる', en: 'run', sentenceJa: 'こうえんを 走りました。', sentenceEn: 'I ran in the park.' },
}

function buildEntries(grade: KanjiGrade, rows: [KanjiRow, Row[]][], idPrefix: string): KanjiEntry[] {
  let n = 0
  return rows.flatMap(([row, entries]) =>
    entries.map(([char, reading, hint]) => {
      n += 1
      const trace = TRACE[char]
      return {
        // Grade 1 keeps its original k1..k80 ids — saved review queues and the pre-rendered
        // TTS cache (kanji-k19.wav ...) are keyed by them.
        id: `${idPrefix}${n}`,
        char,
        grade,
        reading,
        row,
        hint,
        ...(trace && {
          traceImageId: trace.image,
          meaningJa: trace.ja,
          meaningEn: trace.en,
          exampleSentenceJa: trace.sentenceJa,
          exampleSentenceEn: trace.sentenceEn,
        }),
      }
    }),
  )
}

export const kanjiBank: KanjiEntry[] = [
  ...buildEntries(1, GRADE1_ROWS, 'k'),
  ...buildEntries(2, GRADE2_ROWS, 'k2-'),
]

export function getKanjiById(id: string): KanjiEntry {
  const entry = kanjiBank.find((k) => k.id === id)
  if (!entry) {
    throw new Error(`Unknown kanji id: ${id}`)
  }
  return entry
}

/** Kanji whose bare character TTS reads as exactly the taught reading with the right
 * intonation — spoken as the character rather than as kana, because bare kana loses the
 * pitch accent that tells same-sounding words apart (VOICEVOX reads 「あめ」 as 飴 "candy",
 * 「雨」 as rain). Verified against VOICEVOX's own reading output, see
 * scripts/check-kanji-speech.mjs. */
const SPEAK_AS_CHAR = new Set<string>(
  '一二三四五六七八九十金空雨天人名女男子王生学校目耳口手足音赤青白上下中左右犬貝虫石花草竹森林山川田町村円千百玉車糸気休字夕文本力雲雪星晴風光海池谷岩原地春夏秋冬朝昼夜前間週曜毎今半父母兄姉弟妹友親自頭顔首心体声牛馬鳥魚羽肉麦茶弓矢刀紙絵色黒黄丸角線点形東西南北方内外門戸家寺店道京国市里園場社工室船汽電台歌答用交活算数計記図画理科番才当万何組',
)

/** What the kanji itself is read as when spoken alone (an answer, the start of its phrase). */
export function kanjiSpokenReading(entry: KanjiEntry): string {
  return SPEAK_AS_CHAR.has(entry.char) ? entry.char : entry.reading
}

/** The reading quiz's spoken prompt: the reading, then a phrase that uses the kanji
 * (「あめ。雨が ふる」). */
export function kanjiSpeechPhrase(entry: KanjiEntry): string {
  const spoken = kanjiSpokenReading(entry)
  return `${spoken}。${entry.hint}`
}
