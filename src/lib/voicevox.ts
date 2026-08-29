// Client for a locally-running VOICEVOX engine (https://voicevox.hiroshiba.jp/), which
// ships many genuinely distinct Japanese character voices — unlike the single-speaker
// Piper model this app also supports, VOICEVOX lets each of the 8 mascots actually sound
// like a different person, not just the same voice pitch-shifted.
//
// Optional: if the engine isn't running, callers fall back to Piper or the browser's
// built-in speech synthesis (see tts.ts). Download the engine from the link above; the
// default install already serves its API at VOICEVOX_URL below.

const VOICEVOX_URL = 'http://127.0.0.1:50021'

interface VoicevoxStyle {
  id: number
  speakerName: string
  styleName: string
}

interface VoicevoxSpeaker {
  name: string
  styles: { id: number; name: string }[]
}

let availableCache: Promise<boolean> | null = null
let stylesCache: Promise<VoicevoxStyle[]> | null = null

export function isVoicevoxAvailable(): Promise<boolean> {
  if (!availableCache) {
    availableCache = fetch(`${VOICEVOX_URL}/version`, { signal: AbortSignal.timeout(500) })
      .then((res) => res.ok)
      .catch(() => false)
  }
  return availableCache
}

async function fetchStyles(): Promise<VoicevoxStyle[]> {
  if (!stylesCache) {
    stylesCache = fetch(`${VOICEVOX_URL}/speakers`, { signal: AbortSignal.timeout(3000) })
      .then((res) => res.json() as Promise<VoicevoxSpeaker[]>)
      .then((speakers) =>
        speakers.flatMap((speaker) =>
          speaker.styles.map((style) => ({ id: style.id, speakerName: speaker.name, styleName: style.name })),
        ),
      )
      .catch(() => [])
  }
  return stylesCache
}

/** Looks up a specific named VOICEVOX character (e.g. "ずんだもん") + style (e.g.
 * "ノーマル") by name rather than by list position — a flattened index into /speakers is
 * fragile, since a different set of installed voices reorders it and can silently pick a
 * different character's voice (or, worse, a different *style* of the wrong character).
 * Named lookup either finds the exact voice this app was designed around, or fails
 * cleanly (null) so the caller falls back to Piper/browser TTS instead of a mismatched
 * voice. */
export async function resolveVoicevoxSpeakerId(speakerName: string, styleName: string): Promise<number | null> {
  const styles = await fetchStyles()
  const match = styles.find((s) => s.speakerName === speakerName && s.styleName === styleName)
  return match?.id ?? null
}

/** VOICEVOX's own default (1.0) reads as a bit slow/deliberate for natural conversational
 * pace — bumping it up gives a snappier, more natural-sounding delivery. Keep this in sync
 * with the matching constant in scripts/generate-tts-cache.mjs, which can't import this
 * browser module directly. */
const VOICEVOX_SPEED_SCALE = 1.15

/** Resolves to a playable audio Blob, or null if the engine is unreachable or the
 * request failed (caller should fall back to another TTS tier). */
export async function synthesizeVoicevox(text: string, speakerId: number): Promise<Blob | null> {
  try {
    const queryRes = await fetch(
      `${VOICEVOX_URL}/audio_query?speaker=${speakerId}&text=${encodeURIComponent(text)}`,
      { method: 'POST', signal: AbortSignal.timeout(5000) },
    )
    if (!queryRes.ok) return null
    const query = await queryRes.json()
    query.speedScale = VOICEVOX_SPEED_SCALE

    const synthRes = await fetch(`${VOICEVOX_URL}/synthesis?speaker=${speakerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      signal: AbortSignal.timeout(8000),
    })
    if (!synthRes.ok) return null
    return await synthRes.blob()
  } catch {
    return null
  }
}
