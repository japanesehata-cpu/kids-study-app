export interface OverlapScore {
  /** How much of the target character got traced (recall) — the main signal, since a kid's
   * stroke rarely covers 100% of a glyph's rendered pixels even when it's clearly the
   * right shape. */
  coverage: number
  /** How much of the drawn ink actually landed on the target (precision) — keeps a scribble
   * covering the whole canvas from scoring well on volume alone. */
  precision: number
  /** Average of the two. Lenient on messy kid handwriting while still requiring the ink to
   * roughly follow the character rather than just fill the canvas. */
  combined: number
}

/** Compares a hand-drawn ink mask against a target glyph's mask — both same-length 0/1
 * arrays over identical canvas dimensions (see HandwritingCanvas.tsx, which builds both via
 * canvas getImageData alpha thresholding). Pure and DOM-free so it's unit-testable on its
 * own. */
export function computeOverlapScore(targetMask: Uint8Array, inkMask: Uint8Array): OverlapScore {
  let targetTotal = 0
  let inkTotal = 0
  let overlap = 0
  const len = Math.min(targetMask.length, inkMask.length)
  for (let i = 0; i < len; i++) {
    if (targetMask[i]) targetTotal++
    if (inkMask[i]) inkTotal++
    if (targetMask[i] && inkMask[i]) overlap++
  }
  const coverage = targetTotal > 0 ? overlap / targetTotal : 0
  const precision = inkTotal > 0 ? overlap / inkTotal : 0
  return { coverage, precision, combined: (coverage + precision) / 2 }
}
