import { useMemo } from 'react'
import { motion } from 'framer-motion'

const ITEMS = ['🍰', '🎀', '🧁', '🍭', '🍬', '🎈', '💝', '⭐️', '🌈', '👑', '✨', '💎']
const COUNT = 16

interface FallingItemConfig {
  key: number
  emoji: string
  leftPercent: number
  delay: number
  duration: number
  rotateStart: number
  rotateEnd: number
  size: number
}

function buildItems(): FallingItemConfig[] {
  return Array.from({ length: COUNT }, (_, i) => ({
    key: i,
    emoji: ITEMS[Math.floor(Math.random() * ITEMS.length)],
    leftPercent: Math.random() * 94 + 3,
    delay: Math.random() * 0.35,
    duration: 1.3 + Math.random() * 0.7,
    rotateStart: Math.random() * 60 - 30,
    rotateEnd: Math.random() * 340 - 170,
    size: 26 + Math.random() * 20,
  }))
}

/** A fresh burst of cute falling items — mount with a new `key` on the parent to replay it. */
export function RewardRain() {
  const items = useMemo(() => buildItems(), [])

  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 50 }}
    >
      {items.map((item) => (
        <motion.span
          key={item.key}
          initial={{ top: '-10%', left: `${item.leftPercent}%`, opacity: 0, rotate: item.rotateStart }}
          animate={{ top: '110%', opacity: [0, 1, 1, 0.6, 0], rotate: item.rotateEnd }}
          transition={{ duration: item.duration, delay: item.delay, ease: 'easeIn' }}
          style={{ position: 'absolute', fontSize: item.size }}
        >
          {item.emoji}
        </motion.span>
      ))}
    </div>
  )
}
