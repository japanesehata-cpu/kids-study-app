import { describe, expect, it } from 'vitest'
import { generateAdditionQuestion } from '../questionGenerators/addition'

const SUM_BAND: Record<number, [number, number]> = {
  1: [2, 5],
  2: [6, 10],
  3: [11, 18],
}

describe('generateAdditionQuestion', () => {
  for (const level of [1, 2, 3] as const) {
    it(`Lv${level} stays within its sum band and both operands are single digits`, () => {
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
})
