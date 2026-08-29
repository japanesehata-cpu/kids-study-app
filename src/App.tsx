import { useEffect, useState } from 'react'
import type { AnswerRecord, Category, Level, ProgressState, SetResult } from './domain/types'
import { applySetResult, loadProgress, persistProgress } from './domain/progress'
import { loadStreak, persistStreak, recordPlaySession, type PlayStreak } from './domain/streak'
import { loadIntroSeen, saveIntroSeen } from './lib/storage'
import { I18nProvider } from './i18n/I18nContext'
import { IntroScreen } from './screens/IntroScreen'
import { HomeScreen } from './screens/HomeScreen'
import { LevelSelectScreen } from './screens/LevelSelectScreen'
import { EnglishEntryScreen } from './screens/EnglishEntryScreen'
import { HandwritingScreen } from './screens/HandwritingScreen'
import { QuizScreen } from './screens/QuizScreen'
import { ResultScreen } from './screens/ResultScreen'
import { ParentGate } from './screens/ParentGate'
import { ProgressScreen } from './screens/ProgressScreen'
import { SparkleBackground } from './components/SparkleBackground'

type Screen =
  | { name: 'intro' }
  | { name: 'home' }
  | { name: 'englishEntry' }
  | { name: 'levelSelect'; category: Category }
  | { name: 'handwriting'; category: 'hiragana' | 'katakana' }
  | { name: 'quiz'; category: Category; level: Level; setSize: number }
  | {
      name: 'result'
      category: Category
      level: Level
      setSize: number
      result: SetResult
      streak: PlayStreak
    }
  | { name: 'parentGate' }
  | { name: 'progress' }

function AppContent() {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress())
  const [streak, setStreak] = useState<PlayStreak>(() => loadStreak())
  const [screen, setScreen] = useState<Screen>(() => (loadIntroSeen() ? { name: 'home' } : { name: 'intro' }))

  useEffect(() => {
    persistProgress(progress)
  }, [progress])

  useEffect(() => {
    persistStreak(streak)
  }, [streak])

  function handleDismissIntro() {
    saveIntroSeen()
    setScreen({ name: 'home' })
  }

  function handleQuizComplete(category: Category, level: Level, setSize: number, answers: AnswerRecord[]) {
    const { progress: nextProgress, result } = applySetResult(category, level, progress, answers)
    setProgress(nextProgress)

    const nextStreak = recordPlaySession(streak)
    setStreak(nextStreak)

    setScreen({
      name: 'result',
      category,
      level,
      setSize,
      result,
      streak: nextStreak,
    })
  }

  function renderScreen() {
    switch (screen.name) {
      case 'intro':
        return <IntroScreen onDone={handleDismissIntro} />
      case 'home':
        return (
          <HomeScreen
            streak={streak}
            onSelectCategory={(category) => setScreen({ name: 'levelSelect', category })}
            onOpenEnglishEntry={() => setScreen({ name: 'englishEntry' })}
            onOpenParentGate={() => setScreen({ name: 'parentGate' })}
          />
        )
      case 'englishEntry':
        return (
          <EnglishEntryScreen
            onSelect={(category) => setScreen({ name: 'levelSelect', category })}
            onBack={() => setScreen({ name: 'home' })}
          />
        )
      case 'levelSelect':
        return (
          <LevelSelectScreen
            category={screen.category}
            onSelectLevel={(level, setSize) => setScreen({ name: 'quiz', category: screen.category, level, setSize })}
            onOpenHandwriting={
              screen.category === 'hiragana' || screen.category === 'katakana'
                ? () => setScreen({ name: 'handwriting', category: screen.category as 'hiragana' | 'katakana' })
                : undefined
            }
            onBack={() => setScreen({ name: 'home' })}
          />
        )
      case 'handwriting':
        return <HandwritingScreen category={screen.category} onBack={() => setScreen({ name: 'home' })} />
      case 'quiz':
        return (
          <QuizScreen
            category={screen.category}
            level={screen.level}
            setSize={screen.setSize}
            progress={progress}
            onComplete={(answers) => handleQuizComplete(screen.category, screen.level, screen.setSize, answers)}
            onExit={() => setScreen({ name: 'home' })}
          />
        )
      case 'result':
        return (
          <ResultScreen
            result={screen.result}
            streak={screen.streak}
            onRetry={() =>
              setScreen({ name: 'quiz', category: screen.category, level: screen.level, setSize: screen.setSize })
            }
            onBackHome={() => setScreen({ name: 'home' })}
          />
        )
      case 'parentGate':
        return (
          <ParentGate
            onSuccess={() => setScreen({ name: 'progress' })}
            onCancel={() => setScreen({ name: 'home' })}
          />
        )
      case 'progress':
        return <ProgressScreen progress={progress} onBack={() => setScreen({ name: 'home' })} />
    }
  }

  return (
    <>
      <SparkleBackground />
      <div style={{ position: 'relative', zIndex: 1 }}>{renderScreen()}</div>
    </>
  )
}

function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  )
}

export default App
