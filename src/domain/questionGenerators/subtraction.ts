import type { ArithmeticQuestion, Level } from '../types'
import { buildSubtractionStory } from './wordProblems'

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function makeId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Minuend bands per level — ★1/★2 stay single-digit, where borrowing doesn't apply. ★3
 * introduces 2-digit minuends without forcing a borrow yet; ★4 widens to the full 11-18
 * two-digit range and forces borrowing every time (see mustBorrowForLevel) — merging what
 * used to be ★3's harder half and ★4's already-mostly-borrow band into one clean tier,
 * rather than splitting the minuend-band and borrow-forcing axes independently (which
 * would need more than 5 total levels — see the level-redefinition discussion this was
 * simplified from). ★3's band goes up to 14, not 13, because a no-borrow subtrahend is
 * capped at the minuend's own ones digit (11 only ever allows b=1) — 11-13 alone yields
 * just 6 distinct (a, b) pairs, one short of a 10-question set; 11-14 yields 10, exactly
 * enough. ★5 doesn't use this band at all (it's the round-tens skill); kept here only so
 * this Record's type checks against the full Level union. ★6 doesn't use it either (its
 * minuend comes from the answer-first pick in generateTwentiesOperands below). */
const MINUEND_BAND: Record<Level, [number, number]> = {
  1: [2, 5],
  2: [6, 10],
  3: [11, 14],
  4: [11, 18],
  5: [11, 18],
  6: [11, 18],
}

/** Whether ★-level forces a subtrahend that borrows across the tens place (13 - 7) rather
 * than one the ones digit alone covers (13 - 3) — a fixed yes/no per level, not a
 * probability, so a level is never a blend of borrowing and non-borrowing questions. */
function mustBorrowForLevel(level: Level): boolean {
  return level >= 4
}

function pickSubtrahend(a: number, level: Level): number {
  if (level <= 2) return randomInt(1, a)
  const onesDigit = a % 10
  if (mustBorrowForLevel(level)) return randomInt(onesDigit + 1, a - 1)
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

/** ★6 — the subtraction mirror of addition's generateTwentiesOperands: minuend in the
 * 20s, single-digit subtrahend, answer always a "teen" (10-19). Picks the answer first
 * (not the minuend) so it's guaranteed in range regardless of which subtrahend follows. */
function generateTwentiesOperands(): { a: number; b: number } {
  const answer = randomInt(10, 19)
  const b = randomInt(1, 9)
  return { a: answer + b, b }
}

export function generateSubtractionQuestion(level: Level): ArithmeticQuestion {
  // ★4/★5/★6 are three distinct harder skills — the full two-digit borrowing range
  // (continuing the ★1-3 progression), the round-tens skill, and minuends crossing into
  // the 20s — each its own clean level rather than a coin flip blending them within one
  // level (see the level-redefinition discussion this was split from).
  const useTens = level === 5
  const useTwenties = level === 6
  let a: number
  let b: number
  if (useTwenties) {
    ;({ a, b } = generateTwentiesOperands())
  } else if (useTens) {
    ;({ a, b } = generateTensOperands())
  } else {
    const [min, max] = MINUEND_BAND[level]
    a = randomInt(min, max)
    b = pickSubtrahend(a, level)
  }
  const requiresBorrow = !useTens && !useTwenties && level >= 3 && b > a % 10
  // ★4/★5/★6 are deliberately abstract — no apple visual, no word-problem framing — since
  // none of them scale to a visual/sentence rendering and the whole point of these levels
  // is practicing the bare equation.
  const story = level === 3 && Math.random() < 0.5 ? buildSubtractionStory(a, b) : undefined

  return {
    id: makeId(),
    category: 'subtraction',
    operator: 'subtraction',
    level,
    operandA: a,
    operandB: b,
    answer: a - b,
    showVisual: level < 4,
    story,
    subSkill: useTwenties
      ? 'subtraction-twenties'
      : useTens
        ? 'subtraction-tens'
        : level <= 2
          ? 'subtraction-basic'
          : requiresBorrow
            ? 'subtraction-borrow'
            : 'subtraction-extended',
  }
}
