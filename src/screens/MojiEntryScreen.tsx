import { useI18n } from '../i18n/I18nContext'
import { CharacterPortrait } from '../components/characters/CharacterPortrait'
import { characterThemes } from '../components/characters/characterThemes'
import { CategoryHeader } from '../components/CategoryHeader'
import { ScreenTopBar } from '../components/ScreenTopBar'

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
      <ScreenTopBar onBack={onBack} onHome={onHome}>
        <CategoryHeader category="hiragana" labelKey="categoryMoji" />
      </ScreenTopBar>

      <div className="screen-body">
        <CharacterPortrait theme={characterThemes.hiragana} mood="happy" size={150} className="character-portrait--hero" />

        <p className="subtitle">{t('mojiEntryTitle')}</p>

        <div className="level-grid mode-grid">
          <button type="button" className="level-button mode-card" onClick={() => onSelect('hiragana')}>
            <span className="mode-card-label">{t('categoryHiragana')}</span>
            <span className="mode-card-description">{t('mojiHiraganaDescription')}</span>
          </button>
          <button type="button" className="level-button mode-card" onClick={() => onSelect('katakana')}>
            <span className="mode-card-label">{t('categoryKatakana')}</span>
            <span className="mode-card-description">{t('mojiKatakanaDescription')}</span>
          </button>
          <button type="button" className="level-button mode-card" onClick={() => onSelect('alphabet')}>
            <span className="mode-card-label">{t('categoryAlphabet')}</span>
            <span className="mode-card-description">{t('mojiAlphabetDescription')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
