// One-off dev script: generates a cute flat-icon PNG for every entry in the
// word bank via the Gemini API, saved to public/images/words/<id>.png.
//
// Usage:
//   node scripts/generate-word-images.mjs
//   node scripts/generate-word-images.mjs --only=dog,cat
//   node scripts/generate-word-images.mjs --force
//
// Requires GEMINI_API_KEY (see scripts/gemini-client.mjs and .env.example).

import { writeFile, mkdir, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { wordBank } from '../src/domain/wordBank.ts'
import { generateGeminiImage, geminiCooldown } from './gemini-client.mjs'
import { NON_CHARACTER_MODEL, REALISTIC_STYLE_GUARDRAIL } from './image-style-guardrail.mjs'

const ICON_SIZE = 480

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'words')

const args = process.argv.slice(2)
const force = args.includes('--force')
const onlyArg = args.find((a) => a.startsWith('--only='))
const onlyIds = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',')) : null

// These word-bank images are flashcards for an English-word quiz — a child
// has to recognize the real object from the picture, so they're rendered for
// realism rather than the cute toy-mascot style used for the app's chrome
// and characters (see characterThemes.ts / generate-character-portraits.mjs).
// A few 'nature' entries are inherently symbolic rather than photographable
// objects (star, heart) or need care to render well (sun, moon) — those get
// a tailored realistic treatment instead of a literal photo.
const SYMBOLIC_PROMPTS = {
  sun: 'A realistic photograph of the sun in a clear blue sky, bright glowing solar disc with soft lens flare and radiating warm light, natural daytime photography, high detail, no text, no watermark.',
  star: 'A single realistic 3D-rendered star ornament, polished metallic gold material with genuine specular highlights and light glints, accurate five-pointed star geometry, soft studio lighting, plain white background, centered composition, no text, no watermark, no cartoon face.',
  heart: 'A single realistic glossy red satin heart-shaped pillow, soft fabric folds and creases, natural studio lighting with soft shadow, plain white background, centered composition, no text, no watermark, no cartoon face, no anatomical organ.',
  moon: 'A realistic photograph of the full moon against a dark night sky, accurate lunar surface detail and craters, natural soft glow, high detail astrophotography style, no text, no watermark, no cartoon face.',
  cloud: 'A realistic photograph of a single fluffy white cloud in a clear blue sky, natural daytime photography, soft natural lighting, high detail, no text, no watermark.',
  mountain: 'A realistic photograph of a single mountain peak against a natural sky, clear daylight, high detail landscape photography, no text, no watermark, no people, no buildings.',
}

function buildPrompt(entry) {
  if (entry.category === 'color') {
    return (
      `A realistic photograph of a smooth solid ${entry.word} fabric swatch, ` +
      'for a premium children\'s color-learning flashcard. Entirely and accurately ' +
      `${entry.word} — no other colors, no gradient, no additional objects, no characters, ` +
      'no background scenery, natural studio lighting with soft shadow, centered ' +
      `composition, plain white background. ${REALISTIC_STYLE_GUARDRAIL}`
    )
  }
  if (entry.word in SYMBOLIC_PROMPTS) {
    return `${SYMBOLIC_PROMPTS[entry.word]} ${REALISTIC_STYLE_GUARDRAIL}`
  }
  if (entry.category === 'vehicle') {
    // Real vehicle photos the model was trained on are almost always branded, so the
    // generic "no logos" line in REALISTIC_STYLE_GUARDRAIL isn't always enough on its own
    // (seen in practice: a visible VW badge on a car, "GWR" lettering on a train) —
    // spelled out explicitly here instead.
    return (
      `A realistic photograph of a single real ${entry.word}, for a premium children's ` +
      'English-learning flashcard. Completely unbranded and generic: no manufacturer ' +
      'logos, no badges or emblems, no visible brand names, no readable text or numbers ' +
      'anywhere on the vehicle. Natural soft studio lighting, shallow depth of field, ' +
      `centered composition, plain neutral background, high-detail photography. ${REALISTIC_STYLE_GUARDRAIL}`
    )
  }
  return (
    `A realistic photograph of a single real ${entry.word}, for a premium children's ` +
    'English-learning flashcard. Natural soft studio lighting, shallow depth of field, ' +
    `centered composition, plain neutral background, high-detail photography. ${REALISTIC_STYLE_GUARDRAIL}`
  )
}

async function generateImage(entry) {
  return generateGeminiImage({ prompt: buildPrompt(entry), model: NON_CHARACTER_MODEL })
}

/** Normalizes whatever format the model returned (PNG or JPEG) into a real, resized PNG. */
async function saveAsPng(bytes, mimeType, outPath) {
  const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? '.jpg' : '.png'
  const tempPath = `${outPath}.tmp${ext}`
  await writeFile(tempPath, bytes)
  try {
    execFileSync('sips', ['-s', 'format', 'png', '-Z', String(ICON_SIZE), tempPath, '--out', outPath], {
      stdio: 'ignore',
    })
  } finally {
    await unlink(tempPath)
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const targets = wordBank.filter((w) => !onlyIds || onlyIds.has(w.id))
  console.log(`Generating ${targets.length} image(s) via Gemini...`)

  for (const [i, entry] of targets.entries()) {
    const outPath = path.join(OUTPUT_DIR, `${entry.id}.png`)
    if (existsSync(outPath) && !force) {
      console.log(`skip  ${entry.id} (already exists, use --force to regenerate)`)
      continue
    }

    try {
      const { bytes, mimeType } = await generateImage(entry)
      await saveAsPng(bytes, mimeType, outPath)
      console.log(`done  ${entry.id} -> public/images/words/${entry.id}.png`)
    } catch (err) {
      console.error(`fail  ${entry.id}: ${err.message}`)
    }

    if (i < targets.length - 1) await geminiCooldown()
  }
}

main()
