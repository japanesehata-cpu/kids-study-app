import { speak, speakSequence, type SpeechLang, type SpeechPart, type VoiceProfile } from '../lib/tts'

interface TtsButtonProps {
  text: string
  lang: SpeechLang
  label: string
  /** px (the largest size; shrinks on a short viewport), or a CSS length used as is — the
   * big "listen again" button that fills a question's 問いの欄 passes container units. */
  size?: number | string
  voiceProfile?: VoiceProfile
  /** Plays a pre-rendered file first when one exists for this exact phrase — see
   * scripts/generate-tts-cache.mjs — falling back to live synthesis otherwise. */
  cacheKey?: string
  /** When set, spoken instead of `text` as these pre-rendered parts in order (a sentence
   * whose middle varies, e.g. とけい「あわせる」's time). */
  parts?: SpeechPart[]
}

export function TtsButton({ text, lang, label, size = 72, voiceProfile, cacheKey, parts }: TtsButtonProps) {
  // `size` is the button's max/desktop size — actual size shrinks toward a still-tappable
  // floor on a short viewport, same clamp()/vh discipline as .screen/.card-panel, since
  // this button appears on nearly every quiz screen and its old fixed px size was a real
  // contributor to needing a scroll on a phone.
  const width = typeof size === 'number' ? `clamp(44px, 8vh, ${size}px)` : size
  const fontSize = typeof size === 'number' ? `clamp(20px, 3.6vh, ${size * 0.45}px)` : `calc(${size} * 0.42)`
  return (
    <button
      type="button"
      onClick={() => (parts ? speakSequence(parts, lang, voiceProfile) : speak(text, lang, voiceProfile, cacheKey))}
      aria-label={label}
      style={{
        width,
        height: width,
        borderRadius: '50%',
        border: 'none',
        background: 'var(--color-accent)',
        boxShadow: '0 4px 0 var(--color-accent-dark)',
        fontSize,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      🔊
    </button>
  )
}
