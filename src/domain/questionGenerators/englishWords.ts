import type { EnglishWordQuestion, Level } from '../types'
import { eligibleWordBank, type WordEntry } from '../wordBank'
import { shuffle } from '../../lib/shuffle'

function makeId(): string {
  return `word-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Word length as a free difficulty signal — no per-word hand-tagging needed, and it
 * tracks vocabulary difficulty well enough in practice (bird/cat/dog vs. rhinoceros/
 * chameleon/playground). Each level's cap is strictly looser than the last, so the
 * word pool keeps opening up through all 5 levels instead of leveling off at ★3. */
const MAX_WORD_LENGTH: Record<Level, number> = {
  1: 4,
  2: 6,
  3: 8,
  4: 11,
  5: Infinity,
}

/** Falls back to the whole bank if a level's length cap leaves too few words to pick a
 * varied target from (mainly a concern for ★1's short-word pool). */
const MIN_POOL_SIZE = 10

function pickTarget(level: Level): WordEntry {
  const eligible = eligibleWordBank()
  const capped = eligible.filter((w) => w.word.length <= MAX_WORD_LENGTH[level])
  const pool = capped.length >= MIN_POOL_SIZE ? capped : eligible
  return shuffle(pool)[0]
}

/** ★1 always uses obviously-unrelated distractors; ★2 mixes in same-theme ones half the
 * time; ★3+ always pulls from the same theme (e.g. other fruits), which is much harder
 * to eliminate than an obviously-unrelated word. */
function shouldUseHardDistractors(level: Level): boolean {
  if (level <= 1) return false
  if (level === 2) return Math.random() < 0.5
  return true
}

function pickDistractors(target: WordEntry, sameCategory: boolean, count: number): WordEntry[] {
  const eligible = eligibleWordBank()
  const sameCategoryPool = eligible.filter((w) => w.category === target.category && w.id !== target.id)
  const pool = sameCategory && sameCategoryPool.length >= count ? sameCategoryPool : eligible.filter((w) => w.id !== target.id)
  return shuffle(pool).slice(0, count)
}

function buildQuestion(
  category: 'englishSpelling' | 'englishListening',
  mode: EnglishWordQuestion['mode'],
  level: Level,
): EnglishWordQuestion {
  const target = pickTarget(level)
  const useHardDistractors = shouldUseHardDistractors(level)
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
