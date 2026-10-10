const PROGRESS_KEY = 'manabi-friends:progress:v1'
const LANG_KEY = 'manabi-friends:lang:v1'
// Keys the app no longer reads (the Home "last quiz" bubble was removed) — deleted on start
// so the phone keeps only the data docs/functional-design.md lists.
const RETIRED_KEYS = ['manabi-friends:homeFeedback:v1']

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeRaw(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // storage unavailable (private browsing, quota) - just won't persist
  }
}

export function loadProgressJson(): string | null {
  return readRaw(PROGRESS_KEY)
}

export function saveProgressJson(json: string): void {
  writeRaw(PROGRESS_KEY, json)
}

export function loadLang(): string | null {
  return readRaw(LANG_KEY)
}

export function saveLang(lang: string): void {
  writeRaw(LANG_KEY, lang)
}

export function clearRetiredData(): void {
  for (const key of RETIRED_KEYS) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // storage unavailable — nothing to clean up
    }
  }
}

const BGM_KEY = 'manabi-friends:bgm:v1'

/** null when never set — the caller decides the default (on). */
export function loadBgmEnabled(): boolean | null {
  const raw = readRaw(BGM_KEY)
  return raw === null ? null : raw === '1'
}

export function saveBgmEnabled(enabled: boolean): void {
  writeRaw(BGM_KEY, enabled ? '1' : '0')
}
