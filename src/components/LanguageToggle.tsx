import { useI18n } from '../i18n/I18nContext'

/* Flags only (the active one in full colour), so it fits on one row with Home's 🎵 and ⚙️
 * buttons even on a narrow phone. */
export function LanguageToggle() {
  const { lang, toggleLang } = useI18n()

  return (
    <button
      type="button"
      className="language-toggle"
      onClick={toggleLang}
      aria-label={lang === 'ja' ? 'English に きりかえる' : '日本語に切り替える'}
    >
      <span className={lang === 'ja' ? 'is-active' : ''}>🇯🇵</span>
      <span className="language-toggle-slash">/</span>
      <span className={lang === 'en' ? 'is-active' : ''}>🇺🇸</span>
    </button>
  )
}
