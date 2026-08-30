import type { Level, SpotDifferenceQuestion, SpotDifferenceSlot } from '../types'
import { wordBank } from '../wordBank'

/** Colors and shapes are abstract swatches/outlines, not scene-like objects, so they're
 * excluded — every icon used here is a real photo of an actual thing (see
 * REALISTIC_STYLE_GUARDRAIL), reused as-is rather than generating any new art for this
 * category. */
const ICON_POOL = wordBank.filter((w) => w.category !== 'color' && w.category !== 'shape')

/** Grid size and difficulty per level: ★1 age 4, ★2 age 5, ★3 age 6. */
const BOARD: Record<Level, { columns: number; slots: number; differences: number }> = {
  1: { columns: 2, slots: 4, differences: 2 },
  2: { columns: 3, slots: 6, differences: 3 },
  3: { columns: 3, slots: 9, differences: 4 },
  4: { columns: 3, slots: 9, differences: 4 },
  5: { columns: 3, slots: 9, differences: 4 },
}

type DiffType = 'swap' | 'resize' | 'flip'

/** ★1 sticks to a difference a 4yo can spot at a glance (a whole different picture). ★2
 * adds a size change; ★3 adds mirroring, the subtlest cue — never a recolor, since tinting
 * a real photo would contradict the "true to life" teaching goal for these icons. An
 * empty/removed slot was dropped entirely: it rendered as a blank dashed placeholder that
 * read as a rendering glitch rather than an intentional puzzle piece. */
const DIFF_TYPES: Record<Level, DiffType[]> = {
  1: ['swap'],
  2: ['swap', 'resize'],
  3: ['swap', 'resize', 'flip'],
  4: ['swap', 'resize', 'flip'],
  5: ['swap', 'resize', 'flip'],
}

function makeId(): string {
  return `spot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function subSkillForLevel(level: Level): string {
  if (level >= 3) return 'spot-subtle'
  if (level === 2) return 'spot-similar'
  return 'spot-obvious'
}

function applyDifference(iconId: string, usedIds: string[], type: DiffType): SpotDifferenceSlot {
  switch (type) {
    case 'flip':
      return { iconId, flipped: true, scale: 1 }
    case 'resize':
      return { iconId, flipped: false, scale: pickRandom([0.6, 1.45]) }
    case 'swap': {
      const replacement = pickRandom(ICON_POOL.filter((w) => !usedIds.includes(w.id)))
      return { iconId: replacement.id, flipped: false, scale: 1 }
    }
  }
}

export function generateSpotDifferenceQuestion(level: Level): SpotDifferenceQuestion {
  const { columns, slots, differences } = BOARD[level]
  const chosen = shuffle(ICON_POOL).slice(0, slots)
  const leftIconIds = chosen.map((w) => w.id)

  const differenceIndexes = shuffle(Array.from({ length: slots }, (_, i) => i))
    .slice(0, differences)
    .sort((a, b) => a - b)
  const diffTypePool = DIFF_TYPES[level]

  const rightSlots: SpotDifferenceSlot[] = leftIconIds.map((iconId, i) => {
    if (!differenceIndexes.includes(i)) return { iconId, flipped: false, scale: 1 }
    return applyDifference(iconId, leftIconIds, pickRandom(diffTypePool))
  })

  return {
    id: makeId(),
    category: 'spotDifference',
    level,
    columns,
    leftIconIds,
    rightSlots,
    differenceIndexes,
    subSkill: subSkillForLevel(level),
  }
}
