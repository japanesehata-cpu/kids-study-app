interface ClockFaceProps {
  hour: number
  minute: number
  size?: number
}

function pointOnCircle(angleDeg: number, radius: number): { x: number; y: number } {
  const angleRad = (angleDeg * Math.PI) / 180
  return { x: 50 + radius * Math.sin(angleRad), y: 50 - radius * Math.cos(angleRad) }
}

export function ClockFace({ hour, minute, size = 160 }: ClockFaceProps) {
  const hourAngle = ((hour % 12) + minute / 60) * 30
  const minuteAngle = minute * 6
  const hourHand = pointOnCircle(hourAngle, 24)
  const minuteHand = pointOnCircle(minuteAngle, 36)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${hour}:${String(minute).padStart(2, '0')}`}
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
          >
            {hourNumber}
          </text>
        )
      })}
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
      <circle cx="50" cy="50" r="3.5" fill="#4a3b4a" />
    </svg>
  )
}
