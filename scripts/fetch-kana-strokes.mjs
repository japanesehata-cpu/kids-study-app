#!/usr/bin/env node
/**
 * One-off dev script: fetches stroke-order path data for ひらがな/カタカナ なぞる
 * (trace) practice's target characters from KanjiVG (kanjivg.tagaini.net), CC BY-SA 3.0,
 * and writes it to src/domain/kanaStrokes.ts. Mirrors fetch-kanji-strokes.mjs's fetch/
 * extraction logic exactly — see that file's comment for why KanjiVG specifically (real
 * Japanese stroke-order conventions, not a Chinese-hanzi-oriented substitute) — just with
 * kana codepoints instead of kanji ones, and a separate output file so this never touches
 * kanjiStrokes.ts's already-generated content.
 *
 * Target set: the 46 清音 (seion) hiragana + 46 seion katakana — あ〜ん / ア〜ン, no
 * dakuten/handakuten/youon/gairaigo kana (see hiraganaBank.ts/katakanaBank.ts's row
 * field) — confirmed present in KanjiVG (92/92) before committing to this approach.
 *
 * Usage:
 *   node scripts/fetch-kana-strokes.mjs
 *   node scripts/fetch-kana-strokes.mjs --only=あ,ア
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.join(SCRIPT_DIR, '..')
const OUT_PATH = path.join(REPO_ROOT, 'src', 'domain', 'kanaStrokes.ts')

const HIRAGANA_SEION = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'
const KATAKANA_SEION = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
const TARGET_CHARS = [...HIRAGANA_SEION, ...KATAKANA_SEION]

function codepointHex(char) {
  return char.codePointAt(0).toString(16).padStart(5, '0')
}

async function fetchStrokes(char) {
  const hex = codepointHex(char)
  const url = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${char} (${hex}): HTTP ${res.status} from ${url}`)
  const svg = await res.text()

  const strokePathsGroupMatch = svg.match(/<g id="kvg:StrokePaths_[0-9a-f]+"[^>]*>([\s\S]*?)<\/g>\s*<g id="kvg:StrokeNumbers/)
  if (!strokePathsGroupMatch) throw new Error(`${char} (${hex}): couldn't find kvg:StrokePaths group`)
  const group = strokePathsGroupMatch[1]

  const strokes = [...group.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1])
  if (strokes.length === 0) throw new Error(`${char} (${hex}): found the group but no stroke <path> elements`)
  return strokes
}

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith('--only='))
  const targets = onlyArg ? [...onlyArg.slice('--only='.length).split(',').join('')] : TARGET_CHARS

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
 * for ひらがな/カタカナ なぞる (trace) practice — see KanaTraceScreen, which uses the
 * same shared KanjiTraceCanvas component かんじ's trace mode does (it only needs a char
 * + its stroke list, nothing kanji-specific). Covers the 46 seion hiragana + 46 seion
 * katakana only — see hiraganaBank.ts/katakanaBank.ts's row field for what's excluded
 * (dakuten/handakuten/youon/gairaigo).
 *
 * Source: KanjiVG (https://kanjivg.tagaini.net), Copyright (C) Ulrich Apel, licensed
 * under Creative Commons Attribution-Share Alike 3.0
 * (https://creativecommons.org/licenses/by-sa/3.0/). Regenerate with
 * scripts/fetch-kana-strokes.mjs — do not hand-edit.
 */
export const kanaStrokePaths: Record<string, string[]> = {
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
