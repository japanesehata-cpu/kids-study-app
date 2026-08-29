import type { Category } from '../domain/types'
import { getCategoryMeta } from '../domain/categoryMeta'
import { useI18n } from '../i18n/I18nContext'
import { characterThemes } from './characters/characterThemes'

interface CategoryHeaderProps {
  category: Category
}

/** Persistent "you are here" banner — shown on every screen inside a category (level
 * select, quiz, result) so it's never ambiguous which subject is currently active. */
export function CategoryHeader({ category }: CategoryHeaderProps) {
  const { t } = useI18n()
  const theme = characterThemes[category]
  const meta = getCategoryMeta(category)

  return (
    <div
      className="category-header"
      style={{ background: theme.colorMain, boxShadow: `0 4px 0 ${theme.colorMainDark}` }}
    >
      <span className="category-header-symbol" style={{ color: theme.colorMainDark }}>
        {meta.symbol}
      </span>
      <span className="category-header-label">{t(meta.labelKey)}</span>
    </div>
  )
}
