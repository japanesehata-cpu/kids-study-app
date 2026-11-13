import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearErrorLog, ERROR_LOG_CAP, getErrorLog, recordError } from '../errorLog'

// An in-memory stand-in: Node's own (file-less) global localStorage shadows jsdom's.
const store = new Map<string, string>()
beforeEach(() => {
  store.clear()
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('error log', () => {
  it('keeps where and what went wrong', () => {
    recordError('render', new TypeError('x is undefined'), 1000)
    const [entry] = getErrorLog()
    expect(entry.at).toBe(1000)
    expect(entry.source).toBe('render')
    expect(entry.message).toContain('TypeError: x is undefined')
  })

  it(`keeps only the newest ${ERROR_LOG_CAP}`, () => {
    for (let i = 0; i < ERROR_LOG_CAP + 5; i++) recordError('window', `e${i}`, i)
    const log = getErrorLog()
    expect(log).toHaveLength(ERROR_LOG_CAP)
    expect(log[0].message).toBe('e5')
    expect(log.at(-1)!.message).toBe(`e${ERROR_LOG_CAP + 4}`)
  })

  it('does not fill up with the same error repeating', () => {
    recordError('window', 'same', 1)
    recordError('window', 'same', 2)
    expect(getErrorLog()).toHaveLength(1)
  })

  it('survives broken saved data and can be cleared', () => {
    store.set('manabi-friends:errors:v1', '{not json')
    expect(getErrorLog()).toEqual([])
    recordError('promise', 'boom')
    clearErrorLog()
    expect(getErrorLog()).toEqual([])
  })
})
