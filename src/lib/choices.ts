import { shuffle } from './shuffle'

/** `step` scales both the candidate deltas and the fallback filler — pass 10 for a
 * round-tens question (e.g. correct=60 draws distractors like 50/70/80, the same "which
 * tens place" mistake a child could plausibly make) so a ±1/±2 default step doesn't try to
 * fit distractors within `min`/`max` that a scaled-up correct value has long since made too
 * narrow to work at all (see the ArithmeticQuestionView choices computation in
 * QuizScreen.tsx for why ★4's tens branch needs this). */
export function generateNumericChoices(correct: number, min = 0, max = 20, step = 1): number[] {
  const choices = new Set<number>([correct])
  let guard = 0
  while (choices.size < 4 && guard < 100) {
    guard++
    const delta = (Math.floor(Math.random() * 5) - 2) * step
    const candidate = correct + delta
    if (candidate < min || candidate > max || candidate === correct) continue
    choices.add(candidate)
  }
  // extremely rare fallback if the range was too tight to find 3 distractors
  let filler = min
  while (choices.size < 4 && filler <= max) {
    choices.add(filler)
    filler += step
  }
  return shuffle([...choices])
}
