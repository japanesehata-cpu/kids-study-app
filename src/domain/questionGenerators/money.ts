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
  const drawnCoinIds = Array.from({ length: count }, () => pickRandom(pool))
  const targetAmount = drawnCoinIds.reduce((sum, id) => sum + getCoinById(id).value, 0)

  return {
    id: makeId(),
    category: 'money',
    level,
    targetAmount,
    paletteCoinIds: shuffle(pool),
    subSkill: subSkillForLevel(level),
  }
}
