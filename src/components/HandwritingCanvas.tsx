import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { computeOverlapScore } from '../lib/glyphMask'

interface HandwritingCanvasProps {
  char: string
  size?: number
  doneLabel: string
  clearLabel: string
  /** Level 1 (trace) shows the guide glyph; level 2 (listen & write) hides it — the target
   * mask is still computed either way, since scoring works identically in both modes. */
  showGuide: boolean
  /** stars is 1-3, purely cosmetic — this mode never counts as right/wrong (see
   * HandwritingScreen), so it's always at least 1. */
  onDone: (stars: number) => void
}

const DEFAULT_SIZE = 280
const GUIDE_ALPHA = 0.32
const ALPHA_THRESHOLD = 24
// Canvas's 2D context can't resolve CSS custom properties in ctx.font (var(--font-family)
// silently fails to parse, falling back to a tiny default size) — this literal stack is
// duplicated from the <link> in index.html for that reason. BIZ UDGothic specifically
// (rather than the app's playful default rounded font) because its letterforms are plain
// and unambiguous — closer to what's actually taught for stroke shape, which matters a lot
// more here than it does anywhere else in the app.
const CANVAS_FONT_FAMILY = "'BIZ UDGothic', 'Hiragino Maru Gothic ProN', 'Hiragino Sans', sans-serif"

export function HandwritingCanvas({
  char,
  size = DEFAULT_SIZE,
  doneLabel,
  clearLabel,
  showGuide,
  onDone,
}: HandwritingCanvasProps) {
  const guideRef = useRef<HTMLCanvasElement>(null)
  const inkRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const targetMaskRef = useRef<Uint8Array | null>(null)
  const [hasInk, setHasInk] = useState(false)

  // Renders the target glyph once per character and derives its pixel mask for scoring —
  // this canvas is never drawn on by the child, only the ink layer stacked on top of it is.
  // Waits for the web font to actually finish loading first: drawing before then would
  // silently fall back to the browser default, at the wrong size/shape, exactly like the
  // CSS-var bug this same font string was hardcoded to avoid.
  useEffect(() => {
    let cancelled = false
    const draw = () => {
      if (cancelled) return
      const guide = guideRef.current
      const ctx = guide?.getContext('2d')
      if (!guide || !ctx) return
      // Youon/gairaigo combos (きゃ, ディ, ...) are two glyphs read side by side — the base
      // size is tuned for a single glyph, so a 2-character string needs to shrink or it
      // crowds/overflows the canvas edges.
      const fontPx = Math.round(size * (char.length > 1 ? 0.42 : 0.7))
      ctx.clearRect(0, 0, size, size)
      ctx.font = `700 ${fontPx}px ${CANVAS_FONT_FAMILY}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = `rgba(74, 59, 74, ${GUIDE_ALPHA})`
      ctx.fillText(char, size / 2, size / 2 + size * 0.05)

      const data = ctx.getImageData(0, 0, size, size).data
      const mask = new Uint8Array(size * size)
      for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 10 ? 1 : 0
      targetMaskRef.current = mask
    }
    document.fonts.load(`700 ${Math.round(size * (char.length > 1 ? 0.42 : 0.7))}px BIZ UDGothic`).then(draw).catch(draw)
    return () => {
      cancelled = true
    }
  }, [char, size])

  function getPos(e: ReactPointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const canvas = inkRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    canvas.setPointerCapture(e.pointerId)
    drawingRef.current = true
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setHasInk(true)
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    e.preventDefault()
    const ctx = inkRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineWidth = size * 0.06
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#ff8fc7'
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function stopDrawing() {
    drawingRef.current = false
  }

  function handleClear() {
    const canvas = inkRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, size, size)
    setHasInk(false)
  }

  function handleDoneClick() {
    const canvas = inkRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    // targetMaskRef can still be null on a very fast tap before the web font finishes
    // loading (see the effect above) — rather than leave the button looking broken (no
    // onDone call at all), fall back to a flat middle score instead of blocking completion.
    const targetMask = targetMaskRef.current
    if (!targetMask) {
      onDone(2)
      return
    }
    const data = ctx.getImageData(0, 0, size, size).data
    const inkMask = new Uint8Array(size * size)
    for (let i = 0; i < inkMask.length; i++) inkMask[i] = data[i * 4 + 3] > ALPHA_THRESHOLD ? 1 : 0
    const { combined } = computeOverlapScore(targetMask, inkMask)
    const stars = combined >= 0.55 ? 3 : combined >= 0.3 ? 2 : 1
    onDone(stars)
  }

  return (
    <div className="handwriting-board">
      <div className="handwriting-canvas-stack" style={{ width: size, height: size }}>
        <canvas
          ref={guideRef}
          width={size}
          height={size}
          className="handwriting-canvas handwriting-canvas-guide"
          style={{ visibility: showGuide ? 'visible' : 'hidden' }}
        />
        <canvas
          ref={inkRef}
          width={size}
          height={size}
          className="handwriting-canvas handwriting-canvas-ink"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          onPointerCancel={stopDrawing}
        />
      </div>
      <div className="handwriting-controls">
        <button type="button" className="secondary-button" onClick={handleClear} aria-label={clearLabel}>
          {clearLabel}
        </button>
        <button type="button" className="primary-button" onClick={handleDoneClick} disabled={!hasInk}>
          {doneLabel}
        </button>
      </div>
    </div>
  )
}
