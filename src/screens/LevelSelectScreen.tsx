import { useState } from 'react'
import type { Category, Level } from '../domain/types'
import { getCategoryMaxLevel } from '../domain/progress'
import { getLevelDescriptionKey, getSudokuClassicLevelDescriptionKey } from '../domain/levelDescriptions'
import type { ClockMode } from '../domain/questionGenerators/clock'
import type { SudokuMode } from '../domain/questionGenerators/sudoku'
import { useI18n } from '../i18n/I18nContext'
import { CharacterPortrait } from '../components/characters/CharacterPortrait'
import { characterThemes } from '../components/characters/characterThemes'
import { CategoryHeader } from '../components/CategoryHeader'
import { InteractiveClock } from '../components/InteractiveClock'

const CLOCK_MODE_OPTIONS: ClockMode[] = ['multipleChoice', 'setTime']
const SUDOKU_MODE_OPTIONS: SudokuMode[] = ['mini', 'classic']

interface LevelSelectScreenProps {
  category: Category
  /** `clockMode`/`sudokuMode` are only ever passed for their own category — see the mode
   * toggles below (an explicit, deliberate choice rather than a per-question random mix,
   * see questionGenerators/clock.ts's ClockMode / questionGenerators/sudoku.ts's
   * SudokuMode comments). */
  onSelectLevel: (level: Level, setSize: number, clockMode?: ClockMode, sudokuMode?: SudokuMode) => void
  /** one step back — Home for most categories, an Entry chooser (English/Kanji/Moji/
   * Addition/Subtraction/Logic) for subjects that have more than one practice mode — see
   * each Entry screen's own comment. This screen is now a pure level picker: every
   * subject's other modes (なぞる/きいてかく, すうどく, □のけいさん) are chosen one step
   * earlier, at that Entry screen, rather than via a secondary button bolted on here. */
  onBack: () => void
  onHome: () => void
}

const SET_SIZE_OPTIONS = [5, 10] as const

export function LevelSelectScreen({
  category,
  onSelectLevel,
  onBack,
  onHome,
}: LevelSelectScreenProps) {
  const { t } = useI18n()
  const theme = characterThemes[category]
  const [setSize, setSetSize] = useState<number>(5)
  const [clockMode, setClockMode] = useState<ClockMode>('multipleChoice')
  const [sudokuMode, setSudokuMode] = useState<SudokuMode>('mini')
  const maxLevel = getCategoryMaxLevel(category)
  const levels = Array.from({ length: maxLevel }, (_, i) => (i + 1) as Level)
  // Classic (9x9) sudoku is one big puzzle, not a set of separate small questions like
  // every other category (including mini sudoku, which really does generate `setSize`
  // separate 4x4 boards) — the 5問/10問 picker makes no sense here, so it's hidden and the
  // effective size is always 1.
  const isClassicSudoku = category === 'sudoku' && sudokuMode === 'classic'
  const effectiveSetSize = isClassicSudoku ? 1 : setSize

  return (
    <div className="screen">
      <div className="top-bar">
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="icon-button" onClick={onBack} aria-label={t('backButton')}>
            ←
          </button>
          <button type="button" className="icon-button" onClick={onHome} aria-label={t('backHomeButton')}>
            🏠
          </button>
        </div>
        <CategoryHeader category={category} />
      </div>

      <CharacterPortrait theme={theme} mood="happy" size={150} />

      {category === 'clock' && <InteractiveClock size={220} />}

      <p className="subtitle">{t('levelSelectTitle')}</p>

      {category === 'clock' && (
        <div className="set-size-toggle">
          {CLOCK_MODE_OPTIONS.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`set-size-button ${clockMode === mode ? 'active' : ''}`.trim()}
              onClick={() => setClockMode(mode)}
            >
              {t(mode === 'multipleChoice' ? 'clockModeReadLabel' : 'clockModeSetTimeLabel')}
            </button>
          ))}
        </div>
      )}

      {category === 'sudoku' && (
        <div className="set-size-toggle">
          {SUDOKU_MODE_OPTIONS.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`set-size-button ${sudokuMode === mode ? 'active' : ''}`.trim()}
              onClick={() => setSudokuMode(mode)}
            >
              {t(mode === 'mini' ? 'sudokuModeMiniLabel' : 'sudokuModeClassicLabel')}
            </button>
          ))}
        </div>
      )}

      {!isClassicSudoku && (
        <div className="set-size-toggle">
          {SET_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              className={`set-size-button ${setSize === size ? 'active' : ''}`.trim()}
              onClick={() => setSetSize(size)}
            >
              {t(size === 5 ? 'setSizeShortLabel' : 'setSizeLongLabel')}
            </button>
          ))}
        </div>
      )}

      <div className="level-grid">
        {levels.map((level) => {
          const descKey = isClassicSudoku ? getSudokuClassicLevelDescriptionKey(level) : getLevelDescriptionKey(category, level)
          return (
            <button
              key={level}
              type="button"
              className="level-button"
              onClick={() =>
                onSelectLevel(
                  level,
                  effectiveSetSize,
                  category === 'clock' ? clockMode : undefined,
                  category === 'sudoku' ? sudokuMode : undefined,
                )
              }
            >
              <span className="level-number">{level}</span>
              <span className="level-stars">
                {'★'.repeat(level)}
                {'☆'.repeat(maxLevel - level)}
              </span>
              {descKey && <span className="level-description">{t(descKey)}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
