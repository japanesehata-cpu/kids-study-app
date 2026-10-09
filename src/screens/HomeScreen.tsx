import { useEffect, useRef, useState, type UIEvent } from 'react'
import type { Category } from '../domain/types'
import type { DictionaryKey } from '../i18n/dictionary'
import { CATEGORY_META } from '../domain/categoryMeta'
import { useI18n } from '../i18n/I18nContext'
import { speak, type SpeechLang } from '../lib/tts'
import { getContext } from '../lib/sfx'
import { CharacterPortrait } from '../components/characters/CharacterPortrait'
import { characterThemes } from '../components/characters/characterThemes'
import { LanguageToggle } from '../components/LanguageToggle'
import { isBgmEnabled, setBgmEnabled } from '../lib/bgm'

interface HomeScreenProps {
  onSelectCategory: (category: Category) => void
  onOpenEnglishEntry: () => void
  onOpenMojiEntry: () => void
  onOpenKanjiEntry: () => void
  onOpenParentGate: () => void
}

// English is shown as a single combined card/portrait on the home screen (see
// EnglishEntryScreen) rather than three — englishListening and englishSentence are dropped
// from every home-screen list and englishSpelling stands in as the shared slot, relabeled
// below. Likewise ひらがな/カタカナ/アルファベット collapse to one "もじ" card (see
// MojiEntryScreen) — katakana/alphabet are dropped and hiragana stands in as the shared
// slot, relabeled the same way. sudoku and missingOperandAddition/missingOperandSubtraction
// are also dropped — each is reached via a button on another category's own level-select
// instead (see LevelSelectScreen.tsx), not its own home-screen card.
//
// shapes is temporarily dropped too (2026-09-29, at the user's request) — its content
// quality isn't where it needs to be yet, so it's hidden from Home while that gets sorted
// out. Nothing else about the feature (types, questionGenerators/shapes.ts, ShapeIcon,
// QuizScreen wiring, tests) was touched — remove this line to bring it back.
const HOME_CATEGORY_META = CATEGORY_META.filter(
  (c) =>
    c.category !== 'englishListening' &&
    c.category !== 'englishSentence' &&
    c.category !== 'katakana' &&
    c.category !== 'alphabet' &&
    c.category !== 'sudoku' &&
    c.category !== 'missingOperandAddition' &&
    c.category !== 'missingOperandSubtraction' &&
    c.category !== 'shapes' &&
    c.category !== 'kanji2',
)
const ALL_CATEGORIES: Category[] = HOME_CATEGORY_META.map((c) => c.category)

// Shown (and spoken by momo) on the first Home of each app visit only — not every time the
// child comes back from a quiz.
let greetedThisVisit = false

function greetingFor(hour: number): { key: DictionaryKey; cacheKey: string } {
  if (hour >= 4 && hour < 11) return { key: 'greetMorning', cacheKey: 'greet-morning' }
  if (hour >= 11 && hour < 17) return { key: 'greetDay', cacheKey: 'greet-day' }
  return { key: 'greetEvening', cacheKey: 'greet-evening' }
}

const INTRO_KEY_BY_CATEGORY: Record<Category, DictionaryKey> = {
  addition: 'introMomo',
  subtraction: 'introSora',
  englishSpelling: 'introHana',
  englishListening: 'introHana',
  logic: 'introKoko',
  hiragana: 'introYui',
  katakana: 'introPeko',
  // kanji/money borrow aru's/peko's portrait and voice (see characterThemes.ts), so their
  // lines are spoken as those characters.
  kanji: 'introKanji',
  kanji2: 'introKanji',
  alphabet: 'introAru',
  clock: 'introToki',
  spotDifference: 'introMitsu',
  counting: 'introKazu',
  money: 'introMoney',
  englishSentence: 'introHana',
  sudoku: 'introKoko',
  missingOperandAddition: 'introMomo',
  missingOperandSubtraction: 'introSora',
  shapes: 'introKaku',
}

export function HomeScreen({
  onSelectCategory,
  onOpenEnglishEntry,
  onOpenMojiEntry,
  onOpenKanjiEntry,
  onOpenParentGate,
}: HomeScreenProps) {
  const { t, lang } = useI18n()
  const [atEnd, setAtEnd] = useState(false)
  const [bgmOn, setBgmOn] = useState(isBgmEnabled)
  const showcaseRef = useRef<HTMLDivElement>(null)

  // Hides the "swipe for more" fade once there's nothing left to scroll to — both once the
  // player actually scrolls all the way there, and up front if every portrait already fits
  // without scrolling (a wide desktop window).
  function updateAtEnd(el: HTMLDivElement) {
    setAtEnd(el.scrollWidth - el.scrollLeft - el.clientWidth < 4)
  }

  useEffect(() => {
    if (showcaseRef.current) updateAtEnd(showcaseRef.current)
  }, [])

  const [greeting, setGreeting] = useState<{ key: DictionaryKey; cacheKey: string } | null>(() =>
    greetedThisVisit ? null : greetingFor(new Date().getHours()),
  )
  useEffect(() => {
    if (!greeting) return
    greetedThisVisit = true
    let alive = true
    const say = () => {
      if (!alive) return
      const speechLang: SpeechLang = lang === 'ja' ? 'ja-JP' : 'en-US'
      speak(t(greeting.key), speechLang, characterThemes.addition.voiceProfile, lang === 'ja' ? greeting.cacheKey : undefined)
    }
    // Speak right away if this browser already allows sound; otherwise right after the
    // first touch — unless that touch took the child off Home (then it's not said at all).
    const ctx = getContext()
    let pending: ReturnType<typeof setTimeout> | null = null
    const onFirstTouch = () => {
      window.removeEventListener('pointerup', onFirstTouch, true)
      pending = setTimeout(say, 200)
    }
    if (ctx?.state === 'running') say()
    else window.addEventListener('pointerup', onFirstTouch, true)
    const hide = setTimeout(() => setGreeting(null), 6000)
    return () => {
      alive = false
      window.removeEventListener('pointerup', onFirstTouch, true)
      if (pending) clearTimeout(pending)
      clearTimeout(hide)
    }
    // once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Every few seconds one mascot in the strip hops and waves, so Home feels alive without
  // anything big moving at once.
  const [wavingIndex, setWavingIndex] = useState<number | null>(null)
  useEffect(() => {
    const id = setInterval(() => {
      setWavingIndex((prev) => {
        let next = Math.floor(Math.random() * ALL_CATEGORIES.length)
        if (next === prev) next = (next + 1) % ALL_CATEGORIES.length
        return next
      })
    }, 3200)
    return () => clearInterval(id)
  }, [])

  function handleIntroduce(category: Category) {
    const speechLang: SpeechLang = lang === 'ja' ? 'ja-JP' : 'en-US'
    // A pre-rendered file exists only for the Japanese intros (see
    // scripts/generate-tts-cache.mjs) — English already goes through the browser's own
    // TTS regardless of device, so there's nothing to gain from caching it too.
    const cacheKey = lang === 'ja' ? `intro-${category}` : undefined
    speak(t(INTRO_KEY_BY_CATEGORY[category]), speechLang, characterThemes[category].voiceProfile, cacheKey)
  }

  return (
    <div className="screen">
      <div className="top-bar top-bar-home">
        <h1 className="app-title">{t('appTitle')}</h1>
        <div className="top-bar-controls">
          <LanguageToggle />
          <button
            type="button"
            className={`icon-button icon-button-small ${bgmOn ? '' : 'icon-button-off'}`.trim()}
            aria-label={t(bgmOn ? 'bgmOnLabel' : 'bgmOffLabel')}
            aria-pressed={bgmOn}
            onClick={() => {
              setBgmEnabled(!bgmOn)
              setBgmOn(!bgmOn)
            }}
          >
            🎵
          </button>
          <button
            type="button"
            className="icon-button icon-button-small"
            aria-label={t('settingsLabel')}
            onClick={onOpenParentGate}
          >
            ⚙️
          </button>
        </div>
      </div>

      <div className={`character-showcase-wrap ${atEnd ? 'at-end' : ''}`.trim()}>
        <div
          className="character-showcase"
          ref={showcaseRef}
          onScroll={(e: UIEvent<HTMLDivElement>) => updateAtEnd(e.currentTarget)}
        >
          {ALL_CATEGORIES.map((category, i) => (
            <button
              key={category}
              type="button"
              className={`character-intro-button ${wavingIndex === i ? 'is-waving' : ''}`.trim()}
              aria-label={t('introduceCharacterHint')}
              onClick={() => handleIntroduce(category)}
            >
              <CharacterPortrait theme={characterThemes[category]} mood="happy" size={110} phase={i * 0.37} />
            </button>
          ))}
        </div>
      </div>

      {greeting ? (
        <p className="home-greeting">{t(greeting.key)}</p>
      ) : (
        <p className="hint-caption">{t('introduceCharacterHint')}</p>
      )}

      <p className="subtitle">{t('homeSubtitle')}</p>

      <div className="category-grid">
        {HOME_CATEGORY_META.map(({ category, symbol, labelKey }, i) => (
          <button
            key={category}
            type="button"
            className="category-card"
            onClick={() =>
              category === 'englishSpelling'
                ? onOpenEnglishEntry()
                : category === 'hiragana'
                  ? onOpenMojiEntry()
                  : category === 'kanji'
                    ? onOpenKanjiEntry()
                    : onSelectCategory(category)
            }
          >
            <span
              className="category-symbol"
              style={{ background: characterThemes[category].colorMain, color: characterThemes[category].colorMainDark }}
            >
              {symbol}
            </span>
            <CharacterPortrait theme={characterThemes[category]} mood="happy" size={92} phase={i * 0.53} />
            <span className="category-label">
              {t(category === 'englishSpelling' ? 'categoryEnglish' : category === 'hiragana' ? 'categoryMoji' : labelKey)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
