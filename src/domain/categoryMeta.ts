import type { Category } from './types'
import type { DictionaryKey } from '../i18n/dictionary'

export interface CategoryMeta {
  category: Category
  symbol: string
  labelKey: DictionaryKey
}

/** Single source of truth for each category's home-grid symbol and display label —
 * reused by HomeScreen, ProgressScreen, and CategoryHeader so they can't drift apart. */
export const CATEGORY_META: CategoryMeta[] = [
  { category: 'addition', symbol: '+', labelKey: 'categoryAddition' },
  { category: 'subtraction', symbol: '−', labelKey: 'categorySubtraction' },
  { category: 'englishSpelling', symbol: 'Aa', labelKey: 'categoryEnglishSpelling' },
  { category: 'englishListening', symbol: '🔊', labelKey: 'categoryEnglishListening' },
  { category: 'logic', symbol: '?', labelKey: 'categoryLogic' },
  { category: 'hiragana', symbol: 'あ', labelKey: 'categoryHiragana' },
  { category: 'katakana', symbol: 'ア', labelKey: 'categoryKatakana' },
  { category: 'alphabet', symbol: 'Ab', labelKey: 'categoryAlphabet' },
  { category: 'clock', symbol: '🕐', labelKey: 'categoryClock' },
  { category: 'spotDifference', symbol: '🔍', labelKey: 'categorySpotDifference' },
  { category: 'counting', symbol: '🔢', labelKey: 'categoryCounting' },
  { category: 'englishSentence', symbol: '👂', labelKey: 'categoryEnglishSentence' },
  { category: 'sudoku', symbol: '🧩', labelKey: 'categorySudoku' },
  { category: 'missingOperand', symbol: '🔲', labelKey: 'categoryMissingOperand' },
]

export function getCategoryMeta(category: Category): CategoryMeta {
  const meta = CATEGORY_META.find((m) => m.category === category)
  if (!meta) throw new Error(`Unknown category: ${category}`)
  return meta
}
