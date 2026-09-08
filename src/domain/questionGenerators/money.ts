import type { Level, MoneyQuestion } from '../types'
import { coinBank, getCoinById } from '../moneyBank'
import { generateNumericChoices } from '../../lib/choices'
import { shuffle } from '../../lib/shuffle'

function makeId(): string {
  return `money-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

const ALL_COIN_IDS = coinBank.map((c) => c.id)
// ★1's smallest, most-encountered denominations — kept separate from ★2's full set so
// single-coin recognition itself has a gentle first step, same shape as hiragana's
// cumulative row unlock.
const SMALL_COIN_IDS = ['yen1', 'yen5', 'yen10']
// ★3's 2-coin combinations exclude 500円 — a smaller, easier total range before ★4 opens
// combinations up to the full set.
const NO_500_COIN_IDS = coinBank.filter((c) => c.id !== 'yen500').map((c) => c.id)

/** One fixed coin count per level, one fixed pool per level — deliberately not a random
 * range within a level (same "a level is one consistent difficulty" principle applied
 * throughout this app's other categories): ★1-2 show a single coin (recognition only),
 * ★3-5 show a combination to total up (recognition + addition), with the pool and coin
 * count each level uses spelled out here rather than computed. */
function poolForLevel(level: Level): string[] {
  if (level === 1) return SMALL_COIN_IDS
  if (level === 3) return NO_500_COIN_IDS
  return ALL_COIN_IDS
}

function coinCountForLevel(level: Level): number {
  if (level <= 2) return 1
  if (level === 5) return 3
  return 2
}

function subSkillForLevel(level: Level): string {
  if (level <= 2) return 'money-recognize'
  if (level === 5) return 'money-combine-3'
  return 'money-combine-2'
}

export function generateMoneyQuestion(level: Level): MoneyQuestion {
  const pool = poolForLevel(level)
  const count = coinCountForLevel(level)
  const coinIds = Array.from({ length: count }, () => pickRandom(pool))
  const answer = coinIds.reduce((sum, id) => sum + getCoinById(id).value, 0)

  // Single-coin recognition draws its wrong choices from the *other real coin values* —
  // the actual mistake this level teaches against is confusing one denomination for
  // another, not an arbitrary nearby number. Combination totals aren't themselves
  // constrained to a real coin value, so those fall back to the generic numeric-choice
  // generator used throughout the app (arithmetic, missingOperand, ...).
  const choices =
    count === 1
      ? shuffle([
          answer,
          ...shuffle(coinBank.filter((c) => c.id !== coinIds[0]).map((c) => c.value)).slice(0, 3),
        ])
      : generateNumericChoices(answer, 0, 1600)

  return {
    id: makeId(),
    category: 'money',
    level,
    coinIds,
    answer,
    choices,
    subSkill: subSkillForLevel(level),
  }
}
