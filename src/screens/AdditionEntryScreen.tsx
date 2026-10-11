import { useI18n } from '../i18n/I18nContext'
import { CategoryHeader } from '../components/CategoryHeader'
import { ScreenTopBar } from '../components/ScreenTopBar'
import { CharacterPortrait } from '../components/characters/CharacterPortrait'
import { characterThemes } from '../components/characters/characterThemes'

interface AdditionEntryScreenProps {
  onSelect: (mode: 'practice' | 'missingOperand') => void
  /** one step back — from here, the same as onHome since Home is the only screen that
   * opens this one, but kept for consistency with every other screen's back button pair
   * (see EnglishEntryScreen's identical comment). */
  onBack: () => void
  onHome: () => void
}

/** たしざん's home-screen card opens this れんしゅう/□のけいさん chooser instead of going
 * straight to LevelSelectScreen — mirrors KanjiEntryScreen's role exactly. Previously
 * missingOperandAddition was reached via a secondary button bolted onto LevelSelectScreen
 * itself (alongside the ★-level grid); pulling it out to its own flat chooser step here
 * makes every multi-mode subject in the app follow the same "pick a mode, then pick a
 * level" shape instead of some subjects burying their second mode as a small button next
 * to the level grid. */
export function AdditionEntryScreen({ onSelect, onBack, onHome }: AdditionEntryScreenProps) {
  const { t } = useI18n()

  return (
    <div className="screen">
      <ScreenTopBar onBack={onBack} onHome={onHome}>
        <CategoryHeader category="addition" />
      </ScreenTopBar>

      <div className="screen-body">
        <CharacterPortrait theme={characterThemes.addition} mood="happy" size={150} className="character-portrait--hero" />

        <p className="subtitle">{t('modeEntryTitle')}</p>

        <div className="level-grid mode-grid">
          <button type="button" className="level-button mode-card" onClick={() => onSelect('practice')}>
            <span className="mode-card-label">{t('categoryAddition')}</span>
            <span className="mode-card-description">{t('additionEntryPracticeDescription')}</span>
          </button>
          <button type="button" className="level-button mode-card" onClick={() => onSelect('missingOperand')}>
            <span className="mode-card-label">{t('missingOperandButton')}</span>
            <span className="mode-card-description">{t('additionEntryMissingDescription')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
