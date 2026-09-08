import type { KanjiQuestion, Level } from '../types'
import { kanjiBank, type KanjiEntry, type KanjiRow } from '../kanjiBank'
import { shuffle } from '../../lib/shuffle'

function makeId(): string {
  return `kanji-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Rows unlocked cumulatively as the level goes up, one theme (or two merged themes) per
 * ★ — mirrors hiraganaBank's own cumulative row unlock. Two theme pairs (people+body,
 * animals+places) share a level to fit all 8 themes into the existing 6-level ceiling
 * every other multi-level category uses, rather than widening Level again for a 7th/8th
 * step (see kanjiBank.ts's top comment). */
const LEVEL_ROWS: Record<Level, KanjiRow[]> = {
  1: ['numbers'],
  2: ['numbers', 'nature'],
  3: ['numbers', 'nature', 'people', 'body'],
  4: ['numbers', 'nature', 'people', 'body', 'colorSize'],
  5: ['numbers', 'nature', 'people', 'body', 'colorSize', 'animals', 'places'],
  6: ['numbers', 'nature', 'people', 'body', 'colorSize', 'animals', 'places', 'study'],
}

function poolForLevel(level: Level): KanjiEntry[] {
  const rows = new Set(LEVEL_ROWS[level])
  return kanjiBank.filter((k) => rows.has(k.row))
}

function subSkillForRow(row: KanjiRow): string {
  if (row === 'numbers') return 'kanji-numbers'
  if (row === 'nature') return 'kanji-nature'
  if (row === 'people' || row === 'body') return 'kanji-people-body'
  if (row === 'colorSize') return 'kanji-color-size'
  return 'kanji-animals-places-study'
}

/** ★4+ draws distractors from the same theme when possible — e.g. mixing up two body-part
 * kanji is a much harder discrimination than an unrelated one, same reasoning as
 * hiragana's same-row hard-mode. */
function pickDistractors(target: KanjiEntry, pool: KanjiEntry[], sameRow: boolean, count: number): KanjiEntry[] {
  const sameRowPool = pool.filter((k) => k.row === target.row && k.id !== target.id)
  const candidates = sameRow && sameRowPool.length >= count ? sameRowPool : pool.filter((k) => k.id !== target.id)
  return shuffle(candidates).slice(0, count)
}

export function generateKanjiQuestion(level: Level): KanjiQuestion {
  const pool = poolForLevel(level)
  const target = shuffle(pool)[0]
  const useHardDistractors = level >= 4
  const distractors = pickDistractors(target, pool, useHardDistractors, 3)
  const choiceIds = shuffle([target.id, ...distractors.map((d) => d.id)])

  return {
    id: makeId(),
    category: 'kanji',
    level,
    charId: target.id,
    char: target.char,
    choiceIds,
    subSkill: subSkillForRow(target.row),
  }
}
