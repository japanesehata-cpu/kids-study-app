import { describe, expect, it } from 'vitest'
import { generateKatakanaQuestion } from '../questionGenerators/katakana'
import { getKatakanaById } from '../katakanaBank'

const LEVEL_ROW_COUNTS: Record<number, number> = {
  1: 3,
  2: 7,
  3: 15,
  4: 15,
  5: 15,
}

describe('generateKatakanaQuestion', () => {
  for (const level of [1, 2, 3, 4, 5] as const) {
    it(`Lv${level} only draws from the rows unlocked at that level`, () => {
      const rowsSeen = new Set<string>()
      for (let i = 0; i < 200; i++) {
        const q = generateKatakanaQuestion(level)
        rowsSeen.add(getKatakanaById(q.charId).row)
      }
      expect(rowsSeen.size).toBeLessThanOrEqual(LEVEL_ROW_COUNTS[level])
    })
  }

  it('always produces 4 distinct choices that include the answer', () => {
    for (let level = 1; level <= 5; level++) {
      for (let i = 0; i < 100; i++) {
        const q = generateKatakanaQuestion(level as 1 | 2 | 3 | 4 | 5)
        expect(q.choiceIds).toHaveLength(4)
        expect(new Set(q.choiceIds).size).toBe(4)
        expect(q.choiceIds).toContain(q.charId)
      }
    }
  })

  it('char matches the target charId', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateKatakanaQuestion(3)
      const entry = getKatakanaById(q.charId)
      expect(q.char).toBe(entry.char)
    }
  })

  it('always listen-and-pick-the-glyph — choiceIds are always other katakana entry ids', () => {
    for (let level = 1; level <= 5; level++) {
      for (let i = 0; i < 50; i++) {
        const q = generateKatakanaQuestion(level as 1 | 2 | 3 | 4 | 5)
        for (const id of q.choiceIds) {
          expect(getKatakanaById(id)).toBeDefined()
        }
      }
    }
  })
})
