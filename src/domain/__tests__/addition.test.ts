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

  // ★4 and ★5 are two distinct, deterministic skills (not a random blend within either
  // level — see the level-redefinition discussion this was split from): ★4 is a harder
  // single-digit sum (14-18), ★5 is a round-tens sum (20-90, both operands multiples of
  // 10). Neither shows the visual or a word-problem story (neither scales: 50 apples, or
  // "20 apples" in a sentence, both read oddly).
  it('Lv4 always uses a single-digit sum (14-18), never shows the visual, and never has a story', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateAdditionQuestion(4)
      expect(q.answer).toBe(q.operandA + q.operandB)
      expect(q.showVisual).toBe(false)
      expect(q.story).toBeUndefined()
      expect(q.operandA).toBeGreaterThanOrEqual(1)
      expect(q.operandA).toBeLessThanOrEqual(9)
      expect(q.operandB).toBeGreaterThanOrEqual(1)
      expect(q.operandB).toBeLessThanOrEqual(9)
      expect(q.answer).toBeGreaterThanOrEqual(14)
      expect(q.answer).toBeLessThanOrEqual(18)
      expect(q.subSkill).toBe('addition-carry')
    }
  })

  it('Lv5 always uses a round-tens sum, never shows the visual, and never has a story', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateAdditionQuestion(5)
      expect(q.answer).toBe(q.operandA + q.operandB)
      expect(q.showVisual).toBe(false)
      expect(q.story).toBeUndefined()
      expect(q.operandA % 10).toBe(0)
      expect(q.operandB % 10).toBe(0)
      expect(q.operandA).toBeGreaterThanOrEqual(10)
      expect(q.operandA).toBeLessThanOrEqual(90)
      expect(q.operandB).toBeGreaterThanOrEqual(10)
      expect(q.operandB).toBeLessThanOrEqual(90)
      expect(q.answer).toBeLessThanOrEqual(90)
      expect(q.subSkill).toBe('addition-tens')
    }
  })

  it('Lv6 always uses a teens-plus-single-digit sum crossing into the 20s, never shows the visual, and never has a story', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateAdditionQuestion(6)
      expect(q.answer).toBe(q.operandA + q.operandB)
      expect(q.showVisual).toBe(false)
      expect(q.story).toBeUndefined()
      expect(q.operandA).toBeGreaterThanOrEqual(14)
      expect(q.operandA).toBeLessThanOrEqual(19)
      expect(q.operandB).toBeGreaterThanOrEqual(1)
      expect(q.operandB).toBeLessThanOrEqual(9)
      expect(q.answer).toBeGreaterThanOrEqual(15)
      expect(q.answer).toBeLessThanOrEqual(28)
      expect(q.subSkill).toBe('addition-twenties')
    }
  })
})
