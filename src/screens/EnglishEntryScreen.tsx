import { useI18n } from '../i18n/I18nContext'
import { CharacterPortrait } from '../components/characters/CharacterPortrait'
import { characterThemes } from '../components/characters/characterThemes'

interface EnglishEntryScreenProps {
  onSelect: (mode: 'englishSpelling' | 'englishListening') => void
  onBack: () => void
}

/** English is presented as a single combined home-screen card (see HomeScreen) that opens
 * this よむ/きく chooser instead of two separate cards — englishSpelling and
 * englishListening remain fully separate categories underneath, each with its own
 * independent level/progress (see LevelSelectScreen), this is just the entry point. */
export function EnglishEntryScreen({ onSelect, onBack }: EnglishEntryScreenProps) {
  const { t } = useI18n()

  return (
    <div className="screen">
      <div className="top-bar">
        <button type="button" className="secondary-button" onClick={onBack}>
          {t('backHomeButton')}
        </button>
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
      </div>
    </div>
  )
}
