import type { KatakanaQuestion, Level } from '../types'
import { katakanaBank, type KatakanaEntry, type KatakanaRow } from '../katakanaBank'
import { shuffle } from '../../lib/shuffle'

function makeId(): string {
  return `katakana-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Mirrors hiragana.ts's LEVEL_ROWS exactly — same cumulative unlock shape, same row order. */
const LEVEL_3_ROWS: KatakanaRow[] = [
  'a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa', 'ga', 'za', 'da', 'ba', 'pa',
]

// ★4 (youon) and ★5 (gairaigo) are each their own dedicated milestone, not cumulative with
// ★1-3 — katakana gets one level further than hiragana since loanword-only extended kana
// (gairaigo) has no hiragana equivalent to mirror.
const LEVEL_ROWS: Record<Level, KatakanaRow[]> = {
  1: ['a', 'ka', 'sa'],
  2: ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma'],
  3: LEVEL_3_ROWS,
  4: ['youon'],
  5: ['gairaigo'],
}

function poolForLevel(level: Level): KatakanaEntry[] {
  const rows = new Set(LEVEL_ROWS[level])
  return katakanaBank.filter((k) => rows.has(k.row))
}

function subSkillForRow(row: KatakanaRow): string {
  if (row === 'a') return 'katakana-vowels'
  if (row === 'ka' || row === 'sa') return 'katakana-basic'
  if (row === 'ta' || row === 'na' || row === 'ha') return 'katakana-mid'
  if (row === 'youon') return 'katakana-youon'
  if (row === 'gairaigo') return 'katakana-gairaigo'
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
