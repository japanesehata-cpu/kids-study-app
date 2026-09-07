import { useState } from 'react'
import type { SudokuQuestion } from '../domain/types'
import { playFoundSfx, playIncorrectSfx } from '../lib/sfx'
import { WordIcon } from './WordIcon'

interface SudokuBoardProps {
  question: SudokuQuestion
  promptText: string
  /** Called exactly once, the moment every blank cell has been filled correctly. */
  onComplete: () => void
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

export function SudokuBoard({ question, promptText, onComplete, disabled }: SudokuBoardProps) {
  const [filled, setFilled] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null)
  const [wrongGuess, setWrongGuess] = useState<WrongGuess | null>(null)

  function selectCell(row: number, col: number) {
    if (disabled || question.grid[row][col] !== null || filled[cellKey(row, col)]) return
    setSelected({ row, col })
  }

  function pickColor(colorId: string) {
    if (disabled || !selected) return
    const { row, col } = selected
    if (question.solution[row][col] === colorId) {
      playFoundSfx()
      const next = { ...filled, [cellKey(row, col)]: colorId }
      setFilled(next)
      setSelected(null)
      const totalBlanks = question.grid.flat().filter((c) => c === null).length
      if (Object.keys(next).length === totalBlanks) onComplete()
    } else {
      playIncorrectSfx()
      setWrongGuess({ row, col })
      window.setTimeout(() => setWrongGuess((cur) => (cur?.row === row && cur?.col === col ? null : cur)), 350)
    }
  }

  return (
    <div className="sudoku-board">
      <p className="subtitle">{promptText}</p>
      <div className="sudoku-grid">
        {question.grid.map((row, r) =>
          row.map((cell, c) => {
            const key = cellKey(r, c)
            const colorId = cell ?? filled[key] ?? null
            const isBlank = cell === null && !filled[key]
            const isSelected = selected?.row === r && selected?.col === c
            const isWrong = wrongGuess?.row === r && wrongGuess?.col === c
            // One continuous board, not 4 separate boxes — a thin line divides every
            // cell from its neighbor, and a thicker one marks the 2x2 block boundary
            // specifically (after column 1, after row 1), the classic sudoku look.
            // Only right/bottom borders are ever set (never left/top), so adjacent
            // cells' shared edge is drawn exactly once, not doubled.
            const blockRight = c === 1
            const blockBottom = r === 1
            const gridStyle = {
              borderRightWidth: c === 3 ? 0 : blockRight ? 2 : 1,
              borderRightColor: blockRight ? 'var(--color-text)' : 'var(--sudoku-line-soft)',
              borderBottomWidth: r === 3 ? 0 : blockBottom ? 2 : 1,
              borderBottomColor: blockBottom ? 'var(--color-text)' : 'var(--sudoku-line-soft)',
            }
            return (
              <button
                key={key}
                type="button"
                className={`sudoku-cell ${isBlank ? 'sudoku-cell-blank' : ''} ${isSelected ? 'selected' : ''} ${isWrong ? 'wrong' : ''}`.trim()}
                style={gridStyle}
                onClick={() => selectCell(r, c)}
                disabled={disabled || !isBlank}
                aria-label={colorId ?? 'blank'}
              >
                {colorId && <WordIcon wordId={colorId} size={48} />}
              </button>
            )
          }),
        )}
      </div>
      <div className="sudoku-palette">
        {question.symbols.map((colorId) => (
          <button
            key={colorId}
            type="button"
            className="sudoku-palette-item"
            onClick={() => pickColor(colorId)}
            disabled={disabled || !selected}
            aria-label={colorId}
          >
            <WordIcon wordId={colorId} size={44} />
          </button>
        ))}
      </div>
    </div>
  )
}
