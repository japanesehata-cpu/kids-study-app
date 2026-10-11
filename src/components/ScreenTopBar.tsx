import type { ReactNode } from 'react'
import { useI18n } from '../i18n/I18nContext'

interface ScreenTopBarProps {
  onBack: () => void
  onHome: () => void
  /** Right-hand side of the bar — usually the screen's CategoryHeader. */
  children?: ReactNode
}

/** The もどる/ホームへ pair every screen below Home starts with (docs/functional-design.md 2),
 * drawn as icons rather than the bare ←/⌂ text glyphs, which rendered thin and in the
 * system font next to the rounded UI. */
export function ScreenTopBar({ onBack, onHome, children }: ScreenTopBarProps) {
  const { t } = useI18n()

  return (
    <div className="top-bar">
      <div className="top-bar-nav">
        <button type="button" className="icon-button nav-button" onClick={onBack} aria-label={t('backButton')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <button type="button" className="icon-button nav-button" onClick={onHome} aria-label={t('backHomeButton')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 11l8-7 8 7" />
            <path d="M6.5 9.5V19h11V9.5" />
            <path d="M10.5 19v-4.5h3V19" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  )
}
