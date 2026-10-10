#!/usr/bin/env node
// One-off dev script: downloads BIZ UDGothic Bold, cut down to just the characters the app
// draws with it, to public/fonts/biz-udgothic-700.woff2 (plus its OFL licence). The font is
// self-hosted rather than linked from Google Fonts because the app must not talk to any
// outside server at run time and must work offline (docs/architecture.md).
//
// It is used only where a child copies a letter's exact shape: the handwriting-practice
// guide (HandwritingCanvas.tsx) and the big glyph on the trace explanation (TraceReveal.tsx,
// .kanji-meaning-char). The glyph set is every hiragana and katakana, printable ASCII, and
// every kanji in kanjiBank.ts — re-run this after adding kanji, or the new ones fall back
// to the app's default font.
//
// Usage:
//   node --experimental-strip-types scripts/fetch-handwriting-font.mjs

import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'public', 'fonts')
const FONT_FILE = 'biz-udgothic-700.woff2'
const LICENSE_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/bizudgothic/OFL.txt'
// Google Fonts only serves woff2 to a browser it recognises.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

function range(from, to) {
  let s = ''
  for (let c = from; c <= to; c++) s += String.fromCodePoint(c)
  return s
}

async function main() {
  const { kanjiBank } = await import('../src/domain/kanjiBank.ts')
  const kanji = [...new Set(kanjiBank.map((e) => e.char))].join('')
  const glyphs = range(0x3041, 0x3096) + range(0x30a1, 0x30fa) + 'ー・' + range(0x21, 0x7e) + kanji

  // `text=` makes Google Fonts return one woff2 holding exactly these glyphs.
  const cssUrl = `https://fonts.googleapis.com/css2?family=BIZ+UDGothic:wght@700&text=${encodeURIComponent(glyphs)}`
  const css = await (await fetch(cssUrl, { headers: { 'User-Agent': USER_AGENT } })).text()
  const fontUrl = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/)?.[1]
  if (!fontUrl) throw new Error(`no font URL in the Google Fonts response:\n${css.slice(0, 500)}`)

  const font = Buffer.from(await (await fetch(fontUrl)).arrayBuffer())
  const license = await (await fetch(LICENSE_URL)).text()
  if (!license.includes('SIL Open Font License')) throw new Error('unexpected licence text')

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(path.join(OUT_DIR, FONT_FILE), font)
  await writeFile(path.join(OUT_DIR, 'OFL-BIZUDGothic.txt'), license)
  console.log(`wrote public/fonts/${FONT_FILE} (${font.length} bytes, ${[...glyphs].length} glyphs)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
