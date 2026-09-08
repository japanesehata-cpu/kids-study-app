import { describe, expect, it } from 'vitest'
import { generateHiraganaQuestion } from '../questionGenerators/hiragana'
import { getHiraganaById, hiraganaBank } from '../hiraganaBank'
import { kanaStrokePaths } from '../kanaStrokes'

const LEVEL_ROW_COUNTS: Record<number, number> = {
  1: 3,
  2: 7,
  3: 15,
  4: 15,
  5: 15,
}

describe('hiraganaBank なぞる (trace) fields', () => {
  it('exampleSentence fields are set together, never partially', () => {
    for (const h of hiraganaBank) {
      const set = [h.exampleSentenceJa, h.exampleSentenceEn].filter((v) => v !== undefined).length
      expect(set === 0 || set === 2, `${h.char} (${h.id}) has one but not both example sentence fields`).toBe(true)
    }
  })

  it('exactly the 46 清音 (seion) entries have example sentences', () => {
    expect(hiraganaBank.filter((h) => h.exampleSentenceJa).length).toBe(46)
  })

  it('every entry with an example sentence has stroke data, and no other entry does', () => {
    for (const h of hiraganaBank) {
      if (h.exampleSentenceJa) {
        expect(kanaStrokePaths[h.char]?.length, `${h.char} (${h.id}) missing stroke data`).toBeGreaterThan(0)
      } else {
        expect(kanaStrokePaths[h.char], `${h.char} (${h.id}) has stroke data but no example sentence`).toBeUndefined()
      }
    }
  })
})

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
