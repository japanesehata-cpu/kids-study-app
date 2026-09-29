import type { Level, SpotDifferenceDiffType, SpotDifferenceItem, SpotDifferenceQuestion } from '../types'
import { eligibleWordBank } from '../wordBank'
import { shuffle } from '../../lib/shuffle'

/** Colors and shapes are abstract swatches/outlines, not scene-like objects, so they're
 * excluded — every icon used here is a real photo of an actual thing (see
 * REALISTIC_STYLE_GUARDRAIL), reused as-is rather than generating any new art for this
 * category. Also excludes any word whose image/audio isn't confirmed yet — see
 * eligibleWordBank(). */
const ICON_POOL = eligibleWordBank().filter((w) => w.category !== 'color' && w.category !== 'shape')

/** Item count and difference count per level: ★1 age 4 through ★5 age 8. Scene-format
 * items don't need to fill a fixed grid, so counts scale a bit more freely than the old
 * grid version's slot counts did. */
const BOARD: Record<Level, { items: number; differences: number }> = {
  1: { items: 5, differences: 2 },
  2: { items: 6, differences: 3 },
  3: { items: 7, differences: 3 },
  4: { items: 8, differences: 4 },
  5: { items: 9, differences: 4 },
  // Never reached — spotDifference caps at ★3 (see CATEGORY_MAX_LEVEL). Kept only so this
  // Record's type checks against the full Level union.
  6: { items: 9, differences: 4 },
}

/** ★1 sticks to a difference a 4yo can spot at a glance (a whole different picture). ★2
 * adds a size change. ★3+ adds mirroring and rotation, the subtlest cues — never a
 * recolor, since tinting a real photo would contradict the "true to life" teaching goal
 * for these icons. */
const DIFF_TYPES: Record<Level, SpotDifferenceDiffType[]> = {
  1: ['swap'],
  2: ['swap', 'resize'],
  3: ['swap', 'resize', 'flip', 'rotate'],
  4: ['swap', 'resize', 'flip', 'rotate'],
  5: ['swap', 'resize', 'flip', 'rotate'],
  6: ['swap', 'resize', 'flip', 'rotate'],
}

// Percent of the panel's own HEIGHT (not px, and not width — see the aspect-ratio note
// below) — see SpotDifferenceItem's `size` field comment in types.ts for why: rendering
// each item relative to its actual panel lets the panel itself shrink to fit the available
// space on a narrow/short phone (see components.css's .spot-scene-panel) without the items
// inside overlapping or overflowing, something a fixed-px size tied to one assumed
// reference panel size couldn't do.
const MIN_SIZE = 16
const MAX_SIZE = 26
const MIN_GAP_MARGIN = 3

// .spot-scene-panel is a wide rectangle (full card width, a much shorter vh-based height —
// see its own CSS comment for why), not a square, and its actual width:height ratio shifts
// with viewport. scatterPositions below needs ONE assumed ratio to convert a %-of-width
// (xPct) difference and a %-of-height (yPct, also what `size` is a percent of) difference
// into the same physical unit before combining them in one hypot() — same category of
// necessary approximation as the old fixed-360px-reference used to be, just for shape
// instead of size. Picked to roughly match the panel's typical rendered proportions (a
// phone around 700px tall renders .spot-scene-panel's `clamp(140px, 30vh, 260px)` height at
// ~210px against a card width around 320-340px).
const PANEL_ASPECT_RATIO = 1.6

function makeId(): string {
  return `spot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function subSkillForLevel(level: Level): string {
  if (level >= 3) return 'spot-subtle'
  if (level === 2) return 'spot-similar'
  return 'spot-obvious'
}

/** Places `count` items with a fixed baseline `size` each, rejecting candidates whose
 * center-to-center distance to any already-placed item is less than the sum of their
 * radii plus a fixed margin — bigger icons get more berth than smaller ones, so nothing
 * visually overlaps regardless of the size mix a round happens to roll. Bounded attempts
 * per item, falling back to a best-effort placement if the scene is too crowded to find
 * a clean spot (only a real risk at ★5's 9-item ceiling, and even then rare).
 *
 * `size`/`MIN_GAP_MARGIN` are in percent-of-panel-HEIGHT units (see PANEL_ASPECT_RATIO
 * above), but `xPct` is percent-of-WIDTH — an x-difference and a y-difference of the same
 * percentage aren't the same physical distance on a non-square panel, so xDiff is scaled by
 * PANEL_ASPECT_RATIO before combining it with yDiff in one hypot(), converting it into the
 * same height-relative unit everything else is already in. */
function scatterPositions(sizes: number[]): { xPct: number; yPct: number }[] {
  const placed: { xPct: number; yPct: number; size: number }[] = []
  for (const size of sizes) {
    let candidate = { xPct: randRange(16, 84), yPct: randRange(18, 82) }
    for (let attempt = 0; attempt < 80; attempt++) {
      candidate = { xPct: randRange(16, 84), yPct: randRange(18, 82) }
      const tooClose = placed.some((p) => {
        const dist = Math.hypot((p.xPct - candidate.xPct) * PANEL_ASPECT_RATIO, p.yPct - candidate.yPct)
        return dist < p.size / 2 + size / 2 + MIN_GAP_MARGIN
      })
      if (!tooClose) break
    }
    placed.push({ ...candidate, size })
  }
  return placed
}

function applyDiff(item: SpotDifferenceItem, type: SpotDifferenceDiffType, usedIds: Set<string>): SpotDifferenceItem {
  switch (type) {
    case 'swap': {
      const replacement = pickRandom(ICON_POOL.filter((w) => !usedIds.has(w.id)))
      usedIds.add(replacement.id)
      return { ...item, iconId: replacement.id }
    }
    case 'resize':
      return { ...item, size: item.size * (Math.random() < 0.5 ? 0.6 : 1.5) }
    case 'rotate':
      return { ...item, rotate: item.rotate + (Math.random() < 0.5 ? 1 : -1) * randRange(45, 90) }
    case 'flip':
      return { ...item, flipped: !item.flipped }
  }
}

export function generateSpotDifferenceQuestion(level: Level): SpotDifferenceQuestion {
  const { items: itemCount, differences } = BOARD[level]
  const words = shuffle(ICON_POOL).slice(0, itemCount)
  const usedIds = new Set(words.map((w) => w.id))

  const sizes = words.map(() => randRange(MIN_SIZE, MAX_SIZE))
  const positions = scatterPositions(sizes)

  const leftItems: SpotDifferenceItem[] = words.map((w, i) => ({
    iconId: w.id,
    xPct: positions[i].xPct,
    yPct: positions[i].yPct,
    size: sizes[i],
    rotate: randRange(-16, 16),
    flipped: false,
  }))

  const differenceIndexes = shuffle(Array.from({ length: itemCount }, (_, i) => i))
    .slice(0, differences)
    .sort((a, b) => a - b)
  const diffTypePool = DIFF_TYPES[level]

  const rightItems: SpotDifferenceItem[] = leftItems.map((item, i) => {
    if (!differenceIndexes.includes(i)) return { ...item }
    return applyDiff(item, pickRandom(diffTypePool), usedIds)
  })

  return {
    id: makeId(),
    category: 'spotDifference',
    level,
    leftItems,
    rightItems,
    differenceIndexes,
    subSkill: subSkillForLevel(level),
  }
}
