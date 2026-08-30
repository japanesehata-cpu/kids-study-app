import { describe, expect, it } from 'vitest'
import { generateAdditionQuestion } from '../questionGenerators/addition'

const SUM_BAND: Record<number, [number, number]> = {
  1: [2, 5],
  2: [6, 10],
  3: [11, 13],
}

describe('generateAdditionQuestion', () => {
  for (const level of [1, 2, 3] as const) {
    it(`Lv${level} stays within its sum band, both operands are single digits, and shows the visual`, () => {
      const [min, max] = SUM_BAND[level]
      for (let i = 0; i < 200; i++) {
        const q = generateAdditionQuestion(level)
        expect(q.answer).toBe(q.operandA + q.operandB)
        expect(q.answer).toBeGreaterThanOrEqual(min)
        expect(q.answer).toBeLessThanOrEqual(max)
        expect(q.operandA).toBeGreaterThanOrEqual(1)
        expect(q.operandA).toBeLessThanOrEqual(9)
        expect(q.operandB).toBeGreaterThanOrEqual(1)
        expect(q.operandB).toBeLessThanOrEqual(9)
        expect(q.showVisual).toBe(true)
      }
    })
  }

  // ★4 mixes two branches — a harder single-digit sum (14-18) and a round-tens sum
  // (20-90, both operands multiples of 10) — never shows the visual or a word-problem
  // story (neither scales: 50 apples, or "20 apples" in a sentence, both read oddly), and
  // exercises both branches across enough draws.
  it('Lv4 mixes a harder single-digit sum with a round-tens sum, never shows the visual, and never has a story', () => {
    let sawSingleDigit = false
    let sawTens = false
    for (let i = 0; i < 200; i++) {
      const q = generateAdditionQuestion(4)
      expect(q.answer).toBe(q.operandA + q.operandB)
      expect(q.showVisual).toBe(false)
      expect(q.story).toBeUndefined()

      const isTens = q.operandA % 10 === 0 && q.operandB % 10 === 0
      if (isTens) {
        sawTens = true
        expect(q.operandA).toBeGreaterThanOrEqual(10)
        expect(q.operandA).toBeLessThanOrEqual(90)
        expect(q.operandB).toBeGreaterThanOrEqual(10)
        expect(q.operandB).toBeLessThanOrEqual(90)
        expect(q.answer).toBeLessThanOrEqual(90)
        expect(q.subSkill).toBe('addition-tens')
      } else {
        sawSingleDigit = true
        expect(q.operandA).toBeGreaterThanOrEqual(1)
        expect(q.operandA).toBeLessThanOrEqual(9)
        expect(q.operandB).toBeGreaterThanOrEqual(1)
        expect(q.operandB).toBeLessThanOrEqual(9)
        expect(q.answer).toBeGreaterThanOrEqual(14)
        expect(q.answer).toBeLessThanOrEqual(18)
        expect(q.subSkill).toBe('addition-carry')
      }
    }
    expect(sawSingleDigit).toBe(true)
    expect(sawTens).toBe(true)
  })
})
