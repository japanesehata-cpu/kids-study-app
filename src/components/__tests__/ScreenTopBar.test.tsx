// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CONFIRM_WINDOW_MS, ScreenTopBar } from '../ScreenTopBar'
import { I18nProvider } from '../../i18n/I18nContext'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function setup(confirmLeave: boolean) {
  const onBack = vi.fn()
  const onHome = vi.fn()
  render(
    <I18nProvider>
      <ScreenTopBar onBack={onBack} onHome={onHome} confirmLeave={confirmLeave} />
    </I18nProvider>,
  )
  const [back, home] = screen.getAllByRole('button')
  return { onBack, onHome, back, home }
}

describe('ScreenTopBar', () => {
  it('acts on the first tap when no confirmation is needed', () => {
    const { onBack, back } = setup(false)
    fireEvent.click(back)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('needs a second tap on the same button during a quiz', () => {
    const { onHome, home } = setup(true)
    fireEvent.click(home)
    expect(onHome).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toBeTruthy()
    fireEvent.click(home)
    expect(onHome).toHaveBeenCalledTimes(1)
  })

  it('does not count a tap on the other button as the confirmation', () => {
    const { onBack, onHome, back, home } = setup(true)
    fireEvent.click(back)
    fireEvent.click(home)
    expect(onBack).not.toHaveBeenCalled()
    expect(onHome).not.toHaveBeenCalled()
  })

  it('forgets the first tap after the confirmation window', () => {
    vi.useFakeTimers()
    const { onBack, back } = setup(true)
    fireEvent.click(back)
    act(() => {
      vi.advanceTimersByTime(CONFIRM_WINDOW_MS + 10)
    })
    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.click(back)
    expect(onBack).not.toHaveBeenCalled()
  })
})
