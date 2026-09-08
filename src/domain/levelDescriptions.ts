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
}

export function getLevelDescriptionKey(category: Category, level: Level): DictionaryKey | undefined {
  return LEVEL_DESCRIPTION_KEY[category]?.[level]
}
