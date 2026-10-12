import { describe, expect, it } from 'vitest'
import { generateCountingQuestion } from '../questionGenerators/counting'
import { counterBank, counterReading, getCounterById, naiveCounterReading } from '../counterBank'
import { buildExplanation } from '../explanations'

describe('generateCountingQuestion', () => {
  it('always returns level 1 regardless of the level argument (no ★ levels for this category)', () => {
    const q = generateCountingQuestion(1)
    expect(q.level).toBe(1)
    expect(q.category).toBe('counting')
  })

  it('answers with the reading for that number, not just the counter (2人 → ふたり)', () => {
    for (let i = 0; i < 300; i++) {
      const q = generateCountingQuestion(1)
      expect(q.answerReading).toBe(counterReading(getCounterById(q.counterId), q.count))
    }
    expect(counterReading(getCounterById('nin'), 2)).toBe('ふたり')
    expect(counterReading(getCounterById('hon'), 1)).toBe('いっぽん')
    expect(counterReading(getCounterById('hiki'), 3)).toBe('さんびき')
  })

  it('produces 4 unique choices that include the answer', () => {
    for (let i = 0; i < 300; i++) {
      const q = generateCountingQuestion(1)
      expect(q.choiceReadings).toHaveLength(4)
      expect(new Set(q.choiceReadings).size).toBe(4)
      expect(q.choiceReadings).toContain(q.answerReading)
    }
  })

  it('puts the "no sound change" mistake among the choices when the sound does change', () => {
    for (let i = 0; i < 300; i++) {
      const q = generateCountingQuestion(1)
      const naive = naiveCounterReading(getCounterById(q.counterId), q.count)
      if (naive !== q.answerReading) expect(q.choiceReadings).toContain(naive)
    }
  })

  it('never asks a count whose reading is unsettled (3羽, 3軒, 3足, 皿・粒 from 3)', () => {
    for (let i = 0; i < 500; i++) {
      const q = generateCountingQuestion(1)
      expect(getCounterById(q.counterId).readings[q.count - 1]).not.toBeNull()
    }
    expect(getCounterById('wa').readings[2]).toBeNull()
    expect(getCounterById('sara').readings.slice(2)).toEqual([null, null, null])
  })

  it('exampleWordId always matches the chosen counter entry\'s own example', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateCountingQuestion(1)
      expect(q.exampleWordId).toBe(getCounterById(q.counterId).exampleWordId)
    }
  })

  it('eventually draws from every counter in the bank, at counts 1 to 5', () => {
    const seen = new Set<string>()
    const seenCounts = new Set<number>()
    for (let i = 0; i < 800; i++) {
      const q = generateCountingQuestion(1)
      seen.add(q.counterId)
      seenCounts.add(q.count)
    }
    expect(seen.size).toBe(counterBank.length)
    expect(seenCounts).toEqual(new Set([1, 2, 3, 4, 5]))
  })

  it('every counter has 5 readings, each of them distinct', () => {
    for (const c of counterBank) {
      expect(c.readings, c.id).toHaveLength(5)
      const set = c.readings.filter(Boolean)
      expect(new Set(set).size, c.id).toBe(set.length)
    }
  })

  it('explains a sound change by naming the easy mistake', () => {
    const q = { ...generateCountingQuestion(1), counterId: 'nin', count: 2, answerReading: 'ふたり' }
    expect(buildExplanation(q, 'ja')).toBe('「ににん」じゃなくて 「ふたり」（2人）と いうよ。')
    const r = { ...q, counterId: 'mai', answerReading: 'にまい' }
    expect(buildExplanation(r, 'ja')).toBe('こたえは 「にまい」（2枚）だよ。')
  })
})
