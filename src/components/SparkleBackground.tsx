import { motion } from 'framer-motion'

const ITEMS = [
  { emoji: '✨', top: '8%', left: '8%', duration: 6, delay: 0 },
  { emoji: '💗', top: '18%', left: '88%', duration: 7, delay: 1 },
  { emoji: '⭐️', top: '72%', left: '5%', duration: 8, delay: 0.5 },
  { emoji: '🎀', top: '82%', left: '90%', duration: 6.5, delay: 1.5 },
  { emoji: '✨', top: '48%', left: '94%', duration: 5.5, delay: 0.8 },
  { emoji: '💗', top: '62%', left: '3%', duration: 7.5, delay: 0.3 },
]

export function SparkleBackground() {
  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}
    >
      {ITEMS.map((item, i) => (
        <motion.span
          key={i}
          style={{
            position: 'absolute',
            top: item.top,
            left: item.left,
            fontSize: 30,
            opacity: 0.35,
          }}
          animate={{ y: [0, -18, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: item.duration, repeat: Infinity, delay: item.delay, ease: 'easeInOut' }}
        >
          {item.emoji}
        </motion.span>
      ))}
    </div>
  )
}
