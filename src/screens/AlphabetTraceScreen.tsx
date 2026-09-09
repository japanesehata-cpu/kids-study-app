import { useRef, useState } from 'react'
import { alphabetBank, alphabetSpeechPhrase, type AlphabetEntry } from '../domain/alphabetBank'
import { alphabetStrokePaths } from '../domain/alphabetStrokes'
import { pickHandwritingPraise } from '../domain/handwritingPraise'
import { useI18n } from '../i18n/I18nContext'
import { CategoryHeader } from '../components/CategoryHeader'
import { KanjiTraceCanvas } from '../components/KanjiTraceCanvas'
import { HiraganaChar } from '../components/HiraganaChar'
import { TtsButton } from '../components/TtsButton'
import { characterThemes } from '../components/characters/characterThemes'
import { playCorrectSfx } from '../lib/sfx'
import { shuffle } from '../lib/shuffle'

interface AlphabetTraceScreenProps {
  onBack: () => void
  onHome: () => void
}

interface TraceEntry {
  id: string
  char: string
  /** The base alphabetBank id ("a".."z") this glyph belongs to — a letter's name/mnemonic
   * doesn't change with case, so both this glyph's upper and lower entries share it. */
  letterId: string
}

/** Both cases are traced as separate glyphs (52 total), the same way HandwritingScreen's
 * level-2 ALPHABET_HANDWRITING_BANK does — see that file's own comment for why `case` isn't
 * derived from the char itself. The review pass below is case-independent (26 cards, one
 * per letter), since a letter's reading/meaning doesn't change with case. */
const TRACE_DECK: TraceEntry[] = alphabetBank.flatMap((a) => [
  { id: `${a.id}-upper`, char: a.upper, letterId: a.id },
  { id: `${a.id}-lower`, char: a.lower, letterId: a.id },
])

type Phase = 'tracing' | 'praise' | 'review'

/** アルファベット なぞる (stroke-order trace) practice — mirrors KanaTraceScreen's
 * trace→praise→review flow, but with two independent decks instead of one reused deck:
 * `traceOrder` covers all 52 upper+lower glyphs, while `reviewOrder` covers only the 26
 * base letters (case doesn't change a letter's name or meaning, so review needs just one
 * card per letter). Reached from HandwritingScreen when level 1 ("なぞる") is picked for
 * alphabet — level 2 ("きいてかく") and every other category's level 1 are untouched.
 *
 * Unlike かんじ/かな, the stroke guide data isn't fetched from KanjiVG (it has no
 * Latin-alphabet coverage) — see generate-alphabet-strokes.mjs, which computes all 52
 * letterforms from line/arc primitives instead. That's also why this screen omits the
 * shared "traceStrokeCredit" line KanjiTraceScreen/KanaTraceScreen show: that credit
 * specifically attributes KanjiVG, which doesn't apply to hand-computed data. */
export function AlphabetTraceScreen({ onBack, onHome }: AlphabetTraceScreenProps) {
  const { t, lang } = useI18n()
  const [traceOrder] = useState<TraceEntry[]>(() => shuffle(TRACE_DECK))
  const [reviewOrder] = useState<AlphabetEntry[]>(() => shuffle(alphabetBank))
  const [traceIndex, setTraceIndex] = useState(0)
  const [reviewIndex, setReviewIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('tracing')
  // See KanjiTraceScreen.tsx's identical comment: setIndex clamps on write (not just
  // guarded by isLast at read time) because a stray double-fire of a "next" handler was
  // confirmed reachable there and would otherwise push an index one past its deck's end.
  const traceEntry = traceOrder[traceIndex]
  const reviewEntry = reviewOrder[reviewIndex]
  const isLastTrace = traceIndex === traceOrder.length - 1
  const isLastReview = reviewIndex === reviewOrder.length - 1
  const voiceProfile = characterThemes.alphabet.voiceProfile
  const wentBackRef = useRef(false)

  function handleComplete() {
    playCorrectSfx()
    setPhase('praise')
  }

  function handlePraiseNext() {
    if (isLastTrace) {
      setReviewIndex(0)
      setPhase('review')
    } else {
      setTraceIndex((i) => Math.min(i + 1, traceOrder.length - 1))
      setPhase('tracing')
    }
  }

  function handleReviewNext() {
    if (isLastReview) {
      if (wentBackRef.current) return
      wentBackRef.current = true
      onBack()
    } else {
      setReviewIndex((i) => Math.min(i + 1, reviewOrder.length - 1))
    }
  }

  const praise = phase === 'praise' ? pickHandwritingPraise(lang, 'alphabet') : null

  return (
    <div className="screen">
      <div className="top-bar">
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="secondary-button" onClick={onBack}>
            {t('backButton')}
          </button>
          <button type="button" className="secondary-button" onClick={onHome}>
            {t('backHomeButton')}
          </button>
        </div>
        <CategoryHeader category="alphabet" />
      </div>

      {phase === 'tracing' && (
        <>
          <p className="subtitle">{t('tracePrompt')}</p>
          <KanjiTraceCanvas
            key={traceEntry.id}
            char={traceEntry.char}
            strokes={alphabetStrokePaths[traceEntry.char]}
            restartLabel={t('traceRestartButton')}
            onComplete={handleComplete}
          />
        </>
      )}

      {phase === 'praise' && praise && (
        <div className="handwriting-praise">
          <HiraganaChar char={traceEntry.char} size={96} />
          <p className="handwriting-praise-text">{praise.text}</p>
          <TtsButton
            text={praise.text}
            lang={lang === 'ja' ? 'ja-JP' : 'en-US'}
            label="listen"
            voiceProfile={voiceProfile}
            cacheKey={praise.cacheKey}
          />
          <button type="button" className="primary-button next-button" onClick={handlePraiseNext}>
            {t('nextButton')}
          </button>
        </div>
      )}

      {phase === 'review' && (
        <div className="handwriting-praise">
          <p className="hint-caption">
            {t('reviewProgress', { current: String(reviewIndex + 1), total: String(reviewOrder.length) })}
          </p>
          <HiraganaChar char={reviewEntry.upper} size={96} />
          <TtsButton
            text={alphabetSpeechPhrase(reviewEntry)}
            lang="en-US"
            label="listen"
            size={56}
            voiceProfile={voiceProfile}
            cacheKey={`alphabet-letter-${reviewEntry.id}`}
          />
          <p className="kanji-review-sentence">{reviewEntry.exampleSentenceEn}</p>
          <TtsButton
            text={reviewEntry.exampleSentenceEn}
            lang="en-US"
            label="listen"
            voiceProfile={voiceProfile}
            cacheKey={`alphabet-review-${reviewEntry.id}`}
          />
          <button type="button" className="primary-button next-button" onClick={handleReviewNext}>
            {isLastReview ? t('reviewDoneButton') : t('nextButton')}
          </button>
        </div>
      )}
    </div>
  )
}
