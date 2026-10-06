import { useState } from 'react'
import type { SpotDifferenceItem, SpotDifferenceQuestion } from '../domain/types'
import { SPOT_THEMES, type SpotTheme } from '../domain/spotScenes'
import { useI18n } from '../i18n/I18nContext'
import { playFoundSfx } from '../lib/sfx'

/** Wrong taps allowed before the round ends in failure — a flat limit across every level,
 * matching the user's ask for a consistent "3 strikes" feel rather than a per-level value. */
const MAX_WRONG_TAPS = 3

interface SpotDifferenceBoardProps {
  question: SpotDifferenceQuestion
  /** Called exactly once, the moment the last difference is found. */
  onAllFound: () => void
  /** Called exactly once, the moment the wrong-tap limit is reached. */
  onFailed: () => void
  /** True once the round is already complete (found or failed) — further taps become no-ops. */
  disabled: boolean
}

interface WrongTap {
  panel: 'left' | 'right'
  index: number
}

const SPOT_IMAGE_BASE = `${import.meta.env.BASE_URL}images/spot`

function spriteAspect(theme: SpotTheme | undefined, spriteId: string): number {
  return theme?.sprites.find((sp) => sp.id === spriteId)?.aspect ?? 1
}

function ScenePanel({
  themeId,
  items,
  counterparts,
  panel,
  foundIndexes,
  wrongTap,
  disabled,
  onTap,
}: {
  themeId: string
  items: (SpotDifferenceItem | null)[]
  /** The other picture's items — where this picture has nothing (a "missing" difference),
   * the empty spot is still tappable, at the other picture's object's position. */
  counterparts: (SpotDifferenceItem | null)[]
  panel: 'left' | 'right'
  foundIndexes: Set<number>
  wrongTap: WrongTap | null
  disabled: boolean
  onTap: (index: number) => void
}) {
  const theme = SPOT_THEMES.find((t) => t.id === themeId)
  return (
    <div className="spot-scene-panel" style={{ backgroundImage: `url(${SPOT_IMAGE_BASE}/${themeId}/bg.jpg)` }}>
      {items.map((item, i) => {
        const shown = item ?? counterparts[i]
        if (!shown) return null
        const isFound = foundIndexes.has(i)
        const isWrong = wrongTap?.panel === panel && wrongTap.index === i
        return (
          <button
            key={i}
            type="button"
            className={`spot-scene-item ${isFound ? 'found' : ''} ${item ? '' : 'spot-scene-item--empty'}`.trim()}
            style={{
              left: `${shown.xPct}%`,
              top: `${shown.yPct}%`,
              // Height is a % of the panel; width follows the sticker's own proportions.
              height: `${shown.size}%`,
              aspectRatio: String(spriteAspect(theme, shown.spriteId)),
              transform: 'translate(-50%, -50%)',
            }}
            onClick={() => onTap(i)}
            disabled={disabled}
            aria-label={item ? item.spriteId : 'empty'}
          >
            {item && (
              // The shake lives on this inner element so its transform never wipes out the
              // button's own centering transform.
              <span className={`spot-scene-item-inner ${isWrong ? 'wrong' : ''}`.trim()}>
                <img
                  src={`${SPOT_IMAGE_BASE}/${themeId}/${item.spriteId}.png`}
                  alt=""
                  draggable={false}
                  style={{ transform: item.flipped ? 'scaleX(-1)' : undefined }}
                />
              </span>
            )}
            {isFound && <span className="spot-found-ring" aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}

export function SpotDifferenceBoard({
  question,
  onAllFound,
  onFailed,
  disabled,
}: SpotDifferenceBoardProps) {
  const { t } = useI18n()
  const [foundIndexes, setFoundIndexes] = useState<Set<number>>(new Set())
  const [wrongTap, setWrongTap] = useState<WrongTap | null>(null)
  const [wrongCount, setWrongCount] = useState(0)

  const total = question.differenceIndexes.length
  const found = foundIndexes.size

  function handleTap(panel: 'left' | 'right', index: number) {
    if (disabled) return
    if (question.differenceIndexes.includes(index)) {
      // Tapping an already-found difference again undoes it — a child who found it by
      // accident, or wants to re-inspect it, isn't locked into a permanent mark. Once
      // every difference is found, onAllFound flips `disabled` on the very next parent
      // render anyway, so there's no path for this to un-complete an already-finished
      // round.
      if (foundIndexes.has(index)) {
        const next = new Set(foundIndexes)
        next.delete(index)
        setFoundIndexes(next)
        return
      }
      playFoundSfx()
      const next = new Set(foundIndexes)
      next.add(index)
      setFoundIndexes(next)
      if (next.size === total) onAllFound()
    } else {
      setWrongTap({ panel, index })
      const nextWrongCount = wrongCount + 1
      setWrongCount(nextWrongCount)
      if (nextWrongCount >= MAX_WRONG_TAPS) onFailed()
      window.setTimeout(() => setWrongTap((cur) => (cur?.panel === panel && cur.index === index ? null : cur)), 350)
    }
  }

  return (
    <div className="spot-difference-board">
      {/* No instructional text/TTS here — the category header above this board already
          says "まちがいさがし" (spot the difference), and two side-by-side scenes with
          tappable items reads as "find what's different" on its own — unlike, say, とけい's
          setTime mode, whose prompt names a specific target time that isn't shown anywhere
          else, this board's old prompt was purely generic instruction, not per-question
          content. See the mobile-first-policy memory's 2026-09-29 note. */}
      <div className="spot-counts">
        <p className="spot-found-count">
          {t('spotDifferenceFoundCount', { found: String(found), total: String(total) })}
        </p>
        <p className="spot-wrong-count">
          {t('spotDifferenceWrongCount', { count: String(wrongCount), max: String(MAX_WRONG_TAPS) })}
        </p>
      </div>
      <div className="spot-panels">
        <ScenePanel
          themeId={question.theme}
          items={question.leftItems}
          counterparts={question.rightItems}
          panel="left"
          foundIndexes={foundIndexes}
          wrongTap={wrongTap}
          disabled={disabled}
          onTap={(i) => handleTap('left', i)}
        />
        <ScenePanel
          themeId={question.theme}
          items={question.rightItems}
          counterparts={question.leftItems}
          panel="right"
          foundIndexes={foundIndexes}
          wrongTap={wrongTap}
          disabled={disabled}
          onTap={(i) => handleTap('right', i)}
        />
      </div>
    </div>
  )
}
