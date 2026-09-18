import { useEffect, useState } from 'react'
import { hiraganaBank, hiraganaSpeechPhrase, type HiraganaEntry } from '../domain/hiraganaBank'
import { katakanaBank, katakanaSpeechPhrase, type KatakanaEntry } from '../domain/katakanaBank'
import { alphabetBank, alphabetSpeechPhrase, getAlphabetById } from '../domain/alphabetBank'
import { pickHandwritingPraise } from '../domain/handwritingPraise'
import { useI18n } from '../i18n/I18nContext'
import { CategoryHeader } from '../components/CategoryHeader'
import { HandwritingCanvas } from '../components/HandwritingCanvas'
import { HiraganaChar } from '../components/HiraganaChar'
import { TtsButton } from '../components/TtsButton'
import { characterThemes } from '../components/characters/characterThemes'
import { speak, type SpeechLang } from '../lib/tts'
import { playCorrectSfx } from '../lib/sfx'
import { shuffle } from '../lib/shuffle'

type HandwritingCategory = 'hiragana' | 'katakana' | 'alphabet'

interface HandwritingScreenProps {
  category: HandwritingCategory
  /** one step back — MojiModeEntryScreen, since that's the only screen that opens this one
   * now (see that screen's own comment: きいてかく is reached directly, not through an
   * internal なぞる/きいてかく chooser here anymore — this screen is level-2-only). */
  onBack: () => void
  onHome: () => void
}

/** Alphabet practice has no mnemonic/row — just a glyph to write — since case doesn't
 * change a letter's name (unlike hiragana/katakana, where every glyph is spoken via its
 * own dedicated phrase-building function). */
interface AlphabetWritableEntry {
  id: string
  char: string
  case: 'upper' | 'lower'
  /** The base alphabetBank id ("a".."z"), shared by both this letter's upper and lower
   * entries — used to look up the mnemonic phrase and key the pre-rendered
   * alphabet-letter-*.wav cache (see alphabetSpeechPhrase / generate-alphabet-audio-en.py),
   * since the same audio covers both cases (a letter's name doesn't change with case). */
  letterId: string
}

/** Upper and lower case are both practiced, as two separate glyphs to draw — not a single
 * "A/a" entry — the same way hiragana/katakana practice one glyph at a time. `case` is kept
 * as its own field (rather than derived from `char`'s letter case, which would break for
 * letters with no case distinction in appearance) so this screen can tell the child which
 * case to write — the spoken letter name alone ("A") can't distinguish "A" from "a". */
const ALPHABET_HANDWRITING_BANK: AlphabetWritableEntry[] = alphabetBank.flatMap((a) => [
  { id: `${a.id}-upper`, char: a.upper, case: 'upper' as const, letterId: a.id },
  { id: `${a.id}-lower`, char: a.lower, case: 'lower' as const, letterId: a.id },
])

type WritableEntry = HiraganaEntry | KatakanaEntry | AlphabetWritableEntry

const BANK_BY_CATEGORY: Record<HandwritingCategory, WritableEntry[]> = {
  hiragana: hiraganaBank,
  katakana: katakanaBank,
  alphabet: ALPHABET_HANDWRITING_BANK,
}

/** All three wrap their glyph in a mnemonic phrase for clearer, more natural TTS — see
 * {hiragana,katakana,alphabet}SpeechPhrase. alphabet's phrase always uses the upper-case
 * form (see AlphabetWritableEntry.upper's comment) since a letter's name doesn't change
 * with case. The casts are safe: `entry` always comes from BANK_BY_CATEGORY[category], so
 * its runtime shape always matches whichever branch `category` selects here. */
function speechInfoFor(category: HandwritingCategory, entry: WritableEntry): { phrase: string; lang: SpeechLang } {
  if (category === 'hiragana') return { phrase: hiraganaSpeechPhrase(entry as HiraganaEntry), lang: 'ja-JP' }
  if (category === 'katakana') return { phrase: katakanaSpeechPhrase(entry as KatakanaEntry), lang: 'ja-JP' }
  return { phrase: alphabetSpeechPhrase(getAlphabetById((entry as AlphabetWritableEntry).letterId)), lang: 'en-US' }
}

/** きいて かく (listen & write) practice — shows no visual guide at all, the child hears
 * the reading/name and writes the glyph from memory. This is now always level-2: なぞる
 * (stroke-order trace) is reached directly from MojiModeEntryScreen via KanaTraceScreen/
 * AlphabetTraceScreen instead of through this component (see that screen's own comment for
 * why the two used to be bundled here behind an internal chooser and no longer are). */
export function HandwritingScreen({ category, onBack, onHome }: HandwritingScreenProps) {
  const { t, lang } = useI18n()
  const [index, setIndex] = useState(0)
  const [order] = useState<WritableEntry[]>(() => shuffle(BANK_BY_CATEGORY[category]))
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
    if (praise) return
    speak(speechPhrase, speechLang, voiceProfile, cacheKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id, praise])

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

      <p className="subtitle">{t('handwritingListenWritePrompt')}</p>

      {!praise && (
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
          {/* きいてかく never shows the glyph at all until now, so this is the child's
              first chance to compare what they wrote against the real thing. */}
          <p className="hint-caption">{t('handwritingAnswerLabel')}</p>
          <HiraganaChar char={entry.char} size={96} />
          <p className="handwriting-praise-text">{praise.text}</p>
          <button type="button" className="primary-button next-button" onClick={handleNext}>
            {t('nextButton')}
          </button>
        </div>
      ) : (
        <HandwritingCanvas
          key={entry.id}
          char={entry.char}
          showGuide={false}
          doneLabel={t('handwritingDoneButton')}
          clearLabel={t('handwritingClearButton')}
          onDone={handleDone}
        />
      )}
    </div>
  )
}
