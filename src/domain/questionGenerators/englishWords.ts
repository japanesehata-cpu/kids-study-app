import type { EnglishWordQuestion, Level } from '../types'
import { wordBank, type WordEntry } from '../wordBank'

function makeId(): string {
  return `word-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
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

/** Held back from quiz rotation until BOTH its pronunciation and its flashcard image
 * have been explicitly confirmed correct — either one failing is enough to exclude a
 * word, so a bad image never shows up paired with correct audio (or vice versa).
 * Assets (image, audio file) stay on disk under public/ — only question selection skips
 * these ids, for both target and distractor draws. Remove an id here once *both* its
 * audio and image are confirmed.
 *
 * Audio-unresolved (pronunciation still wrong after five rounds of fix attempts —
 * see the word-pronunciation project memory):
 * pasta, taco, turquoise, umbrella, socks, ostrich, eye
 *
 * Image-unconfirmed (regenerated via the standard, non-Lightning RealVisXL checkpoint
 * after the Lightning-checkpoint version was reviewed as low quality, but not yet
 * re-confirmed by a human reviewer — see the word-image-review project memory):
 * breeze, caterpillar, chalk, chin, crane, crayon, cucumber, desert, diamond, drizzle,
 * elbow, farm, firefly, garden, glacier, glue, hail, hair, head, humidity, jumprope,
 * ketchup, knee, lighthouse, mango, mayonnaise, mole, mountain, nail, omelette, oval,
 * pentagon, platypus, plum, porcupine, recorder, rectangle, root, sand, shelf,
 * shoulder, skating, soda, square, squid, stingray, tambourine, tapir, textbook,
 * thunder, top, valley, volcano, wind, xylophone, yoyo, zoo
 */
const EXCLUDED_WORD_IDS = new Set([
  // audio-unresolved
  'pasta', 'taco', 'turquoise', 'umbrella', 'socks', 'ostrich', 'eye',
  // image-unconfirmed
  'breeze', 'caterpillar', 'chalk', 'chin', 'crane', 'crayon', 'cucumber', 'desert',
  'diamond', 'drizzle', 'elbow', 'farm', 'firefly', 'garden', 'glacier', 'glue', 'hail',
  'hair', 'head', 'humidity', 'jumprope', 'ketchup', 'knee', 'lighthouse', 'mango',
  'mayonnaise', 'mole', 'mountain', 'nail', 'omelette', 'oval', 'pentagon', 'platypus',
  'plum', 'porcupine', 'recorder', 'rectangle', 'root', 'sand', 'shelf', 'shoulder',
  'skating', 'soda', 'square', 'squid', 'stingray', 'tambourine', 'tapir', 'textbook',
  'thunder', 'top', 'valley', 'volcano', 'wind', 'xylophone', 'yoyo', 'zoo',
])

function eligibleWordBank(): WordEntry[] {
  return wordBank.filter((w) => !EXCLUDED_WORD_IDS.has(w.id))
}

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
