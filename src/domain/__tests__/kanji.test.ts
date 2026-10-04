import { describe, expect, it } from 'vitest'
import { generateKanjiQuestion, kanjiLevelRows } from '../questionGenerators/kanji'
import { getKanjiById, kanjiBank, kanjiSpeechPhrase } from '../kanjiBank'
import { kanjiStrokePaths } from '../kanjiStrokes'

describe('kanjiBank', () => {
  it('has the 80 grade-1 and 160 grade-2 kyōiku kanji, all unique', () => {
    expect(kanjiBank.filter((k) => k.grade === 1)).toHaveLength(80)
    expect(kanjiBank.filter((k) => k.grade === 2)).toHaveLength(160)
    expect(new Set(kanjiBank.map((k) => k.char)).size).toBe(240)
    expect(new Set(kanjiBank.map((k) => k.id)).size).toBe(240)
  })

  it('keeps the grade-1 ids stable (saved review queues and cached audio use them)', () => {
    expect(getKanjiById('k1').char).toBe('一')
    expect(getKanjiById('k19').char).toBe('雨')
    expect(getKanjiById('k69').char).toBe('車')
    expect(getKanjiById('k80').char).toBe('力')
  })

  it('every hint phrase actually uses its own kanji (not just a same-sounding word)', () => {
    for (const k of kanjiBank) {
      expect(k.hint, `${k.char} hint`).toContain(k.char)
    }
  })

  it('speaks 雨 as the kanji, not bare kana あめ (which TTS reads as 飴 "candy")', () => {
    const rain = kanjiBank.find((k) => k.char === '雨')!
    expect(kanjiSpeechPhrase(rain)).toBe('雨。雨が ふる')
  })

  it('example sentences use no kanji other than their own', () => {
    for (const k of kanjiBank) {
      if (!k.exampleSentenceJa) continue
      const otherKanji = [...k.exampleSentenceJa].filter((c) => /\p{Script=Han}/u.test(c) && c !== k.char)
      expect(otherKanji, `${k.char}: ${k.exampleSentenceJa}`).toEqual([])
    }
  })

  it('なぞる (trace) fields are set together, never partially', () => {
    for (const k of kanjiBank) {
      const traceFieldsSet = [
        k.traceImageId,
        k.meaningJa,
        k.meaningEn,
        k.exampleSentenceJa,
        k.exampleSentenceEn,
      ].filter((v) => v !== undefined).length
      expect(traceFieldsSet === 0 || traceFieldsSet === 5, `${k.char} (${k.id}) has some but not all trace fields set`).toBe(
        true,
      )
    }
  })

  it('every kanjiBank entry with traceImageId set also has stroke data, and vice versa', () => {
    const bankTraceChars = new Set(kanjiBank.filter((k) => k.traceImageId).map((k) => k.char))
    const strokeChars = new Set(Object.keys(kanjiStrokePaths))
    expect(bankTraceChars).toEqual(strokeChars)
    for (const strokes of Object.values(kanjiStrokePaths)) {
      expect(strokes.length).toBeGreaterThan(0)
    }
  })
})

describe('generateKanjiQuestion', () => {
  for (const grade of [1, 2] as const) {
    for (const level of [1, 2, 3, 4, 5, 6] as const) {
      it(`grade ${grade} Lv${level} only draws that grade's rows unlocked at that level`, () => {
        const allowed = new Set(kanjiLevelRows(grade, level))
        for (let i = 0; i < 200; i++) {
          const q = generateKanjiQuestion(level, grade)
          const entry = getKanjiById(q.charId)
          expect(entry.grade).toBe(grade)
          expect(allowed.has(entry.row)).toBe(true)
          for (const id of q.choiceIds) expect(getKanjiById(id).grade).toBe(grade)
        }
      })
    }
  }

  it('tags grade-2 questions with their own category', () => {
    expect(generateKanjiQuestion(3, 1).category).toBe('kanji')
    expect(generateKanjiQuestion(3, 2).category).toBe('kanji2')
  })

  it('always produces 4 distinct choices that include the answer', () => {
    for (const grade of [1, 2] as const) {
      for (let level = 1; level <= 6; level++) {
        for (let i = 0; i < 100; i++) {
          const q = generateKanjiQuestion(level as 1 | 2 | 3 | 4 | 5 | 6, grade)
          expect(q.choiceIds).toHaveLength(4)
          expect(new Set(q.choiceIds).size).toBe(4)
          expect(q.choiceIds).toContain(q.charId)
          expect(q.char).toBe(getKanjiById(q.charId).char)
        }
      }
    }
  })
})
