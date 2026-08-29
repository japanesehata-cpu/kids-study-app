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

/** 'color' is excluded entirely: it's an attribute, not a kind of thing like the other
 * categories (animal/food/nature/vehicle), so pitting a color swatch against a photo of an
 * actual object is an apples-to-oranges comparison — colors keep their proper role in the
 * englishWords word↔swatch matching game instead.
 *
 * heart/star/balloon are excluded by id even though wordBank still tags them 'nature' (that
 * tag only needs to be roughly right for englishWords' same-category distractor picking) —
 * rendered through the realistic-photo style, they come out as a plush cushion, a hanging
 * ornament, and a party balloon, i.e. man-made decorative objects, not anything natural. */
const ODD_ONE_OUT_EXCLUDED_IDS = new Set(['heart', 'star', 'balloon'])
const ODD_ONE_OUT_POOL = wordBank.filter((w) => w.category !== 'color' && !ODD_ONE_OUT_EXCLUDED_IDS.has(w.id))

/** Not every pair of categories makes a fair "which one doesn't belong" contrast: 'nature'
 * (sun/moon/flower/cloud/mountain) is itself a natural thing, so pitting it against
 * 'animal' or 'food' produces a false explanation ("the others are all natural, but only
 * the banana is different" — a banana is natural too). 'vehicle' is the one category
 * that's unambiguously not natural, so those two pairings are disallowed in both
 * directions; every other pair of categories is fine and can freely mix. */
const CATEGORY_CONTRAST_DISALLOWED = new Set(['animal|nature', 'food|nature'])

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

function generatePattern(level: Level): LogicQuestion {
  const set = pickRandom(SYMBOL_SETS)
  // ★2 (age 5, pattern's first appearance) keeps it to a simple 2-symbol cycle shown as a
  // short 5-symbol strip. ★3 (age 6, the hardest level) draws a longer cycle — 3 to 5
  // symbols — shown across a full 10-symbol strip, so even a 5-symbol cycle repeats at
  // least once before the blank.
  const cycleLen = level <= 2 ? 2 : randomInt(3, 5)
  const symbols = set.slice(0, cycleLen)
  const seqLen = level <= 2 ? 5 : 10

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

function generateCompare(level: Level): LogicQuestion {
  // compare only ever appears at ★3 (age 6) now, so it varies its own range rather than
  // splitting easy/hard across two levels the way the old 5-level scale did.
  const max = Math.random() < 0.5 ? 10 : 18
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

/** ★1 age 4: oddOneOut only. ★2 age 5: adds pattern. ★3 age 6: adds compare. */
export function generateLogicQuestion(level: Level): LogicQuestion {
  const availableKinds: LogicQuestion['kind'][] =
    level <= 1 ? ['oddOneOut'] : level <= 2 ? ['oddOneOut', 'pattern'] : ['oddOneOut', 'pattern', 'compare']
  const kind = pickRandom(availableKinds)

  switch (kind) {
    case 'oddOneOut':
      return generateOddOneOut(level)
    case 'pattern':
      return generatePattern(level)
    case 'compare':
      return generateCompare(level)
  }
}
