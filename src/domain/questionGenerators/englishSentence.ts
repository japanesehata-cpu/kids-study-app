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

/** Same curve as englishWords.ts's shouldUseHardDistractors — ★1 always easy, ★2 a coin
 * flip, ★3+ always hard. This category caps at ★3 (see CATEGORY_MAX_LEVEL), so this covers
 * its full range. */
function shouldUseHardDistractors(level: Level): boolean {
  if (level <= 1) return false
  if (level === 2) return Math.random() < 0.5
  return true
}

function pickColorDistractors(correctColorId: string, hard: boolean): string[] {
  const family = COLOR_FAMILY[correctColorId]
  const sameFamily = ALL_COLOR_IDS.filter((c) => c !== correctColorId && COLOR_FAMILY[c] === family)
  const otherFamilies = ALL_COLOR_IDS.filter((c) => c !== correctColorId && COLOR_FAMILY[c] !== family)

  if (hard) {
    // Same-family (genuinely confusable) colors first, topped up from the rest if the
    // family is too small to fill all 3 slots alone (e.g. brown/maroon/red only has 2
    // other members) — always includes every real confusable option rather than an
    // all-or-nothing "only if >=3 exist" cutoff, which used to silently skip hard mode
    // entirely for exactly this kind of 3-member family.
    return [...shuffle(sameFamily), ...shuffle(otherFamilies)].slice(0, 3)
  }
  // Easy mode only ever draws from OTHER families, so a same-family (confusable) color
  // never appears by chance even at ★1 — this is the actual fix for the reported bug:
  // brown's question could previously also draw maroon at "easy" purely by luck, since
  // easy mode was unrestricted random-from-everything.
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

export function generateEnglishSentenceQuestion(level: Level): EnglishSentenceQuestion {
  const entry = shuffle(buildPool())[0]
  const distractors =
    entry.kind === 'color'
      ? pickColorDistractors(entry.answerWordId, shouldUseHardDistractors(level))
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
