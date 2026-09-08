import type { CountingQuestion, Level } from '../types'
import { counterBank } from '../counterBank'
import { shuffle } from '../../lib/shuffle'

function makeId(): string {
  return `counting-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** No ★ levels (see CATEGORY_MAX_LEVEL.counting) — `level` is accepted only for interface
 * consistency with every other generator, same as englishSentence's. */
export function generateCountingQuestion(_level: Level): CountingQuestion {
  const target = pickRandom(counterBank)
  const distractors = shuffle(counterBank.filter((c) => c.id !== target.id)).slice(0, 3)
  const choiceCounterIds = shuffle([target.id, ...distractors.map((d) => d.id)])

  return {
    id: makeId(),
    category: 'counting',
    level: 1,
    counterId: target.id,
    exampleWordId: target.exampleWordId,
    // 2-5 copies shown, not just one — the picture is an actual group being counted, not
    // a single specimen, which is the whole point of a counter word (see the design
    // discussion this was redrawn from).
    count: randomInt(2, 5),
    choiceCounterIds,
    subSkill: 'counter-word',
  }
}
