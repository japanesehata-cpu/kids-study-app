import type { HiraganaQuestion, Level } from '../types'
import { hiraganaBank, type HiraganaEntry, type HiraganaRow } from '../hiraganaBank'
import { shuffle } from '../../lib/shuffle'

function makeId(): string {
  return `hiragana-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Rows unlocked cumulatively as the level goes up — mirrors how hiragana charts are usually taught.
 * Each level's pool is kept well above SET_SIZE (10) since every charId must be unique within
 * one question set. */
const LEVEL_3_ROWS: HiraganaRow[] = [
  'a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa', 'ga', 'za', 'da', 'ba', 'pa',
]

// ★4 is a dedicated 拗音 (youon) milestone, not cumulative with ★1-3 — same shape as
// alphabet's ★3 case-match drill being its own focused skill rather than folded into an
// earlier level's pool.
const LEVEL_ROWS: Record<Level, HiraganaRow[]> = {
  1: ['a', 'ka', 'sa'],
  2: ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma'],
  3: LEVEL_3_ROWS,
  4: ['youon'],
  5: ['youon'],
}

function poolForLevel(level: Level): HiraganaEntry[] {
  const rows = new Set(LEVEL_ROWS[level])
  return hiraganaBank.filter((h) => rows.has(h.row))
}

function subSkillForRow(row: HiraganaRow): string {
  if (row === 'a') return 'hiragana-vowels'
  if (row === 'ka' || row === 'sa') return 'hiragana-basic'
  if (row === 'ta' || row === 'na' || row === 'ha') return 'hiragana-mid'
  if (row === 'youon') return 'hiragana-youon'
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
