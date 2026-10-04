// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AppErrorBoundary } from '../AppErrorBoundary'

let shouldThrow = true
function Flaky() {
  if (shouldThrow) throw new Error('boom')
  return <p>home screen</p>
}

describe('AppErrorBoundary', () => {
  it('shows a way back home instead of a blank screen, and remounts the app on tap', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<AppErrorBoundary>{(key) => <Flaky key={key} />}</AppErrorBoundary>)
    expect(screen.getByText('ごめんね、うまく ひらけなかったよ。')).toBeTruthy()

    shouldThrow = false
    fireEvent.click(screen.getByText('ホームへ もどる'))
    expect(screen.getByText('home screen')).toBeTruthy()
  })
})
