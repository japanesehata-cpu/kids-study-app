import type { Level, LogicQuestion } from '../types'
import { wordBank } from '../wordBank'

function makeId(): string {
  return `logic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

/** 'color' and 'shape' are excluded entirely: both are attributes, not a kind of thing like
 * the other categories (animal/food/nature/vehicle/...), so pitting a color swatch or a bare
 * geometric outline against a photo of an actual object is an apples-to-oranges comparison —
 * they keep their proper role in the englishWords word↔picture matching game instead.
 *
 * heart/star/balloon are excluded by id even though wordBank still tags them 'nature' (that
 * tag only needs to be roughly right for englishWords' same-category distractor picking) —
 * rendered through the realistic-photo style, they come out as a plush cushion, a hanging
 * ornament, and a party balloon, i.e. man-made decorative objects, not anything natural. */
const ODD_ONE_OUT_EXCLUDED_IDS = new Set(['heart', 'star', 'balloon'])
const ODD_ONE_OUT_EXCLUDED_CATEGORIES = new Set(['color', 'shape'])
const ODD_ONE_OUT_POOL = wordBank.filter(
  (w) => !ODD_ONE_OUT_EXCLUDED_CATEGORIES.has(w.category) && !ODD_ONE_OUT_EXCLUDED_IDS.has(w.id),
)

/** Not every pair of categories makes a fair "which one doesn't belong" contrast: 'nature'
 * (sun/moon/flower/cloud/mountain) is itself a natural thing, so pitting it against
 * 'animal' or 'food' produces a false explanation ("the others are all natural, but only
 * the banana is different" — a banana is natural too). 'weather' (rain/snow/wind) and
 * 'place' (beach/farm/park have real natural elements) share that same problem against
 * 'nature' specifically. Every other pair of categories — including these two against
 * animal/food/vehicle — is a fine, unambiguous contrast and can freely mix. */
const CATEGORY_CONTRAST_DISALLOWED = new Set(['animal|nature', 'food|nature', 'nature|weather', 'nature|place'])

function allowedOddCategories(mainCategory: string, categories: string[]): string[] {
  return categories.filter((c) => {
    if (c === mainCategory) return false
    const pairKey = [mainCategory, c].sort().join('|')
    return !CATEGORY_CONTRAST_DISALLOWED.has(pairKey)
  })
}

function generateOddOneOut(level: Level): LogicQuestion {
  const categories = [...new Set(ODD_ONE_OUT_POOL.map((w) => w.category))]
  const mainCategory = pickRandom(categories)
  const mainPool = ODD_ONE_OUT_POOL.filter((w) => w.category === mainCategory)
  const group = shuffle(mainPool).slice(0, 3)

  const oddCategory = pickRandom(allowedOddCategories(mainCategory, categories))
  const odd = pickRandom(ODD_ONE_OUT_POOL.filter((w) => w.category === oddCategory))

  const choices = shuffle([...group.map((w) => w.id), odd.id])

  return {
    id: makeId(),
    category: 'logic',
    level,
    kind: 'oddOneOut',
    choices,
    answer: odd.id,
    subSkill: 'logic-oddOneOut',
  }
}

export const SYMBOL_SETS: string[][] = [
  ['🔴', '🔵', '🟡', '🟢', '🟣'],
  ['⭐️', '🌙', '☀️', '☁️', '⚡️'],
  ['🍎', '🍌', '🍇', '🍓', '🍊'],
  ['🐱', '🐶', '🐰', '🐻', '🐼'],
  ['💗', '💛', '💚', '💙', '💜'],
]

/** ★2 (pattern's first appearance) keeps a simple 2-symbol cycle on a short 5-symbol
 * strip. ★3-★5 each draw a strictly longer cycle (3, then 4, then 5 symbols) instead of
 * a random 3-5 for all three, so the hardest tier is reliably the hardest tier rather
 * than sometimes coinciding with ★3's easiest possible draw. */
const PATTERN_CYCLE_LEN: Record<Level, number> = { 1: 2, 2: 2, 3: 3, 4: 4, 5: 5 }
const PATTERN_SEQ_LEN: Record<Level, number> = { 1: 5, 2: 5, 3: 8, 4: 9, 5: 10 }

function generatePattern(level: Level): LogicQuestion {
  const set = pickRandom(SYMBOL_SETS)
  const cycleLen = PATTERN_CYCLE_LEN[level]
  const symbols = set.slice(0, cycleLen)
  const seqLen = PATTERN_SEQ_LEN[level]

  const sequence = Array.from({ length: seqLen }, (_, i) => symbols[i % cycleLen])
  const answer = symbols[seqLen % cycleLen]

  // Distractors come from the same 5-symbol set first (other colors of the same heart,
  // say) rather than unrelated sets — otherwise, once a cycle uses all 5 members of a set
  // (every heart color, every color-circle), the only leftover candidates are visually
  // unrelated symbols (a sun, a cloud) and the answer stands out by shape alone before the
  // sequence is even read. Same-set alternatives force actually tracking which one comes
  // next. Every set has exactly 5 members, so this alone always covers the 3 needed slots;
  // the cross-set fallback only matters if that ever changes.
  const sameSetDistractors = shuffle(set.filter((e) => e !== answer))
  const crossSetDistractors = shuffle(SYMBOL_SETS.flat().filter((e) => !set.includes(e)))
  const distractorPool = [...sameSetDistractors, ...crossSetDistractors]
  const choices = shuffle([answer, ...distractorPool.slice(0, 3)])

  return {
    id: makeId(),
    category: 'logic',
    level,
    kind: 'pattern',
    sequence,
    choices,
    answer,
    subSkill: 'logic-pattern',
  }
}

// compare only ever appears at ★3+ — its own range still climbs across those levels
// instead of coin-flipping between easy/hard regardless of which one, so ★5 reliably
// compares bigger numbers than ★3 does.
const COMPARE_MAX: Record<Level, number> = { 1: 10, 2: 10, 3: 10, 4: 14, 5: 18 }

function generateCompare(level: Level): LogicQuestion {
  const max = COMPARE_MAX[level]
  const numbers = new Set<number>()
  while (numbers.size < 4) numbers.add(randomInt(0, max))
  const numberList = [...numbers]

  const compareGoal: 'max' | 'min' = Math.random() < 0.5 ? 'max' : 'min'
  const answerNumber = compareGoal === 'max' ? Math.max(...numberList) : Math.min(...numberList)

  return {
    id: makeId(),
    category: 'logic',
    level,
    kind: 'compare',
    compareGoal,
    choices: numberList.map(String),
    answer: String(answerNumber),
    subSkill: 'logic-compare',
  }
}

/** ★1: oddOneOut only. ★2: adds pattern. ★3+: adds compare, and each higher level leans
 * further toward pattern/compare (each with its own escalating internal difficulty
 * above) instead of picking uniformly among all three the way ★3-★5 used to, so the
 * overall question mix keeps getting harder too, not just the individual question types. */
const KIND_WEIGHTS: Record<Level, LogicQuestion['kind'][]> = {
  1: ['oddOneOut'],
  2: ['oddOneOut', 'oddOneOut', 'pattern'],
  3: ['oddOneOut', 'pattern', 'compare'],
  4: ['oddOneOut', 'pattern', 'pattern', 'compare', 'compare'],
  5: ['oddOneOut', 'pattern', 'compare', 'compare', 'compare'],
}

export function generateLogicQuestion(level: Level): LogicQuestion {
  const kind = pickRandom(KIND_WEIGHTS[level])

  switch (kind) {
    case 'oddOneOut':
      return generateOddOneOut(level)
    case 'pattern':
      return generatePattern(level)
    case 'compare':
      return generateCompare(level)
  }
}
