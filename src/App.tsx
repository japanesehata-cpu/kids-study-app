import { useEffect, useState } from 'react'
import type { AnswerRecord, Category, Level, ProgressState, SetResult } from './domain/types'
import { applySetResult, loadProgress, persistProgress, SET_SIZE } from './domain/progress'
import type { ClockMode } from './domain/questionGenerators/clock'
import { loadStreak, persistStreak, recordPlaySession, type PlayStreak } from './domain/streak'
import { loadIntroSeen, saveIntroSeen } from './lib/storage'
import { I18nProvider } from './i18n/I18nContext'
import { IntroScreen } from './screens/IntroScreen'
import { HomeScreen } from './screens/HomeScreen'
import { LevelSelectScreen } from './screens/LevelSelectScreen'
import { EnglishEntryScreen } from './screens/EnglishEntryScreen'
import { MojiEntryScreen } from './screens/MojiEntryScreen'
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
  | { name: 'mojiEntry' }
  | { name: 'levelSelect'; category: Category }
  | { name: 'handwriting'; category: 'hiragana' | 'katakana' | 'alphabet' }
  | { name: 'quiz'; category: Category; level: Level; setSize: number; clockMode?: ClockMode }
  | {
      name: 'result'
      category: Category
      level: Level
      setSize: number
      clockMode?: ClockMode
      result: SetResult
      streak: PlayStreak
    }
  | { name: 'parentGate' }
  | { name: 'progress' }

function AppContent() {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress())
  const [streak, setStreak] = useState<PlayStreak>(() => loadStreak())
  const [screen, setScreen] = useState<Screen>(() => (loadIntroSeen() ? { name: 'home' } : { name: 'intro' }))
  // Every screen below Home keeps a "もどる" (back one step) button alongside "ホームへ" (go
  // straight home) — this stack is what makes "one step back" actually mean the screen the
  // player came from, not always Home, e.g. Quiz -> LevelSelect, or LevelSelect ->
  // EnglishEntry when that's how English was reached.
  const [, setHistory] = useState<Screen[]>([])

  useEffect(() => {
    persistProgress(progress)
  }, [progress])

  useEffect(() => {
    persistStreak(streak)
  }, [streak])

  function navigate(next: Screen) {
    setHistory((h) => [...h, screen])
    setScreen(next)
  }

  function goBack() {
    setHistory((h) => {
      if (h.length === 0) {
        setScreen({ name: 'home' })
        return h
      }
      setScreen(h[h.length - 1])
      return h.slice(0, -1)
    })
  }

  function goHome() {
    setHistory([])
    setScreen({ name: 'home' })
  }

  function handleDismissIntro() {
    saveIntroSeen()
    goHome()
  }

  function handleQuizComplete(
    category: Category,
    level: Level,
    setSize: number,
    answers: AnswerRecord[],
    clockMode?: ClockMode,
  ) {
    const { progress: nextProgress, result } = applySetResult(category, level, progress, answers)
    setProgress(nextProgress)

    const nextStreak = recordPlaySession(streak)
    setStreak(nextStreak)

    navigate({
      name: 'result',
      category,
      level,
      setSize,
      clockMode,
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
            onSelectCategory={(category) =>
              // counting has no ★ levels at all (助数詞 redesign — see CATEGORY_MAX_LEVEL) —
              // skip straight to a fixed-size round, same treatment as englishSentence below.
              category === 'counting'
                ? navigate({ name: 'quiz', category, level: 1, setSize: SET_SIZE })
                : navigate({ name: 'levelSelect', category })
            }
            onOpenEnglishEntry={() => navigate({ name: 'englishEntry' })}
            onOpenMojiEntry={() => navigate({ name: 'mojiEntry' })}
            onOpenParentGate={() => navigate({ name: 'parentGate' })}
          />
        )
      case 'englishEntry':
        return (
          <EnglishEntryScreen
            onSelect={(category) =>
              // englishSentence has no ★ levels at all (see CATEGORY_MAX_LEVEL) — skip
              // straight to a fixed-size round instead of a level-select screen that would
              // only ever show a single, pointless "★1" button.
              category === 'englishSentence'
                ? navigate({ name: 'quiz', category, level: 1, setSize: SET_SIZE })
                : navigate({ name: 'levelSelect', category })
            }
            onBack={goBack}
            onHome={goHome}
          />
        )
      case 'mojiEntry':
        return (
          <MojiEntryScreen
            onSelect={(category) => navigate({ name: 'levelSelect', category })}
            onBack={goBack}
            onHome={goHome}
          />
        )
      case 'levelSelect':
        return (
          <LevelSelectScreen
            category={screen.category}
            onSelectLevel={(level, setSize, clockMode) =>
              navigate({ name: 'quiz', category: screen.category, level, setSize, clockMode })
            }
            onOpenHandwriting={
              screen.category === 'hiragana' || screen.category === 'katakana' || screen.category === 'alphabet'
                ? () => navigate({ name: 'handwriting', category: screen.category as 'hiragana' | 'katakana' | 'alphabet' })
                : undefined
            }
            onOpenSudoku={
              screen.category === 'logic' ? () => navigate({ name: 'levelSelect', category: 'sudoku' }) : undefined
            }
            onOpenMissingOperand={
              screen.category === 'addition' || screen.category === 'subtraction'
                ? () => navigate({ name: 'levelSelect', category: 'missingOperand' })
                : undefined
            }
            onBack={goBack}
            onHome={goHome}
          />
        )
      case 'handwriting':
        return <HandwritingScreen category={screen.category} onBack={goBack} onHome={goHome} />
      case 'quiz':
        return (
          <QuizScreen
            category={screen.category}
            level={screen.level}
            setSize={screen.setSize}
            clockMode={screen.clockMode}
            progress={progress}
            onComplete={(answers) =>
              handleQuizComplete(screen.category, screen.level, screen.setSize, answers, screen.clockMode)
            }
            onExit={goBack}
            onHome={goHome}
          />
        )
      case 'result':
        return (
          <ResultScreen
            result={screen.result}
            streak={screen.streak}
            onRetry={() =>
              navigate({
                name: 'quiz',
                category: screen.category,
                level: screen.level,
                setSize: screen.setSize,
                clockMode: screen.clockMode,
              })
            }
            onBack={goBack}
            onBackHome={goHome}
          />
        )
      case 'parentGate':
        return (
          <ParentGate
            onSuccess={() => navigate({ name: 'progress' })}
            onCancel={goBack}
          />
        )
      case 'progress':
        // ProgressScreen's single button always meant "go straight home" (it isn't one of
        // the もどる/ホームへ pairs added elsewhere) — goBack() would instead reopen
        // ParentGate's math challenge, which is a worse experience, not a genuine "back".
        return <ProgressScreen progress={progress} onBack={goHome} />
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
