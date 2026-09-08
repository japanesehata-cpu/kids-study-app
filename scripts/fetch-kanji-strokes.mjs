#!/usr/bin/env node
/**
 * One-off dev script: fetches stroke-order path data for the かんじ なぞる (trace)
 * feature's target characters from KanjiVG (kanjivg.tagaini.net), CC BY-SA 3.0, and
 * writes it to src/domain/kanjiStrokes.ts.
 *
 * Why KanjiVG: it's the standard open dataset of Japanese-specific stroke-order paths —
 * one SVG per character, strokes already given as ordered <path d="..."> elements. Using
 * it directly (rather than a Chinese-hanzi-oriented library/dataset) matters because
 * Japanese and Chinese stroke-order conventions can differ even for identical-looking
 * characters, and getting that wrong would actively teach a child the wrong 筆順.
 *
 * Usage:
 *   node scripts/fetch-kanji-strokes.mjs
 *   node scripts/fetch-kanji-strokes.mjs --only=犬,水
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.join(SCRIPT_DIR, '..')
const OUT_PATH = path.join(REPO_ROOT, 'src', 'domain', 'kanjiStrokes.ts')

// The なぞる feature's initial batch — see the plan doc / kanjiBank.ts's traceImageId
// comment for why this specific subset (kanji whose meaning already has an existing
// wordBank photo, so v1 needs zero new image generation).
const TARGET_CHARS = ['日', '月', '水', '木', '金', '雨', '犬', '貝', '花', '草', '森', '山', '石', '川', '車', '本']

function codepointHex(char) {
  return char.codePointAt(0).toString(16).padStart(5, '0')
}

async function fetchStrokes(char) {
  const hex = codepointHex(char)
  const url = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${char} (${hex}): HTTP ${res.status} from ${url}`)
  const svg = await res.text()

  // Strokes live inside the kvg:StrokePaths_* group, one <path d="..."> per stroke, in
  // kvg:number order (that ordering IS the KanjiVG dataset's whole point) — a plain
  // regex pass over just that group is enough, no XML parser dependency needed.
  const strokePathsGroupMatch = svg.match(/<g id="kvg:StrokePaths_[0-9a-f]+"[^>]*>([\s\S]*?)<\/g>\s*<g id="kvg:StrokeNumbers/)
  if (!strokePathsGroupMatch) throw new Error(`${char} (${hex}): couldn't find kvg:StrokePaths group`)
  const group = strokePathsGroupMatch[1]

  const strokes = [...group.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1])
  if (strokes.length === 0) throw new Error(`${char} (${hex}): found the group but no stroke <path> elements`)
  return strokes
}

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith('--only='))
  const targets = onlyArg ? onlyArg.slice('--only='.length).split(',') : TARGET_CHARS

  const result = {}
  for (const char of targets) {
    process.stdout.write(`fetching ${char}... `)
    const strokes = await fetchStrokes(char)
    result[char] = strokes
    console.log(`${strokes.length} strokes`)
  }

  const entries = Object.entries(result)
    .map(([char, strokes]) => `  '${char}': [\n${strokes.map((d) => `    "${d}",`).join('\n')}\n  ],`)
    .join('\n')

  const fileContent = `/** Ordered stroke path data (SVG path "d" attribute strings, viewBox "0 0 109 109")
 * for かんじ なぞる (trace) practice — see KanjiTraceCanvas, which renders each string
 * as an SVG <path> guide and samples points along it via getPointAtLength() to check a
 * traced stroke.
 *
 * Source: KanjiVG (https://kanjivg.tagaini.net), Copyright (C) Ulrich Apel, licensed
 * under Creative Commons Attribution-Share Alike 3.0
 * (https://creativecommons.org/licenses/by-sa/3.0/). Regenerate with
 * scripts/fetch-kanji-strokes.mjs — do not hand-edit.
 */
export const kanjiStrokePaths: Record<string, string[]> = {
${entries}
}
`

  fs.writeFileSync(OUT_PATH, fileContent)
  console.log(`wrote ${OUT_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
