import { describe, expect, it } from 'vitest'
import { generateSudokuQuestion } from '../questionGenerators/sudoku'
import type { Level } from '../types'

function isPermutationOfFour(values: string[]): boolean {
  return new Set(values).size === 4
}

function isValid(grid: string[][], checkBlocks: boolean): boolean {
  for (let i = 0; i < 4; i++) {
    if (!isPermutationOfFour(grid[i])) return false
    if (!isPermutationOfFour(grid.map((row) => row[i]))) return false
  }
  if (checkBlocks) {
    for (const [br, bc] of [
      [0, 0],
      [0, 2],
      [2, 0],
      [2, 2],
    ]) {
      const block = [grid[br][bc], grid[br][bc + 1], grid[br + 1][bc], grid[br + 1][bc + 1]]
      if (!isPermutationOfFour(block)) return false
    }
  }
  return true
}

// Fixed per level (see BLANK_COUNT in sudoku.ts) — a level must never mix blank counts,
// only ★4/★5 teach the 2x2-block rule.
const BLANK_COUNT: Record<Level, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 8, 6: 8 }
const CHECKS_BLOCKS: Record<Level, boolean> = { 1: false, 2: false, 3: false, 4: true, 5: true, 6: true }

describe('generateSudokuQuestion', () => {
  for (const level of [1, 2, 3, 4, 5] as const) {
    it(`Lv${level} always has exactly ${BLANK_COUNT[level]} blank(s) and exactly one valid completion`, () => {
      for (let i = 0; i < 50; i++) {
        const q = generateSudokuQuestion(level)
        expect(isValid(q.solution, true)).toBe(true)

        const blankCells = q.grid.flatMap((row, r) => row.flatMap((c, cIdx) => (c === null ? [[r, cIdx]] : [])))
        expect(blankCells).toHaveLength(BLANK_COUNT[level])

        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (q.grid[r][c] !== null) expect(q.grid[r][c]).toBe(q.solution[r][c])
          }
        }

        const puzzle = q.solution.map((row) => [...row])
        for (const [r, c] of blankCells) puzzle[r][c] = ''
        let completions = 0
        let matchesRecorded = true
        const tryFill = (idx: number): void => {
          if (completions > 1) return
          if (idx === blankCells.length) {
            if (isValid(puzzle, CHECKS_BLOCKS[level])) {
              completions++
              for (const [r, c] of blankCells) {
                if (puzzle[r][c] !== q.solution[r][c]) matchesRecorded = false
              }
            }
            return
          }
          const [r, c] = blankCells[idx]
          for (const v of q.symbols) {
            puzzle[r][c] = v
            tryFill(idx + 1)
          }
          puzzle[r][c] = ''
        }
        tryFill(0)
        expect(completions).toBe(1)
        expect(matchesRecorded).toBe(true)
      }
    })
  }
})
