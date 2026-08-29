import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { dictionary, type DictionaryKey, type Lang } from './dictionary'
import { loadLang, saveLang } from '../lib/storage'

interface I18nContextValue {
  lang: Lang
  toggleLang: () => void
  t: (key: DictionaryKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match,
  )
}

function readInitialLang(): Lang {
  const stored = loadLang()
  return stored === 'en' ? 'en' : 'ja'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readInitialLang)

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      toggleLang: () =>
        setLang((prev) => {
          const next = prev === 'ja' ? 'en' : 'ja'
          saveLang(next)
          return next
        }),
      t: (key, vars) => interpolate(dictionary[key][lang], vars),
    }),
    [lang],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
