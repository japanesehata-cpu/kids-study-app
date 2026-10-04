import { useRef, useState } from 'react'
import { hiraganaBank, hiraganaSpeechPhrase, type HiraganaEntry } from '../domain/hiraganaBank'
import { katakanaBank, katakanaSpeechPhrase, type KatakanaEntry } from '../domain/katakanaBank'
import { kanaStrokePaths } from '../domain/kanaStrokes'
import { KANA_TRACE_IMAGE } from '../domain/kanaTraceImages'
import { useI18n } from '../i18n/I18nContext'
import { CategoryHeader } from '../components/CategoryHeader'
import { KanjiTraceCanvas } from '../components/KanjiTraceCanvas'
import { TraceReveal } from '../components/TraceReveal'
import { characterThemes } from '../components/characters/characterThemes'
import { playCorrectSfx } from '../lib/sfx'
import { shuffle } from '../lib/shuffle'

type KanaCategory = 'hiragana' | 'katakana'
type KanaEntry = HiraganaEntry | KatakanaEntry

interface KanaTraceScreenProps {
  category: KanaCategory
  onBack: () => void
  onHome: () => void
}

const BANK_BY_CATEGORY: Record<KanaCategory, KanaEntry[]> = {
  hiragana: hiraganaBank,
  katakana: katakanaBank,
}

function speechPhraseFor(category: KanaCategory, entry: KanaEntry): string {
  return category === 'hiragana' ? hiraganaSpeechPhrase(entry as HiraganaEntry) : katakanaSpeechPhrase(entry as KatakanaEntry)
}

/** 清音 (seion) only — see hiraganaBank.ts/katakanaBank.ts's row field. Both AND'd with
 * kanaStrokePaths having that char's data (always true together for the seion set here,
 * but kept explicit the same way KanjiTraceScreen's TRACE_DECK filter is, in case the
 * stroke fetch and the exampleSentence authoring ever drift out of sync during future
 * expansion to dakuten/handakuten/youon). */
function traceDeckFor(category: KanaCategory): KanaEntry[] {
  return BANK_BY_CATEGORY[category].filter(
    (e) => e.exampleSentenceJa && e.exampleSentenceEn && kanaStrokePaths[e.char]?.length,
  )
}

type Phase = 'tracing' | 'reveal'

/** ひらがな/カタカナ なぞる (stroke-order trace) practice — the same KanjiVG-driven,
 * shared KanjiTraceCanvas mechanism かんじ's KanjiTraceScreen uses. Reached from
 * HandwritingScreen when level 1 ("なぞる") is picked for hiragana/katakana.
 *
 * Same rhythm as かんじ: trace a kana → one explanation step (TraceReveal) showing the kana
 * beside a picture of its example word (あ ＝ ant, あり), the example sentence, and the
 * kana's sound followed by the sentence read aloud — right after each kana, instead of a
 * generic praise line now and a separate review lap at the end of the deck. Finishing the
 * last kana calls onBack(), returning to HandwritingScreen's なぞる/きいてかく chooser. */
export function KanaTraceScreen({ category, onBack, onHome }: KanaTraceScreenProps) {
  const { t, lang } = useI18n()
  const [order] = useState<KanaEntry[]>(() => shuffle(traceDeckFor(category)))
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('tracing')
  // See KanjiTraceScreen.tsx's identical comment: setIndex clamps on write (not just
  // guarded by isLastInDeck at read time) because a stray double-fire of a "next" handler
  // was confirmed reachable there and would otherwise push index one past the deck's end.
  const entry = order[index]
  const isLastInDeck = index === order.length - 1
  const voiceProfile = characterThemes[category].voiceProfile
  const wentBackRef = useRef(false)

  function handleComplete() {
    playCorrectSfx()
    setPhase('reveal')
  }

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
        <CategoryHeader category={category} />
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
            strokes={kanaStrokePaths[entry.char]}
            restartLabel={t('traceRestartButton')}
            onComplete={handleComplete}
          />
          <p className="kanji-trace-credit">{t('traceStrokeCredit')}</p>
        </>
      )}

      {phase === 'reveal' && (
        <TraceReveal
          key={entry.id}
          glyph={entry.char}
          imageId={KANA_TRACE_IMAGE[category][entry.id]}
          label={entry.mnemonic ?? ''}
          sentence={lang === 'ja' ? entry.exampleSentenceJa : entry.exampleSentenceEn}
          speech={[
            { text: speechPhraseFor(category, entry), lang: 'ja-JP', cacheKey: `${category}-${entry.id}` },
            { text: entry.exampleSentenceJa!, lang: 'ja-JP', cacheKey: `${category}-review-${entry.id}` },
          ]}
          voiceProfile={voiceProfile}
          nextLabel={isLastInDeck ? t('reviewDoneButton') : t('nextButton')}
          onNext={handleNext}
        />
      )}

    </div>
  )
}
