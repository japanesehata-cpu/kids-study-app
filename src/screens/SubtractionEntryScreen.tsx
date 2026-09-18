import { useI18n } from '../i18n/I18nContext'
import { CategoryHeader } from '../components/CategoryHeader'

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
      <div className="top-bar">
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="secondary-button" onClick={onBack}>
            {t('backButton')}
          </button>
          <button type="button" className="secondary-button" onClick={onHome}>
            {t('backHomeButton')}
          </button>
        </div>
        <CategoryHeader category="subtraction" />
      </div>

      <p className="subtitle">{t('modeEntryTitle')}</p>

      <div className="level-grid">
        <button type="button" className="level-button" onClick={() => onSelect('practice')}>
          <span className="level-number">{t('categorySubtraction')}</span>
          <span className="hint-caption">{t('subtractionEntryPracticeDescription')}</span>
        </button>
        <button type="button" className="level-button" onClick={() => onSelect('missingOperand')}>
          <span className="level-number">{t('missingOperandButton')}</span>
          <span className="hint-caption">{t('subtractionEntryMissingDescription')}</span>
        </button>
      </div>
    </div>
  )
}
