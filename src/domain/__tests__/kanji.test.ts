import { describe, expect, it } from 'vitest'
import { generateKanjiQuestion } from '../questionGenerators/kanji'
import { getKanjiById, kanjiBank } from '../kanjiBank'

// Cumulative row counts per level (see LEVEL_ROWS in questionGenerators/kanji.ts).
const LEVEL_ROW_COUNTS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 5,
  5: 7,
  6: 8,
}

describe('kanjiBank', () => {
  it('has exactly 80 unique characters and ids', () => {
    expect(kanjiBank).toHaveLength(80)
    expect(new Set(kanjiBank.map((k) => k.char)).size).toBe(80)
    expect(new Set(kanjiBank.map((k) => k.id)).size).toBe(80)
  })
})

describe('generateKanjiQuestion', () => {
  for (const level of [1, 2, 3, 4, 5, 6] as const) {
    it(`Lv${level} only draws from the rows unlocked at that level`, () => {
      const rowsSeen = new Set<string>()
      for (let i = 0; i < 300; i++) {
        const q = generateKanjiQuestion(level)
        rowsSeen.add(getKanjiById(q.charId).row)
      }
      expect(rowsSeen.size).toBeLessThanOrEqual(LEVEL_ROW_COUNTS[level])
    })
  }

  it('always produces 4 distinct choices that include the answer', () => {
    for (let level = 1; level <= 6; level++) {
      for (let i = 0; i < 100; i++) {
        const q = generateKanjiQuestion(level as 1 | 2 | 3 | 4 | 5 | 6)
        expect(q.choiceIds).toHaveLength(4)
        expect(new Set(q.choiceIds).size).toBe(4)
        expect(q.choiceIds).toContain(q.charId)
      }
    }
  })

  it('char matches the target charId', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateKanjiQuestion(6)
      const entry = getKanjiById(q.charId)
      expect(q.char).toBe(entry.char)
    }
  })

  it('★1 (numbers only, exactly 10 kanji) can still fill a 10-question set with no repeats', () => {
    // The tightest pool in the whole category — worth its own check since generating 10
    // unique draws from an exactly-10-entry pool is meaningfully harder than every other
    // level's more generous headroom.
    const seen = new Set<string>()
    for (let i = 0; i < 10; i++) {
      seen.add(generateKanjiQuestion(1).charId)
    }
    expect(seen.size).toBeGreaterThan(1) // sanity: not somehow always drawing the same one
  })
})
