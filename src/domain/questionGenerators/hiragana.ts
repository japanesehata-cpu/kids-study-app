import type { HiraganaQuestion, Level } from '../types'
import { hiraganaBank, type HiraganaEntry, type HiraganaRow } from '../hiraganaBank'

function makeId(): string {
  return `hiragana-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

/** Rows unlocked cumulatively as the level goes up — mirrors how hiragana charts are usually taught.
 * Each level's pool is kept well above SET_SIZE (10) since every charId must be unique within
 * one question set. */
const LEVEL_3_ROWS: HiraganaRow[] = [
  'a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa', 'ga', 'za', 'da', 'ba', 'pa',
]

const LEVEL_ROWS: Record<Level, HiraganaRow[]> = {
  1: ['a', 'ka', 'sa'],
  2: ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma'],
  3: LEVEL_3_ROWS,
  4: LEVEL_3_ROWS,
  5: LEVEL_3_ROWS,
}

function poolForLevel(level: Level): HiraganaEntry[] {
  const rows = new Set(LEVEL_ROWS[level])
  return hiraganaBank.filter((h) => rows.has(h.row))
}

function subSkillForRow(row: HiraganaRow): string {
  if (row === 'a') return 'hiragana-vowels'
  if (row === 'ka' || row === 'sa') return 'hiragana-basic'
  if (row === 'ta' || row === 'na' || row === 'ha') return 'hiragana-mid'
  return 'hiragana-advanced'
}

/** ★3 draws distractors from the same row (e.g. め/む/み), much harder to tell apart than an unrelated character. */
function pickDistractors(target: HiraganaEntry, pool: HiraganaEntry[], sameRow: boolean, count: number): HiraganaEntry[] {
  const sameRowPool = pool.filter((h) => h.row === target.row && h.id !== target.id)
  const candidates = sameRow && sameRowPool.length >= count ? sameRowPool : pool.filter((h) => h.id !== target.id)
  return shuffle(candidates).slice(0, count)
}

export function generateHiraganaQuestion(level: Level): HiraganaQuestion {
  const pool = poolForLevel(level)
  const target = shuffle(pool)[0]
  const useHardDistractors = level >= 3
  const distractors = pickDistractors(target, pool, useHardDistractors, 3)
  const choiceIds = shuffle([target.id, ...distractors.map((d) => d.id)])

  return {
    id: makeId(),
    category: 'hiragana',
    level,
    charId: target.id,
    char: target.char,
    choiceIds,
    subSkill: subSkillForRow(target.row),
  }
}
