import { useI18n } from '../i18n/I18nContext'
import { CategoryHeader } from '../components/CategoryHeader'
import type { KanjiGrade } from '../domain/kanjiBank'
import { ScreenTopBar } from '../components/ScreenTopBar'
import { CharacterPortrait } from '../components/characters/CharacterPortrait'
import { characterThemes } from '../components/characters/characterThemes'

const GRADES: KanjiGrade[] = [1, 2]

interface KanjiEntryScreenProps {
  /** Which school grade's kanji both modes below use — grade 2 is its own ★ track
   * ('kanji2'), see types.ts. */
  grade: KanjiGrade
  onChangeGrade: (grade: KanjiGrade) => void
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
export function KanjiEntryScreen({ grade, onChangeGrade, onSelect, onBack, onHome }: KanjiEntryScreenProps) {
  const { t } = useI18n()

  return (
    <div className="screen">
      <ScreenTopBar onBack={onBack} onHome={onHome}>
        <CategoryHeader category="kanji" />
      </ScreenTopBar>

      <div className="screen-body">
        <CharacterPortrait theme={characterThemes.kanji} mood="happy" size={150} className="character-portrait--hero" />

        <div className="set-size-toggle">
          {GRADES.map((g) => (
            <button
              key={g}
              type="button"
              className={`set-size-button ${grade === g ? 'active' : ''}`.trim()}
              onClick={() => onChangeGrade(g)}
            >
              {t(g === 1 ? 'kanjiGrade1Label' : 'kanjiGrade2Label')}
            </button>
          ))}
        </div>

        <p className="subtitle">{t('kanjiEntryTitle')}</p>

        <div className="level-grid mode-grid">
          <button type="button" className="level-button mode-card" onClick={() => onSelect('quiz')}>
            <span className="mode-card-label">{t('kanjiEntryQuizLabel')}</span>
            <span className="mode-card-description">{t('kanjiEntryQuizDescription')}</span>
          </button>
          <button type="button" className="level-button mode-card" onClick={() => onSelect('trace')}>
            <span className="mode-card-label">{t('kanjiEntryTraceLabel')}</span>
            <span className="mode-card-description">{t('kanjiEntryTraceDescription')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
