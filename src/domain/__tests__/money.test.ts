import { describe, expect, it } from 'vitest'
import { generateMoneyQuestion } from '../questionGenerators/money'
import { getCoinById } from '../moneyBank'

describe('generateMoneyQuestion', () => {
  it('★1 always shows exactly 1 coin from {1,5,10}円 and the answer is its value', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateMoneyQuestion(1)
      expect(q.coinIds).toHaveLength(1)
      expect(['yen1', 'yen5', 'yen10']).toContain(q.coinIds[0])
      expect(q.answer).toBe(getCoinById(q.coinIds[0]).value)
      expect(q.subSkill).toBe('money-recognize')
    }
  })

  it('★2 always shows exactly 1 coin from the full set', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 300; i++) {
      const q = generateMoneyQuestion(2)
      expect(q.coinIds).toHaveLength(1)
      expect(q.answer).toBe(getCoinById(q.coinIds[0]).value)
      seen.add(q.coinIds[0])
    }
    expect(seen.size).toBe(6)
  })

  it('★3 always shows exactly 2 coins, never including 500円, and the answer is their sum', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateMoneyQuestion(3)
      expect(q.coinIds).toHaveLength(2)
      for (const id of q.coinIds) expect(id).not.toBe('yen500')
      const expected = q.coinIds.reduce((sum, id) => sum + getCoinById(id).value, 0)
      expect(q.answer).toBe(expected)
      expect(q.subSkill).toBe('money-combine-2')
    }
  })

  it('★4 always shows exactly 2 coins from the full set, and the answer is their sum', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateMoneyQuestion(4)
      expect(q.coinIds).toHaveLength(2)
      const expected = q.coinIds.reduce((sum, id) => sum + getCoinById(id).value, 0)
      expect(q.answer).toBe(expected)
    }
  })

  it('★5 always shows exactly 3 coins, and the answer is their sum', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateMoneyQuestion(5)
      expect(q.coinIds).toHaveLength(3)
      const expected = q.coinIds.reduce((sum, id) => sum + getCoinById(id).value, 0)
      expect(q.answer).toBe(expected)
      expect(q.subSkill).toBe('money-combine-3')
    }
  })

  it('always produces 4 distinct choices that include the answer', () => {
    for (let level = 1; level <= 5; level++) {
      for (let i = 0; i < 100; i++) {
        const q = generateMoneyQuestion(level as 1 | 2 | 3 | 4 | 5)
        expect(q.choices).toHaveLength(4)
        expect(new Set(q.choices).size).toBe(4)
        expect(q.choices).toContain(q.answer)
      }
    }
  })

  it('single-coin recognition draws its wrong choices from other real coin values', () => {
    const realValues = new Set([1, 5, 10, 50, 100, 500])
    for (let i = 0; i < 100; i++) {
      const q = generateMoneyQuestion(2)
      for (const choice of q.choices) {
        expect(realValues.has(choice)).toBe(true)
      }
    }
  })
})
