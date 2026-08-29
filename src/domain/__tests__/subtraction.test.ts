import { describe, expect, it } from 'vitest'
import { generateSubtractionQuestion } from '../questionGenerators/subtraction'

describe('generateSubtractionQuestion', () => {
  it('Lv1 (age 4) stays within a small range and never goes negative', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateSubtractionQuestion(1)
      expect(q.operandA).toBeGreaterThanOrEqual(2)
      expect(q.operandA).toBeLessThanOrEqual(5)
      expect(q.answer).toBe(q.operandA - q.operandB)
      expect(q.answer).toBeGreaterThanOrEqual(0)
      expect(q.showVisual).toBe(true)
      expect(q.subSkill).toBe('subtraction-basic')
    }
  })

  it('Lv2 (age 5) keeps the minuend at 10 or below', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateSubtractionQuestion(2)
      expect(q.operandA).toBeGreaterThanOrEqual(6)
      expect(q.operandA).toBeLessThanOrEqual(10)
      expect(q.answer).toBeGreaterThanOrEqual(0)
      expect(q.showVisual).toBe(true)
      expect(q.subSkill).toBe('subtraction-basic')
    }
  })

  it('Lv3 (age 6) never requires borrowing (the ones digit always covers the subtrahend)', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateSubtractionQuestion(3)
      expect(q.operandA).toBeGreaterThanOrEqual(11)
      expect(q.operandA).toBeLessThanOrEqual(18)
      expect(q.operandB).toBeLessThanOrEqual(q.operandA % 10)
      expect(q.operandB).toBeGreaterThanOrEqual(1)
      expect(q.answer).toBeGreaterThanOrEqual(10)
      expect(q.showVisual).toBe(true)
      expect(q.subSkill).toBe('subtraction-extended')
    }
  })
})
