import { describe, expect, it } from 'vitest'
import { wordTraceBank } from '../wordTraceBank'
import { getWordById } from '../wordBank'
import { alphabetStrokePaths } from '../alphabetStrokes'

describe('wordTraceBank', () => {
  it('has exactly 26 words, one per A-Z starting letter', () => {
    expect(wordTraceBank).toHaveLength(26)
    const startingLetters = new Set(wordTraceBank.map((id) => getWordById(id).word[0]))
    expect(startingLetters.size).toBe(26)
  })

  it('every id resolves to a real wordBank entry', () => {
    for (const id of wordTraceBank) {
      expect(() => getWordById(id), id).not.toThrow()
    }
  })

  it('every letter of every word has stroke data', () => {
    for (const id of wordTraceBank) {
      const entry = getWordById(id)
      for (const letter of entry.word) {
        expect(alphabetStrokePaths[letter]?.length, `${entry.word} (${id}): missing stroke data for "${letter}"`).toBeGreaterThan(0)
      }
    }
  })
})
