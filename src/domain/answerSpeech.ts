import type { Category } from './types'

/* How the ANSWER part of a wrong-answer message ("おしい！こたえは ___ だよ") is spoken in
 * Japanese, with a pre-rendered file for every answer the app can produce — before this, that
 * one segment was always synthesized live, which on a phone means the browser's own robotic
 * voice reading a lone 「ぎょ」, 「は」 (as わ), or 「ほん（本）」 parentheses and all.
 *
 * No runtime imports on purpose: scripts/generate-tts-cache.mjs loads this file with plain
 * `node`, which can't resolve the app's extensionless imports. Callers pass in the bank
 * entries they already have. __tests__/answerSpeech.test.ts samples every generator to make
 * sure each answer it can produce is covered by the enumerations below. */

export interface AnswerSpeechPart {
  text: string
  cacheKey: string
}

/** Categories whose voice a numeric answer is spoken in — the □のけいさん categories share
 * たしざん's / ひきざん's character and voice (see characterThemes.ts). */
export type NumberAnswerVoice = 'addition' | 'subtraction' | 'logic'

export function numberAnswerVoice(category: Category): NumberAnswerVoice | null {
  if (category === 'addition' || category === 'missingOperandAddition') return 'addition'
  if (category === 'subtraction' || category === 'missingOperandSubtraction') return 'subtraction'
  if (category === 'logic') return 'logic'
  return null
}

const range = (from: number, to: number, step = 1) =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step)

/** Every number answer that can come up: 0-30 plus round tens to 100. */
export const NUMBER_ANSWERS: number[] = [...range(0, 30), ...range(40, 100, 10)]

export function numberAnswerSpeech(voice: NumberAnswerVoice, n: number): AnswerSpeechPart {
  return { text: String(n), cacheKey: `answer-num-${voice}-${n}` }
}

/** Every おかね target amount the generator can pick (reachable coin totals). */
export const MONEY_ANSWERS: number[] = [
  1, 2, 3, 5, 6, 7, 10, 11, 12, 15, 16, 20, 21, 25, 30, 50, 51, 52, 55, 56, 60, 61, 65, 70, 100, 101,
  102, 105, 106, 110, 111, 115, 120, 150, 151, 155, 160, 200, 201, 205, 210, 250, 300, 500, 501, 502,
  505, 506, 510, 511, 515, 520, 550, 551, 555, 560, 600, 601, 605, 610, 650, 700, 1000, 1001, 1005,
  1010, 1050, 1100, 1500,
]

export function moneyAnswerSpeech(amount: number): AnswerSpeechPart {
  return { text: `${amount}えん`, cacheKey: `answer-money-${amount}` }
}

// ---- とけい ---------------------------------------------------------------------------

const HOUR_READING = [
  '', 'いちじ', 'にじ', 'さんじ', 'よじ', 'ごじ', 'ろくじ', 'しちじ', 'はちじ', 'くじ', 'じゅうじ', 'じゅういちじ', 'じゅうにじ',
]
const TENS_READING = ['', 'じゅう', 'にじゅう', 'さんじゅう', 'よんじゅう', 'ごじゅう']
const ONES_WITH_FUN = ['', 'いっぷん', 'にふん', 'さんぷん', 'よんぷん', 'ごふん', 'ろっぷん', 'ななふん', 'はっぷん', 'きゅうふん']

/** 分 is read ぷん after 1, 3, 4, 6, 8 and 10 (いっぷん, さんぷん, じゅっぷん …) and ふん after
 * 2, 5, 7, 9 (にふん, ごふん …) — for the on-screen label (「10ぷん」, not 「10ふん」). */
export function minuteSuffix(minute: number): 'ふん' | 'ぷん' {
  return [0, 1, 3, 4, 6, 8].includes(minute % 10) ? 'ぷん' : 'ふん'
}

/** Kana reading of a minute 1-59 (30 is read はん in this app). */
export function minuteReading(minute: number): string {
  if (minute === 30) return 'はん'
  const tens = Math.floor(minute / 10)
  const ones = minute % 10
  if (ones === 0) return `${TENS_READING[tens].slice(0, -1)}っぷん` // じゅっぷん, にじゅっぷん …
  return TENS_READING[tens] + ONES_WITH_FUN[ones]
}

/** A time as two spoken parts (hour, then minute unless on the hour), each pre-rendered
 * once — 12 + 59 files instead of one per each of the 720 possible times. */
export function clockTimeSpeech(hour: number, minute: number): AnswerSpeechPart[] {
  const parts: AnswerSpeechPart[] = [{ text: HOUR_READING[hour], cacheKey: `clock-hour-${hour}` }]
  if (minute !== 0) parts.push({ text: minuteReading(minute), cacheKey: `clock-min-${minute}` })
  return parts
}

/** とけい「あわせる」's prompt (「とけいを ○じ○ぷんに あわせてね」) as cached parts. */
export const SET_TIME_PROMPT_BEFORE: AnswerSpeechPart = { text: 'とけいを', cacheKey: 'prompt-settime-before' }
export const SET_TIME_PROMPT_AFTER: AnswerSpeechPart = { text: 'に あわせてね', cacheKey: 'prompt-settime-after' }

/** VOICEVOX reads a word-initial は/へ as the particles わ/え when there's nothing around it
 * (「はち」→ わち, 「へりこぷたー」→ えりこぷたー) and clips 「さつ」 to 「さっ」 — the same words
 * written in katakana come out right. Only for what's spoken; the screen keeps hiragana. */
const KATAKANA_FOR_SPEECH = new Set(['さつ'])

export function speechSafeWord(word: string): string {
  const needsKatakana = /^[はへ]/.test(word) || KATAKANA_FOR_SPEECH.has(word)
  if (!needsKatakana || !/^[\u3041-\u3096ー]+$/.test(word)) return word
  return word.replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
}

// ---- もじ / かんじ / かぞえる / ろんり --------------------------------------------------------

export function kanaAnswerSpeech(script: 'hiragana' | 'katakana', id: string, spokenChar: string): AnswerSpeechPart {
  return { text: spokenChar, cacheKey: `answer-${script}-${id}` }
}

export function kanjiAnswerSpeech(id: string, reading: string): AnswerSpeechPart {
  return { text: reading, cacheKey: `answer-kanji-${id}` }
}

/** Just the counter's reading — the on-screen label's 「（本）」 is for the eyes only. */
export function countingAnswerSpeech(id: string, kana: string): AnswerSpeechPart {
  return { text: speechSafeWord(kana), cacheKey: `answer-counting-${id}` }
}

export function oppositeAnswerSpeech(word: string, wordKey: string): AnswerSpeechPart {
  return { text: speechSafeWord(word), cacheKey: `answer-opposite-${wordKey}` }
}

export function oddOneOutAnswerSpeech(wordId: string, translationJa: string): AnswerSpeechPart {
  return { text: speechSafeWord(translationJa), cacheKey: `answer-oddoneout-${wordId}` }
}

/** Spoken names for ろんり「パターン」's symbols, which are emoji on screen. */
export const PATTERN_SYMBOL_NAMES: Record<string, string> = {
  '🔴': 'あか', '🔵': 'あお', '🟡': 'きいろ', '🟢': 'みどり', '🟣': 'むらさき',
  '⭐️': 'ほし', '🌙': 'つき', '☀️': 'たいよう', '☁️': 'くも', '⚡️': 'かみなり',
  '🍎': 'りんご', '🍌': 'バナナ', '🍇': 'ぶどう', '🍓': 'いちご', '🍊': 'みかん',
  '🐱': 'ねこ', '🐶': 'いぬ', '🐰': 'うさぎ', '🐻': 'くま', '🐼': 'パンダ',
  '💗': 'ピンクの ハート', '💛': 'きいろの ハート', '💚': 'みどりの ハート', '💙': 'あおの ハート', '💜': 'むらさきの ハート',
}

export function patternAnswerSpeech(symbol: string): AnswerSpeechPart | null {
  const name = PATTERN_SYMBOL_NAMES[symbol]
  if (!name) return null
  return { text: name, cacheKey: `answer-pattern-${Array.from(symbol)[0].codePointAt(0)!.toString(16)}` }
}
