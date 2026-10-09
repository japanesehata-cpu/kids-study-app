import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { playStarSfx } from '../lib/sfx'
import type { AnswerRecord } from '../domain/types'
import type { CharacterTheme } from './characters/characterThemes'

/** The quiz's 「1 / 5 もん」 as a row of stars: each answered question lights up (a pink ★
 * that pops in for a correct answer, a soft grey one for a miss), and the current one
 * pulses gently. The text stays as the accessible label. */
export function QuizProgressStars({
  total,
  index,
  answers,
  label,
}: {
  total: number
  index: number
  answers: AnswerRecord[]
  label: string
}) {
  return (
    <div className="quiz-progress-stars" role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => {
        const answer = answers[i]
        const state = answer ? (answer.correct ? 'is-correct' : 'is-missed') : i === index ? 'is-current' : ''
        return (
          <span key={i} className={`quiz-progress-star ${state}`.trim()}>
            ★
          </span>
        )
      })}
    </div>
  )
}

/** Between questions the category's mascot pops up from the bottom corner for a moment
 * ("つぎ いくよ！") and ducks back down — under a second, never covers a button for long,
 * and ignores taps. Mount with a new `key` per question. */
export function PeekingMascot({ theme }: { theme: CharacterTheme }) {
  return (
    <img
      className="peeking-mascot"
      src={`${import.meta.env.BASE_URL}images/characters/${theme.id}.png`}
      alt=""
      aria-hidden="true"
    />
  )
}

/** The result screen's score as stars landing one by one — each correct answer's ★ drops
 * in with a rising "ピコン", the misses stay as faint outlines. About 0.12s per star, and
 * nothing waits for it (the buttons below work immediately). */
export function ResultStars({ correct, total }: { correct: number; total: number }) {
  const reduceMotion = useReducedMotion()
  const [landed, setLanded] = useState(reduceMotion ? correct : 0)
  useEffect(() => {
    if (reduceMotion || correct === 0) return
    let n = 0
    let timer: ReturnType<typeof setTimeout>
    const next = () => {
      n += 1
      setLanded(n)
      playStarSfx(n)
      if (n < correct) timer = setTimeout(next, 130)
    }
    timer = setTimeout(next, 450)
    return () => clearTimeout(timer)
  }, [correct, reduceMotion])

  return (
    <div className="result-stars" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`result-star ${i < landed ? 'is-landed' : ''}`.trim()}>
          ★
        </span>
      ))}
    </div>
  )
}
