import { useRef, useState } from 'react'
import { kanjiBank, kanjiSpeechPhrase, type KanjiEntry } from '../domain/kanjiBank'
import { kanjiStrokePaths } from '../domain/kanjiStrokes'
import { useI18n } from '../i18n/I18nContext'
import { CategoryHeader } from '../components/CategoryHeader'
import { KanjiTraceCanvas } from '../components/KanjiTraceCanvas'
import { WordIcon } from '../components/WordIcon'
import { TtsButton } from '../components/TtsButton'
import { characterThemes } from '../components/characters/characterThemes'
import { shuffle } from '../lib/shuffle'

interface KanjiTraceScreenProps {
  onBack: () => void
  onHome: () => void
}

/** Kanji whose meaning is easy to picture AND has stroke-order data fetched — see
 * kanjiBank.ts's traceImageId comment and scripts/fetch-kanji-strokes.mjs. All of these
 * must be present (a kanjiBank entry could theoretically get traceImageId/meaningJa/
 * meaningEn/exampleSentenceJa/exampleSentenceEn added without its strokes being fetched
 * yet, or vice versa, during future expansion) — kanji.test.ts enforces they're always
 * set together. */
const TRACE_DECK: KanjiEntry[] = kanjiBank.filter(
  (k) =>
    k.traceImageId &&
    k.meaningJa &&
    k.meaningEn &&
    k.exampleSentenceJa &&
    k.exampleSentenceEn &&
    kanjiStrokePaths[k.char]?.length,
)

type Phase = 'tracing' | 'reveal' | 'review'

/** かんじ なぞる (stroke-order trace) practice — reached via KanjiEntryScreen, NOT a
 * Category (see kanjiBank.ts/App.tsx's Screen union) — deliberately outside
 * progress.ts/CATEGORY_MAX_LEVEL/star-leveling entirely, the same escape hatch
 * HandwritingScreen already uses for ひらがな/カタカナ/アルファベット practice. Unlike
 * HandwritingScreen, this has no level 1/2 split: the whole point of tracing is
 * always-visible per-stroke order guidance, not a trace-vs-recall memory test.
 *
 * Flow per character (trace pass): trace every stroke in order (KanjiTraceCanvas calls
 * onComplete once all strokes are done) → reveal the linked image + meaning + reading, so
 * the character, what it sounds like, and what it actually means land together. Once
 * every character in the (shuffled, but fixed for this visit) deck has been traced once,
 * the same deck restarts as a review pass instead of looping the trace pass again: each
 * character's meaning image reappears alongside a short example sentence in context,
 * read aloud — reinforcing "you can now spot this kanji in real use," not just draw it in
 * isolation. Finishing the review pass calls onBack(), which — since this screen is only
 * ever reached from KanjiEntryScreen — naturally returns there rather than needing its
 * own dedicated prop for it. */
export function KanjiTraceScreen({ onBack, onHome }: KanjiTraceScreenProps) {
  const { t, lang } = useI18n()
  const [order] = useState<KanjiEntry[]>(() => shuffle(TRACE_DECK))
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('tracing')
  // order[index] rather than a clamped/modulo lookup, deliberately — see the setIndex
  // calls below, which clamp on write instead of on read. A stray double-fire of a
  // "next" handler (confirmed reachable: two "つぎへ" clicks landing close enough
  // together that both closures still see the same pre-update `index`, e.g. an eager
  // double-tap before React commits the first one) previously called `setIndex(i => i +
  // 1)` twice off the same stale `index`, pushing it one past `order.length - 1` — read
  // fell through to `undefined` and crashed. Clamping where the value is written makes
  // every read safe by construction, however many times a handler fires.
  const entry = order[index]
  const isLastInDeck = index === order.length - 1
  const voiceProfile = characterThemes.kanji.voiceProfile
  // onBack() (unlike setIndex above) has no clamp-on-write equivalent — a stale double
  // fire at the very last review card would call it twice, popping two screens off
  // App.tsx's history stack instead of one. Guards the one non-idempotent call in this
  // component; never reset since leaving the screen makes it moot either way.
  const wentBackRef = useRef(false)

  function handleComplete() {
    setPhase('reveal')
  }

  function handleRevealNext() {
    if (isLastInDeck) {
      setIndex(0)
      setPhase('review')
    } else {
      setIndex((i) => Math.min(i + 1, order.length - 1))
      setPhase('tracing')
    }
  }

  function handleReviewNext() {
    if (isLastInDeck) {
      if (wentBackRef.current) return
      wentBackRef.current = true
      onBack()
    } else {
      setIndex((i) => Math.min(i + 1, order.length - 1))
    }
  }

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
        <CategoryHeader category="kanji" />
      </div>

      {phase === 'tracing' && (
        <>
          <p className="subtitle">{t('kanjiTracePrompt')}</p>
          <KanjiTraceCanvas
            key={entry.id}
            char={entry.char}
            strokes={kanjiStrokePaths[entry.char]}
            restartLabel={t('kanjiTraceRestartButton')}
            onComplete={handleComplete}
          />
        </>
      )}

      {phase === 'reveal' && (
        <div className="handwriting-praise">
          <p className="hint-caption">{t('kanjiTraceMeaningLabel')}</p>
          <WordIcon wordId={entry.traceImageId!} size={140} />
          <p className="handwriting-praise-text">{lang === 'ja' ? entry.meaningJa : entry.meaningEn}</p>
          <TtsButton
            text={kanjiSpeechPhrase(entry)}
            lang="ja-JP"
            label="listen"
            voiceProfile={voiceProfile}
            cacheKey={`kanji-${entry.id}`}
          />
          <button type="button" className="primary-button next-button" onClick={handleRevealNext}>
            {t('nextButton')}
          </button>
        </div>
      )}

      {phase === 'review' && (
        <div className="handwriting-praise">
          <p className="hint-caption">
            {t('kanjiReviewProgress', { current: String(index + 1), total: String(order.length) })}
          </p>
          <WordIcon wordId={entry.traceImageId!} size={140} />
          <p className="kanji-review-sentence">{lang === 'ja' ? entry.exampleSentenceJa : entry.exampleSentenceEn}</p>
          <TtsButton
            text={entry.exampleSentenceJa!}
            lang="ja-JP"
            label="listen"
            voiceProfile={voiceProfile}
            cacheKey={`kanji-review-${entry.id}`}
          />
          <button type="button" className="primary-button next-button" onClick={handleReviewNext}>
            {isLastInDeck ? t('kanjiReviewDoneButton') : t('nextButton')}
          </button>
        </div>
      )}

      <p className="kanji-trace-credit">{t('kanjiTraceCredit')}</p>
    </div>
  )
}
