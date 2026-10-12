import { useState } from 'react'
import { MotionConfig, motion, useReducedMotion } from 'framer-motion'
import type { CharacterTheme } from './characterThemes'

export type CharacterMood = 'happy' | 'celebrate' | 'streak' | 'thinking'

interface CharacterPortraitProps {
  theme: CharacterTheme
  mood?: CharacterMood
  size?: number
  /** Seconds into the idle loop to start from, so a row of portraits doesn't bob in lockstep. */
  phase?: number
  /** Extra class on the root — `character-portrait--hero` for a screen's one large mascot. */
  className?: string
}

const SPARKLE_POSITIONS = [
  { x: '4%', y: '18%', delay: 0 },
  { x: '88%', y: '10%', delay: 0.15 },
  { x: '2%', y: '68%', delay: 0.3 },
  { x: '90%', y: '72%', delay: 0.45 },
]

function Sparkles({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <>
      {SPARKLE_POSITIONS.map((s, i) => (
        <motion.span
          key={i}
          style={{ position: 'absolute', left: s.x, top: s.y, fontSize: '22%' }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 0], scale: [0.4, 1.1, 0.4] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: s.delay }}
        >
          ✨
        </motion.span>
      ))}
    </>
  )
}

// Portraits with a closed-eye frame (<id>__blink.png, scripts/generate-blink-portraits.py).
// The blink is pure CSS (.portrait-blink in components.css): the closed-eye image sits on
// top of the open one at opacity 0 and shows for ~0.13s once per cycle — no re-renders.
const BLINK_IDS = new Set(['momo', 'sora', 'hana', 'koko', 'yui', 'toki', 'mitsu', 'kazu', 'peko', 'aru'])

const bounceAnimation = { y: [0, -6, 0], rotate: 0 }
const celebrateAnimation = { rotate: [-8, 8, -8], y: [0, -16, 0], scale: 1 }
const streakAnimation = { rotate: [-10, 10, -10], y: [0, -20, 0], scale: [1, 1.1, 1] }
const thinkingAnimation = { rotate: [-3, 3, -3], y: [0, 2, 0], scale: 1 }

export function CharacterPortrait({ theme, mood = 'happy', size = 220, phase = 0, className }: CharacterPortraitProps) {
  // The mascot keeps moving even with the phone's "reduce motion" setting on — its bob and
  // blink are small and are what makes it feel alive (docs/development-guidelines.md 子ども向けの
  // UI の規則). Only the big celebratory jumps calm down to the ordinary bob.
  const reduceMotion = useReducedMotion()
  const effectiveMood = reduceMotion && (mood === 'streak' || mood === 'celebrate') ? 'happy' : mood
  const animate =
    effectiveMood === 'streak'
      ? streakAnimation
      : effectiveMood === 'celebrate'
        ? celebrateAnimation
        : effectiveMood === 'thinking'
          ? thinkingAnimation
          : bounceAnimation
  // Each portrait blinks on its own rhythm (every 3.5-6.5s), starting at a random point.
  const [blinkTiming] = useState(() => {
    const period = 3.5 + Math.random() * 3
    return { animationDuration: `${period}s`, animationDelay: `${-Math.random() * period}s` }
  })
  const duration =
    effectiveMood === 'streak' ? 0.5 : effectiveMood === 'celebrate' ? 0.6 : effectiveMood === 'thinking' ? 1.6 : 2.4

  return (
    <div
      className={className ? `character-portrait ${className}` : 'character-portrait'}
      style={{ position: 'relative', display: 'inline-block', ['--portrait-max' as string]: `${size}px` }}
    >
      <Sparkles active={mood === 'celebrate' || mood === 'streak'} />
      {mood === 'thinking' && (
        // 「おしい！」 — a little sweat drop that slides down once, instead of sparkles.
        <motion.span
          style={{ position: 'absolute', right: '6%', top: '8%', fontSize: '22%', zIndex: 1 }}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: [0, 1, 1, 0], y: [-6, 0, 6, 10] }}
          transition={{ duration: 1.4, times: [0, 0.2, 0.75, 1] }}
        >
          💦
        </motion.span>
      )}
      <MotionConfig reducedMotion="never">
        <motion.div
          style={{ position: 'relative', width: '100%', height: '100%' }}
          animate={animate}
          transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay: -phase }}
        >
          <img
            src={`${import.meta.env.BASE_URL}images/characters/${theme.id}.png`}
            alt={theme.id}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
          {BLINK_IDS.has(theme.id) && (
            <img
              className="portrait-blink"
              src={`${import.meta.env.BASE_URL}images/characters/${theme.id}__blink.png`}
              alt=""
              aria-hidden="true"
              style={blinkTiming}
            />
          )}
        </motion.div>
      </MotionConfig>
    </div>
  )
}
