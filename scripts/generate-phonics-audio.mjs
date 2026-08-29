// One-off dev script: pre-renders every alphabet phonics sound (see alphabetBank.ts) through
// a locally-running Kokoro server (see scripts/kokoro_server.py) and saves them as static WAV
// files under public/audio/phonics-${letterId}-${variant}.wav. Mirrors generate-word-audio-
// en.mjs's role for the englishWords word bank — this is English content, so it goes through
// Kokoro (en-US), not VOICEVOX (see generate-tts-cache.mjs, which handles every Japanese
// phrase instead).
//
// Usage:
//   ~/kokoro-env/bin/python3 scripts/kokoro_server.py --port 8900   # in another terminal
//   node scripts/generate-phonics-audio.mjs
//   node scripts/generate-phonics-audio.mjs --only=a-short,e-long

import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { alphabetBank, phonicsSpeechPhrase } from '../src/domain/alphabetBank.ts'

const KOKORO_URL = process.env.KOKORO_SERVER_URL ?? 'http://127.0.0.1:8900'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'audio')

const args = process.argv.slice(2)
const onlyArg = args.find((a) => a.startsWith('--only='))
const onlyKeys = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',')) : null

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

function buildJobs() {
  const jobs = []
  for (const entry of alphabetBank) {
    for (const sound of entry.sounds) {
      const key = `${entry.id}-${sound.variant}`
      if (onlyKeys && !onlyKeys.has(key)) continue
      jobs.push({ cacheKey: `phonics-${entry.id}-${sound.variant}`, text: phonicsSpeechPhrase(sound) })
    }
  }
  return jobs
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

  const jobs = buildJobs()
  console.log(`Generating ${jobs.length} phonics sound(s) via Kokoro...`)

  for (const { cacheKey, text } of jobs) {
    const outPath = path.join(OUTPUT_DIR, `${cacheKey}.wav`)
    try {
      const wav = await synthesize(text)
      await writeFile(outPath, wav)
      console.log(`done  ${cacheKey} ("${text}") -> public/audio/${cacheKey}.wav`)
    } catch (err) {
      console.error(`fail  ${cacheKey}: ${err.message}`)
    }
  }
}

main()
