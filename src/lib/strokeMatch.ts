export interface Point {
  x: number
  y: number
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Lenient stroke-completion check for かんじ なぞる (trace) practice: does `drawn` (the
 * user's pointer-drag points) roughly follow `target` (points sampled along the KanjiVG
 * reference stroke's path, see KanjiTraceCanvas)? `toleranceRatio` is relative to the
 * KanjiVG viewBox size (109), so the same constant works at any canvas scale as long as
 * both point sets are in the same 0-109 coordinate space.
 *
 * Not stroke-perfect calligraphy grading — a young child's pointer control is wobbly, so
 * this only checks: the drawn stroke starts and ends near the target's start/end, and
 * every target sample point has *some* drawn point near it (order-insensitive coverage,
 * not a strict sequence match — far more forgiving of a shaky hand than requiring the
 * drawn points to arrive in the same order at the same pace). */
export function isStrokeTraced(target: Point[], drawn: Point[], toleranceRatio = 0.22): boolean {
  if (target.length === 0 || drawn.length === 0) return false
  const tolerance = 109 * toleranceRatio

  const start = target[0]
  const end = target[target.length - 1]
  const startsNearBeginning = drawn.some((p) => distance(p, start) <= tolerance)
  const endsNearEnd = distance(drawn[drawn.length - 1], end) <= tolerance
  if (!startsNearBeginning || !endsNearEnd) return false

  return target.every((targetPoint) => drawn.some((drawnPoint) => distance(targetPoint, drawnPoint) <= tolerance))
}
