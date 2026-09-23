import { useState } from 'react'
import { useI18n } from '../i18n/I18nContext'

interface NumberPadProps {
  onSubmit: (value: number) => void
  disabled: boolean
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓']
const MAX_DIGITS = 3

/** A calculator-style answer pad, replacing the choice-grid for arithmetic questions (see
 * QuizScreen.tsx's isArithmetic exclusion) — the child types the answer instead of
 * recognizing it among 4 pre-computed distractors. Mounted fresh per question (parent
 * passes `key={question.id}`, same convention as SudokuBoard/SpotDifferenceBoard) so
 * `typed` always starts empty. */
export function NumberPad({ onSubmit, disabled }: NumberPadProps) {
  const { t } = useI18n()
  const [typed, setTyped] = useState('')

  function pressDigit(d: string) {
    if (disabled) return
    if (d === '⌫') {
      setTyped((cur) => cur.slice(0, -1))
      return
    }
    if (d === '✓') {
      if (typed.length === 0) return
      onSubmit(Number(typed))
      return
    }
    setTyped((cur) => (cur.length >= MAX_DIGITS ? cur : cur + d))
  }

  return (
    <div className="number-pad">
      <div className="number-pad-display">{typed || '?'}</div>
      {/* Once answered (disabled), the grid has nothing left to do — the typed value stays
          visible in the display above — so it's dropped entirely rather than kept around
          as inert, greyed-out buttons. This is a real chunk of the post-answer screen's
          height, exactly where the feedback/explanation/next-button need the room. */}
      {!disabled && (
        <div className="number-pad-grid">
          {DIGITS.map((d) => (
            <button
              key={d}
              type="button"
              className={`number-pad-button ${d === '✓' ? 'number-pad-submit' : ''}`.trim()}
              onClick={() => pressDigit(d)}
              disabled={d === '✓' && typed.length === 0}
              aria-label={d === '⌫' ? t('numberPadClearLabel') : d === '✓' ? t('numberPadSubmitLabel') : d}
            >
              {d}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
