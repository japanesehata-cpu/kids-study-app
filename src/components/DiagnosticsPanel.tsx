import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { characterThemes } from './characters/characterThemes'
import { getAudioStatus, getSpeechLog, speak, type SpeechLogEntry } from '../lib/tts'
import { clearErrorLog, getErrorLog, type ErrorLogEntry } from '../lib/errorLog'

function formatTime(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Parent-only troubleshooting (docs/functional-design.md F-12): which build is running, the
 * state of the audio pipeline and how recent phrases were actually voiced, and errors the
 * app has recorded on this phone. */
export function DiagnosticsPanel() {
  const { t, lang } = useI18n()
  const [audio, setAudio] = useState(getAudioStatus)
  const [speechLog, setSpeechLog] = useState<SpeechLogEntry[]>(() => [...getSpeechLog()])
  const [errors, setErrors] = useState<ErrorLogEntry[]>(getErrorLog)

  // The audio state changes as the device suspends/resumes sound; keep the panel current.
  useEffect(() => {
    const id = setInterval(() => {
      setAudio(getAudioStatus())
      setSpeechLog([...getSpeechLog()])
    }, 1000)
    return () => clearInterval(id)
  }, [])

  function testSound() {
    // A phrase that always has a pre-rendered file, so the test shows whether that path works.
    void speak(t('greetDay'), lang === 'ja' ? 'ja-JP' : 'en-US', characterThemes.addition.voiceProfile, lang === 'ja' ? 'greet-day' : undefined)
  }

  return (
    <div className="card-panel diagnostics-panel">
      <h2 className="credits-title">{t('diagTitle')}</h2>
      <p>{t('diagVersion', { version: __APP_VERSION__, built: formatTime(Date.parse(__BUILD_TIME__)) })}</p>
      <p>
        {t('diagAudio', {
          state: audio.contextState,
          session: audio.audioSession,
          webSpeech: t(audio.webSpeech ? 'diagYes' : 'diagNo'),
        })}
      </p>
      <button type="button" className="secondary-button" onClick={testSound}>
        🔊 {t('diagAudioTest')}
      </button>

      <h3 className="diagnostics-subtitle">{t('diagSpeechLogTitle')}</h3>
      {speechLog.length === 0 ? (
        <p>{t('diagSpeechLogEmpty')}</p>
      ) : (
        <ul className="diagnostics-list">
          {[...speechLog].reverse().map((e, i) => (
            <li key={`${e.at}-${i}`}>
              {formatTime(e.at)} [{e.route}] ({e.contextState}) {e.text}
            </li>
          ))}
        </ul>
      )}

      <h3 className="diagnostics-subtitle">{t('diagErrorLogTitle')}</h3>
      {errors.length === 0 ? (
        <p>{t('diagErrorLogEmpty')}</p>
      ) : (
        <>
          <ul className="diagnostics-list">
            {[...errors].reverse().map((e, i) => (
              <li key={`${e.at}-${i}`}>
                {formatTime(e.at)} [{e.source}] {e.message}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              clearErrorLog()
              setErrors([])
            }}
          >
            {t('diagErrorLogClear')}
          </button>
        </>
      )}
    </div>
  )
}
