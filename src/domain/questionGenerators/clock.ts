import type { ClockQuestion, Level } from '../types'
import type { Lang } from '../../i18n/dictionary'

function makeId(): string {
  return `clock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

/** Minutes available at each level: ★1 whole hours only, ★2 adds half-past, ★3 adds quarter-past/to. */
const LEVEL_MINUTES: Record<Level, Array<0 | 15 | 30 | 45>> = {
  1: [0],
  2: [0, 30],
  3: [0, 15, 30, 45],
  4: [0, 15, 30, 45],
  5: [0, 15, 30, 45],
}

function subSkillForMinute(minute: number): string {
  if (minute === 0) return 'clock-oclock'
  if (minute === 30) return 'clock-half'
  return 'clock-quarter'
}

function toKey(hour: number, minute: number): string {
  return `${hour}:${minute}`
}

export function formatClockKey(key: string, lang: Lang): string {
  const [hourStr, minuteStr] = key.split(':')
  const hour = Number(hourStr)
  const minute = Number(minuteStr)
  if (lang === 'ja') {
    if (minute === 0) return `${hour}じ`
    if (minute === 30) return `${hour}じはん`
    return `${hour}じ${minute}ふん`
  }
  return `${hour}:${String(minute).padStart(2, '0')}`
}

export function generateClockQuestion(level: Level): ClockQuestion {
  const minutes = LEVEL_MINUTES[level]
  const hour = randomInt(1, 12)
  const minute = minutes[randomInt(0, minutes.length - 1)]

  const answerKey = toKey(hour, minute)
  const distractorKeys = new Set<string>()
  let guard = 0
  while (distractorKeys.size < 3 && guard < 50) {
    guard++
    const candidateHour = ((hour - 1 + randomInt(-2, 2) + 12) % 12) + 1
    const candidateMinute = minutes[randomInt(0, minutes.length - 1)]
    const key = toKey(candidateHour, candidateMinute)
    if (key !== answerKey) distractorKeys.add(key)
  }

  const choiceKeys = shuffle([answerKey, ...distractorKeys])

  return {
    id: makeId(),
    category: 'clock',
    level,
    hour,
    minute,
    choiceKeys,
    subSkill: subSkillForMinute(minute),
  }
}
