import { useRef, useState, type PointerEvent } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { formatClockKey } from '../domain/questionGenerators/clock'

interface InteractiveClockProps {
  size?: number
}

type DragTarget = 'hour' | 'minute' | null

function pointOnCircle(angleDeg: number, radius: number): { x: number; y: number } {
  const angleRad = (angleDeg * Math.PI) / 180
  return { x: 50 + radius * Math.sin(angleRad), y: 50 - radius * Math.cos(angleRad) }
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
export function InteractiveClock({ size = 220 }: InteractiveClockProps) {
  const { t, lang } = useI18n()
  const svgRef = useRef<SVGSVGElement>(null)
  const dragTarget = useRef<DragTarget>(null)
  const [totalMinutes, setTotalMinutes] = useState(3 * 60) // starts at 3:00

  const hour12 = Math.floor(totalMinutes / 60) % 12
  const minute = totalMinutes % 60
  const displayHour = hour12 === 0 ? 12 : hour12

  const hourAngle = totalMinutes * 0.5
  const minuteAngle = minute * 6
  const hourHand = pointOnCircle(hourAngle, 24)
  const minuteHand = pointOnCircle(minuteAngle, 36)

  function moveTo(clientX: number, clientY: number) {
    const svg = svgRef.current
    if (!svg || !dragTarget.current) return
    const angle = angleFromCenter(clientX, clientY, svg.getBoundingClientRect())

    if (dragTarget.current === 'minute') {
      const rawMinute = Math.round(angle / 6) % 60
      setTotalMinutes((prev) => {
        const prevMinute = prev % 60
        const hourBase = prev - prevMinute
        let nextHourBase = hourBase
        // Crossing the 12 while dragging should roll the hour over, same as a real clock.
        if (prevMinute > 45 && rawMinute < 15) nextHourBase = hourBase + 60
        else if (prevMinute < 15 && rawMinute > 45) nextHourBase = hourBase - 60
        return (((nextHourBase + rawMinute) % 720) + 720) % 720
      })
    } else {
      const rawHour = Math.round(angle / 30) % 12
      setTotalMinutes((prev) => rawHour * 60 + (prev % 60))
    }
  }

  function startDrag(target: DragTarget) {
    return (e: PointerEvent<SVGElement>) => {
      e.preventDefault()
      dragTarget.current = target
      svgRef.current?.setPointerCapture(e.pointerId)
      moveTo(e.clientX, e.clientY)
    }
  }

  function handlePointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!dragTarget.current) return
    moveTo(e.clientX, e.clientY)
  }

  function endDrag(e: PointerEvent<SVGSVGElement>) {
    dragTarget.current = null
    svgRef.current?.releasePointerCapture(e.pointerId)
  }

  const digitalText = `${displayHour}:${String(minute).padStart(2, '0')}`
  const spokenText = formatClockKey(`${displayHour}:${minute}`, lang)

  return (
    <div className="interactive-clock">
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label={digitalText}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ touchAction: 'none' }}
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

        {/* Wide invisible strokes give small fingers a forgiving drag target along the
            whole hand, not just its thin visible line. */}
        <line
          x1="50"
          y1="50"
          x2={hourHand.x}
          y2={hourHand.y}
          stroke="transparent"
          strokeWidth="14"
          strokeLinecap="round"
          onPointerDown={startDrag('hour')}
          style={{ cursor: 'grab' }}
        />
        <line
          x1="50"
          y1="50"
          x2={minuteHand.x}
          y2={minuteHand.y}
          stroke="transparent"
          strokeWidth="14"
          strokeLinecap="round"
          onPointerDown={startDrag('minute')}
          style={{ cursor: 'grab' }}
        />

        <line x1="50" y1="50" x2={hourHand.x} y2={hourHand.y} stroke="#4a3b4a" strokeWidth="5" strokeLinecap="round" />
        <line
          x1="50"
          y1="50"
          x2={minuteHand.x}
          y2={minuteHand.y}
          stroke="#ff5fae"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Visible grab handles at each hand's tip, doubling as extra hit area. */}
        <circle
          cx={hourHand.x}
          cy={hourHand.y}
          r="6"
          fill="#4a3b4a"
          onPointerDown={startDrag('hour')}
          style={{ cursor: 'grab' }}
        />
        <circle
          cx={minuteHand.x}
          cy={minuteHand.y}
          r="5"
          fill="#ff5fae"
          onPointerDown={startDrag('minute')}
          style={{ cursor: 'grab' }}
        />

        <circle cx="50" cy="50" r="3.5" fill="#4a3b4a" />
      </svg>

      <div className="digital-clock">{digitalText}</div>
      <p className="hint-caption">{t('clockPracticeHint')}</p>
      <p className="digital-clock-reading">{spokenText}</p>
    </div>
  )
}
