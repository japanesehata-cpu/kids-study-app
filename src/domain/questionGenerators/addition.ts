import type { ArithmeticQuestion, Level } from '../types'
import { buildAdditionStory } from './wordProblems'

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function makeId(): string {
  return `add-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Sum bands per level — each level's range is strictly higher than the last, so the
 * numbers involved (and, once the sum passes 10, whether carrying is required at all)
 * keep climbing from ★1 to ★4. ★4's band merges what would have been two separate bands
 * (14-16, 17-18) into one — the harder single-digit tier. ★5 doesn't use this band at all
 * (it's the round-tens skill, see generateTensOperands); kept here only so this Record's
 * type checks against the full Level union. */
const SUM_BAND: Record<Level, [number, number]> = {
  1: [2, 5],
  2: [6, 10],
  3: [11, 13],
  4: [14, 18],
  5: [14, 18],
}

function generateOperands(level: Level): { a: number; b: number } {
  const [min, max] = SUM_BAND[level]
  const sum = randomInt(min, max)
  const a = randomInt(Math.max(1, sum - 9), Math.min(9, sum - 1))
  const b = sum - a
  return { a, b }
}

/** ★4's round-tens half — 20+30-style, one digit's worth of addition scaled up by 10
 * (10-90 instead of 1-9), so it reads as the exact same "combine two piles, maybe carry"
 * logic a 6yo already knows, just with the tens place standing in for the ones place.
 * Deliberately capped so the sum never exceeds 90 (a two-digit round number) — going into
 * three digits would be a different, harder skill (carrying into the hundreds), not this
 * one. */
function generateTensOperands(): { a: number; b: number } {
  const tensSum = randomInt(2, 9) // sum/10, so the actual sum lands on 20-90
  const tensA = randomInt(Math.max(1, tensSum - 9), Math.min(9, tensSum - 1))
  const tensB = tensSum - tensA
  return { a: tensA * 10, b: tensB * 10 }
}

export function generateAdditionQuestion(level: Level): ArithmeticQuestion {
  // ★4 and ★5 are two distinct harder skills — a still-bigger single-digit sum
  // (continuing the ★1-3 progression) and the new round-tens skill — each its own clean
  // level rather than a coin flip blending them within one level (see the
  // level-redefinition discussion this was split from).
  const useTens = level === 5
  const { a, b } = useTens ? generateTensOperands() : generateOperands(level)
  // ★4/★5 are deliberately abstract — no apple visual, no word-problem framing — since
  // neither scales to a round-tens sum (50 apples, or "20 apples" in a sentence, both read
  // oddly) and the whole point of these levels is practicing the bare equation.
  const story = level === 3 && Math.random() < 0.5 ? buildAdditionStory(a, b) : undefined
  return {
    id: makeId(),
    category: 'addition',
    level,
    operandA: a,
    operandB: b,
    answer: a + b,
    showVisual: level < 4,
    story,
    subSkill: useTens ? 'addition-tens' : a + b < 10 ? 'addition-no-carry' : 'addition-carry',
  }
}
