import type { KanjiQuestion, Level } from '../types'
import { kanjiBank, type KanjiEntry, type KanjiGrade, type KanjiRow } from '../kanjiBank'
import { shuffle } from '../../lib/shuffle'

function makeId(): string {
  return `kanji-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Rows unlocked cumulatively as the level goes up, one theme (or two merged themes) per
 * ★ — mirrors hiraganaBank's own cumulative row unlock. Each grade has more themes than
 * the shared 6-level ceiling, so some theme pairs share a level (see kanjiBank.ts). */
const LEVEL_ROWS: Record<KanjiGrade, Record<Level, KanjiRow[]>> = {
  1: {
    1: ['numbers'],
    2: ['numbers', 'nature'],
    3: ['numbers', 'nature', 'people', 'body'],
    4: ['numbers', 'nature', 'people', 'body', 'colorSize'],
    5: ['numbers', 'nature', 'people', 'body', 'colorSize', 'animals', 'places'],
    6: ['numbers', 'nature', 'people', 'body', 'colorSize', 'animals', 'places', 'study'],
  },
  2: {
    1: ['g2Nature'],
    2: ['g2Nature', 'g2Time'],
    3: ['g2Nature', 'g2Time', 'g2People'],
    4: ['g2Nature', 'g2Time', 'g2People', 'g2Things'],
    5: ['g2Nature', 'g2Time', 'g2People', 'g2Things', 'g2Places'],
    6: ['g2Nature', 'g2Time', 'g2People', 'g2Things', 'g2Places', 'g2Actions', 'g2Study'],
  },
}

export function kanjiLevelRows(grade: KanjiGrade, level: Level): KanjiRow[] {
  return LEVEL_ROWS[grade][level]
}

function poolForLevel(grade: KanjiGrade, level: Level): KanjiEntry[] {
  const rows = new Set(LEVEL_ROWS[grade][level])
  return kanjiBank.filter((k) => k.grade === grade && rows.has(k.row))
}

function subSkillForRow(row: KanjiRow): string {
  if (row === 'numbers') return 'kanji-numbers'
  if (row === 'nature') return 'kanji-nature'
  if (row === 'people' || row === 'body') return 'kanji-people-body'
  if (row === 'colorSize') return 'kanji-color-size'
  if (row === 'g2Nature' || row === 'g2Time') return 'kanji2-nature-time'
  if (row === 'g2People' || row === 'g2Things') return 'kanji2-people-things'
  if (row === 'g2Places') return 'kanji2-places'
  if (row === 'g2Actions' || row === 'g2Study') return 'kanji2-actions-study'
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

export function generateKanjiQuestion(level: Level, grade: KanjiGrade = 1): KanjiQuestion {
  const pool = poolForLevel(grade, level)
  const target = shuffle(pool)[0]
  const useHardDistractors = level >= 4
  const distractors = pickDistractors(target, pool, useHardDistractors, 3)
  const choiceIds = shuffle([target.id, ...distractors.map((d) => d.id)])

  return {
    id: makeId(),
    category: grade === 2 ? 'kanji2' : 'kanji',
    level,
    charId: target.id,
    char: target.char,
    choiceIds,
    subSkill: subSkillForRow(target.row),
  }
}
