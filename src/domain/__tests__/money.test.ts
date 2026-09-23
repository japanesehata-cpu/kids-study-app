import { describe, expect, it } from 'vitest'
import { generateMoneyQuestion } from '../questionGenerators/money'
import { getCoinById } from '../moneyBank'

/** Unbounded coin-change reachability (unlimited supply of each value, any number of
 * coins) — mirrors what MoneyBoard.tsx actually lets the child do: tap any palette coin
 * any number of times until the tray total hits `target`. */
function isReachable(target: number, values: number[]): boolean {
  const reachable = new Array(target + 1).fill(false)
  reachable[0] = true
  for (let amount = 1; amount <= target; amount++) {
    for (const v of values) {
      if (v <= amount && reachable[amount - v]) {
        reachable[amount] = true
        break
      }
    }
  }
  return reachable[target]
}

describe('generateMoneyQuestion', () => {
  it('★1 palette is exactly {1,5,10}円 and the target is one of their values', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateMoneyQuestion(1)
      expect(new Set(q.paletteCoinIds)).toEqual(new Set(['yen1', 'yen5', 'yen10']))
      expect([1, 5, 10]).toContain(q.targetAmount)
      expect(q.subSkill).toBe('money-recognize')
    }
  })

  it("★2 palette is the full 6-coin set and the target is one coin's value", () => {
    const seenTargets = new Set<number>()
    for (let i = 0; i < 300; i++) {
      const q = generateMoneyQuestion(2)
      expect(q.paletteCoinIds).toHaveLength(6)
      const values = q.paletteCoinIds.map((id) => getCoinById(id).value)
      expect(values).toContain(q.targetAmount)
      expect(q.subSkill).toBe('money-recognize')
      seenTargets.add(q.targetAmount)
    }
    expect(seenTargets.size).toBe(6)
  })

  it('★3 palette excludes 500円 and the target is reachable from its coins', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateMoneyQuestion(3)
      expect(q.paletteCoinIds).not.toContain('yen500')
      const values = q.paletteCoinIds.map((id) => getCoinById(id).value)
      expect(isReachable(q.targetAmount, values)).toBe(true)
      expect(q.subSkill).toBe('money-combine-2')
    }
  })

  it('★4 palette is the full set and the target is reachable from its coins', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateMoneyQuestion(4)
      expect(q.paletteCoinIds).toHaveLength(6)
      const values = q.paletteCoinIds.map((id) => getCoinById(id).value)
      expect(isReachable(q.targetAmount, values)).toBe(true)
      expect(q.subSkill).toBe('money-combine-2')
    }
  })

  it('★5 palette is the full set and the target is reachable from its coins', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateMoneyQuestion(5)
      expect(q.paletteCoinIds).toHaveLength(6)
      const values = q.paletteCoinIds.map((id) => getCoinById(id).value)
      expect(isReachable(q.targetAmount, values)).toBe(true)
      expect(q.subSkill).toBe('money-combine-3')
    }
  })
})
