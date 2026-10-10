import { Component, type ReactNode } from 'react'
import { useI18n } from '../i18n/I18nContext'

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
    return <ErrorFallback onHome={() => this.setState((s) => ({ failed: false, resetKey: s.resetKey + 1 }))} />
  }
}

// A function component so the message can use useI18n (a class component can't call hooks).
// AppErrorBoundary sits inside I18nProvider, so the context is always there.
function ErrorFallback({ onHome }: { onHome: () => void }) {
  const { t } = useI18n()
  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <p className="subtitle">{t('errorBoundaryMessage')}</p>
      <button type="button" className="primary-button" onClick={onHome}>
        {t('errorBoundaryHome')}
      </button>
    </div>
  )
}
