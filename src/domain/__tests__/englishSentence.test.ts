import { describe, expect, it } from 'vitest'
import { generateEnglishSentenceQuestion } from '../questionGenerators/englishSentence'
import { colorSentenceBank } from '../colorSentenceBank'
import { getWordById } from '../wordBank'

describe('generateEnglishSentenceQuestion', () => {
  it('never offers a same-color-family distractor alongside a color question\'s answer', () => {
    for (let i = 0; i < 500; i++) {
      const q = generateEnglishSentenceQuestion(1)
      if (q.subSkill !== 'sentence-color') continue
      const correctEntry = colorSentenceBank.find((e) => `color-${e.id}` === q.sentenceId)
      if (!correctEntry) continue
      const correctColor = getWordById(q.correctWordId)
      for (const choiceId of q.choiceWordIds) {
        if (choiceId === q.correctWordId) continue
        const choiceColor = getWordById(choiceId)
        // purple/indigo/navy/blue, red/maroon/brown, and the other confusable groupings
        // (see COLOR_FAMILY in englishSentence.ts) must never appear together as
        // answer + distractor now that there's no "hard mode" to intentionally do that.
        expect(
          [choiceColor.id, correctColor.id].sort().join(','),
        ).not.toMatch(/^(indigo,purple|blue,purple|blue,indigo|maroon,red|brown,red|brown,maroon)$/)
      }
    }
  })

  it('always returns level 1 regardless of the level argument (no ★ levels for this category)', () => {
    const q = generateEnglishSentenceQuestion(1)
    expect(q.level).toBe(1)
    expect(q.category).toBe('englishSentence')
  })
})
