import { motion } from 'framer-motion'

// Custom art (see scripts/generate-reward-images.mjs) instead of plain system emoji — the
// 5 orbiting accents cycle through the 3 sparkle/star/heart images for the same visual
// variety the original 5-emoji burst had.
const ACCENT_IDS = ['star', 'heart', 'sparkle', 'star', 'sparkle']
const REWARDS_BASE = `${import.meta.env.BASE_URL}images/rewards`

export function StampReward() {
  return (
    <div style={{ position: 'relative', width: 220, height: 220, margin: '0 auto' }}>
      {ACCENT_IDS.map((id, i) => {
        const angle = (i / ACCENT_IDS.length) * Math.PI * 2
        const distance = 90
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
              width: 44,
              height: 44,
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
          width: 110,
          height: 110,
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  )
}
