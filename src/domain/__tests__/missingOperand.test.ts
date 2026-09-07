import { describe, expect, it } from 'vitest'
import { generateMissingOperandQuestion } from '../questionGenerators/missingOperand'

describe('generateMissingOperandQuestion', () => {
  it('Lv1 stays within the 8-20 target band, never shows the visual, and is internally consistent', () => {
    const seenOperators = new Set<string>()
    const seenBlanks = new Set<string>()
    for (let i = 0; i < 300; i++) {
      const q = generateMissingOperandQuestion(1)
      seenOperators.add(q.operator)
      seenBlanks.add(q.blank!)
      expect(q.showVisual).toBe(false)
      expect(q.blank).toBeDefined()
      expect(q.category).toBe('missingOperand')
      if (q.operator === 'addition') {
        expect(q.answer).toBe(q.operandA + q.operandB)
        expect(q.answer).toBeGreaterThanOrEqual(8)
        expect(q.answer).toBeLessThanOrEqual(20)
        expect(q.subSkill).toBe('missing-operand-addition')
      } else {
        expect(q.answer).toBe(q.operandA - q.operandB)
        expect(q.operandA).toBeGreaterThanOrEqual(8)
        expect(q.operandA).toBeLessThanOrEqual(20)
        expect(q.subSkill).toBe('missing-operand-subtraction')
      }
    }
    expect(seenOperators).toEqual(new Set(['addition', 'subtraction']))
    expect(seenBlanks).toEqual(new Set(['operandA', 'operandB']))
  })

  it('Lv2 always uses round-tens components (20-100 range), never shows the visual', () => {
    for (let i = 0; i < 300; i++) {
      const q = generateMissingOperandQuestion(2)
      expect(q.showVisual).toBe(false)
      expect(q.operandA % 10).toBe(0)
      expect(q.operandB % 10).toBe(0)
      if (q.operator === 'addition') {
        expect(q.answer).toBe(q.operandA + q.operandB)
      } else {
        expect(q.answer).toBe(q.operandA - q.operandB)
        expect(q.operandB).toBeLessThan(q.operandA)
      }
    }
  })
})
