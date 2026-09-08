export type Category =
  | 'addition'
  | 'subtraction'
  | 'englishSpelling'
  | 'englishListening'
  | 'logic'
  | 'hiragana'
  | 'katakana'
  | 'kanji'
  | 'alphabet'
  | 'clock'
  | 'spotDifference'
  | 'counting'
  | 'englishSentence'
  | 'sudoku'
  | 'missingOperandAddition'
  | 'missingOperandSubtraction'

/** The original five categories use a 5-step scale; clock/spotDifference/counting use only
 * levels 1-3 (see CATEGORY_MAX_LEVEL in progress.ts), shown as 1-3 stars instead of 1-5.
 * addition/subtraction alone reach ★6 (a "teens crossing into the 20s" milestone — see
 * questionGenerators/{addition,subtraction}.ts) — every other category's Record<Level, X>
 * table still needs a (usually unused) `6` entry purely so it type-checks against this
 * shared union, same as the pre-existing "never reached" entries below ★5. */
export type Level = 1 | 2 | 3 | 4 | 5 | 6

export interface ArithmeticQuestion {
  id: string
  category: 'addition' | 'subtraction' | 'missingOperandAddition' | 'missingOperandSubtraction'
  /** The operator THIS question actually uses — always derivable from `category` (a
   * missingOperandAddition question is always 'addition', etc. — split into its own
   * category per operator specifically so this never mixes, see
   * questionGenerators/missingOperand.ts). Kept as its own field anyway, rather than
   * switching on `category` everywhere: every operator-dependent rendering choice
   * (symbol, visual, speech template) already reads this field, from when
   * missingOperand was a single mixed category. */
  operator: 'addition' | 'subtraction'
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
  /** Set only for missingOperandAddition/missingOperandSubtraction questions: which slot
   * is hidden and must be solved for — the child answers with that operand's value
   * instead of `answer`. */
  blank?: 'operandA' | 'operandB'
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

/** Hears a full spoken WH-question ("What color is a banana?", "What animal has a pocket
 * on its belly?") with no picture shown, and answers by tapping one of 4 WordIcon choices
 * — tests real listening comprehension of a sentence, not just single-word recognition
 * (see EnglishWordQuestion above). `sentenceId` is pool-prefixed ("color-banana",
 * "animal-kangaroo") so it stays globally unique across content banks and doubles as the
 * `sentence-${sentenceId}.wav` audio cache key — see questionGenerators/englishSentence.ts. */
export interface EnglishSentenceQuestion {
  id: string
  category: 'englishSentence'
  level: Level
  sentenceId: string
  question: string
  correctWordId: string
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

export interface KanjiQuestion {
  id: string
  category: 'kanji'
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

/** A 4x4 "mini sudoku" — each row and column (and, from ★3, each 2x2 block) contains each
 * of `symbols`'s 4 colors exactly once. `grid` is the puzzle as shown (null = blank the
 * child must fill); `solution` is the same 4x4 shape fully filled in. Generated so the
 * blanks always have exactly one valid completion under whichever ruleset the current
 * level actually teaches (row/column only below ★3, row/column/block from ★3) — see
 * questionGenerators/sudoku.ts. */
export interface SudokuQuestion {
  id: string
  category: 'sudoku'
  level: Level
  grid: (string | null)[][]
  solution: string[][]
  symbols: string[]
  subSkill: string
}

export interface CountingQuestion {
  id: string
  category: 'counting'
  level: Level
  /** counterBank id being tested (see counterBank.ts) */
  counterId: string
  /** wordBank id (or a words-image-only id) shown as the example picture */
  exampleWordId: string
  choiceCounterIds: string[]
  subSkill: string
}

export type Question =
  | ArithmeticQuestion
  | EnglishWordQuestion
  | LogicQuestion
  | HiraganaQuestion
  | KatakanaQuestion
  | KanjiQuestion
  | AlphabetQuestion
  | ClockQuestion
  | SpotDifferenceQuestion
  | CountingQuestion
  | EnglishSentenceQuestion
  | SudokuQuestion

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
