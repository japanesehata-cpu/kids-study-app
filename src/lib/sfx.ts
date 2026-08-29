let sharedContext: AudioContext | null = null

function getContext(): AudioContext | null {
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

/** Short cheerful rising chime, played immediately on a correct answer (ahead of the spoken feedback). */
export function playCorrectSfx(): void {
  const ctx = getContext()
  if (!ctx) return
  playTone(ctx, 523.25, 0, 0.14, 0.18) // C5
  playTone(ctx, 659.25, 0.09, 0.16, 0.18) // E5
  playTone(ctx, 783.99, 0.18, 0.22, 0.2) // G5
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
