import { describe, expect, it } from 'vitest'
import { generateSpotDifferenceQuestion, PANEL_ASPECT_RATIO } from '../questionGenerators/spotDifference'
import { SPOT_THEMES } from '../spotScenes'
import type { Level } from '../types'

const LEVELS: Level[] = [1, 2, 3, 4, 5]
const EXPECTED_DIFFS: Record<number, number> = { 1: 2, 2: 3, 3: 3, 4: 4, 5: 5 }

describe('まちがいさがし (illustrated scenes)', () => {
  it('has at least one usable theme', () => {
    expect(SPOT_THEMES.length).toBeGreaterThan(0)
  })

  for (const level of LEVELS) {
    it(`★${level}: differences are well-formed and fair`, () => {
      for (let n = 0; n < 150; n++) {
        const q = generateSpotDifferenceQuestion(level)
        const theme = SPOT_THEMES.find((t) => t.id === q.theme)!
        const sprite = (id: string) => theme.sprites.find((s) => s.id === id)!
        expect(q.rightItems).toHaveLength(q.leftItems.length)
        expect(q.differenceIndexes).toHaveLength(Math.min(EXPECTED_DIFFS[level], q.leftItems.length))
        const sceneIds = new Set(q.leftItems.map((i) => i.spriteId))
        expect(sceneIds.size).toBe(q.leftItems.length)

        q.leftItems.forEach((left, i) => {
          const right = q.rightItems[i]
          const isDiff = q.differenceIndexes.includes(i)
          if (!isDiff) {
            expect(right).toEqual(left)
            return
          }
          if (right === null) return // missing
          const changed = [right.spriteId !== left.spriteId, right.size !== left.size, right.flipped !== left.flipped].filter(Boolean)
          expect(changed.length, `slot ${i}`).toBeGreaterThanOrEqual(1)
          if (right.spriteId !== left.spriteId) expect(sceneIds.has(right.spriteId)).toBe(false)
          if (right.flipped !== left.flipped) expect(sprite(left.spriteId).flippable).toBe(true)
          if (right.size !== left.size) expect(level).toBeGreaterThanOrEqual(3)
        })
        if (level === 1) expect(q.differenceIndexes.every((i) => q.rightItems[i] === null)).toBe(true)

        // Every object (in its larger form, if resized) stays inside the picture.
        for (const it of [...q.leftItems, ...q.rightItems]) {
          if (!it) continue
          const halfW = (it.size * sprite(it.spriteId).aspect) / 2 / PANEL_ASPECT_RATIO
          expect(it.xPct - halfW).toBeGreaterThanOrEqual(-0.5)
          expect(it.xPct + halfW).toBeLessThanOrEqual(100.5)
          expect(it.yPct - it.size / 2).toBeGreaterThanOrEqual(-0.5)
          expect(it.yPct + it.size / 2).toBeLessThanOrEqual(100.5)
        }
      }
    })
  }
})
