import { useRef, useState } from 'react'
import { hiraganaBank, hiraganaSpeechPhrase, type HiraganaEntry } from '../domain/hiraganaBank'
import { katakanaBank, katakanaSpeechPhrase, type KatakanaEntry } from '../domain/katakanaBank'
import { kanaStrokePaths } from '../domain/kanaStrokes'
import { pickHandwritingPraise } from '../domain/handwritingPraise'
import { useI18n } from '../i18n/I18nContext'
import { CategoryHeader } from '../components/CategoryHeader'
import { KanjiTraceCanvas } from '../components/KanjiTraceCanvas'
import { HiraganaChar } from '../components/HiraganaChar'
import { TtsButton } from '../components/TtsButton'
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

type Phase = 'tracing' | 'praise' | 'review'

/** ひらがな/カタカナ なぞる (stroke-order trace) practice — the same KanjiVG-driven,
 * shared KanjiTraceCanvas mechanism かんじ's KanjiTraceScreen uses (see that file's own
 * top comment for the full rationale: real per-stroke order guidance via a component that
 * only needs a char + its stroke list, nothing kanji-specific). Reached from
 * HandwritingScreen when level 1 ("なぞる") is picked for hiragana/katakana specifically
 * — HandwritingScreen renders this in place of its own whole-glyph HandwritingCanvas for
 * that one branch and leaves alphabet's level 1 and every category's level 2 (きいてかく,
 * which shows no guide at all and so can't use stroke-order tracing in the first place)
 * completely untouched.
 *
 * Unlike KanjiTraceScreen, there's no per-character "reveal" step — a kana has no meaning
 * to disclose, just a sound the child already knows going in. Trace-completion feedback
 * instead reuses HandwritingScreen's own existing praise mechanic
 * (pickHandwritingPraise/handwriting-praise-*, already cached). Once every character in
 * the deck has been traced once, the same deck restarts as a review pass exactly like
 * かんじ's: each kana's reading (existing hiragana-{id}/katakana-{id} cache — the same
 * audio HandwritingScreen's own level 2 already speaks) plays alongside a short example
 * sentence using it in context. Finishing the review pass calls onBack(), which — since
 * this screen is only ever rendered by HandwritingScreen — returns to its
 * なぞる/きいてかく chooser. */
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
    setPhase('praise')
  }

  function handlePraiseNext() {
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

  const praise = phase === 'praise' ? pickHandwritingPraise(lang, category) : null

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
        <CategoryHeader category={category} />
      </div>

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
        </>
      )}

      {phase === 'praise' && praise && (
        <div className="handwriting-praise">
          <HiraganaChar char={entry.char} size={96} />
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
            {t('reviewProgress', { current: String(index + 1), total: String(order.length) })}
          </p>
          <HiraganaChar char={entry.char} size={96} />
          <TtsButton
            text={speechPhraseFor(category, entry)}
            lang="ja-JP"
            label="listen"
            size={56}
            voiceProfile={voiceProfile}
            cacheKey={`${category}-${entry.id}`}
          />
          <p className="kanji-review-sentence">{lang === 'ja' ? entry.exampleSentenceJa : entry.exampleSentenceEn}</p>
          <TtsButton
            text={entry.exampleSentenceJa!}
            lang="ja-JP"
            label="listen"
            voiceProfile={voiceProfile}
            cacheKey={`${category}-review-${entry.id}`}
          />
          <button type="button" className="primary-button next-button" onClick={handleReviewNext}>
            {isLastInDeck ? t('reviewDoneButton') : t('nextButton')}
          </button>
        </div>
      )}

      <p className="kanji-trace-credit">{t('traceStrokeCredit')}</p>
    </div>
  )
}
