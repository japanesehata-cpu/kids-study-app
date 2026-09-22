import type { Level, ShapeId, ShapeQuestion } from '../types'
import { shuffle } from '../../lib/shuffle'

function makeId(): string {
  return `shapes-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

// ★1's easy pool — four visually unmistakable shapes, no two of which could be confused
// even by a 3-year-old still learning the names. ★6 revisits the same 'pickShape'
// mechanic (name → shape) with a deliberately confusable pool instead — see
// HARD_QUADRILATERAL_POOL below.
const EASY_POOL: ShapeId[] = ['circle', 'triangle', 'square', 'star']

// ★2's casual-name pool — adds rectangle/heart/rhombus on top of ★1's four so "which
// shape is a circle" (★1) becomes "what is this shape's name" (★2) over a wider set,
// still all casual, everyday names (no 直角三角形/正式名称 yet — that's ★5).
const CASUAL_NAME_POOL: ShapeId[] = ['circle', 'triangle', 'square', 'rectangle', 'star', 'heart', 'rhombus']

// ★3's side-count pool — every shape here has an unambiguous straight-edge count (unlike
// circle/star/heart, deliberately excluded: a circle has no sides, and a 5-point star's
// edge count is a needless complication at this age).
const SIDE_COUNT: Partial<Record<ShapeId, number>> = {
  triangle: 3,
  rightTriangle: 3,
  square: 4,
  rectangle: 4,
  rhombus: 4,
}
const SIDE_COUNT_POOL = Object.keys(SIDE_COUNT) as ShapeId[]
const SIDE_COUNT_CHOICES = ['2', '3', '4', '5']

// ★4's solid-shape pool — the plain-language "family" names (ball/box/tube/cone-shaped),
// not their formal names (球/立方体/円柱/円錐) — matching ★2's casual-first, ★5's
// formal-later structure but for 3D shapes.
const SOLID_POOL: ShapeId[] = ['sphere', 'cube', 'cylinder', 'cone']

// ★5's formal-vocabulary pool and the category each shape maps to — 三角形/四角形/円/
// ほしがた are the only 4 possible answers, so `choices` is always this full set shuffled
// (every choice is a real possible answer for SOME shape in the pool, never a fake option).
const FORMAL_NAME_POOL: ShapeId[] = ['triangle', 'rightTriangle', 'square', 'rectangle', 'rhombus', 'circle', 'star']
type FormalCategory = 'triangleFormal' | 'quadrilateralFormal' | 'circleFormal' | 'starFormal'
const FORMAL_CATEGORY: Partial<Record<ShapeId, FormalCategory>> = {
  triangle: 'triangleFormal',
  rightTriangle: 'triangleFormal',
  square: 'quadrilateralFormal',
  rectangle: 'quadrilateralFormal',
  rhombus: 'quadrilateralFormal',
  circle: 'circleFormal',
  star: 'starFormal',
}
const ALL_FORMAL_CATEGORIES: FormalCategory[] = [
  'triangleFormal',
  'quadrilateralFormal',
  'circleFormal',
  'starFormal',
]

// ★6's hardest pool — four shapes that genuinely look alike at a glance (all
// straight-sided quadrilaterals-or-close) and can only be told apart by actually
// checking equal sides / right angles, the real 小学2年生 skill this level targets.
const HARD_QUADRILATERAL_POOL: ShapeId[] = ['square', 'rectangle', 'rightTriangle', 'rhombus']

/** Picks `answer` plus 3 other distinct members of `pool`, shuffled — the shared
 * distractor logic behind every 'pickShape'/'pickName' level (every pool here has at
 * least 4 members, so this never runs short). */
function fourChoicesFromPool(pool: ShapeId[], answer: ShapeId): string[] {
  const others = shuffle(pool.filter((id) => id !== answer)).slice(0, 3)
  return shuffle([answer, ...others])
}

function generatePickShape(level: Level, pool: ShapeId[], subSkill: string): ShapeQuestion {
  const answer = pickRandom(pool)
  return {
    id: makeId(),
    category: 'shapes',
    level,
    kind: 'pickShape',
    choices: fourChoicesFromPool(pool, answer),
    answer,
    subSkill,
  }
}

function generatePickName(
  level: Level,
  pool: ShapeId[],
  subSkill: string,
  nameStyle: 'casual' | 'formal',
): ShapeQuestion {
  const shapeId = pickRandom(pool)
  const answer = nameStyle === 'formal' ? (FORMAL_CATEGORY[shapeId] as string) : shapeId
  const choices = nameStyle === 'formal' ? shuffle(ALL_FORMAL_CATEGORIES) : fourChoicesFromPool(pool, shapeId)
  return {
    id: makeId(),
    category: 'shapes',
    level,
    kind: 'pickName',
    shapeId,
    nameStyle,
    choices,
    answer,
    subSkill,
  }
}

function generateCountSides(level: Level): ShapeQuestion {
  const shapeId = pickRandom(SIDE_COUNT_POOL)
  const answer = String(SIDE_COUNT[shapeId])
  return {
    id: makeId(),
    category: 'shapes',
    level,
    kind: 'countSides',
    shapeId,
    choices: shuffle(SIDE_COUNT_CHOICES),
    answer,
    subSkill: 'shapes-sides',
  }
}

/** One skill per level, same "one level, one consistent thing being tested" principle as
 * logic.ts's KIND_BY_LEVEL — never a random blend of skills within a single ★. ★1-6 are
 * all real levels here (unlike logic, which caps at ★3): ★1 pickShape (easiest,
 * production direction) → ★2 pickName (recognition, casual) → ★3 countSides (counting) →
 * ★4 pickName (recognition, solids) → ★5 pickName (recognition, formal vocabulary) →
 * ★6 pickShape (hardest, production direction over confusable quadrilaterals). */
export function generateShapesQuestion(level: Level): ShapeQuestion {
  switch (level) {
    case 1:
      return generatePickShape(1, EASY_POOL, 'shapes-basic')
    case 2:
      return generatePickName(2, CASUAL_NAME_POOL, 'shapes-name', 'casual')
    case 3:
      return generateCountSides(3)
    case 4:
      return generatePickName(4, SOLID_POOL, 'shapes-solid', 'casual')
    case 5:
      return generatePickName(5, FORMAL_NAME_POOL, 'shapes-formal', 'formal')
    case 6:
      return generatePickShape(6, HARD_QUADRILATERAL_POOL, 'shapes-classify')
  }
}
