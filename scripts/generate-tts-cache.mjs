// One-off dev script: pre-renders every fixed Japanese phrase the app can say — character
// self-introductions, hiragana readings, every category's non-varying prompt sentence,
// every addition/subtraction equation in both its plain and word-problem phrasing
// (operands 1-9 for addition, 1-18/1-10 for subtraction), and every per-answer feedback
// line ("せいかい！すごい！" and friends, in each category's own voice) —
// through a locally-running VOICEVOX engine, and saves them as static WAV files under
// public/audio/. The app plays these directly when present (see src/lib/tts.ts's
// `cacheKey` param) instead of calling VOICEVOX live — which matters once the app is
// hosted somewhere shared (e.g. GitHub Pages), since VOICEVOX only ever answers on
// localhost: a visitor's browser can never reach it, so anything not in this cache falls
// back to the browser's generic Web Speech voice instead. The feedback lines are the
// single biggest source of that fallback in practice, since one is spoken after every
// answer — far more often than the once-per-question prompts. The word-problem phrasing
// looks unbounded (it reads like a randomized sentence) but is actually one fixed template
// per category with just the two operands interpolated — exactly as bounded as the plain
// equation text, so it's covered too. Only genuinely per-question content (spot-the-
// difference/logic-pattern board contents, and the bare spoken answer inside an incorrect-
// feedback line) is deliberately left out of this cache — it's either unbounded or not
// worth enumerating.
//
// Content is imported straight from the app's own source (dictionary.ts, characterThemes.ts,
// hiraganaBank.ts, feedbackMessages.ts) rather than duplicated here, so the cache can never
// drift out of sync with what the app actually speaks.
//
// Usage:
//   node scripts/generate-tts-cache.mjs
//   node scripts/generate-tts-cache.mjs --only=intro-momo,hiragana-a,equation-addition-3-5
//
// Requires a running local VOICEVOX engine (https://voicevox.hiroshiba.jp/), default
// port 50021 — download it, launch it, and leave it running while this script executes.

import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { dictionary } from '../src/i18n/dictionary.ts'
import { characterThemes } from '../src/components/characters/characterThemes.ts'
import { CATEGORY_META } from '../src/domain/categoryMeta.ts'
import { counterBank } from '../src/domain/counterBank.ts'
import { hiraganaBank, hiraganaSpeechPhrase } from '../src/domain/hiraganaBank.ts'
import { katakanaBank, katakanaSpeechPhrase } from '../src/domain/katakanaBank.ts'
import { kanjiBank, kanjiSpeechPhrase } from '../src/domain/kanjiBank.ts'
import { enumerateFeedbackCacheEntries } from '../src/domain/feedbackMessages.ts'
import { HANDWRITING_PRAISE_JA } from '../src/domain/handwritingPraise.ts'
import { buildAdditionStory, buildSubtractionStory } from '../src/domain/questionGenerators/wordProblems.ts'

const VOICEVOX_URL = 'http://127.0.0.1:50021'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'audio')

// Gap between synthesis calls so VOICEVOX's inference load — and the fan — has a chance
// to drop between phrases instead of running the whole batch at sustained peak. Purely a
// thermal courtesy (same reasoning as the old Krea2 image pipeline's cooldown) — doesn't
// touch output quality, just paces how fast the 54 requests land.
const COOLDOWN_MS = Number(process.env.TTS_CACHE_COOLDOWN_MS ?? 6_000)

function cooldown() {
  if (COOLDOWN_MS <= 0) return Promise.resolve()
  return new Promise((r) => setTimeout(r, COOLDOWN_MS))
}

const args = process.argv.slice(2)
const onlyArg = args.find((a) => a.startsWith('--only='))
const onlyKeys = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',')) : null

async function checkVoicevoxRunning() {
  try {
    const res = await fetch(`${VOICEVOX_URL}/version`, { signal: AbortSignal.timeout(1500) })
    return res.ok
  } catch {
    return false
  }
}

let stylesCache = null
async function fetchStyles() {
  if (!stylesCache) {
    const res = await fetch(`${VOICEVOX_URL}/speakers`)
    const speakers = await res.json()
    stylesCache = speakers.flatMap((speaker) =>
      speaker.styles.map((style) => ({ id: style.id, speakerName: speaker.name, styleName: style.name })),
    )
  }
  return stylesCache
}

/** Same named speaker+style resolution as src/lib/voicevox.ts's resolveVoicevoxSpeakerId,
 * so a cached file matches what live synthesis would pick. */
async function resolveSpeakerId(speakerName, styleName) {
  const styles = await fetchStyles()
  const style = styles.find((s) => s.speakerName === speakerName && s.styleName === styleName)
  if (!style) throw new Error(`VOICEVOX voice not installed: ${speakerName} (${styleName})`)
  return { id: style.id, name: `${style.speakerName} (${style.styleName})` }
}

// Keep in sync with the matching constant in src/lib/voicevox.ts (that browser module can't
// be imported from this Node script directly).
const VOICEVOX_SPEED_SCALE = 1.15

async function synthesize(text, speakerId) {
  const queryRes = await fetch(
    `${VOICEVOX_URL}/audio_query?speaker=${speakerId}&text=${encodeURIComponent(text)}`,
    { method: 'POST' },
  )
  if (!queryRes.ok) throw new Error(`audio_query failed: ${queryRes.status} ${await queryRes.text()}`)
  const query = await queryRes.json()
  query.speedScale = VOICEVOX_SPEED_SCALE

  const synthRes = await fetch(`${VOICEVOX_URL}/synthesis?speaker=${speakerId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  })
  if (!synthRes.ok) throw new Error(`synthesis failed: ${synthRes.status}`)
  return Buffer.from(await synthRes.arrayBuffer())
}

function buildJobs() {
  const jobs = []

  // 8 character self-introductions, in Japanese.
  const introKeyByCategory = {
    addition: 'introMomo',
    subtraction: 'introSora',
    englishSpelling: 'introHana',
    englishListening: 'introHana',
    logic: 'introKoko',
    hiragana: 'introYui',
    katakana: 'introPeko',
    kanji: 'introYui',
    alphabet: 'introAru',
    clock: 'introToki',
    spotDifference: 'introMitsu',
    counting: 'introKazu',
    englishSentence: 'introHana',
    sudoku: 'introKoko',
    missingOperandAddition: 'introMomo',
    missingOperandSubtraction: 'introSora',
  }
  for (const { category } of CATEGORY_META) {
    const text = dictionary[introKeyByCategory[category]].ja
    const { name: speakerName, style: styleName } = characterThemes[category].voiceProfile.voicevoxSpeaker
    jobs.push({ cacheKey: `intro-${category}`, text, speakerName, styleName })
  }

  // Every hiragana reading phrase (46 base + 25 dakuten/handakuten), all in yui's
  // (the hiragana category's) voice.
  const { name: hiraganaSpeakerName, style: hiraganaStyleName } = characterThemes.hiragana.voiceProfile.voicevoxSpeaker
  for (const entry of hiraganaBank) {
    jobs.push({
      cacheKey: `hiragana-${entry.id}`,
      text: hiraganaSpeechPhrase(entry),
      speakerName: hiraganaSpeakerName,
      styleName: hiraganaStyleName,
    })
  }

  // Every katakana reading phrase (46 base + 25 dakuten/handakuten), all in peko's
  // (the katakana category's) voice.
  const { name: katakanaSpeakerName, style: katakanaStyleName } = characterThemes.katakana.voiceProfile.voicevoxSpeaker
  for (const entry of katakanaBank) {
    jobs.push({
      cacheKey: `katakana-${entry.id}`,
      text: katakanaSpeechPhrase(entry),
      speakerName: katakanaSpeakerName,
      styleName: katakanaStyleName,
    })
  }

  // Every grade-1 kanji reading phrase (80 total), in kanji's own voice (currently reused
  // from yui/hiragana — see characterThemes.ts's comment on why).
  const { name: kanjiSpeakerName, style: kanjiStyleName } = characterThemes.kanji.voiceProfile.voicevoxSpeaker
  for (const entry of kanjiBank) {
    jobs.push({
      cacheKey: `kanji-${entry.id}`,
      text: kanjiSpeechPhrase(entry),
      speakerName: kanjiSpeakerName,
      styleName: kanjiStyleName,
    })
  }

  // Handwriting practice's praise lines (see HandwritingScreen.tsx) — no-count free
  // practice, so this is the only feedback that mode ever speaks. Spoken in whichever
  // category's own voice is currently practicing (see handwritingPraise.ts's
  // handwriting-praise-${category}-${idx} cache key), so it's generated once per
  // category that actually offers handwriting practice, not just hiragana's.
  const HANDWRITING_CATEGORIES = ['hiragana', 'katakana']
  for (const category of HANDWRITING_CATEGORIES) {
    const { name: speakerName, style: styleName } = characterThemes[category].voiceProfile.voicevoxSpeaker
    for (const [idx, text] of HANDWRITING_PRAISE_JA.entries()) {
      jobs.push({ cacheKey: `handwriting-praise-${category}-${idx}`, text, speakerName, styleName })
    }
  }

  // Every prompt sentence that DOESN'T vary per-question (only the equation/board content
  // does) — these are the bulk of what a real visitor hears once VOICEVOX/Piper aren't
  // reachable (they're both localhost-only, so a deployed site can never reach them; only
  // this static cache works cross-device). Keep the key in sync with computeAutoSpeech in
  // src/screens/QuizScreen.tsx.
  const speakerFor = (category) => characterThemes[category].voiceProfile.voicevoxSpeaker
  const fixedPrompts = [
    { cacheKey: 'prompt-logic-pattern', dictKey: 'logicPatternPrompt', category: 'logic' },
    { cacheKey: 'prompt-logic-oddoneout', dictKey: 'logicOddOneOutPrompt', category: 'logic' },
    { cacheKey: 'prompt-logic-compare-max', dictKey: 'logicCompareMaxPrompt', category: 'logic' },
    { cacheKey: 'prompt-logic-compare-min', dictKey: 'logicCompareMinPrompt', category: 'logic' },
    { cacheKey: 'prompt-clock', dictKey: 'clockPrompt', category: 'clock' },
    { cacheKey: 'prompt-spotdifference', dictKey: 'spotDifferencePrompt', category: 'spotDifference' },
    { cacheKey: 'prompt-sudoku', dictKey: 'sudokuPrompt', category: 'sudoku' },
    { cacheKey: 'prompt-addition-missing', dictKey: 'missingOperandPrompt', category: 'addition' },
    { cacheKey: 'prompt-subtraction-missing', dictKey: 'missingOperandPrompt', category: 'subtraction' },
    { cacheKey: 'prompt-english-look', dictKey: 'lookPrompt', category: 'englishSpelling' },
  ]
  for (const { cacheKey, dictKey, category } of fixedPrompts) {
    const { name: speakerName, style: styleName } = speakerFor(category)
    jobs.push({ cacheKey, text: dictionary[dictKey].ja, speakerName, styleName })
  }

  // 助数詞 redesign — each counterBank entry carries its own full hand-authored sentence
  // (not a shared dictKey template, since the item name differs per entry), so it's
  // enumerated straight from the bank itself rather than through fixedPrompts above.
  const { name: countingSpeakerName, style: countingStyleName } = speakerFor('counting')
  for (const counter of counterBank) {
    jobs.push({
      cacheKey: `prompt-counting-${counter.id}`,
      text: counter.promptJa,
      speakerName: countingSpeakerName,
      styleName: countingStyleName,
    })
  }

  // Every addition equation the generator can actually say, in both its plain and
  // word-problem phrasing. SUM_BAND in questionGenerators/addition.ts clamps BOTH operands
  // to 1-9 at every level (it picks a sum, then splits it so neither side exceeds 9), so a
  // plain 9x9 cross product covers it completely (see equationSpeech in QuizScreen.tsx).
  // buildAdditionStory's word-problem phrasing uses the exact same (a, b) — it's not a
  // separate random draw, just an alternate reading of the same question — so the same
  // cross product covers that too, under a separate `story-` prefix (the spoken text
  // differs from the plain equation, so it needs its own cache entry).
  const { name: additionSpeakerName, style: additionStyleName } = speakerFor('addition')
  for (let a = 1; a <= 9; a++) {
    for (let b = 1; b <= 9; b++) {
      jobs.push({
        cacheKey: `equation-addition-${a}-${b}`,
        text: `${a} たす ${b} は？`,
        speakerName: additionSpeakerName,
        styleName: additionStyleName,
      })
      jobs.push({
        cacheKey: `story-addition-${a}-${b}`,
        text: buildAdditionStory(a, b).ja,
        speakerName: additionSpeakerName,
        styleName: additionStyleName,
      })
    }
  }

  // ★4's round-tens branch (20+30-style, see generateTensOperands in
  // questionGenerators/addition.ts) uses operands the 1-9 cross product above never
  // produces (10, 20, ... 90) — never has a story variant (★4 is deliberately abstract, no
  // word-problem framing), so only the plain equation needs covering here. Full 9x9 grid
  // of tens (10-90 × 10-90) for the same reason the single-digit loop above is a full 9x9
  // grid: simpler to cover every combination than to reverse-engineer exactly which ones
  // the sum-then-split algorithm can actually produce.
  for (let ta = 1; ta <= 9; ta++) {
    for (let tb = 1; tb <= 9; tb++) {
      const a = ta * 10
      const b = tb * 10
      jobs.push({
        cacheKey: `equation-addition-${a}-${b}`,
        text: `${a} たす ${b} は？`,
        speakerName: additionSpeakerName,
        styleName: additionStyleName,
      })
    }
  }

  // ★6's "teens crossing into the 20s" branch (generateTwentiesOperands in
  // questionGenerators/addition.ts) — a=14-19, b=1-9, never has a story variant (deliberately
  // abstract, same as ★4/★5).
  for (let a = 14; a <= 19; a++) {
    for (let b = 1; b <= 9; b++) {
      jobs.push({
        cacheKey: `equation-addition-${a}-${b}`,
        text: `${a} たす ${b} は？`,
        speakerName: additionSpeakerName,
        styleName: additionStyleName,
      })
    }
  }

  // Every subtraction equation the generator can actually say. Unlike addition, the
  // minuend (a) is NOT clamped to a single digit — MINUEND_BAND in
  // questionGenerators/subtraction.ts goes up to 18 at ★4 (the highest level the level
  // picker actually offers), so a 1-9 cross product silently missed every single ★3+
  // subtraction question, forcing all of them through live/Web Speech synthesis. Cover the
  // full range the generator can produce instead — a up to 18, b up to 17 (pickSubtrahend's
  // mustBorrow branch can return up to a-1, so a=18 can pair with b as high as 17).
  const { name: subtractionSpeakerName, style: subtractionStyleName } = speakerFor('subtraction')
  for (let a = 1; a <= 18; a++) {
    for (let b = 1; b <= 17; b++) {
      jobs.push({
        cacheKey: `equation-subtraction-${a}-${b}`,
        text: `${a} ひく ${b} は？`,
        speakerName: subtractionSpeakerName,
        styleName: subtractionStyleName,
      })
    }
  }
  // Story phrasing is only ever used at ★3 (word-problem framing, a:11-13 — ★4 is
  // deliberately abstract, no story), so this stays scoped to that narrower range rather
  // than the ★4-driven equation loop above, to avoid generating hundreds of story lines
  // that ★3's actual a/b combinations can never produce.
  for (let a = 1; a <= 13; a++) {
    for (let b = 1; b <= 12; b++) {
      jobs.push({
        cacheKey: `story-subtraction-${a}-${b}`,
        text: buildSubtractionStory(a, b).ja,
        speakerName: subtractionSpeakerName,
        styleName: subtractionStyleName,
      })
    }
  }
  // ★4's round-tens branch (50-20-style, see generateTensOperands in
  // questionGenerators/subtraction.ts) — never has a story variant, same reasoning as
  // addition's tens loop above. Unlike addition's tens loop, this skips tb >= ta: a
  // subtrahend can never equal or exceed the minuend (the generator always keeps the
  // result positive), so those combinations can never actually be asked.
  for (let ta = 1; ta <= 9; ta++) {
    for (let tb = 1; tb <= 9; tb++) {
      if (tb >= ta) continue
      const a = ta * 10
      const b = tb * 10
      jobs.push({
        cacheKey: `equation-subtraction-${a}-${b}`,
        text: `${a} ひく ${b} は？`,
        speakerName: subtractionSpeakerName,
        styleName: subtractionStyleName,
      })
    }
  }

  // ★6's "20s minus a single digit, answer in the teens" branch
  // (generateTwentiesOperands in questionGenerators/subtraction.ts) — picks the answer
  // (10-19) and subtrahend (1-9) first, so iterating those two directly (rather than
  // minuend × subtrahend) naturally only ever produces pairs the generator can actually
  // make, instead of needing to filter out invalid combinations. Skips minuends the
  // ★1-4 loop above already covers (a ≤ 18) to avoid a duplicate cacheKey/synthesis call.
  for (let answer = 10; answer <= 19; answer++) {
    for (let b = 1; b <= 9; b++) {
      const a = answer + b
      if (a <= 18) continue
      jobs.push({
        cacheKey: `equation-subtraction-${a}-${b}`,
        text: `${a} ひく ${b} は？`,
        speakerName: subtractionSpeakerName,
        styleName: subtractionStyleName,
      })
    }
  }

  // Every per-answer feedback line ("せいかい！すごい！" and friends) that
  // buildFeedbackMessage can produce, in every category's own voice — this is spoken after
  // literally every answer, far more often than the once-per-question prompt above, so
  // leaving it uncached is what actually made a deployed visitor hear a robotic voice mixed
  // in with the character voice on almost every turn. See enumerateFeedbackCacheEntries in
  // feedbackMessages.ts for the source of truth this is generated from — never hand-edit
  // these entries here, since a mismatch would silently produce the wrong file's audio.
  for (const { category } of CATEGORY_META) {
    const { name: speakerName, style: styleName } = speakerFor(category)
    for (const { cacheKey, text } of enumerateFeedbackCacheEntries(category)) {
      jobs.push({ cacheKey, text, speakerName, styleName })
    }
  }

  // Every result-screen announcement piece ("よくがんばったね！" and friends, see
  // ResultScreen.tsx) — this was never cached at all (always a single live-synthesized
  // sentence), which combined with a since-fixed race condition (a stale leftover segment
  // from the previous question's feedback chain could cancel it after this screen mounted)
  // made it look completely silent on a deployed visit rather than just uncached/robotic.
  // Bounded by the set-size picker (5 or 10 questions, so score and best-streak both have a
  // small fixed range of possible values) — fully enumerable per category's voice, same as
  // the per-answer feedback above. Keep this in sync with ResultScreen.tsx's own cache-key
  // construction by hand, since (unlike feedback) these strings live in dictionary.ts, not
  // a Node-importable domain module.
  const interpolate = (template, vars) =>
    template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match))
  for (const { category } of CATEGORY_META) {
    const { name: speakerName, style: styleName } = speakerFor(category)
    const prefix = `result-${category}`
    jobs.push({
      cacheKey: `${prefix}-title`,
      text: dictionary.resultTitle.ja,
      speakerName,
      styleName,
    })
    for (const total of [5, 10]) {
      for (let correct = 0; correct <= total; correct++) {
        jobs.push({
          cacheKey: `${prefix}-score-${total}-${correct}`,
          text: interpolate(dictionary.resultScoreSpeech.ja, { total, correct }),
          speakerName,
          styleName,
        })
      }
    }
    jobs.push({ cacheKey: `${prefix}-levelup`, text: dictionary.resultLevelUp.ja, speakerName, styleName })
    for (let streak = 3; streak <= 10; streak++) {
      jobs.push({
        cacheKey: `${prefix}-beststreak-${streak}`,
        text: interpolate(dictionary.resultBestStreak.ja, { streak }),
        speakerName,
        styleName,
      })
    }
  }

  return onlyKeys ? jobs.filter((j) => onlyKeys.has(j.cacheKey)) : jobs
}

async function main() {
  if (!(await checkVoicevoxRunning())) {
    console.error(
      `VOICEVOX doesn't seem to be running at ${VOICEVOX_URL}. Download it from ` +
        'https://voicevox.hiroshiba.jp/, launch it, and leave it running, then re-run this script.',
    )
    process.exit(1)
  }

  await mkdir(OUTPUT_DIR, { recursive: true })

  const jobs = buildJobs()
  console.log(
    `Generating ${jobs.length} cached phrase(s) via VOICEVOX, ` +
      `${COOLDOWN_MS}ms apart to keep it from running flat-out the whole time...`,
  )

  for (const [i, job] of jobs.entries()) {
    const outPath = path.join(OUTPUT_DIR, `${job.cacheKey}.wav`)
    try {
      const { id: speakerId, name: speakerName } = await resolveSpeakerId(job.speakerName, job.styleName)
      const wav = await synthesize(job.text, speakerId)
      await writeFile(outPath, wav)
      console.log(`done  ${job.cacheKey} (${speakerName}) -> public/audio/${job.cacheKey}.wav`)
    } catch (err) {
      console.error(`fail  ${job.cacheKey}: ${err.message}`)
    }

    if (i < jobs.length - 1) await cooldown()
  }
}

export { buildJobs }

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
