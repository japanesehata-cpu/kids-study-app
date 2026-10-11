import type { ProgressState } from '../domain/types'
import { CATEGORY_META } from '../domain/categoryMeta'
import { useI18n } from '../i18n/I18nContext'
import { ScreenTopBar } from '../components/ScreenTopBar'

interface ProgressScreenProps {
  progress: ProgressState
  /** Always straight home — going back one step would reopen ParentGate's math challenge. */
  onBack: () => void
}

export function ProgressScreen({ progress, onBack }: ProgressScreenProps) {
  const { t } = useI18n()

  return (
    <div className="screen screen-scroll">
      <ScreenTopBar onBack={onBack} onHome={onBack} />
      <h1 className="app-title">{t('progressTitle')}</h1>

      <div className="card-panel progress-panel">
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
      </div>

      {/* Material credits live here, on the parent-only screen, rather than under every
          child-facing trace canvas (docs/functional-design.md 3.10). */}
      <div className="card-panel credits-panel">
        <h2 className="credits-title">{t('creditsTitle')}</h2>
        <p>{t('traceStrokeCredit')}</p>
      </div>
    </div>
  )
}
