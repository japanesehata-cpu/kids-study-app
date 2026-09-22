import type { Category, Level } from './types'
import { loadHomeFeedbackJson, saveHomeFeedbackJson } from '../lib/storage'

/** Compact summary of the most recently completed quiz set, persisted so HomeScreen can
 * greet the player with something concrete next time it mounts — the replacement for the
 * removed daily play-streak badge (see git history: "Remove the daily play-streak feature").
 * Deliberately does NOT carry weakSubSkill: unlike ResultScreen's own strong/weak callout
 * (which lands right after the quiz it's about, where "let's practice more" reads as
 * in-context coaching), Home is the screen every session opens on, so it only ever
 * surfaces positive signals — see pickHomeFeedbackMessage below. */
export interface LastQuizFeedback {
  category: Category
  leveledUp: boolean
  newLevel: Level
  strongSubSkill: string | null
  correctCount: number
  total: number
}

export function loadLastQuizFeedback(): LastQuizFeedback | null {
  const raw = loadHomeFeedbackJson()
  if (!raw) return null
  try {
    return JSON.parse(raw) as LastQuizFeedback
  } catch {
    return null
  }
}

export function saveLastQuizFeedback(feedback: LastQuizFeedback): void {
  saveHomeFeedbackJson(JSON.stringify(feedback))
}

export type HomeFeedbackMessage =
  | { kind: 'levelUp'; category: Category; level: Level }
  | { kind: 'strong'; category: Category; subSkill: string }
  | { kind: 'perfectScore'; category: Category; total: number }
  | { kind: 'generic' }

/** Picks the single most encouraging thing to say, in priority order: a level-up (rare,
 * most exciting) beats a subSkill the player is strong at, which beats a perfect score,
 * which falls back to a generic warm greeting (also the first-ever-open case, before any
 * quiz has been played). Every branch here is positive by construction — see the
 * LastQuizFeedback comment for why weakSubSkill never reaches this function at all. */
export function pickHomeFeedbackMessage(feedback: LastQuizFeedback | null): HomeFeedbackMessage {
  if (!feedback) return { kind: 'generic' }
  if (feedback.leveledUp) return { kind: 'levelUp', category: feedback.category, level: feedback.newLevel }
  if (feedback.strongSubSkill) {
    return { kind: 'strong', category: feedback.category, subSkill: feedback.strongSubSkill }
  }
  if (feedback.total > 0 && feedback.correctCount === feedback.total) {
    return { kind: 'perfectScore', category: feedback.category, total: feedback.total }
  }
  return { kind: 'generic' }
}
