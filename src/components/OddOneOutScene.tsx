import { useMemo } from 'react'
import type { LogicQuestion } from '../domain/types'
import { WordIcon } from './WordIcon'

interface OddOneOutSceneProps {
  question: LogicQuestion
  selected: string | number | null
  disabled: boolean
  onSelect: (choice: string) => void
}

const MIN_SIZE = 72
const MAX_SIZE = 104
const MIN_GAP_MARGIN = 14

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Scatters `count` items with no two overlapping, the same rejection-sampling technique
 * questionGenerators/spotDifference.ts's scatterPositions uses for its scene panels — but
 * computed fresh client-side per render (not stored on the question) since oddOneOut's
 * layout is purely presentational and never needs to be reproduced/persisted. */
function scatterPositions(sizes: number[]): { xPct: number; yPct: number }[] {
  const placed: { xPct: number; yPct: number; size: number }[] = []
  for (const size of sizes) {
    let candidate = { xPct: randRange(14, 86), yPct: randRange(16, 84) }
    for (let attempt = 0; attempt < 80; attempt++) {
      candidate = { xPct: randRange(14, 86), yPct: randRange(16, 84) }
      const tooClose = placed.some((p) => {
        const dxPx = ((p.xPct - candidate.xPct) / 100) * 380
        const dyPx = ((p.yPct - candidate.yPct) / 100) * 380
        return Math.hypot(dxPx, dyPx) < p.size / 2 + size / 2 + MIN_GAP_MARGIN
      })
      if (!tooClose) break
    }
    placed.push({ ...candidate, size })
  }
  return placed
}

/** Replaces the plain .choice-grid for logic's ★1 'oddOneOut' kind — the same 4 items and
 * tap-to-answer interaction as before (question.choices/answer unchanged), but scattered
 * in a free-form scene like SpotDifferenceBoard.tsx instead of an even button grid, so it
 * reads as "find the different one in a scene" rather than "pick from a boring grid". */
export function OddOneOutScene({ question, selected, disabled, onSelect }: OddOneOutSceneProps) {
  const items = useMemo(() => {
    const sizes = question.choices.map(() => randRange(MIN_SIZE, MAX_SIZE))
    const positions = scatterPositions(sizes)
    return question.choices.map((choice, i) => ({
      choice,
      size: sizes[i],
      xPct: positions[i].xPct,
      yPct: positions[i].yPct,
      rotate: randRange(-14, 14),
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }))
    // Re-scattered only when the question itself changes, not on every re-render (e.g.
    // after answering, when `selected` changes) — otherwise the layout would jump right
    // as the child is looking at the correct/incorrect result.
  }, [question.id])

  return (
    <div className="oddoneout-scene">
      {items.map((item) => {
        const state =
          selected === null ? '' : item.choice === question.answer ? 'correct' : item.choice === selected ? 'incorrect' : ''
        return (
          <button
            key={item.choice}
            type="button"
            className={`oddoneout-item ${state}`.trim()}
            style={{
              left: `${item.xPct}%`,
              top: `${item.yPct}%`,
              width: item.size,
              height: item.size,
              transform: `translate(-50%, -50%) rotate(${item.rotate}deg)`,
            }}
            onClick={() => onSelect(item.choice)}
            disabled={disabled}
            aria-label={item.choice}
          >
            <WordIcon wordId={item.choice} size={item.size} />
          </button>
        )
      })}
    </div>
  )
}
