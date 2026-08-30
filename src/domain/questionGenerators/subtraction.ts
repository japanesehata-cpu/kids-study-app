import type { ArithmeticQuestion, Level } from '../types'
import { buildSubtractionStory } from './wordProblems'

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function makeId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Minuend bands per level — each strictly higher than the last (mirrors addition's
 * SUM_BAND). ★1/★2 stay single-digit, where borrowing doesn't apply. ★4's single-digit-
 * operand half merges what would have been two separate bands (14-16, 17-18) into one,
 * since ★4 is the last level for this category (see CATEGORY_MAX_LEVEL) — the harder half
 * of its content is the round-tens branch below, not a still-higher minuend band. */
const MINUEND_BAND: Record<Level, [number, number]> = {
  1: [2, 5],
  2: [6, 10],
  3: [11, 13],
  4: [14, 18],
  // ★5 is never reached (CATEGORY_MAX_LEVEL caps subtraction at ★4) — kept only so this
  // Record's type checks against the full Level union.
  5: [14, 18],
}

/** How often ★3+ draws a subtrahend that forces borrowing across the tens place (13 - 7,
 * say) rather than one the ones digit alone covers (13 - 3). */
const BORROW_CHANCE: Record<Level, number> = {
  1: 0,
  2: 0,
  3: 0.5,
  4: 0.9,
  5: 0.9,
}

function pickSubtrahend(a: number, level: Level): number {
  if (level <= 2) return randomInt(1, a)
  const onesDigit = a % 10
  const mustBorrow = Math.random() < BORROW_CHANCE[level]
  if (mustBorrow) return randomInt(onesDigit + 1, a - 1)
  return randomInt(1, onesDigit)
}

/** ★4's round-tens half — 50-20-style, one digit's worth of subtraction scaled up by 10
 * (10-90 instead of 1-9), mirroring addition's generateTensOperands. Subtrahend is always
 * strictly less than the minuend so the result stays positive. */
function generateTensOperands(): { a: number; b: number } {
  const tensA = randomInt(2, 9) // minuend/10, so the actual minuend lands on 20-90
  const tensB = randomInt(1, tensA - 1)
  return { a: tensA * 10, b: tensB * 10 }
}

export function generateSubtractionQuestion(level: Level): ArithmeticQuestion {
  // ★4 splits evenly between two harder-but-different skills — a still-bigger single-digit
  // minuend (continuing the ★1-3 progression) and the new round-tens skill.
  const useTens = level === 4 && Math.random() < 0.5
  let a: number
  let b: number
  if (useTens) {
    ;({ a, b } = generateTensOperands())
  } else {
    const [min, max] = MINUEND_BAND[level]
    a = randomInt(min, max)
    b = pickSubtrahend(a, level)
  }
  const requiresBorrow = !useTens && level >= 3 && b > a % 10
  // ★4 is deliberately abstract — no apple visual, no word-problem framing — since neither
  // scales to a round-tens difference (50 apples, or "20 apples" in a sentence, both read
  // oddly) and the whole point of this level is practicing the bare equation.
  const story = level === 3 && Math.random() < 0.5 ? buildSubtractionStory(a, b) : undefined

  return {
    id: makeId(),
    category: 'subtraction',
    level,
    operandA: a,
    operandB: b,
    answer: a - b,
    showVisual: level < 4,
    story,
    subSkill: useTens
      ? 'subtraction-tens'
      : level <= 2
        ? 'subtraction-basic'
        : requiresBorrow
          ? 'subtraction-borrow'
          : 'subtraction-extended',
  }
}
