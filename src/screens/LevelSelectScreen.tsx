import { useState } from 'react'
import type { Category, Level } from '../domain/types'
import { getCategoryMaxLevel } from '../domain/progress'
import { useI18n } from '../i18n/I18nContext'
import { CharacterPortrait } from '../components/characters/CharacterPortrait'
import { characterThemes } from '../components/characters/characterThemes'
import { CategoryHeader } from '../components/CategoryHeader'
import { InteractiveClock } from '../components/InteractiveClock'

interface LevelSelectScreenProps {
  category: Category
  onSelectLevel: (level: Level, setSize: number) => void
  onOpenHandwriting?: () => void
  onBack: () => void
}

const SET_SIZE_OPTIONS = [5, 10] as const

export function LevelSelectScreen({
  category,
  onSelectLevel,
  onOpenHandwriting,
  onBack,
}: LevelSelectScreenProps) {
  const { t } = useI18n()
  const theme = characterThemes[category]
  const [setSize, setSetSize] = useState<number>(5)
  const maxLevel = getCategoryMaxLevel(category)
  const levels = Array.from({ length: maxLevel }, (_, i) => (i + 1) as Level)

  return (
    <div className="screen">
      <div className="top-bar">
        <button type="button" className="secondary-button" onClick={onBack}>
          {t('backHomeButton')}
        </button>
        <CategoryHeader category={category} />
      </div>

      <CharacterPortrait theme={theme} mood="happy" size={150} />

      {category === 'clock' && <InteractiveClock size={220} />}

      <p className="subtitle">{t('levelSelectTitle')}</p>

      {(category === 'hiragana' || category === 'katakana') && onOpenHandwriting && (
        <button type="button" className="secondary-button" onClick={onOpenHandwriting}>
          {t('handwritingButton')}
        </button>
      )}

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

      <div className="level-grid">
        {levels.map((level) => (
          <button
            key={level}
            type="button"
            className="level-button"
            onClick={() => onSelectLevel(level, setSize)}
          >
            <span className="level-number">{level}</span>
            <span className="level-stars">
              {'★'.repeat(level)}
              {'☆'.repeat(maxLevel - level)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
