import { shuffle } from '../../lib/shuffle'

/** A 9x9 grid of digits 1-9, 0 standing in for "blank" — plain numbers throughout (not
 * SudokuQuestion's string grid) since bitmask arithmetic needs numeric values; sudoku.ts's
 * generateClassicSudokuQuestion converts to strings at the very end. */
export type Grid9 = number[][]

const SIZE = 9
const BOX = 3
const FULL_MASK = 0x1ff // bits 0-8, one per digit 1-9

function bit(value: number): number {
  return 1 << (value - 1)
}

function boxIndex(row: number, col: number): number {
  return Math.floor(row / BOX) * BOX + Math.floor(col / BOX)
}

function emptyGrid(): Grid9 {
  return Array.from({ length: SIZE }, () => new Array(SIZE).fill(0))
}

/** Tracks, per row/column/3x3-box, which digits are already placed as one 9-bit mask each —
 * the shared state both countSolutions and generateFullGrid backtrack over, so a candidate
 * mask for any cell is a single `~(rows[r] | cols[c] | boxes[b]) & FULL_MASK` away instead
 * of rescanning the grid. */
interface Masks {
  rows: number[]
  cols: number[]
  boxes: number[]
}

function buildMasks(grid: Grid9): Masks {
  const rows = new Array(SIZE).fill(0)
  const cols = new Array(SIZE).fill(0)
  const boxes = new Array(SIZE).fill(0)
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c]
      if (!v) continue
      const b = bit(v)
      rows[r] |= b
      cols[c] |= b
      boxes[boxIndex(r, c)] |= b
    }
  }
  return { rows, cols, boxes }
}

function popcount(mask: number): number {
  let count = 0
  let m = mask
  while (m) {
    m &= m - 1
    count++
  }
  return count
}

/** Minimum-Remaining-Values: scans every blank cell and returns the one with the fewest
 * legal candidates (ties broken by scan order), which keeps backtracking fast even on a
 * near-empty grid — the same technique real sudoku solvers use, essential once digHoles is
 * calling this dozens of times per puzzle down to ~25 givens. Returns 'dead' the instant any
 * blank cell has zero candidates (no need to keep scanning — that branch can never
 * complete), or 'solved' if the loop finds no blank cell at all. */
function findMrvCell(grid: Grid9, masks: Masks): { r: number; c: number; candidates: number } | 'dead' | 'solved' {
  let best: { r: number; c: number; candidates: number } | null = null
  let bestCount = SIZE + 1
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c]) continue
      const used = masks.rows[r] | masks.cols[c] | masks.boxes[boxIndex(r, c)]
      const candidates = ~used & FULL_MASK
      const count = popcount(candidates)
      if (count === 0) return 'dead'
      if (count < bestCount) {
        bestCount = count
        best = { r, c, candidates }
        if (count === 1) return best
      }
    }
  }
  return best ?? 'solved'
}

function place(grid: Grid9, masks: Masks, r: number, c: number, v: number): void {
  grid[r][c] = v
  const b = bit(v)
  masks.rows[r] |= b
  masks.cols[c] |= b
  masks.boxes[boxIndex(r, c)] |= b
}

function unplace(grid: Grid9, masks: Masks, r: number, c: number, v: number): void {
  grid[r][c] = 0
  const b = ~bit(v)
  masks.rows[r] &= b
  masks.cols[c] &= b
  masks.boxes[boxIndex(r, c)] &= b
}

/** Counts how many valid completions `grid` has, stopping as soon as it finds `limit` —
 * digHoles only ever needs to know "is it still exactly 1", so limit=2 makes this an O(fast)
 * uniqueness check rather than a full enumeration. */
export function countSolutions(grid: Grid9, limit: number): number {
  const working = grid.map((row) => [...row])
  const masks = buildMasks(working)
  let count = 0

  function backtrack(): void {
    if (count >= limit) return
    const found = findMrvCell(working, masks)
    if (found === 'dead') return
    if (found === 'solved') {
      count++
      return
    }
    const { r, c, candidates } = found
    for (let v = 1; v <= SIZE && count < limit; v++) {
      if (!(candidates & bit(v))) continue
      place(working, masks, r, c, v)
      backtrack()
      unplace(working, masks, r, c, v)
    }
  }

  backtrack()
  return count
}

/** Fills an empty grid into one complete, valid solution — MRV order plus a randomized
 * candidate order at each cell, the standard fast technique for generating a random full
 * sudoku grid (always succeeds; a full grid built this way never needs backtracking out of
 * a dead end in practice at this grid size). */
export function generateFullGrid(): Grid9 {
  const grid = emptyGrid()
  const masks = buildMasks(grid)

  function fill(): boolean {
    const found = findMrvCell(grid, masks)
    if (found === 'dead') return false
    if (found === 'solved') return true
    const { r, c, candidates } = found
    const order = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).filter((v) => candidates & bit(v))
    for (const v of order) {
      place(grid, masks, r, c, v)
      if (fill()) return true
      unplace(grid, masks, r, c, v)
    }
    return false
  }

  fill()
  return grid
}

/** Removes cells from a complete `solution` one at a time, in random order, keeping each
 * removal only if the puzzle still has exactly one solution — the standard "dig holes"
 * technique. Stops once `targetBlanks` is reached, or once every cell has been tried
 * (whichever first) — a puzzle that can't be dug all the way to the target while staying
 * uniquely solvable simply ends up with slightly more givens than asked for, which is fine
 * under this app's "difficulty by hint count only" design (see sudoku.ts). */
export function digHoles(solution: Grid9, targetBlanks: number): Grid9 {
  const puzzle = solution.map((row) => [...row])
  const cells: [number, number][] = []
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) cells.push([r, c])

  let blanksSoFar = 0
  for (const [r, c] of shuffle(cells)) {
    if (blanksSoFar >= targetBlanks) break
    const backup = puzzle[r][c]
    puzzle[r][c] = 0
    if (countSolutions(puzzle, 2) === 1) {
      blanksSoFar++
    } else {
      puzzle[r][c] = backup
    }
  }
  return puzzle
}
