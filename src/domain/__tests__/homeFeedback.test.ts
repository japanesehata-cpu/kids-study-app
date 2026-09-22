import { describe, expect, it } from 'vitest'
import { pickHomeFeedbackMessage, type LastQuizFeedback } from '../homeFeedback'

function feedback(overrides: Partial<LastQuizFeedback> = {}): LastQuizFeedback {
  return {
    category: 'addition',
    leveledUp: false,
    newLevel: 1,
    strongSubSkill: null,
    correctCount: 3,
    total: 5,
    ...overrides,
  }
}

describe('pickHomeFeedbackMessage', () => {
  it('falls back to generic when there is no history yet (first-ever open)', () => {
    expect(pickHomeFeedbackMessage(null)).toEqual({ kind: 'generic' })
  })

  it('prioritizes a level-up over everything else', () => {
    const result = pickHomeFeedbackMessage(
      feedback({ leveledUp: true, newLevel: 3, strongSubSkill: 'addition-carry', correctCount: 5, total: 5 }),
    )
    expect(result).toEqual({ kind: 'levelUp', category: 'addition', level: 3 })
  })

  it('falls back to a strong subSkill when there is no level-up', () => {
    const result = pickHomeFeedbackMessage(feedback({ strongSubSkill: 'addition-carry' }))
    expect(result).toEqual({ kind: 'strong', category: 'addition', subSkill: 'addition-carry' })
  })

  it('falls back to a perfect score when there is no level-up or strong subSkill', () => {
    const result = pickHomeFeedbackMessage(feedback({ correctCount: 5, total: 5 }))
    expect(result).toEqual({ kind: 'perfectScore', category: 'addition', total: 5 })
  })

  it('falls back to generic when the score was not perfect', () => {
    const result = pickHomeFeedbackMessage(feedback({ correctCount: 4, total: 5 }))
    expect(result).toEqual({ kind: 'generic' })
  })

  it('never surfaces a weakSubSkill-flavored message (no such branch exists)', () => {
    // LastQuizFeedback has no weakSubSkill field at all — this test documents that
    // omission is intentional (see the type's own comment) rather than an oversight.
    const result = pickHomeFeedbackMessage(feedback())
    expect(result.kind).not.toBe('weak')
  })
})
