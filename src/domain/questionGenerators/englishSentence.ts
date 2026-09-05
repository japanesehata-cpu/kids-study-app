import type { EnglishSentenceQuestion, Level } from '../types'
import { colorSentenceBank } from '../colorSentenceBank'
import { shuffle } from '../../lib/shuffle'

function makeId(): string {
  return `sentence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Which colors read as visually/conceptually close — used to make ★3 distractors
 * genuinely hard to eliminate (e.g. red vs maroon vs pink) instead of always obviously
 * wrong (e.g. red vs blue). Every choice here already shares wordBank's 'color' category,
 * so englishWords.ts's same-category-distractor trick can't do this job on its own —
 * needs its own hue-family grouping instead. Validated live: ★3 "blueberry" correctly
 * drew navy/turquoise/blue/purple as its 4 choices. 'orange' is deliberately absent — see
 * colorSentenceBank.ts for why. */
const COLOR_FAMILY: Record<string, string> = {
  red: 'warm-red', maroon: 'warm-red', pink: 'warm-red',
  brown: 'warm-orange', beige: 'warm-orange', gold: 'warm-orange',
  yellow: 'warm-yellow',
  green: 'green',
  blue: 'cool-blue', navy: 'cool-blue', turquoise: 'cool-blue', indigo: 'cool-blue',
  purple: 'cool-purple',
  gray: 'neutral', silver: 'neutral', white: 'neutral', black: 'neutral',
}

const ALL_COLOR_IDS = Object.keys(COLOR_FAMILY)

/** Same curve as englishWords.ts's shouldUseHardDistractors — ★1 always easy, ★2 a coin
 * flip, ★3+ always hard. This category caps at ★3 (see CATEGORY_MAX_LEVEL), so this covers
 * its full range. */
function shouldUseHardDistractors(level: Level): boolean {
  if (level <= 1) return false
  if (level === 2) return Math.random() < 0.5
  return true
}

function pickDistractors(correctColorId: string, hard: boolean): string[] {
  const family = COLOR_FAMILY[correctColorId]
  const sameFamily = ALL_COLOR_IDS.filter((c) => c !== correctColorId && COLOR_FAMILY[c] === family)
  const pool = hard && sameFamily.length >= 3 ? sameFamily : ALL_COLOR_IDS.filter((c) => c !== correctColorId)
  return shuffle(pool).slice(0, 3)
}

export function generateEnglishSentenceQuestion(level: Level): EnglishSentenceQuestion {
  const entry = shuffle(colorSentenceBank)[0]
  const hard = shouldUseHardDistractors(level)
  const distractors = pickDistractors(entry.colorId, hard)
  const choiceColorIds = shuffle([entry.colorId, ...distractors])

  return {
    id: makeId(),
    category: 'englishSentence',
    level,
    sentenceId: entry.id,
    question: entry.question,
    correctColorId: entry.colorId,
    choiceColorIds,
    subSkill: 'sentence-color',
  }
}
