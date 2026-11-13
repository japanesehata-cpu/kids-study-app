import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n/I18nContext'

interface ScreenTopBarProps {
  onBack: () => void
  onHome: () => void
  /** When true, ← and ⌂ each need a second tap within CONFIRM_WINDOW_MS to act — for a quiz
   * already under way, so a stray tap from a small child doesn't throw the round away
   * (docs/functional-design.md F-03). */
  confirmLeave?: boolean
  /** Right-hand side of the bar — usually the screen's CategoryHeader. */
  children?: ReactNode
}

export const CONFIRM_WINDOW_MS = 3000

type NavTarget = 'back' | 'home'

/** The もどる/ホームへ pair every screen below Home starts with (docs/functional-design.md 2),
 * drawn as icons rather than the bare ←/⌂ text glyphs, which rendered thin and in the
 * system font next to the rounded UI. */
export function ScreenTopBar({ onBack, onHome, confirmLeave = false, children }: ScreenTopBarProps) {
  const { t } = useI18n()
  const [armed, setArmed] = useState<NavTarget | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  function press(target: NavTarget) {
    const act = target === 'back' ? onBack : onHome
    if (!confirmLeave || armed === target) {
      if (timerRef.current) clearTimeout(timerRef.current)
      setArmed(null)
      act()
      return
    }
    setArmed(target)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setArmed(null), CONFIRM_WINDOW_MS)
  }

  const armedClass = (target: NavTarget) => (armed === target ? ' nav-button-armed' : '')

  return (
    <div className="top-bar">
      <div className="top-bar-nav">
        <button
          type="button"
          className={`icon-button nav-button${armedClass('back')}`}
          onClick={() => press('back')}
          aria-label={t('backButton')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          className={`icon-button nav-button${armedClass('home')}`}
          onClick={() => press('home')}
          aria-label={t('backHomeButton')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 11l8-7 8 7" />
            <path d="M6.5 9.5V19h11V9.5" />
            <path d="M10.5 19v-4.5h3V19" />
          </svg>
        </button>
        {armed && (
          <div className="nav-confirm-bubble" role="status">
            {t('leaveConfirm')}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
