import { useRef, useState } from 'react'
import { wordTraceBank } from '../domain/wordTraceBank'
import { getWordById } from '../domain/wordBank'
import { alphabetStrokePaths } from '../domain/alphabetStrokes'
import { useI18n } from '../i18n/I18nContext'
import { KanjiTraceCanvas } from '../components/KanjiTraceCanvas'
import { WordIcon } from '../components/WordIcon'
import { TtsButton } from '../components/TtsButton'
import { characterThemes } from '../components/characters/characterThemes'
import { playCorrectSfx } from '../lib/sfx'
import { shuffle } from '../lib/shuffle'

interface WordTraceScreenProps {
  onBack: () => void
  onHome: () => void
}

type Phase = 'tracing' | 'reveal' | 'review'

/** えいご「たんご」なぞる practice — reached via EnglishEntryScreen, NOT a Category (see
 * App.tsx's Screen union), the same escape hatch KanjiTraceScreen/AlphabetTraceScreen use
 * for unscored trace activities. Covers the 26 words in wordTraceBank (one per A-Z starting
 * letter, reusing alphabetBank's own mnemonic associations — see that file's own comment).
 *
 * Each word is traced one LETTER at a time using the exact same KanjiTraceCanvas +
 * alphabetStrokePaths mechanism アルファベット なぞる already uses — nothing new there.
 * What's new is the outer loop: a word has multiple letters, so on top of かんじ/アルファベット's
 * usual tracing→reveal→review phase machine, this screen also tracks which letter of the
 * current word is active (`letterIndex`), reset to 0 every time the word advances. Unlike
 * かんじ's reveal (which HIDES the meaning until after tracing, since discovering it is the
 * point), the picture and word text are visible the whole time here — the point is
 * "copy what you see," not "guess then reveal" — reveal after a word's last letter is just
 * a short, consistent checkpoint (praise + pronunciation) before moving on, matching every
 * other trace screen's rhythm. */
export function WordTraceScreen({ onBack, onHome }: WordTraceScreenProps) {
  const { t } = useI18n()
  const [wordOrder] = useState<string[]>(() => shuffle(wordTraceBank))
  const [wordIndex, setWordIndex] = useState(0)
  const [letterIndex, setLetterIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('tracing')
  const entry = getWordById(wordOrder[wordIndex])
  const letters = entry.word.split('')
  const currentLetter = letters[letterIndex]
  const isLastLetterOfWord = letterIndex === letters.length - 1
  const isLastWordInDeck = wordIndex === wordOrder.length - 1
  const theme = characterThemes.englishSpelling
  const voiceProfile = theme.voiceProfile
  // Same clamp-on-write + onBack double-fire guard as KanjiTraceScreen/KanaTraceScreen/
  // AlphabetTraceScreen — a stray double-fire of a "next" handler was confirmed reachable
  // there (two clicks landing before React commits the first index update).
  const wentBackRef = useRef(false)

  function handleLetterComplete() {
    playCorrectSfx()
    if (isLastLetterOfWord) {
      setPhase('reveal')
    } else {
      setLetterIndex((i) => Math.min(i + 1, letters.length - 1))
    }
  }

  function handleRevealNext() {
    if (isLastWordInDeck) {
      setWordIndex(0)
      setLetterIndex(0)
      setPhase('review')
    } else {
      setWordIndex((i) => Math.min(i + 1, wordOrder.length - 1))
      setLetterIndex(0)
      setPhase('tracing')
    }
  }

  function handleReviewNext() {
    if (isLastWordInDeck) {
      if (wentBackRef.current) return
      wentBackRef.current = true
      onBack()
    } else {
      setWordIndex((i) => Math.min(i + 1, wordOrder.length - 1))
    }
  }

  return (
    <div className="screen">
      <div className="top-bar">
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="icon-button" onClick={onBack} aria-label={t('backButton')}>
            ←
          </button>
          <button type="button" className="icon-button" onClick={onHome} aria-label={t('backHomeButton')}>
            🏠
          </button>
        </div>
        {/* Not <CategoryHeader category="englishSpelling" /> — that pulls in the
            "（よむ）" quiz-mode suffix baked into categoryEnglishSpelling's label, which
            would misleadingly claim this trace screen is the spelling quiz. Same visual
            treatment (englishSpelling's own theme colors/symbol, since wordTrace is a
            sibling practice mode under the same えいご umbrella), correct label text. */}
        <div
          className="category-header"
          style={{ background: theme.colorMain, boxShadow: `0 4px 0 ${theme.colorMainDark}` }}
        >
          <span className="category-header-symbol" style={{ color: theme.colorMainDark }}>
            Aa
          </span>
          <span className="category-header-label">{t('englishEntryWordLabel')}</span>
        </div>
      </div>

      {phase === 'tracing' && (
        <>
          <p className="hint-caption">
            {t('reviewProgress', { current: String(wordIndex + 1), total: String(wordOrder.length) })}
          </p>
          <WordIcon wordId={entry.id} size={90} />
          <p className="word-trace-progress">
            {letters.map((letter, i) => (
              <span
                key={i}
                className={
                  i < letterIndex
                    ? 'word-trace-letter word-trace-letter--done'
                    : i === letterIndex
                      ? 'word-trace-letter word-trace-letter--current'
                      : 'word-trace-letter word-trace-letter--pending'
                }
              >
                {letter}
              </span>
            ))}
          </p>
          <p className="subtitle">{t('tracePrompt')}</p>
          <KanjiTraceCanvas
            key={`${entry.id}-${letterIndex}`}
            char={currentLetter}
            strokes={alphabetStrokePaths[currentLetter]}
            restartLabel={t('traceRestartButton')}
            onComplete={handleLetterComplete}
          />
        </>
      )}

      {phase === 'reveal' && (
        <div className="handwriting-praise">
          <WordIcon wordId={entry.id} size={140} />
          <p className="handwriting-praise-text">{entry.word}</p>
          <p className="hint-caption">{entry.translationJa}</p>
          <TtsButton
            text={entry.word}
            lang="en-US"
            label="listen"
            voiceProfile={voiceProfile}
            cacheKey={`word-en-${entry.id}`}
          />
          <button type="button" className="primary-button next-button" onClick={handleRevealNext}>
            {t('nextButton')}
          </button>
        </div>
      )}

      {phase === 'review' && (
        <div className="handwriting-praise">
          <p className="hint-caption">
            {t('reviewProgress', { current: String(wordIndex + 1), total: String(wordOrder.length) })}
          </p>
          <WordIcon wordId={entry.id} size={140} />
          <p className="kanji-review-sentence">{entry.word}</p>
          <p className="hint-caption">{entry.translationJa}</p>
          <TtsButton
            text={entry.word}
            lang="en-US"
            label="listen"
            voiceProfile={voiceProfile}
            cacheKey={`word-en-${entry.id}`}
          />
          <button type="button" className="primary-button next-button" onClick={handleReviewNext}>
            {isLastWordInDeck ? t('reviewDoneButton') : t('nextButton')}
          </button>
        </div>
      )}
    </div>
  )
}
