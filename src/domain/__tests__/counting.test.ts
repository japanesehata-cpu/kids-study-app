import { describe, expect, it } from 'vitest'
import { generateCountingQuestion } from '../questionGenerators/counting'
import { counterBank, getCounterById } from '../counterBank'

describe('generateCountingQuestion', () => {
  it('always returns level 1 regardless of the level argument (no ★ levels for this category)', () => {
    const q = generateCountingQuestion(1)
    expect(q.level).toBe(1)
    expect(q.category).toBe('counting')
  })

  it('produces 4 unique choices that always include the correct counterId', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateCountingQuestion(1)
      expect(q.choiceCounterIds).toHaveLength(4)
      expect(new Set(q.choiceCounterIds).size).toBe(4)
      expect(q.choiceCounterIds).toContain(q.counterId)
    }
  })

  it('exampleWordId always matches the chosen counter entry\'s own example', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateCountingQuestion(1)
      expect(q.exampleWordId).toBe(getCounterById(q.counterId).exampleWordId)
    }
  })

  it('eventually draws from every counter in the bank', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 500; i++) {
      seen.add(generateCountingQuestion(1).counterId)
    }
    expect(seen.size).toBe(counterBank.length)
  })
})
