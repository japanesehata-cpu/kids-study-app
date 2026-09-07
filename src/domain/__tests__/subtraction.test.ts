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

  // ★3 is deterministically no-borrow (see the level-redefinition discussion this was
  // split from) — band goes to 14, not 13, so there are enough distinct (a, b) pairs for
  // a 10-question set (see MINUEND_BAND's comment in subtraction.ts).
  it('Lv3 (age 6) uses an 11-14 minuend and never requires borrowing', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateSubtractionQuestion(3)
      expect(q.operandA).toBeGreaterThanOrEqual(11)
      expect(q.operandA).toBeLessThanOrEqual(14)
      expect(q.operandB).toBeGreaterThanOrEqual(1)
      expect(q.operandB).toBeLessThanOrEqual(q.operandA % 10)
      expect(q.answer).toBe(q.operandA - q.operandB)
      expect(q.showVisual).toBe(true)
      expect(q.subSkill).toBe('subtraction-extended')
    }
  })

  // ★4 is deterministically forced-borrow across the full two-digit range (merging what
  // used to be ★3's harder half and ★4's mostly-borrow band into one clean tier).
  it('Lv4 (age 6+) uses an 11-18 minuend and always requires borrowing', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateSubtractionQuestion(4)
      expect(q.operandA).toBeGreaterThanOrEqual(11)
      expect(q.operandA).toBeLessThanOrEqual(18)
      expect(q.answer).toBe(q.operandA - q.operandB)
      expect(q.answer).toBeGreaterThanOrEqual(0)
      expect(q.showVisual).toBe(false)
      expect(q.story).toBeUndefined()
      expect(q.operandB).toBeGreaterThan(q.operandA % 10)
      expect(q.subSkill).toBe('subtraction-borrow')
    }
  })

  it('Lv5 always uses a round-tens minuend, never shows the visual, and never has a story', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateSubtractionQuestion(5)
      expect(q.answer).toBe(q.operandA - q.operandB)
      expect(q.answer).toBeGreaterThanOrEqual(0)
      expect(q.showVisual).toBe(false)
      expect(q.story).toBeUndefined()
      expect(q.operandA % 10).toBe(0)
      expect(q.operandB % 10).toBe(0)
      expect(q.operandA).toBeGreaterThanOrEqual(20)
      expect(q.operandA).toBeLessThanOrEqual(90)
      expect(q.operandB).toBeGreaterThanOrEqual(10)
      expect(q.operandB).toBeLessThan(q.operandA)
      expect(q.subSkill).toBe('subtraction-tens')
    }
  })

  it('Lv6 always uses a 20s minuend with a single-digit subtrahend, answer always a teen', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateSubtractionQuestion(6)
      expect(q.answer).toBe(q.operandA - q.operandB)
      expect(q.showVisual).toBe(false)
      expect(q.story).toBeUndefined()
      expect(q.operandB).toBeGreaterThanOrEqual(1)
      expect(q.operandB).toBeLessThanOrEqual(9)
      expect(q.answer).toBeGreaterThanOrEqual(10)
      expect(q.answer).toBeLessThanOrEqual(19)
      expect(q.operandA).toBeGreaterThanOrEqual(11)
      expect(q.subSkill).toBe('subtraction-twenties')
    }
  })
})
