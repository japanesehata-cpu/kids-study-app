import { useI18n } from '../i18n/I18nContext'
import { CategoryHeader } from '../components/CategoryHeader'
import { ScreenTopBar } from '../components/ScreenTopBar'
import { CharacterPortrait } from '../components/characters/CharacterPortrait'
import { characterThemes } from '../components/characters/characterThemes'

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
      <ScreenTopBar onBack={onBack} onHome={onHome}>
        <CategoryHeader category={script} />
      </ScreenTopBar>

      <div className="screen-body">
        <CharacterPortrait theme={characterThemes[script]} mood="happy" size={150} className="character-portrait--hero" />

        <p className="subtitle">{t('modeEntryTitle')}</p>

        <div className="level-grid mode-grid">
          <button type="button" className="level-button mode-card" onClick={() => onSelect('practice')}>
            <span className="mode-card-label">{t('mojiModePracticeLabel')}</span>
            <span className="mode-card-description">{t('mojiModePracticeDescription')}</span>
          </button>
          <button type="button" className="level-button mode-card" onClick={() => onSelect('trace')}>
            <span className="mode-card-label">{t('handwritingLevel1Label')}</span>
            <span className="mode-card-description">{t('handwritingLevel1Description')}</span>
          </button>
          <button type="button" className="level-button mode-card" onClick={() => onSelect('listen')}>
            <span className="mode-card-label">{t('handwritingLevel2Label')}</span>
            <span className="mode-card-description">{t('handwritingLevel2Description')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
