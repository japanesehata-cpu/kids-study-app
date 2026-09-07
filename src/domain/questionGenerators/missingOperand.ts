import type { ArithmeticQuestion, Level } from '../types'

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

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
function generateBasic(operator: 'addition' | 'subtraction'): { a: number; b: number } {
  if (operator === 'addition') {
    const sum = randomInt(8, 20)
    const a = randomInt(Math.max(1, sum - 9), Math.min(9, sum - 1))
    return { a, b: sum - a }
  }
  const a = randomInt(8, 20)
  const b = randomInt(1, a - 1)
  return { a, b }
}

/** ★2 — the round-tens extension, same "next step up" relationship addition/subtraction's
 * own ★4→★5 already has: targets 20-100, every component a multiple of 10. */
function generateTens(operator: 'addition' | 'subtraction'): { a: number; b: number } {
  if (operator === 'addition') {
    const tensSum = randomInt(2, 10) // sum/10, so the actual sum lands on 20-100
    const tensA = randomInt(Math.max(1, tensSum - 9), Math.min(9, tensSum - 1))
    return { a: tensA * 10, b: (tensSum - tensA) * 10 }
  }
  const tensA = randomInt(2, 10) // minuend/10
  const tensB = randomInt(1, tensA - 1)
  return { a: tensA * 10, b: tensB * 10 }
}

export function generateMissingOperandQuestion(level: Level): ArithmeticQuestion {
  const operator: 'addition' | 'subtraction' = Math.random() < 0.5 ? 'addition' : 'subtraction'
  const { a, b } = level >= 2 ? generateTens(operator) : generateBasic(operator)
  const answer = operator === 'addition' ? a + b : a - b
  const blank = pickBlank()

  return {
    id: makeId(),
    category: 'missingOperand',
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
