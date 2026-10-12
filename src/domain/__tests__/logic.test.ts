import { describe, expect, it } from 'vitest'
import { generateLogicQuestion, SYMBOL_SETS } from '../questionGenerators/logic'
import { getWordById, wordBank } from '../wordBank'

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

  it('Lv3 only ever produces pattern questions', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateLogicQuestion(3)
      expect(q.kind).toBe('pattern')
    }
  })

  it('pattern: the answer correctly continues the repeating 3-symbol cycle on an 8-long strip', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateLogicQuestion(3)
      const seq = q.sequence!
      expect(seq).toHaveLength(8)
      const cycleLen = new Set(seq).size
      expect(cycleLen).toBe(3)
      // whatever the cycle, the sequence should repeat with period cycleLen
      for (let j = cycleLen; j < seq.length; j++) {
        expect(seq[j]).toBe(seq[j - cycleLen])
      }
      expect(q.choices).toContain(q.answer)
      expect(new Set(q.choices).size).toBe(4)
    }
  })

  it('pattern: distractors come from the same symbol set as the answer, not an unrelated one', () => {
    // Otherwise, once a cycle uses all 5 colors of one set (e.g. every heart color), the
    // only leftover distractors are visually unrelated symbols (a sun, a cloud) and the
    // real heart-colored answer stands out by shape alone before the sequence is read.
    for (let i = 0; i < 100; i++) {
      const q = generateLogicQuestion(3)
      const ownSet = SYMBOL_SETS.find((set) => set.includes(q.answer))!
      for (const choice of q.choices) {
        expect(ownSet).toContain(choice)
      }
    }
  })

  it('Lv4 only ever produces compare questions', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateLogicQuestion(4)
      expect(q.kind).toBe('compare')
    }
  })

  it('compare: the answer is genuinely the max/min of 4 distinct choices, each 0-14', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateLogicQuestion(4)
      const nums = q.choices.map(Number)
      expect(new Set(nums).size).toBe(4)
      for (const n of nums) {
        expect(n).toBeGreaterThanOrEqual(0)
        expect(n).toBeLessThanOrEqual(14)
      }
      const expected = q.compareGoal === 'max' ? Math.max(...nums) : Math.min(...nums)
      expect(Number(q.answer)).toBe(expected)
    }
  })

  it('Lv2 is a finer odd-one-out: 3 words of one subgroup and 1 of another subgroup in the same category', () => {
    for (let i = 0; i < 300; i++) {
      const q = generateLogicQuestion(2)
      expect(q.kind).toBe('oddOneOut')
      expect(q.subSkill).toBe('logic-oddOneOutFine')
      expect(new Set(q.choices).size).toBe(4)
      const words = q.choices.map(getWordById)
      const odd = getWordById(q.answer)
      const rest = words.filter((w) => w.id !== q.answer)
      for (const w of words) expect(w.subgroup, w.id).toBeDefined()
      expect(new Set(words.map((w) => w.category)).size).toBe(1)
      expect(new Set(rest.map((w) => w.subgroup)).size).toBe(1)
      expect(rest[0].subgroup).not.toBe(odd.subgroup)
      expect(['fish', 'amphibian']).not.toContain(rest[0].subgroup)
    }
  })

  it('Lv2 never uses a word whose grouping is ambiguous', () => {
    const ambiguous = ['tomato', 'strawberry', 'watermelon', 'melon', 'avocado', 'corn', 'mushroom', 'potato', 'pumpkin', 'eggplant', 'cucumber', 'pea', 'bean', 'whale', 'dolphin', 'seal', 'bat', 'penguin', 'spider', 'snail', 'octopus', 'bird', 'fish']
    for (const id of ambiguous) expect(wordBank.find((w) => w.id === id)?.subgroup, id).toBeUndefined()
  })
})
