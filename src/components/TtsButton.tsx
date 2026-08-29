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
  return (
    <motion.button
      type="button"
      onClick={() => speak(text, lang, voiceProfile, cacheKey)}
      aria-label={label}
      whileTap={{ scale: 0.88 }}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: 'none',
        background: 'var(--color-accent)',
        boxShadow: '0 4px 0 #e0a83a',
        fontSize: size * 0.45,
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
