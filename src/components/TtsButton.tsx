import { motion } from 'framer-motion'
import { speak, type SpeechLang, type VoiceProfile } from '../lib/tts'

interface TtsButtonProps {
  text: string
  lang: SpeechLang
  label: string
  size?: number
  voiceProfile?: VoiceProfile
  /** Plays a pre-rendered file first when one exists for this exact phrase — see
   * scripts/generate-tts-cache.mjs — falling back to live synthesis otherwise. */
  cacheKey?: string
}

export function TtsButton({ text, lang, label, size = 72, voiceProfile, cacheKey }: TtsButtonProps) {
  // `size` is the button's max/desktop size — actual size shrinks toward a still-tappable
  // floor on a short viewport, same clamp()/vh discipline as .screen/.card-panel, since
  // this button appears on nearly every quiz screen and its old fixed px size was a real
  // contributor to needing a scroll on a phone.
  const width = `clamp(44px, 8vh, ${size}px)`
  return (
    <motion.button
      type="button"
      onClick={() => speak(text, lang, voiceProfile, cacheKey)}
      aria-label={label}
      whileTap={{ scale: 0.88 }}
      style={{
        width,
        height: width,
        borderRadius: '50%',
        border: 'none',
        background: 'var(--color-accent)',
        boxShadow: '0 4px 0 #e0a83a',
        fontSize: `clamp(20px, 3.6vh, ${size * 0.45}px)`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      🔊
    </motion.button>
  )
}
