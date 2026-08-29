import { isVoicevoxAvailable, resolveVoicevoxSpeakerId, synthesizeVoicevox } from './voicevox'

export type SpeechLang = 'ja-JP' | 'en-US'

/** Per-character vocal identity.
 * voicevoxSpeaker names a specific, genuinely distinct VOICEVOX voice (see voicevox.ts) for
 * Japanese, and kokoroVoice does the same for English (e.g. 'af_bella') — Kokoro's voice
 * packs are lightweight enough that one server process can synthesize with any of them per
 * request (see scripts/kokoro_server.py), so this is a real different voice, not a
 * pitch-shifted one. pitch/rate drive the Web Speech fallback; playbackRate re-pitches the
 * local-voice-server fallback (speed + pitch shift together, like an old tape) only when
 * that tier has no genuinely distinct voice to reach for (no voicevoxSpeaker/kokoroVoice, or
 * the matching server isn't running). */
export interface VoiceProfile {
  pitch: number
  rate: number
  playbackRate: number
  /** Omit for generic, non-character speech (e.g. the intro screen), which skips the
   * VOICEVOX tier. */
  voicevoxSpeaker?: { name: string; style: string }
  /** Omit to use the English local-voice-server's default voice. */
  kokoroVoice?: string
}

export const DEFAULT_VOICE_PROFILE: VoiceProfile = { pitch: 1.15, rate: 0.98, playbackRate: 1 }

// One local TTS server process per language, each wrapping a different engine chosen for
// that language specifically (see scripts/piper_server.py and scripts/kokoro_server.py) —
// Piper for Japanese (the Tsukuyomi-chan voice), Kokoro-82M for English (its dedicated
// Misaki G2P turned out meaningfully more accurate on word stress than Piper's espeak-ng
// phonemization across this app's whole word bank — see the pronunciation review
// comparison this was decided from). Both expose the identical tiny REST contract
// (GET /health, GET /synthesize?text=...), so this layer doesn't need to know which engine
// is actually behind a given port. Each server process keeps a full model loaded in
// memory, so one process can't serve two different-language voices.
const LOCAL_VOICE_SERVER_URL: Record<SpeechLang, string> = {
  'ja-JP': 'http://127.0.0.1:8899',
  'en-US': 'http://127.0.0.1:8900',
}

let cachedVoices: SpeechSynthesisVoice[] = []

function refreshVoices(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  cachedVoices = window.speechSynthesis.getVoices()
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  refreshVoices()
  window.speechSynthesis.onvoiceschanged = refreshVoices
}

function pickVoice(lang: SpeechLang): SpeechSynthesisVoice | undefined {
  return (
    cachedVoices.find((v) => v.lang === lang) ??
    cachedVoices.find((v) => v.lang.startsWith(lang.split('-')[0]))
  )
}

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Resolves once the utterance finishes (or errors). */
function speakWithWebSpeech(text: string, lang: SpeechLang, profile: VoiceProfile): Promise<void> {
  if (!isTtsSupported()) return Promise.resolve()

  return new Promise((resolve) => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = profile.rate
    utterance.pitch = profile.pitch
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()

    const voice = pickVoice(lang)
    if (voice) utterance.voice = voice

    window.speechSynthesis.speak(utterance)

    // Chrome (esp. on macOS) can leave the utterance queue stuck in a
    // "speaking" state that never actually produces audio. Immediately
    // pausing and resuming kicks the engine into playing it for real.
    window.speechSynthesis.pause()
    window.speechSynthesis.resume()
  })
}

// Optional local voice server(s) (see LOCAL_VOICE_SERVER_URL above), serving a nicer voice
// than the OS default, one per language. Each is probed once per page load; if a given
// language's server isn't running we just fall back to the browser's built-in speech
// synthesis for every call in that language.
const localVoiceAvailable: Partial<Record<SpeechLang, Promise<boolean>>> = {}

function checkLocalVoiceAvailable(lang: SpeechLang): Promise<boolean> {
  if (!localVoiceAvailable[lang]) {
    localVoiceAvailable[lang] = fetch(`${LOCAL_VOICE_SERVER_URL[lang]}/health`, { signal: AbortSignal.timeout(800) })
      .then((res) => res.ok)
      .catch(() => false)
  }
  return localVoiceAvailable[lang]
}

// Guards against overlapping playback when two speak() calls race each other
// (e.g. React StrictMode double-invoking an effect in dev). Each call gets a
// token; a call only plays its audio if it's still the most recent one by
// the time its network/setup work finishes, and a new call always stops
// whatever is currently playing immediately.
let callToken = 0
let currentAudio: HTMLAudioElement | null = null

/** Plays a Blob as the current tracked audio, respecting the cancellation token.
 * Resolves true once playback finishes (or is superseded), false if it never started. */
async function playBlob(blob: Blob, token: number, playbackRate?: number): Promise<boolean> {
  if (token !== callToken) return true // a newer speak() call has already taken over

  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  if (playbackRate !== undefined) {
    // preservesPitch defaults to true in modern browsers, which would make
    // playbackRate a pure speed change — turn it off so it also re-pitches.
    audio.preservesPitch = false
    ;(audio as unknown as { mozPreservesPitch?: boolean }).mozPreservesPitch = false
    ;(audio as unknown as { webkitPreservesPitch?: boolean }).webkitPreservesPitch = false
    audio.playbackRate = playbackRate
  }
  currentAudio = audio

  await new Promise<void>((resolve) => {
    audio.onended = () => resolve()
    audio.onerror = () => resolve()
    audio.play().catch(() => resolve())
  })
  URL.revokeObjectURL(url)
  if (currentAudio === audio) currentAudio = null
  return true
}

// Pre-rendered audio for a fixed set of known phrases (character self-introductions,
// hiragana readings — see scripts/generate-tts-cache.mjs), so those sound just as natural
// on a phone or another computer as on the machine actually running VOICEVOX/Piper: a
// static file works from any device a static site can reach, unlike those two, which are
// both localhost-only. Silently falls through to the live tiers below when a cache entry
// doesn't exist yet (before the cache is generated, or for text with no fixed phrase).
const AUDIO_CACHE_BASE = `${import.meta.env.BASE_URL}audio`

/** Resolves true if the cached file played, false if it doesn't exist / failed to load. */
async function speakWithCachedFile(cacheKey: string, token: number): Promise<boolean> {
  if (token !== callToken) return true
  const audio = new Audio(`${AUDIO_CACHE_BASE}/${cacheKey}.wav`)
  currentAudio = audio
  const played = await new Promise<boolean>((resolve) => {
    audio.onended = () => resolve(true)
    audio.onerror = () => resolve(false)
    audio.play().catch(() => resolve(false))
  })
  if (currentAudio === audio) currentAudio = null
  return played
}

/** Resolves true if audio played or was intentionally skipped (superseded), false if the caller should fall back. */
async function speakWithVoicevox(
  text: string,
  token: number,
  speakerName: string,
  styleName: string,
): Promise<boolean> {
  try {
    const speakerId = await resolveVoicevoxSpeakerId(speakerName, styleName)
    if (speakerId === null) return false
    if (token !== callToken) return true

    const blob = await synthesizeVoicevox(text, speakerId)
    if (!blob) return false
    return await playBlob(blob, token)
  } catch {
    return false
  }
}

/** Resolves true if audio played or was intentionally skipped (superseded), false if the caller should fall back. */
async function speakWithLocalVoice(text: string, token: number, profile: VoiceProfile, lang: SpeechLang): Promise<boolean> {
  try {
    const voiceParam = lang === 'en-US' && profile.kokoroVoice ? `&voice=${encodeURIComponent(profile.kokoroVoice)}` : ''
    const res = await fetch(`${LOCAL_VOICE_SERVER_URL[lang]}/synthesize?text=${encodeURIComponent(text)}${voiceParam}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return false
    if (token !== callToken) return true

    const blob = await res.blob()
    // A genuinely distinct Kokoro voice already carries its own natural pitch/pacing — the
    // playbackRate re-pitch hack is only for when there's no such voice to reach for.
    const playbackRate = lang === 'en-US' && profile.kokoroVoice ? undefined : profile.playbackRate
    return await playBlob(blob, token, playbackRate)
  } catch {
    return false
  }
}

/** Resolves once speech finishes (or fails). Tries a pre-rendered file first when
 * `cacheKey` names one that exists (see scripts/generate-tts-cache.mjs) — that works
 * identically on any device, unlike VOICEVOX/the local voice servers, which only work on
 * the machine actually running them. Falls through to VOICEVOX (Japanese only), then the
 * local voice server (either language, one server process per voice — see
 * LOCAL_VOICE_SERVER_URL), then the browser's built-in TTS. */
export async function speak(
  text: string,
  lang: SpeechLang,
  profile: VoiceProfile = DEFAULT_VOICE_PROFILE,
  cacheKey?: string,
): Promise<void> {
  const token = ++callToken
  window.speechSynthesis?.cancel()
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }

  if (cacheKey) {
    if (token !== callToken) return
    const played = await speakWithCachedFile(cacheKey, token)
    if (played) return
  }

  if (lang === 'ja-JP' && profile.voicevoxSpeaker !== undefined && (await isVoicevoxAvailable())) {
    if (token !== callToken) return
    const { name, style } = profile.voicevoxSpeaker
    const played = await speakWithVoicevox(text, token, name, style)
    if (played) return
  }

  if (await checkLocalVoiceAvailable(lang)) {
    if (token !== callToken) return
    const played = await speakWithLocalVoice(text, token, profile, lang)
    if (played) return
  }

  if (token !== callToken) return
  await speakWithWebSpeech(text, lang, profile)
}
