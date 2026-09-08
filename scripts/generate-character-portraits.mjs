// One-off dev script: generates a polished 3D-style hero portrait for each
// category's mascot character via the Gemini API. The character is rendered
// on a solid chroma-key backdrop with no shadow; remove_bg.py measures
// whatever color that backdrop actually rendered as (the model doesn't
// reliably hit the exact requested hue) and keys that out — a plain white
// backdrop can't be cleanly separated from a character whose own palette
// includes white/cream fur or clothing, since both read as "light" to any
// luminance-based cutout.
//
// Usage:
//   node scripts/generate-character-portraits.mjs
//   node scripts/generate-character-portraits.mjs --only=momo
//
// Requires GEMINI_API_KEY (see scripts/gemini-client.mjs and .env.example)
// and Python3 + Pillow + numpy (pip3 install --user pillow numpy) for the
// background-removal step.

import { writeFile, mkdir, unlink } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateGeminiImage, geminiCooldown } from './gemini-client.mjs'
import { CHARACTER_MODEL } from './image-style-guardrail.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'characters')
const ICON_SIZE = 480

const args = process.argv.slice(2)
const onlyArg = args.find((a) => a.startsWith('--only='))
const onlyIds = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',')) : null

// Keep these in sync with src/components/characters/characterThemes.ts
const CHARACTERS = [
  {
    id: 'momo',
    detail:
      'themed in bright pastel pink and white, with soft rabbit-like ears and a star-shaped gem accessory on its head',
  },
  {
    id: 'sora',
    detail:
      'themed in bright pastel sky blue and white, with soft rounded cat-like ears and a crescent-moon gem accessory on its head',
  },
  {
    id: 'hana',
    detail:
      'themed in bright pastel yellow and peach-orange, with small delicate wing accents near its head and a heart-shaped gem accessory on its head',
  },
  {
    id: 'koko',
    detail:
      'themed in bright pastel mint green and soft lavender purple, with round fluffy owl-like feather tufts on top of its head resembling small ears, cute round glasses, and a glowing lightbulb-shaped gem accessory on its head',
    // Every character shares a "subtle pink blush" cheek trait and warm skin tone (from
    // BASE_PROMPT), which rules out pink/magenta/red as a backdrop as much as koko's own
    // mint hair rules out green and its lavender accents rule out blue/violet. Yellow-green
    // is the one clear gap left between all of those.
    bgColor: 'chartreuse yellow-green',
  },
  {
    id: 'yui',
    detail:
      'themed in bright pastel lavender purple and warm coral orange, holding a tiny calligraphy brush, with soft fox-like ears and a round paper-lantern-shaped gem accessory on its head',
  },
  {
    id: 'aru',
    detail:
      'a cute alpaca character themed in warm pastel apricot-orange and sky blue, with fluffy alpaca ears and a soft fluffy neck ruff, holding a colorful ABC alphabet block, and a tiny star-shaped gem accessory on its head',
    // Aru's fluffy alpaca wool renders with pale cream/light wisps at the edges — a bright
    // background (chartreuse, like koko/mitsu use) still got eaten into around those wisps,
    // so use a deeply saturated, dark-toned hue with much more contrast against pale fur.
    bgColor: 'deep saturated magenta',
  },
  {
    id: 'peko',
    detail:
      'a cute parrot character themed in bright pastel turquoise-teal and warm orange, with small fluffy wing-like arms, a round orange beak, and a tiny globe-shaped gem accessory on its head',
    // Peko's own palette is teal/turquoise plus orange — neither green nor the koko/mitsu
    // chartreuse key works cleanly here, so use a hue outside both (magenta/pink).
    bgColor: 'hot magenta pink',
  },
  {
    id: 'toki',
    detail:
      'themed in bright pastel amber gold and soft teal, with round hamster-like ears, holding a tiny pocket watch, and a clock-face-shaped gem accessory on its head',
  },
  {
    id: 'mitsu',
    detail:
      'themed in bright pastel turquoise and soft pink, with alert bunny-like ears, holding a tiny magnifying glass, and a sparkle-shaped gem accessory on its head',
    // turquoise hair is close enough to the default green key that removal kept eating
    // large chunks of it (repeatedly flagged by the double-check) — same fix as koko.
    bgColor: 'chartreuse yellow-green',
  },
  {
    id: 'kazu',
    detail:
      'themed in bright pastel orange-red and sunny yellow, with round bear-cub-like ears, holding tiny colorful counting beads, and a number-block-shaped gem accessory on its head',
  },
  {
    id: 'fumi',
    detail:
      'a cute panda character themed in deep pastel vermillion red and soft cream-white, with round panda ears and panda eye patches, holding a small round red hanko seal stamp, and a tiny scroll-shaped gem accessory on its head',
  },
]

const BASE_PROMPT = `Create a polished 3D animated fantasy mascot character.

Core visual priorities:
- Extremely cute, child-friendly appearance
- Oversized rounded head and very small body
- Huge jewel-like eyes occupying most of the face
- Large irises with layered gradients and multiple bright highlights
- Tiny nose and small expressive mouth
- Soft rounded cheeks with subtle pink blush
- Smooth, chunky hair shapes rather than individual strands
- Short limbs and rounded hands and feet
- Large bows, heart-shaped gems and magical accessories
- Bright pastel palette — {DETAIL}
- Soft studio lighting from the upper front
- Smooth high-quality 3D animation rendering
- Soft shadows, glossy eyes and jewel reflections
- Clean, premium childrens animation aesthetic

Avoid: realistic anatomy, realistic skin texture, small eyes, sharp facial features, dark shadows, muted colors, detailed individual hair strands, adult proportions.

Background: a single solid, flat, evenly-lit bright chroma-key {BG_COLOR} (like a {BG_COLOR} screen), filling the entire background with no gradient, no vignette, no texture. The character appears to float with no ground plane, no drop shadow, no contact shadow, and no reflection of any kind. Centered composition, single character, no text, no watermark, no logos.`

async function generateImage(character) {
  // remove_bg.py measures the actual rendered background color itself rather than trusting
  // this request, so bgColor only needs to steer the model away from the character's own
  // palette in the first place — it doesn't have to be exact.
  const bgColor = character.bgColor ?? 'green'
  const prompt = BASE_PROMPT.replace(/{BG_COLOR}/g, bgColor).replace('{DETAIL}', character.detail)
  const { bytes } = await generateGeminiImage({ prompt, model: CHARACTER_MODEL })
  return bytes
}

/** One full generate -> resize -> cutout attempt. remove_bg.py always runs its own
 * double-check (background residue + face/body cut into) and exits non-zero if either
 * looks wrong, which this surfaces as `warnings` rather than throwing — a failed
 * double-check is expected to happen sometimes (the model is stochastic) and is handled
 * by retrying, not by crashing the whole batch. */
async function attemptOne(character, outPath) {
  const rawPath = `${outPath}.raw.png`
  const resizedPath = `${outPath}.resized.png`
  try {
    const bytes = await generateImage(character)
    await writeFile(rawPath, bytes)
    execFileSync('sips', ['-s', 'format', 'png', '-Z', String(ICON_SIZE), rawPath, '--out', resizedPath], {
      stdio: 'ignore',
    })
    try {
      const output = execFileSync('python3', [path.join(__dirname, 'remove_bg.py'), resizedPath, outPath], {
        encoding: 'utf8',
      })
      return { warnings: extractWarnings(output) }
    } catch (err) {
      // remove_bg.py exits non-zero specifically when its double-check found a problem —
      // the image was still written to outPath, just flagged.
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

  const targets = CHARACTERS.filter((c) => !onlyIds || onlyIds.has(c.id))
  console.log(`Generating ${targets.length} character portrait(s) via Gemini...`)

  const stillFlagged = []

  for (const [i, character] of targets.entries()) {
    const outPath = path.join(OUTPUT_DIR, `${character.id}.png`)
    let warnings = []

    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const result = await attemptOne(character, outPath)
        warnings = result.warnings
        if (warnings.length === 0) break
        if (attempt < MAX_ATTEMPTS) {
          console.log(`retry ${character.id}: double-check flagged an issue, regenerating (attempt ${attempt + 1}/${MAX_ATTEMPTS})`)
          for (const w of warnings) console.log(`  - ${w}`)
          await geminiCooldown()
        }
      }

      if (warnings.length === 0) {
        console.log(`done  ${character.id} -> public/images/characters/${character.id}.png (double-check passed)`)
      } else {
        console.warn(`WARN  ${character.id}: double-check still flags this after ${MAX_ATTEMPTS} attempts — please review it by eye:`)
        for (const w of warnings) console.warn(`  - ${w}`)
        stillFlagged.push(character.id)
      }
    } catch (err) {
      console.error(`fail  ${character.id}: ${err.message}`)
    }

    if (i < targets.length - 1) await geminiCooldown()
  }

  if (stillFlagged.length > 0) {
    console.warn(`\n${stillFlagged.length} character(s) need manual review: ${stillFlagged.join(', ')}`)
  }
}

// Guards against a plain `import()` of this module (e.g. tooling introspecting it)
// accidentally triggering a real Gemini run and disk writes as a side effect — this script
// should only actually generate portraits when invoked directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
