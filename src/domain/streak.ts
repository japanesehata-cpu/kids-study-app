import { loadStreakJson, saveStreakJson } from '../lib/storage'

export interface PlayStreak {
  currentStreak: number
  longestStreak: number
  lastPlayedDate: string | null
}

export function createInitialStreak(): PlayStreak {
  return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null }
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay)
}

/** Call once per completed set. Returns unchanged state if already recorded today. */
export function recordPlaySession(streak: PlayStreak, today: string = todayDateString()): PlayStreak {
  if (streak.lastPlayedDate === today) return streak

  const isConsecutiveDay = streak.lastPlayedDate !== null && daysBetween(streak.lastPlayedDate, today) === 1
  const currentStreak = isConsecutiveDay ? streak.currentStreak + 1 : 1

  return {
    currentStreak,
    longestStreak: Math.max(streak.longestStreak, currentStreak),
    lastPlayedDate: today,
  }
}

export function loadStreak(): PlayStreak {
  const raw = loadStreakJson()
  if (!raw) return createInitialStreak()
  try {
    const parsed = JSON.parse(raw) as Partial<PlayStreak>
    if (typeof parsed.currentStreak !== 'number' || typeof parsed.longestStreak !== 'number') {
      return createInitialStreak()
    }
    return {
      currentStreak: parsed.currentStreak,
      longestStreak: parsed.longestStreak,
      lastPlayedDate: parsed.lastPlayedDate ?? null,
    }
  } catch {
    return createInitialStreak()
  }
}

export function persistStreak(streak: PlayStreak): void {
  saveStreakJson(JSON.stringify(streak))
}
