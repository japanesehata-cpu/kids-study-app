interface StoryObject {
  ja: string
  en: string
}

function plural(word: string, count: number): string {
  return count === 1 ? word : `${word}s`
}

/** Addition and subtraction both always use apples for their story text, matching the
 * apple visual shown alongside every question in those categories — the words and the
 * picture should never disagree. */
const APPLE: StoryObject = { ja: 'りんご', en: 'apple' }

export function buildAdditionStory(a: number, b: number): { ja: string; en: string } {
  return {
    ja: `${APPLE.ja}が ${a}こ ありました。${b}こ もらいました。ぜんぶで なんこ？`,
    en: `There were ${a} ${plural(APPLE.en, a)}. You got ${b} more. How many are there now?`,
  }
}

export function buildSubtractionStory(a: number, b: number): { ja: string; en: string } {
  return {
    ja: `${APPLE.ja}が ${a}こ ありました。${b}こ たべました。のこりは なんこ？`,
    en: `There were ${a} ${plural(APPLE.en, a)}. You ate ${b} of them. How many are left?`,
  }
}
