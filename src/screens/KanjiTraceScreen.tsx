import { useState } from 'react'
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
 * kanjiBank.ts's traceImageId comment and scripts/fetch-kanji-strokes.mjs. Both must be
 * present (a kanjiBank entry could theoretically get traceImageId/meaningJa/meaningEn
 * added without its strokes being fetched yet, or vice versa during future expansion). */
const TRACE_DECK: KanjiEntry[] = kanjiBank.filter(
  (k) => k.traceImageId && k.meaningJa && k.meaningEn && kanjiStrokePaths[k.char]?.length,
)

type Phase = 'tracing' | 'reveal'

/** かんじ なぞる (stroke-order trace) practice — reached via KanjiEntryScreen, NOT a
 * Category (see kanjiBank.ts/App.tsx's Screen union) — deliberately outside
 * progress.ts/CATEGORY_MAX_LEVEL/star-leveling entirely, the same escape hatch
 * HandwritingScreen already uses for ひらがな/カタカナ/アルファベット practice. Unlike
 * HandwritingScreen, this has no level 1/2 split: the whole point of tracing is
 * always-visible per-stroke order guidance, not a trace-vs-recall memory test.
 *
 * Flow per character: trace every stroke in order (KanjiTraceCanvas calls onComplete
 * once all strokes are done) → reveal the linked image + meaning + reading, so the
 * character, what it sounds like, and what it actually means land together — the core
 * goal behind this whole mode. */
export function KanjiTraceScreen({ onBack, onHome }: KanjiTraceScreenProps) {
  const { t, lang } = useI18n()
  const [order] = useState<KanjiEntry[]>(() => shuffle(TRACE_DECK))
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('tracing')
  const entry = order[index % order.length]
  const voiceProfile = characterThemes.kanji.voiceProfile

  function handleComplete() {
    setPhase('reveal')
  }

  function handleNext() {
    setIndex((i) => (i + 1) % order.length)
    setPhase('tracing')
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

      {phase === 'tracing' ? (
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
      ) : (
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
          <button type="button" className="primary-button next-button" onClick={handleNext}>
            {t('nextButton')}
          </button>
        </div>
      )}

      <p className="kanji-trace-credit">{t('kanjiTraceCredit')}</p>
    </div>
  )
}
