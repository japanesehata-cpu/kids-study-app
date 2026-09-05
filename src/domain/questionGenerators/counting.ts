import type { CountingQuestion, Level } from '../types'
import { wordBank } from '../wordBank'
import { generateNumericChoices } from '../../lib/choices'
import { shuffle } from '../../lib/shuffle'

function makeId(): string {
  return `counting-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/** Count range and whether distractor items are mixed into the row, per level. */
const LEVEL_RANGE: Record<Level, { min: number; max: number; withDistractors: boolean }> = {
  1: { min: 1, max: 5, withDistractors: false },
  2: { min: 4, max: 8, withDistractors: false },
  3: { min: 6, max: 12, withDistractors: true },
  4: { min: 6, max: 12, withDistractors: true },
  5: { min: 6, max: 12, withDistractors: true },
}

function subSkillForLevel(level: Level): string {
  return level >= 3 ? 'counting-distraction' : 'counting-basic'
}

export function generateCountingQuestion(level: Level): CountingQuestion {
  const { min, max, withDistractors } = LEVEL_RANGE[level]
  const target = pickRandom(wordBank)
  const count = randomInt(min, max)

  const displayIds = Array.from({ length: count }, () => target.id)

  if (withDistractors) {
    const distractorPool = wordBank.filter((w) => w.category !== target.category)
    const distractorCount = randomInt(2, 4)
    for (let i = 0; i < distractorCount; i++) {
      displayIds.push(pickRandom(distractorPool).id)
    }
  }

  return {
    id: makeId(),
    category: 'counting',
    level,
    targetWordId: target.id,
    displayIds: shuffle(displayIds),
    count,
    choices: generateNumericChoices(count, 1, max + 4),
    subSkill: subSkillForLevel(level),
  }
}
