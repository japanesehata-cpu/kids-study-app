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

  it('Lv3 (age 6) uses an 11-13 minuend and mixes borrowing with non-borrowing cases', () => {
    let sawBorrow = false
    let sawNoBorrow = false
    for (let i = 0; i < 200; i++) {
      const q = generateSubtractionQuestion(3)
      expect(q.operandA).toBeGreaterThanOrEqual(11)
      expect(q.operandA).toBeLessThanOrEqual(13)
      expect(q.operandB).toBeGreaterThanOrEqual(1)
      expect(q.operandB).toBeLessThanOrEqual(q.operandA - 1)
      expect(q.answer).toBe(q.operandA - q.operandB)
      expect(q.showVisual).toBe(true)
      if (q.operandB > q.operandA % 10) {
        sawBorrow = true
        expect(q.subSkill).toBe('subtraction-borrow')
      } else {
        sawNoBorrow = true
        expect(q.subSkill).toBe('subtraction-extended')
      }
    }
    expect(sawBorrow).toBe(true)
    expect(sawNoBorrow).toBe(true)
  })

  // ★4 mixes two branches — a harder single-digit minuend (14-18) and a round-tens
  // minuend (20-90, both operands multiples of 10) — never shows the visual or a
  // word-problem story, and exercises both branches across enough draws.
  it('Lv4 mixes a harder single-digit minuend with a round-tens minuend, never shows the visual, and never has a story', () => {
    let sawSingleDigit = false
    let sawTens = false
    for (let i = 0; i < 200; i++) {
      const q = generateSubtractionQuestion(4)
      expect(q.answer).toBe(q.operandA - q.operandB)
      expect(q.answer).toBeGreaterThanOrEqual(0)
      expect(q.showVisual).toBe(false)
      expect(q.story).toBeUndefined()

      const isTens = q.operandA % 10 === 0 && q.operandB % 10 === 0
      if (isTens) {
        sawTens = true
        expect(q.operandA).toBeGreaterThanOrEqual(20)
        expect(q.operandA).toBeLessThanOrEqual(90)
        expect(q.operandB).toBeGreaterThanOrEqual(10)
        expect(q.operandB).toBeLessThan(q.operandA)
        expect(q.subSkill).toBe('subtraction-tens')
      } else {
        sawSingleDigit = true
        expect(q.operandA).toBeGreaterThanOrEqual(14)
        expect(q.operandA).toBeLessThanOrEqual(18)
        expect(['subtraction-borrow', 'subtraction-extended']).toContain(q.subSkill)
      }
    }
    expect(sawSingleDigit).toBe(true)
    expect(sawTens).toBe(true)
  })
})
