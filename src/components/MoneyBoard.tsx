import { useState } from 'react'
import type { MoneyQuestion } from '../domain/types'
import { getCoinById } from '../domain/moneyBank'
import { useI18n } from '../i18n/I18nContext'
import { playFoundSfx, playIncorrectSfx } from '../lib/sfx'
import { WordIcon } from './WordIcon'

interface MoneyBoardProps {
  question: MoneyQuestion
  promptText: string
  onComplete: () => void
  onFailed: () => void
  disabled: boolean
}

/** Same anti-brute-force reasoning as SudokuBoard.tsx's MAX_WRONG_GUESSES — without a
 * limit, a child could just tap every coin in turn with no consequence until the tray
 * happens to land on the target. Tapping a coin that would overshoot the target counts as
 * a mistake instead of being silently blocked, so there's a real cost to guessing blind. */
const MAX_WRONG_GUESSES = 5

/** A production task, not recognition (see MoneyQuestion's own comment) — the child taps
 * coins from `paletteCoinIds` (unlimited supply each) into a payment tray until its
 * running total exactly equals `targetAmount`. Mirrors SudokuBoard.tsx's
 * select→check→wrongCount→onFailed shape, minus the "select a cell first" step (there's
 * only one tray, so tapping a coin acts on it immediately). */
export function MoneyBoard({ question, promptText, onComplete, onFailed, disabled }: MoneyBoardProps) {
  const { t } = useI18n()
  const [trayCounts, setTrayCounts] = useState<Record<string, number>>({})
  const [wrongCount, setWrongCount] = useState(0)
  const [shakeCoinId, setShakeCoinId] = useState<string | null>(null)

  const trayTotal = Object.entries(trayCounts).reduce((sum, [id, n]) => sum + getCoinById(id).value * n, 0)
  const trayEntries = Object.entries(trayCounts).flatMap(([id, n]) => Array.from({ length: n }, () => id))

  function tapCoin(coinId: string) {
    if (disabled) return
    const value = getCoinById(coinId).value
    if (trayTotal + value > question.targetAmount) {
      playIncorrectSfx()
      setShakeCoinId(coinId)
      window.setTimeout(() => setShakeCoinId((cur) => (cur === coinId ? null : cur)), 350)
      const nextWrongCount = wrongCount + 1
      setWrongCount(nextWrongCount)
      if (nextWrongCount >= MAX_WRONG_GUESSES) onFailed()
      return
    }
    const nextTotal = trayTotal + value
    setTrayCounts((cur) => ({ ...cur, [coinId]: (cur[coinId] ?? 0) + 1 }))
    if (nextTotal === question.targetAmount) {
      playFoundSfx()
      onComplete()
    } else {
      playFoundSfx()
    }
  }

  function reset() {
    if (disabled || trayTotal === 0) return
    setTrayCounts({})
  }

  return (
    <div className="money-board">
      <p className="subtitle">{promptText}</p>
      <p className="money-wrong-count">
        {t('moneyWrongCount', { count: String(wrongCount), max: String(MAX_WRONG_GUESSES) })}
      </p>
      <div className="money-target">{question.targetAmount}えん</div>
      <div className="money-tray">
        {trayEntries.length === 0 ? (
          <span className="money-tray-empty">🪙</span>
        ) : (
          trayEntries.map((id, i) => <WordIcon key={`${id}-${i}`} wordId={id} size={44} />)
        )}
      </div>
      <p className="money-tray-total">{trayTotal}えん</p>
      <button
        type="button"
        className="secondary-button money-reset-button"
        onClick={reset}
        disabled={disabled || trayTotal === 0}
      >
        {t('moneyResetButton')}
      </button>
      <div className="money-palette">
        {question.paletteCoinIds.map((coinId) => (
          <button
            key={coinId}
            type="button"
            className={`money-palette-item ${shakeCoinId === coinId ? 'wrong' : ''}`.trim()}
            onClick={() => tapCoin(coinId)}
            disabled={disabled}
            aria-label={coinId}
          >
            <WordIcon wordId={coinId} size={44} />
          </button>
        ))}
      </div>
    </div>
  )
}
