import { useI18n } from '../i18n/I18nContext'
import { CategoryHeader } from '../components/CategoryHeader'
import { ScreenTopBar } from '../components/ScreenTopBar'
import { CharacterPortrait } from '../components/characters/CharacterPortrait'
import { characterThemes } from '../components/characters/characterThemes'

interface SubtractionEntryScreenProps {
  onSelect: (mode: 'practice' | 'missingOperand') => void
  /** one step back — from here, the same as onHome since Home is the only screen that
   * opens this one, but kept for consistency with every other screen's back button pair
   * (see EnglishEntryScreen's identical comment). */
  onBack: () => void
  onHome: () => void
}

/** ひきざん's home-screen card opens this れんしゅう/□のけいさん chooser — see
 * AdditionEntryScreen's identical comment for why this exists as its own flat step now
 * instead of a secondary button on LevelSelectScreen. */
export function SubtractionEntryScreen({ onSelect, onBack, onHome }: SubtractionEntryScreenProps) {
  const { t } = useI18n()

  return (
    <div className="screen">
      <ScreenTopBar onBack={onBack} onHome={onHome}>
        <CategoryHeader category="subtraction" />
      </ScreenTopBar>

      <div className="screen-body">
        <CharacterPortrait theme={characterThemes.subtraction} mood="happy" size={150} className="character-portrait--hero" />

        <p className="subtitle">{t('modeEntryTitle')}</p>

        <div className="level-grid mode-grid">
          <button type="button" className="level-button mode-card" onClick={() => onSelect('practice')}>
            <span className="mode-card-label">{t('categorySubtraction')}</span>
            <span className="mode-card-description">{t('subtractionEntryPracticeDescription')}</span>
          </button>
          <button type="button" className="level-button mode-card" onClick={() => onSelect('missingOperand')}>
            <span className="mode-card-label">{t('missingOperandButton')}</span>
            <span className="mode-card-description">{t('subtractionEntryMissingDescription')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
