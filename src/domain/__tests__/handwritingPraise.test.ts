import { describe, expect, it } from 'vitest'
import { HANDWRITING_PRAISE_JA, pickHandwritingPraise } from '../handwritingPraise'

describe('pickHandwritingPraise', () => {
  it('always returns one of the ja pool lines with a category-namespaced cache key, in ja', () => {
    for (const category of ['hiragana', 'katakana'] as const) {
      for (let i = 0; i < 30; i++) {
        const { text, cacheKey } = pickHandwritingPraise('ja', category)
        const idx = HANDWRITING_PRAISE_JA.indexOf(text)
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(cacheKey).toBe(`handwriting-praise-${category}-${idx}`)
      }
    }
  })

  it('never sets a cache key in en (no English cache tier for this)', () => {
    for (let i = 0; i < 10; i++) {
      const { cacheKey } = pickHandwritingPraise('en', 'hiragana')
      expect(cacheKey).toBeUndefined()
    }
  })
})
