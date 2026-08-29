import type { ArithmeticQuestion, Level } from '../types'
import { buildSubtractionStory } from './wordProblems'

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function makeId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Minuend bands per level: ★1 age 4, ★2 age 5, ★3 age 6 — the subtrahend never exceeds
 * the minuend's ones digit, so ★3 never requires borrowing across the tens place. */
const MINUEND_BAND: Record<Level, [number, number]> = {
  1: [2, 5],
  2: [6, 10],
  3: [11, 18],
  4: [11, 18],
  5: [11, 18],
}

export function generateSubtractionQuestion(level: Level): ArithmeticQuestion {
  const [min, max] = MINUEND_BAND[level]
  const a = randomInt(min, max)
  const b = a <= 10 ? randomInt(1, a) : randomInt(1, a % 10)
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
    subSkill: a <= 10 ? 'subtraction-basic' : 'subtraction-extended',
  }
}
