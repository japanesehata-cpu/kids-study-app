import type { ShapeId } from '../domain/types'

interface ShapeIconProps {
  shape: ShapeId
  size?: number
}

const FILL = '#ffd166'
const FILL_LIGHT = '#ffe4a3'
const FILL_DARK = '#e0a942'
const STROKE = '#4a3b4a'
const STROKE_WIDTH = 4

/** Same polar-coordinate convention as ClockFace.tsx's pointOnCircle (0° = top, clockwise) —
 * used here for the triangle's 3 vertices and the star's 10 alternating-radius points. */
function pointOnCircle(angleDeg: number, radius: number): { x: number; y: number } {
  const angleRad = (angleDeg * Math.PI) / 180
  return { x: 50 + radius * Math.sin(angleRad), y: 50 - radius * Math.cos(angleRad) }
}

function toPoints(pts: { x: number; y: number }[]): string {
  return pts.map((p) => `${p.x},${p.y}`).join(' ')
}

function starPoints(): string {
  const pts = Array.from({ length: 10 }, (_, i) => pointOnCircle(i * 36, i % 2 === 0 ? 38 : 16))
  return toPoints(pts)
}

const HEART_PATH =
  'M50,82 C20,58 12,38 22,25 C30,14 46,16 50,32 C54,16 70,14 78,25 C88,38 80,58 50,82 Z'

/** Draws all 12 ShapeId variants used by the しずけい category (see
 * domain/questionGenerators/shapes.ts) in a flat, minimal style with no gradients —
 * matching ClockFace.tsx's conventions (fixed 0-100 viewBox, `size` only sets the
 * rendered pixel size, `role="img"` + a props-derived `aria-label`). 2D shapes use one
 * fixed fill/stroke pair regardless of which shape it is, deliberately — the choice grid
 * shows several of these side by side, and a fixed color keeps the comparison about FORM,
 * not color. 3D shapes fake depth the same flat-primitives way (a lighter "near" face, a
 * darker "far" face), no gradients/filters. */
export function ShapeIcon({ shape, size = 160 }: ShapeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={shape}>
      {renderShape(shape)}
    </svg>
  )
}

function renderShape(shape: ShapeId) {
  switch (shape) {
    case 'circle':
      return <circle cx="50" cy="50" r="35" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
    case 'triangle': {
      const pts = [0, 120, 240].map((a) => pointOnCircle(a, 38))
      return <polygon points={toPoints(pts)} fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
    }
    case 'rightTriangle':
      return (
        <polygon
          points="25,80 25,20 80,80"
          fill={FILL}
          stroke={STROKE}
          strokeWidth={STROKE_WIDTH}
          strokeLinejoin="round"
        />
      )
    case 'square':
      return <rect x="25" y="25" width="50" height="50" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
    case 'rectangle':
      return <rect x="10" y="32" width="80" height="36" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
    case 'rhombus':
      // A tall diamond (vertical diagonal 70 > horizontal diagonal 60) — deliberately NOT
      // axis-aligned like `square`, so ★6's square-vs-rhombus choice is a real visual
      // distinction, not just "which one is rotated 45°".
      return (
        <polygon
          points="50,15 80,50 50,85 20,50"
          fill={FILL}
          stroke={STROKE}
          strokeWidth={STROKE_WIDTH}
          strokeLinejoin="round"
        />
      )
    case 'star':
      return <polygon points={starPoints()} fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
    case 'heart':
      return <path d={HEART_PATH} fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
    case 'sphere':
      return (
        <>
          <circle cx="50" cy="50" r="35" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
          <ellipse cx="39" cy="38" rx="11" ry="7" fill="white" opacity="0.55" />
        </>
      )
    case 'cube':
      return (
        <>
          <rect x="25" y="40" width="45" height="40" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
          <polygon
            points="70,40 85,25 85,65 70,80"
            fill={FILL_DARK}
            stroke={STROKE}
            strokeWidth={STROKE_WIDTH}
            strokeLinejoin="round"
          />
          <polygon
            points="25,40 40,25 85,25 70,40"
            fill={FILL_LIGHT}
            stroke={STROKE}
            strokeWidth={STROKE_WIDTH}
            strokeLinejoin="round"
          />
        </>
      )
    case 'cylinder':
      return (
        <>
          <ellipse cx="50" cy="72" rx="30" ry="10" fill={FILL_DARK} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
          <rect x="20" y="28" width="60" height="44" fill={FILL} />
          <line x1="20" y1="28" x2="20" y2="72" stroke={STROKE} strokeWidth={STROKE_WIDTH} />
          <line x1="80" y1="28" x2="80" y2="72" stroke={STROKE} strokeWidth={STROKE_WIDTH} />
          <ellipse cx="50" cy="28" rx="30" ry="10" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
        </>
      )
    case 'cone':
      return (
        <>
          <polygon points="50,15 22,75 78,75" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
          <ellipse cx="50" cy="75" rx="28" ry="8" fill={FILL_DARK} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
        </>
      )
  }
}
