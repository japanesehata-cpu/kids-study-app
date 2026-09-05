import type { Lang } from '../i18n/dictionary'
import type { Category } from './types'
import type { SpeechLang } from '../lib/tts'

// Mirrors progress.ts's SET_SIZE — kept as a local constant (rather than a runtime import of
// that module) because this file is also loaded directly, via extensionless relative
// imports, by scripts/generate-tts-cache.mjs's plain `node` execution, which can't resolve
// progress.ts's own extensionless imports the way Vite/tsc can.
const MAX_SET_SIZE = 10

export interface FeedbackContext {
  correct: boolean
  /** consecutive correct count after this answer (0 when incorrect) */
  streak: number
  /** previous streak length, only set when a streak of 3+ was just broken */
  justBrokeStreak: number
  /** shown/spoken when the answer was wrong */
  correctAnswerLabel: string
  /** Cache key for the spoken `correctAnswerLabel` itself, when it's cacheable — currently
   * only englishSpelling/englishListening, where the answer is always this question's own
   * word (see `word-en-${wordId}` in public/audio, generated from the approved Kokoro
   * pronunciations). Every other category's answer (a number, hiragana char, ...) is
   * effectively unbounded and stays live/uncached. */
  answerCacheKey?: string
  /** Feedback is spoken in the current category's character voice (see voiceProfile in
   * QuizScreen.tsx), so cache keys must be namespaced per category too — otherwise every
   * category's differently-voiced take on e.g. "せいかい！すごい！" would collide on the
   * same file. */
  category: Category
}

/** One piece of the spoken feedback. `cacheKey` is only meaningful in ja — see
 * scripts/generate-tts-cache.mjs, which pre-renders every reachable key below. Omitted
 * (left undefined) for the one segment that can't be pre-rendered: the answer itself, which
 * is effectively unbounded (any number, word, clock time, hiragana char, ...).
 *
 * `speechLang` overrides the caller's default language for just this segment — needed for
 * an englishSpelling/englishListening/alphabet wrong answer, where the surrounding sentence
 * is Japanese but the answer itself ("egg", "A") is English: forcing ja-JP onto it read as a
 * garbled mix of two voices, since the app also (correctly) repeats it in en-US afterward. */
export interface FeedbackSpeechSegment {
  text: string
  cacheKey?: string
  speechLang?: SpeechLang
}

export interface FeedbackResult {
  /** Full sentence for on-screen display — unchanged regardless of how speech is split. */
  text: string
  /** Spoken in order. A correct-answer message is always a single fully-cacheable segment;
   * an incorrect-answer message is [cacheable prefix, live answer, cacheable suffix] so only
   * the answer itself ever needs a live (uncached) synthesis call. */
  speech: FeedbackSpeechSegment[]
}

function pickIndex(length: number): number {
  return Math.floor(Math.random() * length)
}

const CORRECT_NORMAL: Record<Lang, string[]> = {
  ja: [
    'せいかい！すごい！',
    'やったね！せいかい！',
    'その ちょうし！',
    'ばっちり！てんさい！',
    'せいかい！かんぺき！',
  ],
  en: [
    'Correct! Great job!',
    'Yes! You got it!',
    "That's it! Perfect!",
    'Awesome!',
    'Correct! You are amazing!',
  ],
}

const CORRECT_STREAK3: Record<Lang, string[]> = {
  ja: [
    '{streak}もんれんぞく せいかい！のってきたね！',
    'すごい！{streak}かいつづけて せいかい！',
    '{streak}もんれんぞく！とまらないね！',
  ],
  en: [
    '{streak} in a row! You are on fire!',
    'Wow, {streak} correct in a row!',
    "{streak} in a row! You can't be stopped!",
  ],
}

const CORRECT_STREAK5: Record<Lang, string[]> = {
  ja: [
    '{streak}もんれんぞく せいかい！はかせだね！',
    'とまらない！だいこうふん！{streak}もんれんぞく！',
    'すごすぎる！{streak}もんも れんぞく せいかい！',
  ],
  en: [
    '{streak} in a row! You are a genius!',
    "Incredible! {streak} in a row and counting!",
    'Unstoppable! {streak} correct in a row!',
  ],
}

// Spot-the-difference has no single "correct answer" to slot into INCORRECT_NORMAL's
// {answer} placeholder (that pool assumes a number/word/char), so a failed round — the
// wrong-tap limit was reached before every difference was found — gets its own pool
// instead of an awkward blank fill-in.
const SPOT_DIFFERENCE_FAILED: Record<Lang, string[]> = {
  ja: [
    'ざんねん！まちがいが おおくなっちゃった。またチャレンジしてね！',
    'おしい！つぎは もっと じっくり くらべてみよう！',
    'だいじょうぶ！れんしゅうすれば きっと できるようになるよ！',
  ],
  en: [
    "Oh no! Too many wrong taps this time. Let's try again!",
    'So close! Take a closer look next time!',
    "That's okay — practice makes perfect!",
  ],
}

const INCORRECT_NORMAL: Record<Lang, string[]> = {
  ja: [
    'おしい！こたえは {answer} だよ。つぎ いこう！',
    'だいじょうぶ！こたえは {answer}。もういっかい チャレンジしよう！',
    'おしい～！{answer} だったね。つぎは できるよ！',
    'にがてかな？こたえは {answer}。いっしょに がんばろう！',
  ],
  en: [
    'Not quite! The answer was {answer}. Next one!',
    "That's okay! It was {answer}. Let's try again!",
    'So close! The answer was {answer}. You can do it!',
    "Let's practice this one. The answer was {answer}!",
  ],
}

const INCORRECT_AFTER_STREAK: Record<Lang, string[]> = {
  ja: [
    'おしい！でも {justBrokeStreak}もんれんぞくの きろく、すごかったよ！つぎも がんばろう！',
    '{justBrokeStreak}れんぞく、よくがんばったね！こたえは {answer} だよ、また ちょうせんしよう！',
  ],
  en: [
    'So close! But that {justBrokeStreak}-streak was amazing! Let’s start a new one!',
    "Great {justBrokeStreak}-streak! The answer was {answer} — let's go again!",
  ],
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match))
}

/** Splits a template on its (single) `{answer}` placeholder into the text before and after
 * it — derived from the same template string used for display, so the two can never drift
 * out of sync with each other. A template with no `{answer}` (shouldn't happen for the
 * incorrect-message pools, but keeps this total) puts everything in `before`. */
function splitOnAnswerPlaceholder(template: string): { before: string; after: string } {
  const placeholder = '{answer}'
  const idx = template.indexOf(placeholder)
  if (idx === -1) return { before: template, after: '' }
  return { before: template.slice(0, idx).trimEnd(), after: template.slice(idx + placeholder.length).trimStart() }
}

export function buildFeedbackMessage(ctx: FeedbackContext, lang: Lang): FeedbackResult {
  const vars = {
    streak: ctx.streak,
    justBrokeStreak: ctx.justBrokeStreak,
    answer: ctx.correctAnswerLabel,
  }

  if (ctx.correct) {
    const [pool, poolKey, streakForKey] =
      ctx.streak >= 5
        ? ([CORRECT_STREAK5, 'streak5', ctx.streak] as const)
        : ctx.streak >= 3
          ? ([CORRECT_STREAK3, 'streak3', ctx.streak] as const)
          : ([CORRECT_NORMAL, 'normal', null] as const)
    const idx = pickIndex(pool[lang].length)
    const text = interpolate(pool[lang][idx], vars)
    const cacheKey =
      lang === 'ja'
        ? `feedback-${ctx.category}-correct-${poolKey}${streakForKey !== null ? `-${streakForKey}` : ''}-${idx}`
        : undefined
    return { text, speech: [{ text, cacheKey }] }
  }

  const usingAfterStreak = ctx.justBrokeStreak >= 3
  const pool = usingAfterStreak ? INCORRECT_AFTER_STREAK : INCORRECT_NORMAL
  const idx = pickIndex(pool[lang].length)
  const template = pool[lang][idx]
  const text = interpolate(template, vars)

  const { before, after } = splitOnAnswerPlaceholder(template)
  const beforeText = interpolate(before, vars)
  const afterText = interpolate(after, vars)
  const poolKey = usingAfterStreak ? 'afterstreak' : 'normal'
  const keySuffix = usingAfterStreak ? `-${ctx.justBrokeStreak}` : ''
  const beforeCacheKey =
    lang === 'ja' ? `feedback-${ctx.category}-incorrect-${poolKey}${keySuffix}-${idx}-before` : undefined
  const afterCacheKey =
    lang === 'ja' ? `feedback-${ctx.category}-incorrect-${poolKey}${keySuffix}-${idx}-after` : undefined

  // Not every incorrect-feedback template actually mentions the answer (e.g. one
  // after-streak variant is pure encouragement) — only speak it when the template placed it.
  const mentionsAnswer = template.includes('{answer}')

  const speech: FeedbackSpeechSegment[] = []
  if (beforeText) speech.push({ text: beforeText, cacheKey: beforeCacheKey })
  if (mentionsAnswer) {
    const answerSpeechLang =
      ctx.category === 'englishSpelling' || ctx.category === 'englishListening' || ctx.category === 'alphabet'
        ? 'en-US'
        : undefined
    speech.push({ text: ctx.correctAnswerLabel, speechLang: answerSpeechLang, cacheKey: ctx.answerCacheKey })
  }
  if (afterText) speech.push({ text: afterText, cacheKey: afterCacheKey })

  return { text, speech }
}

/** Spot-the-difference's failure case (wrong-tap limit reached) — kept separate from
 * buildFeedbackMessage since SPOT_DIFFERENCE_FAILED has no {answer} to interpolate. */
export function buildSpotDifferenceFailedFeedback(lang: Lang): FeedbackResult {
  const idx = pickIndex(SPOT_DIFFERENCE_FAILED[lang].length)
  const text = SPOT_DIFFERENCE_FAILED[lang][idx]
  const cacheKey = lang === 'ja' ? `feedback-spotDifference-failed-${idx}` : undefined
  return { text, speech: [{ text, cacheKey }] }
}

/** One cacheable (text, cacheKey) pair reachable from buildFeedbackMessage in ja for one
 * category's voice — every template index crossed with every streak/justBrokeStreak value
 * that can actually occur, given the largest set size the level picker offers (see
 * scripts/generate-tts-cache.mjs). */
export interface FeedbackCacheEntry {
  cacheKey: string
  text: string
}

export function enumerateFeedbackCacheEntries(category: Category): FeedbackCacheEntry[] {
  const entries: FeedbackCacheEntry[] = []
  const vars = (extra: Record<string, string | number> = {}) => extra
  const prefix = `feedback-${category}`

  CORRECT_NORMAL.ja.forEach((template, idx) => {
    entries.push({ cacheKey: `${prefix}-correct-normal-${idx}`, text: interpolate(template, vars()) })
  })
  for (let streak = 3; streak <= 4; streak++) {
    CORRECT_STREAK3.ja.forEach((template, idx) => {
      entries.push({
        cacheKey: `${prefix}-correct-streak3-${streak}-${idx}`,
        text: interpolate(template, vars({ streak })),
      })
    })
  }
  for (let streak = 5; streak <= MAX_SET_SIZE; streak++) {
    CORRECT_STREAK5.ja.forEach((template, idx) => {
      entries.push({
        cacheKey: `${prefix}-correct-streak5-${streak}-${idx}`,
        text: interpolate(template, vars({ streak })),
      })
    })
  }

  INCORRECT_NORMAL.ja.forEach((template, idx) => {
    const { before, after } = splitOnAnswerPlaceholder(template)
    const beforeText = interpolate(before, vars())
    const afterText = interpolate(after, vars())
    if (beforeText) entries.push({ cacheKey: `${prefix}-incorrect-normal-${idx}-before`, text: beforeText })
    if (afterText) entries.push({ cacheKey: `${prefix}-incorrect-normal-${idx}-after`, text: afterText })
  })
  for (let justBrokeStreak = 3; justBrokeStreak <= MAX_SET_SIZE - 1; justBrokeStreak++) {
    INCORRECT_AFTER_STREAK.ja.forEach((template, idx) => {
      const { before, after } = splitOnAnswerPlaceholder(template)
      const beforeText = interpolate(before, vars({ justBrokeStreak }))
      const afterText = interpolate(after, vars({ justBrokeStreak }))
      if (beforeText) {
        entries.push({ cacheKey: `${prefix}-incorrect-afterstreak-${justBrokeStreak}-${idx}-before`, text: beforeText })
      }
      if (afterText) {
        entries.push({ cacheKey: `${prefix}-incorrect-afterstreak-${justBrokeStreak}-${idx}-after`, text: afterText })
      }
    })
  }

  if (category === 'spotDifference') {
    SPOT_DIFFERENCE_FAILED.ja.forEach((text, idx) => {
      entries.push({ cacheKey: `feedback-spotDifference-failed-${idx}`, text })
    })
  }

  return entries
}
