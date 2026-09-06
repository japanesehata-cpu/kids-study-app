import { describe, expect, it } from 'vitest'
import { buildExplanation } from '../explanations'
import { generateAdditionQuestion } from '../questionGenerators/addition'
import { generateSubtractionQuestion } from '../questionGenerators/subtraction'
import { generateEnglishSpellingQuestion, generateEnglishListeningQuestion } from '../questionGenerators/englishWords'
import { generateLogicQuestion } from '../questionGenerators/logic'
import { generateHiraganaQuestion } from '../questionGenerators/hiragana'
import { generateKatakanaQuestion } from '../questionGenerators/katakana'
import { generateAlphabetQuestion } from '../questionGenerators/alphabet'
import { generateClockQuestion } from '../questionGenerators/clock'
import { generateSpotDifferenceQuestion } from '../questionGenerators/spotDifference'
import { generateCountingQuestion } from '../questionGenerators/counting'
import type { Question } from '../types'

const GENERATORS: Array<() => Question> = [
  () => generateAdditionQuestion(1),
  () => generateSubtractionQuestion(1),
  () => generateEnglishSpellingQuestion(1),
  () => generateEnglishListeningQuestion(1),
  () => generateLogicQuestion(1),
  () => generateHiraganaQuestion(1),
  () => generateKatakanaQuestion(1),
  () => generateAlphabetQuestion(1),
  () => generateClockQuestion(1),
  () => generateSpotDifferenceQuestion(1),
  () => generateCountingQuestion(1),
]

describe('buildExplanation', () => {
  it('returns a non-empty sentence in both languages for every category', () => {
    for (const generate of GENERATORS) {
      for (let i = 0; i < 30; i++) {
        const question = generate()
        for (const lang of ['ja', 'en'] as const) {
          const explanation = buildExplanation(question, lang)
          expect(typeof explanation).toBe('string')
          expect(explanation.length).toBeGreaterThan(3)
        }
      }
    }
  })

  it('addition explanation states the correct arithmetic', () => {
    const q = generateAdditionQuestion(1)
    const ja = buildExplanation(q, 'ja')
    const en = buildExplanation(q, 'en')
    expect(ja).toContain(String(q.operandA))
    expect(ja).toContain(String(q.operandB))
    expect(ja).toContain(String(q.answer))
    expect(en).toContain(String(q.answer))
  })

  it('hiragana explanation includes the character and never any romaji', () => {
    for (let i = 0; i < 20; i++) {
      const q = generateHiraganaQuestion(1)
      const ja = buildExplanation(q, 'ja')
      const en = buildExplanation(q, 'en')
      expect(ja).toContain(q.char)
      expect(ja).not.toMatch(/[a-zA-Z]/)
      expect(en).toContain(q.char)
    }
  })

  it('clock explanation includes the formatted time', () => {
    const q = generateClockQuestion(1)
    const ja = buildExplanation(q, 'ja')
    expect(ja).toContain(String(q.hour))
  })

  it('englishSpelling/englishListening name the wrongly-picked word too, not just the answer', () => {
    for (const generate of [generateEnglishSpellingQuestion, generateEnglishListeningQuestion]) {
      const q = generate(1)
      const wrongChoice = q.choiceWordIds.find((id) => id !== q.wordId)!
      const correctText = buildExplanation(q, 'ja', true)
      const wrongJa = buildExplanation(q, 'ja', false, wrongChoice)
      const wrongEn = buildExplanation(q, 'en', false, wrongChoice)
      // The wrong-answer explanation is a strict superset of the correct one (same lead-in,
      // plus the extra sentence naming what was actually picked).
      expect(wrongJa.startsWith(correctText)).toBe(true)
      expect(wrongJa.length).toBeGreaterThan(correctText.length)
      expect(wrongEn.length).toBeGreaterThan(buildExplanation(q, 'en', true).length)
    }
  })

  it('pattern explanation names every distinct symbol in the cycle, even a 4-5 symbol one', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateLogicQuestion(3) // ★3 can produce a 3-5 symbol cycle
      if (q.kind !== 'pattern') continue
      const cycleSymbols = [...new Set(q.sequence)]
      const ja = buildExplanation(q, 'ja')
      for (const symbol of cycleSymbols) {
        expect(ja).toContain(symbol)
      }
    }
  })
})
