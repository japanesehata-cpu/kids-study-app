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

// Chains several line()/arc() outputs into ONE continuous stroke — drops every part's leading
// "M x,y" after the first, since it should already match the previous part's end point. Used
// for letters real handwriting draws as a single fluid motion (e.g. U: down, curve under, up)
// rather than as separate lifted-pen strokes.
function combine(...parts) {
  return parts.map((p, i) => (i === 0 ? p : p.replace(/^M[-\d.]+,[-\d.]+\s*/, ''))).join(' ')
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

// The two bumps end/start at the exact same point (32,52.5) — a real B draws them as one
// continuous double-loop after the stem, not two separately-lifted arcs.
upperStrokes['B'] = [line(32, CAP_TOP, 32, BASE), combine(arc(32, 33.75, 22, 18.75, 270, 450, 1), arc(32, 71.25, 24, 18.75, 270, 450, 1))]

upperStrokes['C'] = [arc(MID, 52.5, 27, 37.5, 320, 40, 0)]

upperStrokes['D'] = [line(32, CAP_TOP, 32, BASE), arc(32, 52.5, 30, 37.5, 270, 90, 1)]

upperStrokes['E'] = [
  line(32, CAP_TOP, 32, BASE),
  line(32, CAP_TOP, 78, CAP_TOP),
  line(32, 52.5, 68, 52.5),
  line(32, BASE, 78, BASE),
]

upperStrokes['F'] = [line(32, CAP_TOP, 32, BASE), line(32, CAP_TOP, 78, CAP_TOP), line(32, 52.5, 68, 52.5)]

// The arc's end point and the chin bar's start point are the same (80.37,65.33) — one
// continuous stroke (curve flowing straight into the bar) instead of a separate lift.
upperStrokes['G'] = [combine(arc(MID, 52.5, 27, 37.5, 340, 20, 0), line(80.37, 65.33, 52, 65.33))]

upperStrokes['H'] = [line(30, CAP_TOP, 30, BASE), line(80, CAP_TOP, 80, BASE), line(30, 52.5, 80, 52.5)]

upperStrokes['I'] = [line(MID, CAP_TOP, MID, BASE)]

// Down then curling left, as one continuous stroke — the line's end and the arc's start are
// the same point (70,72).
upperStrokes['J'] = [combine(line(70, CAP_TOP, 70, 72), arc(55, 72, 15, 18, 0, 130, 1))]

// The "arm" and "leg" diagonals meet at the same point (30,55) — one continuous zigzag stroke
// after the stem, the same way V/W's inner diagonals are.
upperStrokes['K'] = [line(30, CAP_TOP, 30, BASE), combine(line(78, CAP_TOP, 30, 55), line(30, 55, 78, BASE))]

// Down then across, as one continuous stroke — the two lines already met at (32,BASE).
upperStrokes['L'] = [combine(line(32, CAP_TOP, 32, BASE), line(32, BASE, 78, BASE))]

// Every straight vertical/diagonal below starts at its top end and is drawn downward — the
// universal "pull down, never push up" rule taught for manuscript strokes — except where a
// zigzag (M/N/V/W's inner diagonals) makes an upward segment unavoidable within one continuous
// stroke; those are called out inline. An earlier version of this file had M's and N's first
// (plain, non-zigzag) vertical drawn bottom-to-top, which is exactly the kind of thing that
// looks visibly backwards when the trace guide animates it — fixed here.
// Stem alone, then the two diagonals + closing vertical as one continuous zigzag — all three
// segments already met end-to-end (28,15)->(55,60)->(82,15)->(82,BASE), so there's no reason
// to force 3 separate lifts for what's naturally a single motion once the stem is down.
upperStrokes['M'] = [line(28, CAP_TOP, 28, BASE), combine(line(28, CAP_TOP, 55, 60), line(55, 60, 82, CAP_TOP), line(82, CAP_TOP, 82, BASE))]

upperStrokes['N'] = [line(28, CAP_TOP, 28, BASE), line(28, CAP_TOP, 82, BASE), line(82, CAP_TOP, 82, BASE)]

upperStrokes['O'] = [fullCircle(MID, 52.5, 28, 37.5, 320, 0)]

upperStrokes['P'] = [line(32, CAP_TOP, 32, BASE), arc(32, 33.75, 24, 18.75, 270, 450, 1)]

upperStrokes['Q'] = [fullCircle(MID, 52.5, 28, 37.5, 320, 0), line(66, 78, 82, 96)]

// The bump's end and the leg's start are the same point (32,52.5) — one continuous stroke
// (loop curving down into the kicked-out leg) after the stem.
upperStrokes['R'] = [line(32, CAP_TOP, 32, BASE), combine(arc(32, 33.75, 24, 18.75, 270, 450, 1), line(32, 52.5, 78, BASE))]

// Two ~190° arcs with opposite curvature (top curves over-the-top, bottom curves
// under-the-bottom), chained into one stroke — an earlier hand-typed single path here used
// two ~280° arcs, which is closer to a full circle than a half, and rendered as a
// spiral/pretzel instead of a flowing S (confirmed visually, not just in theory).
upperStrokes['S'] = [combine(arc(58, 34, 19, 17, 350, 165, 0), arc(50, 72, 20, 17, 345, 160, 1))]

upperStrokes['T'] = [line(28, CAP_TOP, 82, CAP_TOP), line(MID, CAP_TOP, MID, BASE)]

// One continuous stroke (down, curve under, up) instead of 3 separately-lifted strokes — U is
// normally written as a single fluid motion, and per feedback the 3-piece version visibly
// looked like it had been "cut into pieces" rather than traced as one letter.
upperStrokes['U'] = [combine(line(28, CAP_TOP, 28, 65), arc(55, 65, 27, 25, 180, 0, 0), line(82, 65, 82, CAP_TOP))]

// Down-up in one continuous motion, not two separately-lifted diagonals.
upperStrokes['V'] = [combine(line(28, CAP_TOP, MID, BASE), line(MID, BASE, 82, CAP_TOP))]

// W as two continuous "V" strokes (down-up, down-up) rather than 4 separate lifts — all 4
// segments happened to already meet end-to-end, but 4 lifts for one letter doesn't match how
// W is actually written.
upperStrokes['W'] = [
  combine(line(24, CAP_TOP, 38, BASE), line(38, BASE, 55, 45)),
  combine(line(55, 45, 72, BASE), line(72, BASE, 86, CAP_TOP)),
]

upperStrokes['X'] = [line(28, CAP_TOP, 82, BASE), line(82, CAP_TOP, 28, BASE)]

// Second diagonal flows straight into the stem (both meet at (55,52)) — one continuous stroke
// after the first diagonal.
upperStrokes['Y'] = [line(28, CAP_TOP, MID, 52), combine(line(82, CAP_TOP, MID, 52), line(MID, 52, MID, BASE))]

// All 3 segments meet end-to-end (top bar -> diagonal -> bottom bar) — Z is normally one
// continuous zigzag stroke, not 3 separate lifts.
upperStrokes['Z'] = [combine(line(28, CAP_TOP, 82, CAP_TOP), line(82, CAP_TOP, 28, BASE), line(28, BASE, 82, BASE))]

// ---------- LOWERCASE ----------
// x-height letters live between XH_TOP (42) and BASE (90); ascenders (b,d,f,h,k,l,t) reach up
// to CAP_TOP (15); descenders (g,j,p,q,y) reach down to DESC (108).

// Bowl + stem as one continuous stroke (HIL review: parent flagged the 2-stroke version —
// "should be a single stroke, and show the start point"). The loop now starts/ends exactly
// where the stem attaches (east point, 78,66) so combine() doesn't need to bridge a gap.
lowerStrokes['a'] = [combine(fullCircle(58, 66, 20, 24, 0, 0), line(78, 66, 78, BASE))]

// Stem + bowl as one continuous stroke: down the ascender, back up to the bowl's attachment
// height, then the loop (which starts/ends exactly on the stem, at its west point).
lowerStrokes['b'] = [combine(line(30, CAP_TOP, 30, 66), fullCircle(52, 66, 22, 24, 180, 1), line(30, 66, 30, BASE))]

lowerStrokes['c'] = [arc(MID, 66, 20, 24, 320, 40, 0)]

// Bowl + stem as one continuous stroke, mirroring b: loop first (starting/ending at its east
// point, which now sits exactly on the stem), then the full stem down to baseline.
lowerStrokes['d'] = [combine(line(80, CAP_TOP, 80, 66), fullCircle(58, 66, 22, 24, 0, 0), line(80, 66, 80, BASE))]

// Crossbar flowing straight into the loop (they meet at (75,68)) — one continuous stroke,
// matching how e is normally written (right, then curl up and around). The loop's end angle
// was 340, but with sweep=0 (counterclockwise) that's only a 20°-long arc — the short way, not
// the near-full loop intended; confirmed by rendering (it drew almost nothing). endDeg=20
// gives the intended 340°-long sweep, stopping just short of a full circle.
lowerStrokes['e'] = [combine(line(35, 68, 75, 68), arc(55, 68, 20, 22, 0, 20, 0))]

// Hook + stem as one continuous stroke (HIL review: "1,2は一画" — merge strokes 1 and 2, keep
// the crossbar separate). The hook is now drawn top-down (curling in from the upper right)
// straight into the stem, instead of a separately-lifted curl above an independent stem line.
lowerStrokes['f'] = [combine(arc(70, 24, 12, 9, 360, 200, 0), line(58, 15, 58, BASE)), line(42, 55, 74, 55)]

// Bowl + stem + tail as one continuous stroke (HIL review, same "should be a single stroke"
// note as a/d). The loop starts/ends exactly on the stem (east point, 78,66), same fix as a.
lowerStrokes['g'] = [combine(fullCircle(56, 66, 22, 24, 0, 0), line(78, 66, 78, 98), arc(64, 98, 14, 8, 0, 150, 1))]

// Ascender + arch + second leg as one continuous stroke (HIL review: "should be a single
// stroke"). Retraces up the ascender to the arch's attachment height before curving out —
// harmless for a filled/stroked line (the retraced segment repaints itself) but lets the
// whole letter be one uninterrupted trace instead of two separately-lifted pieces.
lowerStrokes['h'] = [combine(line(30, CAP_TOP, 30, BASE), line(30, BASE, 30, 42), arc(52, 42, 22, 18, 180, 0, 1), line(74, 42, 74, BASE))]

lowerStrokes['i'] = [line(MID, 42, MID, BASE), line(MID, 30, MID, 30)]

// Stem + hook as one continuous stroke (HIL review: "形がおかしい" — the old hook, radius
// (16,10) centered under the stem itself, drew a bulbous/malformed curl. Now mirrors g's
// proven tail shape (radius 14,8) but anchored under j's own stem instead of g's). Dot stays
// a separate stroke, same as i's (which passed review unchanged).
lowerStrokes['j'] = [combine(line(64, 42, 64, 98), arc(50, 98, 14, 8, 0, 150, 1)), line(64, 30, 64, 30)]

// Arm+leg meet at the same point (30,68) — one continuous zigzag stroke, matching uppercase K.
lowerStrokes['k'] = [line(30, CAP_TOP, 30, BASE), combine(line(72, 42, 30, 68), line(30, 68, 72, BASE))]

lowerStrokes['l'] = [line(MID, CAP_TOP, MID, BASE)]

// m is two "n" shapes sharing a leg, all now one continuous stroke (HIL review: "should be a
// single stroke"). Each leg is drawn, retraced up to the next arch's attachment height, then
// the arch curves out to the following leg — same retrace pattern as h/n.
lowerStrokes['m'] = [
  combine(
    line(24, 42, 24, BASE),
    line(24, BASE, 24, 42),
    arc(39, 42, 15, 13, 180, 0, 1),
    line(54, 42, 54, BASE),
    line(54, BASE, 54, 42),
    arc(69, 42, 15, 13, 180, 0, 1),
    line(84, 42, 84, BASE),
  ),
]

// Same arch+leg construction as h, just without the ascender (n's first leg is x-height only).
// One continuous stroke (HIL review: "should be a single stroke") — retrace up to the arch's
// attachment height before curving out, same pattern as h/m/r.
lowerStrokes['n'] = [combine(line(30, 42, 30, BASE), line(30, BASE, 30, 42), arc(52, 42, 22, 18, 180, 0, 1), line(74, 42, 74, BASE))]

lowerStrokes['o'] = [fullCircle(MID, 66, 22, 24, 320, 0)]

// Stem + bowl as one continuous stroke (HIL review, same note as b): full stem into the
// descender, back up to the bowl's attachment height, then the loop.
lowerStrokes['p'] = [combine(line(30, 42, 30, 108), line(30, 108, 30, 66), fullCircle(52, 66, 22, 24, 180, 1))]

// Bowl + stem as one continuous stroke (HIL review, same note as d): the loop, ending back on
// its own east point, then straight down through the descender.
lowerStrokes['q'] = [combine(line(80, 42, 80, 108), line(80, 108, 80, 66), fullCircle(58, 66, 22, 24, 0, 0))]

// Leg + arm as one continuous stroke (HIL review: "should be a single stroke"). Retraces up to
// the arm's attachment height (now exactly the leg's top, 42, instead of overshooting to 39).
lowerStrokes['r'] = [combine(line(32, 42, 32, BASE), line(32, BASE, 32, 42), arc(32, 58, 20, 16, 270, 10, 1))]

// Same two-opposite-arcs construction as uppercase S, scaled to x-height (HIL review flagged
// the shape with no specific note — re-derived by scaling uppercase S's own proportions down
// to x-height instead of guessing fresh radii).
lowerStrokes['s'] = [combine(arc(56, 54, 12, 11, 350, 165, 0), arc(51, 78, 13, 11, 345, 160, 1))]

// Stem + hook as one continuous stroke (they meet exactly at (48,82)), crossbar separate.
lowerStrokes['t'] = [combine(line(48, 22, 48, 82), arc(58, 82, 10, 8, 180, 90, 0)), line(32, 46, 66, 46)]

// HIL review: "this reads as uppercase U — make it a u" (round-tripped twice, still read as U
// each time a wide graceful curve was used — any generous bowl reads as "scaled-down U" at
// this size). This version instead keeps both verticals long and straight, with only a small,
// tight dip right at the baseline (ry8, starting at y=82 not the bowl-letters' ~66-74) — two
// tall parallel strokes joined by a short foot, not a wide round bowl.
lowerStrokes['u'] = [combine(line(32, 42, 32, 82), arc(53, 82, 21, 8, 180, 0, 0), line(74, 82, 74, 42))]

lowerStrokes['v'] = [combine(line(30, 42, MID, BASE), line(MID, BASE, 80, 42))]

// One continuous stroke (HIL review: "should be a single stroke") — the two halves already met
// at the same point (55,58), so this is a straight merge of the existing four segments.
lowerStrokes['w'] = [
  combine(line(24, 42, 36, BASE), line(36, BASE, 55, 58), line(55, 58, 74, BASE), line(74, BASE, 86, 42)),
]

lowerStrokes['x'] = [line(30, 42, 80, BASE), line(80, 42, 30, BASE)]

// HIL review: "the first stroke shouldn't overshoot past the second stroke" — the left diagonal
// used to run all the way to the baseline (55,90), well past where it crosses the descender
// stroke; it now stops right at that crossing point instead of doubling back over the descender.
lowerStrokes['y'] = [line(30, 42, 53, 86), line(80, 42, 40, 108)]

lowerStrokes['z'] = [combine(line(32, 44, 78, 44), line(78, 44, 32, BASE), line(32, BASE, 78, BASE))]

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
