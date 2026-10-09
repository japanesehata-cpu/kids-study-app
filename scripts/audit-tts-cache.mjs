// Dev audit for the pre-rendered Japanese speech in public/audio (see generate-tts-cache.mjs):
// re-synthesizes every job's CURRENT text through the local VOICEVOX and compares it byte for
// byte with the file on disk. VOICEVOX output is deterministic, so any difference means the
// file was rendered from older text (or a different voice) and now says the wrong thing.
// Also reports jobs with no file at all.
//
//   npx tsx scripts/audit-tts-cache.mjs [--match=REGEX] > report.txt
//
// Fix what it finds with: node scripts/generate-tts-cache.mjs --only=<keys>
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildJobs } from './generate-tts-cache.mjs'

const VOICEVOX_URL = 'http://127.0.0.1:50021'
const SPEED_SCALE = 1.15 // keep in sync with generate-tts-cache.mjs
const AUDIO_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'audio')
const matchArg = process.argv.find((a) => a.startsWith('--match='))
const matchRe = matchArg ? new RegExp(matchArg.slice('--match='.length)) : null

const speakers = await (await fetch(`${VOICEVOX_URL}/speakers`)).json()
function styleId(name, style) {
  return speakers.find((s) => s.name === name)?.styles.find((s) => s.name === style)?.id
}

const jobs = buildJobs().filter((j) => !matchRe || matchRe.test(j.cacheKey))
const missing = []
const stale = []
for (const [i, job] of jobs.entries()) {
  const file = path.join(AUDIO_DIR, `${job.cacheKey}.wav`)
  if (!existsSync(file)) {
    missing.push(job)
    continue
  }
  const id = styleId(job.speakerName, job.styleName)
  const q = await (await fetch(`${VOICEVOX_URL}/audio_query?speaker=${id}&text=${encodeURIComponent(job.text)}`, { method: 'POST' })).json()
  q.speedScale = SPEED_SCALE
  const res = await fetch(`${VOICEVOX_URL}/synthesis?speaker=${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(q),
  })
  const fresh = Buffer.from(await res.arrayBuffer())
  if (!fresh.equals(await readFile(file))) stale.push(job)
  if ((i + 1) % 200 === 0) console.error(`checked ${i + 1}/${jobs.length}`)
}
console.log(`jobs ${jobs.length}, missing ${missing.length}, stale ${stale.length}`)
for (const j of missing) console.log(`MISSING ${j.cacheKey}\t${j.text}`)
for (const j of stale) console.log(`STALE ${j.cacheKey}\t${j.text}`)
