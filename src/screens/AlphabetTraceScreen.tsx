import { useRef, useState } from 'react'
import { alphabetBank, alphabetSpeechPhrase, getAlphabetById } from '../domain/alphabetBank'
import { alphabetStrokePaths } from '../domain/alphabetStrokes'
import { useI18n } from '../i18n/I18nContext'
import { CategoryHeader } from '../components/CategoryHeader'
import { KanjiTraceCanvas } from '../components/KanjiTraceCanvas'
import { TraceReveal } from '../components/TraceReveal'
import { characterThemes } from '../components/characters/characterThemes'
import { playCorrectSfx } from '../lib/sfx'
import { useCorrectCelebration } from '../components/CorrectCelebration'
import { shuffle } from '../lib/shuffle'

/** Example words with no fitting picture among images/words (queen). */
const NO_PICTURE = new Set(['q'])

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
 * derived from the char itself. */
const TRACE_DECK: TraceEntry[] = alphabetBank.flatMap((a) => [
  { id: `${a.id}-upper`, char: a.upper, letterId: a.id },
  { id: `${a.id}-lower`, char: a.lower, letterId: a.id },
])

type Phase = 'tracing' | 'reveal'

/** アルファベット なぞる (stroke-order trace) practice, reached from HandwritingScreen when
 * level 1 ("なぞる") is picked for alphabet. Same rhythm as every other trace mode: trace a
 * glyph → the shared explanation step (TraceReveal: the letter ＝ a picture of its example
 * word, the word, an example sentence, the letter phrase then the sentence read aloud) →
 * next glyph, across all 52 upper+lower glyphs. Finishing the last one calls onBack().
 *
 * Unlike かんじ/かな, the stroke guide data isn't fetched from KanjiVG (it has no
 * Latin-alphabet coverage) — see generate-alphabet-strokes.mjs, which computes all 52
 * letterforms from line/arc primitives instead. That's also why this screen omits the
 * shared "traceStrokeCredit" line KanjiTraceScreen/KanaTraceScreen show. */
export function AlphabetTraceScreen({ onBack, onHome }: AlphabetTraceScreenProps) {
  const { t } = useI18n()
  const { celebrate, celebration } = useCorrectCelebration()
  const [order] = useState<TraceEntry[]>(() => shuffle(TRACE_DECK))
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('tracing')
  // Clamped on write, and onBack guarded, against a stray double-fire of "next" (see
  // KanjiTraceScreen).
  const entry = order[index]
  const letter = getAlphabetById(entry.letterId)
  const isLastInDeck = index === order.length - 1
  const voiceProfile = characterThemes.alphabet.voiceProfile
  const wentBackRef = useRef(false)

  function handleComplete() {
    playCorrectSfx()
    celebrate()
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
      {celebration}
      <div className="top-bar">
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="icon-button" onClick={onBack} aria-label={t('backButton')}>
            ←
          </button>
          <button type="button" className="icon-button" onClick={onHome} aria-label={t('backHomeButton')}>
            ⌂
          </button>
        </div>
        <CategoryHeader category="alphabet" />
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
            strokes={alphabetStrokePaths[entry.char]}
            restartLabel={t('traceRestartButton')}
            onComplete={handleComplete}
          />
        </>
      )}

      {phase === 'reveal' && (
        <TraceReveal
          key={entry.id}
          glyph={entry.char}
          imageId={NO_PICTURE.has(letter.id) ? undefined : letter.mnemonic.toLowerCase()}
          label={letter.mnemonic}
          sentence={letter.exampleSentenceEn}
          speech={[
            { text: alphabetSpeechPhrase(letter), lang: 'en-US', cacheKey: `alphabet-letter-${letter.id}` },
            { text: letter.exampleSentenceEn, lang: 'en-US', cacheKey: `alphabet-review-${letter.id}` },
          ]}
          voiceProfile={voiceProfile}
          nextLabel={isLastInDeck ? t('reviewDoneButton') : t('nextButton')}
          onNext={handleNext}
        />
      )}
    </div>
  )
}
