import { useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { ScreenTopBar } from '../components/ScreenTopBar'

interface ParentGateProps {
  onSuccess: () => void
  onCancel: () => void
  onHome: () => void
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function ParentGate({ onSuccess, onCancel, onHome }: ParentGateProps) {
  const { t } = useI18n()
  const [challenge] = useState(() => ({ a: randomInt(12, 48), b: randomInt(12, 48) }))
  const [value, setValue] = useState('')
  const [showError, setShowError] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (Number(value) === challenge.a + challenge.b) {
      onSuccess()
    } else {
      setShowError(true)
      setValue('')
    }
  }

  return (
    <div className="screen">
      <ScreenTopBar onBack={onCancel} onHome={onHome} />

      <div className="screen-body">
        <div className="card-panel parent-gate-panel">
          <h2 className="app-title">{t('parentGateTitle')}</h2>
          <form onSubmit={handleSubmit} className="parent-gate-form">
            <label className="subtitle" htmlFor="parent-gate-input">
              {t('parentGatePrompt', { a: challenge.a, b: challenge.b })}
            </label>
            <input
              id="parent-gate-input"
              className="parent-gate-input"
              type="number"
              inputMode="numeric"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setShowError(false)
              }}
              autoFocus
            />
            {showError && <p className="parent-gate-error">{t('parentGateWrong')}</p>}
            <button type="submit" className="primary-button">
              {t('parentGateSubmit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
