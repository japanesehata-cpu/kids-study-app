// Generates src/domain/alphabetStrokes.ts — unlike fetch-kanji-strokes.mjs/fetch-kana-strokes.mjs
// (which pull real stroke-order data from KanjiVG), KanjiVG has no Latin-alphabet coverage, so
// this COMPUTES the 52 uppercase/lowercase letterforms from two primitives (straight lines and
// elliptical arcs) instead of fetching them. Coordinate system matches kanjiStrokes.ts /
// kanaStrokes.ts's 109x109 viewBox convention: cap-height top y=15, x-height top (lowercase) y=42,
// baseline y=90, descender bottom (g/j/p/q/y) y=108, left x=25, right x=85, center x=55.
//
// Reviewed via an Artifact HIL preview before being wired into the app — see the plan for this
// feature. Regenerate with `node scripts/generate-alphabet-strokes.mjs` — do not hand-edit the
// generated .ts file.

import fs from 'node:fs'

const CAP_TOP = 15
const XH_TOP = 42
const BASE = 90
const DESC = 108
const LEFT = 25
const RIGHT = 85
const MID = 55

function r(n) {
  return Math.round(n * 100) / 100
}

function line(x1, y1, x2, y2) {
  return `M${r(x1)},${r(y1)} L${r(x2)},${r(y2)}`
}

function normMod(x) {
  return ((x % 360) + 360) % 360
}

// Angle convention: 0=east(+x), 90=south(+y, since SVG y grows downward), 180=west, 270=north.
// sweep=1 means angle increases from startDeg to endDeg (visually clockwise); sweep=0 means it
// decreases (visually counterclockwise). largeArc is derived from how far the sweep direction
// actually travels, so wrap-around arcs (e.g. C's opening crossing 0/360) are always correct
// without the caller doing modular arithmetic themselves.
function arcPoint(cx, cy, rx, ry, deg) {
  const rad = (deg * Math.PI) / 180
  return [cx + rx * Math.cos(rad), cy + ry * Math.sin(rad)]
}

function arc(cx, cy, rx, ry, startDeg, endDeg, sweep) {
  const [sx, sy] = arcPoint(cx, cy, rx, ry, startDeg)
  const [ex, ey] = arcPoint(cx, cy, rx, ry, endDeg)
  const dist = sweep ? normMod(endDeg - startDeg) : normMod(startDeg - endDeg)
  const largeArc = dist > 180 ? 1 : 0
  return `M${r(sx)},${r(sy)} A${r(rx)},${r(ry)} 0 ${largeArc},${sweep} ${r(ex)},${r(ey)}`
}

// A full circle, as one continuous path (two chained semicircle arcs — a single SVG "A" command
// can't span 360 degrees since start===end is degenerate). sweep=1 (default) draws it clockwise
// from startDeg — used for b/p, whose bowl starts at the stem and curves right-then-down first.
// sweep=0 draws it counterclockwise — used for the "magic c" family (a/d/g/o/q/O/Q), which all
// start at the same ~2-o'clock point c itself starts from and sweep left, matching how a real c
// motion closes into a full loop instead of stopping partway.
function fullCircle(cx, cy, rx, ry, startDeg = 270, sweep = 1) {
  const dir = sweep ? 1 : -1
  const midDeg = startDeg + dir * 180
  const [sx, sy] = arcPoint(cx, cy, rx, ry, startDeg)
  const [mx, my] = arcPoint(cx, cy, rx, ry, midDeg)
  return `M${r(sx)},${r(sy)} A${r(rx)},${r(ry)} 0 0,${sweep} ${r(mx)},${r(my)} A${r(rx)},${r(ry)} 0 0,${sweep} ${r(sx)},${r(sy)}`
}

const upperStrokes = {}
const lowerStrokes = {}

// ---------- UPPERCASE ----------

upperStrokes['A'] = [line(MID, CAP_TOP, 30, BASE), line(MID, CAP_TOP, 80, BASE), line(39, 62, 71, 62)]

upperStrokes['B'] = [
  line(32, CAP_TOP, 32, BASE),
  arc(32, 33.75, 22, 18.75, 270, 450, 1),
  arc(32, 71.25, 24, 18.75, 270, 450, 1),
]

upperStrokes['C'] = [arc(MID, 52.5, 27, 37.5, 320, 40, 0)]

upperStrokes['D'] = [line(32, CAP_TOP, 32, BASE), arc(32, 52.5, 30, 37.5, 270, 90, 1)]

upperStrokes['E'] = [
  line(32, CAP_TOP, 32, BASE),
  line(32, CAP_TOP, 78, CAP_TOP),
  line(32, 52.5, 68, 52.5),
  line(32, BASE, 78, BASE),
]

upperStrokes['F'] = [line(32, CAP_TOP, 32, BASE), line(32, CAP_TOP, 78, CAP_TOP), line(32, 52.5, 68, 52.5)]

upperStrokes['G'] = [
  arc(MID, 52.5, 27, 37.5, 340, 20, 0),
  line(80.37, 65.33, 52, 65.33),
]

upperStrokes['H'] = [line(30, CAP_TOP, 30, BASE), line(80, CAP_TOP, 80, BASE), line(30, 52.5, 80, 52.5)]

upperStrokes['I'] = [line(MID, CAP_TOP, MID, BASE)]

upperStrokes['J'] = [line(70, CAP_TOP, 70, 72), arc(55, 72, 15, 18, 0, 130, 1)]

upperStrokes['K'] = [line(30, CAP_TOP, 30, BASE), line(78, CAP_TOP, 30, 55), line(30, 55, 78, BASE)]

upperStrokes['L'] = [line(32, CAP_TOP, 32, BASE), line(32, BASE, 78, BASE)]

// Every straight vertical/diagonal below starts at its top end and is drawn downward — the
// universal "pull down, never push up" rule taught for manuscript strokes — except where a
// zigzag (M/N/V/W's inner diagonals) makes an upward segment unavoidable within one continuous
// stroke; those are called out inline. An earlier version of this file had M's and N's first
// (plain, non-zigzag) vertical drawn bottom-to-top, which is exactly the kind of thing that
// looks visibly backwards when the trace guide animates it — fixed here.
upperStrokes['M'] = [line(28, CAP_TOP, 28, BASE), line(28, CAP_TOP, 55, 60), line(55, 60, 82, CAP_TOP), line(82, CAP_TOP, 82, BASE)]

upperStrokes['N'] = [line(28, CAP_TOP, 28, BASE), line(28, CAP_TOP, 82, BASE), line(82, CAP_TOP, 82, BASE)]

upperStrokes['O'] = [fullCircle(MID, 52.5, 28, 37.5, 320, 0)]

upperStrokes['P'] = [line(32, CAP_TOP, 32, BASE), arc(32, 33.75, 24, 18.75, 270, 450, 1)]

upperStrokes['Q'] = [fullCircle(MID, 52.5, 28, 37.5, 320, 0), line(66, 78, 82, 96)]

upperStrokes['R'] = [
  line(32, CAP_TOP, 32, BASE),
  arc(32, 33.75, 24, 18.75, 270, 450, 1),
  line(32, 52.5, 78, BASE),
]

upperStrokes['S'] = [`M76,26 A16,13 0 1,0 34,42 A18,15 0 1,1 78,80 A16,13 0 1,1 34,79`]

upperStrokes['T'] = [line(28, CAP_TOP, 82, CAP_TOP), line(MID, CAP_TOP, MID, BASE)]

// Third stroke used to run bottom-to-top (82,65 -> 82,CAP_TOP) — same backwards-pull bug as
// M/N/m/n/r above, just easy to miss here since it's the LAST stroke, not the first. Reversed
// so it's a fresh top-to-bottom pull down to meet the bowl, like every other plain vertical.
upperStrokes['U'] = [line(28, CAP_TOP, 28, 65), arc(55, 65, 27, 25, 180, 0, 0), line(82, CAP_TOP, 82, 65)]

upperStrokes['V'] = [line(28, CAP_TOP, MID, BASE), line(MID, BASE, 82, CAP_TOP)]

upperStrokes['W'] = [
  line(24, CAP_TOP, 38, BASE),
  line(38, BASE, 55, 45),
  line(55, 45, 72, BASE),
  line(72, BASE, 86, CAP_TOP),
]

upperStrokes['X'] = [line(28, CAP_TOP, 82, BASE), line(82, CAP_TOP, 28, BASE)]

upperStrokes['Y'] = [line(28, CAP_TOP, MID, 52), line(82, CAP_TOP, MID, 52), line(MID, 52, MID, BASE)]

upperStrokes['Z'] = [line(28, CAP_TOP, 82, CAP_TOP), line(82, CAP_TOP, 28, BASE), line(28, BASE, 82, BASE)]

// ---------- LOWERCASE ----------
// x-height letters live between XH_TOP (42) and BASE (90); ascenders (b,d,f,h,k,l,t) reach up
// to CAP_TOP (15); descenders (g,j,p,q,y) reach down to DESC (108).

lowerStrokes['a'] = [fullCircle(58, 66, 20, 24, 320, 0), line(78, 66, 78, BASE)]

lowerStrokes['b'] = [line(30, CAP_TOP, 30, BASE), fullCircle(56, 66, 22, 24, 180)]

lowerStrokes['c'] = [arc(MID, 66, 20, 24, 320, 40, 0)]

lowerStrokes['d'] = [fullCircle(54, 66, 22, 24, 320, 0), line(80, CAP_TOP, 80, BASE)]

lowerStrokes['e'] = [line(35, 68, 75, 68), arc(55, 68, 20, 22, 0, 340, 0)]

lowerStrokes['f'] = [arc(70, 24, 12, 9, 200, 360, 1), line(58, 15, 58, BASE), line(42, 55, 74, 55)]

lowerStrokes['g'] = [fullCircle(56, 66, 22, 24, 320, 0), line(78, 66, 78, 98), arc(64, 98, 14, 8, 0, 150, 1)]

lowerStrokes['h'] = [line(30, CAP_TOP, 30, BASE), arc(30, 60, 22, 18, 270, 30, 1), line(74, 48, 74, BASE)]

lowerStrokes['i'] = [line(MID, 42, MID, BASE), line(MID, 30, MID, 30)]

lowerStrokes['j'] = [line(64, 42, 64, 98), arc(64, 98, 16, 10, 0, 140, 1), line(64, 30, 64, 30)]

lowerStrokes['k'] = [line(30, CAP_TOP, 30, BASE), line(72, 42, 30, 68), line(30, 68, 72, BASE)]

lowerStrokes['l'] = [line(MID, CAP_TOP, MID, BASE)]

// m/n's first vertical previously ran bottom-to-top (same backwards-stroke bug as M/N above) —
// fixed to top-to-bottom here.
lowerStrokes['m'] = [
  line(24, 42, 24, BASE),
  arc(24, 55, 15, 13, 270, 30, 1),
  line(54, 42, 54, BASE),
  arc(54, 55, 15, 13, 270, 30, 1),
  line(84, 42, 84, BASE),
]

lowerStrokes['n'] = [line(30, 42, 30, BASE), arc(30, 55, 22, 18, 270, 30, 1), line(74, 48, 74, BASE)]

lowerStrokes['o'] = [fullCircle(MID, 66, 22, 24, 320, 0)]

lowerStrokes['p'] = [line(30, 42, 30, 108), fullCircle(56, 66, 22, 24, 180)]

lowerStrokes['q'] = [fullCircle(54, 66, 22, 24, 320, 0), line(80, 42, 80, 108)]

lowerStrokes['r'] = [line(32, 42, 32, BASE), arc(32, 55, 20, 16, 270, 10, 1)]

lowerStrokes['s'] = [`M68,50 A11,9 0 1,0 40,58 A13,11 0 1,1 68,82 A11,9 0 1,1 38,80`]

lowerStrokes['t'] = [line(48, 22, 48, 82), arc(58, 82, 10, 8, 180, 90, 0), line(32, 46, 66, 46)]

lowerStrokes['u'] = [line(32, 42, 32, 74), arc(53, 74, 21, 16, 180, 0, 0), line(74, 42, 74, BASE)]

lowerStrokes['v'] = [line(30, 42, MID, BASE), line(MID, BASE, 80, 42)]

lowerStrokes['w'] = [
  line(24, 42, 36, BASE),
  line(36, BASE, 55, 58),
  line(55, 58, 74, BASE),
  line(74, BASE, 86, 42),
]

lowerStrokes['x'] = [line(30, 42, 80, BASE), line(80, 42, 30, BASE)]

lowerStrokes['y'] = [line(30, 42, 55, 90), line(80, 42, 40, 108)]

lowerStrokes['z'] = [line(32, 44, 78, 44), line(78, 44, 32, BASE), line(32, BASE, 78, BASE)]

const all = { ...upperStrokes, ...lowerStrokes }

const body = Object.entries(all)
  .map(([ch, paths]) => {
    const key = ch === "'" ? `"${ch}"` : `'${ch}'`
    const list = paths.map((d) => `    "${d}",`).join('\n')
    return `  ${key}: [\n${list}\n  ],`
  })
  .join('\n')

const output = `/** Hand-computed stroke path data (SVG path "d" attribute strings, viewBox "0 0 109 109")
 * for アルファベット なぞる (trace) practice — see AlphabetTraceScreen, which uses the same
 * shared KanjiTraceCanvas component かんじ/かな's trace modes do (it only needs a char + its
 * stroke list, nothing alphabet-specific). Covers all 52 upper + lower case letters.
 *
 * Unlike kanjiStrokes.ts/kanaStrokes.ts, this is NOT fetched from KanjiVG — KanjiVG has no
 * Latin-alphabet coverage, so these 52 letterforms are computed from straight-line and
 * elliptical-arc primitives instead. Reviewed via an Artifact HIL preview before being wired
 * into the app. Regenerate with scripts/generate-alphabet-strokes.mjs — do not hand-edit.
 */
export const alphabetStrokePaths: Record<string, string[]> = {
${body}
}
`

fs.writeFileSync(new URL('../src/domain/alphabetStrokes.ts', import.meta.url), output)
console.log('wrote src/domain/alphabetStrokes.ts,', Object.keys(all).length, 'glyphs')
