import type { EnglishWordQuestion, Level } from '../types'
import { wordBank, type WordEntry } from '../wordBank'

function makeId(): string {
  return `word-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

function pickTarget(): WordEntry {
  return shuffle(wordBank)[0]
}

/** ★3 pulls distractors from the same theme (e.g. other fruits), which is much harder to
 * eliminate than an obviously-unrelated word. */
function pickDistractors(target: WordEntry, sameCategory: boolean, count: number): WordEntry[] {
  const sameCategoryPool = wordBank.filter((w) => w.category === target.category && w.id !== target.id)
  const pool = sameCategory && sameCategoryPool.length >= count ? sameCategoryPool : wordBank.filter((w) => w.id !== target.id)
  return shuffle(pool).slice(0, count)
}

function buildQuestion(
  category: 'englishSpelling' | 'englishListening',
  mode: EnglishWordQuestion['mode'],
  level: Level,
): EnglishWordQuestion {
  const target = pickTarget()
  const useHardDistractors = level >= 3
  const distractors = pickDistractors(target, useHardDistractors, 3)
  const choiceWordIds = shuffle([target.id, ...distractors.map((d) => d.id)])

  return {
    id: makeId(),
    category,
    level,
    wordId: target.id,
    word: target.word,
    translationJa: target.translationJa,
    mode,
    choiceWordIds,
    subSkill: `word-${target.category}`,
  }
}

/** Shown a picture, choose the matching written word — its own category/entry point (see
 * LevelSelectScreen) with independent level progression, rather than one mode mixed
 * randomly into a shared "englishWords" category. */
export function generateEnglishSpellingQuestion(level: Level): EnglishWordQuestion {
  return buildQuestion('englishSpelling', 'lookAndPick', level)
}

/** Hear the word spoken, choose the matching picture. */
export function generateEnglishListeningQuestion(level: Level): EnglishWordQuestion {
  return buildQuestion('englishListening', 'listenAndPick', level)
}
