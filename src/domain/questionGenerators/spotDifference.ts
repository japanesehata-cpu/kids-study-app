import type { Level, SpotDifferenceDiffType, SpotDifferenceItem, SpotDifferenceQuestion } from '../types'
import { SPOT_THEMES, type SpotSprite, type SpotTheme } from '../spotScenes'
import { shuffle } from '../../lib/shuffle'

/** Per level: how many objects, how many differences, how big the objects are (% of the
 * panel's height) and how much a "resize" difference changes them. ★4/★5 were added for
 * older/stronger children (requested 2026-10-05): more and smaller objects, more
 * differences, and a subtler size change. */
const BOARD: Record<Level, { items: number; differences: number; size: [number, number]; resize: number }> = {
  1: { items: 5, differences: 2, size: [19, 24], resize: 1.5 },
  2: { items: 7, differences: 3, size: [17, 22], resize: 1.5 },
  3: { items: 9, differences: 3, size: [16, 20], resize: 1.5 },
  4: { items: 11, differences: 4, size: [14, 18], resize: 1.3 },
  5: { items: 13, differences: 5, size: [13, 16], resize: 1.25 },
  // Never reached — spotDifference caps at ★5 (see CATEGORY_MAX_LEVEL).
  6: { items: 13, differences: 5, size: [13, 16], resize: 1.25 },
}

/** Each ★ adds a kind of difference (decided with the user, 2026-10-05): ★1 only "something
 * is missing" — the most obvious kind; ★2 adds "a different object"; ★3 adds bigger and
 * mirror-flipped. */
const DIFF_TYPES: Record<Level, SpotDifferenceDiffType[]> = {
  1: ['missing'],
  2: ['missing', 'swap'],
  3: ['missing', 'swap', 'resize', 'flip'],
  4: ['missing', 'swap', 'resize', 'flip'],
  5: ['missing', 'swap', 'resize', 'flip'],
  6: ['missing', 'swap', 'resize', 'flip'],
}

/** Panel width / height — the panel keeps the background illustration's own 3:2 shape (see
 * .spot-scene-panel), so this is exact, not an assumption. */
export const PANEL_ASPECT_RATIO = 1.5
const GAP = 2

function makeId(): string {
  return `spot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function pickRandom<T>(items: readonly T[]): T {
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

interface Footprint {
  x: number
  y: number
  /** half width / half height, both in % of panel HEIGHT */
  hw: number
  hh: number
}

/** Places an object of the given box size at a random spot in one of `zones`, keeping it
 * inside the panel and clear of everything already placed (rejection sampling; if nothing
 * fits after many tries, the least-overlapping candidate is used). */
function place(theme: SpotTheme, zones: string[], hw: number, hh: number, placed: Footprint[]): Footprint {
  let best: Footprint | null = null
  let bestOverlap = Infinity
  for (let attempt = 0; attempt < 150; attempt++) {
    const [x0, x1, y0, y1] = pickRandom(theme.zones[pickRandom(zones)])
    const minX = (hw / PANEL_ASPECT_RATIO) + 1
    const minY = hh + 1
    const x = Math.min(Math.max(randRange(x0, x1), minX), 100 - minX)
    const y = Math.min(Math.max(randRange(y0, y1), minY), 100 - minY)
    const overlap = placed.reduce((sum, p) => {
      const ox = p.hw + hw + GAP - Math.abs(p.x - x) * PANEL_ASPECT_RATIO
      const oy = p.hh + hh + GAP - Math.abs(p.y - y)
      return sum + (ox > 0 && oy > 0 ? ox * oy : 0)
    }, 0)
    if (overlap < bestOverlap) {
      bestOverlap = overlap
      best = { x, y, hw, hh }
      if (overlap === 0) break
    }
  }
  return best!
}

/** The difference each changed slot gets: one of this level's kinds that actually works for
 * that object — a flip only for a picture that visibly changes when mirrored, a swap only if
 * an unused object can stand in the same kind of place — else "missing". */
function chooseDiff(level: Level, sprite: SpotSprite, swapCandidates: SpotSprite[]): SpotDifferenceDiffType {
  const options = DIFF_TYPES[level].filter((t) => {
    if (t === 'flip') return sprite.flippable
    if (t === 'swap') return swapCandidates.some((c) => c.zones.some((z) => sprite.zones.includes(z)))
    return true
  })
  return options.length > 0 ? pickRandom(options) : 'missing'
}

export function generateSpotDifferenceQuestion(level: Level): SpotDifferenceQuestion {
  const { items: target, differences, size: [minSize, maxSize], resize } = BOARD[level]
  const spare = level >= 2 ? 1 : 0
  const roomy = SPOT_THEMES.filter((t) => t.sprites.length >= target + spare)
  // Normally every theme has 15 objects; this only matters while a theme's images are
  // still being generated — use the fullest one with fewer objects rather than failing.
  const theme = roomy.length > 0 ? pickRandom(roomy) : [...SPOT_THEMES].sort((a, b) => b.sprites.length - a.sprites.length)[0]
  const wanted = Math.min(target, theme.sprites.length - spare)
  const ordered = shuffle(theme.sprites)
  const scene = ordered.slice(0, wanted)
  const unused = ordered.slice(wanted)

  const differenceIndexes = shuffle(scene.map((_, i) => i))
    .slice(0, differences)
    .sort((a, b) => a - b)

  // Decide every difference first, so each object's footprint reserves room for its
  // changed form too (a resized object, or a swapped one with a different shape).
  const plans = scene.map((sprite, i) => {
    if (!differenceIndexes.includes(i)) return { type: null as SpotDifferenceDiffType | null, replacement: null as SpotSprite | null }
    const type = chooseDiff(level, sprite, unused)
    if (type !== 'swap') return { type, replacement: null }
    const fits = unused.filter((c) => c.zones.some((z) => sprite.zones.includes(z)))
    const replacement = pickRandom(fits)
    unused.splice(unused.indexOf(replacement), 1)
    return { type, replacement }
  })

  const placed: Footprint[] = []
  const leftItems: SpotDifferenceItem[] = scene.map((sprite, i) => {
    const plan = plans[i]
    const size = randRange(minSize, maxSize)
    const grow = plan.type === 'resize' ? resize : 1
    const aspect = Math.max(sprite.aspect, plan.replacement?.aspect ?? 0)
    const zones = plan.replacement ? sprite.zones.filter((z) => plan.replacement!.zones.includes(z)) : sprite.zones
    const spot = place(theme, zones, (size * grow * aspect) / 2, (size * grow) / 2, placed)
    placed.push(spot)
    return { spriteId: sprite.id, xPct: spot.x, yPct: spot.y, size, flipped: sprite.flippable && Math.random() < 0.5 }
  })

  const rightItems = leftItems.map((item, i) => {
    const plan = plans[i]
    switch (plan.type) {
      case null:
        return { ...item }
      case 'missing':
        return null
      case 'swap':
        return { ...item, spriteId: plan.replacement!.id, flipped: false }
      case 'resize':
        return { ...item, size: item.size * resize }
      case 'flip':
        return { ...item, flipped: !item.flipped }
    }
  })

  return {
    id: makeId(),
    category: 'spotDifference',
    level,
    theme: theme.id,
    leftItems,
    rightItems,
    differenceIndexes,
    subSkill: subSkillForLevel(level),
  }
}
