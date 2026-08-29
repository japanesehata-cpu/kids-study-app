import { describe, expect, it } from 'vitest'
import { generateAlphabetQuestion } from '../questionGenerators/alphabet'
import { getAlphabetById } from '../alphabetBank'

describe('generateAlphabetQuestion', () => {
  it('★1 is always uppercase phonics: hear the sound, pick the uppercase letter', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateAlphabetQuestion(1)
      expect(q.kind).toBe('phonics')
      const entry = getAlphabetById(q.letterId)
      expect(q.answerChar).toBe(entry.upper)
      expect(q.soundVariant).toBeDefined()
      expect(entry.sounds.some((s) => s.variant === q.soundVariant)).toBe(true)
    }
  })

  it('★2 is always lowercase phonics: hear the sound, pick the lowercase letter', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateAlphabetQuestion(2)
      expect(q.kind).toBe('phonics')
      const entry = getAlphabetById(q.letterId)
      expect(q.answerChar).toBe(entry.lower)
    }
  })

  it('★3 is always the case-matching drill: prompt and answer are the same letter, opposite case', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateAlphabetQuestion(3)
      expect(q.kind).toBe('caseMatch')
      const entry = getAlphabetById(q.letterId)
      expect(q.promptChar).toBeDefined()
      expect([entry.upper, entry.lower]).toContain(q.promptChar)
      expect([entry.upper, entry.lower]).toContain(q.answerChar)
      expect(q.promptChar).not.toBe(q.answerChar)
    }
  })

  it('always produces 4 distinct choices that include the answer, matching the tested case', () => {
    for (let level = 1; level <= 3; level++) {
      for (let i = 0; i < 100; i++) {
        const q = generateAlphabetQuestion(level as 1 | 2 | 3)
        expect(q.choiceIds).toHaveLength(4)
        expect(new Set(q.choiceIds).size).toBe(4)
        expect(q.choiceIds).toContain(q.answerChar)
        if (level === 1) expect(q.choiceIds.every((c) => c === c.toUpperCase())).toBe(true)
        if (level === 2) expect(q.choiceIds.every((c) => c === c.toLowerCase())).toBe(true)
      }
    }
  })
})
