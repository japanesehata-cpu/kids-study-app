let sharedContext: AudioContext | null = null

/** Shared with bgm.ts so the whole app uses one AudioContext (iOS limits how many can exist). */
export function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return null
  if (!sharedContext) sharedContext = new AudioContextClass()
  if (sharedContext.state === 'suspended') void sharedContext.resume()
  return sharedContext
}

function playTone(ctx: AudioContext, freq: number, startOffset: number, duration: number, peakVolume: number): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  osc.connect(gain)
  gain.connect(ctx.destination)

  const startTime = ctx.currentTime + startOffset
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(peakVolume, startTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

  osc.start(startTime)
  osc.stop(startTime + duration + 0.02)
}

/** Cheerful rising fanfare, played immediately on a correct answer (ahead of the spoken
 * feedback): a C-E-G-C arpeggio landing on a ringing chord, with a few high sparkles. From 3
 * in a row it climbs one step higher each time (capped), so a streak *sounds* like it's
 * building. */
export function playCorrectSfx(streak = 1): void {
  const ctx = getContext()
  if (!ctx) return
  const lift = 2 ** (Math.min(Math.max(streak - 2, 0), 4) / 12) // +1 semitone per streak step
  const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
  notes.forEach((f, i) => playTone(ctx, f * lift, i * 0.07, 0.16, 0.16))
  // landing chord
  for (const f of [659.25, 783.99, 1046.5]) playTone(ctx, f * lift, 0.3, 0.55, 0.09)
  // sparkles
  ;[2093, 2637, 3136].forEach((f, i) => playTone(ctx, f * lift, 0.34 + i * 0.06, 0.12, 0.04))
}

/** Short, gentle descending blip — never harsh, since this is for a 5-year-old. */
export function playIncorrectSfx(): void {
  const ctx = getContext()
  if (!ctx) return
  playTone(ctx, 440, 0, 0.16, 0.14) // A4
  playTone(ctx, 349.23, 0.1, 0.2, 0.12) // F4
}

/** Tiny single pop — played each time one difference is found in spot-the-difference,
 * distinct from (and quieter than) the full-question chime in playCorrectSfx. */
export function playFoundSfx(): void {
  const ctx = getContext()
  if (!ctx) return
  playTone(ctx, 880, 0, 0.1, 0.14) // A5
}

/** A soft "ぽん" for ordinary button taps — a quick downward pitch drop, very quiet so it
 * sits under speech and never competes with the answer chimes. */
export function playTapSfx(): void {
  const ctx = getContext()
  if (!ctx || ctx.state !== 'running') return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const t = ctx.currentTime
  osc.type = 'sine'
  osc.frequency.setValueAtTime(900, t)
  osc.frequency.exponentialRampToValueAtTime(420, t + 0.08)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.07, t + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.14)
}

/** Light "ピコン" for each star landing on the result screen; `step` climbs the pitch. */
export function playStarSfx(step: number): void {
  const ctx = getContext()
  if (!ctx) return
  const base = 1046.5 * 2 ** (Math.min(step, 12) / 12)
  playTone(ctx, base, 0, 0.08, 0.08)
  playTone(ctx, base * 1.5, 0.05, 0.12, 0.06)
}
