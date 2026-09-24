import { useI18n } from '../i18n/I18nContext'
import { CategoryHeader } from '../components/CategoryHeader'

interface LogicEntryScreenProps {
  onSelect: (mode: 'practice' | 'sudoku') => void
  /** one step back — from here, the same as onHome since Home is the only screen that
   * opens this one, but kept for consistency with every other screen's back button pair
   * (see EnglishEntryScreen's identical comment). */
  onBack: () => void
  onHome: () => void
}

/** ろんり's home-screen card opens this れんしゅう/すうどく chooser — see
 * AdditionEntryScreen's identical comment for why this exists as its own flat step now
 * instead of a secondary button on LevelSelectScreen. */
export function LogicEntryScreen({ onSelect, onBack, onHome }: LogicEntryScreenProps) {
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
        <CategoryHeader category="logic" />
      </div>

      <p className="subtitle">{t('modeEntryTitle')}</p>

      <div className="level-grid">
        <button type="button" className="level-button" onClick={() => onSelect('practice')}>
          <span className="level-number">{t('categoryLogic')}</span>
          <span className="hint-caption">{t('logicEntryPracticeDescription')}</span>
        </button>
        <button type="button" className="level-button" onClick={() => onSelect('sudoku')}>
          <span className="level-number">{t('sudokuButton')}</span>
          <span className="hint-caption">{t('logicEntrySudokuDescription')}</span>
        </button>
      </div>
    </div>
  )
}
