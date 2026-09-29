import { useEffect, useState } from 'react'

/** Returns a size in px that tracks viewport height the same way a CSS clamp() would — for
 * the handful of places (StampReward's orbiting rewards, HandwritingCanvas's actual drawing
 * surface) where "size" isn't just a CSS width/height but also drives real pixel math
 * (canvas resolution, pixel-mask scoring coordinates, framer-motion's numeric x/y offsets)
 * that a plain CSS clamp() string can't reach — those need an actual number, computed in
 * JS. `vhFactor` plays the same role as a CSS clamp()'s middle argument (e.g. 0.26 for
 * `26vh`). Resizes are tracked live so rotating a device or Safari's URL bar hiding/showing
 * doesn't leave a stale, wrong-for-the-viewport size behind. */
export function useResponsiveSize(maxPx: number, vhFactor: number, minPx: number): number {
  const compute = () =>
    typeof window === 'undefined' ? maxPx : Math.min(maxPx, Math.max(minPx, window.innerHeight * vhFactor))

  const [size, setSize] = useState(compute)

  useEffect(() => {
    const onResize = () => setSize(compute())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxPx, vhFactor, minPx])

  return size
}
