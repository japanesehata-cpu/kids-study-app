import { useEffect } from 'react'
import { speak, type SpeechLang, type VoiceProfile } from '../lib/tts'
import { WordIcon } from './WordIcon'
import { TtsButton } from './TtsButton'

export interface TraceSpeech {
  text: string
  lang: SpeechLang
  cacheKey?: string
}

interface TraceRevealProps {
  /** What was just traced — a kanji, a kana, or a whole English word. */
  glyph: string
  /** Picture of what it means, shown right beside the glyph. Omitted when none fits. */
  imageId?: string
  /** The meaning / example word under the glyph (あめ, あり, いぬ = dog); hidden when empty
   * (を and ん have no example word of their own). */
  label: string
  /** Optional example sentence using it. */
  sentence?: string
  /** Read aloud in order as soon as this step appears; the replay button repeats the last. */
  speech: TraceSpeech[]
  voiceProfile: VoiceProfile
  nextLabel: string
  onNext: () => void
}

/** The step shown right after a character or word is traced, shared by かんじ・ひらがな・
 * カタカナ・えいたんご so they all read the same way: the traced glyph ＝ a picture of
 * what it means, the meaning word, an example sentence, all read aloud automatically —
 * linking the shape to the real thing in one glance instead of a praise line followed, much
 * later, by a separate review lap. */
export function TraceReveal({ glyph, imageId, label, sentence, speech, voiceProfile, nextLabel, onNext }: TraceRevealProps) {
  useEffect(() => {
    let cancelled = false
    speech
      .reduce(
        (chain, s) => chain.then(() => (cancelled ? undefined : speak(s.text, s.lang, voiceProfile, s.cacheKey).catch(() => {}))),
        Promise.resolve() as Promise<void | undefined>,
      )
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // Spoken once per step (the parent remounts this per traced item via `key`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const replay = speech[speech.length - 1]
  const isWord = [...glyph].length > 1

  return (
    <div className="handwriting-praise">
      <div className="kanji-meaning-link">
        <span
          className={`kanji-meaning-char${isWord ? ' kanji-meaning-char--word' : ''}`}
          // A whole word shrinks with its length so even "watermelon" stays on one row beside
          // its picture on a 375px-wide phone instead of wrapping the picture below it.
          style={isWord ? { fontSize: `min(clamp(30px, 6.5vh, 56px), ${(85 / [...glyph].length).toFixed(1)}vw)` } : undefined}
        >
          {glyph}
        </span>
        {imageId && (
          <>
            <span className="kanji-meaning-equals" aria-hidden="true">
              ＝
            </span>
            <WordIcon wordId={imageId} size="clamp(72px, 15vh, 130px)" />
          </>
        )}
      </div>
      {label && <p className="handwriting-praise-text">{label}</p>}
      {sentence && <p className="kanji-review-sentence">{sentence}</p>}
      {replay && (
        <TtsButton text={replay.text} lang={replay.lang} label="listen" voiceProfile={voiceProfile} cacheKey={replay.cacheKey} />
      )}
      <button type="button" className="primary-button next-button" onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  )
}
