/// <reference types="node" />
import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Level, Question } from '../types'
import { computeAnswerSpeech } from '../answerSpeechFor'
import { minuteReading, minuteSuffix, SET_TIME_PROMPT_AFTER, SET_TIME_PROMPT_BEFORE } from '../answerSpeech'
import { generateAdditionQuestion } from '../questionGenerators/addition'
import { generateSubtractionQuestion } from '../questionGenerators/subtraction'
import { generateMissingOperandQuestion } from '../questionGenerators/missingOperand'
import { generateLogicQuestion } from '../questionGenerators/logic'
import { generateHiraganaQuestion } from '../questionGenerators/hiragana'
import { generateKatakanaQuestion } from '../questionGenerators/katakana'
import { generateKanjiQuestion } from '../questionGenerators/kanji'
import { generateClockQuestion } from '../questionGenerators/clock'
import { generateCountingQuestion } from '../questionGenerators/counting'
import { generateMoneyQuestion } from '../questionGenerators/money'

const AUDIO_DIR = path.join(__dirname, '..', '..', '..', 'public', 'audio')
const LEVELS: Level[] = [1, 2, 3, 4, 5, 6]

const GENERATORS: [string, (level: Level) => Question][] = [
  ['addition', generateAdditionQuestion],
  ['subtraction', generateSubtractionQuestion],
  ['missingOperandAddition', (l) => generateMissingOperandQuestion(l, 'addition')],
  ['missingOperandSubtraction', (l) => generateMissingOperandQuestion(l, 'subtraction')],
  ['logic', generateLogicQuestion],
  ['hiragana', generateHiraganaQuestion],
  ['katakana', generateKatakanaQuestion],
  ['kanji', (l) => generateKanjiQuestion(l, 1)],
  ['kanji2', (l) => generateKanjiQuestion(l, 2)],
  ['clock', generateClockQuestion],
  ['counting', generateCountingQuestion],
  ['money', generateMoneyQuestion],
]

describe('wrong-answer speech: every answer has a pre-rendered recording', () => {
  for (const [name, generate] of GENERATORS) {
    it(name, () => {
      const missing = new Set<string>()
      for (const level of LEVELS) {
        for (let n = 0; n < 1500; n++) {
          let q: Question
          try {
            q = generate(level)
          } catch {
            continue // a level this category doesn't have
          }
          const parts = computeAnswerSpeech(q)
          expect(parts, `${name} ★${level}`).toBeDefined()
          for (const p of parts!) if (!existsSync(path.join(AUDIO_DIR, `${p.cacheKey}.wav`))) missing.add(`${p.cacheKey} (${p.text})`)
        }
      }
      expect([...missing]).toEqual([])
    })
  }

  it('とけい「あわせる」 prompt pieces exist', () => {
    for (const p of [SET_TIME_PROMPT_BEFORE, SET_TIME_PROMPT_AFTER]) {
      expect(existsSync(path.join(AUDIO_DIR, `${p.cacheKey}.wav`))).toBe(true)
    }
  })
})

describe('分 readings', () => {
  it('uses ぷん/ふん correctly', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((m) => `${m}${minuteSuffix(m)}`)).toEqual([
      '1ぷん', '2ふん', '3ぷん', '4ぷん', '5ふん', '6ぷん', '7ふん', '8ぷん', '9ふん', '10ぷん',
    ])
    expect(minuteReading(10)).toBe('じゅっぷん')
    expect(minuteReading(20)).toBe('にじゅっぷん')
    expect(minuteReading(45)).toBe('よんじゅうごふん')
    expect(minuteReading(31)).toBe('さんじゅういっぷん')
    expect(minuteReading(30)).toBe('はん')
  })
})

describe('なぞる explanations: every example sentence has a recording', () => {
  it('ひらがな / カタカナ / かんじ', async () => {
    const { hiraganaBank } = await import('../hiraganaBank')
    const { katakanaBank } = await import('../katakanaBank')
    const { kanjiBank } = await import('../kanjiBank')
    const keys = [
      ...hiraganaBank.filter((e) => e.exampleSentenceJa).map((e) => `hiragana-review-${e.id}`),
      ...katakanaBank.filter((e) => e.exampleSentenceJa).map((e) => `katakana-review-${e.id}`),
      ...kanjiBank.filter((e) => e.exampleSentenceJa).map((e) => `kanji-review-${e.id}`),
    ]
    expect(keys.filter((k) => !existsSync(path.join(AUDIO_DIR, `${k}.wav`)))).toEqual([])
  })
})
