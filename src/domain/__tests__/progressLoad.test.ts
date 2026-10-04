// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialProgress, loadProgress } from '../progress'
import { generateKanjiQuestion } from '../questionGenerators/kanji'

const KEY = 'manabi-friends:progress:v1'

// Node's own experimental global localStorage shadows jsdom's (and is undefined without a
// backing file), so give the window a plain in-memory one.
beforeEach(() => {
  const data = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    },
  })
})

describe('loadProgress', () => {
  it('drops saved review questions whose content no longer exists (they used to crash the app)', () => {
    const saved = createInitialProgress()
    const valid = generateKanjiQuestion(1, 1)
    saved.kanji.reviewQueue = [
      valid,
      { ...valid, id: 'gone', charId: 'k999', choiceIds: ['k999', 'k1', 'k2', 'k3'] },
    ]
    window.localStorage.setItem(KEY, JSON.stringify(saved))
    expect(loadProgress().kanji.reviewQueue.map((q) => q.id)).toEqual([valid.id])
  })

  it('falls back to fresh progress for unreadable data', () => {
    window.localStorage.setItem(KEY, 'garbage{')
    expect(loadProgress()).toEqual(createInitialProgress())
  })
})
