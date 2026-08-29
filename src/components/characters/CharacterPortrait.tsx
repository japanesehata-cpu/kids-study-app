import { motion } from 'framer-motion'
import type { CharacterTheme } from './characterThemes'

export type CharacterMood = 'happy' | 'celebrate' | 'streak' | 'thinking'

interface CharacterPortraitProps {
  theme: CharacterTheme
  mood?: CharacterMood
  size?: number
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

const bounceAnimation = { y: [0, -6, 0], rotate: 0 }
const celebrateAnimation = { rotate: [-8, 8, -8], y: [0, -16, 0], scale: 1 }
const streakAnimation = { rotate: [-10, 10, -10], y: [0, -20, 0], scale: [1, 1.1, 1] }
const thinkingAnimation = { rotate: [-3, 3, -3], y: [0, 2, 0], scale: 1 }

export function CharacterPortrait({ theme, mood = 'happy', size = 220 }: CharacterPortraitProps) {
  const animate =
    mood === 'streak'
      ? streakAnimation
      : mood === 'celebrate'
        ? celebrateAnimation
        : mood === 'thinking'
          ? thinkingAnimation
          : bounceAnimation
  const duration = mood === 'streak' ? 0.5 : mood === 'celebrate' ? 0.6 : mood === 'thinking' ? 1.6 : 2.4

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
      <Sparkles active={mood === 'celebrate' || mood === 'streak'} />
      <motion.img
        src={`${import.meta.env.BASE_URL}images/characters/${theme.id}.png`}
        alt={theme.id}
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: 'contain' }}
        animate={animate}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
