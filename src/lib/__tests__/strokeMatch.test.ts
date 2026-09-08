import { describe, expect, it } from 'vitest'
import { isStrokeTraced, type Point } from '../strokeMatch'

function line(from: Point, to: Point, steps: number): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => ({
    x: from.x + ((to.x - from.x) * i) / steps,
    y: from.y + ((to.y - from.y) * i) / steps,
  }))
}

describe('isStrokeTraced', () => {
  it('accepts a straight stroke traced closely along the same line', () => {
    const target = line({ x: 10, y: 10 }, { x: 90, y: 10 }, 10)
    const drawn = line({ x: 12, y: 11 }, { x: 88, y: 9 }, 20)
    expect(isStrokeTraced(target, drawn)).toBe(true)
  })

  it('accepts an L-shaped stroke traced with a reasonably wobbly hand', () => {
    const target = [...line({ x: 20, y: 20 }, { x: 20, y: 80 }, 6), ...line({ x: 20, y: 80 }, { x: 80, y: 80 }, 6)]
    const drawn = target.map((p) => ({ x: p.x + 5, y: p.y - 4 }))
    expect(isStrokeTraced(target, drawn)).toBe(true)
  })

  it('rejects a stroke drawn in reverse (wrong start/end)', () => {
    const target = line({ x: 10, y: 10 }, { x: 90, y: 10 }, 10)
    const drawn = line({ x: 90, y: 10 }, { x: 10, y: 10 }, 10)
    expect(isStrokeTraced(target, drawn)).toBe(false)
  })

  it('rejects a stroke drawn far away from the target', () => {
    const target = line({ x: 10, y: 10 }, { x: 90, y: 10 }, 10)
    const drawn = line({ x: 10, y: 90 }, { x: 90, y: 90 }, 10)
    expect(isStrokeTraced(target, drawn)).toBe(false)
  })

  it('rejects a stroke that starts right but stops far short of the end', () => {
    const target = line({ x: 10, y: 10 }, { x: 90, y: 10 }, 10)
    const drawn = line({ x: 10, y: 10 }, { x: 30, y: 10 }, 5)
    expect(isStrokeTraced(target, drawn)).toBe(false)
  })

  it('rejects empty input', () => {
    expect(isStrokeTraced([], [{ x: 1, y: 1 }])).toBe(false)
    expect(isStrokeTraced([{ x: 1, y: 1 }], [])).toBe(false)
  })
})
