import type { Category } from '../domain/types'
import type { DictionaryKey } from '../i18n/dictionary'
import type { PlayStreak } from '../domain/streak'
import { CATEGORY_META } from '../domain/categoryMeta'
import { useI18n } from '../i18n/I18nContext'
import { speak, type SpeechLang } from '../lib/tts'
import { CharacterPortrait } from '../components/characters/CharacterPortrait'
import { characterThemes } from '../components/characters/characterThemes'
import { LanguageToggle } from '../components/LanguageToggle'

interface HomeScreenProps {
  streak: PlayStreak
  onSelectCategory: (category: Category) => void
  onOpenEnglishEntry: () => void
  onOpenMojiEntry: () => void
  onOpenParentGate: () => void
}

// English is shown as a single combined card/portrait on the home screen (see
// EnglishEntryScreen) rather than three — englishListening and englishSentence are dropped
// from every home-screen list and englishSpelling stands in as the shared slot, relabeled
// below. Likewise ひらがな/カタカナ/アルファベット collapse to one "もじ" card (see
// MojiEntryScreen) — katakana/alphabet are dropped and hiragana stands in as the shared
// slot, relabeled the same way. sudoku and missingOperandAddition/missingOperandSubtraction
// are also dropped — each is reached via a button on another category's own level-select
// instead (see LevelSelectScreen.tsx), not its own home-screen card.
const HOME_CATEGORY_META = CATEGORY_META.filter(
  (c) =>
    c.category !== 'englishListening' &&
    c.category !== 'englishSentence' &&
    c.category !== 'katakana' &&
    c.category !== 'alphabet' &&
    c.category !== 'sudoku' &&
    c.category !== 'missingOperandAddition' &&
    c.category !== 'missingOperandSubtraction',
)
const ALL_CATEGORIES: Category[] = HOME_CATEGORY_META.map((c) => c.category)

const INTRO_KEY_BY_CATEGORY: Record<Category, DictionaryKey> = {
  addition: 'introMomo',
  subtraction: 'introSora',
  englishSpelling: 'introHana',
  englishListening: 'introHana',
  logic: 'introKoko',
  hiragana: 'introYui',
  katakana: 'introPeko',
  // Stand-in for kanji's not-yet-generated "fumi" mascot (see characterThemes.ts) — reuses
  // yui's own intro line/voice, same reuse as everywhere else in this map.
  kanji: 'introYui',
  alphabet: 'introAru',
  clock: 'introToki',
  spotDifference: 'introMitsu',
  counting: 'introKazu',
  englishSentence: 'introHana',
  sudoku: 'introKoko',
  missingOperandAddition: 'introMomo',
  missingOperandSubtraction: 'introSora',
}

export function HomeScreen({
  streak,
  onSelectCategory,
  onOpenEnglishEntry,
  onOpenMojiEntry,
  onOpenParentGate,
}: HomeScreenProps) {
  const { t, lang } = useI18n()

  function handleIntroduce(category: Category) {
    const speechLang: SpeechLang = lang === 'ja' ? 'ja-JP' : 'en-US'
    // A pre-rendered file exists only for the Japanese intros (see
    // scripts/generate-tts-cache.mjs) — English already goes through the browser's own
    // TTS regardless of device, so there's nothing to gain from caching it too.
    const cacheKey = lang === 'ja' ? `intro-${category}` : undefined
    speak(t(INTRO_KEY_BY_CATEGORY[category]), speechLang, characterThemes[category].voiceProfile, cacheKey)
  }

  return (
    <div className="screen">
      <div className="top-bar">
        <h1 className="app-title">{t('appTitle')}</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {streak.currentStreak >= 1 && <span className="streak-badge">{t('streakBadge', { count: streak.currentStreak })}</span>}
          <LanguageToggle />
          <button
            type="button"
            className="icon-button"
            aria-label={t('settingsLabel')}
            onClick={onOpenParentGate}
          >
            ⚙️
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
        {ALL_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            className="character-intro-button"
            aria-label={t('introduceCharacterHint')}
            onClick={() => handleIntroduce(category)}
          >
            <CharacterPortrait theme={characterThemes[category]} mood="happy" size={110} />
          </button>
        ))}
      </div>

      <p className="hint-caption">{t('introduceCharacterHint')}</p>

      <p className="subtitle">{t('homeSubtitle')}</p>

      <div className="category-grid">
        {HOME_CATEGORY_META.map(({ category, symbol, labelKey }) => (
          <button
            key={category}
            type="button"
            className="category-card"
            onClick={() =>
              category === 'englishSpelling'
                ? onOpenEnglishEntry()
                : category === 'hiragana'
                  ? onOpenMojiEntry()
                  : onSelectCategory(category)
            }
          >
            <span className="category-symbol">{symbol}</span>
            <CharacterPortrait theme={characterThemes[category]} mood="happy" size={92} />
            <span>
              {t(category === 'englishSpelling' ? 'categoryEnglish' : category === 'hiragana' ? 'categoryMoji' : labelKey)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
