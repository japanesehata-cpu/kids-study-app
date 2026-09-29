import { motion } from 'framer-motion'
import { useResponsiveSize } from '../lib/useResponsiveSize'

// Custom art (see scripts/generate-reward-images.mjs) instead of plain system emoji — the
// 5 orbiting accents cycle through the 3 sparkle/star/heart images for the same visual
// variety the original 5-emoji burst had.
const ACCENT_IDS = ['star', 'heart', 'sparkle', 'star', 'sparkle']
const REWARDS_BASE = `${import.meta.env.BASE_URL}images/rewards`

// Original fixed design was a 220px box; every other measurement here is that same
// proportion of it (accents 44/220, medal 110/220, orbit distance 90/220) so shrinking the
// whole thing on a short viewport keeps its look instead of just cramming fixed-size parts
// into a smaller box.
const BASE_SIZE = 220

export function StampReward() {
  const size = useResponsiveSize(BASE_SIZE, 0.17, 92)
  const scale = size / BASE_SIZE
  const distance = 90 * scale
  const accentSize = 44 * scale
  const medalSize = 110 * scale

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      {ACCENT_IDS.map((id, i) => {
        const angle = (i / ACCENT_IDS.length) * Math.PI * 2
        const x = Math.cos(angle) * distance
        const y = Math.sin(angle) * distance
        return (
          <motion.img
            key={id + i}
            src={`${REWARDS_BASE}/${id}.png`}
            alt=""
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{ x, y, opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06, duration: 0.5, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: accentSize,
              height: accentSize,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )
      })}
      <motion.img
        src={`${REWARDS_BASE}/medal.png`}
        alt=""
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: medalSize,
          height: medalSize,
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  )
}
