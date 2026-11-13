import { loadErrorLogJson, saveErrorLogJson } from './storage'

/** One error the app ran into, kept on the phone so a parent can read it later on the
 * progress screen (docs/functional-design.md F-12) — a child playing alone can't report
 * what went wrong, and the console isn't reachable on a phone. */
export interface ErrorLogEntry {
  /** ms since epoch */
  at: number
  /** where it was caught: 'render' (AppErrorBoundary), 'window' (an uncaught error),
   * 'promise' (an unhandled rejection) */
  source: string
  message: string
}

export const ERROR_LOG_CAP = 20
const MESSAGE_CAP = 300

export function getErrorLog(): ErrorLogEntry[] {
  const raw = loadErrorLogJson()
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is ErrorLogEntry =>
        typeof e === 'object' && e !== null && typeof e.at === 'number' && typeof e.source === 'string' && typeof e.message === 'string',
    )
  } catch {
    return []
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    const firstFrame = error.stack?.split('\n').find((line) => line.includes('/') && !line.includes(error.message))
    return firstFrame ? `${error.name}: ${error.message} @ ${firstFrame.trim()}` : `${error.name}: ${error.message}`
  }
  try {
    return typeof error === 'string' ? error : JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export function recordError(source: string, error: unknown, now = Date.now()): void {
  const message = describe(error).slice(0, MESSAGE_CAP)
  const log = getErrorLog()
  // The same error repeating (e.g. one per animation frame) would push everything else out.
  const last = log[log.length - 1]
  if (last && last.source === source && last.message === message) return
  saveErrorLogJson(JSON.stringify([...log, { at: now, source, message }].slice(-ERROR_LOG_CAP)))
}

export function clearErrorLog(): void {
  saveErrorLogJson('[]')
}

/** Call once at startup: records errors nothing else caught. */
export function initErrorLog(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('error', (e) => recordError('window', e.error ?? e.message))
  window.addEventListener('unhandledrejection', (e) => recordError('promise', e.reason))
}
