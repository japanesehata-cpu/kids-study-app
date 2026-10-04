import type { ArithmeticQuestion, Level } from '../types'
import { enumeratePairs, pickUniform } from '../../lib/random'

function makeId(): string {
  return `missing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Which operand is hidden — deliberately a random coin flip within every level (content
 * variety, not difficulty, same as alphabet's upper/lower prompt-direction flip or logic's
 * max/min compare goal — see the level-redefinition discussion this pattern comes from). */
function pickBlank(): 'operandA' | 'operandB' {
  return Math.random() < 0.5 ? 'operandA' : 'operandB'
}

/** ★1 — the worksheet this category was modeled on ("□の けいさん"): a target (sum for
 * addition, minuend for subtraction) in 8-20 with single-digit-ish components. Addition
 * picks the sum then splits it (same shape as addition.ts's generateOperands); subtraction
 * picks the minuend then a subtrahend strictly less than it. */
// Every problem enumerated and picked uniformly (see enumeratePairs for why not
// target-then-split). The old sum-then-split also asked for impossible splits of 19/20
// with single-digit addends.
const BASIC_PAIRS = {
  addition: enumeratePairs([1, 9], [1, 9], (a, b) => a + b >= 8),
  subtraction: enumeratePairs([8, 20], [1, 19], (a, b) => b < a),
}
const TENS_PAIRS = {
  addition: enumeratePairs([1, 9], [1, 9], (a, b) => a + b <= 10), // sums 20-100
  subtraction: enumeratePairs([2, 10], [1, 9], (a, b) => b < a), // minuends 20-100
}

function generateBasic(operator: 'addition' | 'subtraction'): { a: number; b: number } {
  return pickUniform(BASIC_PAIRS[operator])
}

/** ★2 — the round-tens extension, same "next step up" relationship addition/subtraction's
 * own ★4→★5 already has: targets 20-100, every component a multiple of 10. */
function generateTens(operator: 'addition' | 'subtraction'): { a: number; b: number } {
  const { a, b } = pickUniform(TENS_PAIRS[operator])
  return { a: a * 10, b: b * 10 }
}

/** `operator` is fixed by which category this is (missingOperandAddition vs
 * missingOperandSubtraction — see App.tsx's two entry points, one per operator), not
 * randomized — a level-redefinition-style split so a round is never a mix of both
 * operators, matching addition/subtraction's own "one consistent skill per level"
 * principle. `blank` (which slot is hidden) stays a coin flip: that's still content
 * variety, not difficulty, same as alphabet's upper/lower prompt-direction flip. */
export function generateMissingOperandQuestion(
  level: Level,
  operator: 'addition' | 'subtraction',
): ArithmeticQuestion {
  const { a, b } = level >= 2 ? generateTens(operator) : generateBasic(operator)
  const answer = operator === 'addition' ? a + b : a - b
  const blank = pickBlank()

  return {
    id: makeId(),
    category: operator === 'addition' ? 'missingOperandAddition' : 'missingOperandSubtraction',
    operator,
    level,
    operandA: a,
    operandB: b,
    answer,
    showVisual: false,
    subSkill: operator === 'addition' ? 'missing-operand-addition' : 'missing-operand-subtraction',
    blank,
  }
}
