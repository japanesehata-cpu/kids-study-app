import { useEffect, useState } from 'react'
import { hiraganaBank, hiraganaSpeechPhrase, type HiraganaEntry } from '../domain/hiraganaBank'
import { katakanaBank, katakanaSpeechPhrase, type KatakanaEntry } from '../domain/katakanaBank'
import { pickHandwritingPraise } from '../domain/handwritingPraise'
import { useI18n } from '../i18n/I18nContext'
import { CategoryHeader } from '../components/CategoryHeader'
import { HandwritingCanvas } from '../components/HandwritingCanvas'
import { HiraganaChar } from '../components/HiraganaChar'
import { TtsButton } from '../components/TtsButton'
import { characterThemes } from '../components/characters/characterThemes'
import { speak, type SpeechLang } from '../lib/tts'
import { playCorrectSfx } from '../lib/sfx'

interface HandwritingScreenProps {
  category: 'hiragana' | 'katakana'
  /** one step back — the screen this was opened from (LevelSelectScreen) */
  onBack: () => void
  onHome: () => void
}

type HandwritingLevel = 1 | 2

const BANK_BY_CATEGORY: Record<'hiragana' | 'katakana', (HiraganaEntry | KatakanaEntry)[]> = {
  hiragana: hiraganaBank,
  katakana: katakanaBank,
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

/** Both banks share the exact same entry shape (id/char/row/mnemonic?) and phrase-wrapping
 * rules — only the underlying script differs — so a single generic wrapper covers both
 * instead of duplicating this per category. */
function speechPhraseFor(category: 'hiragana' | 'katakana', entry: HiraganaEntry | KatakanaEntry): string {
  return category === 'hiragana' ? hiraganaSpeechPhrase(entry as HiraganaEntry) : katakanaSpeechPhrase(entry as KatakanaEntry)
}

export function HandwritingScreen({ category, onBack, onHome }: HandwritingScreenProps) {
  const { t, lang } = useI18n()
  const [level, setLevel] = useState<HandwritingLevel | null>(null)
  const [index, setIndex] = useState(0)
  // Shuffled fresh each time a level is picked (see handleSelectLevel) rather than always
  // stepping through the bank in its stored gojuon order — 五十音順 every session made the
  // practice too predictable to actually test recognition.
  const [order, setOrder] = useState<(HiraganaEntry | KatakanaEntry)[]>(() => shuffle(BANK_BY_CATEGORY[category]))
  const [praise, setPraise] = useState<{ stars: number; text: string } | null>(null)
  const entry = order[index % order.length]
  const voiceProfile = characterThemes[category].voiceProfile
  const cacheKey = `${category}-${entry.id}`
  const speechPhrase = speechPhraseFor(category, entry)

  // Level 2 (listen & write) has no visible guide, so the child's only way to know which
  // character to write is hearing it — speak it the moment a new one appears, same as every
  // quiz question's auto-speak.
  useEffect(() => {
    if (level !== 2 || praise) return
    speak(speechPhrase, 'ja-JP', voiceProfile, cacheKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, entry.id, praise])

  function handleDone(stars: number) {
    playCorrectSfx()
    const { text, cacheKey: praiseCacheKey } = pickHandwritingPraise(lang, category)
    setPraise({ stars, text })
    const speechLang: SpeechLang = lang === 'ja' ? 'ja-JP' : 'en-US'
    speak(text, speechLang, voiceProfile, praiseCacheKey)
  }

  function handleNext() {
    setPraise(null)
    setIndex((i) => (i + 1) % order.length)
  }

  function handleSelectLevel(lvl: HandwritingLevel) {
    setOrder(shuffle(BANK_BY_CATEGORY[category]))
    setIndex(0)
    setLevel(lvl)
  }

  function handleBack() {
    if (level === null) {
      onBack()
      return
    }
    setLevel(null)
    setPraise(null)
    setIndex(0)
  }

  if (level === null) {
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
        <p className="subtitle">{t('handwritingLevelSelectTitle')}</p>
        <div className="level-grid">
          <button type="button" className="level-button" onClick={() => handleSelectLevel(1)}>
            <span className="level-number">{t('handwritingLevel1Label')}</span>
            <span className="level-stars">★☆</span>
            <span className="hint-caption">{t('handwritingLevel1Description')}</span>
          </button>
          <button type="button" className="level-button" onClick={() => handleSelectLevel(2)}>
            <span className="level-number">{t('handwritingLevel2Label')}</span>
            <span className="level-stars">★★</span>
            <span className="hint-caption">{t('handwritingLevel2Description')}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="top-bar">
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="secondary-button" onClick={handleBack}>
            {t('backButton')}
          </button>
          <button type="button" className="secondary-button" onClick={onHome}>
            {t('backHomeButton')}
          </button>
        </div>
        <CategoryHeader category={category} />
      </div>

      <p className="subtitle">{t(level === 1 ? 'handwritingTracePrompt' : 'handwritingListenWritePrompt')}</p>

      {level === 2 && !praise && (
        <TtsButton text={speechPhrase} lang="ja-JP" label="listen" size={72} voiceProfile={voiceProfile} cacheKey={cacheKey} />
      )}

      {praise ? (
        <div className="handwriting-praise">
          <div className="handwriting-stars" aria-hidden="true">
            {'★'.repeat(praise.stars)}
            {'☆'.repeat(3 - praise.stars)}
          </div>
          {/* The answer check — level 1 already showed this faintly the whole time, but
              level 2 (listen & write) never shows the glyph at all until now, so this is
              the child's first chance to compare what they wrote against the real thing. */}
          <p className="hint-caption">{t('handwritingAnswerLabel')}</p>
          <HiraganaChar char={entry.char} size={96} />
          <p className="handwriting-praise-text">{praise.text}</p>
          <button type="button" className="primary-button" onClick={handleNext}>
            {t('nextButton')}
          </button>
        </div>
      ) : (
        <HandwritingCanvas
          key={`${level}-${entry.id}`}
          char={entry.char}
          showGuide={level === 1}
          doneLabel={t('handwritingDoneButton')}
          clearLabel={t('handwritingClearButton')}
          onDone={handleDone}
        />
      )}
    </div>
  )
}
