import { describe, expect, it } from 'vitest'
import { generateHiraganaQuestion } from '../questionGenerators/hiragana'
import { getHiraganaById } from '../hiraganaBank'

const LEVEL_ROW_COUNTS: Record<number, number> = {
  1: 3,
  2: 7,
  3: 15,
  4: 15,
  5: 15,
}

describe('generateHiraganaQuestion', () => {
  for (const level of [1, 2, 3, 4, 5] as const) {
    it(`Lv${level} only draws from the rows unlocked at that level`, () => {
      const rowsSeen = new Set<string>()
      for (let i = 0; i < 200; i++) {
        const q = generateHiraganaQuestion(level)
        rowsSeen.add(getHiraganaById(q.charId).row)
      }
      expect(rowsSeen.size).toBeLessThanOrEqual(LEVEL_ROW_COUNTS[level])
    })
  }

  it('always produces 4 distinct choices that include the answer', () => {
    for (let level = 1; level <= 5; level++) {
      for (let i = 0; i < 100; i++) {
        const q = generateHiraganaQuestion(level as 1 | 2 | 3 | 4 | 5)
        expect(q.choiceIds).toHaveLength(4)
        expect(new Set(q.choiceIds).size).toBe(4)
        expect(q.choiceIds).toContain(q.charId)
      }
    }
  })

  it('char matches the target charId', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateHiraganaQuestion(3)
      const entry = getHiraganaById(q.charId)
      expect(q.char).toBe(entry.char)
      expect(q).not.toHaveProperty('romaji')
    }
  })

  it('never asks the child to pick a romaji reading — always listen-and-pick-the-glyph', () => {
    // romaji answer choices ("mu", "ho", ...) can teach the wrong reading habit for
    // English letters at this age, so there is only ever one hiragana question shape: play
    // the sound, pick the matching character. choiceIds are always other hiragana entry
    // ids (glyphs), never romaji strings.
    for (let level = 1; level <= 5; level++) {
      for (let i = 0; i < 50; i++) {
        const q = generateHiraganaQuestion(level as 1 | 2 | 3 | 4 | 5)
        expect(q).not.toHaveProperty('mode')
        for (const id of q.choiceIds) {
          expect(getHiraganaById(id)).toBeDefined()
        }
      }
    }
  })
})
