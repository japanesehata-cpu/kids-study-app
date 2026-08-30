import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  AnswerRecord,
  ArithmeticQuestion,
  Category,
  ClockQuestion,
  CountingQuestion,
  EnglishWordQuestion,
  HiraganaQuestion,
  KatakanaQuestion,
  AlphabetQuestion,
  Level,
  LogicQuestion,
  ProgressState,
  Question,
  SpotDifferenceQuestion,
} from '../domain/types'
import { generateQuestionSet } from '../domain/progress'
import { generateNumericChoices } from '../lib/choices'
import { getWordById } from '../domain/wordBank'
import { getHiraganaById, hiraganaSpeechPhrase } from '../domain/hiraganaBank'
import { getKatakanaById, katakanaSpeechPhrase } from '../domain/katakanaBank'
import { getAlphabetById } from '../domain/alphabetBank'
import { formatClockKey, buildSetTimePrompt } from '../domain/questionGenerators/clock'
import { InteractiveClock } from '../components/InteractiveClock'
import { buildFeedbackMessage } from '../domain/feedbackMessages'
import { buildExplanation } from '../domain/explanations'
import { speak, type SpeechLang, type VoiceProfile } from '../lib/tts'
import { playCorrectSfx, playIncorrectSfx } from '../lib/sfx'
import { useI18n } from '../i18n/I18nContext'
import type { Lang, DictionaryKey } from '../i18n/dictionary'
import { TtsButton } from '../components/TtsButton'
import { WordIcon } from '../components/WordIcon'
import { HiraganaChar } from '../components/HiraganaChar'
import { ClockFace } from '../components/ClockFace'
import { SpotDifferenceBoard } from '../components/SpotDifferenceBoard'
import { CharacterPortrait } from '../components/characters/CharacterPortrait'
import { characterThemes } from '../components/characters/characterThemes'
import { RewardRain } from '../components/RewardRain'
import { CategoryHeader } from '../components/CategoryHeader'

interface QuizScreenProps {
  category: Category
  level: Level
  setSize: number
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

function isArithmetic(q: Question): q is ArithmeticQuestion {
  return q.category === 'addition' || q.category === 'subtraction'
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

function isClock(q: Question): q is ClockQuestion {
  return q.category === 'clock'
}

function isSpotDifference(q: Question): q is SpotDifferenceQuestion {
  return q.category === 'spotDifference'
}

function isCounting(q: Question): q is CountingQuestion {
  return q.category === 'counting'
}

function isEnglishWord(q: Question): q is EnglishWordQuestion {
  return q.category === 'englishSpelling' || q.category === 'englishListening'
}

function isAlphabet(q: Question): q is AlphabetQuestion {
  return q.category === 'alphabet'
}

function equationSpeech(
  q: ArithmeticQuestion,
  lang: Lang,
): { text: string; speechLang: SpeechLang } {
  const speechLang: SpeechLang = lang === 'ja' ? 'ja-JP' : 'en-US'
  if (q.story) return { text: q.story[lang], speechLang }
  if (lang === 'ja') {
    const op = q.category === 'addition' ? 'たす' : 'ひく'
    return { text: `${q.operandA} ${op} ${q.operandB} は？`, speechLang }
  }
  const op = q.category === 'addition' ? 'plus' : 'minus'
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
): { text: string; speechLang: SpeechLang; cacheKey?: string } {
  const speechLang: SpeechLang = lang === 'ja' ? 'ja-JP' : 'en-US'
  const ja = lang === 'ja'

  if (isArithmetic(question)) {
    const { text, speechLang: sl } = equationSpeech(question, lang)
    const keyPrefix = question.story ? 'story' : 'equation'
    const cacheKey = ja ? `${keyPrefix}-${question.category}-${question.operandA}-${question.operandB}` : undefined
    return { text, speechLang: sl, cacheKey }
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
  if (isClock(question)) {
    if (question.kind === 'setTime') {
      return { text: buildSetTimePrompt(question.hour, question.minute, lang), speechLang }
    }
    return { text: t('clockPrompt'), speechLang, cacheKey: ja ? 'prompt-clock' : undefined }
  }
  if (isSpotDifference(question)) {
    return { text: t('spotDifferencePrompt'), speechLang, cacheKey: ja ? 'prompt-spotdifference' : undefined }
  }
  if (isCounting(question)) {
    return { text: t('countingPrompt'), speechLang, cacheKey: ja ? 'prompt-counting' : undefined }
  }
  if (isAlphabet(question)) {
    // A letter's *name* doesn't change with case, and a bare lower-case answerChar is
    // sometimes a real English word in its own right ("a", "i") rather than just the
    // letter's name — TTS would read it as that word instead. Always speak the upper-case
    // form regardless of question kind or which case is being tested.
    const entry = getAlphabetById(question.letterId)
    return { text: entry.upper, speechLang: 'en-US', cacheKey: `alphabet-letter-${question.letterId}` }
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
}: {
  question: ArithmeticQuestion
  lang: Lang
  voiceProfile: VoiceProfile
  cacheKey?: string
}) {
  const { text, speechLang } = equationSpeech(question, lang)
  const symbol = question.category === 'addition' ? '+' : '−'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* Every addition question shows the apple visual, independent of showVisual — that
          field can be stale for a question replayed from a review queue saved to
          localStorage before addition always showed it (or restored from an older app
          version), so category alone decides here rather than trusting persisted data. */}
      {question.category === 'addition' && (
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
      {/* Same reasoning as the addition block above: category alone decides, not the
          persisted showVisual field. */}
      {question.category === 'subtraction' && (
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
      {question.story ? (
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

function EnglishQuestionView({
  question,
  listenPrompt,
  lookPrompt,
  voiceProfile,
}: {
  question: EnglishWordQuestion
  listenPrompt: string
  lookPrompt: string
  voiceProfile: VoiceProfile
}) {
  if (question.mode === 'listenAndPick') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <p className="subtitle">{listenPrompt}</p>
        <TtsButton
          text={question.word}
          lang="en-US"
          label="listen"
          size={96}
          voiceProfile={voiceProfile}
          cacheKey={`word-en-${question.wordId}`}
        />
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <p className="subtitle">{lookPrompt}</p>
      <WordIcon wordId={question.wordId} size={140} />
    </div>
  )
}

function HiraganaQuestionView({
  question,
  listenPrompt,
  voiceProfile,
}: {
  question: HiraganaQuestion
  listenPrompt: string
  voiceProfile: VoiceProfile
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <p className="subtitle">{listenPrompt}</p>
      <TtsButton
        text={hiraganaSpeechPhrase(getHiraganaById(question.charId))}
        lang="ja-JP"
        label="listen"
        size={96}
        voiceProfile={voiceProfile}
        cacheKey={`hiragana-${question.charId}`}
      />
    </div>
  )
}

function KatakanaQuestionView({
  question,
  listenPrompt,
  voiceProfile,
}: {
  question: KatakanaQuestion
  listenPrompt: string
  voiceProfile: VoiceProfile
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <p className="subtitle">{listenPrompt}</p>
      <TtsButton
        text={katakanaSpeechPhrase(getKatakanaById(question.charId))}
        lang="ja-JP"
        label="listen"
        size={96}
        voiceProfile={voiceProfile}
        cacheKey={`katakana-${question.charId}`}
      />
    </div>
  )
}

function AlphabetQuestionView({
  question,
  listenPrompt,
  caseMatchPrompt,
  voiceProfile,
}: {
  question: AlphabetQuestion
  listenPrompt: string
  caseMatchPrompt: string
  voiceProfile: VoiceProfile
}) {
  if (question.kind === 'caseMatch') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <p className="subtitle">{caseMatchPrompt}</p>
        <HiraganaChar char={question.promptChar ?? ''} size={120} />
      </div>
    )
  }

  // Always speak the upper-case form — see computeAutoSpeech's isAlphabet branch for why.
  const entry = getAlphabetById(question.letterId)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <p className="subtitle">{listenPrompt}</p>
      <TtsButton
        text={entry.upper}
        lang="en-US"
        label="listen"
        size={96}
        voiceProfile={voiceProfile}
        cacheKey={`alphabet-letter-${question.letterId}`}
      />
    </div>
  )
}

function logicPromptKey(question: LogicQuestion): DictionaryKey {
  if (question.kind === 'pattern') return 'logicPatternPrompt'
  if (question.kind === 'oddOneOut') return 'logicOddOneOutPrompt'
  return question.compareGoal === 'max' ? 'logicCompareMaxPrompt' : 'logicCompareMinPrompt'
}

function LogicQuestionView({
  question,
  promptText,
  lang,
  voiceProfile,
  cacheKey,
}: {
  question: LogicQuestion
  promptText: string
  lang: Lang
  voiceProfile: VoiceProfile
  cacheKey?: string
}) {
  const speechLang: SpeechLang = lang === 'ja' ? 'ja-JP' : 'en-US'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {question.kind === 'pattern' && (
        <div className="pattern-visual-row">
          {question.sequence!.map((s, i) => (
            <span key={i} className="pattern-visual-item">
              {s}
            </span>
          ))}
          <span className="pattern-visual-item">❓</span>
        </div>
      )}
      <p className="subtitle">{promptText}</p>
      <TtsButton text={promptText} lang={speechLang} label="listen" voiceProfile={voiceProfile} cacheKey={cacheKey} />
    </div>
  )
}

function ClockQuestionView({
  question,
  promptText,
  lang,
  voiceProfile,
  cacheKey,
}: {
  question: ClockQuestion
  promptText: string
  lang: Lang
  voiceProfile: VoiceProfile
  cacheKey?: string
}) {
  const speechLang: SpeechLang = lang === 'ja' ? 'ja-JP' : 'en-US'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <ClockFace hour={question.hour} minute={question.minute} size={160} />
      <p className="subtitle">{promptText}</p>
      <TtsButton text={promptText} lang={speechLang} label="listen" voiceProfile={voiceProfile} cacheKey={cacheKey} />
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
  onSubmit,
  disabled,
}: {
  question: ClockQuestion
  promptText: string
  doneLabel: string
  lang: Lang
  voiceProfile: VoiceProfile
  cacheKey?: string
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <p className="subtitle">{promptText}</p>
      <TtsButton text={promptText} lang={speechLang} label="listen" voiceProfile={voiceProfile} cacheKey={cacheKey} />
      <InteractiveClock
        key={question.id}
        size={200}
        initialTotalMinutes={startTotalMinutes}
        hintText=""
        onChange={(hour12, minute) => {
          current.current = { hour: hour12, minute }
        }}
      />
      <button
        type="button"
        className="primary-button"
        disabled={disabled}
        onClick={() => onSubmit(`${current.current.hour}:${current.current.minute}`)}
      >
        {doneLabel}
      </button>
    </div>
  )
}

function CountingQuestionView({
  question,
  promptText,
  targetHintText,
  lang,
  voiceProfile,
  cacheKey,
}: {
  question: CountingQuestion
  promptText: string
  targetHintText: string
  lang: Lang
  voiceProfile: VoiceProfile
  cacheKey?: string
}) {
  const speechLang: SpeechLang = lang === 'ja' ? 'ja-JP' : 'en-US'
  const hasDistractors = question.displayIds.some((id) => id !== question.targetWordId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {hasDistractors && (
        // Boxed off with its own border/background so it reads as a separate "example"
        // callout, not a 9th item sitting just above the grid — a plain stacked icon here
        // (same card style, near-identical size to the grid's own icons) was easy to
        // mistake for one more thing to count, off-by-one-ing the answer.
        <div className="counting-hint">
          <span className="counting-hint-label">{targetHintText}</span>
          <WordIcon wordId={question.targetWordId} size={48} />
        </div>
      )}
      <div className="visual-row">
        {question.displayIds.map((id, i) => (
          <WordIcon key={i} wordId={id} size={40} />
        ))}
      </div>
      <p className="subtitle">{promptText}</p>
      <TtsButton text={promptText} lang={speechLang} label="listen" voiceProfile={voiceProfile} cacheKey={cacheKey} />
    </div>
  )
}

function renderChoiceContent(question: Question, choice: Choice, lang: Lang) {
  if (isArithmetic(question)) return choice
  if (isLogic(question)) {
    if (question.kind === 'oddOneOut') return <WordIcon wordId={choice as string} size={72} />
    return <span style={{ fontSize: 40 }}>{choice}</span>
  }
  if (isHiragana(question)) {
    return <HiraganaChar char={getHiraganaById(choice as string).char} size={72} />
  }
  if (isKatakana(question)) {
    return <HiraganaChar char={getKatakanaById(choice as string).char} size={72} />
  }
  if (isAlphabet(question)) {
    // choiceIds are the literal character strings ('A', 'a', ...) here, not bank ids — the
    // upper/lower distinction lives in which string it is, so no lookup is needed.
    return <HiraganaChar char={choice as string} size={72} />
  }
  if (isClock(question)) return formatClockKey(choice as string, lang)
  // never rendered: spot-the-difference has no choice-grid (see SpotDifferenceBoard)
  if (isSpotDifference(question)) return null
  if (isCounting(question)) return choice
  return question.mode === 'listenAndPick' ? (
    <WordIcon wordId={choice as string} size={72} />
  ) : (
    getWordById(choice as string).word
  )
}

/** Shown/spoken when the answer was wrong (see buildFeedbackMessage's `{answer}` segment).
 * An if-chain rather than a nested ternary — the ternary version accreted a new level with
 * every category this session added and became genuinely error-prone to extend correctly. */
function computeCorrectAnswerLabel(question: Question, lang: Lang): string {
  if (isArithmetic(question)) return String(question.answer)
  if (isLogic(question)) {
    if (question.kind === 'oddOneOut') {
      return lang === 'ja' ? getWordById(question.answer).translationJa : getWordById(question.answer).word
    }
    return question.answer
  }
  if (isHiragana(question)) return question.char
  if (isKatakana(question)) return question.char
  if (isAlphabet(question)) return question.answerChar
  if (isClock(question)) return formatClockKey(`${question.hour}:${question.minute}`, lang)
  if (isSpotDifference(question)) return ''
  if (isCounting(question)) return String(question.count)
  return getWordById(question.wordId).word
}

export function QuizScreen({ category, level, setSize, progress, onComplete, onExit, onHome }: QuizScreenProps) {
  const { t, lang } = useI18n()
  const [questions] = useState<Question[]>(() =>
    generateQuestionSet(category, level, progress[category].reviewQueue, setSize),
  )
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [selected, setSelected] = useState<Choice | null>(null)
  const [streak, setStreak] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [explanationText, setExplanationText] = useState('')
  const [celebrationKey, setCelebrationKey] = useState(0)

  // The per-answer feedback speech below is a chain of several `speak()` calls
  // (segment-by-segment, with real network/audio latency between them) that isn't tied to
  // this component's lifecycle. If the child taps through to the result screen before that
  // chain finishes, its still-pending `.then()` steps fire anyway — and since every
  // `speak()` call bumps a single shared cancellation token, a stale leftover segment from
  // the previous question can fire after ResultScreen mounts and silently cancel *its*
  // announcement. Guard each step so an unmounted screen's chain stops issuing new calls.
  const isMountedRef = useRef(true)
  useEffect(() => {
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
      const max = question.category === 'subtraction' ? 15 : 19
      return generateNumericChoices(question.answer, 0, max)
    }
    if (isLogic(question)) return question.choices
    if (isHiragana(question)) return question.choiceIds
    if (isKatakana(question)) return question.choiceIds
    if (isAlphabet(question)) return question.choiceIds
    if (isClock(question)) return question.choiceKeys
    // spot-the-difference answers by tapping the board itself, not a choice-grid button
    if (isSpotDifference(question)) return []
    if (isCounting(question)) return question.choices
    return question.choiceWordIds
  }, [question])

  // Auto-speaks every question as soon as it appears (including the very first one, since
  // this effect also runs on mount), so the child never has to remember to tap "listen".
  useEffect(() => {
    speak(autoSpeech.text, autoSpeech.speechLang, voiceProfile, autoSpeech.cacheKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question])

  function isCorrectChoice(choice: Choice): boolean {
    if (isArithmetic(question)) return choice === question.answer
    if (isLogic(question)) return choice === question.answer
    if (isHiragana(question)) return choice === question.charId
    if (isKatakana(question)) return choice === question.charId
    if (isAlphabet(question)) return choice === question.answerChar
    if (isClock(question)) return choice === `${question.hour}:${question.minute}`
    // reached only once every difference on the board has been found — always correct
    if (isSpotDifference(question)) return true
    if (isCounting(question)) return choice === question.count
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
  // unbounded and left live/uncached.
  const answerCacheKey = isEnglishWord(question) ? `word-en-${question.wordId}` : undefined

  function handleSelect(choice: Choice) {
    if (selected !== null) return
    const correct = isCorrectChoice(choice)
    setSelected(choice)
    if (correct) {
      playCorrectSfx()
      setCelebrationKey((k) => k + 1)
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

    const feedback = buildFeedbackMessage(
      { correct, streak: newStreak, justBrokeStreak, correctAnswerLabel, answerCacheKey, category },
      lang,
    )
    setFeedbackText(feedback.text)
    // Shown as text only — the reasoning reads fine on the page but is skipped for
    // speech, since narrating every explanation would make each answer noticeably slower.
    setExplanationText(buildExplanation(question, lang))

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
        } else if (isAlphabet(question)) {
          // Always speak the upper-case form — see computeAutoSpeech's isAlphabet branch.
          const entry = getAlphabetById(question.letterId)
          speak(entry.upper, 'en-US', voiceProfile, `alphabet-letter-${question.letterId}`)
        } else if (isEnglishWord(question) && correct) {
          // An incorrect answer already speaks the word correctly in en-US as part of the
          // feedback sentence above (see buildFeedbackMessage) — repeating it here too
          // would say it twice in a row, once inside the sentence and once standalone.
          speak(question.word, 'en-US', voiceProfile, `word-en-${question.wordId}`)
        }
      })
  }

  function handleNext() {
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1)
      setSelected(null)
      setFeedbackText('')
      setExplanationText('')
    } else {
      onComplete(answers)
    }
  }

  return (
    <div className="screen">
      {celebrationKey > 0 && <RewardRain key={celebrationKey} />}
      <div className="top-bar">
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="secondary-button" onClick={onExit}>
            {t('backButton')}
          </button>
          <button type="button" className="secondary-button" onClick={onHome}>
            {t('backHomeButton')}
          </button>
        </div>
        <CategoryHeader category={category} />
        <span className="subtitle">
          {t('quizProgress', { current: index + 1, total: questions.length })}
        </span>
      </div>

      <div
        className={`card-panel ${
          isSpotDifference(question) || (isLogic(question) && question.kind === 'pattern') ? 'card-panel-wide' : ''
        }`.trim()}
      >
        {isArithmetic(question) ? (
          <ArithmeticQuestionView
            question={question}
            lang={lang}
            voiceProfile={voiceProfile}
            cacheKey={autoSpeech.cacheKey}
          />
        ) : isLogic(question) ? (
          <LogicQuestionView
            question={question}
            promptText={t(logicPromptKey(question))}
            lang={lang}
            voiceProfile={voiceProfile}
            cacheKey={autoSpeech.cacheKey}
          />
        ) : isHiragana(question) ? (
          <HiraganaQuestionView
            question={question}
            listenPrompt={t('hiraganaListenPrompt')}
            voiceProfile={voiceProfile}
          />
        ) : isKatakana(question) ? (
          <KatakanaQuestionView
            question={question}
            listenPrompt={t('katakanaListenPrompt')}
            voiceProfile={voiceProfile}
          />
        ) : isAlphabet(question) ? (
          <AlphabetQuestionView
            question={question}
            listenPrompt={t('alphabetListenPrompt')}
            caseMatchPrompt={t('alphabetCaseMatchPrompt')}
            voiceProfile={voiceProfile}
          />
        ) : isClock(question) && question.kind === 'setTime' ? (
          <ClockSetTimeView
            key={question.id}
            question={question}
            promptText={autoSpeech.text}
            doneLabel={t('handwritingDoneButton')}
            lang={lang}
            voiceProfile={voiceProfile}
            cacheKey={autoSpeech.cacheKey}
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
          />
        ) : isSpotDifference(question) ? (
          <SpotDifferenceBoard
            key={question.id}
            question={question}
            promptText={t('spotDifferencePrompt')}
            speechLang={lang === 'ja' ? 'ja-JP' : 'en-US'}
            voiceProfile={voiceProfile}
            cacheKey={autoSpeech.cacheKey}
            onAllFound={() => handleSelect(SPOT_DIFFERENCE_DONE)}
            disabled={selected !== null}
          />
        ) : isCounting(question) ? (
          <CountingQuestionView
            question={question}
            promptText={t('countingPrompt')}
            targetHintText={t('countingTargetHint')}
            lang={lang}
            voiceProfile={voiceProfile}
            cacheKey={autoSpeech.cacheKey}
          />
        ) : (
          <EnglishQuestionView
            question={question}
            listenPrompt={t('listenPrompt')}
            lookPrompt={t('lookPrompt')}
            voiceProfile={voiceProfile}
          />
        )}

        {!isSpotDifference(question) && !(isClock(question) && question.kind === 'setTime') && (
          <div className="choice-grid">
            {choices.map((choice) => (
              <button
                key={String(choice)}
                type="button"
                className={`choice-button ${choiceState(choice)}`.trim()}
                disabled={selected !== null}
                onClick={() => handleSelect(choice)}
              >
                {renderChoiceContent(question, choice, lang)}
              </button>
            ))}
          </div>
        )}

        {selected !== null && (
          <>
            <div className={`feedback-banner ${isCorrectChoice(selected) ? 'correct' : 'incorrect'}`}>
              {feedbackText}
            </div>
            <p className="explanation-text">{explanationText}</p>
            <CharacterPortrait
              theme={characterThemes[category]}
              mood={isCorrectChoice(selected) ? (streak >= 3 ? 'streak' : 'celebrate') : 'thinking'}
              size={120}
            />
            <button type="button" className="primary-button" onClick={handleNext}>
              {t('nextButton')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
