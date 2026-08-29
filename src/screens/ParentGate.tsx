import { useState } from 'react'
import { useI18n } from '../i18n/I18nContext'

interface ParentGateProps {
  onSuccess: () => void
  onCancel: () => void
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function ParentGate({ onSuccess, onCancel }: ParentGateProps) {
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
      <div className="card-panel">
        <h2 className="app-title">{t('parentGateTitle')}</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <label className="subtitle" htmlFor="parent-gate-input">
            {t('parentGatePrompt', { a: challenge.a, b: challenge.b })}
          </label>
          <input
            id="parent-gate-input"
            type="number"
            inputMode="numeric"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setShowError(false)
            }}
            autoFocus
            style={{
              fontSize: 28,
              padding: '12px 20px',
              borderRadius: 'var(--radius-md)',
              border: '2px solid var(--color-primary-soft)',
              width: 160,
              textAlign: 'center',
            }}
          />
          {showError && <p style={{ color: 'var(--color-error)' }}>{t('parentGateWrong')}</p>}
          <div style={{ display: 'flex', gap: 16 }}>
            <button type="submit" className="primary-button">
              {t('parentGateSubmit')}
            </button>
            <button type="button" className="secondary-button" onClick={onCancel}>
              {t('parentGateCancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
