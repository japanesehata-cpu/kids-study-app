import { describe, expect, it } from 'vitest'
import {
  applySetResult,
  createInitialProgress,
  generateQuestionSet,
  getCategoryMaxLevel,
  SET_SIZE,
} from '../progress'
import type { AnswerRecord, ArithmeticQuestion, Category, Level } from '../types'

function makeQuestion(id: string, subSkill: string, seed: number): ArithmeticQuestion {
  const operandA = 1 + (seed % 8)
  const operandB = 1 + ((seed + 3) % 8)
  return {
    id,
    category: 'addition',
    operator: 'addition',
    level: 1,
    operandA,
    operandB,
    answer: operandA + operandB,
    showVisual: false,
    subSkill,
  }
}

function makeAnswers(correctCount: number, total = SET_SIZE): AnswerRecord[] {
  return Array.from({ length: total }, (_, i) => {
    const question = makeQuestion(`q${i}`, 'addition-no-carry', i)
    return {
      questionId: question.id,
      category: 'addition' as const,
      subSkill: question.subSkill,
      correct: i < correctCount,
      question,
    }
  })
}

const ALL_CATEGORIES: Category[] = [
  'addition',
  'subtraction',
  'englishSpelling',
  'englishListening',
  'logic',
  'hiragana',
  'katakana',
  'alphabet',
  'clock',
  'spotDifference',
  'counting',
  'missingOperand',
]

describe('generateQuestionSet', () => {
  it('produces exactly SET_SIZE questions for every category and level', () => {
    for (const category of ALL_CATEGORIES) {
      const maxLevel = getCategoryMaxLevel(category)
      for (let level = 1; level <= maxLevel; level++) {
        const questions = generateQuestionSet(category, level as Level, [])
        expect(questions).toHaveLength(SET_SIZE)
      }
    }
  })
})

describe('applySetResult', () => {
  it('levels up after two consecutive sets at 80%+ accuracy at the same level', () => {
    let progress = createInitialProgress()
    expect(progress.addition.level).toBe(1)

    let applied = applySetResult('addition', 1, progress, makeAnswers(9))
    progress = applied.progress
    expect(progress.addition.level).toBe(1)

    applied = applySetResult('addition', 1, progress, makeAnswers(9))
    progress = applied.progress
    expect(progress.addition.level).toBe(2)
    expect(applied.result.leveledUp).toBe(true)
  })

  it('holds the level after weak sets', () => {
    let progress = createInitialProgress()

    let applied = applySetResult('addition', 1, progress, makeAnswers(3))
    progress = applied.progress
    applied = applySetResult('addition', 1, progress, makeAnswers(3))
    progress = applied.progress

    expect(progress.addition.level).toBe(1)
  })

  it('starts a fresh accuracy window when the played level differs from the stored one', () => {
    let progress = createInitialProgress()
    // a strong set at level 1, then a manually-chosen level 3 set shouldn't combine with it
    progress = applySetResult('addition', 1, progress, makeAnswers(9)).progress
    const applied = applySetResult('addition', 3, progress, makeAnswers(9))
    // only one strong set has been recorded at level 3, so it should not level up yet
    expect(applied.progress.addition.level).toBe(3)
    expect(applied.progress.addition.recentAccuracy).toHaveLength(1)
    // manually jumping to a harder level via the level picker is not an earned "level up" —
    // the stored level tracks the manual choice, but the congratulatory banner/announcement
    // should only fire for a genuine two-in-a-row promotion, not this kind of self-selection
    expect(applied.result.leveledUp).toBe(false)
  })

  it('queues missed questions for review', () => {
    const progress = createInitialProgress()
    const answers = makeAnswers(7) // 3 wrong
    const { progress: next } = applySetResult('addition', 1, progress, answers)
    expect(next.addition.reviewQueue.length).toBe(3)
  })

  it('reports no strong/weak sub-skill when every sub-skill ties (no real spread)', () => {
    // two distinct sub-skills, both at 0% — previously this made pickExtreme resolve both
    // "strong" and "weak" to the same first-seen sub-skill, showing it as both a strength
    // and something needing practice at once
    const progress = createInitialProgress()
    const answers: AnswerRecord[] = [0, 1].map((i) => {
      const question = makeQuestion(`q${i}`, i === 0 ? 'addition-no-carry' : 'addition-carry', i)
      return { questionId: question.id, category: 'addition' as const, subSkill: question.subSkill, correct: false, question }
    })
    const { result } = applySetResult('addition', 1, progress, answers)
    expect(result.strongSubSkill).toBeNull()
    expect(result.weakSubSkill).toBeNull()
  })

  it('reports the genuinely better/worse sub-skill when accuracy actually differs', () => {
    const progress = createInitialProgress()
    const answers: AnswerRecord[] = [0, 1].map((i) => {
      const question = makeQuestion(`q${i}`, i === 0 ? 'addition-no-carry' : 'addition-carry', i)
      return { questionId: question.id, category: 'addition' as const, subSkill: question.subSkill, correct: i === 0, question }
    })
    const { result } = applySetResult('addition', 1, progress, answers)
    expect(result.strongSubSkill).toBe('addition-no-carry')
    expect(result.weakSubSkill).toBe('addition-carry')
  })

  it('never advances addition past its category max level', () => {
    let progress = createInitialProgress()
    for (let i = 0; i < 12; i++) {
      progress = applySetResult('addition', progress.addition.level, progress, makeAnswers(10)).progress
    }
    expect(progress.addition.level).toBe(getCategoryMaxLevel('addition'))
  })
})
