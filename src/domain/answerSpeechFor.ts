import type { Question } from './types'
import type { SpeechPart } from '../lib/tts'
import { getWordById } from './wordBank'
import { getCounterById } from './counterBank'
import { getKanjiById, kanjiSpokenReading } from './kanjiBank'
import { speechSafeChar } from './hiraganaBank'
import { oppositeWordKey } from './oppositeBank'
import {
  clockTimeSpeech,
  countingAnswerSpeech,
  kanaAnswerSpeech,
  kanjiAnswerSpeech,
  moneyAnswerSpeech,
  numberAnswerSpeech,
  numberAnswerVoice,
  oddOneOutAnswerSpeech,
  oppositeAnswerSpeech,
  patternAnswerSpeech,
} from './answerSpeech'

/** How a question's answer is spoken in a wrong-answer message (「こたえは ___ だよ」), as
 * pre-rendered parts — see answerSpeech.ts. undefined where the answer has no Japanese
 * recording: English answers use their own word files (QuizScreen's answerCacheKey), and
 * ずけい is hidden from Home. */
export function computeAnswerSpeech(question: Question): SpeechPart[] | undefined {
  switch (question.category) {
    case 'addition':
    case 'subtraction':
    case 'missingOperandAddition':
    case 'missingOperandSubtraction': {
      const voice = numberAnswerVoice(question.category)!
      return [numberAnswerSpeech(voice, question.blank ? question[question.blank] : question.answer)]
    }
    case 'logic':
      if (question.kind === 'oddOneOut') {
        return [oddOneOutAnswerSpeech(question.answer, getWordById(question.answer).translationJa)]
      }
      if (question.kind === 'opposite') {
        return (question.answers ?? [question.answer]).map((w) => oppositeAnswerSpeech(w, oppositeWordKey(w)))
      }
      if (question.kind === 'compare') return [numberAnswerSpeech('logic', Number(question.answer))]
      if (question.kind === 'pattern') {
        const part = patternAnswerSpeech(question.answer)
        return part ? [part] : undefined
      }
      return undefined
    case 'hiragana':
      return [kanaAnswerSpeech('hiragana', question.charId, speechSafeChar(question.char))]
    case 'katakana':
      return [kanaAnswerSpeech('katakana', question.charId, question.char)]
    case 'kanji':
    case 'kanji2': {
      const entry = getKanjiById(question.charId)
      return [kanjiAnswerSpeech(entry.id, kanjiSpokenReading(entry))]
    }
    case 'clock':
      return clockTimeSpeech(question.hour, question.minute)
    case 'counting': {
      const counter = getCounterById(question.counterId)
      return [countingAnswerSpeech(counter.id, counter.kana)]
    }
    case 'money':
      return [moneyAnswerSpeech(question.targetAmount)]
    default:
      return undefined
  }
}
