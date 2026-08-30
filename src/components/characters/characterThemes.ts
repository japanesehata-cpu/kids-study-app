import type { Category } from '../../domain/types'
import type { VoiceProfile } from '../../lib/tts'

export interface CharacterTheme {
  id: string
  colorMain: string
  colorMainDark: string
  colorSub: string
  colorAccent: string
  colorAccentDark: string
  /** Gives each character its own vocal identity — a genuinely distinct VOICEVOX voice
   * when that engine is running, falling back to a pitch-shifted single voice otherwise. */
  voiceProfile: VoiceProfile
}

/** One themed mascot per learning category. The portrait art itself lives at
 * public/images/characters/<id>.png (see scripts/generate-character-portraits.mjs). */
export const characterThemes: Record<Category, CharacterTheme> = {
  addition: {
    id: 'momo',
    colorMain: '#ff9bc0',
    colorMainDark: '#e0688f',
    colorSub: '#fff5f8',
    colorAccent: '#ffd166',
    colorAccentDark: '#e0a83a',
    // bright, bouncy, a little quick — energetic bunny
    voiceProfile: {
      pitch: 1.35,
      rate: 1.05,
      playbackRate: 1.2,
      voicevoxSpeaker: { name: '四国めたん', style: 'ノーマル' },
      kokoroVoice: 'af_bella',
    },
  },
  subtraction: {
    id: 'sora',
    colorMain: '#7fb8f5',
    colorMainDark: '#4f8ad0',
    colorSub: '#f0f7ff',
    colorAccent: '#e8eefc',
    colorAccentDark: '#b8c8e0',
    // lower, calmer, unhurried — gentle cat
    voiceProfile: {
      pitch: 0.88,
      rate: 0.88,
      playbackRate: 0.82,
      voicevoxSpeaker: { name: '東北きりたん', style: 'ノーマル' },
      kokoroVoice: 'af_sky',
    },
  },
  // englishSpelling and englishListening are two separate entry points into the same skill
  // (see questionGenerators/englishWords.ts) — same character, same art, same voice for
  // both, just two different level-select cards with independent progress.
  englishSpelling: {
    id: 'hana',
    colorMain: '#ffd166',
    colorMainDark: '#e0a83a',
    colorSub: '#fffaf0',
    colorAccent: '#ffb08f',
    colorAccentDark: '#e07a4f',
    // high and sparkly — whimsical little fairy
    voiceProfile: {
      pitch: 1.6,
      rate: 1.0,
      playbackRate: 1.32,
      voicevoxSpeaker: { name: '雨晴はう', style: 'ノーマル' },
      // hana is literally the englishWords mascot, so give her the exact voice already
      // used for word-en-*.wav pronunciation instead of a different one.
      kokoroVoice: 'af_heart',
    },
  },
  englishListening: {
    id: 'hana',
    colorMain: '#ffd166',
    colorMainDark: '#e0a83a',
    colorSub: '#fffaf0',
    colorAccent: '#ffb08f',
    colorAccentDark: '#e07a4f',
    // high and sparkly — whimsical little fairy
    voiceProfile: {
      pitch: 1.6,
      rate: 1.0,
      playbackRate: 1.32,
      voicevoxSpeaker: { name: '雨晴はう', style: 'ノーマル' },
      // hana is literally the englishWords mascot, so give her the exact voice already
      // used for word-en-*.wav pronunciation instead of a different one.
      kokoroVoice: 'af_heart',
    },
  },
  logic: {
    id: 'koko',
    colorMain: '#7fd9c4',
    colorMainDark: '#4fb894',
    colorSub: '#f2fffb',
    colorAccent: '#c9b8f5',
    colorAccentDark: '#9880d0',
    // even, unhurried, thoughtful — a little owl taking its time to think
    voiceProfile: {
      pitch: 1.0,
      rate: 0.9,
      playbackRate: 0.92,
      voicevoxSpeaker: { name: '冥鳴ひまり', style: 'ノーマル' },
      kokoroVoice: 'af_nicole',
    },
  },
  hiragana: {
    id: 'yui',
    colorMain: '#c9a4e8',
    colorMainDark: '#9a72c0',
    colorSub: '#faf5ff',
    colorAccent: '#ff8f7a',
    colorAccentDark: '#e0604a',
    // warm and encouraging, slightly slower — a patient calligraphy-brush spirit
    voiceProfile: {
      pitch: 1.15,
      rate: 0.92,
      playbackRate: 1.06,
      voicevoxSpeaker: { name: '春日部つむぎ', style: 'ノーマル' },
      kokoroVoice: 'bf_emma',
    },
  },
  katakana: {
    id: 'peko',
    colorMain: '#2ec4b6',
    colorMainDark: '#1f948a',
    colorSub: '#eafffb',
    colorAccent: '#ff9f4a',
    colorAccentDark: '#d97a2a',
    // bright and chatty — a parrot who repeats any sound it hears, fitting for a script
    // that's all about capturing foreign words
    voiceProfile: {
      pitch: 1.3,
      rate: 1.1,
      playbackRate: 1.15,
      // 'ノーマル' (normal), not '元気' (energetic) — the energetic style's exaggerated
      // pitch/pacing came at the cost of clear articulation, confirmed by ear against the
      // normal style using the same speaker (see the katakana voice comparison this was
      // decided from); every other character here uses its speaker's clear/normal style
      // too, aru's うきうき being the one deliberate exception.
      voicevoxSpeaker: { name: '満別花丸', style: 'ノーマル' },
      kokoroVoice: 'af_jessica',
    },
  },
  alphabet: {
    id: 'aru',
    colorMain: '#f4a259',
    colorMainDark: '#d1793a',
    colorSub: '#fff6ec',
    colorAccent: '#6ec6ff',
    colorAccentDark: '#3f9bd9',
    // playful and a little goofy — an alpaca who loves ABC blocks (its Japanese-language
    // lines are spoken in this VOICEVOX voice; the letters themselves are always spoken
    // in English via Kokoro, see src/lib/tts.ts's local-voice-server tier)
    voiceProfile: {
      pitch: 1.2,
      rate: 1.0,
      playbackRate: 1.05,
      voicevoxSpeaker: { name: '猫使アル', style: 'うきうき' },
      kokoroVoice: 'am_puck',
    },
  },
  clock: {
    id: 'toki',
    colorMain: '#e0a458',
    colorMainDark: '#b8823a',
    colorSub: '#fff8ec',
    colorAccent: '#3f9c94',
    colorAccentDark: '#2d786f',
    // steady and unhurried — a punctual little clock-keeper who never rushes
    voiceProfile: {
      pitch: 0.8,
      rate: 0.9,
      playbackRate: 0.88,
      voicevoxSpeaker: { name: '琴詠ニア', style: 'ノーマル' },
      kokoroVoice: 'bm_george',
    },
  },
  spotDifference: {
    id: 'mitsu',
    colorMain: '#4fc3a1',
    colorMainDark: '#359c7f',
    colorSub: '#eefdf8',
    colorAccent: '#e0729a',
    colorAccentDark: '#c0517a',
    // quick and curious — a keen-eyed little detective
    voiceProfile: {
      pitch: 1.45,
      rate: 1.08,
      playbackRate: 1.26,
      voicevoxSpeaker: { name: 'ずんだもん', style: 'ノーマル' },
      kokoroVoice: 'af_kore',
    },
  },
  counting: {
    id: 'kazu',
    colorMain: '#ff8659',
    colorMainDark: '#e0603a',
    colorSub: '#fff3ec',
    colorAccent: '#ffe066',
    colorAccentDark: '#e0c23f',
    // friendly and steady — loves counting anything and everything
    voiceProfile: {
      pitch: 1.05,
      rate: 1.0,
      playbackRate: 1.0,
      voicevoxSpeaker: { name: 'もち子さん', style: 'ノーマル' },
      kokoroVoice: 'am_michael',
    },
  },
}
