import type { Category, Level } from './types'
import type { DictionaryKey } from '../i18n/dictionary'

/** One short line per level, shown under its star count on LevelSelectScreen — added
 * because a bare "★2" tells a parent nothing about what that level actually tests, and
 * several categories' levels differ by *which skill* is being tested (alphabet's
 * uppercase/lowercase/case-match, logic's odd-one-out/pattern/compare), not just raw
 * difficulty, so the star count alone can't convey it. Only categories reached through
 * LevelSelectScreen need an entry here — englishSentence and counting skip it entirely
 * (see CATEGORY_MAX_LEVEL, App.tsx). Not every level of every category needs a line: a
 * missing entry just renders no description, which is fine for a level whose star count
 * already says everything (rare, but see spotDifference's higher levels below the current
 * cap — not applicable here since maxLevel already excludes them). */
export const LEVEL_DESCRIPTION_KEY: Partial<Record<Category, Partial<Record<Level, DictionaryKey>>>> = {
  addition: {
    1: 'levelDescAddition1',
    2: 'levelDescAddition2',
    3: 'levelDescAddition3',
    4: 'levelDescAddition4',
    5: 'levelDescAddition5',
    6: 'levelDescAddition6',
  },
  subtraction: {
    1: 'levelDescSubtraction1',
    2: 'levelDescSubtraction2',
    3: 'levelDescSubtraction3',
    4: 'levelDescSubtraction4',
    5: 'levelDescSubtraction5',
    6: 'levelDescSubtraction6',
  },
  englishSpelling: {
    1: 'levelDescEnglishWords1',
    2: 'levelDescEnglishWords2',
    3: 'levelDescEnglishWords3',
    4: 'levelDescEnglishWords4',
    5: 'levelDescEnglishWords5',
  },
  englishListening: {
    1: 'levelDescEnglishWords1',
    2: 'levelDescEnglishWords2',
    3: 'levelDescEnglishWords3',
    4: 'levelDescEnglishWords4',
    5: 'levelDescEnglishWords5',
  },
  // One skill per level now (see questionGenerators/logic.ts's KIND_BY_LEVEL) — the
  // description is exactly what distinguishes each level, unlike before the redesign when
  // ★2/★3 mixed multiple kinds and no single line could have described either honestly.
  logic: {
    1: 'levelDescLogic1',
    2: 'levelDescLogic2',
    3: 'levelDescLogic3',
  },
  hiragana: {
    1: 'levelDescHiragana1',
    2: 'levelDescHiragana2',
    3: 'levelDescHiragana3',
    4: 'levelDescHiragana4',
  },
  katakana: {
    1: 'levelDescKatakana1',
    2: 'levelDescKatakana2',
    3: 'levelDescKatakana3',
    4: 'levelDescKatakana4',
    5: 'levelDescKatakana5',
  },
  kanji: {
    1: 'levelDescKanji1',
    2: 'levelDescKanji2',
    3: 'levelDescKanji3',
    4: 'levelDescKanji4',
    5: 'levelDescKanji5',
    6: 'levelDescKanji6',
  },
  money: {
    1: 'levelDescMoney1',
    2: 'levelDescMoney2',
    3: 'levelDescMoney3',
    4: 'levelDescMoney4',
    5: 'levelDescMoney5',
  },
  alphabet: {
    1: 'levelDescAlphabet1',
    2: 'levelDescAlphabet2',
    3: 'levelDescAlphabet3',
  },
  clock: {
    1: 'levelDescClock1',
    2: 'levelDescClock2',
    3: 'levelDescClock3',
  },
  spotDifference: {
    1: 'levelDescSpotDifference1',
    2: 'levelDescSpotDifference2',
    3: 'levelDescSpotDifference3',
  },
  sudoku: {
    1: 'levelDescSudoku1',
    2: 'levelDescSudoku2',
    3: 'levelDescSudoku3',
  },
  missingOperandAddition: {
    1: 'levelDescMissingOperand1',
    2: 'levelDescMissingOperand2',
  },
  missingOperandSubtraction: {
    1: 'levelDescMissingOperand1',
    2: 'levelDescMissingOperand2',
  },
  shapes: {
    1: 'levelDescShapes1',
    2: 'levelDescShapes2',
    3: 'levelDescShapes3',
    4: 'levelDescShapes4',
    5: 'levelDescShapes5',
    6: 'levelDescShapes6',
  },
}

export function getLevelDescriptionKey(category: Category, level: Level): DictionaryKey | undefined {
  return LEVEL_DESCRIPTION_KEY[category]?.[level]
}

/** すうどく's own ★1-★3 mean something entirely different by hint count depending on mode
 * (mini: 16-cell grid, classic: 81-cell grid — see questionGenerators/sudoku.ts's
 * SudokuMode) despite sharing one CATEGORY_MAX_LEVEL ladder, the same way clock's two
 * modes share one ladder with mode-agnostic descriptions (see levelDescClock1-3) — sudoku's
 * descriptions can't be mode-agnostic the same way (an exact hint count IS the description
 * here), so classic gets its own small lookup instead of a LEVEL_DESCRIPTION_KEY entry. */
const SUDOKU_CLASSIC_LEVEL_DESCRIPTION_KEY: Partial<Record<Level, DictionaryKey>> = {
  1: 'levelDescSudokuClassic1',
  2: 'levelDescSudokuClassic2',
  3: 'levelDescSudokuClassic3',
}

export function getSudokuClassicLevelDescriptionKey(level: Level): DictionaryKey | undefined {
  return SUDOKU_CLASSIC_LEVEL_DESCRIPTION_KEY[level]
}
