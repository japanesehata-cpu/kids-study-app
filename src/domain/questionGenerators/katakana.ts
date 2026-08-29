import type { KatakanaQuestion, Level } from '../types'
import { katakanaBank, type KatakanaEntry, type KatakanaRow } from '../katakanaBank'

function makeId(): string {
  return `katakana-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

/** Mirrors hiragana.ts's LEVEL_ROWS exactly — same cumulative unlock shape, same row order. */
const LEVEL_3_ROWS: KatakanaRow[] = [
  'a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa', 'ga', 'za', 'da', 'ba', 'pa',
]

const LEVEL_ROWS: Record<Level, KatakanaRow[]> = {
  1: ['a', 'ka', 'sa'],
  2: ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma'],
  3: LEVEL_3_ROWS,
  4: LEVEL_3_ROWS,
  5: LEVEL_3_ROWS,
}

function poolForLevel(level: Level): KatakanaEntry[] {
  const rows = new Set(LEVEL_ROWS[level])
  return katakanaBank.filter((k) => rows.has(k.row))
}

function subSkillForRow(row: KatakanaRow): string {
  if (row === 'a') return 'katakana-vowels'
  if (row === 'ka' || row === 'sa') return 'katakana-basic'
  if (row === 'ta' || row === 'na' || row === 'ha') return 'katakana-mid'
  return 'katakana-advanced'
}

/** ★3 draws distractors from the same row (e.g. シ/ツ/ソ), much harder to tell apart than an unrelated character. */
function pickDistractors(target: KatakanaEntry, pool: KatakanaEntry[], sameRow: boolean, count: number): KatakanaEntry[] {
  const sameRowPool = pool.filter((k) => k.row === target.row && k.id !== target.id)
  const candidates = sameRow && sameRowPool.length >= count ? sameRowPool : pool.filter((k) => k.id !== target.id)
  return shuffle(candidates).slice(0, count)
}

export function generateKatakanaQuestion(level: Level): KatakanaQuestion {
  const pool = poolForLevel(level)
  const target = shuffle(pool)[0]
  const useHardDistractors = level >= 3
  const distractors = pickDistractors(target, pool, useHardDistractors, 3)
  const choiceIds = shuffle([target.id, ...distractors.map((d) => d.id)])

  return {
    id: makeId(),
    category: 'katakana',
    level,
    charId: target.id,
    char: target.char,
    choiceIds,
    subSkill: subSkillForRow(target.row),
  }
}
