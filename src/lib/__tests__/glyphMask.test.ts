import { describe, expect, it } from 'vitest'
import { computeOverlapScore } from '../glyphMask'

describe('computeOverlapScore', () => {
  it('scores a perfect trace as full coverage and precision', () => {
    const mask = new Uint8Array([1, 1, 0, 0])
    const { coverage, precision, combined } = computeOverlapScore(mask, mask)
    expect(coverage).toBe(1)
    expect(precision).toBe(1)
    expect(combined).toBe(1)
  })

  it('scores no ink at all as zero', () => {
    const target = new Uint8Array([1, 1, 0, 0])
    const ink = new Uint8Array([0, 0, 0, 0])
    const { combined } = computeOverlapScore(target, ink)
    expect(combined).toBe(0)
  })

  it('penalizes scribbling over the whole canvas via low precision', () => {
    const target = new Uint8Array([1, 1, 0, 0])
    const ink = new Uint8Array([1, 1, 1, 1])
    const { coverage, precision } = computeOverlapScore(target, ink)
    expect(coverage).toBe(1)
    expect(precision).toBe(0.5)
  })

  it('handles a target with no ink pixels at all without dividing by zero', () => {
    const target = new Uint8Array([0, 0, 0, 0])
    const ink = new Uint8Array([1, 0, 0, 0])
    const { coverage, precision, combined } = computeOverlapScore(target, ink)
    expect(coverage).toBe(0)
    expect(precision).toBe(0)
    expect(combined).toBe(0)
  })
})
