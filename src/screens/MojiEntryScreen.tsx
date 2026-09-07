import { useI18n } from '../i18n/I18nContext'
import { CharacterPortrait } from '../components/characters/CharacterPortrait'
import { characterThemes } from '../components/characters/characterThemes'

interface MojiEntryScreenProps {
  onSelect: (category: 'hiragana' | 'katakana' | 'alphabet') => void
  /** one step back — from here, the same as onHome since Home is the only screen that
   * opens this one, but kept for consistency with every other screen's back button pair */
  onBack: () => void
  onHome: () => void
}

/** ひらがな/カタカナ/アルファベット are presented as a single combined home-screen card
 * (see HomeScreen) that opens this chooser instead of three separate cards — each remains
 * a fully separate category underneath, with its own independent level/progress and its
 * own "かく れんしゅう" handwriting mode (see LevelSelectScreen), this is just the entry
 * point. Modeled directly on EnglishEntryScreen's よむ/きく chooser. */
export function MojiEntryScreen({ onSelect, onBack, onHome }: MojiEntryScreenProps) {
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

      <CharacterPortrait theme={characterThemes.hiragana} mood="happy" size={150} />

      <p className="subtitle">{t('mojiEntryTitle')}</p>

      <div className="level-grid">
        <button type="button" className="level-button" onClick={() => onSelect('hiragana')}>
          <span className="level-number">{t('categoryHiragana')}</span>
          <span className="hint-caption">{t('mojiHiraganaDescription')}</span>
        </button>
        <button type="button" className="level-button" onClick={() => onSelect('katakana')}>
          <span className="level-number">{t('categoryKatakana')}</span>
          <span className="hint-caption">{t('mojiKatakanaDescription')}</span>
        </button>
        <button type="button" className="level-button" onClick={() => onSelect('alphabet')}>
          <span className="level-number">{t('categoryAlphabet')}</span>
          <span className="hint-caption">{t('mojiAlphabetDescription')}</span>
        </button>
      </div>
    </div>
  )
}
