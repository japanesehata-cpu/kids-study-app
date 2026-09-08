import { useI18n } from '../i18n/I18nContext'
import { CategoryHeader } from '../components/CategoryHeader'

interface KanjiEntryScreenProps {
  onSelect: (mode: 'quiz' | 'trace') => void
  /** one step back — from here, the same as onHome since Home is the only screen that
   * opens this one, but kept for consistency with every other screen's back button pair
   * (see EnglishEntryScreen's identical comment). */
  onBack: () => void
  onHome: () => void
}

/** かんじ's home-screen card opens this よみをえらぶ/なぞってかく chooser instead of
 * going straight to LevelSelectScreen — mirrors EnglishEntryScreen's role exactly. 'quiz'
 * routes to the existing scored kanji category (level/progress unchanged); 'trace' routes
 * to KanjiTraceScreen, an unscored practice activity that is NOT a Category at all (see
 * that screen's own top comment) — same relationship HandwritingScreen has to
 * hiragana/katakana/alphabet. */
export function KanjiEntryScreen({ onSelect, onBack, onHome }: KanjiEntryScreenProps) {
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
        <CategoryHeader category="kanji" />
      </div>

      <p className="subtitle">{t('kanjiEntryTitle')}</p>

      <div className="level-grid">
        <button type="button" className="level-button" onClick={() => onSelect('quiz')}>
          <span className="level-number">{t('kanjiEntryQuizLabel')}</span>
          <span className="hint-caption">{t('kanjiEntryQuizDescription')}</span>
        </button>
        <button type="button" className="level-button" onClick={() => onSelect('trace')}>
          <span className="level-number">{t('kanjiEntryTraceLabel')}</span>
          <span className="hint-caption">{t('kanjiEntryTraceDescription')}</span>
        </button>
      </div>
    </div>
  )
}
