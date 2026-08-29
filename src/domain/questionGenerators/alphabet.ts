import type { AlphabetQuestion, Level } from '../types'
import { alphabetBank, type AlphabetEntry } from '../alphabetBank'

function makeId(): string {
  return `alphabet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

function pickDistractors(target: AlphabetEntry, count: number): AlphabetEntry[] {
  return shuffle(alphabetBank.filter((a) => a.id !== target.id)).slice(0, count)
}

function subSkillForLevel(level: Level): string {
  if (level <= 1) return 'alphabet-uppercase'
  if (level === 2) return 'alphabet-lowercase'
  return 'alphabet-case-match'
}

export function generateAlphabetQuestion(level: Level): AlphabetQuestion {
  const target = shuffle(alphabetBank)[0]
  const distractors = pickDistractors(target, 3)

  // ★3: the dedicated upper/lower-case correspondence drill — shown one case, pick the
  // same letter in the other case. This is the actual hard part of learning the alphabet,
  // so it gets its own question shape rather than being folded into the listen-and-pick.
  if (level >= 3) {
    const promptIsUpper = Math.random() < 0.5
    const promptChar = promptIsUpper ? target.upper : target.lower
    const answerChar = promptIsUpper ? target.lower : target.upper
    const choiceIds = shuffle([answerChar, ...distractors.map((d) => (promptIsUpper ? d.lower : d.upper))])
    return {
      id: makeId(),
      category: 'alphabet',
      level,
      letterId: target.id,
      kind: 'caseMatch',
      promptChar,
      answerChar,
      choiceIds,
      subSkill: subSkillForLevel(level),
    }
  }

  // ★1 (uppercase) / ★2 (lowercase): hear the letter's name, pick the matching glyph —
  // mirrors hiragana/katakana's listen-and-pick-the-glyph shape, scoped to one case per
  // level so the case distinction stays unambiguous while it's still new.
  const useUpper = level === 1
  const answerChar = useUpper ? target.upper : target.lower
  const choiceIds = shuffle([answerChar, ...distractors.map((d) => (useUpper ? d.upper : d.lower))])

  return {
    id: makeId(),
    category: 'alphabet',
    level,
    letterId: target.id,
    kind: 'letterName',
    answerChar,
    choiceIds,
    subSkill: subSkillForLevel(level),
  }
}
