import { beforeEach, describe, expect, it, vi } from 'vitest'

let stored: string | null = null
vi.mock('../../lib/storage', () => ({
  loadProgressJson: () => stored,
  saveProgressJson: (json: string) => {
    stored = json
  },
}))

const { loadProgress, createInitialProgress } = await import('../progress')

function saveLogic(logic: object) {
  stored = JSON.stringify({ ...createInitialProgress(), logic })
}

describe('ろんり ladder migration (★2 なかまはずれ added)', () => {
  beforeEach(() => {
    stored = null
  })

  it('moves a level saved against the old ladder up one from ★2, keeping ★1 as is', () => {
    for (const [oldLevel, newLevel] of [
      [1, 1],
      [2, 3],
      [3, 4],
      [4, 5],
    ]) {
      saveLogic({ level: oldLevel, recentAccuracy: [0.9], reviewQueue: [] })
      const logic = loadProgress().logic
      expect(logic.level).toBe(newLevel)
      expect(logic.ladderVersion).toBe(2)
      expect(logic.recentAccuracy).toEqual(oldLevel >= 2 ? [] : [0.9])
    }
  })

  it('does not move a level already saved against the new ladder', () => {
    saveLogic({ level: 3, recentAccuracy: [0.9], reviewQueue: [], ladderVersion: 2 })
    expect(loadProgress().logic.level).toBe(3)
  })
})

describe('ladderVersion survives a finished set', () => {
  it('is still there after applySetResult, so the next load does not move the level again', async () => {
    const { applySetResult } = await import('../progress')
    saveLogic({ level: 2, recentAccuracy: [], reviewQueue: [] })
    const migrated = loadProgress()
    const { progress } = applySetResult('logic', 3, migrated, [])
    expect(progress.logic.ladderVersion).toBe(2)
    stored = JSON.stringify(progress)
    expect(loadProgress().logic.level).toBe(3)
  })
})
