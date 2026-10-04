import { useRef, useState } from 'react'
import { kanjiBank, type KanjiEntry, type KanjiGrade } from '../domain/kanjiBank'
import { kanjiStrokePaths } from '../domain/kanjiStrokes'
import { useI18n } from '../i18n/I18nContext'
import { CategoryHeader } from '../components/CategoryHeader'
import { KanjiTraceCanvas } from '../components/KanjiTraceCanvas'
import { TraceReveal } from '../components/TraceReveal'
import { characterThemes } from '../components/characters/characterThemes'
import { playCorrectSfx } from '../lib/sfx'
import { shuffle } from '../lib/shuffle'

interface KanjiTraceScreenProps {
  grade: KanjiGrade
  onBack: () => void
  onHome: () => void
}

/** Kanji whose meaning is easy to picture AND has stroke-order data fetched — see
 * kanjiBank.ts's traceImageId comment and scripts/fetch-kanji-strokes.mjs. kanji.test.ts
 * enforces the trace fields are always set together. */
function traceDeck(grade: KanjiGrade): KanjiEntry[] {
  return kanjiBank.filter(
    (k) =>
      k.grade === grade &&
      k.traceImageId &&
      k.meaningJa &&
      k.meaningEn &&
      k.exampleSentenceJa &&
      k.exampleSentenceEn &&
      kanjiStrokePaths[k.char]?.length,
  )
}

type Phase = 'tracing' | 'reveal'

/** かんじ なぞる (stroke-order trace) practice — reached via KanjiEntryScreen, NOT a
 * Category (see App.tsx's Screen union) — deliberately outside progress/star-leveling, the
 * same escape hatch HandwritingScreen uses for ひらがな/カタカナ/アルファベット practice.
 *
 * Flow per character: trace every stroke in order (KanjiTraceCanvas calls onComplete once
 * all strokes are done) → one explanation step showing the kanji right beside a picture of
 * what it means, the meaning word, and a short example sentence read aloud — so the
 * character, the real thing, and the word in use land together, immediately after each
 * one rather than in a separate review lap at the end of the deck. Finishing the last
 * character calls onBack(), returning to KanjiEntryScreen. */
export function KanjiTraceScreen({ grade, onBack, onHome }: KanjiTraceScreenProps) {
  const { t, lang } = useI18n()
  const [order] = useState<KanjiEntry[]>(() => shuffle(traceDeck(grade)))
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('tracing')
  // Clamped on write (see handleNext), so a stray double-fire of "next" can never push the
  // index past the end and read `undefined`.
  const entry = order[index]
  const isLastInDeck = index === order.length - 1
  const voiceProfile = characterThemes.kanji.voiceProfile
  // onBack() has no clamp-on-write equivalent — guards a double fire at the very last
  // card from popping two screens off App.tsx's history stack.
  const wentBackRef = useRef(false)

  function handleNext() {
    if (isLastInDeck) {
      if (wentBackRef.current) return
      wentBackRef.current = true
      onBack()
      return
    }
    setIndex((i) => Math.min(i + 1, order.length - 1))
    setPhase('tracing')
  }

  return (
    <div className="screen">
      <div className="top-bar">
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="icon-button" onClick={onBack} aria-label={t('backButton')}>
            ←
          </button>
          <button type="button" className="icon-button" onClick={onHome} aria-label={t('backHomeButton')}>
            ⌂
          </button>
        </div>
        <CategoryHeader category={grade === 2 ? 'kanji2' : 'kanji'} />
      </div>

      <p className="hint-caption">
        {t('kanjiTraceProgress', { current: String(index + 1), total: String(order.length) })}
      </p>

      {phase === 'tracing' && (
        <>
          <p className="subtitle">{t('tracePrompt')}</p>
          <KanjiTraceCanvas
            key={entry.id}
            char={entry.char}
            strokes={kanjiStrokePaths[entry.char]}
            restartLabel={t('traceRestartButton')}
            onComplete={() => {
              playCorrectSfx()
              setPhase('reveal')
            }}
          />
          <p className="kanji-trace-credit">{t('traceStrokeCredit')}</p>
        </>
      )}

      {phase === 'reveal' && (
        <TraceReveal
          key={entry.id}
          glyph={entry.char}
          imageId={entry.traceImageId}
          label={lang === 'ja' ? entry.meaningJa! : entry.meaningEn!}
          sentence={lang === 'ja' ? entry.exampleSentenceJa : entry.exampleSentenceEn}
          speech={[{ text: entry.exampleSentenceJa!, lang: 'ja-JP', cacheKey: `kanji-review-${entry.id}` }]}
          voiceProfile={voiceProfile}
          nextLabel={isLastInDeck ? t('reviewDoneButton') : t('nextButton')}
          onNext={handleNext}
        />
      )}
    </div>
  )
}
