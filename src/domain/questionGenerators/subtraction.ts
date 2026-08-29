import type { ArithmeticQuestion, Level } from '../types'
import { buildSubtractionStory } from './wordProblems'

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function makeId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Minuend bands per level — each strictly higher than the last (mirrors addition's
 * SUM_BAND), so ★3-★5 no longer collapse into one identical range. ★1/★2 stay
 * single-digit, where borrowing doesn't apply. */
const MINUEND_BAND: Record<Level, [number, number]> = {
  1: [2, 5],
  2: [6, 10],
  3: [11, 13],
  4: [14, 16],
  5: [17, 18],
}

/** How often ★3+ draws a subtrahend that forces borrowing across the tens place (13 - 7,
 * say) rather than one the ones digit alone covers (13 - 3) — climbing from "sometimes"
 * to "always" is what makes ★5 the hardest tier even though ★3-★5 all use two-digit
 * minuends. */
const BORROW_CHANCE: Record<Level, number> = {
  1: 0,
  2: 0,
  3: 0.5,
  4: 0.8,
  5: 1,
}

function pickSubtrahend(a: number, level: Level): number {
  if (level <= 2) return randomInt(1, a)
  const onesDigit = a % 10
  const mustBorrow = Math.random() < BORROW_CHANCE[level]
  if (mustBorrow) return randomInt(onesDigit + 1, a - 1)
  return randomInt(1, onesDigit)
}

export function generateSubtractionQuestion(level: Level): ArithmeticQuestion {
  const [min, max] = MINUEND_BAND[level]
  const a = randomInt(min, max)
  const b = pickSubtrahend(a, level)
  const requiresBorrow = level >= 3 && b > a % 10
  const story = level >= 3 && Math.random() < 0.5 ? buildSubtractionStory(a, b) : undefined

  return {
    id: makeId(),
    category: 'subtraction',
    level,
    operandA: a,
    operandB: b,
    answer: a - b,
    // Every level shows the apple visual now, mirroring addition — watching apples get
    // taken away is what makes "takeaway" click, not just the ★1 (4yo) easy cases.
    showVisual: true,
    story,
    subSkill: level <= 2 ? 'subtraction-basic' : requiresBorrow ? 'subtraction-borrow' : 'subtraction-extended',
  }
}
