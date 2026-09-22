import { useEffect, useState } from 'react'
import type { AnswerRecord, Category, Level, ProgressState, SetResult } from './domain/types'
import { applySetResult, loadProgress, persistProgress, SET_SIZE } from './domain/progress'
import { saveLastQuizFeedback } from './domain/homeFeedback'
import type { ClockMode } from './domain/questionGenerators/clock'
import { I18nProvider } from './i18n/I18nContext'
import { HomeScreen } from './screens/HomeScreen'
import { LevelSelectScreen } from './screens/LevelSelectScreen'
import { EnglishEntryScreen } from './screens/EnglishEntryScreen'
import { MojiEntryScreen } from './screens/MojiEntryScreen'
import { MojiModeEntryScreen } from './screens/MojiModeEntryScreen'
import { KanjiEntryScreen } from './screens/KanjiEntryScreen'
import { KanjiTraceScreen } from './screens/KanjiTraceScreen'
import { WordTraceScreen } from './screens/WordTraceScreen'
import { AdditionEntryScreen } from './screens/AdditionEntryScreen'
import { SubtractionEntryScreen } from './screens/SubtractionEntryScreen'
import { LogicEntryScreen } from './screens/LogicEntryScreen'
import { HandwritingScreen } from './screens/HandwritingScreen'
import { KanaTraceScreen } from './screens/KanaTraceScreen'
import { AlphabetTraceScreen } from './screens/AlphabetTraceScreen'
import { QuizScreen } from './screens/QuizScreen'
import { ResultScreen } from './screens/ResultScreen'
import { ParentGate } from './screens/ParentGate'
import { ProgressScreen } from './screens/ProgressScreen'
import { SparkleBackground } from './components/SparkleBackground'

type Screen =
  | { name: 'home' }
  | { name: 'englishEntry' }
  | { name: 'mojiEntry' }
  | { name: 'mojiModeEntry'; script: 'hiragana' | 'katakana' | 'alphabet' }
  | { name: 'kanjiEntry' }
  | { name: 'kanjiTrace' }
  | { name: 'wordTrace' }
  | { name: 'additionEntry' }
  | { name: 'subtractionEntry' }
  | { name: 'logicEntry' }
  | { name: 'levelSelect'; category: Category }
  | { name: 'handwriting'; category: 'hiragana' | 'katakana' | 'alphabet' }
  | { name: 'handwritingTrace'; category: 'hiragana' | 'katakana' | 'alphabet' }
  | { name: 'quiz'; category: Category; level: Level; setSize: number; clockMode?: ClockMode }
  | {
      name: 'result'
      category: Category
      level: Level
      setSize: number
      clockMode?: ClockMode
      result: SetResult
    }
  | { name: 'parentGate' }
  | { name: 'progress' }

function AppContent() {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress())
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  // Every screen below Home keeps a "もどる" (back one step) button alongside "ホームへ" (go
  // straight home) — this stack is what makes "one step back" actually mean the screen the
  // player came from, not always Home, e.g. Quiz -> LevelSelect, or LevelSelect ->
  // EnglishEntry when that's how English was reached.
  const [, setHistory] = useState<Screen[]>([])

  useEffect(() => {
    persistProgress(progress)
  }, [progress])

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

  function handleQuizComplete(
    category: Category,
    level: Level,
    setSize: number,
    answers: AnswerRecord[],
    clockMode?: ClockMode,
  ) {
    const { progress: nextProgress, result } = applySetResult(category, level, progress, answers)
    setProgress(nextProgress)
    saveLastQuizFeedback({
      category,
      leveledUp: result.leveledUp,
      newLevel: nextProgress[category].level,
      strongSubSkill: result.strongSubSkill,
      correctCount: result.answers.filter((a) => a.correct).length,
      total: result.answers.length,
    })

    navigate({
      name: 'result',
      category,
      level,
      setSize,
      clockMode,
      result,
    })
  }

  function renderScreen() {
    switch (screen.name) {
      case 'home':
        return (
          <HomeScreen
            onSelectCategory={(category) => {
              // counting has no ★ levels at all (助数詞 redesign — see CATEGORY_MAX_LEVEL) —
              // skip straight to a fixed-size round, same treatment as englishSentence
              // elsewhere. addition/subtraction/logic each have a second mode
              // (□のけいさん / すうどく) — see {Addition,Subtraction,Logic}EntryScreen for
              // why those get their own flat chooser step now instead of a button bolted
              // onto LevelSelectScreen.
              if (category === 'counting') {
                navigate({ name: 'quiz', category, level: 1, setSize: SET_SIZE })
              } else if (category === 'addition') {
                navigate({ name: 'additionEntry' })
              } else if (category === 'subtraction') {
                navigate({ name: 'subtractionEntry' })
              } else if (category === 'logic') {
                navigate({ name: 'logicEntry' })
              } else {
                navigate({ name: 'levelSelect', category })
              }
            }}
            onOpenEnglishEntry={() => navigate({ name: 'englishEntry' })}
            onOpenMojiEntry={() => navigate({ name: 'mojiEntry' })}
            onOpenKanjiEntry={() => navigate({ name: 'kanjiEntry' })}
            onOpenParentGate={() => navigate({ name: 'parentGate' })}
          />
        )
      case 'englishEntry':
        return (
          <EnglishEntryScreen
            onSelect={(category) => {
              // englishSentence has no ★ levels at all (see CATEGORY_MAX_LEVEL) — skip
              // straight to a fixed-size round instead of a level-select screen that would
              // only ever show a single, pointless "★1" button.
              if (category === 'englishSentence') {
                navigate({ name: 'quiz', category, level: 1, setSize: SET_SIZE })
              } else if (category === 'wordTrace') {
                // Unscored practice activity, not a Category — same direct-navigation
                // treatment as kanjiEntry's 'trace' option (see KanjiTraceScreen).
                navigate({ name: 'wordTrace' })
              } else {
                navigate({ name: 'levelSelect', category })
              }
            }}
            onBack={goBack}
            onHome={goHome}
          />
        )
      case 'mojiEntry':
        return (
          <MojiEntryScreen
            onSelect={(script) => navigate({ name: 'mojiModeEntry', script })}
            onBack={goBack}
            onHome={goHome}
          />
        )
      case 'mojiModeEntry':
        return (
          <MojiModeEntryScreen
            script={screen.script}
            onSelect={(mode) =>
              mode === 'practice'
                ? navigate({ name: 'levelSelect', category: screen.script })
                : mode === 'trace'
                  ? navigate({ name: 'handwritingTrace', category: screen.script })
                  : navigate({ name: 'handwriting', category: screen.script })
            }
            onBack={goBack}
            onHome={goHome}
          />
        )
      case 'kanjiEntry':
        return (
          <KanjiEntryScreen
            onSelect={(mode) =>
              mode === 'trace' ? navigate({ name: 'kanjiTrace' }) : navigate({ name: 'levelSelect', category: 'kanji' })
            }
            onBack={goBack}
            onHome={goHome}
          />
        )
      case 'kanjiTrace':
        return <KanjiTraceScreen onBack={goBack} onHome={goHome} />
      case 'wordTrace':
        return <WordTraceScreen onBack={goBack} onHome={goHome} />
      case 'additionEntry':
        return (
          <AdditionEntryScreen
            onSelect={(mode) =>
              navigate({ name: 'levelSelect', category: mode === 'practice' ? 'addition' : 'missingOperandAddition' })
            }
            onBack={goBack}
            onHome={goHome}
          />
        )
      case 'subtractionEntry':
        return (
          <SubtractionEntryScreen
            onSelect={(mode) =>
              navigate({
                name: 'levelSelect',
                category: mode === 'practice' ? 'subtraction' : 'missingOperandSubtraction',
              })
            }
            onBack={goBack}
            onHome={goHome}
          />
        )
      case 'logicEntry':
        return (
          <LogicEntryScreen
            onSelect={(mode) => navigate({ name: 'levelSelect', category: mode === 'practice' ? 'logic' : 'sudoku' })}
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
            onBack={goBack}
            onHome={goHome}
          />
        )
      case 'handwriting':
        return <HandwritingScreen category={screen.category} onBack={goBack} onHome={goHome} />
      case 'handwritingTrace':
        return screen.category === 'alphabet' ? (
          <AlphabetTraceScreen onBack={goBack} onHome={goHome} />
        ) : (
          <KanaTraceScreen category={screen.category} onBack={goBack} onHome={goHome} />
        )
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
