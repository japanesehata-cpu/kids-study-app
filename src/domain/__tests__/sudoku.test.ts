import { describe, expect, it } from 'vitest'
import { countClassicSolutions, generateSudokuQuestion } from '../questionGenerators/sudoku'
import type { Level } from '../types'

function isPermutationOfFour(values: string[]): boolean {
  return new Set(values).size === 4
}

function isValid(grid: string[][]): boolean {
  for (let i = 0; i < 4; i++) {
    if (!isPermutationOfFour(grid[i])) return false
    if (!isPermutationOfFour(grid.map((row) => row[i]))) return false
  }
  for (const [br, bc] of [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ]) {
    const block = [grid[br][bc], grid[br][bc + 1], grid[br + 1][bc], grid[br + 1][bc + 1]]
    if (!isPermutationOfFour(block)) return false
  }
  return true
}

// Fixed per level (see BLANK_COUNT in sudoku.ts) — a level must never mix blank counts.
// The full row/column/block ruleset applies at every level (see generateSudokuQuestion).
const BLANK_COUNT: Record<Level, number> = { 1: 5, 2: 8, 3: 10, 4: 10, 5: 10, 6: 10 }

describe('generateSudokuQuestion', () => {
  for (const level of [1, 2, 3] as const) {
    // ★3's 10 blanks makes this test's own brute-force verification (independent of, and
    // in addition to, generateSudokuQuestion's own internal one) genuinely slow — well
    // past the 5s default — so this needs its own generous timeout, not fewer iterations
    // (50 draws is what gives this test its actual coverage).
    it(`Lv${level} always has exactly ${BLANK_COUNT[level]} blank(s) and exactly one valid completion`, () => {
      for (let i = 0; i < 50; i++) {
        const q = generateSudokuQuestion(level)
        expect(isValid(q.solution)).toBe(true)

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
            if (isValid(puzzle)) {
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
    }, 15000)
  }
})

// Classic (9x9) hint counts by level — see CLASSIC_GIVENS in sudoku.ts.
const CLASSIC_GIVENS: Record<Level, number> = { 1: 38, 2: 32, 3: 26, 4: 26, 5: 26, 6: 26 }

function isPermutationOfNine(values: string[]): boolean {
  return new Set(values).size === 9
}

function isValidClassic(grid: string[][]): boolean {
  for (let i = 0; i < 9; i++) {
    if (!isPermutationOfNine(grid[i])) return false
    if (!isPermutationOfNine(grid.map((row) => row[i]))) return false
  }
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const block: string[] = []
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) block.push(grid[br + dr][bc + dc])
      if (!isPermutationOfNine(block)) return false
    }
  }
  return true
}

describe("generateSudokuQuestion('classic')", () => {
  for (const level of [1, 2, 3] as const) {
    it(`★${level} has ${CLASSIC_GIVENS[level]}±a-few givens, digit symbols, and exactly one solution`, () => {
      for (let i = 0; i < 15; i++) {
        const q = generateSudokuQuestion(level, 'classic')
        expect(q.mode).toBe('classic')
        expect(q.symbols).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9'])
        expect(isValidClassic(q.solution)).toBe(true)

        const givenCount = q.grid.flat().filter((c) => c !== null).length
        // digHoles may stop a little short of the target if the puzzle can't be dug
        // further while staying uniquely solvable — see its own comment — so this allows
        // a small margin above the target rather than an exact match.
        expect(givenCount).toBeGreaterThanOrEqual(CLASSIC_GIVENS[level])
        expect(givenCount).toBeLessThanOrEqual(CLASSIC_GIVENS[level] + 6)

        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if (q.grid[r][c] !== null) expect(q.grid[r][c]).toBe(q.solution[r][c])
          }
        }

        expect(countClassicSolutions(q)).toBe(1)
      }
    }, 20000)
  }
})
