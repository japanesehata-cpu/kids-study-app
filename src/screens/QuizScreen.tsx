import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type {
  AnswerRecord,
  ArithmeticQuestion,
  Category,
  ClockQuestion,
  CountingQuestion,
  MoneyQuestion,
  EnglishSentenceQuestion,
  EnglishWordQuestion,
  HiraganaQuestion,
  KatakanaQuestion,
  KanjiQuestion,
  AlphabetQuestion,
  Level,
  LogicQuestion,
  ProgressState,
  Question,
  SpotDifferenceQuestion,
  SudokuQuestion,
  ShapeQuestion,
  ShapeId,
} from '../domain/types'
import { generateQuestionSet } from '../domain/progress'
import { generateNumericChoices } from '../lib/choices'
import { getWordById } from '../domain/wordBank'
import { getCounterById } from '../domain/counterBank'
import { getHiraganaById, hiraganaSpeechPhrase } from '../domain/hiraganaBank'
import { getKatakanaById, katakanaSpeechPhrase } from '../domain/katakanaBank'
import { getKanjiById, kanjiSpeechPhrase } from '../domain/kanjiBank'
import { alphabetSpeechPhrase, getAlphabetById } from '../domain/alphabetBank'
import { formatClockKey, buildSetTimePrompt, type ClockMode } from '../domain/questionGenerators/clock'
import type { SudokuMode } from '../domain/questionGenerators/sudoku'
import { InteractiveClock } from '../components/InteractiveClock'
import {
  buildFeedbackMessage,
  buildSpotDifferenceFailedFeedback,
  buildSudokuFailedFeedback,
  buildMoneyFailedFeedback,
} from '../domain/feedbackMessages'
import { buildExplanation } from '../domain/explanations'
import { speak, speakSequence, type SpeechLang, type SpeechPart, type VoiceProfile } from '../lib/tts'
import { playCorrectSfx, playIncorrectSfx } from '../lib/sfx'
import { useI18n } from '../i18n/I18nContext'
import { dictionary, type Lang, type DictionaryKey } from '../i18n/dictionary'
import { TtsButton } from '../components/TtsButton'
import { WordIcon } from '../components/WordIcon'
import { HiraganaChar } from '../components/HiraganaChar'
import { ClockFace } from '../components/ClockFace'
import { ShapeIcon } from '../components/ShapeIcon'
import { SpotDifferenceBoard } from '../components/SpotDifferenceBoard'
import { SudokuBoard } from '../components/SudokuBoard'
import { MoneyBoard } from '../components/MoneyBoard'
import { NumberPad } from '../components/NumberPad'
import { OddOneOutScene } from '../components/OddOneOutScene'
import { CharacterPortrait } from '../components/characters/CharacterPortrait'
import { characterThemes, type CharacterTheme } from '../components/characters/characterThemes'
import { CorrectCelebration } from '../components/CorrectCelebration'
import { PeekingMascot, QuizProgressStars } from '../components/QuizFlourishes'
import { CategoryHeader } from '../components/CategoryHeader'
import { useResponsiveSize } from '../lib/useResponsiveSize'
import { oppositeWordKey } from '../domain/oppositeBank'
import { clockTimeSpeech, SET_TIME_PROMPT_AFTER, SET_TIME_PROMPT_BEFORE } from '../domain/answerSpeech'
import { computeAnswerSpeech } from '../domain/answerSpeechFor'
import { ScreenTopBar } from '../components/ScreenTopBar'

interface QuizScreenProps {
  category: Category
  level: Level
  setSize: number
  /** category === 'clock' only — see LevelSelectScreen's mode toggle. */
  clockMode?: ClockMode
  /** category === 'sudoku' only — see LevelSelectScreen's mode toggle. */
  sudokuMode?: SudokuMode
  progress: ProgressState
  onComplete: (answers: AnswerRecord[]) => void
  /** one step back — LevelSelectScreen */
  onExit: () => void
  onHome: () => void
}

type Choice = number | string

/** Sentinel passed to handleSelect once every difference on a spot-the-difference board has
 * been found — that board has no discrete "choice" buttons, so completion is always correct. */
const SPOT_DIFFERENCE_DONE = 'spot-difference-done'

/** Sentinel passed to handleSelect once a spot-the-difference board hits its wrong-tap
 * limit before every difference was found — the only way that board can be "incorrect". */
const SPOT_DIFFERENCE_FAILED = 'spot-difference-failed'

/** Sentinel passed to handleSelect once every blank cell on a sudoku board has been filled
 * correctly — like spot-the-difference, that board has no discrete "choice" buttons. */
const SUDOKU_DONE = 'sudoku-done'

/** Sentinel passed to handleSelect once a sudoku board hits its wrong-guess limit before
 * every blank was filled — mirrors SPOT_DIFFERENCE_FAILED exactly (see SudokuBoard.tsx's
 * MAX_WRONG_GUESSES): without this, nothing stopped a child from just cycling through
 * every palette option on a cell for free until one happened to be right. */
const SUDOKU_FAILED = 'sudoku-failed'

/** Sentinel passed to handleSelect once a money board's tray total exactly equals the
 * target amount — like sudoku/spot-the-difference, that board has no discrete "choice"
 * buttons. */
const MONEY_DONE = 'money-done'

/** Sentinel passed to handleSelect once a money board hits its wrong-guess limit (see
 * MoneyBoard.tsx's MAX_WRONG_GUESSES) before the tray reached the target — mirrors
 * SUDOKU_FAILED exactly. */
const MONEY_FAILED = 'money-failed'

function isArithmetic(q: Question): q is ArithmeticQuestion {
  return (
    q.category === 'addition' ||
    q.category === 'subtraction' ||
    q.category === 'missingOperandAddition' ||
    q.category === 'missingOperandSubtraction'
  )
}

/** Plain たしざん/ひきざん up to this level answer by tapping one of 4 choices instead of the
 * number pad — the youngest players recognize the right number far more easily than they
 * produce it, and the pad's extra step (type, then ✓) was too much at ★1-2. □のけいさん and
 * every higher level keep the pad. */
const ARITHMETIC_CHOICE_MAX_LEVEL = 2

function usesNumberPad(q: ArithmeticQuestion): boolean {
  const isPlain = q.category === 'addition' || q.category === 'subtraction'
  return !(isPlain && q.level <= ARITHMETIC_CHOICE_MAX_LEVEL)
}

function isLogic(q: Question): q is LogicQuestion {
  return q.category === 'logic'
}

function isHiragana(q: Question): q is HiraganaQuestion {
  return q.category === 'hiragana'
}

function isKatakana(q: Question): q is KatakanaQuestion {
  return q.category === 'katakana'
}

function isKanji(q: Question): q is KanjiQuestion {
  return q.category === 'kanji' || q.category === 'kanji2'
}

function isClock(q: Question): q is ClockQuestion {
  return q.category === 'clock'
}

function isSpotDifference(q: Question): q is SpotDifferenceQuestion {
  return q.category === 'spotDifference'
}

function isCounting(q: Question): q is CountingQuestion {
  return q.category === 'counting'
}

function isMoney(q: Question): q is MoneyQuestion {
  return q.category === 'money'
}

function isSudoku(q: Question): q is SudokuQuestion {
  return q.category === 'sudoku'
}

function isEnglishWord(q: Question): q is EnglishWordQuestion {
  return q.category === 'englishSpelling' || q.category === 'englishListening'
}

function isEnglishSentence(q: Question): q is EnglishSentenceQuestion {
  return q.category === 'englishSentence'
}

function isAlphabet(q: Question): q is AlphabetQuestion {
  return q.category === 'alphabet'
}

function isShapes(q: Question): q is ShapeQuestion {
  return q.category === 'shapes'
}

// Keyed by ShapeId for casual names (★2/★4), or by the FormalCategory tokens
// questionGenerators/shapes.ts's FORMAL_CATEGORY produces for ★5 — both are plain
// strings, so one Record covers both without a union type.
const SHAPE_NAME_KEY: Record<string, DictionaryKey> = {
  circle: 'shapeNameCircle',
  triangle: 'shapeNameTriangle',
  rightTriangle: 'shapeNameRightTriangle',
  square: 'shapeNameSquare',
  rectangle: 'shapeNameRectangle',
  rhombus: 'shapeNameRhombus',
  star: 'shapeNameStar',
  heart: 'shapeNameHeart',
  sphere: 'shapeNameSphere',
  cube: 'shapeNameCube',
  cylinder: 'shapeNameCylinder',
  cone: 'shapeNameCone',
  triangleFormal: 'shapeFormalTriangleFormal',
  quadrilateralFormal: 'shapeFormalQuadrilateralFormal',
  circleFormal: 'shapeFormalCircleFormal',
  starFormal: 'shapeFormalStarFormal',
}

function equationSpeech(
  q: ArithmeticQuestion,
  lang: Lang,
): { text: string; speechLang: SpeechLang } {
  const speechLang: SpeechLang = lang === 'ja' ? 'ja-JP' : 'en-US'
  // missingOperand: the equation itself is shown on screen (with the blank as a box), not
  // spoken value-by-value — a fixed instruction instead avoids needing per-value TTS cache
  // entries for every possible blanked equation. Text matches dictionary.ts's
  // missingOperandPrompt exactly (hardcoded, not `t(...)`, since this function has no
  // access to the translator — but it's what the on-screen subtitle also shows, see
  // ArithmeticQuestionView, so the manual "listen again" button and the auto-speak effect
  // both driven by this function stay in sync with what's displayed).
  if (q.blank) {
    return lang === 'ja'
      ? { text: 'しかくに あう かずを えらんでね', speechLang }
      : { text: 'Choose the number that fills the blank', speechLang }
  }
  if (q.story) return { text: q.story[lang], speechLang }
  if (lang === 'ja') {
    const op = q.operator === 'addition' ? 'たす' : 'ひく'
    return { text: `${q.operandA} ${op} ${q.operandB} は？`, speechLang }
  }
  const op = q.operator === 'addition' ? 'plus' : 'minus'
  return { text: `${q.operandA} ${op} ${q.operandB} equals what?`, speechLang }
}

/** What to speak the moment a question appears — every category gets something, but never
 * the answer itself for a "look and pick" question (that would give it away), just the
 * generic instruction prompt in that case.
 *
 * cacheKey is only ever set for Japanese text — the pre-rendered files (see
 * scripts/generate-tts-cache.mjs) are all Japanese, so attaching one while lang==='en'
 * would play the wrong language entirely. A story-mode word problem's text looked
 * unbounded at a glance (it reads like a randomized sentence) but buildAdditionStory/
 * buildSubtractionStory in wordProblems.ts are actually a single fixed template each, with
 * only the two operands interpolated — exactly as bounded as the plain equation text, so
 * it's cached under its own `story-` prefix instead of being left live. */
function computeAutoSpeech(
  question: Question,
  lang: Lang,
  t: (key: DictionaryKey, vars?: Record<string, string | number>) => string,
): { text: string; speechLang: SpeechLang; cacheKey?: string; parts?: SpeechPart[] } {
  const speechLang: SpeechLang = lang === 'ja' ? 'ja-JP' : 'en-US'
  const ja = lang === 'ja'

  if (isArithmetic(question)) {
    const { text, speechLang: sl } = equationSpeech(question, lang)
    if (question.blank) {
      const cacheKey = ja
        ? question.operator === 'addition'
          ? 'prompt-addition-missing'
          : 'prompt-subtraction-missing'
        : undefined
      return { text, speechLang: sl, cacheKey }
    }
    const keyPrefix = question.story ? 'story' : 'equation'
    const cacheKey = ja ? `${keyPrefix}-${question.category}-${question.operandA}-${question.operandB}` : undefined
    return { text, speechLang: sl, cacheKey }
  }
  if (isLogic(question) && question.kind === 'opposite') {
    return {
      text: t('logicOppositePrompt', { word: question.promptWord! }),
      speechLang,
      cacheKey: ja ? `prompt-opposite-${oppositeWordKey(question.promptWord!)}` : undefined,
    }
  }
  if (isLogic(question)) {
    const cacheKey = ja
      ? question.kind === 'pattern'
        ? 'prompt-logic-pattern'
        : question.kind === 'oddOneOut'
          ? 'prompt-logic-oddoneout'
          : question.compareGoal === 'max'
            ? 'prompt-logic-compare-max'
            : 'prompt-logic-compare-min'
      : undefined
    return { text: t(logicPromptKey(question)), speechLang, cacheKey }
  }
  if (isHiragana(question)) {
    return {
      text: hiraganaSpeechPhrase(getHiraganaById(question.charId)),
      speechLang: 'ja-JP',
      cacheKey: `hiragana-${question.charId}`,
    }
  }
  if (isKatakana(question)) {
    return {
      text: katakanaSpeechPhrase(getKatakanaById(question.charId)),
      speechLang: 'ja-JP',
      cacheKey: `katakana-${question.charId}`,
    }
  }
  if (isKanji(question)) {
    return {
      text: kanjiSpeechPhrase(getKanjiById(question.charId)),
      speechLang: 'ja-JP',
      cacheKey: `kanji-${question.charId}`,
    }
  }
  if (isClock(question)) {
    if (question.kind === 'setTime') {
      const text = buildSetTimePrompt(question.hour, question.minute, lang)
      // The time in the middle varies (720 possibilities), so it's spoken as pre-rendered
      // pieces rather than one live-synthesized sentence.
      const parts = ja
        ? [SET_TIME_PROMPT_BEFORE, ...clockTimeSpeech(question.hour, question.minute), SET_TIME_PROMPT_AFTER]
        : undefined
      return { text, speechLang, parts }
    }
    return { text: t('clockPrompt'), speechLang, cacheKey: ja ? 'prompt-clock' : undefined }
  }
  if (isSpotDifference(question)) {
    // No spoken prompt either — see SpotDifferenceBoard.tsx's own comment: the category
    // header already says "まちがいさがし", and there's no per-question content (like a
    // target time or amount) this instruction would otherwise be the only place to convey.
    return { text: '', speechLang }
  }
  if (isSudoku(question)) {
    const isClassic = question.mode === 'classic'
    return {
      text: t(isClassic ? 'sudokuPromptClassic' : 'sudokuPrompt'),
      speechLang,
      cacheKey: ja ? (isClassic ? 'prompt-sudoku-classic' : 'prompt-sudoku') : undefined,
    }
  }
  if (isCounting(question)) {
    const counter = getCounterById(question.counterId)
    return {
      text: ja ? counter.promptJa : counter.promptEn,
      speechLang,
      cacheKey: ja ? `prompt-counting-${question.counterId}` : undefined,
    }
  }
  if (isMoney(question)) {
    // The target amount varies per question (unbounded, unlike sudoku's fixed prompt), so
    // it's shown on-screen (see MoneyBoard.tsx's .money-target) rather than spoken inline
    // — the spoken instruction itself stays one fixed, cacheable sentence.
    return { text: t('moneyTargetPrompt'), speechLang, cacheKey: ja ? 'prompt-money-target' : undefined }
  }
  if (isShapes(question)) {
    const cacheKey = ja
      ? question.kind === 'pickShape'
        ? `prompt-shapes-pick-${question.answer}`
        : question.kind === 'countSides'
          ? 'prompt-shapes-sides'
          : `prompt-shapes-name-${question.nameStyle}`
      : undefined
    return { text: shapesPromptText(question, t), speechLang, cacheKey }
  }
  if (isAlphabet(question)) {
    // Speak the letter wrapped in its ABC-chart mnemonic (see alphabetSpeechPhrase) rather
    // than the bare letter, always using the upper-case form since a letter's name doesn't
    // change with case regardless of question kind or which case is being tested.
    const entry = getAlphabetById(question.letterId)
    return { text: alphabetSpeechPhrase(entry), speechLang: 'en-US', cacheKey: `alphabet-letter-${question.letterId}` }
  }
  if (isEnglishSentence(question)) {
    // Always English regardless of UI language, same as englishWords' listenAndPick
    // branch below — this category has no "look and pick" mode to fall back to.
    // sentenceId is already pool-prefixed ("color-banana", "animal-kangaroo" — see
    // questionGenerators/englishSentence.ts), so it doubles directly as the cache key.
    return { text: question.question, speechLang: 'en-US', cacheKey: `sentence-${question.sentenceId}` }
  }
  // englishWords
  if (question.mode === 'listenAndPick') {
    return { text: question.word, speechLang: 'en-US', cacheKey: `word-en-${question.wordId}` }
  }
  return { text: t('lookPrompt'), speechLang, cacheKey: ja ? 'prompt-english-look' : undefined }
}

function ArithmeticQuestionView({
  question,
  lang,
  voiceProfile,
  cacheKey,
  missingOperandPrompt,
}: {
  question: ArithmeticQuestion
  lang: Lang
  voiceProfile: VoiceProfile
  cacheKey?: string
  /** Only rendered/used when question.blank is set — see the subtitle below. */
  missingOperandPrompt: string
}) {
  const { text, speechLang } = equationSpeech(question, lang)
  const symbol = question.operator === 'addition' ? '+' : '−'

  return (
    <div className="quiz-prompt-stack">
      {question.blank && <p className="subtitle">{missingOperandPrompt}</p>}
      {/* ★4's round-tens questions can have a 20-90 operand — rendering that many apple
          emoji would be absurd, which is exactly why ★4 sets showVisual: false (see
          questionGenerators/addition.ts). A persisted pre-★4 question's showVisual is
          always true (that field didn't exist as a meaningful toggle before ★4), so
          checking it here can't hide the visual for any older ★1-3 question. */}
      {question.operator === 'addition' && question.showVisual !== false && (
        <div className="addition-visual">
          <div className="addition-visual-group">
            {Array.from({ length: question.operandA }).map((_, i) => (
              <span key={i} className="addition-visual-item">
                🍎
              </span>
            ))}
          </div>
          <span className="addition-visual-plus">+</span>
          <div className="addition-visual-group">
            {Array.from({ length: question.operandB }).map((_, i) => (
              <span key={i} className="addition-visual-item">
                🍎
              </span>
            ))}
          </div>
        </div>
      )}
      {/* Same reasoning as the addition block above. */}
      {question.operator === 'subtraction' && question.showVisual !== false && (
        <div className="subtraction-visual-row">
          {Array.from({ length: question.operandA }).map((_, i) => (
            <span
              key={i}
              className={`subtraction-visual-item ${i < question.operandB ? 'removed' : ''}`}
            >
              🍎
            </span>
          ))}
        </div>
      )}
      {question.blank ? (
        <div className="equation-text">
          {question.blank === 'operandA' ? (
            <span className="equation-blank" />
          ) : (
            question.operandA
          )}{' '}
          {symbol}{' '}
          {question.blank === 'operandB' ? <span className="equation-blank" /> : question.operandB} ={' '}
          {question.answer}
        </div>
      ) : question.story ? (
        <p className="story-text">{question.story[lang]}</p>
      ) : (
        <div className="equation-text">
          {question.operandA} {symbol} {question.operandB} = ?
        </div>
      )}
      <TtsButton text={text} lang={speechLang} label="listen" voiceProfile={voiceProfile} cacheKey={cacheKey} />
    </div>
  )
}

type AutoSpeech = ReturnType<typeof computeAutoSpeech>

/** 問題画面の3つの欄 (docs/functional-design.md 3.3): choice questions are laid out as a
 * fixed-height 問題文の欄 (the prompt; it turns into the feedback once answered, so nothing
 * below it moves), a 問いの欄 holding what is being asked as large as it fits, and a 答えの欄
 * whose 2×2 buttons stretch to fill the rest. Boards (おかね, すうどく, まちがいさがし), the
 * clock, □をもとめる, the number pad and なかまはずれ keep their own layouts. */
function usesQuizLayout(q: Question): boolean {
  if (isArithmetic(q)) return !q.blank && !usesNumberPad(q)
  if (isLogic(q)) return q.kind !== 'oddOneOut'
  return (
    isHiragana(q) ||
    isKatakana(q) ||
    isKanji(q) ||
    isAlphabet(q) ||
    isCounting(q) ||
    isEnglishSentence(q) ||
    isEnglishWord(q)
  )
}

/** Container units of .quiz-stimulus / .quiz-answers (both size containers), so each grows
 * with the room its own slot actually has. */
const BIG_SPEAKER_SIZE = 'min(80cqh, 50cqw)'
const LAYOUT_ICON_SIZE = 'min(38cqh, 40cqw)'

/** 問いの欄 : 答えの欄 when the question is only a sound: the speaker needs little room, the
 * letters or pictures to choose from need a lot. */
const LISTEN_SHARE: [number, number] = [7, 13]

/** Letter questions' explanations are one short line (「こ」は「こま」の「こ」だよ), so their
 * 問題文の欄 needs less height than a counting or English one. */
const SHORT_HEAD = 'quiz-layout--short-head'

/** A 問いの欄 whose content is limited by the width (2 counted pictures side by side, a row
 * of apples, the きまり strip): it is only as tall as that content (up to 6/10 of the room
 * below the 問題文の欄), and the 答えの欄 takes all the rest instead of a fixed share, so no
 * empty band is left above and below the content. */
const FIT_STIMULUS = 'quiz-layout--fit'

/** English questions explain both the answer and the picked word (「"owl"は ふくろう…。えらんだ
 * "sushi"は すし」), and はんたいことば can list two meanings — one line more than the rest. */
const LONG_EXPLANATION = 'quiz-layout--long-explanation'

/** The 問題文の欄 before answering: the category's character asks the question in a speech
 * bubble — the same mascot-and-bubble row the feedback replaces it with, so the slot is
 * filled both before and after answering. */
function QuizPrompt({ text, speech, theme }: { text: string; speech?: ReactNode; theme: CharacterTheme }) {
  return (
    <div className="quiz-prompt">
      <div className="quiz-feedback-row">
        <CharacterPortrait theme={theme} mood="happy" size={120} className="quiz-feedback-portrait" />
        <p className="quiz-prompt-bubble">{text}</p>
      </div>
      {speech}
    </div>
  )
}

/** Rough on-screen width of a label in ems (kana/kanji ≈ 1, Latin and digits ≈ 0.62), for
 * sizing the 答えの欄's text so the longest choice still fits its button on one line. */
function labelWidthEm(label: string): number {
  let width = 0
  for (const ch of label) width += /[　-鿿＀-￯]/.test(ch) ? 1 : 0.62
  return width
}

/** Apples above the equation, in one row when few (3 + 2 = ?) and in two rows when many
 * (row 1: the first group, row 2: + the second), each as large as the row allows. */
function ArithmeticStimulus({ question, lang }: { question: ArithmeticQuestion; lang: Lang }) {
  const symbol = question.operator === 'addition' ? '+' : '−'
  // ★4's round tens (20+30) set showVisual: false — that many apples would be absurd.
  const visual = question.showVisual !== false
  let rows: ReactNode[][] = []
  let units = 1
  if (visual && question.operator === 'addition') {
    const apples = (n: number, from: number) =>
      Array.from({ length: n }, (_, i) => <span key={from + i} className="apple">🍎</span>)
    const plus = <span key="plus" className="apple-plus">+</span>
    if (question.operandA + question.operandB + 1 <= 9) {
      rows = [[...apples(question.operandA, 0), plus, ...apples(question.operandB, 100)]]
      units = question.operandA + question.operandB + 1
    } else {
      rows = [apples(question.operandA, 0), [plus, ...apples(question.operandB, 100)]]
      units = Math.max(question.operandA, question.operandB + 1)
    }
  } else if (visual) {
    // Subtraction: all of operandA, the first operandB of them faded as taken away.
    const all = Array.from({ length: question.operandA }, (_, i) => (
      <span key={i} className={`apple ${i < question.operandB ? 'removed' : ''}`.trim()}>
        🍎
      </span>
    ))
    const perRow = question.operandA <= 8 ? question.operandA : Math.ceil(question.operandA / 2)
    rows = perRow === question.operandA ? [all] : [all.slice(0, perRow), all.slice(perRow)]
    units = perRow
  }
  const appleSize = `min(calc(var(--stimulus-max) * ${rows.length === 1 ? 0.45 : 0.3}), calc(92cqw / ${units}))`

  return (
    <div className="arithmetic-stimulus">
      {rows.length > 0 && (
        <div className="apple-rows" style={{ '--apple': appleSize } as CSSProperties}>
          {rows.map((row, i) => (
            <div key={i} className="apple-row">
              {row}
            </div>
          ))}
        </div>
      )}
      {question.story ? (
        <p className="story-text">{question.story[lang]}</p>
      ) : (
        <div className="equation-text">
          {question.operandA} {symbol} {question.operandB} = ?
        </div>
      )}
    </div>
  )
}

/** かぞえる: the counted things as big sticker cards (1 / 2 / 3 in a row, 4 as 2×2, 5 as 3+2),
 * each popping in with its own 1, 2, 3… tag so the counting itself is shown, and the number
 * as a big badge in the corner. */
const COUNTING_GRID: Record<number, [number, number]> = { 1: [1, 1], 2: [2, 1], 3: [3, 1], 4: [2, 2], 5: [3, 2] }

function CountingStimulus({ question }: { question: CountingQuestion }) {
  const [cols, rows] = COUNTING_GRID[question.count] ?? [3, 2]
  return (
    <div className="counting-stage" style={{ '--cols': cols, '--rows': rows } as CSSProperties}>
      <span className="counting-number">{question.count}</span>
      <div className="counting-cards">
        {Array.from({ length: question.count }, (_, i) => (
          <span key={i} className="counting-card" style={{ '--i': i } as CSSProperties}>
            <span className="counting-card-photo">
              <WordIcon wordId={question.exampleWordId} size="100%" />
            </span>
            <span className="counting-tag">{i + 1}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** The 問題文の欄 and 問いの欄 of a usesQuizLayout question. */
function quizLayoutParts(
  question: Question,
  {
    t,
    lang,
    voiceProfile,
    autoSpeech,
    selected,
    theme,
  }: {
    theme: CharacterTheme
    t: (key: DictionaryKey, vars?: Record<string, string | number>) => string
    lang: Lang
    voiceProfile: VoiceProfile
    autoSpeech: AutoSpeech
    selected: Choice | null
  },
): { prompt: ReactNode; stimulus: ReactNode | null; share?: [number, number]; className?: string } {
  const speechLang: SpeechLang = lang === 'ja' ? 'ja-JP' : 'en-US'
  const promptSpeaker = (
    <TtsButton
      text={autoSpeech.text}
      lang={autoSpeech.speechLang}
      label="listen"
      voiceProfile={voiceProfile}
      cacheKey={autoSpeech.cacheKey}
      parts={autoSpeech.parts}
    />
  )
  const bigSpeaker = (text: string, speakLang: SpeechLang, cacheKey: string) => (
    <TtsButton text={text} lang={speakLang} label="listen" size={BIG_SPEAKER_SIZE} voiceProfile={voiceProfile} cacheKey={cacheKey} />
  )

  if (isArithmetic(question)) {
    const { text } = equationSpeech(question, lang)
    return {
      prompt: (
        <QuizPrompt
          theme={theme}
          text={t(question.operator === 'addition' ? 'additionPrompt' : 'subtractionPrompt')}
          speech={<TtsButton text={text} lang={speechLang} label="listen" voiceProfile={voiceProfile} cacheKey={autoSpeech.cacheKey} />}
        />
      ),
      stimulus: <ArithmeticStimulus question={question} lang={lang} />,
      className: FIT_STIMULUS,
    }
  }
  if (isCounting(question)) {
    // The counted pictures are the question itself.
    return {
      prompt: <QuizPrompt theme={theme} text={autoSpeech.text} speech={promptSpeaker} />,
      stimulus: <CountingStimulus question={question} />,
      className: FIT_STIMULUS,
    }
  }
  if (isHiragana(question)) {
    return {
      prompt: <QuizPrompt theme={theme} text={t('hiraganaListenPrompt')} />,
      stimulus: bigSpeaker(hiraganaSpeechPhrase(getHiraganaById(question.charId)), 'ja-JP', `hiragana-${question.charId}`),
      share: LISTEN_SHARE,
      className: SHORT_HEAD,
    }
  }
  if (isKatakana(question)) {
    return {
      prompt: <QuizPrompt theme={theme} text={t('katakanaListenPrompt')} />,
      stimulus: bigSpeaker(katakanaSpeechPhrase(getKatakanaById(question.charId)), 'ja-JP', `katakana-${question.charId}`),
      share: LISTEN_SHARE,
      className: SHORT_HEAD,
    }
  }
  if (isKanji(question)) {
    return {
      prompt: <QuizPrompt theme={theme} text={t('kanjiListenPrompt')} />,
      stimulus: bigSpeaker(kanjiSpeechPhrase(getKanjiById(question.charId)), 'ja-JP', `kanji-${question.charId}`),
      share: LISTEN_SHARE,
    }
  }
  if (isAlphabet(question)) {
    const entry = getAlphabetById(question.letterId)
    const cacheKey = `alphabet-letter-${question.letterId}`
    if (question.kind === 'caseMatch') {
      return {
        prompt: (
          <QuizPrompt
            theme={theme}
            text={t('alphabetCaseMatchPrompt')}
            speech={<TtsButton text={alphabetSpeechPhrase(entry)} lang="en-US" label="listen" voiceProfile={voiceProfile} cacheKey={cacheKey} />}
          />
        ),
        stimulus: <HiraganaChar char={question.promptChar ?? ''} size="min(88cqh, 62cqw)" />,
        className: SHORT_HEAD,
      }
    }
    // See computeAutoSpeech's isAlphabet branch for why this speaks the mnemonic phrase.
    return {
      prompt: <QuizPrompt theme={theme} text={t('alphabetListenPrompt')} />,
      stimulus: bigSpeaker(alphabetSpeechPhrase(entry), 'en-US', cacheKey),
      share: LISTEN_SHARE,
      className: SHORT_HEAD,
    }
  }
  if (isEnglishSentence(question)) {
    // No picture on purpose: the only way to answer is to have understood the spoken
    // English (a matching picture tested noun recognition instead of listening).
    return {
      prompt: <QuizPrompt theme={theme} text={t('englishSentencePrompt')} />,
      stimulus: bigSpeaker(question.question, 'en-US', `sentence-${question.sentenceId}`),
      share: LISTEN_SHARE,
      className: LONG_EXPLANATION,
    }
  }
  if (isEnglishWord(question)) {
    if (question.mode === 'listenAndPick') {
      return {
        prompt: <QuizPrompt theme={theme} text={t('listenPrompt')} />,
        stimulus: bigSpeaker(question.word, 'en-US', `word-en-${question.wordId}`),
        share: LISTEN_SHARE,
        className: LONG_EXPLANATION,
      }
    }
    return {
      prompt: <QuizPrompt theme={theme} text={t('lookPrompt')} />,
      stimulus: <WordIcon wordId={question.wordId} size="min(94cqh, 78cqw)" />,
      className: LONG_EXPLANATION,
    }
  }
  if (isLogic(question)) {
    const prompt = <QuizPrompt theme={theme} text={t(logicPromptKey(question))} speech={promptSpeaker} />
    if (question.kind === 'pattern') {
      // The trailing slot fills with the picked symbol once answered, instead of a static "?".
      const slotState = selected === null ? '' : selected === question.answer ? 'correct' : 'incorrect'
      return {
        className: FIT_STIMULUS,
        prompt,
        stimulus: (
          <div className="pattern-visual-row">
            {question.sequence!.map((symbol, i) => (
              <span key={i} className="pattern-visual-item">
                {symbol}
              </span>
            ))}
            <span className={`pattern-visual-item pattern-slot ${slotState}`.trim()}>
              {selected !== null ? String(selected) : ''}
            </span>
          </div>
        ),
      }
    }
    if (question.kind === 'opposite') {
      return {
        // The explanation can list two meanings' pairs on their own lines (たかい ⇔ ひくい /
        // やすい), one line more than other questions need on a small phone.
        className: `${FIT_STIMULUS} ${LONG_EXPLANATION}`,
        prompt,
        stimulus: (
          <p className="opposite-prompt-word" style={{ '--len': labelWidthEm(question.promptWord!) } as CSSProperties}>
            {question.promptWord}
          </p>
        ),
      }
    }
    // compare: the numbers to compare ARE the choices, so the 答えの欄 takes the whole card.
    return { prompt, stimulus: null }
  }
  return { prompt: null, stimulus: null }
}

function logicPromptKey(question: LogicQuestion): DictionaryKey {
  if (question.kind === 'opposite') return 'logicOppositeQuestion'
  if (question.kind === 'pattern') return 'logicPatternPrompt'
  if (question.kind === 'oddOneOut') return 'logicOddOneOutPrompt'
  return question.compareGoal === 'max' ? 'logicCompareMaxPrompt' : 'logicCompareMinPrompt'
}

/** pickShape (★1/★6) needs the prompted shape's own name interpolated in — pickName/
 * countSides ask a fixed question about the shape already shown as the stimulus, so
 * those are plain dictionary lookups (see logicPromptKey above for the same pattern). */
function shapesPromptText(
  question: ShapeQuestion,
  t: (key: DictionaryKey, vars?: Record<string, string | number>) => string,
): string {
  if (question.kind === 'pickShape') {
    return t('shapePickPrompt', { shape: t(SHAPE_NAME_KEY[question.answer]) })
  }
  if (question.kind === 'countSides') return t('shapeCountSidesPrompt')
  return t('shapeNamePrompt')
}

function ClockQuestionView({
  question,
  promptText,
  lang,
  voiceProfile,
  cacheKey,
  answered,
}: {
  question: ClockQuestion
  promptText: string
  lang: Lang
  voiceProfile: VoiceProfile
  cacheKey?: string
  answered: boolean
}) {
  const speechLang: SpeechLang = lang === 'ja' ? 'ja-JP' : 'en-US'
  // The clock is the whole question, so it's sized from the screen (see .clock-read-face),
  // as large as fits — the old 72-160px face was hard to read.
  return (
    <div className="quiz-prompt-stack">
      <div className="clock-read-face">
        <ClockFace hour={question.hour} minute={question.minute} />
      </div>
      <p className="subtitle">{promptText}</p>
      {/* Nothing left to replay once answered — hiding it makes room for the feedback
          below without shrinking the clock. */}
      {!answered && (
        <TtsButton text={promptText} lang={speechLang} label="listen" voiceProfile={voiceProfile} cacheKey={cacheKey} />
      )}
    </div>
  )
}

/** ★2+'s "production" clock question: told a target time, drag the hands to set it —
 * InteractiveClock owns the drag mechanics (see that component), this just tracks the
 * latest value it reports and turns "できた！" into the same `"H:M"` choice string
 * multipleChoice clock questions already use, so isCorrectChoice's existing clock
 * branch checks it with no changes needed. Starts the hands away from the target so
 * "できた" can't be tapped for free. */
function ClockSetTimeView({
  question,
  promptText,
  doneLabel,
  lang,
  voiceProfile,
  cacheKey,
  parts,
  onSubmit,
  disabled,
}: {
  question: ClockQuestion
  promptText: string
  doneLabel: string
  lang: Lang
  voiceProfile: VoiceProfile
  cacheKey?: string
  parts?: SpeechPart[]
  onSubmit: (choice: string) => void
  disabled: boolean
}) {
  const speechLang: SpeechLang = lang === 'ja' ? 'ja-JP' : 'en-US'
  const startTotalMinutes = useMemo(() => {
    const targetTotal = (question.hour % 12) * 60 + question.minute
    // Any fixed offset away from the target works — this just has to not already be the
    // answer when the clock first renders.
    return (targetTotal + 180) % 720
  }, [question])
  // Seeded from the same starting position InteractiveClock renders at, so tapping
  // "できた" without ever touching the hands reports that starting time — not a stale
  // {0, 0} placeholder — and correctly comes up wrong.
  const startHour12 = Math.floor(startTotalMinutes / 60) % 12 || 12
  const current = useRef({ hour: startHour12, minute: startTotalMinutes % 60 })

  return (
    <div className="quiz-prompt-stack">
      <p className="subtitle">{promptText}</p>
      {/* Once answered, these two have nothing left to do (できた！ is disabled) — hiding
          them makes room for the feedback below without shrinking the big clock. */}
      {!disabled && (
        <TtsButton
          text={promptText}
          lang={speechLang}
          label="listen"
          voiceProfile={voiceProfile}
          cacheKey={cacheKey}
          parts={parts}
        />
      )}
      <InteractiveClock
        key={question.id}
        large
        minuteStep={question.minute % 5 === 0 ? 5 : 1}
        initialTotalMinutes={startTotalMinutes}
        hintText=""
        onChange={(hour12, minute) => {
          current.current = { hour: hour12, minute }
        }}
      />
      {!disabled && (
        <button
          type="button"
          className="primary-button"
          onClick={() => onSubmit(`${current.current.hour}:${current.current.minute}`)}
        >
          {doneLabel}
        </button>
      )}
    </div>
  )
}

/** pickShape (★1/★6): the prompt itself names the target shape, and the 4 choices are the
 * rendered shapes — no big stimulus icon here. pickName/countSides (★2-★5): one shape is
 * rendered as the stimulus and the prompt asks a fixed question about it. */
function ShapeQuestionView({
  question,
  promptText,
  lang,
  voiceProfile,
  cacheKey,
}: {
  question: ShapeQuestion
  promptText: string
  lang: Lang
  voiceProfile: VoiceProfile
  cacheKey?: string
}) {
  const speechLang: SpeechLang = lang === 'ja' ? 'ja-JP' : 'en-US'

  return (
    <div className="quiz-prompt-stack">
      {question.kind !== 'pickShape' && <ShapeIcon shape={question.shapeId as ShapeId} size={140} />}
      <p className="subtitle">{promptText}</p>
      <TtsButton text={promptText} lang={speechLang} label="listen" voiceProfile={voiceProfile} cacheKey={cacheKey} />
    </div>
  )
}

function renderChoiceContent(question: Question, choice: Choice, lang: Lang, iconSize: number | string) {
  if (isArithmetic(question)) return choice
  if (isLogic(question)) {
    if (question.kind === 'oddOneOut') return <WordIcon wordId={choice as string} size={iconSize} />
    if (question.kind === 'opposite') return choice
    return <span className="choice-emoji">{choice}</span>
  }
  if (isHiragana(question)) {
    return <HiraganaChar char={getHiraganaById(choice as string).char} size={iconSize} />
  }
  if (isKatakana(question)) {
    return <HiraganaChar char={getKatakanaById(choice as string).char} size={iconSize} />
  }
  if (isKanji(question)) {
    return <HiraganaChar char={getKanjiById(choice as string).char} size={iconSize} />
  }
  if (isAlphabet(question)) {
    // choiceIds are the literal character strings ('A', 'a', ...) here, not bank ids — the
    // upper/lower distinction lives in which string it is, so no lookup is needed.
    return <HiraganaChar char={choice as string} size={iconSize} />
  }
  if (isClock(question)) return <span className="clock-choice-text">{formatClockKey(choice as string, lang)}</span>
  // never rendered: spot-the-difference has no choice-grid (see SpotDifferenceBoard)
  if (isSpotDifference(question)) return null
  // never rendered: sudoku has no choice-grid either (see SudokuBoard)
  if (isSudoku(question)) return null
  if (isCounting(question)) return choice as string
  // never rendered: money has its own MoneyBoard, no choice-grid (see MoneyBoard.tsx)
  if (isMoney(question)) return null
  if (isShapes(question)) {
    // pickShape (★1/★6): the prompt names a shape, so the choices themselves ARE the
    // shapes (production direction). pickName (★2/★4/★5)/countSides (★3): the choices
    // are name/number LABELS about the one shape already shown as the stimulus
    // (recognition direction) — see ShapeQuestionView.
    if (question.kind === 'pickShape') return <ShapeIcon shape={choice as ShapeId} size={typeof iconSize === 'number' ? iconSize : 72} />
    if (question.kind === 'countSides') return <span style={{ fontSize: 40 }}>{choice}</span>
    return dictionary[SHAPE_NAME_KEY[choice as string]][lang]
  }
  if (isEnglishSentence(question)) return <WordIcon wordId={choice as string} size={iconSize} />
  return question.mode === 'listenAndPick' ? (
    <WordIcon wordId={choice as string} size={iconSize} />
  ) : (
    getWordById(choice as string).word
  )
}

/** Shown/spoken when the answer was wrong (see buildFeedbackMessage's `{answer}` segment).
 * An if-chain rather than a nested ternary — the ternary version accreted a new level with
 * every category this session added and became genuinely error-prone to extend correctly. */
function computeCorrectAnswerLabel(question: Question, lang: Lang): string {
  if (isArithmetic(question)) return String(question.blank ? question[question.blank] : question.answer)
  if (isLogic(question)) {
    if (question.kind === 'oddOneOut') {
      return lang === 'ja' ? getWordById(question.answer).translationJa : getWordById(question.answer).word
    }
    if (question.answers) return question.answers.join(lang === 'ja' ? '・' : ' / ')
    return question.answer
  }
  if (isHiragana(question)) return question.char
  if (isKatakana(question)) return question.char
  if (isKanji(question)) return question.char
  if (isAlphabet(question)) return question.answerChar
  if (isClock(question)) return formatClockKey(`${question.hour}:${question.minute}`, lang)
  if (isSpotDifference(question)) return ''
  if (isSudoku(question)) return ''
  if (isCounting(question)) {
    const counter = getCounterById(question.counterId)
    return `${question.answerReading}（${question.count}${counter.kanji}）`
  }
  if (isMoney(question)) return dictionary.moneyAmount[lang].replace('{amount}', String(question.targetAmount))
  if (isShapes(question)) {
    if (question.kind === 'countSides') return question.answer
    return dictionary[SHAPE_NAME_KEY[question.answer]][lang]
  }
  if (isEnglishSentence(question)) return getWordById(question.correctWordId).word
  return getWordById(question.wordId).word
}

export function QuizScreen({
  category,
  level,
  setSize,
  clockMode,
  sudokuMode,
  progress,
  onComplete,
  onExit,
  onHome,
}: QuizScreenProps) {
  const { t, lang } = useI18n()
  const [questions] = useState<Question[]>(() => {
    // A clock/sudoku reviewQueue can hold items from BOTH modes (saved across different
    // rounds) — filter to the mode chosen this round so a stray review item from the other
    // mode can't resurface mid-round, which would recreate the exact per-round mode mixing
    // these toggles were built to remove (see LevelSelectScreen's mode toggles). A mini
    // sudoku item resurfacing during classic play would be structurally wrong to even
    // render (16 cells vs 81), not just an unwanted mix.
    const reviewQueue =
      category === 'clock'
        ? progress.clock.reviewQueue.filter((q) => q.category === 'clock' && q.kind === clockMode)
        : category === 'sudoku'
          ? progress.sudoku.reviewQueue.filter((q) => q.category === 'sudoku' && q.mode === sudokuMode)
          : category === 'logic'
            ? // logic's levels are different puzzle types, not difficulty steps — a missed
              // なかまはずれ question must not turn up in a はんたいことば round.
              progress.logic.reviewQueue.filter((q) => q.category === 'logic' && q.level === level)
            : progress[category].reviewQueue
    return generateQuestionSet(category, level, reviewQueue, setSize, clockMode, sudokuMode, progress[category].recent)
  })
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [selected, setSelected] = useState<Choice | null>(null)
  const [streak, setStreak] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [explanationText, setExplanationText] = useState('')
  const [celebrationKey, setCelebrationKey] = useState(0)
  // WordIcon/HiraganaChar/ShapeIcon choice tiles were fixed at 72px regardless of viewport
  // height — the single biggest non-shrinking cost once a question's answered (4 tiles plus
  // the feedback banner/explanation/portrait/button all stacked below), causing a genuine
  // #root overflow (and so an iOS rubber-band bounce) on content-heavy categories at
  // ordinary phone heights, e.g. englishListening ★5. See the mobile-first-policy memory.
  const choiceIconSize = useResponsiveSize(72, 0.075, 44)

  // The per-answer feedback speech below is a chain of several `speak()` calls
  // (segment-by-segment, with real network/audio latency between them) that isn't tied to
  // this component's lifecycle. If the child taps through to the result screen before that
  // chain finishes, its still-pending `.then()` steps fire anyway — and since every
  // `speak()` call bumps a single shared cancellation token, a stale leftover segment from
  // the previous question can fire after ResultScreen mounts and silently cancel *its*
  // announcement. Guard each step so an unmounted screen's chain stops issuing new calls.
  const isMountedRef = useRef(true)
  // Synchronous per-question guards: `selected`/`index` state only updates on the next
  // render, so a fast double/triple tap (very common from small children) landing in the
  // same tick used to pass the `selected !== null` check every time — recording one answer
  // per tap ("1 / 9 もんせいかい" after a 5-question round) and skipping a question per
  // extra tap on "つぎへ".
  const answeredIndexRef = useRef(-1)
  const advancedFromIndexRef = useRef(-1)
  useEffect(() => {
    // Explicitly set true on setup, not just relying on useRef's initial value — React 18
    // StrictMode's dev-only mount→cleanup→remount double-invoke runs this effect's cleanup
    // (setting .current = false) and then re-runs the effect body without ever setting it
    // back to true, since the effect body used to be empty. That left isMountedRef.current
    // stuck false for the rest of local dev (breaking every answer's speech, verified via
    // instrumented testing — production is unaffected since React only invokes effects
    // once there), even though the component was genuinely still mounted.
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const question = questions[index]
  const voiceProfile = characterThemes[category].voiceProfile
  // Single source of truth for what gets spoken (and which cached file, if any, covers
  // it) — shared between the auto-speak effect below and each *QuestionView's manual
  // "listen again" button, so they never drift apart.
  const autoSpeech = computeAutoSpeech(question, lang, t)

  const choices = useMemo<Choice[]>(() => {
    if (isArithmetic(question)) {
      // missingOperand answers with whichever operand is hidden, not the equation's own
      // answer (see questionGenerators/missingOperand.ts's `blank` field).
      const target = question.blank ? question[question.blank] : question.answer
      // ★4's round-tens branch (see questionGenerators/{addition,subtraction}.ts) needs a
      // much wider range than ★1-3's single-digit-operand answers, and distractors that are
      // themselves round tens (50/70/80, not 58/61) — the same "which tens place" mistake a
      // child could plausibly make, rather than an arbitrary off-by-one/two.
      const isTens = question.operandA % 10 === 0 && question.operandB % 10 === 0 && question.operandA >= 10
      if (isTens) return generateNumericChoices(target, 10, 90, 10)
      const max = question.operator === 'subtraction' ? 15 : 19
      return generateNumericChoices(target, 0, max)
    }
    if (isLogic(question)) return question.choices
    if (isHiragana(question)) return question.choiceIds
    if (isKatakana(question)) return question.choiceIds
    if (isKanji(question)) return question.choiceIds
    if (isAlphabet(question)) return question.choiceIds
    if (isClock(question)) return question.choiceKeys
    // spot-the-difference answers by tapping the board itself, not a choice-grid button
    if (isSpotDifference(question)) return []
    // sudoku likewise answers by tapping the board (blank cell + palette), not a choice-grid
    if (isSudoku(question)) return []
    if (isCounting(question)) return question.choiceReadings
    // money answers by tapping coins into MoneyBoard's own tray, not a choice-grid
    if (isMoney(question)) return []
    if (isShapes(question)) return question.choices
    if (isEnglishSentence(question)) return question.choiceWordIds
    return question.choiceWordIds
  }, [question])

  // Auto-speaks every question as soon as it appears (including the very first one, since
  // this effect also runs on mount), so the child never has to remember to tap "listen" —
  // except when there's genuinely nothing to say (spot-the-difference's empty text, see
  // computeAutoSpeech above), in which case speak() is skipped rather than voicing silence.
  useEffect(() => {
    if (autoSpeech.parts) speakSequence(autoSpeech.parts, autoSpeech.speechLang, voiceProfile)
    else if (autoSpeech.text) speak(autoSpeech.text, autoSpeech.speechLang, voiceProfile, autoSpeech.cacheKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question])

  function isCorrectChoice(choice: Choice): boolean {
    if (isArithmetic(question)) return choice === (question.blank ? question[question.blank] : question.answer)
    if (isLogic(question)) return question.answers ? question.answers.includes(choice as string) : choice === question.answer
    if (isHiragana(question)) return choice === question.charId
    if (isKatakana(question)) return choice === question.charId
    if (isKanji(question)) return choice === question.charId
    if (isAlphabet(question)) return choice === question.answerChar
    if (isClock(question)) return choice === `${question.hour}:${question.minute}`
    // reached either once every difference is found (always correct) or once the
    // wrong-tap limit is hit (always incorrect)
    if (isSpotDifference(question)) return choice !== SPOT_DIFFERENCE_FAILED
    // reached either once every blank is filled correctly (SUDOKU_DONE) or once the
    // wrong-guess limit is hit (SUDOKU_FAILED)
    if (isSudoku(question)) return choice !== SUDOKU_FAILED
    if (isCounting(question)) return choice === question.answerReading
    // reached either once the tray total exactly matches targetAmount (MONEY_DONE) or once
    // the wrong-guess limit is hit (MONEY_FAILED)
    if (isMoney(question)) return choice !== MONEY_FAILED
    if (isShapes(question)) return choice === question.answer
    if (isEnglishSentence(question)) return choice === question.correctWordId
    return choice === question.wordId
  }

  function choiceState(choice: Choice): '' | 'correct' | 'incorrect' {
    if (selected === null) return ''
    if (isCorrectChoice(choice)) return 'correct'
    if (choice === selected) return 'incorrect'
    return ''
  }

  const correctAnswerLabel = computeCorrectAnswerLabel(question, lang)

  // The englishWords correct answer is always this question's own word, regardless of
  // which choice was picked — so its cache entry is knowable up front, unlike every other
  // category's `{answer}` segment (a number, hiragana char, etc.), which is effectively
  // unbounded and left live/uncached. englishSentence's answer is always one of the 16
  // color words, which already has a `word-en-*.wav` file from the original word-bank
  // pronunciation pass — no new audio needed for this one.
  const answerCacheKey = isEnglishWord(question)
    ? `word-en-${question.wordId}`
    : isEnglishSentence(question)
      ? `word-en-${question.correctWordId}`
      : undefined

  function handleSelect(choice: Choice) {
    if (selected !== null || answeredIndexRef.current === index) return
    answeredIndexRef.current = index
    const correct = isCorrectChoice(choice)
    setSelected(choice)
    if (correct) {
      playCorrectSfx(streak + 1)
      setCelebrationKey((k) => k + 1)
      // A tiny "ぷるっ" on phones that support it (Android; iOS ignores it).
      navigator.vibrate?.(35)
    } else {
      playIncorrectSfx()
    }
    setAnswers((prev) => [
      ...prev,
      {
        questionId: question.id,
        category: question.category as Category,
        subSkill: question.subSkill,
        correct,
        question,
      },
    ])

    const newStreak = correct ? streak + 1 : 0
    const justBrokeStreak = !correct && streak >= 3 ? streak : 0
    setStreak(newStreak)

    // Spot-the-difference's and sudoku's failure cases have no {answer} to slot into the
    // generic pools (neither is a number/word/char), so each gets its own dedicated
    // feedback text.
    const feedback =
      isSpotDifference(question) && choice === SPOT_DIFFERENCE_FAILED
        ? buildSpotDifferenceFailedFeedback(lang)
        : isSudoku(question) && choice === SUDOKU_FAILED
          ? buildSudokuFailedFeedback(lang)
          : isMoney(question) && choice === MONEY_FAILED
            ? buildMoneyFailedFeedback(lang)
            : buildFeedbackMessage(
                {
                  correct,
                  streak: newStreak,
                  justBrokeStreak,
                  correctAnswerLabel,
                  answerCacheKey,
                  answerSpeech: computeAnswerSpeech(question),
                  category,
                },
                lang,
              )
    setFeedbackText(feedback.text)
    // Shown as text only — the reasoning reads fine on the page but is skipped for
    // speech, since narrating every explanation would make each answer noticeably slower.
    setExplanationText(buildExplanation(question, lang, correct, choice))

    const speechLang: SpeechLang = lang === 'ja' ? 'ja-JP' : 'en-US'
    // Spoken as separate segments (see feedbackMessages.ts) so every part but the answer
    // itself — which is effectively unbounded — can be pre-cached, instead of one long
    // sentence that always falls back to the generic browser voice on a deployed site.
    feedback.speech
      .reduce(
        (chain, segment) =>
          chain.then(() => {
            if (!isMountedRef.current) return
            // Caught per segment, not just at the end of the chain — otherwise one
            // segment throwing (a network hiccup fetching a cached file, say) would
            // silently skip every segment after it, not just that one.
            return speak(segment.text, segment.speechLang ?? speechLang, voiceProfile, segment.cacheKey).catch(
              () => {},
            )
          }),
        Promise.resolve(),
      )
      .then(() => {
        if (!isMountedRef.current) return
        if (isHiragana(question)) {
          speak(
            hiraganaSpeechPhrase(getHiraganaById(question.charId)),
            'ja-JP',
            voiceProfile,
            `hiragana-${question.charId}`,
          )
        } else if (isKatakana(question)) {
          speak(
            katakanaSpeechPhrase(getKatakanaById(question.charId)),
            'ja-JP',
            voiceProfile,
            `katakana-${question.charId}`,
          )
        } else if (isKanji(question)) {
          speak(kanjiSpeechPhrase(getKanjiById(question.charId)), 'ja-JP', voiceProfile, `kanji-${question.charId}`)
        } else if (isAlphabet(question)) {
          // See computeAutoSpeech's isAlphabet branch for why this speaks the mnemonic phrase.
          const entry = getAlphabetById(question.letterId)
          speak(alphabetSpeechPhrase(entry), 'en-US', voiceProfile, `alphabet-letter-${question.letterId}`)
        } else if (isEnglishWord(question) && correct) {
          // An incorrect answer already speaks the word correctly in en-US as part of the
          // feedback sentence above (see buildFeedbackMessage) — repeating it here too
          // would say it twice in a row, once inside the sentence and once standalone.
          speak(question.word, 'en-US', voiceProfile, `word-en-${question.wordId}`)
        } else if (isEnglishSentence(question) && correct) {
          // Same reasoning as englishWord above — an incorrect answer already speaks the
          // color word via the feedback sentence's {answer} segment.
          const colorWord = getWordById(question.correctWordId).word
          speak(colorWord, 'en-US', voiceProfile, `word-en-${question.correctWordId}`)
        }
      })
  }

  function handleNext() {
    if (advancedFromIndexRef.current === index || answeredIndexRef.current !== index) return
    advancedFromIndexRef.current = index
    if (index + 1 < questions.length) {
      setIndex(index + 1)
      setSelected(null)
      setFeedbackText('')
      setExplanationText('')
    } else {
      onComplete(answers)
    }
  }

  const isOddOneOut = isLogic(question) && question.kind === 'oddOneOut'
  const feedbackBlock = selected !== null && (
    <div className="quiz-feedback">
      <div className="quiz-feedback-row">
        <CharacterPortrait
          theme={characterThemes[category]}
          mood={isCorrectChoice(selected) ? (streak >= 3 ? 'streak' : 'celebrate') : 'thinking'}
          size={120}
          className="quiz-feedback-portrait"
        />
        <div className={`feedback-banner ${isCorrectChoice(selected) ? 'correct' : 'incorrect'}`}>
          {feedbackText}
        </div>
      </div>
      {isKanji(question) && getKanjiById(question.charId).traceImageId ? (
        // Links the kanji to the real thing it means with a picture instead of
        // words — see explanations.ts's kanji case for why the old text-only
        // mnemonic sentence read as confusing to a child.
        <div className="explanation-media">
          <WordIcon wordId={getKanjiById(question.charId).traceImageId!} size={56} />
          <p className="explanation-text">{explanationText}</p>
        </div>
      ) : (
        <p className="explanation-text">{explanationText}</p>
      )}
    </div>
  )

  const layoutParts = usesQuizLayout(question)
    ? quizLayoutParts(question, { t, lang, voiceProfile, autoSpeech, selected, theme: characterThemes[category] })
    : null
  // The longest text choice still fits its stretched button on one line.
  const choiceFont = `min(26cqh, calc(40cqw / ${Math.max(
    1.4,
    ...choices.map((c) => {
      const content = renderChoiceContent(question, c, lang, 0)
      return typeof content === 'string' || typeof content === 'number' ? labelWidthEm(String(content)) + 0.4 : 1.4
    }),
  ).toFixed(2)}))`
  const renderChoiceButtons = (iconSize: number | string) =>
    choices.map((choice) => (
      <button
        key={String(choice)}
        type="button"
        className={`choice-button ${choiceState(choice)}`.trim()}
        disabled={selected !== null}
        onClick={() => handleSelect(choice)}
      >
        {renderChoiceContent(question, choice, lang, iconSize)}
      </button>
    ))

  return (
    <div className="screen">
      {celebrationKey > 0 && <CorrectCelebration key={celebrationKey} streak={streak} />}
      {index > 0 && <PeekingMascot key={index} theme={characterThemes[category]} />}
      <ScreenTopBar onBack={onExit} onHome={onHome}>
        <CategoryHeader category={category} />
      </ScreenTopBar>
      <QuizProgressStars total={questions.length} index={index} answers={answers} label={t('quizProgress', { current: index + 1, total: questions.length })} />

      <div
        className={`card-panel quiz-card ${
          isSpotDifference(question) ||
          isSudoku(question) ||
          isMoney(question) ||
          (isLogic(question) && (question.kind === 'pattern' || question.kind === 'oddOneOut'))
            ? 'card-panel-wide'
            : ''
        }`.trim()}
      >
        {layoutParts ? (
          <div
            className={`quiz-layout ${layoutParts.className ?? ''}`.trim()}
            style={
              layoutParts.share
                ? ({ '--stimulus-share': layoutParts.share[0], '--answers-share': layoutParts.share[1] } as CSSProperties)
                : undefined
            }
          >
            <div className="quiz-head">{feedbackBlock || layoutParts.prompt}</div>
            {layoutParts.stimulus && <div className="quiz-stimulus">{layoutParts.stimulus}</div>}
            <div className="quiz-answers">
              <div className="choice-grid choice-grid--fill" style={{ '--choice-font': choiceFont } as CSSProperties}>
                {renderChoiceButtons(LAYOUT_ICON_SIZE)}
              </div>
            </div>
          </div>
        ) : isArithmetic(question) ? (
          <ArithmeticQuestionView
            question={question}
            lang={lang}
            voiceProfile={voiceProfile}
            cacheKey={autoSpeech.cacheKey}
            missingOperandPrompt={t('missingOperandPrompt')}
          />
        ) : isLogic(question) && question.kind === 'oddOneOut' ? (
          // The pictures keep their place and size when the answer comes in: the prompt's
          // slot (reserved at a fixed height) turns into the feedback instead.
          <div className="oddoneout-layout">
            <div className="quiz-head">
              {feedbackBlock || (
                <QuizPrompt
                  theme={characterThemes[category]}
                  text={t(logicPromptKey(question))}
                  speech={
                    <TtsButton
                      text={autoSpeech.text}
                      lang={autoSpeech.speechLang}
                      label="listen"
                      voiceProfile={voiceProfile}
                      cacheKey={autoSpeech.cacheKey}
                    />
                  }
                />
              )}
            </div>
            <div className="oddoneout-board">
              <OddOneOutScene
                key={question.id}
                question={question}
                selected={selected}
                onSelect={(choice) => handleSelect(choice)}
                voiceProfile={voiceProfile}
              />
            </div>
          </div>
        ) : isClock(question) && question.kind === 'setTime' ? (
          <ClockSetTimeView
            key={question.id}
            question={question}
            promptText={autoSpeech.text}
            doneLabel={t('handwritingDoneButton')}
            lang={lang}
            voiceProfile={voiceProfile}
            cacheKey={autoSpeech.cacheKey}
            parts={autoSpeech.parts}
            onSubmit={(choice) => handleSelect(choice)}
            disabled={selected !== null}
          />
        ) : isClock(question) ? (
          <ClockQuestionView
            question={question}
            promptText={t('clockPrompt')}
            lang={lang}
            voiceProfile={voiceProfile}
            cacheKey={autoSpeech.cacheKey}
            answered={selected !== null}
          />
        ) : isSpotDifference(question) ? (
          <SpotDifferenceBoard
            key={question.id}
            question={question}
            onAllFound={() => handleSelect(SPOT_DIFFERENCE_DONE)}
            onFailed={() => handleSelect(SPOT_DIFFERENCE_FAILED)}
            disabled={selected !== null}
          />
        ) : isMoney(question) ? (
          <MoneyBoard
            key={question.id}
            question={question}
            promptText={autoSpeech.text}
            onComplete={() => handleSelect(MONEY_DONE)}
            onFailed={() => handleSelect(MONEY_FAILED)}
            disabled={selected !== null}
          />
        ) : isShapes(question) ? (
          <ShapeQuestionView
            question={question}
            promptText={autoSpeech.text}
            lang={lang}
            voiceProfile={voiceProfile}
            cacheKey={autoSpeech.cacheKey}
          />
        ) : (
          isSudoku(question) && (
            <SudokuBoard
              key={question.id}
              question={question}
              promptText={t(question.mode === 'classic' ? 'sudokuPromptClassic' : 'sudokuPrompt')}
              onComplete={() => handleSelect(SUDOKU_DONE)}
              onFailed={() => handleSelect(SUDOKU_FAILED)}
              disabled={selected !== null}
            />
          )
        )}

        {!isOddOneOut && !layoutParts && feedbackBlock}

        {!layoutParts && (
          <div className="quiz-answer-area">
            {isArithmetic(question) && usesNumberPad(question) ? (
              <NumberPad key={question.id} onSubmit={(n) => handleSelect(n)} disabled={selected !== null} />
            ) : (
              !isOddOneOut &&
              !isSpotDifference(question) &&
              !isSudoku(question) &&
              !isMoney(question) &&
              !(isClock(question) && question.kind === 'setTime') && (
                <div className="choice-grid">{renderChoiceButtons(choiceIconSize)}</div>
              )
            )}
          </div>
        )}
      </div>

      {/* Always laid out, hidden until answered: its space is reserved from the start so
          answering never shrinks or shifts the screen, and nothing ever sits under it. */}
      <div className="screen-actions">
        <button
          type="button"
          className={`primary-button next-button ${selected === null ? 'is-reserved' : ''}`.trim()}
          onClick={handleNext}
          disabled={selected === null}
          aria-hidden={selected === null}
        >
          {t('nextButton')}
        </button>
      </div>
    </div>
  )
}
