export type Category =
  | 'addition'
  | 'subtraction'
  | 'englishSpelling'
  | 'englishListening'
  | 'logic'
  | 'hiragana'
  | 'katakana'
  | 'alphabet'
  | 'clock'
  | 'spotDifference'
  | 'counting'

/** The original five categories use a 5-step scale; clock/spotDifference/counting use only
 * levels 1-3 (see CATEGORY_MAX_LEVEL in progress.ts), shown as 1-3 stars instead of 1-5. */
export type Level = 1 | 2 | 3 | 4 | 5

export interface ArithmeticQuestion {
  id: string
  category: 'addition' | 'subtraction'
  level: Level
  operandA: number
  operandB: number
  answer: number
  /** whether to show counting illustrations alongside the equation */
  showVisual: boolean
  /** short story framing ("there were 3 apples...") shown instead of the bare equation */
  story?: { ja: string; en: string }
  /** sub-skill tag used for the strengths/weaknesses breakdown */
  subSkill: string
}

export interface EnglishWordQuestion {
  id: string
  /** englishSpelling: shown a picture, choose the matching written word. englishListening:
   * hear the word spoken, choose the matching picture. Two separate category entry points
   * (see LevelSelectScreen) with independent level progression, rather than one category
   * that randomly mixed both formats. */
  category: 'englishSpelling' | 'englishListening'
  level: Level
  wordId: string
  word: string
  translationJa: string
  /** mode: hear the word and pick the picture, or see the picture and pick the word */
  mode: 'listenAndPick' | 'lookAndPick'
  choiceWordIds: string[]
  subSkill: string
}

export interface LogicQuestion {
  id: string
  category: 'logic'
  level: Level
  kind: 'pattern' | 'oddOneOut' | 'compare'
  /** pattern only: the sequence shown before the "?" */
  sequence?: string[]
  /** compare only: whether the biggest or smallest number is being asked for */
  compareGoal?: 'max' | 'min'
  /** emoji (pattern), wordBank ids (oddOneOut), or number strings (compare) */
  choices: string[]
  answer: string
  subSkill: string
}

export interface HiraganaQuestion {
  id: string
  category: 'hiragana'
  level: Level
  charId: string
  char: string
  choiceIds: string[]
  subSkill: string
}

export interface AlphabetQuestion {
  id: string
  category: 'alphabet'
  level: Level
  letterId: string
  /** 'letterName' (levels 1-2): hear the letter's name spoken, pick the matching letter
   * within one case. 'caseMatch' (level 3): shown a letter in one case, pick the same
   * letter in the other case — the dedicated upper/lower-case correspondence drill. */
  kind: 'letterName' | 'caseMatch'
  /** caseMatch only: the character actually shown as the question's stimulus. */
  promptChar?: string
  /** the character the child must tap among choiceIds */
  answerChar: string
  choiceIds: string[]
  subSkill: string
}

export interface KatakanaQuestion {
  id: string
  category: 'katakana'
  level: Level
  charId: string
  char: string
  choiceIds: string[]
  subSkill: string
}

export interface ClockQuestion {
  id: string
  category: 'clock'
  level: Level
  hour: number
  /** 0-59 — ★1-★3 only ever produce quarter-hour values, ★4-★5 produce 5-minute and
   * then any-minute values (see LEVEL_MINUTES in questionGenerators/clock.ts). */
  minute: number
  /** 'multipleChoice': shown a clock face, pick the matching time from 4 options.
   * 'setTime': told a target time, drag the clock's own hands to set it — a harder,
   * production (not just recognition) test of the same skill. */
  kind: 'multipleChoice' | 'setTime'
  /** multipleChoice only: each choice is a "H:M" key (language-independent); the view
   * formats it for display. Empty for setTime, which has no choice-grid. */
  choiceKeys: string[]
  subSkill: string
}

export type SpotDifferenceDiffType = 'swap' | 'resize' | 'flip' | 'rotate'

/** One item scattered freely across a spot-the-difference scene panel — not a grid cell.
 * Every item gets its own baseline size/rotation, even ones that don't differ between
 * panels, so a difference has to be found by comparing the two scenes rather than by
 * noticing "which cell looks off" (a flaw of the earlier fixed-grid version, where only
 * the differing cells ever varied from a uniform baseline). */
export interface SpotDifferenceItem {
  iconId: string
  /** 0-100, position within the scene panel */
  xPct: number
  yPct: number
  /** px */
  size: number
  /** degrees */
  rotate: number
  flipped: boolean
}

export interface SpotDifferenceQuestion {
  id: string
  category: 'spotDifference'
  level: Level
  /** the left ("reference") panel — always canonical */
  leftItems: SpotDifferenceItem[]
  /** the right panel, same length/order/position as leftItems; entries at
   * differenceIndexes differ (swapped icon, resized, rotated, or mirrored) */
  rightItems: SpotDifferenceItem[]
  /** indexes (into leftItems/rightItems) where the two panels actually differ — the tap targets */
  differenceIndexes: number[]
  subSkill: string
}

export interface CountingQuestion {
  id: string
  category: 'counting'
  level: Level
  /** the wordBank id being counted */
  targetWordId: string
  /** the full row shown, including any distractor ids mixed in at higher levels */
  displayIds: string[]
  count: number
  choices: number[]
  subSkill: string
}

export type Question =
  | ArithmeticQuestion
  | EnglishWordQuestion
  | LogicQuestion
  | HiraganaQuestion
  | KatakanaQuestion
  | AlphabetQuestion
  | ClockQuestion
  | SpotDifferenceQuestion
  | CountingQuestion

export interface AnswerRecord {
  questionId: string
  category: Category
  subSkill: string
  correct: boolean
  question: Question
}

export interface CategoryProgress {
  level: Level
  recentAccuracy: number[]
  reviewQueue: Question[]
}

export type ProgressState = Record<Category, CategoryProgress>

export interface SetResult {
  category: Category
  answers: AnswerRecord[]
  accuracy: number
  strongSubSkill: string | null
  weakSubSkill: string | null
  bestStreak: number
  leveledUp: boolean
}
