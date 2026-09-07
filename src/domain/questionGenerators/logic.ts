import type { Level, LogicQuestion } from '../types'
import { eligibleWordBank } from '../wordBank'
import { shuffle } from '../../lib/shuffle'

function makeId(): string {
  return `logic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
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
// eligibleWordBank() also drops any word whose image/audio isn't confirmed yet.
const ODD_ONE_OUT_POOL = eligibleWordBank().filter(
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

/** Fixed, not level-indexed — ★2 is pattern's only level now (see KIND_BY_LEVEL below),
 * so there's nothing left to escalate across. A 3-symbol cycle on an 8-long strip is
 * enough to require actually tracking the sequence rather than guessing from the strip's
 * shape alone. */
const PATTERN_CYCLE_LEN = 3
const PATTERN_SEQ_LEN = 8

function generatePattern(level: Level): LogicQuestion {
  const set = pickRandom(SYMBOL_SETS)
  const cycleLen = PATTERN_CYCLE_LEN
  const symbols = set.slice(0, cycleLen)
  const seqLen = PATTERN_SEQ_LEN

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

/** Fixed, not level-indexed — ★3 is compare's only level now (see KIND_BY_LEVEL below),
 * so there's nothing left to escalate across. 14 splits the difference between the old
 * ★3 (10, too easy to be a level on its own) and ★5 (18, harder than a first exposure to
 * numeric comparison needs to be). */
const COMPARE_MAX = 14

function generateCompare(level: Level): LogicQuestion {
  const max = COMPARE_MAX
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

/** One skill per level, not a random blend — a level used to mix oddOneOut/pattern/
 * compare within itself (e.g. ★3 picked uniformly among all three), so a given ★3 round
 * could be three entirely different reasoning skills depending on the draw, with no way
 * to tell which from the star count alone. Same "one level, one consistent thing being
 * tested" principle applied to addition/subtraction's ★ ladder this session — see the
 * level-redefinition discussion. ★1 odd-one-out (spot the different category) is the
 * most concrete/visual of the three; ★2 pattern (track a repeating sequence) adds
 * holding a short sequence in mind; ★3 compare (biggest/smallest of 4 numbers) is the
 * most abstract, numeric-only skill — a natural difficulty order even without needing to
 * blend them together.
 * Never reached — logic caps at ★3 (see CATEGORY_MAX_LEVEL). Kept only so this Record
 * type-checks against the full Level union; ★4-★6 fall back to compare, the last real
 * skill defined. */
const KIND_BY_LEVEL: Record<Level, LogicQuestion['kind']> = {
  1: 'oddOneOut',
  2: 'pattern',
  3: 'compare',
  4: 'compare',
  5: 'compare',
  6: 'compare',
}

export function generateLogicQuestion(level: Level): LogicQuestion {
  switch (KIND_BY_LEVEL[level]) {
    case 'oddOneOut':
      return generateOddOneOut(level)
    case 'pattern':
      return generatePattern(level)
    case 'compare':
      return generateCompare(level)
  }
}
