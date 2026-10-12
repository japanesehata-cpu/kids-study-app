import type { CountingQuestion, Level } from '../types'
import { askableCounts, counterBank, counterReading, naiveCounterReading } from '../counterBank'
import { shuffle } from '../../lib/shuffle'

function makeId(): string {
  return `counting-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/** No ★ levels (see CATEGORY_MAX_LEVEL.counting) — `level` is accepted only for interface
 * consistency with every other generator, same as englishSentence's.
 *
 * The answer is the whole reading with the number (2人 → ふたり, not just にん), since the
 * sound often changes with the number. Choices: the right reading; when the sound does
 * change, the "no change" mistake (ににん) so the change itself is what's being learned;
 * the rest are other counters read at the same number (にこ, にほん). Only counts with a
 * settled reading are asked (see CounterEntry.readings). */
export function generateCountingQuestion(_level: Level): CountingQuestion {
  const target = pickRandom(counterBank)
  const count = pickRandom(askableCounts(target))
  const answer = counterReading(target, count)!
  const choices = [answer]
  const naive = naiveCounterReading(target, count)
  if (naive !== answer) choices.push(naive)
  for (const other of shuffle(counterBank.filter((c) => c.id !== target.id))) {
    if (choices.length === 4) break
    const reading = counterReading(other, count)
    if (reading && !choices.includes(reading)) choices.push(reading)
  }

  return {
    id: makeId(),
    category: 'counting',
    level: 1,
    counterId: target.id,
    exampleWordId: target.exampleWordId,
    count,
    choiceReadings: shuffle(choices),
    answerReading: answer,
    subSkill: 'counter-word',
  }
}
