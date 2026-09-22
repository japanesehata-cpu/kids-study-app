import { useState } from 'react'
import type { SudokuQuestion } from '../domain/types'
import type { SudokuMode } from '../domain/questionGenerators/sudoku'
import { useI18n } from '../i18n/I18nContext'
import { playFoundSfx, playIncorrectSfx } from '../lib/sfx'
import { WordIcon } from './WordIcon'

interface SudokuBoardProps {
  question: SudokuQuestion
  promptText: string
  /** Called exactly once, the moment every blank cell has been filled correctly. */
  onComplete: () => void
  /** Called exactly once, the moment the wrong-guess limit (see MAX_WRONG_GUESSES) is
   * reached before every blank was filled. */
  onFailed: () => void
  /** True once the round is already complete — further taps become no-ops. */
  disabled: boolean
}

interface WrongGuess {
  row: number
  col: number
}

function cellKey(row: number, col: number): string {
  return `${row},${col}`
}

/** Without a limit, a child (or an impatient adult) could just press every palette option
 * on a cell in turn — always free, no consequence — until one happens to be right, solving
 * the whole board without ever reasoning about it. Mirrors SpotDifferenceBoard.tsx's
 * MAX_WRONG_TAPS exactly. Classic gets a more generous budget than mini — 81 cells and up
 * to ~55 blanks make a single mistyped guess far less proportionally costly than on a
 * 16-cell board, and this is real deduction, not a first exposure to matching. */
const MAX_WRONG_GUESSES: Record<SudokuMode, number> = {
  mini: 3,
  classic: 5,
}

export function SudokuBoard({ question, promptText, onComplete, onFailed, disabled }: SudokuBoardProps) {
  const { t } = useI18n()
  const [filled, setFilled] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null)
  const [wrongGuess, setWrongGuess] = useState<WrongGuess | null>(null)
  const [wrongCount, setWrongCount] = useState(0)

  const size = question.grid.length
  const boxSize = Math.round(Math.sqrt(size))
  const maxWrongGuesses = MAX_WRONG_GUESSES[question.mode]

  function selectCell(row: number, col: number) {
    if (disabled || question.grid[row][col] !== null || filled[cellKey(row, col)]) return
    setSelected({ row, col })
  }

  function pickSymbol(symbolId: string) {
    if (disabled || !selected) return
    const { row, col } = selected
    if (question.solution[row][col] === symbolId) {
      playFoundSfx()
      const next = { ...filled, [cellKey(row, col)]: symbolId }
      setFilled(next)
      setSelected(null)
      const totalBlanks = question.grid.flat().filter((c) => c === null).length
      if (Object.keys(next).length === totalBlanks) onComplete()
    } else {
      playIncorrectSfx()
      setWrongGuess({ row, col })
      const nextWrongCount = wrongCount + 1
      setWrongCount(nextWrongCount)
      window.setTimeout(() => setWrongGuess((cur) => (cur?.row === row && cur?.col === col ? null : cur)), 350)
      if (nextWrongCount >= maxWrongGuesses) onFailed()
    }
  }

  return (
    <div className="sudoku-board">
      <p className="subtitle">{promptText}</p>
      <p className="sudoku-wrong-count">{t('sudokuWrongCount', { count: String(wrongCount), max: String(maxWrongGuesses) })}</p>
      <div
        className={`sudoku-grid ${question.mode === 'classic' ? 'sudoku-grid--classic' : ''}`.trim()}
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {question.grid.map((row, r) =>
          row.map((cell, c) => {
            const key = cellKey(r, c)
            const symbolId = cell ?? filled[key] ?? null
            const isBlank = cell === null && !filled[key]
            const isSelected = selected?.row === r && selected?.col === c
            const isWrong = wrongGuess?.row === r && wrongGuess?.col === c
            // One continuous board, not `boxSize` separate boxes — a thin line divides
            // every cell from its neighbor, and a thicker one marks each box boundary
            // specifically (every `boxSize`-th cell, never the outer edge), the classic
            // sudoku look. Only right/bottom borders are ever set (never left/top), so a
            // shared edge between two cells is drawn exactly once, not doubled.
            const blockRight = (c + 1) % boxSize === 0
            const blockBottom = (r + 1) % boxSize === 0
            const gridStyle = {
              borderRightWidth: c === size - 1 ? 0 : blockRight ? 2 : 1,
              borderRightColor: blockRight ? 'var(--color-text)' : 'var(--sudoku-line-soft)',
              borderBottomWidth: r === size - 1 ? 0 : blockBottom ? 2 : 1,
              borderBottomColor: blockBottom ? 'var(--color-text)' : 'var(--sudoku-line-soft)',
            }
            return (
              <button
                key={key}
                type="button"
                className={`sudoku-cell ${question.mode === 'classic' ? 'sudoku-cell--classic' : ''} ${isBlank ? 'sudoku-cell-blank' : ''} ${isSelected ? 'selected' : ''} ${isWrong ? 'wrong' : ''}`.trim()}
                style={gridStyle}
                onClick={() => selectCell(r, c)}
                disabled={disabled || !isBlank}
                aria-label={symbolId ?? 'blank'}
              >
                {symbolId &&
                  (question.mode === 'classic' ? (
                    <span className="sudoku-digit">{symbolId}</span>
                  ) : (
                    <WordIcon wordId={symbolId} size={48} />
                  ))}
              </button>
            )
          }),
        )}
      </div>
      <div className={`sudoku-palette ${question.mode === 'classic' ? 'sudoku-palette--classic' : ''}`.trim()}>
        {question.symbols.map((symbolId) => (
          <button
            key={symbolId}
            type="button"
            className={`sudoku-palette-item ${question.mode === 'classic' ? 'sudoku-palette-item--classic' : ''}`.trim()}
            onClick={() => pickSymbol(symbolId)}
            disabled={disabled || !selected}
            aria-label={symbolId}
          >
            {question.mode === 'classic' ? (
              <span className="sudoku-digit">{symbolId}</span>
            ) : (
              <WordIcon wordId={symbolId} size={44} />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
