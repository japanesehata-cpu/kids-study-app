import { useMemo } from 'react'

/* A few soft hearts and soap bubbles drifting up behind every screen — slow (20-34s per
 * trip) and faint, so it reads as "the room is alive" without ever pulling the eye from a
 * question. Pure CSS transforms (GPU-composited), behind FitToViewport, ignores taps.
 * Hidden entirely for prefers-reduced-motion (theme.css). */

const COUNT = 9

export function FloatingBackdrop() {
  const items = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        key: i,
        kind: i % 3 === 0 ? 'heart' : 'bubble',
        left: (i / COUNT) * 100 + Math.random() * (100 / COUNT),
        size: 14 + Math.random() * 22,
        duration: 20 + Math.random() * 14,
        // Negative delay: start mid-trip, so the screen isn't empty for the first 20s.
        delay: -Math.random() * 30,
        sway: 10 + Math.random() * 18,
      })),
    [],
  )

  return (
    <div className="floating-backdrop" aria-hidden="true">
      {items.map((it) => (
        <span
          key={it.key}
          className={`floating-item floating-${it.kind}`}
          style={{
            left: `${it.left}%`,
            width: it.size,
            height: it.size,
            fontSize: it.size,
            animationDuration: `${it.duration}s, ${it.duration / 4}s`,
            animationDelay: `${it.delay}s, ${it.delay}s`,
            ['--sway' as string]: `${it.sway}px`,
          }}
        >
          {it.kind === 'heart' ? '♥' : null}
        </span>
      ))}
    </div>
  )
}
