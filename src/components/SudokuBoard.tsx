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

  // 2x2 block borders are only drawn from ★3 — see questionGenerators/sudoku.ts for why
  // the block-uniqueness rule itself only applies from that level too.
  const showBlockBorders = question.level >= 3

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
            // 2x2 block grouping hint (★3 only) — extra margin between the two 2-column/
            // 2-row bands widens the gap there specifically. A thicker border was tried
            // first and turned out invisible: cells sit in a `gap`-separated CSS grid, not
            // touching each other, so a differently-thick border on a floating, rounded
            // card reads as nothing at all — only actual extra space between the bands
            // shows up. Computed here rather than via nth-child CSS since a 4x4 grid's
            // block boundaries don't map to a clean nth-child formula.
            const blockStyle = showBlockBorders
              ? {
                  marginRight: c === 1 ? 10 : undefined,
                  marginBottom: r === 1 ? 10 : undefined,
                }
              : undefined
            return (
              <button
                key={key}
                type="button"
                className={`sudoku-cell ${isBlank ? 'sudoku-cell-blank' : ''} ${isSelected ? 'selected' : ''} ${isWrong ? 'wrong' : ''}`.trim()}
                style={blockStyle}
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
