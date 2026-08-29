import type { ProgressState } from '../domain/types'
import { CATEGORY_META } from '../domain/categoryMeta'
import { useI18n } from '../i18n/I18nContext'

interface ProgressScreenProps {
  progress: ProgressState
  onBack: () => void
}

export function ProgressScreen({ progress, onBack }: ProgressScreenProps) {
  const { t } = useI18n()

  return (
    <div className="screen">
      <h1 className="app-title">{t('progressTitle')}</h1>

      <div className="card-panel">
        {CATEGORY_META.map(({ category, labelKey }) => {
          const categoryProgress = progress[category]
          const accuracyValues = categoryProgress.recentAccuracy
          const averageAccuracy =
            accuracyValues.length > 0
              ? accuracyValues.reduce((sum, v) => sum + v, 0) / accuracyValues.length
              : null

          return (
            <div key={category} style={{ width: '100%' }}>
              <div className="progress-row">
                <strong>{t(labelKey)}</strong>
                <span>{t('progressLevel', { level: categoryProgress.level })}</span>
              </div>
              <p style={{ margin: '4px 0', color: 'var(--color-text-soft)' }}>
                {t('progressAccuracy')}
              </p>
              {averageAccuracy === null ? (
                <p>{t('progressNoData')}</p>
              ) : (
                <div className="stat-bar-track">
                  <div
                    className="stat-bar-fill"
                    style={{ width: `${Math.round(averageAccuracy * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}

        <button type="button" className="secondary-button" onClick={onBack}>
          {t('progressBack')}
        </button>
      </div>
    </div>
  )
}
