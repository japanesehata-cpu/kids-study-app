import { Component, type ReactNode } from 'react'

interface Props {
  children: (resetKey: number) => ReactNode
}

interface State {
  failed: boolean
  resetKey: number
}

/** Last line of defense: a render error anywhere used to unmount the whole tree, leaving a
 * child staring at a blank screen with no way out but reloading. Instead show a friendly
 * message and a button that remounts the app fresh at Home (`resetKey` changes, so every
 * screen's state starts over). */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, resetKey: 0 }

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('AppErrorBoundary caught', error)
  }

  render() {
    if (!this.state.failed) return this.props.children(this.state.resetKey)
    return (
      <div className="screen" style={{ justifyContent: 'center' }}>
        <p className="subtitle">ごめんね、うまく ひらけなかったよ。</p>
        <button
          type="button"
          className="primary-button"
          onClick={() => this.setState((s) => ({ failed: false, resetKey: s.resetKey + 1 }))}
        >
          ホームへ もどる
        </button>
      </div>
    )
  }
}
