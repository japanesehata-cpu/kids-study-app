import { describe, expect, it } from 'vitest'
import { buildScore, noteToFreq } from '../bgm'

describe('bgm score', () => {
  it('converts note names to equal-tempered frequencies', () => {
    expect(noteToFreq('A4')).toBeCloseTo(440)
    expect(noteToFreq('C4')).toBeCloseTo(261.63, 1)
    expect(noteToFreq('A5')).toBeCloseTo(880)
  })

  it('every bar fills exactly 3 beats and events stay in time order within the loop', () => {
    const score = buildScore()
    expect(score.length).toBeGreaterThan(0)
    for (let i = 1; i < score.length; i++) expect(score[i].beat).toBeGreaterThanOrEqual(score[i - 1].beat)
    // 32 bars × 3 beats — the last event must start before the loop wraps.
    expect(score[score.length - 1].beat).toBeLessThan(96)
    // A melody note on the downbeat of every bar keeps the waltz anchored.
    const melodyBeats = new Set(score.filter((e) => e.voice === 'melody').map((e) => e.beat))
    for (let bar = 0; bar < 32; bar++) expect(melodyBeats.has(bar * 3)).toBe(true)
  })
})
