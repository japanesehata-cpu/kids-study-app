import { describe, expect, it } from 'vitest'
import { buildFeedbackMessage, enumerateFeedbackCacheEntries } from '../feedbackMessages'

describe('buildFeedbackMessage', () => {
  it('correct answers: speech is a single fully cache-keyed segment (ja) matching the display text', () => {
    for (let i = 0; i < 30; i++) {
      const result = buildFeedbackMessage(
        { correct: true, streak: 1, justBrokeStreak: 0, correctAnswerLabel: '9', category: 'addition' },
        'ja',
      )
      expect(result.speech).toHaveLength(1)
      expect(result.speech[0].text).toBe(result.text)
      expect(result.speech[0].cacheKey).toMatch(/^feedback-addition-correct-normal-\d$/)
    }
  })

  it('correct streak-3/5 answers: cache key encodes the exact streak value', () => {
    const streak3 = buildFeedbackMessage(
      { correct: true, streak: 4, justBrokeStreak: 0, correctAnswerLabel: '9', category: 'addition' },
      'ja',
    )
    expect(streak3.speech[0].cacheKey).toMatch(/^feedback-addition-correct-streak3-4-\d$/)

    const streak5 = buildFeedbackMessage(
      { correct: true, streak: 8, justBrokeStreak: 0, correctAnswerLabel: '9', category: 'addition' },
      'ja',
    )
    expect(streak5.speech[0].cacheKey).toMatch(/^feedback-addition-correct-streak5-8-\d$/)
  })

  it('cache key is namespaced per category, since feedback is spoken in the current category voice', () => {
    const addition = buildFeedbackMessage(
      { correct: true, streak: 1, justBrokeStreak: 0, correctAnswerLabel: '9', category: 'addition' },
      'ja',
    )
    const hiragana = buildFeedbackMessage(
      { correct: true, streak: 1, justBrokeStreak: 0, correctAnswerLabel: '9', category: 'hiragana' },
      'ja',
    )
    expect(addition.speech[0].cacheKey).toContain('feedback-addition-')
    expect(hiragana.speech[0].cacheKey).toContain('feedback-hiragana-')
  })

  it('incorrect answers: speech splits into cacheable prefix/suffix around an uncached, unbounded answer segment', () => {
    for (let i = 0; i < 30; i++) {
      const result = buildFeedbackMessage(
        { correct: false, streak: 0, justBrokeStreak: 0, correctAnswerLabel: '17', category: 'addition' },
        'ja',
      )
      // the answer itself is never cache-keyed — it's effectively unbounded
      const answerSegment = result.speech.find((s) => s.text === '17')
      expect(answerSegment).toBeDefined()
      expect(answerSegment!.cacheKey).toBeUndefined()

      // every other segment (prefix/suffix) is cache-keyed
      for (const seg of result.speech) {
        if (seg === answerSegment) continue
        expect(seg.cacheKey).toMatch(/^feedback-addition-incorrect-normal-\d-(before|after)$/)
      }

      // concatenating every segment's text loses no content compared to the single-string
      // display text (segments are spoken back-to-back, so exact whitespace doesn't matter —
      // only that nothing was dropped or duplicated by the prefix/suffix split)
      const rejoined = result.speech.map((s) => s.text).join('')
      const normalize = (s: string) => s.replace(/[！。.!\s]/g, '')
      expect(normalize(rejoined)).toBe(normalize(result.text))
    }
  })

  it('never speaks the bare answer as its own segment when the chosen template never mentions it', () => {
    // one after-streak variant is pure encouragement with no {answer} placeholder at all —
    // the spoken segments must not invent an answer utterance that isn't in the display text
    for (let i = 0; i < 50; i++) {
      const result = buildFeedbackMessage(
        { correct: false, streak: 0, justBrokeStreak: 6, correctAnswerLabel: '12', category: 'addition' },
        'ja',
      )
      const hasBareAnswerSegment = result.speech.some((s) => s.text === '12')
      expect(hasBareAnswerSegment).toBe(result.text.includes('12'))
    }
  })

  it('incorrect answers after a broken streak: cache key encodes the exact justBrokeStreak value', () => {
    const result = buildFeedbackMessage(
      { correct: false, streak: 0, justBrokeStreak: 6, correctAnswerLabel: '12', category: 'addition' },
      'ja',
    )
    for (const seg of result.speech) {
      if (seg.text === '12') continue
      expect(seg.cacheKey).toMatch(/^feedback-addition-incorrect-afterstreak-6-\d-(before|after)$/)
    }
  })

  it('englishSpelling/englishListening/alphabet wrong answers: the bare answer segment is forced to en-US, not the surrounding ja-JP sentence', () => {
    // the answer for these categories is English content ("egg", "A") embedded inside an
    // otherwise Japanese feedback sentence — speaking it with the sentence's ja-JP setting
    // read as a garbled mix of two voices next to the correctly-pronounced en-US repeat the
    // app also plays, which is exactly the "old and new TTS mixed together" symptom this fixes
    for (const category of ['englishSpelling', 'englishListening', 'alphabet'] as const) {
      for (let i = 0; i < 10; i++) {
        const result = buildFeedbackMessage(
          { correct: false, streak: 0, justBrokeStreak: 0, correctAnswerLabel: 'egg', category },
          'ja',
        )
        const answerSegment = result.speech.find((s) => s.text === 'egg')
        expect(answerSegment).toBeDefined()
        expect(answerSegment!.speechLang).toBe('en-US')
        // every other segment keeps the sentence's own ja-JP (i.e. no override)
        for (const seg of result.speech) {
          if (seg === answerSegment) continue
          expect(seg.speechLang).toBeUndefined()
        }
      }
    }
  })

  it('non-english-content wrong answers never override speechLang on the answer segment', () => {
    for (let i = 0; i < 30; i++) {
      const result = buildFeedbackMessage(
        { correct: false, streak: 0, justBrokeStreak: 0, correctAnswerLabel: '12', category: 'addition' },
        'ja',
      )
      for (const seg of result.speech) {
        expect(seg.speechLang).toBeUndefined()
      }
    }
  })

  it('never sets a cacheKey in English (the cache is Japanese-only)', () => {
    for (let i = 0; i < 20; i++) {
      const correct = buildFeedbackMessage(
        { correct: true, streak: 6, justBrokeStreak: 0, correctAnswerLabel: '9', category: 'addition' },
        'en',
      )
      for (const seg of correct.speech) expect(seg.cacheKey).toBeUndefined()

      const incorrect = buildFeedbackMessage(
        { correct: false, streak: 0, justBrokeStreak: 4, correctAnswerLabel: '9', category: 'addition' },
        'en',
      )
      for (const seg of incorrect.speech) expect(seg.cacheKey).toBeUndefined()
    }
  })
})

describe('enumerateFeedbackCacheEntries', () => {
  it('every cache key buildFeedbackMessage can actually produce appears in the enumeration', () => {
    const entryKeys = new Set(enumerateFeedbackCacheEntries('addition').map((e) => e.cacheKey))

    for (let i = 0; i < 300; i++) {
      const correct = Math.random() < 0.5
      const streak = correct ? 1 + Math.floor(Math.random() * 10) : 0
      const justBrokeStreak = !correct && Math.random() < 0.5 ? 3 + Math.floor(Math.random() * 6) : 0
      const result = buildFeedbackMessage(
        { correct, streak, justBrokeStreak, correctAnswerLabel: '7', category: 'addition' },
        'ja',
      )
      for (const seg of result.speech) {
        if (seg.cacheKey === undefined) continue
        expect(entryKeys.has(seg.cacheKey)).toBe(true)
      }
    }
  })

  it('produces no duplicate cache keys within one category', () => {
    const keys = enumerateFeedbackCacheEntries('addition').map((e) => e.cacheKey)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
