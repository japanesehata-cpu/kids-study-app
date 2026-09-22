const PROGRESS_KEY = 'manabi-friends:progress:v1'
const LANG_KEY = 'manabi-friends:lang:v1'

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
