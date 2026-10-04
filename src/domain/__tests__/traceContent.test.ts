import { describe, expect, it } from 'vitest'
import { alphabetStrokePaths } from '../alphabetStrokes'
import { KANA_TRACE_IMAGE } from '../kanaTraceImages'
import { hiraganaBank } from '../hiraganaBank'
import { katakanaBank } from '../katakanaBank'
import { alphabetBank } from '../alphabetBank'

describe('alphabet trace strokes', () => {
  it('covers all 52 letters, each stroke a single continuous path (one moveto)', () => {
    expect(Object.keys(alphabetStrokePaths)).toHaveLength(52)
    for (const [letter, strokes] of Object.entries(alphabetStrokePaths)) {
      for (const d of strokes) expect((d.match(/M/g) ?? []).length, `${letter}: ${d}`).toBe(1)
    }
  })
})

const WORD_IMAGES = new Set(
  Object.keys(import.meta.glob('../../../public/images/words/*.png')).map((p) => p.split('/').pop()!.replace('.png', '')),
)

describe('kana trace pictures', () => {
  it('point at real kana entries and existing images', () => {
    const banks = { hiragana: hiraganaBank, katakana: katakanaBank }
    for (const [script, map] of Object.entries(KANA_TRACE_IMAGE)) {
      const ids = new Set(banks[script as 'hiragana' | 'katakana'].map((e) => e.id))
      for (const [id, image] of Object.entries(map)) {
        expect(ids.has(id), `${script}:${id}`).toBe(true)
        expect(WORD_IMAGES.has(image), image).toBe(true)
      }
    }
  })
})

describe('alphabet trace pictures', () => {
  it('every letter except q (queen) has a picture of its example word', () => {
    for (const a of alphabetBank) {
      if (a.id === 'q') continue
      expect(WORD_IMAGES.has(a.mnemonic.toLowerCase()), a.mnemonic).toBe(true)
    }
  })
})
