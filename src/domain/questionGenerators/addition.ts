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
 * keep climbing all the way from ★1 to ★5 instead of ★3-★5 sharing one identical band. */
const SUM_BAND: Record<Level, [number, number]> = {
  1: [2, 5],
  2: [6, 10],
  3: [11, 13],
  4: [14, 16],
  5: [17, 18],
}

function generateOperands(level: Level): { a: number; b: number } {
  const [min, max] = SUM_BAND[level]
  const sum = randomInt(min, max)
  const a = randomInt(Math.max(1, sum - 9), Math.min(9, sum - 1))
  const b = sum - a
  return { a, b }
}

export function generateAdditionQuestion(level: Level): ArithmeticQuestion {
  const { a, b } = generateOperands(level)
  const story = level >= 3 && Math.random() < 0.5 ? buildAdditionStory(a, b) : undefined
  return {
    id: makeId(),
    category: 'addition',
    level,
    operandA: a,
    operandB: b,
    answer: a + b,
    // Every level shows the apple visual now — seeing the two groups combine is what
    // makes the equation click, not just the ★3 (6yo) carrying cases.
    showVisual: true,
    story,
    subSkill: a + b < 10 ? 'addition-no-carry' : 'addition-carry',
  }
}
