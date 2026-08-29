import { describe, expect, it } from 'vitest'
import { createInitialStreak, recordPlaySession } from '../streak'

describe('recordPlaySession', () => {
  it('starts a streak of 1 on the first play', () => {
    const result = recordPlaySession(createInitialStreak(), '2026-08-23')
    expect(result.currentStreak).toBe(1)
    expect(result.longestStreak).toBe(1)
    expect(result.lastPlayedDate).toBe('2026-08-23')
  })

  it('does not change anything for a second play on the same day', () => {
    const first = recordPlaySession(createInitialStreak(), '2026-08-23')
    const second = recordPlaySession(first, '2026-08-23')
    expect(second).toEqual(first)
  })

  it('increments the streak on a consecutive day', () => {
    let streak = recordPlaySession(createInitialStreak(), '2026-08-23')
    streak = recordPlaySession(streak, '2026-08-24')
    expect(streak.currentStreak).toBe(2)
    expect(streak.longestStreak).toBe(2)
  })

  it('resets the streak to 1 after a gap of more than one day', () => {
    let streak = recordPlaySession(createInitialStreak(), '2026-08-23')
    streak = recordPlaySession(streak, '2026-08-24')
    streak = recordPlaySession(streak, '2026-08-27') // gap
    expect(streak.currentStreak).toBe(1)
    expect(streak.longestStreak).toBe(2) // longest is preserved
  })
})
