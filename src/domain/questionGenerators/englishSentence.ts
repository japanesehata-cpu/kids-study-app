import type { EnglishSentenceQuestion, Level } from '../types'
import { colorSentenceBank } from '../colorSentenceBank'
import { animalSentenceBank } from '../animalSentenceBank'
import { miscSentenceBank } from '../miscSentenceBank'
import { eligibleWordBank, type WordEntry } from '../wordBank'
import { shuffle } from '../../lib/shuffle'

function makeId(): string {
  return `sentence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Which colors read as visually/conceptually close — used to make ★3 distractors
 * genuinely hard to eliminate, and (see pickColorDistractors) to make sure ★1 NEVER
 * coincidentally offers a confusable pair by chance. Every choice here already shares
 * wordBank's 'color' category, so englishWords.ts's same-category-distractor trick can't
 * do this job on its own — needs its own grouping instead.
 *
 * Groupings are derived from actual pairwise "redmean" RGB distance between the real
 * CSS_HEX_COLORS swatch values (see generate-word-images-local.py), not eyeballed — a
 * live report caught brown+maroon appearing together and looking near-identical, which
 * the original hand-guessed grouping (brown next to beige/gold as "warm-orange") had
 * missed entirely. Checking all pairwise distances surfaced several more misses at the
 * same time: pink is much closer to silver/beige/white than to red, and purple/indigo/
 * navy are close enough to fold into one 'cool' group together with blue. */
const COLOR_FAMILY: Record<string, string> = {
  red: 'warm-red', maroon: 'warm-red', brown: 'warm-red',
  yellow: 'warm-yellow', gold: 'warm-yellow',
  green: 'green',
  blue: 'cool', navy: 'cool', turquoise: 'cool', indigo: 'cool', purple: 'cool',
  white: 'light-neutral', beige: 'light-neutral', pink: 'light-neutral', silver: 'light-neutral', gray: 'light-neutral',
  black: 'black',
}

const ALL_COLOR_IDS = Object.keys(COLOR_FAMILY)

/** No level/difficulty split any more (this category has no ★ levels at all — see
 * LevelSelectScreen's skip for 'englishSentence' and CATEGORY_MAX_LEVEL). Distractors
 * always draw from OTHER color families only, never the same one — e.g. grapes' answer
 * "purple" never appears alongside "indigo" as a choice, since a real child (and plenty of
 * adults) can't reliably tell those apart. A same-family "hard" mode existed briefly during
 * this session's level system but was removed: confusable-on-purpose distractors aren't a
 * legitimate difficulty knob, just an unfair question. */
function pickColorDistractors(correctColorId: string): string[] {
  const family = COLOR_FAMILY[correctColorId]
  const otherFamilies = ALL_COLOR_IDS.filter((c) => c !== correctColorId && COLOR_FAMILY[c] !== family)
  return shuffle(otherFamilies).slice(0, 3)
}

/** Riddles outside the color bank skip the hard/easy split entirely (flat random at every
 * level) — unlike a color swatch, the riddle sentence itself is already the hard part, and
 * wordBank has no existing sub-grouping (habitat, material, ...) to build a "same family"
 * distinction on top of for any of these categories. Shared by animal riddles and every
 * category in miscSentenceBank.ts. */
function pickCategoryDistractors(correctWordId: string, category: WordEntry['category']): string[] {
  const pool = eligibleWordBank()
    .filter((w) => w.category === category && w.id !== correctWordId)
    .map((w) => w.id)
  return shuffle(pool).slice(0, 3)
}

type PoolEntry =
  | { kind: 'color'; sentenceId: string; question: string; answerWordId: string }
  | { kind: 'category'; sentenceId: string; question: string; answerWordId: string; wordCategory: WordEntry['category'] }

/** sentenceId is prefixed by its content bank/category ("color-banana", "animal-kangaroo",
 * "vehicle-train") so it stays globally unique across every bank even where a bank-local id
 * might coincidentally collide (e.g. 'elephant' is both a color-bank entry and an
 * animal-bank one), and so it doubles directly as the `sentence-${sentenceId}.wav` audio
 * cache key. */
function buildPool(): PoolEntry[] {
  return [
    ...colorSentenceBank.map((e) => ({
      kind: 'color' as const,
      sentenceId: `color-${e.id}`,
      question: e.question,
      answerWordId: e.colorId,
    })),
    ...animalSentenceBank.map((e) => ({
      kind: 'category' as const,
      sentenceId: `animal-${e.id}`,
      question: e.question,
      answerWordId: e.animalId,
      wordCategory: 'animal' as const,
    })),
    ...miscSentenceBank.map((e) => ({
      kind: 'category' as const,
      sentenceId: `${e.category}-${e.id}`,
      question: e.question,
      answerWordId: e.wordId,
      wordCategory: e.category,
    })),
  ]
}

/** `level` is accepted only to match every other generator's `(level: Level) => Question`
 * shape (see generateFreshQuestion's switch in progress.ts) — this category has no ★
 * levels (see CATEGORY_MAX_LEVEL and LevelSelectScreen), so the value is always 1 and
 * otherwise unused. */
export function generateEnglishSentenceQuestion(level: Level): EnglishSentenceQuestion {
  const entry = shuffle(buildPool())[0]
  const distractors =
    entry.kind === 'color'
      ? pickColorDistractors(entry.answerWordId)
      : pickCategoryDistractors(entry.answerWordId, entry.wordCategory)
  const choiceWordIds = shuffle([entry.answerWordId, ...distractors])

  return {
    id: makeId(),
    category: 'englishSentence',
    level,
    sentenceId: entry.sentenceId,
    question: entry.question,
    correctWordId: entry.answerWordId,
    choiceWordIds,
    subSkill: entry.kind === 'color' ? 'sentence-color' : `sentence-${entry.wordCategory}`,
  }
}
