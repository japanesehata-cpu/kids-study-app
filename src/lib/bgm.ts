import { getContext } from './sfx'
import { loadBgmEnabled, saveBgmEnabled } from './storage'

/* A gentle music-box waltz, synthesized live with Web Audio rather than shipped as an audio
 * file — no download, no licensing question, and it shares sfx.ts's AudioContext. The tune
 * is an original 32-bar loop (A B A B, C major, 3/4) of about a minute.
 *
 * Volume is the product of four independent states, each owned by a different caller:
 * - enabled  — the child/parent's 🎵 toggle on Home (persisted)
 * - mode     — 'focus' while a question is on screen (App.tsx), so the music never competes
 *              with thinking
 * - ducked   — while tts.ts is speaking, so every spoken word stays easy to hear
 * - hidden   — the tab/app is in the background
 * Most phones only allow audio after a user gesture, so there it starts on the first touch. */

type ChordName = 'C' | 'Am' | 'F' | 'G' | 'Dm' | 'Em'

const CHORDS: Record<ChordName, { bass: string; tones: [string, string] }> = {
  C: { bass: 'C3', tones: ['G3', 'E4'] },
  Am: { bass: 'A2', tones: ['E3', 'C4'] },
  F: { bass: 'F2', tones: ['C4', 'A3'] },
  G: { bass: 'G2', tones: ['D4', 'B3'] },
  Dm: { bass: 'D3', tones: ['A3', 'F4'] },
  Em: { bass: 'E3', tones: ['B3', 'G4'] },
}

// One entry per bar: the chord on each of its 3 beats, and the melody as [note, beats].
type Bar = { chords: [ChordName, ChordName, ChordName]; melody: [string | null, number][] }

const bar = (c: ChordName | [ChordName, ChordName, ChordName], melody: Bar['melody']): Bar => ({
  chords: typeof c === 'string' ? [c, c, c] : c,
  melody,
})

const SECTION_A: Bar[] = [
  bar('C', [['E5', 1], ['G5', 1], ['C6', 1]]),
  bar('Am', [['B5', 2], ['A5', 1]]),
  bar('F', [['A5', 1], ['G5', 1], ['F5', 1]]),
  bar('G', [['E5', 2], ['D5', 1]]),
  bar('C', [['E5', 1], ['G5', 1], ['C6', 1]]),
  bar('Am', [['D6', 2], ['C6', 1]]),
  bar(['F', 'F', 'G'], [['A5', 1], ['B5', 1], ['D6', 1]]),
  bar('C', [['C6', 3]]),
]

const SECTION_B: Bar[] = [
  bar('F', [['A5', 1], ['C6', 1], ['A5', 1]]),
  bar('C', [['G5', 1], ['E5', 1], ['G5', 1]]),
  bar('Dm', [['F5', 1], ['A5', 1], ['F5', 1]]),
  bar('G', [['E5', 1], ['D5', 1], ['B4', 1]]),
  bar('F', [['A5', 1], ['C6', 1], ['F6', 1]]),
  bar('Em', [['E6', 2], ['B5', 1]]),
  bar(['Dm', 'Dm', 'G'], [['D6', 1], ['C6', 1], ['B5', 1]]),
  bar('C', [['C6', 2], [null, 1]]),
]

const SONG: Bar[] = [...SECTION_A, ...SECTION_B, ...SECTION_A, ...SECTION_B]
const BEATS_PER_BAR = 3
const LOOP_BEATS = SONG.length * BEATS_PER_BAR
const BPM = 92
const SEC_PER_BEAT = 60 / BPM

const NOTE_OFFSETS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export function noteToFreq(note: string): number {
  const midi = 12 * (Number(note.slice(1)) + 1) + NOTE_OFFSETS[note[0]]
  return 440 * 2 ** ((midi - 69) / 12)
}

type Voice = 'melody' | 'bass' | 'chord'
interface ScoreEvent {
  beat: number
  freq: number
  voice: Voice
}

/** Flattens SONG into time-ordered note events (beat offsets within one loop). */
export function buildScore(): ScoreEvent[] {
  const events: ScoreEvent[] = []
  SONG.forEach((b, barIndex) => {
    const barStart = barIndex * BEATS_PER_BAR
    let beat = barStart
    for (const [note, beats] of b.melody) {
      if (note) events.push({ beat, freq: noteToFreq(note), voice: 'melody' })
      beat += beats
    }
    // Waltz accompaniment: the chord's bass note on any beat where the chord changes,
    // its two upper tones on the other beats ("oom-pah-pah").
    b.chords.forEach((name, i) => {
      const prev = i === 0 ? null : b.chords[i - 1]
      const chord = CHORDS[name]
      if (name !== prev) {
        events.push({ beat: barStart + i, freq: noteToFreq(chord.bass), voice: 'bass' })
      } else {
        for (const tone of chord.tones) events.push({ beat: barStart + i, freq: noteToFreq(tone), voice: 'chord' })
      }
    })
  })
  return events.sort((a, b) => a.beat - b.beat)
}

const SCORE = buildScore()

// Master levels — deliberately well under sfx.ts's chimes (peak ~0.2) so feedback sounds
// always stand out over the music.
const NORMAL_VOLUME = 0.22
const FOCUS_VOLUME = 0.09
const DUCK_FACTOR = 0.3

const LOOKAHEAD_SEC = 0.3
const TICK_MS = 80

let enabled = loadBgmEnabled() ?? true
let mode: 'normal' | 'focus' = 'normal'
let ducked = false
let unlocked = false
let master: GainNode | null = null
let timer: ReturnType<typeof setInterval> | null = null
let loopStart = 0
let nextIndex = 0

/** One music-box pluck: a sine fundamental plus a quieter, faster-decaying octave partial
 * for the bell-like "tine" attack. */
function pluck(ctx: AudioContext, dest: AudioNode, ev: ScoreEvent, time: number): void {
  const shape = {
    melody: { type: 'sine' as OscillatorType, peak: 0.3, decay: 1.8, overtone: 0.28 },
    chord: { type: 'sine' as OscillatorType, peak: 0.08, decay: 0.9, overtone: 0.15 },
    bass: { type: 'triangle' as OscillatorType, peak: 0.2, decay: 1.4, overtone: 0 },
  }[ev.voice]

  const partials: [number, number, number][] = [[1, shape.peak, shape.decay]]
  if (shape.overtone > 0) partials.push([2, shape.peak * shape.overtone, shape.decay * 0.4])

  for (const [mult, peak, decay] of partials) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = shape.type
    osc.frequency.value = ev.freq * mult
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(peak, time + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(time)
    osc.stop(time + decay + 0.05)
  }
}

function ensureMaster(ctx: AudioContext): GainNode {
  if (master) return master
  master = ctx.createGain()
  master.gain.value = 0
  // Soft low-pass takes the edge off the sine partials so it reads as a warm music box
  // rather than an electronic beep.
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 3200
  master.connect(filter)
  filter.connect(ctx.destination)
  return master
}

function targetVolume(): number {
  if (!enabled || document.hidden) return 0
  return (mode === 'focus' ? FOCUS_VOLUME : NORMAL_VOLUME) * (ducked ? DUCK_FACTOR : 1)
}

function applyVolume(timeConstant = 0.25): void {
  const ctx = getContext()
  if (!ctx || !master) return
  master.gain.cancelScheduledValues(ctx.currentTime)
  master.gain.setTargetAtTime(targetVolume(), ctx.currentTime, timeConstant)
}

function tick(): void {
  const ctx = getContext()
  if (!ctx || !master) return
  // Catch up after a long stall (e.g. the tab was throttled) instead of firing a burst of
  // overdue notes all at once.
  if (loopStart + SCORE[nextIndex].beat * SEC_PER_BEAT < ctx.currentTime - 0.5) {
    loopStart = ctx.currentTime + 0.1
    nextIndex = 0
  }
  while (true) {
    const ev = SCORE[nextIndex]
    const time = loopStart + ev.beat * SEC_PER_BEAT
    if (time > ctx.currentTime + LOOKAHEAD_SEC) break
    pluck(ctx, master, ev, time)
    nextIndex++
    if (nextIndex >= SCORE.length) {
      nextIndex = 0
      loopStart += LOOP_BEATS * SEC_PER_BEAT
    }
  }
}

function start(): void {
  if (timer || !enabled || !unlocked || document.hidden) return
  const ctx = getContext()
  if (!ctx) return
  ensureMaster(ctx)
  loopStart = ctx.currentTime + 0.15
  nextIndex = 0
  timer = setInterval(tick, TICK_MS)
  tick()
  applyVolume(0.8) // slow fade-in
}

function stop(): void {
  if (timer) clearInterval(timer)
  timer = null
  applyVolume(0.15)
}

/** Call once at startup. Starts the music right away where the browser allows audio
 * without a gesture (e.g. desktop Chrome on a site the child already plays on), and
 * otherwise on the very first touch/click/key anywhere. Also pauses in the background. */
export function initBgm(): void {
  if (typeof window === 'undefined') return
  // iOS mutes Web Audio while the ring/silent switch is on silent — music, chimes and the
  // pre-recorded voice (tts.ts plays it through this same context) all went quiet. A
  // 'playback' session plays like a media app instead (Safari 16.4+; ignored elsewhere).
  const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession
  if (session) session.type = 'playback'

  const UNLOCK_EVENTS = ['pointerdown', 'mousedown', 'touchstart', 'pointerup', 'touchend', 'click', 'keydown'] as const
  const disarm = () => {
    for (const type of UNLOCK_EVENTS) window.removeEventListener(type, unlock, true)
  }
  const unlock = () => {
    const ctx = getContext() // resumes the context inside the gesture
    if (!ctx) return
    unlocked = true
    start()
    if (ctx.state === 'running') disarm()
  }
  // Which events count as a user activation differs by browser and input (iOS only lets
  // touchend/click start audio; desktop Chrome already allows it on mousedown), so listen
  // for all of them and stop at the first one that actually got the context running.
  for (const type of UNLOCK_EVENTS) window.addEventListener(type, unlock, true)

  // Autoplay attempt: resume() succeeds without a gesture when the browser's autoplay
  // policy allows it, and simply stays pending otherwise (the listeners above take over).
  const ctx = getContext()
  if (ctx) {
    void ctx.resume().then(() => {
      if (ctx.state !== 'running') return
      unlocked = true
      start()
      disarm()
    }, () => {})
    ctx.addEventListener('statechange', () => {
      if (ctx.state === 'running' && !unlocked) unlock()
    })
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop()
    else start()
  })
}

export function isBgmEnabled(): boolean {
  return enabled
}

export function setBgmEnabled(next: boolean): void {
  enabled = next
  saveBgmEnabled(next)
  if (next) {
    unlocked = true // only ever called from a tap, which is itself a gesture
    start()
  } else {
    stop()
  }
}

export function setBgmMode(next: 'normal' | 'focus'): void {
  if (mode === next) return
  mode = next
  applyVolume(0.6)
}

export function setBgmDucked(next: boolean): void {
  if (ducked === next) return
  ducked = next
  applyVolume(next ? 0.08 : 0.5)
}
