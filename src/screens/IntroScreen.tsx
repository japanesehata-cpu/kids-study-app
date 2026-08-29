import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { characterThemes } from '../components/characters/characterThemes'
import { CharacterPortrait } from '../components/characters/CharacterPortrait'
import { useI18n } from '../i18n/I18nContext'
import { speak } from '../lib/tts'

interface IntroScreenProps {
  onDone: () => void
}

const ORDER = ['addition', 'englishSpelling', 'logic', 'subtraction'] as const

export function IntroScreen({ onDone }: IntroScreenProps) {
  const { t, lang } = useI18n()

  useEffect(() => {
    const speechLang = lang === 'ja' ? 'ja-JP' : 'en-US'
    speak(t('introGreeting'), speechLang)
    // announce once when the intro first mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
        {ORDER.map((category, i) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 30, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.3, type: 'spring', stiffness: 160, damping: 14 }}
          >
            <CharacterPortrait theme={characterThemes[category]} mood="celebrate" size={130} />
          </motion.div>
        ))}
      </div>

      <motion.p
        className="subtitle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        {t('introGreeting')}
      </motion.p>

      <motion.button
        type="button"
        className="primary-button"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
        onClick={onDone}
      >
        {t('startButton')}
      </motion.button>
    </div>
  )
}
