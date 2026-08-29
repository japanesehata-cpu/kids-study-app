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
  /** 'phonics' (levels 1-2): hear the letter's phonics sound (see alphabetBank.ts — NOT the
   * letter name), pick the matching letter within one case. 'caseMatch' (level 3): shown a
   * letter in one case, pick the same letter in the other case — the dedicated
   * upper/lower-case correspondence drill. */
  kind: 'phonics' | 'caseMatch'
  /** caseMatch only: the character actually shown as the question's stimulus. */
  promptChar?: string
  /** phonics only: which of the letter's 1-2 phonics sounds this question uses (see
   * AlphabetEntry.sounds) — some letters (vowels, c, g) have two. */
  soundVariant?: string
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
  minute: 0 | 15 | 30 | 45
  /** each choice is a "H:M" key (language-independent); the view formats it for display */
  choiceKeys: string[]
  subSkill: string
}

/** One grid cell in a spot-the-difference board. `iconId: null` renders an empty slot —
 * itself a valid difference (something present on one side, missing on the other). */
export interface SpotDifferenceSlot {
  iconId: string | null
  flipped: boolean
  scale: number
}

export interface SpotDifferenceQuestion {
  id: string
  category: 'spotDifference'
  level: Level
  /** grid column count shared by both panels */
  columns: number
  /** the left ("reference") panel — always canonical: every slot filled, unflipped, scale 1 */
  leftIconIds: string[]
  /** the right panel, same length/order as leftIconIds; each entry may differ from its
   * left counterpart (swapped icon, removed, resized, or mirrored) */
  rightSlots: SpotDifferenceSlot[]
  /** indexes (into leftIconIds/rightSlots) where the two panels actually differ — the tap targets */
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
