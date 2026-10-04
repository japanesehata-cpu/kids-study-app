import type { Level, MoneyQuestion } from '../types'
import { coinBank, getCoinById } from '../moneyBank'
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

/** One fixed palette per level, one fixed coin-count-to-collect per level — same "a level
 * is one consistent difficulty" principle as every other category. ★1-2 target a single
 * denomination's value (recognition: which coin is worth this much); ★3-5 target a sum of
 * 2-3 coins (real combination-making). The palette is always the pool the target itself was
 * drawn from, so every target is provably reachable — see generateMoneyQuestion. */
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

/** Every distinct total reachable with exactly `count` coins from `pool`, each listed once —
 * the target is picked uniformly from these. Drawing `count` random coins and summing them
 * instead made totals with many combinations (e.g. 60 = 50+10 = 10+50) far more likely than
 * ones with a single combination, so a few amounts kept repeating. */
function reachableTargets(pool: string[], count: number): number[] {
  let totals = new Set([0])
  for (let i = 0; i < count; i++) {
    const next = new Set<number>()
    for (const t of totals) for (const id of pool) next.add(t + getCoinById(id).value)
    totals = next
  }
  return [...totals]
}

function subSkillForLevel(level: Level): string {
  if (level <= 2) return 'money-recognize'
  if (level === 5) return 'money-combine-3'
  return 'money-combine-2'
}

export function generateMoneyQuestion(level: Level): MoneyQuestion {
  const pool = poolForLevel(level)
  const count = coinCountForLevel(level)
  // The specific coins drawn here only fix the *target amount* — the palette has
  // unlimited supply of each denomination (see MoneyBoard.tsx), so the child is free to
  // reach that amount with a different combination than the one drawn (e.g. 15円 via
  // 5+5+5 instead of 10+5) — closer to real change-making, where more than one correct
  // combination usually exists.
  const targetAmount = pickRandom(reachableTargets(pool, count))

  return {
    id: makeId(),
    category: 'money',
    level,
    targetAmount,
    paletteCoinIds: shuffle(pool),
    subSkill: subSkillForLevel(level),
  }
}
