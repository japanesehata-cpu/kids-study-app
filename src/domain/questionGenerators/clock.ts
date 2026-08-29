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

/** Minutes available at each level: ★1 whole hours only, ★2 adds half-past, ★3 adds
 * quarter-past/to. ★4-★5 keep escalating past the quarter-hours instead of stopping
 * there — ★4 reads any 5-minute mark (a real analog clock skill beyond quarters), ★5
 * reads any minute at all, the same precision a real clock face shows. */
const QUARTER_MINUTES = [0, 15, 30, 45] as const
const FIVE_MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)
const ANY_MINUTE = Array.from({ length: 60 }, (_, i) => i)

const LEVEL_MINUTES: Record<Level, number[]> = {
  1: [0],
  2: [0, 30],
  3: [...QUARTER_MINUTES],
  4: FIVE_MINUTES,
  5: ANY_MINUTE,
}

function subSkillForMinute(minute: number): string {
  if (minute === 0) return 'clock-oclock'
  if (minute === 30) return 'clock-half'
  if (minute === 15 || minute === 45) return 'clock-quarter'
  if (minute % 5 === 0) return 'clock-fiveminute'
  return 'clock-anyminute'
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

/** Told a target time in words, set it by dragging the clock's own hands — a harder,
 * production test of the same reading skill instead of just recognizing it among 4
 * options. Held back until ★2 (once telling the hour alone is solid) and never more
 * than half the question set, so recognition practice still comes first. */
function shouldUseSetTime(level: Level): boolean {
  return level >= 2 && Math.random() < 0.4
}

export function buildSetTimePrompt(hour: number, minute: number, lang: Lang): string {
  const timeText = formatClockKey(toKey(hour, minute), lang)
  return lang === 'ja' ? `とけいを ${timeText}に あわせてね` : `Set the clock to ${timeText}.`
}

export function generateClockQuestion(level: Level): ClockQuestion {
  const minutes = LEVEL_MINUTES[level]
  const hour = randomInt(1, 12)
  const minute = minutes[randomInt(0, minutes.length - 1)]
  const subSkill = subSkillForMinute(minute)

  if (shouldUseSetTime(level)) {
    return { id: makeId(), category: 'clock', level, hour, minute, kind: 'setTime', choiceKeys: [], subSkill }
  }

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

  return { id: makeId(), category: 'clock', level, hour, minute, kind: 'multipleChoice', choiceKeys, subSkill }
}
