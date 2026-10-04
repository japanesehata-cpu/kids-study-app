/** Picture for each kana trace entry's example word (its `mnemonic` — a word that starts
 * with that kana, あ → あり), so the explanation step after tracing can show the kana right
 * beside the thing, the same way かんじ shows 雨 ＝ (rain). Only words with a fitting
 * existing image are listed; the rest show the kana and word without a picture. */
export const KANA_TRACE_IMAGE: Record<'hiragana' | 'katakana', Record<string, string>> = {
  hiragana: {
    a: 'ant', i: 'dog', u: 'rabbit', e: 'pencil', o: 'cookie',
    ka: 'turtle', ki: 'giraffe', ku: 'shoes', ke: 'caterpillar', ko: 'top',
    sa: 'fish', shi: 'deer', su: 'watermelon',
    ta: 'drum', chi: 'butterfly', tsu: 'moon', to: 'watch',
    na: 'eggplant', ni: 'rainbow', nu: 'teddybear', ne: 'cat',
    ha: 'flower', hi: 'airplane', fu: 'balloon', ho: 'star',
    ma: 'bean', mi: 'orange', me: 'glasses', mo: 'peach',
    ya: 'mountain', yu: 'snow',
    ra: 'lion', ri: 'apple', re: 'refrigerator', ro: 'candle',
    wa: 'crocodile',
  },
  katakana: {
    a: 'icecream', i: 'dolphin', u: 'rabbit', e: 'shrimp', o: 'orange',
    ki: 'giraffe', ku: 'bear', ke: 'cake', ko: 'koala',
    sa: 'monkey', shi: 'zebra', su: 'watermelon', so: 'sofa',
    ta: 'octopus', chi: 'cheese', te: 'television', to: 'tomato',
    na: 'eggplant', ni: 'carrot', nu: 'teddybear', ne: 'tie', no: 'notebook',
    ha: 'bee', fu: 'owl', ho: 'star',
    ma: 'bean', mi: 'milk', me: 'glasses', mo: 'peach',
    ya: 'goat', yu: 'snow', yo: 'sailboat',
    ra: 'lion', ri: 'apple', re: 'lemon', ro: 'robot',
    wa: 'crocodile',
  },
}
