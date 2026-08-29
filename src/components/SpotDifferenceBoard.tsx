import { useState } from 'react'
import type { SpotDifferenceQuestion } from '../domain/types'
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

const ICON_SIZE = 84

interface WrongTap {
  panel: 'left' | 'right'
  index: number
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

  const total = question.differenceIndexes.length
  const found = foundIndexes.size

  function handleTap(panel: 'left' | 'right', index: number) {
    if (disabled || foundIndexes.has(index)) return
    if (question.differenceIndexes.includes(index)) {
      playFoundSfx()
      const next = new Set(foundIndexes)
      next.add(index)
      setFoundIndexes(next)
      if (next.size === total) onAllFound()
    } else {
      setWrongTap({ panel, index })
      window.setTimeout(() => setWrongTap((cur) => (cur?.panel === panel && cur.index === index ? null : cur)), 350)
    }
  }

  function renderSlot(panel: 'left' | 'right', index: number) {
    const slot = panel === 'left' ? { iconId: question.leftIconIds[index], flipped: false, scale: 1 } : question.rightSlots[index]
    const isFound = foundIndexes.has(index)
    const isWrong = wrongTap?.panel === panel && wrongTap.index === index

    return (
      <button
        key={index}
        type="button"
        className={`spot-slot ${isFound ? 'found' : ''} ${isWrong ? 'wrong' : ''}`.trim()}
        onClick={() => handleTap(panel, index)}
        disabled={disabled}
        aria-label={slot.iconId ?? 'empty'}
      >
        {slot.iconId ? (
          <span
            className="spot-slot-icon"
            style={{ transform: `scaleX(${slot.flipped ? -1 : 1}) scale(${slot.scale})` }}
          >
            <WordIcon wordId={slot.iconId} size={ICON_SIZE} />
          </span>
        ) : (
          <span className="spot-slot-empty" />
        )}
        {isFound && <span className="spot-found-badge">✓</span>}
      </button>
    )
  }

  return (
    <div className="spot-difference-board">
      <p className="subtitle">{promptText}</p>
      <TtsButton text={promptText} lang={speechLang} label="listen" voiceProfile={voiceProfile} cacheKey={cacheKey} />
      <p className="spot-found-count">
        {t('spotDifferenceFoundCount', { found: String(found), total: String(total) })}
      </p>
      <div className="spot-panels">
        <div className="spot-panel" style={{ gridTemplateColumns: `repeat(${question.columns}, 1fr)` }}>
          {question.leftIconIds.map((_, i) => renderSlot('left', i))}
        </div>
        <div className="spot-panel" style={{ gridTemplateColumns: `repeat(${question.columns}, 1fr)` }}>
          {question.rightSlots.map((_, i) => renderSlot('right', i))}
        </div>
      </div>
    </div>
  )
}
