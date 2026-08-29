import { useI18n } from '../i18n/I18nContext'

export function LanguageToggle() {
  const { lang, toggleLang } = useI18n()

  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label="switch language"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 18px',
        borderRadius: 999,
        border: 'none',
        background: 'var(--color-surface)',
        boxShadow: 'var(--shadow-card)',
        fontWeight: 700,
        fontSize: 18,
        color: 'var(--color-text)',
        cursor: 'pointer',
        minHeight: 56,
        // Without this, squeezing the button (a narrow phone's top bar, before it had
        // room to wrap onto its own row) wrapped "日本語" itself into a vertical stack
        // of single characters instead of just shrinking or moving to a new line.
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <span style={{ opacity: lang === 'ja' ? 1 : 0.35 }}>🇯🇵 日本語</span>
      <span style={{ opacity: 0.5 }}>/</span>
      <span style={{ opacity: lang === 'en' ? 1 : 0.35 }}>🇺🇸 English</span>
    </button>
  )
}
