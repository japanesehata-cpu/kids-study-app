import { useState } from 'react'
import type { SpotDifferenceItem, SpotDifferenceQuestion } from '../domain/types'
import { useI18n } from '../i18n/I18nContext'
import { playFoundSfx } from '../lib/sfx'
import { WordIcon } from './WordIcon'
import { TtsButton } from './TtsButton'
import type { SpeechLang, VoiceProfile } from '../lib/tts'

interface SpotDifferenceBoardProps {
  question: SpotDifferenceQuestion
  promptText: string
  speechLang: SpeechLang
  voiceProfile: VoiceProfile
  cacheKey?: string
  /** Called exactly once, the moment the last difference is found. */
  onAllFound: () => void
  /** True once the round is already complete — further taps become no-ops. */
  disabled: boolean
}

interface WrongTap {
  panel: 'left' | 'right'
  index: number
}

function ScenePanel({
  items,
  panel,
  foundIndexes,
  wrongTap,
  disabled,
  onTap,
}: {
  items: SpotDifferenceItem[]
  panel: 'left' | 'right'
  foundIndexes: Set<number>
  wrongTap: WrongTap | null
  disabled: boolean
  onTap: (index: number) => void
}) {
  return (
    <div className="spot-scene-panel">
      {items.map((item, i) => {
        const isFound = foundIndexes.has(i)
        const isWrong = wrongTap?.panel === panel && wrongTap.index === i
        return (
          <button
            key={i}
            type="button"
            className={`spot-scene-item ${isFound ? 'found' : ''}`.trim()}
            style={{
              left: `${item.xPct}%`,
              top: `${item.yPct}%`,
              width: item.size,
              height: item.size,
              // The button's own transform only ever centers/rotates/flips the item — a
              // shake animation on this same property would wipe out that positioning
              // (jumping the item to the top-left corner) every time it's applied. The
              // shake instead lives on an inner wrapper (below) with its own, independent
              // transform starting from identity.
              transform: `translate(-50%, -50%) rotate(${item.rotate}deg) scaleX(${item.flipped ? -1 : 1})`,
            }}
            onClick={() => onTap(i)}
            disabled={disabled}
            aria-label={item.iconId}
          >
            <span className={`spot-scene-item-inner ${isWrong ? 'wrong' : ''}`.trim()}>
              <WordIcon wordId={item.iconId} size={item.size} />
            </span>
            {isFound && (
              <span
                className="spot-found-badge"
                style={{ transform: `rotate(${-item.rotate}deg) scaleX(${item.flipped ? -1 : 1})` }}
              >
                ✓
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function SpotDifferenceBoard({
  question,
  promptText,
  speechLang,
  voiceProfile,
  cacheKey,
  onAllFound,
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
      setWrongCount((count) => count + 1)
      window.setTimeout(() => setWrongTap((cur) => (cur?.panel === panel && cur.index === index ? null : cur)), 350)
    }
  }

  return (
    <div className="spot-difference-board">
      <p className="subtitle">{promptText}</p>
      <TtsButton text={promptText} lang={speechLang} label="listen" voiceProfile={voiceProfile} cacheKey={cacheKey} />
      <div className="spot-counts">
        <p className="spot-found-count">
          {t('spotDifferenceFoundCount', { found: String(found), total: String(total) })}
        </p>
        <p className="spot-wrong-count">{t('spotDifferenceWrongCount', { count: String(wrongCount) })}</p>
      </div>
      <div className="spot-panels">
        <ScenePanel
          items={question.leftItems}
          panel="left"
          foundIndexes={foundIndexes}
          wrongTap={wrongTap}
          disabled={disabled}
          onTap={(i) => handleTap('left', i)}
        />
        <ScenePanel
          items={question.rightItems}
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
