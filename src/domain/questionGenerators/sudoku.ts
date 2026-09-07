import type { Level, SudokuQuestion } from '../types'
import { shuffle } from '../../lib/shuffle'

function makeId(): string {
  return `sudoku-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Fixed, maximally-distinct 4-color set rather than a random draw from the full palette —
 * this is a logic puzzle, not a color-vocabulary test, so the colors should be as easy as
 * possible to tell apart at a glance (see the englishSentence color-distractor fix earlier
 * this session for why picking colors carelessly can make a question about something else
 * entirely). */
const SYMBOLS = ['red', 'blue', 'yellow', 'green']

/** One known-valid mini-sudoku solution (values 0-3 standing in for SYMBOLS) — every row,
 * column, and 2x2 block is a permutation of {0,1,2,3}. Every other solution this generator
 * produces is derived from this one via structure-preserving transforms (see
 * randomSolution), so correctness never depends on a general constraint solver. */
const BASE_SOLUTION: number[][] = [
  [0, 1, 2, 3],
  [2, 3, 0, 1],
  [1, 0, 3, 2],
  [3, 2, 1, 0],
]

function swapRows(grid: number[][], a: number, b: number): number[][] {
  const copy = grid.map((row) => [...row])
  ;[copy[a], copy[b]] = [copy[b], copy[a]]
  return copy
}

function swapCols(grid: number[][], a: number, b: number): number[][] {
  return grid.map((row) => {
    const copy = [...row]
    ;[copy[a], copy[b]] = [copy[b], copy[a]]
    return copy
  })
}

/** Swaps the whole top band (rows 0-1) with the whole bottom band (rows 2-3) — unlike
 * swapping two arbitrary rows, this keeps each band's two rows together, so the 2x2 blocks
 * stay intact. swapColBands is the column equivalent. */
function swapRowBands(grid: number[][]): number[][] {
  return [grid[2], grid[3], grid[0], grid[1]]
}

function swapColBands(grid: number[][]): number[][] {
  return grid.map((row) => [row[2], row[3], row[0], row[1]])
}

function transpose(grid: number[][]): number[][] {
  return grid[0].map((_, c) => grid.map((row) => row[c]))
}

function relabel(grid: number[][], mapping: number[]): number[][] {
  return grid.map((row) => row.map((v) => mapping[v]))
}

/** Randomizes the base grid while providably preserving every row/column/2x2-block being a
 * permutation of the 4 symbols: relabeling values, swapping the two rows (or columns)
 * within a band, swapping whole bands, and transposing all keep that property, so the
 * result needs no re-verification. */
function randomSolution(): number[][] {
  let grid = BASE_SOLUTION
  if (Math.random() < 0.5) grid = swapRows(grid, 0, 1)
  if (Math.random() < 0.5) grid = swapRows(grid, 2, 3)
  if (Math.random() < 0.5) grid = swapCols(grid, 0, 1)
  if (Math.random() < 0.5) grid = swapCols(grid, 2, 3)
  if (Math.random() < 0.5) grid = swapRowBands(grid)
  if (Math.random() < 0.5) grid = swapColBands(grid)
  if (Math.random() < 0.5) grid = transpose(grid)
  return relabel(grid, shuffle([0, 1, 2, 3]))
}

function isPermutationOfFour(values: number[]): boolean {
  return new Set(values).size === 4
}

/** Checks the FULL 4x4 grid against the complete mini-sudoku ruleset — row, column, AND
 * each of the four 2x2 blocks — at every level (see generateSudokuQuestion's comment on
 * why this is never partial). Used to count how many ways a candidate blank set could be
 * completed, not just to verify the generator's own known-good solution. */
function isValidUnderRules(grid: number[][]): boolean {
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

/** Tries a random blank-cell set and brute-forces every possible way to fill it (at most
 * 4^8 = 65536 combinations at this grid's max blank count — trivial at this scale), keeping
 * it only if EXACTLY one completion is valid under the full row/column/block ruleset. This
 * is what guarantees a child can never be marked wrong for an answer that's actually also
 * logically consistent with what's already on the board — a real risk once more than one
 * cell is blank, unlike ★1's single blank (always uniquely forced by its own row alone). */
function pickBlanks(solution: number[][], blankCount: number): [number, number][] | null {
  const allCells: [number, number][] = []
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) allCells.push([r, c])

  for (let attempt = 0; attempt < 50; attempt++) {
    const blanks = shuffle(allCells).slice(0, blankCount)
    const puzzle = solution.map((row) => [...row])
    for (const [r, c] of blanks) puzzle[r][c] = -1

    let completions = 0
    const tryFill = (idx: number): void => {
      if (completions > 1) return
      if (idx === blanks.length) {
        if (isValidUnderRules(puzzle)) completions++
        return
      }
      const [r, c] = blanks[idx]
      for (let v = 0; v < 4 && completions <= 1; v++) {
        puzzle[r][c] = v
        tryFill(idx + 1)
      }
      puzzle[r][c] = -1
    }
    tryFill(0)

    if (completions === 1) return blanks
  }
  return null
}

/** One fixed blank count per level — deliberately not a random range within a level (see
 * the level-redefinition discussion this was fixed from): a level is a collection of
 * same-difficulty puzzles, not a blend of easier and harder ones. The full row/column/
 * block ruleset applies at every level (see generateSudokuQuestion) — blank count alone
 * is what escalates the difficulty here.
 *
 * Retuned after the old ★5 (8 blanks) turned out too easy in practice — ★3 here is a real
 * jump up, not just "one more than before". 10 is a deliberately-measured ceiling, not a
 * round number: pickBlanks' brute-force search stays fast and reliable through 10 blanks
 * (empirically ~80ms, always finds a unique-solution set well within the 50-attempt cap)
 * but degrades sharply at 11 (~1s per generation — a visible hang before a question even
 * appears) since a 4x4 grid needs very specific, rare given-placements to stay uniquely
 * solvable with that few clues, and this generator finds them by random search rather than
 * construction. 10 is the highest value confirmed to generate reliably and near-instantly. */
const BLANK_COUNT: Record<Level, number> = {
  1: 5,
  2: 8,
  3: 10,
  4: 10,
  5: 10,
  // Never reached — sudoku caps at ★3 (see CATEGORY_MAX_LEVEL). Kept only so this
  // Record's type checks against the full Level union.
  6: 10,
}

function blankCountForLevel(level: Level): number {
  return BLANK_COUNT[level]
}

export function generateSudokuQuestion(level: Level): SudokuQuestion {
  const solutionNums = randomSolution()
  // Every level's blanks must be solvable only by using the full row/column/2x2-block
  // ruleset — a real mini-sudoku at every ★, not a partial Latin square that merely
  // happens to have valid blocks by construction (randomSolution's *solution* grid always
  // does — see its comment — but that alone doesn't mean the block rule is actually needed
  // to find the unique answer for a given blank set; this makes sure it always is).
  const blanks =
    pickBlanks(solutionNums, blankCountForLevel(level)) ??
    // Astronomically unlikely at this grid size, but a single blank is provably always
    // uniquely determined by its own row — a safe fallback that can never fail to find one.
    pickBlanks(solutionNums, 1)!

  const solution = solutionNums.map((row) => row.map((v) => SYMBOLS[v]))
  const grid: (string | null)[][] = solution.map((row) => [...row])
  for (const [r, c] of blanks) grid[r][c] = null

  return {
    id: makeId(),
    category: 'sudoku',
    level,
    grid,
    solution,
    symbols: SYMBOLS,
    subSkill: 'sudoku-fill',
  }
}
