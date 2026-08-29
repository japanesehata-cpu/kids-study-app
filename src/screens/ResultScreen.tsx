import { useEffect } from 'react'
import type { SetResult } from '../domain/types'
import type { PlayStreak } from '../domain/streak'
import { useI18n } from '../i18n/I18nContext'
import { subSkillLabelKey } from '../i18n/subSkillLabels'
import { speak } from '../lib/tts'
import { StampReward } from '../components/StampReward'
import { CharacterPortrait } from '../components/characters/CharacterPortrait'
import { characterThemes } from '../components/characters/characterThemes'
import { CategoryHeader } from '../components/CategoryHeader'

interface ResultScreenProps {
  result: SetResult
  streak: PlayStreak
  onRetry: () => void
  /** one step back — LevelSelectScreen, to pick a different level instead of the same one again */
  onBack: () => void
  onBackHome: () => void
}

export function ResultScreen({ result, streak, onRetry, onBack, onBackHome }: ResultScreenProps) {
  const { t, lang } = useI18n()
  const leveledUp = result.leveledUp
  const correctCount = result.answers.filter((a) => a.correct).length
  const total = result.answers.length
  const showBestStreak = result.bestStreak >= 3
  const voiceProfile = characterThemes[result.category].voiceProfile

  useEffect(() => {
    // Guards the chain below the same way QuizScreen guards its own per-answer feedback
    // chain: a local flag flipped by this effect's own cleanup, rather than a ref shared
    // with a separate effect — two independently-ordered effects were an unnecessary extra
    // moving part for what's really "stop issuing further speak() calls once this screen
    // is gone." Tapping "もういちど"/"ホームへ" mid-announcement can't let a stale leftover
    // segment fire after the next screen has already started its own speech and cancel it.
    let cancelled = false

    const speechLang = lang === 'ja' ? 'ja-JP' : 'en-US'
    // cacheKey is only meaningful in ja (see scripts/generate-tts-cache.mjs's result-speech
    // entries) — score/best-streak are bounded by the set-size picker (5 or 10 questions),
    // so every reachable combination is pre-rendered per category's voice, the same
    // fix applied to the per-answer feedback that used to be the only cached speech here.
    const cacheable = lang === 'ja'
    const prefix = `result-${result.category}`
    const segments: { text: string; cacheKey?: string }[] = [
      { text: t('resultTitle'), cacheKey: cacheable ? `${prefix}-title` : undefined },
      {
        text: t('resultScoreSpeech', { correct: correctCount, total }),
        cacheKey: cacheable ? `${prefix}-score-${total}-${correctCount}` : undefined,
      },
    ]
    if (leveledUp) {
      segments.push({ text: t('resultLevelUp'), cacheKey: cacheable ? `${prefix}-levelup` : undefined })
    }
    if (showBestStreak) {
      segments.push({
        text: t('resultBestStreak', { streak: result.bestStreak }),
        cacheKey: cacheable ? `${prefix}-beststreak-${result.bestStreak}` : undefined,
      })
    }

    segments.reduce(
      (chain, segment) =>
        chain.then(() => {
          if (cancelled) return
          // Caught per segment so one failing segment (e.g. a cached file that 404s)
          // can't silently skip every segment queued after it in the chain.
          return speak(segment.text, speechLang, voiceProfile, segment.cacheKey).catch(() => {})
        }),
      Promise.resolve(),
    )

    return () => {
      cancelled = true
    }
    // only announce once when the result screen first appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="screen">
      <CategoryHeader category={result.category} />
      <h1 className="app-title">{t('resultTitle')}</h1>
      <CharacterPortrait theme={characterThemes[result.category]} mood="celebrate" size={160} />
      <StampReward />

      <div className="card-panel">
        <p className="equation-text" style={{ fontSize: 36 }}>
          {t('resultScoreLabel', { correct: correctCount, total })}
        </p>

        {showBestStreak && (
          <p style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
            🔥 {t('resultBestStreak', { streak: result.bestStreak })}
          </p>
        )}

        {streak.currentStreak >= 1 && (
          <p className="subtitle">{t('streakBadge', { count: streak.currentStreak })}</p>
        )}

        {leveledUp && (
          <div className="feedback-banner correct">{t('resultLevelUp')}</div>
        )}

        {result.strongSubSkill || result.weakSubSkill ? (
          <div className="stat-row">
            {result.strongSubSkill && (
              <p>
                🌟 {t('resultStrongLabel')}: {t(subSkillLabelKey[result.strongSubSkill])}
              </p>
            )}
            {result.weakSubSkill && (
              <p>
                💪 {t('resultWeakLabel')}: {t(subSkillLabelKey[result.weakSubSkill])}
              </p>
            )}
          </div>
        ) : (
          <p>{t('resultAllGoodMessage')}</p>
        )}

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" className="primary-button" onClick={onRetry}>
            {t('tryAgainButton')}
          </button>
          <button type="button" className="secondary-button" onClick={onBack}>
            {t('backButton')}
          </button>
          <button type="button" className="secondary-button" onClick={onBackHome}>
            {t('backHomeButton')}
          </button>
        </div>
      </div>
    </div>
  )
}
