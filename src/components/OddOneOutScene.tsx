import type { CSSProperties } from 'react'
import type { LogicQuestion } from '../domain/types'
import { getWordById } from '../domain/wordBank'
import { oddOneOutAnswerSpeech } from '../domain/answerSpeech'
import { useI18n } from '../i18n/I18nContext'
import { wordCategoryLabelKey, wordSubgroupLabelKey } from '../domain/wordGroupLabels'
import { speak, type VoiceProfile } from '../lib/tts'
import { WordIcon } from './WordIcon'
import { Hanamaru } from './CorrectCelebration'

interface OddOneOutSceneProps {
  question: LogicQuestion
  selected: string | number | null
  onSelect: (choice: string) => void
  voiceProfile: VoiceProfile
}

/** なかまはずれ (logic ★1/★2): the 4 pictures as なかまカード in a 2×2 grid, as large as the
 * card's remaining space allows — a small picture is hard to recognize, so size comes first
 * (docs/functional-design.md 3.4). Sticker-style cards that pop in one after another; once
 * answered, the 3 that belong together hop, the odd one gets a はなまる (or wobbles if the
 * child missed it), and every card shows its name and group. Tapping a card after answering
 * reads its name aloud — before answering, a tap is the answer. */
export function OddOneOutScene({ question, selected, onSelect, voiceProfile }: OddOneOutSceneProps) {
  const { t, lang } = useI18n()
  const answered = selected !== null
  const entries = question.choices.map((id) => getWordById(id))
  // ★2 picks all four from one category, so the badge names the finer group instead.
  const fine = new Set(entries.map((e) => e.category)).size === 1

  function speakName(id: string) {
    const entry = getWordById(id)
    if (lang === 'ja') {
      const part = oddOneOutAnswerSpeech(id, entry.translationJa)
      void speak(part.text, 'ja-JP', voiceProfile, part.cacheKey)
    } else {
      void speak(entry.word, 'en-US', voiceProfile, `word-en-${id}`)
    }
  }

  return (
    <div className={`nakama-grid ${answered ? 'is-answered' : ''}`.trim()}>
      {entries.map((entry, i) => {
        const isOdd = entry.id === question.answer
        const state = !answered
          ? ''
          : isOdd
            ? selected === question.answer
              ? 'is-odd is-hit'
              : 'is-odd is-missed'
            : entry.id === selected
              ? 'is-mate is-wrong-pick'
              : 'is-mate'
        const groupKey = fine && entry.subgroup ? wordSubgroupLabelKey[entry.subgroup] : wordCategoryLabelKey[entry.category]
        return (
          <button
            key={entry.id}
            type="button"
            className={`nakama-card ${state}`.trim()}
            style={{ '--i': i } as CSSProperties}
            onClick={() => (answered ? speakName(entry.id) : onSelect(entry.id))}
            aria-label={lang === 'ja' ? entry.translationJa : entry.word}
          >
            <span className="nakama-card-photo">
              <WordIcon wordId={entry.id} size="100%" />
            </span>
            {answered && (
              <span className="nakama-card-caption">
                <span className="nakama-card-name">{lang === 'ja' ? entry.translationJa : entry.word}</span>
                <span className="nakama-card-badge">{t(groupKey)}</span>
              </span>
            )}
            {answered && isOdd && selected === question.answer && (
              <span className="nakama-card-stamp" aria-hidden="true">
                <Hanamaru />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
