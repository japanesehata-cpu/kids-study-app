import { useI18n } from '../i18n/I18nContext'
import { CategoryHeader } from '../components/CategoryHeader'

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
      <div className="top-bar">
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="icon-button" onClick={onBack} aria-label={t('backButton')}>
            ←
          </button>
          <button type="button" className="icon-button" onClick={onHome} aria-label={t('backHomeButton')}>
            ⌂
          </button>
        </div>
        <CategoryHeader category="addition" />
      </div>

      <p className="subtitle">{t('modeEntryTitle')}</p>

      <div className="level-grid">
        <button type="button" className="level-button" onClick={() => onSelect('practice')}>
          <span className="level-number">{t('categoryAddition')}</span>
          <span className="hint-caption">{t('additionEntryPracticeDescription')}</span>
        </button>
        <button type="button" className="level-button" onClick={() => onSelect('missingOperand')}>
          <span className="level-number">{t('missingOperandButton')}</span>
          <span className="hint-caption">{t('additionEntryMissingDescription')}</span>
        </button>
      </div>
    </div>
  )
}
