import { describe, expect, it } from 'vitest'
import { generateSpotDifferenceQuestion, PANEL_ASPECT_RATIO, rectFootprint } from '../questionGenerators/spotDifference'
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
        const total = q.differenceIndexes.length + (q.backgroundDiff ? 1 : 0)
        expect(total).toBe(Math.min(EXPECTED_DIFFS[level], q.leftItems.length))
        if (q.backgroundDiff) {
          expect(level).toBeGreaterThanOrEqual(3)
          expect(theme.bgDiffs.some((d) => d.id === q.backgroundDiff!.id)).toBe(true)
          // No object (in either picture, at its larger size) covers the changed area.
          const bg = rectFootprint(q.backgroundDiff.rect)
          for (const it of [...q.leftItems, ...q.rightItems]) {
            if (!it) continue
            const hw = (it.size * sprite(it.spriteId).aspect) / 2
            const ox = bg.hw + hw - Math.abs(bg.x - it.xPct) * PANEL_ASPECT_RATIO
            const oy = bg.hh + it.size / 2 - Math.abs(bg.y - it.yPct)
            // Placement is best-effort; allow a sliver of overlap, never real coverage.
            expect(ox <= 2 || oy <= 2, `${q.theme} ${it.spriteId} over bg ${q.backgroundDiff.id}`).toBe(true)
          }
        }
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
          const changed = [
            right.spriteId !== left.spriteId,
            right.size !== left.size,
            right.flipped !== left.flipped,
            right.variant !== left.variant,
          ].filter(Boolean)
          expect(changed.length, `slot ${i}`).toBeGreaterThanOrEqual(1)
          if (right.spriteId !== left.spriteId) expect(sceneIds.has(right.spriteId)).toBe(false)
          if (right.flipped !== left.flipped) expect(sprite(left.spriteId).flippable).toBe(true)
          if (right.size !== left.size) expect(level).toBeGreaterThanOrEqual(3)
          expect(left.variant).toBeUndefined()
          if (right.variant === 'color') {
            expect(level).toBeGreaterThanOrEqual(2)
            expect(sprite(left.spriteId).colorVariant).toBe(true)
          }
          if (right.variant === 'part') {
            expect(level).toBeGreaterThanOrEqual(3)
            expect(sprite(left.spriteId).partVariant).toBe(true)
          }
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

  it('★3+ actually uses the colour and part differences', () => {
    const seen = new Set<string>()
    for (let n = 0; n < 400; n++) {
      const q = generateSpotDifferenceQuestion(3)
      for (const r of q.rightItems) if (r?.variant) seen.add(r.variant)
    }
    expect(seen.has('color')).toBe(true)
    expect(seen.has('part')).toBe(true)
  })

  it('★3+ sometimes changes the background itself, never below ★3', () => {
    let seen = 0
    for (let n = 0; n < 300; n++) if (generateSpotDifferenceQuestion(3).backgroundDiff) seen++
    expect(seen).toBeGreaterThan(0)
    for (let n = 0; n < 200; n++) expect(generateSpotDifferenceQuestion(2).backgroundDiff).toBeUndefined()
  })
})
