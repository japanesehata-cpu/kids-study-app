import { useI18n } from '../i18n/I18nContext'
import { CharacterPortrait } from '../components/characters/CharacterPortrait'
import { characterThemes } from '../components/characters/characterThemes'

interface EnglishEntryScreenProps {
  onSelect: (mode: 'englishSpelling' | 'englishListening' | 'englishSentence') => void
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
      <div className="top-bar">
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="secondary-button" onClick={onBack}>
            {t('backButton')}
          </button>
          <button type="button" className="secondary-button" onClick={onHome}>
            {t('backHomeButton')}
          </button>
        </div>
      </div>

      <CharacterPortrait theme={characterThemes.englishSpelling} mood="happy" size={150} />

      <p className="subtitle">{t('englishEntryTitle')}</p>

      <div className="level-grid">
        <button type="button" className="level-button" onClick={() => onSelect('englishSpelling')}>
          <span className="level-number">{t('englishEntryReadLabel')}</span>
          <span className="hint-caption">{t('englishEntryReadDescription')}</span>
        </button>
        <button type="button" className="level-button" onClick={() => onSelect('englishListening')}>
          <span className="level-number">{t('englishEntryListenLabel')}</span>
          <span className="hint-caption">{t('englishEntryListenDescription')}</span>
        </button>
        <button type="button" className="level-button" onClick={() => onSelect('englishSentence')}>
          <span className="level-number">{t('englishEntrySentenceLabel')}</span>
          <span className="hint-caption">{t('englishEntrySentenceDescription')}</span>
        </button>
      </div>
    </div>
  )
}
