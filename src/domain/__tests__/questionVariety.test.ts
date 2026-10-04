import { describe, expect, it } from 'vitest'
import { applySetResult, createInitialProgress, generateQuestionSet, recencyKey } from '../progress'
import { generateAdditionQuestion } from '../questionGenerators/addition'
import { generateSubtractionQuestion } from '../questionGenerators/subtraction'
import { generateMissingOperandQuestion } from '../questionGenerators/missingOperand'
import { generateMoneyQuestion } from '../questionGenerators/money'
import type { Category, Level, Question } from '../types'

/** Ratio of the most-frequent problem's count to the average — 1.0 is perfectly even. */
function maxOverMean(draw: () => string, draws: number): number {
  const freq = new Map<string, number>()
  for (let i = 0; i < draws; i++) {
    const k = draw()
    freq.set(k, (freq.get(k) ?? 0) + 1)
  }
  const counts = [...freq.values()]
  return Math.max(...counts) / (draws / counts.length)
}

const pair = (q: Question) => ('operandA' in q ? `${q.operandA},${q.operandB}` : '')

describe('every distinct problem is equally likely', () => {
  // Before: sum-then-split made e.g. たしざん★5's 10+10 come up ~3.5x as often as average.
  it.each([
    ['たしざん★4', () => pair(generateAdditionQuestion(4))],
    ['たしざん★5', () => pair(generateAdditionQuestion(5))],
    ['ひきざん★5', () => pair(generateSubtractionQuestion(5))],
    ['□のけいさん(たしざん)★1', () => pair(generateMissingOperandQuestion(1, 'addition'))],
    ['□のけいさん(ひきざん)★2', () => pair(generateMissingOperandQuestion(2, 'subtraction'))],
    ['おかね★5', () => String(generateMoneyQuestion(5).targetAmount)],
  ])('%s', (_label, draw) => {
    expect(maxOverMean(draw, 12000)).toBeLessThan(1.35)
  })
})

describe('consecutive rounds avoid repeating recent questions', () => {
  function playRounds(category: Category, level: Level, rounds: number): string[][] {
    let progress = createInitialProgress()
    const sets: string[][] = []
    for (let r = 0; r < rounds; r++) {
      const set = generateQuestionSet(category, level, [], 5, undefined, undefined, progress[category].recent)
      sets.push(set.map(recencyKey))
      // Every answer correct, so nothing enters the (intentional) review queue.
      const answers = set.map((q) => ({ questionId: q.id, category, subSkill: q.subSkill, correct: true, question: q }))
      progress = applySetResult(category, level, progress, answers).progress
    }
    return sets
  }

  it.each([
    ['kanji', 2],
    ['hiragana', 1],
    ['clock', 2],
    ['addition', 3],
  ] as [Category, Level][])('%s ★%i: no question repeats in the very next round', (category, level) => {
    const sets = playRounds(category, level, 30)
    for (let i = 1; i < sets.length; i++) {
      const prev = new Set(sets[i - 1])
      expect(sets[i].filter((k) => prev.has(k)), `round ${i}`).toEqual([])
    }
  })

  it('remembers asked questions in saved progress (capped)', () => {
    const sets = playRounds('kanji', 6, 12)
    expect(sets.flat().length).toBe(60)
    let progress = createInitialProgress()
    const set = generateQuestionSet('kanji', 1, [], 5)
    const answers = set.map((q) => ({ questionId: q.id, category: 'kanji' as Category, subSkill: q.subSkill, correct: true, question: q }))
    progress = applySetResult('kanji', 1, progress, answers).progress
    expect(progress.kanji.recent).toEqual(set.map(recencyKey))
  })
})
