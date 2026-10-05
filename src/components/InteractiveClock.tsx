import { useRef, useState, type PointerEvent } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { formatClockKey } from '../domain/questionGenerators/clock'

interface InteractiveClockProps {
  size?: number
  /** "minutes since 12:00" (0-719) to start the hands at — defaults to 3:00 for the
   * free-play widget on LevelSelectScreen. */
  initialTotalMinutes?: number
  /** Fires on every hand move with the current 12-hour hour and minute — lets a quiz
   * question track what the child has set without this component knowing about quiz
   * answer-checking at all. */
  onChange?: (hour12: number, minute: number) => void
  /** The free-play widget's "try moving the hands!" caption doesn't fit a quiz question
   * that already has its own prompt — omit it there. */
  hintText?: string
  /** Minute hand snaps to multiples of this (5 → 3:00, 3:05, 3:10…). Small fingers can't
   * reliably land on one exact minute; a question whose answer is a multiple of 5 stays
   * exactly as answerable with far less fiddly dragging. */
  minuteStep?: number
  /** Quiz layout: the clock face as large as the screen allows (see
   * .interactive-clock--large), instead of the compact free-play widget size. */
  large?: boolean
}

type DragTarget = 'hour' | 'minute' | null

function pointOnCircle(angleDeg: number, radius: number): { x: number; y: number } {
  const angleRad = (angleDeg * Math.PI) / 180
  return { x: 50 + radius * Math.sin(angleRad), y: 50 - radius * Math.cos(angleRad) }
}

/** Smallest difference between two clock angles (0-180). */
function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/** Angle (0-360, clockwise from 12 o'clock) of a pointer position relative to the clock's center. */
function angleFromCenter(clientX: number, clientY: number, rect: DOMRect): number {
  const dx = clientX - (rect.left + rect.width / 2)
  const dy = clientY - (rect.top + rect.height / 2)
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI
  return deg < 0 ? deg + 360 : deg
}

/** Real analog clocks couple both hands to a single continuous position — the hour hand
 * creeps forward through each hour rather than jumping at :00 — so this tracks one
 * "minutes since 12:00" value (0-719) as the sole source of truth for both hands and the
 * digital readout, instead of two independently-set numbers that could show an
 * impossible hand position. */
export function InteractiveClock({
  size = 220,
  initialTotalMinutes = 3 * 60,
  onChange,
  hintText,
  minuteStep = 1,
  large = false,
}: InteractiveClockProps) {
  const { t, lang } = useI18n()
  const svgRef = useRef<SVGSVGElement>(null)
  const dragTarget = useRef<DragTarget>(null)
  const [totalMinutes, setTotalMinutes] = useState(initialTotalMinutes)

  const hour12 = Math.floor(totalMinutes / 60) % 12
  const minute = totalMinutes % 60
  const displayHour = hour12 === 0 ? 12 : hour12

  function updateTotalMinutes(updater: (prev: number) => number) {
    setTotalMinutes((prev) => {
      const next = updater(prev)
      const nextHour12 = Math.floor(next / 60) % 12
      onChange?.(nextHour12 === 0 ? 12 : nextHour12, next % 60)
      return next
    })
  }

  const hourAngle = totalMinutes * 0.5
  const minuteAngle = minute * 6
  const hourHand = pointOnCircle(hourAngle, 24)
  const minuteHand = pointOnCircle(minuteAngle, 36)

  function moveTo(clientX: number, clientY: number) {
    const svg = svgRef.current
    if (!svg || !dragTarget.current) return
    const angle = angleFromCenter(clientX, clientY, svg.getBoundingClientRect())

    if (dragTarget.current === 'minute') {
      const rawMinute = (Math.round(angle / (6 * minuteStep)) * minuteStep) % 60
      updateTotalMinutes((prev) => {
        const prevMinute = prev % 60
        const hourBase = prev - prevMinute
        let nextHourBase = hourBase
        // Crossing the 12 while dragging should roll the hour over, same as a real clock.
        if (prevMinute > 45 && rawMinute < 15) nextHourBase = hourBase + 60
        else if (prevMinute < 15 && rawMinute > 45) nextHourBase = hourBase - 60
        return (((nextHourBase + rawMinute) % 720) + 720) % 720
      })
    } else {
      // The hour whose hand position at the CURRENT minute is closest to the finger — at 9:30
      // a real hour hand sits halfway between 9 and 10, and plain round(angle / 30) turned a
      // correctly placed hand there into 10.
      updateTotalMinutes((prev) => {
        const prevMinute = prev % 60
        const rawHour = ((Math.round((angle - prevMinute * 0.5) / 30) % 12) + 12) % 12
        return rawHour * 60 + prevMinute
      })
    }
  }

  /** A drag can start ANYWHERE on the face, not only on a thin hand: the hand pointing
   * closer to where the finger landed is the one that moves. When both hands point roughly
   * the same way, distance from the center decides (the minute hand is the longer one). */
  function handlePointerDown(e: PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    e.preventDefault()
    const rect = svg.getBoundingClientRect()
    const angle = angleFromCenter(e.clientX, e.clientY, rect)
    const radius = (Math.hypot(e.clientX - (rect.left + rect.width / 2), e.clientY - (rect.top + rect.height / 2)) / rect.width) * 100
    const toHour = angleDiff(angle, hourAngle)
    const toMinute = angleDiff(angle, minuteAngle)
    dragTarget.current = Math.abs(toHour - toMinute) < 25 ? (radius > 30 ? 'minute' : 'hour') : toMinute < toHour ? 'minute' : 'hour'
    try {
      svg.setPointerCapture(e.pointerId)
    } catch {
      // Capture is a nicety (keeps the drag when the finger strays off the face); never let
      // it stop the hand from moving.
    }
    moveTo(e.clientX, e.clientY)
  }

  function handlePointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!dragTarget.current) return
    moveTo(e.clientX, e.clientY)
  }

  function endDrag(e: PointerEvent<SVGSVGElement>) {
    dragTarget.current = null
    try {
      svgRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      // not captured
    }
  }

  const digitalText = `${displayHour}:${String(minute).padStart(2, '0')}`
  const spokenText = formatClockKey(`${displayHour}:${minute}`, lang)

  return (
    <div className={`interactive-clock${large ? ' interactive-clock--large' : ''}`}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label={digitalText}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ touchAction: 'none', cursor: 'grab' }}
      >
        <circle cx="50" cy="50" r="47" fill="white" stroke="#ffd3ea" strokeWidth="4" />
        {Array.from({ length: 12 }, (_, i) => {
          const inner = pointOnCircle(i * 30, 40)
          const outer = pointOnCircle(i * 30, 44)
          return (
            <line
              key={i}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="#4a3b4a"
              strokeWidth={i % 3 === 0 ? 3 : 1.5}
            />
          )
        })}
        {Array.from({ length: 12 }, (_, i) => {
          const hourNumber = i === 0 ? 12 : i
          const { x, y } = pointOnCircle(i * 30, 32)
          return (
            <text
              key={hourNumber}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="9"
              fontWeight="800"
              fill="#4a3b4a"
              style={{ pointerEvents: 'none' }}
            >
              {hourNumber}
            </text>
          )
        })}

        <line x1="50" y1="50" x2={hourHand.x} y2={hourHand.y} stroke="#4a3b4a" strokeWidth="6" strokeLinecap="round" />
        <line
          x1="50"
          y1="50"
          x2={minuteHand.x}
          y2={minuteHand.y}
          stroke="#ff5fae"
          strokeWidth="4.5"
          strokeLinecap="round"
        />

        {/* Big knobs at each hand's tip show what to grab (the whole face is the hit area). */}
        <circle cx={hourHand.x} cy={hourHand.y} r="7" fill="#4a3b4a" />
        <circle cx={minuteHand.x} cy={minuteHand.y} r="6.5" fill="#ff5fae" stroke="white" strokeWidth="1.5" />

        <circle cx="50" cy="50" r="3.5" fill="#4a3b4a" />
      </svg>

      <div className="digital-clock">{digitalText}</div>
      {hintText !== '' && <p className="hint-caption">{hintText ?? t('clockPracticeHint')}</p>}
      <p className="digital-clock-reading">{spokenText}</p>
    </div>
  )
}
