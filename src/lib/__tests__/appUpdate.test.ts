import { beforeEach, describe, expect, it, vi } from 'vitest'
import { markUpdateReady, resetAppUpdateForTest, setAtSafePoint } from '../appUpdate'

const reload = vi.fn()
beforeEach(() => {
  reload.mockReset()
  resetAppUpdateForTest(reload)
})

describe('app update timing', () => {
  it('reloads right away when the update lands while on Home', () => {
    markUpdateReady()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('waits during a quiz and reloads only once back on Home', () => {
    setAtSafePoint(false) // in a quiz
    markUpdateReady()
    expect(reload).not.toHaveBeenCalled()
    setAtSafePoint(false) // still playing (result screen)
    expect(reload).not.toHaveBeenCalled()
    setAtSafePoint(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads at most once', () => {
    markUpdateReady()
    markUpdateReady()
    setAtSafePoint(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does nothing on Home when no update is waiting', () => {
    setAtSafePoint(true)
    expect(reload).not.toHaveBeenCalled()
  })
})
