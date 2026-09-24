import { useI18n } from '../i18n/I18nContext'
import { CategoryHeader } from '../components/CategoryHeader'

type MojiScript = 'hiragana' | 'katakana' | 'alphabet'

interface MojiModeEntryScreenProps {
  script: MojiScript
  onSelect: (mode: 'practice' | 'trace' | 'listen') => void
  onBack: () => void
  onHome: () => void
}

/** Reached after MojiEntryScreen's script picker (ひらがな/カタカナ/アルファベット) —
 * offers that script's 3 practice modes as one flat chooser: れんしゅう (the scored ★1-5
 * quiz, via LevelSelectScreen), なぞる (stroke-order trace — KanaTraceScreen/
 * AlphabetTraceScreen directly, no further chooser), きいてかく (listen & write, the
 * level-2-only HandwritingScreen).
 *
 * Previously なぞる/きいてかく were reached via a "かく れんしゅう" button bolted onto
 * LevelSelectScreen, which then opened HandwritingScreen's OWN internal なぞる/きいてかく
 * chooser — two extra, inconsistently-shaped steps compared to how every other multi-mode
 * subject (かんじ, えいご) already worked. This screen collapses both of those into the
 * same one flat step かんじ/えいご already use, so もじ's own depth now matches its
 * siblings exactly: script picker, then mode picker, then the activity itself. */
export function MojiModeEntryScreen({ script, onSelect, onBack, onHome }: MojiModeEntryScreenProps) {
  const { t } = useI18n()

  return (
    <div className="screen">
      <div className="top-bar">
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="icon-button" onClick={onBack} aria-label={t('backButton')}>
            ←
          </button>
          <button type="button" className="icon-button" onClick={onHome} aria-label={t('backHomeButton')}>
            🏠
          </button>
        </div>
        <CategoryHeader category={script} />
      </div>

      <p className="subtitle">{t('modeEntryTitle')}</p>

      <div className="level-grid">
        <button type="button" className="level-button" onClick={() => onSelect('practice')}>
          <span className="level-number">{t('mojiModePracticeLabel')}</span>
          <span className="hint-caption">{t('mojiModePracticeDescription')}</span>
        </button>
        <button type="button" className="level-button" onClick={() => onSelect('trace')}>
          <span className="level-number">{t('handwritingLevel1Label')}</span>
          <span className="hint-caption">{t('handwritingLevel1Description')}</span>
        </button>
        <button type="button" className="level-button" onClick={() => onSelect('listen')}>
          <span className="level-number">{t('handwritingLevel2Label')}</span>
          <span className="hint-caption">{t('handwritingLevel2Description')}</span>
        </button>
      </div>
    </div>
  )
}
