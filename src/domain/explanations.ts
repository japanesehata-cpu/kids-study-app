import type { Lang } from '../i18n/dictionary'
import type { Question } from './types'
import { getWordById, type WordEntry } from './wordBank'
import { getHiraganaById } from './hiraganaBank'
import { getKatakanaById } from './katakanaBank'
import { formatClockKey } from './questionGenerators/clock'

const CATEGORY_LABEL: Record<WordEntry['category'], Record<Lang, string>> = {
  animal: { ja: 'どうぶつ', en: 'animals' },
  food: { ja: 'たべもの', en: 'food' },
  nature: { ja: 'しぜんの もの', en: 'nature things' },
  color: { ja: 'いろ', en: 'colors' },
  vehicle: { ja: 'のりもの', en: 'vehicles' },
  clothing: { ja: 'ふくや もちもの', en: 'things you wear' },
  household: { ja: 'いえの なかの もの', en: 'household things' },
  school: { ja: 'がっこうの どうぐ', en: 'school things' },
  weather: { ja: 'おてんき', en: 'weather' },
  bodyPart: { ja: 'からだの ぶぶん', en: 'body parts' },
  toy: { ja: 'おもちゃ', en: 'toys' },
  sport: { ja: 'スポーツ', en: 'sports' },
  instrument: { ja: 'がっき', en: 'instruments' },
  shape: { ja: 'かたち', en: 'shapes' },
  place: { ja: 'ばしょ', en: 'places' },
}

function wordLabel(id: string, lang: Lang): string {
  const entry = getWordById(id)
  return lang === 'ja' ? entry.translationJa : entry.word
}

/** One sentence explaining *why* the correct answer is correct — shown after every
 * question regardless of whether the player got it right, so a wrong answer is followed
 * by the same reasoning that shows what's actually true, not a guess at what specifically
 * confused them. `correct` only matters for spotDifference, whose "explanation" is really a
 * wrap-up of how the round went rather than a fixed fact — every other category's answer
 * (a sum, a clock time, ...) is the same regardless of outcome, so they ignore it. */
export function buildExplanation(question: Question, lang: Lang, correct = true): string {
  switch (question.category) {
    case 'addition': {
      const { operandA, operandB, answer } = question
      return lang === 'ja'
        ? `${operandA}と${operandB}を あわせると ${answer}に なるよ。`
        : `${operandA} plus ${operandB} equals ${answer}.`
    }
    case 'subtraction': {
      const { operandA, operandB, answer } = question
      return lang === 'ja'
        ? `${operandA}から ${operandB}を ひくと ${answer}が のこるよ。`
        : `${operandA} minus ${operandB} leaves ${answer}.`
    }
    case 'englishSpelling':
    case 'englishListening': {
      const { word, translationJa } = question
      return lang === 'ja'
        ? `"${word}"は 「${translationJa}」という いみの ことばだよ。`
        : `"${word}" is the English word for this picture.`
    }
    case 'logic': {
      if (question.kind === 'oddOneOut') {
        const answerEntry = getWordById(question.answer)
        const otherCategory = question.choices
          .filter((id) => id !== question.answer)
          .map((id) => getWordById(id).category)[0]
        const mainLabel = otherCategory ? CATEGORY_LABEL[otherCategory][lang] : ''
        const answerLabel = lang === 'ja' ? answerEntry.translationJa : answerEntry.word
        return lang === 'ja'
          ? `ほかは みんな${mainLabel}だけど、${answerLabel}だけ ちがう なかまだよ。`
          : `The others are all ${mainLabel}, but ${answerLabel} is a different kind of thing.`
      }
      if (question.kind === 'pattern') {
        const seq = question.sequence ?? []
        // The cycle is however many distinct symbols appear — each cycle repeats the same
        // symbols in the same order, so this recovers the true length (2 up to 5) instead
        // of assuming it's always 2 or 3.
        const cycleLen = new Set(seq).size
        const cycleText = seq.slice(0, cycleLen).join('')
        return lang === 'ja'
          ? `${cycleText}の くりかえしだから、つぎは ${question.answer}だよ。`
          : `The pattern repeats ${cycleText}, so next comes ${question.answer}.`
      }
      // compare
      const numsText = question.choices.join(', ')
      return question.compareGoal === 'max'
        ? lang === 'ja'
          ? `${numsText}の なかで、${question.answer}が いちばん おおきい かずだよ。`
          : `Among ${numsText}, ${question.answer} is the biggest number.`
        : lang === 'ja'
          ? `${numsText}の なかで、${question.answer}が いちばん ちいさい かずだよ。`
          : `Among ${numsText}, ${question.answer} is the smallest number.`
    }
    case 'hiragana': {
      const { char, charId } = question
      const { mnemonic } = getHiraganaById(charId)
      if (!mnemonic) {
        return lang === 'ja' ? `「${char}」の おとを よく きいてね。` : `Listen carefully to how "${char}" sounds.`
      }
      return lang === 'ja'
        ? `「${char}」は 「${mnemonic}」の 「${char}」だよ。`
        : `"${char}" is the character you hear at the start of "${mnemonic}."`
    }
    case 'katakana': {
      const { char, charId } = question
      const { mnemonic } = getKatakanaById(charId)
      if (!mnemonic) {
        return lang === 'ja' ? `「${char}」の おとを よく きいてね。` : `Listen carefully to how "${char}" sounds.`
      }
      return lang === 'ja'
        ? `「${char}」は 「${mnemonic}」の 「${char}」だよ。`
        : `"${char}" is the character you hear at the start of "${mnemonic}."`
    }
    case 'alphabet': {
      if (question.kind === 'caseMatch') {
        const { promptChar, answerChar } = question
        return lang === 'ja'
          ? `「${promptChar}」と「${answerChar}」は おなじ もじだよ。`
          : `"${promptChar}" and "${answerChar}" are the same letter.`
      }
      return lang === 'ja'
        ? `いまの おとは 「${question.answerChar}」だよ。`
        : `That was the letter "${question.answerChar}."`
    }
    case 'clock': {
      const { hour, minute } = question
      const label = formatClockKey(`${hour}:${minute}`, lang)
      const minuteHandNumber = minute === 0 ? 12 : minute / 5
      return lang === 'ja'
        ? `みじかい はりが${hour}、ながい はりが${minuteHandNumber}を さしているから、${label}だよ。`
        : `The short hand points to ${hour} and the long hand points to ${minuteHandNumber}, so it's ${label}.`
    }
    case 'spotDifference': {
      const count = question.differenceIndexes.length
      if (!correct) {
        return lang === 'ja'
          ? `ちがうところは ぜんぶで ${count}こ あったよ。またチャレンジしてね！`
          : `There were ${count} differences in total. Give it another try!`
      }
      return lang === 'ja'
        ? `ちがうところが ぜんぶで ${count}こ あったね。よく みつけられたよ！`
        : `There were ${count} differences in total — great spotting!`
    }
    case 'counting': {
      const label = wordLabel(question.targetWordId, lang)
      return lang === 'ja'
        ? `${label}は ぜんぶで ${question.count}こ あったよ。`
        : `${label} appeared ${question.count} times in total.`
    }
    case 'englishSentence': {
      // The question is spoken audio-only (no caption while answering, by design — see
      // the plan for this feature), so the explanation is also where the child first sees
      // the English sentence written out, not just hears it.
      const answerEntry = getWordById(question.correctWordId)
      return lang === 'ja'
        ? `"${question.question}" こたえは 「${answerEntry.translationJa}」だよ。`
        : `"${question.question}" The answer is ${answerEntry.word}.`
    }
  }
}
