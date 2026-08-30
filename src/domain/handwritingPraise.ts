import type { Lang } from '../i18n/dictionary'

// Handwriting practice is a no-count free-practice mode (see HandwritingScreen) — there is
// no wrong answer, so this is praise only, never correction. Kept as its own small pool
// (distinct from feedbackMessages.ts's category-scored pools) since it isn't tied to a
// streak or an answer — but it IS spoken in the practicing category's own character voice
// (hiragana's yui, katakana's peko, ...), so the cache is namespaced per category just like
// feedbackMessages.ts's is.
const PRAISE: Record<Lang, string[]> = {
  ja: ['じょうずに かけたね！', 'いいかんじ！', 'その ちょうし！', 'よく がんばったね！'],
  en: ['Great writing!', 'Nice job!', 'Well done!', 'You worked hard!'],
}

export interface HandwritingPraise {
  text: string
  cacheKey?: string
}

export function pickHandwritingPraise(lang: Lang, category: 'hiragana' | 'katakana' | 'alphabet'): HandwritingPraise {
  const idx = Math.floor(Math.random() * PRAISE[lang].length)
  const text = PRAISE[lang][idx]
  const cacheKey = lang === 'ja' ? `handwriting-praise-${category}-${idx}` : undefined
  return { text, cacheKey }
}

/** Source of truth for scripts/generate-tts-cache.mjs — every ja line above, pre-rendered
 * once per category voice (see HANDWRITING_CATEGORIES there). */
export const HANDWRITING_PRAISE_JA = PRAISE.ja
