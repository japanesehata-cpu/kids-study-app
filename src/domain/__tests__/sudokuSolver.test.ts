import { describe, expect, it } from 'vitest'
import { countSolutions, digHoles, generateFullGrid, type Grid9 } from '../questionGenerators/sudokuSolver'

function isPermutationOfNine(values: number[]): boolean {
  return new Set(values).size === 9 && values.every((v) => v >= 1 && v <= 9)
}

function isValidFullGrid(grid: Grid9): boolean {
  for (let i = 0; i < 9; i++) {
    if (!isPermutationOfNine(grid[i])) return false
    if (!isPermutationOfNine(grid.map((row) => row[i]))) return false
  }
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const block: number[] = []
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) block.push(grid[br + dr][bc + dc])
      if (!isPermutationOfNine(block)) return false
    }
  }
  return true
}

// A well-known valid, fully-solved 9x9 grid — used as a fixed fixture rather than a fresh
// generateFullGrid() call, so countSolutions' own tests don't depend on generateFullGrid
// also being correct.
const KNOWN_SOLUTION: Grid9 = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
]

describe('countSolutions', () => {
  it('returns 1 for a fully-solved valid grid', () => {
    expect(countSolutions(KNOWN_SOLUTION, 2)).toBe(1)
  })

  it('returns 1 for a puzzle with a single blank (always uniquely forced)', () => {
    const puzzle = KNOWN_SOLUTION.map((row) => [...row])
    puzzle[0][0] = 0
    expect(countSolutions(puzzle, 2)).toBe(1)
  })

  it('returns >=2 for a puzzle that genuinely has multiple completions', () => {
    // Blanking out two cells that only ever swap with each other (both in the same row,
    // column, and box as every other blank — here just the two, sharing row 0) and that
    // also happen to be swappable with each other under the full ruleset produces a
    // non-unique puzzle: clearing the top-left 2 cells of one row where swapping their
    // values is still consistent with the rest of the (untouched) grid's rows/columns/
    // boxes is knowingly puzzle-specific, so instead this constructs the classic proof:
    // a puzzle need not be fully specified to have 2 solutions — clearing all 4 corners of
    // one box that also appear nowhere else in their row/column as a *pair* is fragile to
    // hand-construct, so this test instead verifies the weaker, always-true direction: the
    // fully-blank grid (0 givens) has far more than 1 completion.
    const blank: Grid9 = Array.from({ length: 9 }, () => new Array(9).fill(0))
    expect(countSolutions(blank, 2)).toBe(2)
  })
})

describe('generateFullGrid', () => {
  it('always returns a completely filled, rule-valid grid', () => {
    for (let i = 0; i < 20; i++) {
      const grid = generateFullGrid()
      expect(grid.flat().every((v) => v >= 1 && v <= 9)).toBe(true)
      expect(isValidFullGrid(grid)).toBe(true)
    }
  })

  it('produces different grids across calls (not a fixed single solution)', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 10; i++) seen.add(generateFullGrid().flat().join(''))
    expect(seen.size).toBeGreaterThan(1)
  })
})

describe('digHoles', () => {
  it('produces a puzzle with exactly one solution, consistent with the original grid', () => {
    for (let i = 0; i < 15; i++) {
      const solution = generateFullGrid()
      const puzzle = digHoles(solution, 45)
      expect(countSolutions(puzzle, 2)).toBe(1)
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (puzzle[r][c] !== 0) expect(puzzle[r][c]).toBe(solution[r][c])
        }
      }
    }
  }, 20000)

  it('removes at least some cells toward the target (never a no-op)', () => {
    const solution = generateFullGrid()
    const puzzle = digHoles(solution, 40)
    const blanks = puzzle.flat().filter((v) => v === 0).length
    expect(blanks).toBeGreaterThan(0)
  })
})
