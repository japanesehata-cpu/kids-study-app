#!/usr/bin/env node
/**
 * Dev check: asks a locally running VOICEVOX engine how it would READ each kanji's spoken
 * text, so wrong readings are caught before they're baked into public/audio/ (a TTS engine
 * picks one reading for a kanji from context — 金の can come out as かねの).
 *
 *   - hint: the phrase must contain the taught reading
 *   - char alone: if TTS reads the bare character as exactly the taught reading, it's a
 *     candidate for kanjiBank.ts's SPEAK_AS_CHAR (kana alone loses pitch accent: あめ → 飴)
 *   - exampleSentenceJa: printed with its reading for review
 *
 * Usage: node scripts/check-kanji-speech.mjs [--sentences]
 * Requires VOICEVOX on 127.0.0.1:50021.
 */
import { kanjiBank } from '../src/domain/kanjiBank.ts'

const URL_BASE = 'http://127.0.0.1:50021'

async function kanaOf(text) {
  const res = await fetch(`${URL_BASE}/audio_query?speaker=1&text=${encodeURIComponent(text)}`, { method: 'POST' })
  if (!res.ok) throw new Error(`VOICEVOX ${res.status} for ${text}`)
  return (await res.json()).kana
}

const VOWEL = {}
for (const [v, row] of Object.entries({ a: 'あかさたなはまやらわがざだばぱぁゃ', i: 'いきしちにひみりぎじぢびぴぃ', u: 'うくすつぬふむゆるぐずづぶぷぅゅ', e: 'えけせてねへめれげぜでべぺぇ', o: 'おこそとのほもよろをごぞどぼぽぉょ' })) {
  for (const c of row) VOWEL[c] = v
}
const VOWEL_KANA = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' }

/** Hiragana, no accent marks, and long vowels in one canonical spelling (おう/おお/おー →
 * おお, えい/ええ/えー → ええ) so a dictionary reading and TTS output compare equal. */
function normalize(kana) {
  const h = kana.replace(/['_/、?。\s]/g, '').replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
  let out = ''
  for (const c of h) {
    const prev = VOWEL[out[out.length - 1]]
    if (c === 'ー' && prev) out += VOWEL_KANA[prev]
    else if (c === 'う' && prev === 'o') out += 'お'
    else if (c === 'い' && prev === 'e') out += 'え'
    else out += c
  }
  return out
}

const showSentences = process.argv.includes('--sentences')
const speakAsChar = []
const problems = []

for (const k of kanjiBank) {
  const reading = normalize(k.reading)
  const hint = normalize(await kanaOf(k.hint))
  if (!hint.includes(reading)) problems.push(`${k.char} (${k.reading}) hint「${k.hint}」→ ${hint}`)
  const alone = normalize(await kanaOf(k.char))
  if (alone === reading) speakAsChar.push(k.char)
  else {
    const asKana = normalize(await kanaOf(k.reading))
    if (asKana !== reading) problems.push(`${k.char} (${k.reading}) spoken as kana → ${asKana}; as char → ${alone}`)
  }
  if (showSentences && k.exampleSentenceJa) {
    console.log(`${k.char}: ${k.exampleSentenceJa} → ${normalize(await kanaOf(k.exampleSentenceJa))}`)
  }
}

console.log(`\nSPEAK_AS_CHAR candidates (${speakAsChar.length}): ${speakAsChar.join('')}`)
console.log(`\nhint problems (${problems.length}):\n${problems.join('\n')}`)
