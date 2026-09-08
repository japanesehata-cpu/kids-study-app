import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { isStrokeTraced, type Point } from '../lib/strokeMatch'

interface KanjiTraceCanvasProps {
  char: string
  /** Ordered SVG path "d" strings, viewBox "0 0 109 109" — see kanjiStrokes.ts. */
  strokes: string[]
  size?: number
  restartLabel: string
  onComplete: () => void
}

const DEFAULT_SIZE = 280
const VIEWBOX = 109
// How many strokes were traced correctly across all of this render, used only to key the
// mistake-flash timeout so a rapid retry doesn't get its flash cut short by an earlier one.
const MISTAKE_FLASH_MS = 400
const SAMPLE_COUNT = 20

/** Converts a pointer event's screen coordinates into the SVG's own 0-109 viewBox user
 * space, so drawn points land in the exact same coordinate system as kanjiStrokes.ts's
 * stroke paths (and therefore as the points getPointAtLength() below produces) — this is
 * what makes the component correct at any rendered `size`, not just DEFAULT_SIZE. */
function toSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const transformed = pt.matrixTransform(ctm.inverse())
  return { x: transformed.x, y: transformed.y }
}

function sampleStroke(pathEl: SVGPathElement): Point[] {
  const length = pathEl.getTotalLength()
  return Array.from({ length: SAMPLE_COUNT + 1 }, (_, i) => {
    const p = pathEl.getPointAtLength((length * i) / SAMPLE_COUNT)
    return { x: p.x, y: p.y }
  })
}

export function KanjiTraceCanvas({ char, strokes, size = DEFAULT_SIZE, restartLabel, onComplete }: KanjiTraceCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  // All pointer/touch handling lives on this plain <div> overlay, not the SVG itself — a
  // field report showed the SVG never responding to real touch input even after guarding
  // setPointerCapture. SVG elements have historically inconsistent touch-action and
  // pointer-capture support across mobile browsers (Safari in particular); a <div> is the
  // same element type HandwritingCanvas's own touch handling already relies on
  // successfully in production (there via a <canvas>, functionally identical here), so
  // this sidesteps the SVG-specific quirk entirely rather than guessing at it further.
  // The SVG stays purely visual (pointer-events: none, see CSS) — its geometry APIs
  // (getScreenCTM, getPointAtLength) still work fine on an element that isn't receiving
  // pointer events itself.
  const overlayRef = useRef<HTMLDivElement>(null)
  const guidePathRefs = useRef<(SVGPathElement | null)[]>([])
  const drawingRef = useRef(false)
  // The in-progress gesture's points live in a ref, not state — handlePointerUp reads
  // them synchronously to validate and (on the last stroke) call onComplete(), which sets
  // state on the *parent* KanjiTraceScreen. Doing that from inside a setState updater
  // function (the first version of this component did) trips React's "Cannot update a
  // component while rendering a different component" warning/inconsistency, since the
  // updater runs during this component's own render-commit cycle — a ref read in a plain
  // event-handler body avoids that entirely. `drawnPoints` state exists only to drive the
  // live ink polyline's render.
  const pointsRef = useRef<Point[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [drawnPoints, setDrawnPoints] = useState<Point[]>([])
  const [mistake, setMistake] = useState(false)

  // A new character resets all progress — same reasoning as HandwritingCanvas keying its
  // canvases by `${level}-${entry.id}` in HandwritingScreen, just done via effect here
  // since this component (unlike a <canvas>) has real React state to reset.
  useEffect(() => {
    pointsRef.current = []
    setCurrentIndex(0)
    setDrawnPoints([])
    setMistake(false)
  }, [char])

  function handleRestart() {
    pointsRef.current = []
    setCurrentIndex(0)
    setDrawnPoints([])
    setMistake(false)
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (currentIndex >= strokes.length) return
    e.preventDefault()
    const svg = svgRef.current
    const overlay = overlayRef.current
    if (!svg || !overlay) return
    try {
      overlay.setPointerCapture(e.pointerId)
    } catch {
      // Capture is a nice-to-have (keeps tracking the gesture if a finger drifts outside
      // the overlay's bounds) — not required for the drawing state below to start, so a
      // capture failure shouldn't block the gesture.
    }
    drawingRef.current = true
    pointsRef.current = [toSvgPoint(svg, e.clientX, e.clientY)]
    setDrawnPoints(pointsRef.current)
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drawingRef.current) return
    e.preventDefault()
    const svg = svgRef.current
    if (!svg) return
    pointsRef.current = [...pointsRef.current, toSvgPoint(svg, e.clientX, e.clientY)]
    setDrawnPoints(pointsRef.current)
  }

  function handlePointerUp() {
    if (!drawingRef.current) return
    drawingRef.current = false
    const drawn = pointsRef.current
    pointsRef.current = []
    setDrawnPoints([])

    const guidePath = guidePathRefs.current[currentIndex]
    if (!guidePath) return

    const target = sampleStroke(guidePath)
    if (isStrokeTraced(target, drawn)) {
      const next = currentIndex + 1
      setCurrentIndex(next)
      if (next >= strokes.length) onComplete()
    } else {
      setMistake(true)
      setTimeout(() => setMistake(false), MISTAKE_FLASH_MS)
    }
  }

  const inkPointsAttr = drawnPoints.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <div className="handwriting-board">
      <div
        className={`kanji-trace-canvas-stack${mistake ? ' kanji-trace-canvas-stack--mistake' : ''}`}
        style={{ width: size, height: size }}
      >
        <svg ref={svgRef} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="kanji-trace-svg">
          {strokes.map((d, i) => (
            <path
              key={i}
              ref={(el) => {
                guidePathRefs.current[i] = el
              }}
              d={d}
              className={
                i < currentIndex
                  ? 'kanji-trace-stroke kanji-trace-stroke--done'
                  : i === currentIndex
                    ? 'kanji-trace-stroke kanji-trace-stroke--current'
                    : 'kanji-trace-stroke kanji-trace-stroke--pending'
              }
            />
          ))}
          {drawnPoints.length > 0 && <polyline points={inkPointsAttr} className="kanji-trace-ink" />}
        </svg>
        <div
          ref={overlayRef}
          className="kanji-trace-overlay"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
      <div className="handwriting-controls">
        <button type="button" className="secondary-button" onClick={handleRestart}>
          {restartLabel}
        </button>
      </div>
    </div>
  )
}
