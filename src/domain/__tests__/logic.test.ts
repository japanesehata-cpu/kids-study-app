import { describe, expect, it } from 'vitest'
import { generateLogicQuestion, SYMBOL_SETS } from '../questionGenerators/logic'
import { getWordById } from '../wordBank'

describe('generateLogicQuestion', () => {
  it('Lv1 (age 4) only ever produces oddOneOut questions', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateLogicQuestion(1)
      expect(q.kind).toBe('oddOneOut')
    }
  })

  it('oddOneOut: exactly one of the 4 choices differs in wordBank category from the other three', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateLogicQuestion(1)
      expect(q.choices).toHaveLength(4)
      expect(new Set(q.choices).size).toBe(4) // no repeated word

      const categories = q.choices.map((id) => getWordById(id).category)
      const answerCategory = getWordById(q.answer).category
      const sameCategoryCount = categories.filter((c) => c === answerCategory).length
      // the odd one's own category should appear exactly once among the 4 (it doesn't match the other 3)
      expect(sameCategoryCount).toBe(1)
      expect(q.choices).toContain(q.answer)
    }
  })

  it('never produces pattern or compare questions before Lv2 (age 5)', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateLogicQuestion(1)
      expect(q.kind).toBe('oddOneOut')
    }
  })

  it('pattern: the answer correctly continues the repeating cycle, and the cycle strictly lengthens from Lv3 to Lv5', () => {
    const expectedCycleLen: Record<number, number> = { 3: 3, 4: 4, 5: 5 }
    const expectedSeqLen: Record<number, number> = { 3: 8, 4: 9, 5: 10 }
    for (const level of [3, 4, 5] as const) {
      for (let i = 0; i < 100; i++) {
        const q = generateLogicQuestion(level)
        if (q.kind !== 'pattern') continue
        const seq = q.sequence!
        expect(seq).toHaveLength(expectedSeqLen[level])
        const cycleLen = new Set(seq).size
        expect(cycleLen).toBe(expectedCycleLen[level])
        // whatever the cycle, the sequence should repeat with period cycleLen
        for (let j = cycleLen; j < seq.length; j++) {
          expect(seq[j]).toBe(seq[j - cycleLen])
        }
        expect(q.choices).toContain(q.answer)
        expect(new Set(q.choices).size).toBe(4)
      }
    }
  })

  it('pattern: distractors come from the same symbol set as the answer, not an unrelated one', () => {
    // Otherwise, once a cycle uses all 5 colors of one set (e.g. every heart color), the
    // only leftover distractors are visually unrelated symbols (a sun, a cloud) and the
    // real heart-colored answer stands out by shape alone before the sequence is read.
    for (let i = 0; i < 100; i++) {
      const q = generateLogicQuestion(3)
      if (q.kind !== 'pattern') continue
      const ownSet = SYMBOL_SETS.find((set) => set.includes(q.answer))!
      for (const choice of q.choices) {
        expect(ownSet).toContain(choice)
      }
    }
  })

  it('compare: the answer is genuinely the max/min of the 4 distinct choices', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateLogicQuestion(3) // Lv3 (age 6) can produce compare
      if (q.kind !== 'compare') continue
      const nums = q.choices.map(Number)
      expect(new Set(nums).size).toBe(4)
      const expected = q.compareGoal === 'max' ? Math.max(...nums) : Math.min(...nums)
      expect(Number(q.answer)).toBe(expected)
    }
  })

  it('never produces compare questions before Lv3 (age 6)', () => {
    for (let level = 1; level <= 2; level++) {
      for (let i = 0; i < 50; i++) {
        const q = generateLogicQuestion(level as 1 | 2)
        expect(q.kind).not.toBe('compare')
      }
    }
  })
})
