import type { Category } from '../domain/types'
import { getCategoryMeta } from '../domain/categoryMeta'
import type { DictionaryKey } from '../i18n/dictionary'
import { useI18n } from '../i18n/I18nContext'
import { characterThemes } from './characters/characterThemes'

interface CategoryHeaderProps {
  category: Category
  /** Overrides the category's own label — for the umbrella screens that sit above several
   * categories (えいご, もじ) or a practice mode that isn't the category's quiz (たんご なぞる),
   * which keep that category's colors and symbol but must not claim its quiz name. */
  labelKey?: DictionaryKey
}

/** Persistent "you are here" tag — shown on every screen inside a category (level
 * select, quiz, result) so it's never ambiguous which subject is currently active. Flat, with
 * no pressed-button shadow: it isn't tappable, and a raised pill read as a button. */
export function CategoryHeader({ category, labelKey }: CategoryHeaderProps) {
  const { t } = useI18n()
  const theme = characterThemes[category]
  const meta = getCategoryMeta(category)

  return (
    <div className="category-header" style={{ background: theme.colorMain }}>
      <span className="category-header-symbol" style={{ color: theme.colorMainDark }}>
        {meta.symbol}
      </span>
      <span className="category-header-label">{t(labelKey ?? meta.labelKey)}</span>
    </div>
  )
}
