import { useEffect, useState } from 'react'
import { hiraganaBank, hiraganaSpeechPhrase, type HiraganaEntry } from '../domain/hiraganaBank'
import { katakanaBank, katakanaSpeechPhrase, type KatakanaEntry } from '../domain/katakanaBank'
import { alphabetBank } from '../domain/alphabetBank'
import { pickHandwritingPraise } from '../domain/handwritingPraise'
import { useI18n } from '../i18n/I18nContext'
import { CategoryHeader } from '../components/CategoryHeader'
import { HandwritingCanvas } from '../components/HandwritingCanvas'
import { HiraganaChar } from '../components/HiraganaChar'
import { TtsButton } from '../components/TtsButton'
import { characterThemes } from '../components/characters/characterThemes'
import { speak, type SpeechLang } from '../lib/tts'
import { playCorrectSfx } from '../lib/sfx'

type HandwritingCategory = 'hiragana' | 'katakana' | 'alphabet'

interface HandwritingScreenProps {
  category: HandwritingCategory
  /** one step back — the screen this was opened from (LevelSelectScreen) */
  onBack: () => void
  onHome: () => void
}

type HandwritingLevel = 1 | 2

/** Alphabet practice has no mnemonic/row — just a glyph to write — since case doesn't
 * change a letter's name (unlike hiragana/katakana, where every glyph is spoken via its
 * own dedicated phrase-building function). */
interface AlphabetWritableEntry {
  id: string
  char: string
  case: 'upper' | 'lower'
  /** Always the upper-case form, even for a lower-case entry — a letter's *name* doesn't
   * change with case, so speech always uses this rather than `char`. Sending a bare
   * lower-case `char` to TTS is also outright wrong for some letters ("a"/"i" are real
   * English words, not just the letter name, and would be read as such). */
  upper: string
  /** The base alphabetBank id ("a".."z"), shared by both this letter's upper and lower
   * entries — used to key the pre-rendered alphabet-letter-*.wav cache (see
   * generate-alphabet-audio-en.py), since the same audio covers both cases. */
  letterId: string
}

/** Upper and lower case are both practiced, as two separate glyphs to draw — not a single
 * "A/a" entry — the same way hiragana/katakana practice one glyph at a time. `case` is kept
 * as its own field (rather than derived from `char`'s letter case, which would break for
 * letters with no case distinction in appearance) so level 2 can tell the child which case
 * to write — the spoken letter name alone ("A") can't distinguish "A" from "a". */
const ALPHABET_HANDWRITING_BANK: AlphabetWritableEntry[] = alphabetBank.flatMap((a) => [
  { id: `${a.id}-upper`, char: a.upper, case: 'upper' as const, upper: a.upper, letterId: a.id },
  { id: `${a.id}-lower`, char: a.lower, case: 'lower' as const, upper: a.upper, letterId: a.id },
])

type WritableEntry = HiraganaEntry | KatakanaEntry | AlphabetWritableEntry

const BANK_BY_CATEGORY: Record<HandwritingCategory, WritableEntry[]> = {
  hiragana: hiraganaBank,
  katakana: katakanaBank,
  alphabet: ALPHABET_HANDWRITING_BANK,
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

/** hiragana/katakana speak their own script (spoken phrase wraps the glyph with a mnemonic
 * word, see {hiragana,katakana}SpeechPhrase); alphabet just speaks the letter's name (see
 * the phonics-to-letter-name change in questionGenerators/alphabet.ts — this mirrors it),
 * always using the upper-case form (see AlphabetWritableEntry.upper's comment).
 * The casts are safe: `entry` always comes from BANK_BY_CATEGORY[category], so its runtime
 * shape always matches whichever branch `category` selects here. */
function speechInfoFor(category: HandwritingCategory, entry: WritableEntry): { phrase: string; lang: SpeechLang } {
  if (category === 'hiragana') return { phrase: hiraganaSpeechPhrase(entry as HiraganaEntry), lang: 'ja-JP' }
  if (category === 'katakana') return { phrase: katakanaSpeechPhrase(entry as KatakanaEntry), lang: 'ja-JP' }
  return { phrase: (entry as AlphabetWritableEntry).upper, lang: 'en-US' }
}

export function HandwritingScreen({ category, onBack, onHome }: HandwritingScreenProps) {
  const { t, lang } = useI18n()
  const [level, setLevel] = useState<HandwritingLevel | null>(null)
  const [index, setIndex] = useState(0)
  const [order, setOrder] = useState<WritableEntry[]>(() => shuffle(BANK_BY_CATEGORY[category]))
  const [praise, setPraise] = useState<{ stars: number; text: string } | null>(null)
  const entry = order[index % order.length]
  const voiceProfile = characterThemes[category].voiceProfile
  // Alphabet's cache key is keyed by the base letter, not the upper/lower entry id — the
  // same alphabet-letter-*.wav (see generate-alphabet-audio-en.py) covers both cases,
  // since a letter's spoken name doesn't change with case.
  const cacheKey =
    category === 'alphabet'
      ? `alphabet-letter-${(entry as AlphabetWritableEntry).letterId}`
      : `${category}-${entry.id}`
  const { phrase: speechPhrase, lang: speechLang } = speechInfoFor(category, entry)

  useEffect(() => {
    if (level !== 2 || praise) return
    speak(speechPhrase, speechLang, voiceProfile, cacheKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, entry.id, praise])

  function handleDone(stars: number) {
    playCorrectSfx()
    const { text, cacheKey: praiseCacheKey } = pickHandwritingPraise(lang, category)
    setPraise({ stars, text })
    const praiseSpeechLang: SpeechLang = lang === 'ja' ? 'ja-JP' : 'en-US'
    speak(text, praiseSpeechLang, voiceProfile, praiseCacheKey)
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
        <>
          {category === 'alphabet' && (
            <span className={`handwriting-case-badge handwriting-case-badge--${(entry as AlphabetWritableEntry).case}`}>
              {t((entry as AlphabetWritableEntry).case === 'upper' ? 'handwritingCaseUpper' : 'handwritingCaseLower')}
            </span>
          )}
          <TtsButton
            text={speechPhrase}
            lang={speechLang}
            label="listen"
            size={72}
            voiceProfile={voiceProfile}
            cacheKey={cacheKey}
          />
        </>
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
