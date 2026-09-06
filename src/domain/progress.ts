import type {
  AnswerRecord,
  Category,
  EnglishWordQuestion,
  Level,
  ProgressState,
  Question,
  SetResult,
} from './types'
import { generateAdditionQuestion } from './questionGenerators/addition'
import { generateSubtractionQuestion } from './questionGenerators/subtraction'
import { generateEnglishSpellingQuestion, generateEnglishListeningQuestion } from './questionGenerators/englishWords'
import { generateEnglishSentenceQuestion } from './questionGenerators/englishSentence'
import { generateLogicQuestion } from './questionGenerators/logic'
import { generateHiraganaQuestion } from './questionGenerators/hiragana'
import { generateKatakanaQuestion } from './questionGenerators/katakana'
import { shuffle } from '../lib/shuffle'
import { generateAlphabetQuestion } from './questionGenerators/alphabet'
import { generateClockQuestion } from './questionGenerators/clock'
import { generateSpotDifferenceQuestion } from './questionGenerators/spotDifference'
import { generateCountingQuestion } from './questionGenerators/counting'
import { loadProgressJson, saveProgressJson } from '../lib/storage'

export const SET_SIZE = 10
/** Kept for the categories that still use the full 5-step scale. */
export const MAX_LEVEL: Level = 5

/** logic/englishSpelling/englishListening/alphabet/clock/spotDifference/counting are scaled
 * to 3 steps (★1-3, ages 4/5/6) instead of the original 5 — see LevelSelectScreen, which
 * reads this to size its level grid. addition/subtraction/hiragana/katakana go further:
 * addition/subtraction add ★4, a deliberately abstract (no apple visual, no word-problem
 * framing) milestone mixing a still-harder single-digit sum/minuend with a new round-tens
 * skill (20+30-style — see questionGenerators/{addition,subtraction}.ts). hiragana's ★4 is
 * a dedicated 拗音 (youon) milestone, and katakana alone adds ★5 for 外来語表記 (gairaigo) —
 * extended katakana used only for loanword sounds, with no hiragana equivalent (see
 * questionGenerators/katakana.ts). */
export const CATEGORY_MAX_LEVEL: Record<Category, Level> = {
  addition: 4,
  subtraction: 4,
  englishSpelling: 3,
  englishListening: 3,
  logic: 3,
  hiragana: 4,
  katakana: 5,
  alphabet: 3,
  clock: 3,
  spotDifference: 3,
  counting: 3,
  englishSentence: 3,
}

export function getCategoryMaxLevel(category: Category): Level {
  return CATEGORY_MAX_LEVEL[category]
}

const REVIEW_SLOTS = 3
const REVIEW_QUEUE_CAP = 12
const LEVEL_UP_THRESHOLD = 0.8
const HISTORY_LENGTH = 2

export function createInitialProgress(): ProgressState {
  return {
    addition: { level: 1, recentAccuracy: [], reviewQueue: [] },
    subtraction: { level: 1, recentAccuracy: [], reviewQueue: [] },
    englishSpelling: { level: 1, recentAccuracy: [], reviewQueue: [] },
    englishListening: { level: 1, recentAccuracy: [], reviewQueue: [] },
    logic: { level: 1, recentAccuracy: [], reviewQueue: [] },
    hiragana: { level: 1, recentAccuracy: [], reviewQueue: [] },
    katakana: { level: 1, recentAccuracy: [], reviewQueue: [] },
    alphabet: { level: 1, recentAccuracy: [], reviewQueue: [] },
    clock: { level: 1, recentAccuracy: [], reviewQueue: [] },
    spotDifference: { level: 1, recentAccuracy: [], reviewQueue: [] },
    counting: { level: 1, recentAccuracy: [], reviewQueue: [] },
    englishSentence: { level: 1, recentAccuracy: [], reviewQueue: [] },
  }
}

/** Drops a reviewQueue entry whose shape predates a mechanic rewrite for its category —
 * e.g. a spotDifference question saved to localStorage before it became a tap-the-board
 * game, still carrying the old choice-based fields (and, later, before the fixed-grid
 * tile version became scattered scene items — leftIconIds/rightSlots replaced by
 * leftItems/rightItems). Replaying it as-is would crash the board instead of just
 * looking wrong, so it's safer to discard than reuse — same class of bug as addition's
 * stale showVisual field, but here the shape itself is incompatible. */
function isCompatibleQuestion(q: Question): boolean {
  if (q.category === 'spotDifference') {
    return Array.isArray(q.leftItems) && Array.isArray(q.rightItems) && Array.isArray(q.differenceIndexes)
  }
  if (q.category === 'englishSentence') {
    // Guards against a stored reviewQueue entry from before correctColorId/choiceColorIds
    // were renamed to correctWordId/choiceWordIds (see questionGenerators/
    // englishSentence.ts) — an old-shaped entry would otherwise resurface with
    // correctWordId undefined and crash getWordById downstream.
    return typeof q.correctWordId === 'string' && Array.isArray(q.choiceWordIds)
  }
  return true
}

function sanitizeCategoryProgress(
  category: Category,
  stored: ProgressState[Category] | undefined,
  fallback: ProgressState[Category],
): ProgressState[Category] {
  const maxLevel = CATEGORY_MAX_LEVEL[category]
  if (!stored || typeof stored.level !== 'number' || stored.level < 1 || stored.level > maxLevel) {
    return fallback
  }
  return {
    ...stored,
    reviewQueue: Array.isArray(stored.reviewQueue) ? stored.reviewQueue.filter(isCompatibleQuestion) : [],
  }
}

export function loadProgress(): ProgressState {
  const raw = loadProgressJson()
  if (!raw) return createInitialProgress()
  try {
    const parsed = JSON.parse(raw) as Partial<ProgressState>
    const initial = createInitialProgress()
    return {
      addition: sanitizeCategoryProgress('addition', parsed.addition, initial.addition),
      subtraction: sanitizeCategoryProgress('subtraction', parsed.subtraction, initial.subtraction),
      englishSpelling: sanitizeCategoryProgress('englishSpelling', parsed.englishSpelling, initial.englishSpelling),
      englishListening: sanitizeCategoryProgress(
        'englishListening',
        parsed.englishListening,
        initial.englishListening,
      ),
      logic: sanitizeCategoryProgress('logic', parsed.logic, initial.logic),
      hiragana: sanitizeCategoryProgress('hiragana', parsed.hiragana, initial.hiragana),
      katakana: sanitizeCategoryProgress('katakana', parsed.katakana, initial.katakana),
      alphabet: sanitizeCategoryProgress('alphabet', parsed.alphabet, initial.alphabet),
      clock: sanitizeCategoryProgress('clock', parsed.clock, initial.clock),
      spotDifference: sanitizeCategoryProgress('spotDifference', parsed.spotDifference, initial.spotDifference),
      counting: sanitizeCategoryProgress('counting', parsed.counting, initial.counting),
      englishSentence: sanitizeCategoryProgress('englishSentence', parsed.englishSentence, initial.englishSentence),
    }
  } catch {
    return createInitialProgress()
  }
}

export function persistProgress(progress: ProgressState): void {
  saveProgressJson(JSON.stringify(progress))
}

function generateFreshQuestion(category: Category, level: Level): Question {
  switch (category) {
    case 'addition':
      return generateAdditionQuestion(level)
    case 'subtraction':
      return generateSubtractionQuestion(level)
    case 'englishSpelling':
      return generateEnglishSpellingQuestion(level)
    case 'englishListening':
      return generateEnglishListeningQuestion(level)
    case 'logic':
      return generateLogicQuestion(level)
    case 'hiragana':
      return generateHiraganaQuestion(level)
    case 'katakana':
      return generateKatakanaQuestion(level)
    case 'alphabet':
      return generateAlphabetQuestion(level)
    case 'clock':
      return generateClockQuestion(level)
    case 'spotDifference':
      return generateSpotDifferenceQuestion(level)
    case 'counting':
      return generateCountingQuestion(level)
    case 'englishSentence':
      return generateEnglishSentenceQuestion(level)
  }
}

// A plain `if (q.category === 'englishSpelling') ... if (q.category === 'englishListening')
// ...` chain doesn't fully narrow EnglishWordQuestion away afterward — TS doesn't always
// accumulate exclusions across separate checks against a multi-literal discriminant the
// way it does for a single-literal one. An explicit type predicate sidesteps that.
function isEnglishWordQuestion(q: Question): q is EnglishWordQuestion {
  return q.category === 'englishSpelling' || q.category === 'englishListening'
}

function questionSignature(q: Question): string {
  if (isEnglishWordQuestion(q)) return `word:${q.wordId}:${q.mode}`
  if (q.category === 'logic') return `logic:${q.kind}:${[...q.choices].sort().join(',')}`
  if (q.category === 'hiragana') return `hiragana:${q.charId}`
  if (q.category === 'katakana') return `katakana:${q.charId}`
  if (q.category === 'alphabet') return `alphabet:${q.letterId}:${q.kind}:${q.answerChar}`
  if (q.category === 'clock') return `clock:${q.hour}:${q.minute}`
  if (q.category === 'spotDifference') {
    return `spot:${q.leftItems.map((i) => i.iconId).join(',')}:${q.differenceIndexes.join(',')}`
  }
  if (q.category === 'counting') return `counting:${q.targetWordId}:${q.count}:${q.displayIds.length}`
  if (q.category === 'englishSentence') return `sentence:${q.sentenceId}`
  return `${q.category}:${q.operandA}:${q.operandB}`
}

function dedupeBySignature(questions: Question[]): Question[] {
  const seen = new Set<string>()
  const result: Question[] = []
  for (const q of questions) {
    const sig = questionSignature(q)
    if (seen.has(sig)) continue
    seen.add(sig)
    result.push(q)
  }
  return result
}

/** Builds one question set at the given (manually chosen) level and size: a few review items first, filled out with fresh questions. */
export function generateQuestionSet(
  category: Category,
  level: Level,
  reviewQueue: Question[],
  setSize: number = SET_SIZE,
): Question[] {
  const reviewSlots = setSize >= 10 ? REVIEW_SLOTS : 1
  const reviewItems = reviewQueue.slice(0, reviewSlots)
  const questions: Question[] = [...reviewItems]

  const seen = new Set(questions.map(questionSignature))
  let guard = 0
  while (questions.length < setSize && guard < setSize * 20) {
    guard++
    const candidate = generateFreshQuestion(category, level)
    const signature = questionSignature(candidate)
    if (seen.has(signature)) continue
    seen.add(signature)
    questions.push(candidate)
  }

  return shuffle(questions)
}

function groupBySubSkill(answers: AnswerRecord[]): Record<string, { correct: number; total: number }> {
  const map: Record<string, { correct: number; total: number }> = {}
  for (const a of answers) {
    const bucket = map[a.subSkill] ?? { correct: 0, total: 0 }
    bucket.total += 1
    if (a.correct) bucket.correct += 1
    map[a.subSkill] = bucket
  }
  return map
}

/** Only meaningful when a set contains 2+ distinct sub-skills (e.g. review items from an earlier level)
 * AND those sub-skills' accuracy actually differs — if every sub-skill ties (e.g. 0% or 100% across
 * the board, common with small sample sizes), strong/weak would otherwise both resolve to the same
 * sub-skill, showing it as a "strength" and a "needs practice" item at once. In that case both come
 * back null and the result screen falls back to its neutral all-good message instead. */
function pickExtremes(
  bySubSkill: Record<string, { correct: number; total: number }>,
): { strongSubSkill: string | null; weakSubSkill: string | null } {
  const entries = Object.entries(bySubSkill)
  if (entries.length < 2) return { strongSubSkill: null, weakSubSkill: null }

  let strong: [string, number] = [entries[0][0], entries[0][1].correct / entries[0][1].total]
  let weak = strong
  for (const [subSkill, stats] of entries) {
    const rate = stats.correct / stats.total
    if (rate > strong[1]) strong = [subSkill, rate]
    if (rate < weak[1]) weak = [subSkill, rate]
  }
  if (strong[0] === weak[0]) return { strongSubSkill: null, weakSubSkill: null }
  return { strongSubSkill: strong[0], weakSubSkill: weak[0] }
}

/**
 * Applies the results of a set played at `playedLevel` (chosen manually on LevelSelectScreen —
 * not necessarily the level currently stored in progress). Two strong sets in a row at the same
 * level bumps the stored level up by one (as a "try the next level" suggestion); the level is
 * never lowered automatically — going easier is always the player's manual choice.
 */
export function applySetResult(
  category: Category,
  playedLevel: Level,
  progress: ProgressState,
  answers: AnswerRecord[],
): { progress: ProgressState; result: SetResult } {
  const categoryProgress = progress[category]
  const correctCount = answers.filter((a) => a.correct).length
  const accuracy = correctCount / answers.length

  const baseRecentAccuracy = categoryProgress.level === playedLevel ? categoryProgress.recentAccuracy : []
  const recentAccuracy = [...baseRecentAccuracy, accuracy].slice(-HISTORY_LENGTH)

  let level = playedLevel
  let nextRecentAccuracy = recentAccuracy
  let leveledUp = false

  if (recentAccuracy.length === HISTORY_LENGTH) {
    const allStrong = recentAccuracy.every((a) => a >= LEVEL_UP_THRESHOLD)
    if (allStrong && level < CATEGORY_MAX_LEVEL[category]) {
      level = (level + 1) as Level
      nextRecentAccuracy = []
      leveledUp = true
    }
  }

  const answeredSignatures = new Set(answers.map((a) => questionSignature(a.question)))
  const stillOutstandingReview = categoryProgress.reviewQueue.filter(
    (q) => !answeredSignatures.has(questionSignature(q)),
  )
  const newlyMissed = answers.filter((a) => !a.correct).map((a) => a.question)
  const reviewQueue = dedupeBySignature([...stillOutstandingReview, ...newlyMissed]).slice(
    -REVIEW_QUEUE_CAP,
  )

  const nextProgress: ProgressState = {
    ...progress,
    [category]: { level, recentAccuracy: nextRecentAccuracy, reviewQueue },
  }

  const bySubSkill = groupBySubSkill(answers)
  const { strongSubSkill, weakSubSkill } = pickExtremes(bySubSkill)

  let bestStreak = 0
  let currentStreak = 0
  for (const a of answers) {
    currentStreak = a.correct ? currentStreak + 1 : 0
    bestStreak = Math.max(bestStreak, currentStreak)
  }

  return {
    progress: nextProgress,
    result: {
      category,
      answers,
      accuracy,
      strongSubSkill,
      weakSubSkill,
      bestStreak,
      leveledUp,
    },
  }
}
