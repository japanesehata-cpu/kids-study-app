import { afterEach, describe, expect, it, vi } from 'vitest'

class FakeContext {
  static instances: FakeContext[] = []
  state: string = 'suspended'
  resumeCalls = 0
  constructor() {
    FakeContext.instances.push(this)
  }
  resume() {
    this.resumeCalls++
    return Promise.resolve()
  }
}

async function loadSfx(initialState: string) {
  vi.resetModules()
  FakeContext.instances = []
  class Ctx extends FakeContext {
    state = initialState
  }
  vi.stubGlobal('window', { AudioContext: Ctx })
  return import('../sfx')
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('getContext', () => {
  it('resumes a context iOS left "interrupted", not only a "suspended" one', async () => {
    const { getContext } = await loadSfx('interrupted')
    getContext()
    expect(FakeContext.instances[0].resumeCalls).toBe(1)
  })

  it('leaves a running context alone', async () => {
    const { getContext } = await loadSfx('running')
    getContext()
    expect(FakeContext.instances[0].resumeCalls).toBe(0)
  })

  it('replaces a closed context with a new one', async () => {
    const { getContext } = await loadSfx('running')
    const first = getContext()!
    ;(first as unknown as FakeContext).state = 'closed'
    const second = getContext()
    expect(second).not.toBe(first)
    expect(FakeContext.instances).toHaveLength(2)
  })
})

describe('getRunningContext', () => {
  it('gives up (null) when the context does not start within the timeout', async () => {
    const { getRunningContext } = await loadSfx('suspended')
    const ctx = FakeContext.instances
    vi.useFakeTimers()
    const pending = getRunningContext(400)
    // resume() never actually starts it — the state stays 'suspended'
    ctx[0].resume = () => new Promise(() => {})
    await vi.advanceTimersByTimeAsync(400)
    expect(await pending).toBeNull()
  })

  it('returns the context once a resume got it running', async () => {
    const { getContext, getRunningContext } = await loadSfx('suspended')
    const ctx = getContext() as unknown as FakeContext
    ctx.resume = () => {
      ctx.state = 'running'
      return Promise.resolve()
    }
    expect(await getRunningContext()).toBe(ctx)
  })
})
