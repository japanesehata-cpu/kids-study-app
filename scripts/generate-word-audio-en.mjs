// One-off dev script: pre-renders every englishWords word bank entry's pronunciation through
// a locally-running Kokoro-82M server (see scripts/kokoro_server.py) and saves them as static
// WAV files under public/audio/word-en-${id}.wav. Mirrors generate-tts-cache.mjs's role for
// Japanese, but for the English word bank specifically — these files are what the app plays
// via the `word-en-${wordId}` cache key (see src/lib/tts.ts's `cacheKey` param) instead of
// calling the Kokoro server live, which matters once the app is hosted somewhere shared
// (e.g. GitHub Pages), since that server only ever answers on localhost.
//
// Content is imported straight from the app's own source (wordBank.ts) rather than
// duplicated here, so the cache can never drift out of sync with what the app actually says.
//
// Usage:
//   ~/kokoro-env/bin/python3 scripts/kokoro_server.py --port 8900   # in another terminal
//   node scripts/generate-word-audio-en.mjs
//   node scripts/generate-word-audio-en.mjs --only=dog,strawberry

import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { wordBank } from '../src/domain/wordBank.ts'

const KOKORO_URL = process.env.KOKORO_SERVER_URL ?? 'http://127.0.0.1:8900'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'audio')

const args = process.argv.slice(2)
const onlyArg = args.find((a) => a.startsWith('--only='))
const onlyIds = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',')) : null

// A bare single-word synthesis sounds distorted for these 10 words on every Kokoro voice
// (confirmed: their G2P phonemes are correct, so it's an acoustic-model artifact on isolated
// words). The fix in production is NOT this script's plain output — it's the *second* word
// isolated out of a "word, word." synthesis, which picks up natural prosody from the first
// utterance. Re-running this script with these ids would silently overwrite that fix with the
// original bad-sounding audio; regenerate them only via the trim technique instead.
const REPEAT_TRIM_FIXED_IDS = new Set([
  'bird', 'fish', 'sheep', 'koala', 'fox', 'grape', 'tomato', 'potato', 'peach', 'ship',
])

async function checkKokoroRunning() {
  try {
    const res = await fetch(`${KOKORO_URL}/health`, { signal: AbortSignal.timeout(1500) })
    return res.ok
  } catch {
    return false
  }
}

async function synthesize(text) {
  const res = await fetch(`${KOKORO_URL}/synthesize?text=${encodeURIComponent(text)}`, {
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`synthesize failed: ${res.status} ${await res.text()}`)
  return Buffer.from(await res.arrayBuffer())
}

async function main() {
  if (!(await checkKokoroRunning())) {
    console.error(
      `Kokoro server doesn't seem to be running at ${KOKORO_URL}. Start it with ` +
        '~/kokoro-env/bin/python3 scripts/kokoro_server.py --port 8900, then re-run this script.',
    )
    process.exit(1)
  }

  await mkdir(OUTPUT_DIR, { recursive: true })

  const entries = onlyIds ? wordBank.filter((w) => onlyIds.has(w.id)) : wordBank
  console.log(`Generating ${entries.length} word pronunciation(s) via Kokoro...`)

  for (const { id, word } of entries) {
    if (REPEAT_TRIM_FIXED_IDS.has(id)) {
      console.log(`skip  word-en-${id}: hand-fixed with the repeat-and-trim technique, not plain synthesis (see comment above)`)
      continue
    }
    const outPath = path.join(OUTPUT_DIR, `word-en-${id}.wav`)
    try {
      const wav = await synthesize(word)
      await writeFile(outPath, wav)
      console.log(`done  word-en-${id} ("${word}") -> public/audio/word-en-${id}.wav`)
    } catch (err) {
      console.error(`fail  word-en-${id}: ${err.message}`)
    }
  }
}

// Guards against a plain `import()` of this module (e.g. tooling introspecting it)
// accidentally triggering a real Kokoro run and disk writes as a side effect — this script
// should only actually generate audio when invoked directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
