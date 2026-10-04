import { describe, expect, it } from 'vitest'
import { generateLogicQuestion } from '../questionGenerators/logic'
import { oppositePairs, oppositeWords, pairsFor, partnerIn } from '../oppositeBank'
import { buildExplanation } from '../explanations'

describe('oppositeBank', () => {
  it('has no duplicate pairs and every pair stays within one kind of word', () => {
    const keys = oppositePairs.map((p) => [p.a, p.b].sort().join('|'))
    expect(new Set(keys).size).toBe(keys.length)
    for (const w of oppositeWords) expect(new Set(pairsFor(w).map((p) => p.pos)).size, w).toBe(1)
  })
})

describe('はんたいことば questions (ろんり★4)', () => {
  const questions = Array.from({ length: 800 }, () => generateLogicQuestion(4))

  it('are opposite-kind questions with 4 distinct choices including every listed answer', () => {
    for (const q of questions) {
      expect(q.kind).toBe('opposite')
      expect(new Set(q.choices).size).toBe(4)
      for (const a of q.answers!) expect(q.choices).toContain(a)
      expect(q.answers![0]).toBe(q.answer)
    }
  })

  it('every answer really is an opposite, and no wrong choice is one or shares a meaning group', () => {
    for (const q of questions) {
      const pairs = pairsFor(q.promptWord!)
      const partners = pairs.map((p) => partnerIn(p, q.promptWord!))
      const groups = new Set(pairs.map((p) => p.group))
      for (const a of q.answers!) expect(partners).toContain(a)
      for (const c of q.choices.filter((c) => !q.answers!.includes(c))) {
        expect(partners, `${q.promptWord} → ${c}`).not.toContain(c)
        for (const p of pairsFor(c)) {
          expect(groups.has(p.group), `${q.promptWord} vs ${c}`).toBe(false)
          expect(p.pos).toBe(pairs[0].pos)
        }
      }
    }
  })

  it('sometimes offers two correct answers for a word with several meanings (たかい: ひくい / やすい)', () => {
    expect(questions.some((q) => q.answers!.length === 2)).toBe(true)
  })

  it('explains every meaning of the word, and says both answers are right when two were offered', () => {
    const q = { ...questions[0], promptWord: 'たかい', answers: ['ひくい', 'やすい'], answer: 'ひくい', choices: ['ひくい', 'やすい', 'あつい', 'つよい'] }
    const text = buildExplanation(q, 'ja', true, 'やすい')
    expect(text).toContain('やまが たかい ⇔ ひくい')
    expect(text).toContain('ねだんが たかい ⇔ やすい')
    expect(text).toContain('どちらも せいかい')
    expect(buildExplanation(q, 'ja', false, 'あつい')).toContain('こたえは「ひくい」と「やすい」の ふたつ あったよ')
  })
})
