import { useI18n } from '../i18n/I18nContext'
import { CharacterPortrait } from '../components/characters/CharacterPortrait'
import { characterThemes } from '../components/characters/characterThemes'
import { CategoryHeader } from '../components/CategoryHeader'
import { ScreenTopBar } from '../components/ScreenTopBar'

interface EnglishEntryScreenProps {
  onSelect: (mode: 'englishSpelling' | 'englishListening' | 'englishSentence' | 'wordTrace') => void
  /** one step back — from here, the same as onHome since Home is the only screen that
   * opens this one, but kept for consistency with every other screen's back button pair */
  onBack: () => void
  onHome: () => void
}

/** English is presented as a single combined home-screen card (see HomeScreen) that opens
 * this よむ/きく/ぶんしょう chooser instead of three separate cards — englishSpelling,
 * englishListening, and englishSentence remain fully separate categories underneath, each
 * with its own independent level/progress (see LevelSelectScreen), this is just the entry
 * point. */
export function EnglishEntryScreen({ onSelect, onBack, onHome }: EnglishEntryScreenProps) {
  const { t } = useI18n()

  return (
    <div className="screen">
      <ScreenTopBar onBack={onBack} onHome={onHome}>
        <CategoryHeader category="englishSpelling" labelKey="categoryEnglish" />
      </ScreenTopBar>

      <div className="screen-body">
        <CharacterPortrait theme={characterThemes.englishSpelling} mood="happy" size={150} className="character-portrait--hero" />

        <p className="subtitle">{t('englishEntryTitle')}</p>

        <div className="level-grid mode-grid">
          <button type="button" className="level-button mode-card" onClick={() => onSelect('englishSpelling')}>
            <span className="mode-card-label">{t('englishEntryReadLabel')}</span>
            <span className="mode-card-description">{t('englishEntryReadDescription')}</span>
          </button>
          <button type="button" className="level-button mode-card" onClick={() => onSelect('englishListening')}>
            <span className="mode-card-label">{t('englishEntryListenLabel')}</span>
            <span className="mode-card-description">{t('englishEntryListenDescription')}</span>
          </button>
          <button type="button" className="level-button mode-card" onClick={() => onSelect('englishSentence')}>
            <span className="mode-card-label">{t('englishEntrySentenceLabel')}</span>
            <span className="mode-card-description">{t('englishEntrySentenceDescription')}</span>
          </button>
          <button type="button" className="level-button mode-card" onClick={() => onSelect('wordTrace')}>
            <span className="mode-card-label">{t('englishEntryWordLabel')}</span>
            <span className="mode-card-description">{t('englishEntryWordDescription')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
