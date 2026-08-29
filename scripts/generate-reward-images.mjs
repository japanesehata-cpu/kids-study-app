// One-off dev script: generates the results-screen reward burst (see
// src/components/StampReward.tsx) — a medal plus a few sparkle/star/heart accents that
// orbit it — replacing plain system emoji with polished custom art. See
// image-style-guardrail.mjs's DECORATION track for why these use their own style rules
// (not the character template, not the realistic-teaching-content rules).
//
// Usage:
//   node scripts/generate-reward-images.mjs
//   node scripts/generate-reward-images.mjs --only=medal
//
// Requires GEMINI_API_KEY (see scripts/gemini-client.mjs and .env.example) and Python3 +
// Pillow + numpy + scipy (pip3 install --user pillow numpy scipy) for background removal.

import { writeFile, mkdir, unlink } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateGeminiImage, geminiCooldown } from './gemini-client.mjs'
import { CHARACTER_MODEL, DECORATION_STYLE_GUARDRAIL } from './image-style-guardrail.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'rewards')
const ICON_SIZE = 320

const args = process.argv.slice(2)
const onlyArg = args.find((a) => a.startsWith('--only='))
const onlyIds = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',')) : null

// Keep these ids in sync with src/components/StampReward.tsx
const REWARDS = [
  {
    id: 'medal',
    detail:
      'a gold medal hanging from a red-and-blue ribbon, the medal face embossed with a simple raised star relief, glossy polished metallic gold with bright specular highlights',
  },
  {
    id: 'star',
    // no "glowing aura" language: the model rendered that as a literal colored halo ring
    // around the star, which read as a background-removal mistake rather than an effect
    detail: 'a single five-pointed glossy gold star with one bright highlight, slightly rounded points',
  },
  {
    id: 'heart',
    detail:
      'a single glossy pink-and-red heart shape with one large bright highlight and a couple of tiny sparkle accents, sweet and magical',
  },
  {
    id: 'sparkle',
    detail:
      'a single four-pointed sparkle/twinkle shape (like a magical glint or star-burst), glossy pale gold-white with a bright glowing core',
  },
]

const BASE_PROMPT = `Create a single decorative icon: {DETAIL}.

${DECORATION_STYLE_GUARDRAIL}

Background: a single solid, flat, evenly-lit bright chroma-key {BG_COLOR} (like a {BG_COLOR} screen), filling the entire background with no gradient, no vignette, no texture. The object appears to float with no ground plane, no drop shadow, no contact shadow, and no reflection of any kind. Centered composition, single object, no text, no watermark, no logos.`

async function generateImage(reward) {
  // remove_bg.py measures the actual rendered background color itself rather than trusting
  // this request, so bgColor only needs to steer the model away from the object's own
  // palette (gold/red/blue/pink here) in the first place — it doesn't have to be exact.
  const bgColor = reward.bgColor ?? 'green'
  const prompt = BASE_PROMPT.replace(/{BG_COLOR}/g, bgColor).replace('{DETAIL}', reward.detail)
  const { bytes } = await generateGeminiImage({ prompt, model: CHARACTER_MODEL })
  return bytes
}

/** One full generate -> resize -> cutout attempt. remove_bg.py always runs its own
 * double-check (background residue only — these aren't the character template, so the
 * face-hole check is skipped via --no-face-check) and exits non-zero if it looks wrong,
 * which this surfaces as `warnings` rather than throwing. */
async function attemptOne(reward, outPath) {
  const rawPath = `${outPath}.raw.png`
  const resizedPath = `${outPath}.resized.png`
  try {
    const bytes = await generateImage(reward)
    await writeFile(rawPath, bytes)
    execFileSync('sips', ['-s', 'format', 'png', '-Z', String(ICON_SIZE), rawPath, '--out', resizedPath], {
      stdio: 'ignore',
    })
    try {
      const output = execFileSync(
        'python3',
        [path.join(__dirname, 'remove_bg.py'), resizedPath, outPath, '--no-face-check'],
        { encoding: 'utf8' },
      )
      return { warnings: extractWarnings(output) }
    } catch (err) {
      return { warnings: extractWarnings(err.stdout ?? '') }
    }
  } finally {
    await unlink(rawPath).catch(() => {})
    await unlink(resizedPath).catch(() => {})
  }
}

function extractWarnings(output) {
  return output
    .split('\n')
    .filter((line) => line.startsWith('WARN:'))
    .map((line) => line.slice('WARN: '.length))
}

const MAX_ATTEMPTS = 2

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const targets = REWARDS.filter((r) => !onlyIds || onlyIds.has(r.id))
  console.log(`Generating ${targets.length} reward image(s) via Gemini...`)

  const stillFlagged = []

  for (const [i, reward] of targets.entries()) {
    const outPath = path.join(OUTPUT_DIR, `${reward.id}.png`)
    let warnings = []

    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const result = await attemptOne(reward, outPath)
        warnings = result.warnings
        if (warnings.length === 0) break
        if (attempt < MAX_ATTEMPTS) {
          console.log(`retry ${reward.id}: double-check flagged an issue, regenerating (attempt ${attempt + 1}/${MAX_ATTEMPTS})`)
          for (const w of warnings) console.log(`  - ${w}`)
          await geminiCooldown()
        }
      }

      if (warnings.length === 0) {
        console.log(`done  ${reward.id} -> public/images/rewards/${reward.id}.png (double-check passed)`)
      } else {
        console.warn(`WARN  ${reward.id}: double-check still flags this after ${MAX_ATTEMPTS} attempts — please review it by eye:`)
        for (const w of warnings) console.warn(`  - ${w}`)
        stillFlagged.push(reward.id)
      }
    } catch (err) {
      console.error(`fail  ${reward.id}: ${err.message}`)
    }

    if (i < targets.length - 1) await geminiCooldown()
  }

  if (stillFlagged.length > 0) {
    console.warn(`\n${stillFlagged.length} reward image(s) need manual review: ${stillFlagged.join(', ')}`)
  }
}

main()
