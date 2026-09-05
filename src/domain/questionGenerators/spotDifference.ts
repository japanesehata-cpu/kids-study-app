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
}

const MIN_SIZE = 58
const MAX_SIZE = 92
const MIN_GAP_MARGIN = 10

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
 * a clean spot (only a real risk at ★5's 9-item ceiling, and even then rare). */
function scatterPositions(sizes: number[]): { xPct: number; yPct: number }[] {
  const placed: { xPct: number; yPct: number; size: number }[] = []
  for (const size of sizes) {
    let candidate = { xPct: randRange(16, 84), yPct: randRange(18, 82) }
    for (let attempt = 0; attempt < 80; attempt++) {
      candidate = { xPct: randRange(16, 84), yPct: randRange(18, 82) }
      const tooClose = placed.some((p) => {
        // percentage-space distance approximated against a 360px-square scene — close
        // enough to keep circles genuinely non-overlapping without plumbing the actual
        // rendered panel size through the generator.
        const dxPx = ((p.xPct - candidate.xPct) / 100) * 360
        const dyPx = ((p.yPct - candidate.yPct) / 100) * 360
        const dist = Math.hypot(dxPx, dyPx)
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
