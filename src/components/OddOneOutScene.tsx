import { useMemo } from 'react'
import type { LogicQuestion } from '../domain/types'
import { WordIcon } from './WordIcon'

interface OddOneOutSceneProps {
  question: LogicQuestion
  selected: string | number | null
  disabled: boolean
  onSelect: (choice: string) => void
}

// Percent of the panel's own width/height (not px) — .oddoneout-scene is always square
// (aspect-ratio: 1, see components.css), so a % of width and a % of height are always the
// same physical distance regardless of how large or small the panel actually renders,
// unlike a fixed-px size tied to one assumed reference size (which was this component's
// original approach — same latent bug questionGenerators/spotDifference.ts had before it
// was fixed the same way; see that file's own comment and the mobile-first-policy memory's
// 2026-09-29 notes for the full story of why a fixed-px item on a CSS-shrinkable container
// eventually overlaps/overflows once the container actually shrinks below the size the
// item's own math assumed).
const MIN_SIZE = 19
const MAX_SIZE = 27
const MIN_GAP_MARGIN = 4

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Scatters `count` items with no two overlapping, the same rejection-sampling technique
 * questionGenerators/spotDifference.ts's scatterPositions uses for its scene panels — but
 * computed fresh client-side per render (not stored on the question) since oddOneOut's
 * layout is purely presentational and never needs to be reproduced/persisted.
 *
 * Every distance here is in percentage-of-panel units, same as `xPct`/`yPct`/`size` — valid
 * to mix directly into one hypot() specifically because the panel is always square (see
 * MIN_SIZE's comment above); a non-square panel would need the same aspect-ratio correction
 * spotDifference.ts's scatterPositions applies. */
function scatterPositions(sizes: number[]): { xPct: number; yPct: number }[] {
  const placed: { xPct: number; yPct: number; size: number }[] = []
  for (const size of sizes) {
    let candidate = { xPct: randRange(14, 86), yPct: randRange(16, 84) }
    for (let attempt = 0; attempt < 80; attempt++) {
      candidate = { xPct: randRange(14, 86), yPct: randRange(16, 84) }
      const tooClose = placed.some((p) => {
        const dist = Math.hypot(p.xPct - candidate.xPct, p.yPct - candidate.yPct)
        return dist < p.size / 2 + size / 2 + MIN_GAP_MARGIN
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
              // item.size is a % of the panel's own width/height, not px — see MIN_SIZE's
              // comment above.
              width: `${item.size}%`,
              height: `${item.size}%`,
              transform: `translate(-50%, -50%) rotate(${item.rotate}deg)`,
            }}
            onClick={() => onSelect(item.choice)}
            disabled={disabled}
            aria-label={item.choice}
          >
            <WordIcon wordId={item.choice} size="100%" />
          </button>
        )
      })}
    </div>
  )
}
