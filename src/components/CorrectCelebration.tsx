import { useCallback, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../i18n/I18nContext'
import { RewardRain } from './RewardRain'

/* The moment a question is answered correctly, layered so it lands as a real "やったー!"
 * rather than a quiet colour change:
 *   1. a はなまる (the flower-circle a teacher draws on a perfect answer) stamps in at the
 *      centre and fades out after about a second — short, so it never holds up the next tap;
 *   2. a ring of confetti bursts outward from behind it;
 *   3. the existing falling treats (RewardRain), more of them as the streak grows;
 *   4. from 3 in a row, a 「○もん れんぞく！」 ribbon under the はなまる.
 * Mount with a new `key` to replay. Pointer events pass through everything. */

const BURST_COLORS = ['#ff7eb6', '#ffd166', '#7bdff2', '#b388ff', '#8be38b', '#ff9f68']
const PETALS = 12

interface BurstPiece {
  key: number
  angle: number
  distance: number
  size: number
  color: string
  round: boolean
  delay: number
}

function buildBurst(count: number): BurstPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    key: i,
    angle: (i / count) * Math.PI * 2 + Math.random() * 0.3,
    distance: 110 + Math.random() * 90,
    size: 8 + Math.random() * 8,
    color: BURST_COLORS[i % BURST_COLORS.length],
    round: Math.random() < 0.5,
    delay: Math.random() * 0.08,
  }))
}

function Hanamaru() {
  // Spiral: three loops winding inward, drawn as one stroke so it can "write" itself.
  const spiral = useMemo(() => {
    const pts: string[] = []
    const turns = 2.6
    const steps = 120
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const a = -Math.PI / 2 + t * turns * Math.PI * 2
      const r = 46 - t * 34
      pts.push(`${(60 + r * Math.cos(a)).toFixed(1)},${(60 + r * Math.sin(a)).toFixed(1)}`)
    }
    return `M${pts.join(' L')}`
  }, [])

  return (
    <svg viewBox="-10 -10 140 140" width="100%" height="100%">
      {Array.from({ length: PETALS }, (_, i) => {
        const a = (i / PETALS) * Math.PI * 2
        return (
          <ellipse
            key={i}
            cx={60 + 56 * Math.cos(a)}
            cy={60 + 56 * Math.sin(a)}
            rx={14}
            ry={10}
            transform={`rotate(${(a * 180) / Math.PI} ${60 + 56 * Math.cos(a)} ${60 + 56 * Math.sin(a)})`}
            fill="#ffd1e6"
            stroke="#ff5c9d"
            strokeWidth={3}
          />
        )
      })}
      <circle cx={60} cy={60} r={52} fill="#fff8fb" stroke="#ff5c9d" strokeWidth={4} />
      <motion.path
        d={spiral}
        fill="none"
        stroke="#ff3d7f"
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.45, delay: 0.12, ease: 'easeOut' }}
      />
    </svg>
  )
}

export function CorrectCelebration({ streak: streakProp }: { streak: number }) {
  const { t } = useI18n()
  const reduceMotion = useReducedMotion()
  // Frozen at mount: the parent's streak resets on the next wrong answer while this is still
  // mounted, which must not restart (or shrink) the animation mid-way.
  const [streak] = useState(streakProp)
  const [burst] = useState(() => buildBurst(streak >= 5 ? 28 : 20))
  const showStreak = streak >= 3

  return (
    <div aria-hidden="true" className="correct-celebration">
      {!reduceMotion && <RewardRain count={streak >= 5 ? 28 : streak >= 3 ? 22 : 16} />}
      <div className="correct-celebration-center">
        {!reduceMotion &&
          burst.map((p) => (
            <motion.span
              key={p.key}
              className="correct-burst-piece"
              style={{ width: p.size, height: p.size, background: p.color, borderRadius: p.round ? '50%' : 3 }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
              animate={{
                x: Math.cos(p.angle) * p.distance,
                y: Math.sin(p.angle) * p.distance,
                opacity: [1, 1, 0],
                scale: 1,
                rotate: 180,
              }}
              transition={{ duration: 0.75, delay: p.delay, ease: 'easeOut' }}
            />
          ))}
        <motion.div
          className="correct-hanamaru"
          initial={reduceMotion ? { opacity: 0 } : { scale: 0.2, rotate: -25, opacity: 0 }}
          animate={
            reduceMotion
              ? { opacity: [0, 1, 1, 0] }
              : { scale: [0.2, 1.15, 1, 1, 0.9], rotate: [-25, 6, 0, 0, 0], opacity: [0, 1, 1, 1, 0] }
          }
          transition={{ duration: 1.25, times: [0, 0.25, 0.4, 0.8, 1], ease: 'easeOut' }}
        >
          <Hanamaru />
        </motion.div>
        {showStreak && (
          <motion.div
            className="correct-streak-ribbon"
            initial={{ y: 12, opacity: 0, scale: 0.8 }}
            animate={{ y: [12, 0, 0, 0], opacity: [0, 1, 1, 0], scale: [0.8, 1.1, 1, 1] }}
            transition={{ duration: 1.4, times: [0, 0.2, 0.8, 1], delay: 0.15 }}
          >
            {t('celebrationStreak', { streak })}
          </motion.div>
        )}
      </div>
    </div>
  )
}

/** For screens without a quiz streak (the なぞる practice screens): `celebrate()` replays
 * the visual (call it next to playCorrectSfx(), which owns the sound) and `celebration` is
 * rendered anywhere inside the screen. */
export function useCorrectCelebration() {
  const [key, setKey] = useState(0)
  const celebrate = useCallback(() => {
    setKey((k) => k + 1)
    navigator.vibrate?.(35)
  }, [])
  const celebration = key > 0 ? <CorrectCelebration key={key} streak={1} /> : null
  return { celebrate, celebration }
}
