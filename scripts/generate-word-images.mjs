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
  // weather entries are phenomena, not held objects — same symbolic-scene treatment as
  // sun/cloud/moon above instead of the generic "single real object" framing.
  rain: 'A realistic photograph of rain falling, visible raindrops and gentle streaks against a soft overcast sky, natural outdoor photography, high detail, no text, no watermark, no people, no umbrella.',
  snow: 'A realistic photograph of snow falling over a snow-covered landscape, soft visible snowflakes, natural winter daylight, high detail, no text, no watermark, no people.',
  wind: 'A realistic photograph of tall grass and tree branches bending in a strong wind, motion blur on leaves, natural daylight, high detail, no text, no watermark, no people.',
  storm: 'A realistic photograph of a dark dramatic storm cloud over a landscape, natural dim lighting, high detail, no text, no watermark, no people, no buildings.',
  lightning: 'A realistic photograph of a lightning bolt striking across a dark stormy sky, high detail, no text, no watermark.',
  thunder: 'A realistic photograph of a dramatic dark thundercloud with a visible lightning flash inside it, high detail, no text, no watermark.',
  fog: 'A realistic photograph of a quiet landscape blanketed in thick soft fog, muted natural light, high detail, no text, no watermark, no people.',
  ice: 'A realistic photograph of a smooth clear block of ice, natural studio lighting with soft shadow, plain white background, centered composition, no text, no watermark.',
  hail: 'A realistic close-up photograph of small round hailstones scattered on the ground, natural daylight, high detail, no text, no watermark.',
  sunshine: 'A realistic photograph of warm bright sunlight streaming through green tree leaves, natural daytime photography, high detail, no text, no watermark, no people.',
  breeze: 'A realistic photograph of light curtains and dandelion seeds drifting gently in a soft breeze, natural daylight, high detail, no text, no watermark, no people.',
  drizzle: 'A realistic photograph of a light drizzle of fine rain against a soft grey sky, natural outdoor photography, high detail, no text, no watermark, no people.',
  frost: 'A realistic close-up photograph of delicate white frost crystals on a window pane or leaf, natural cold-morning light, high detail, no text, no watermark.',
  humidity: 'A realistic close-up photograph of condensation water droplets on a cold glass surface, natural lighting, high detail, no text, no watermark.',
}

// bodyPart entries are cropped photos of a human body part, which reads as unsettling in
// isolation at hyper-realistic quality — a soft, friendly children's-book illustration style
// avoids that while still clearly depicting the real part (not a cartoon mascot face).
function buildBodyPartPrompt(entry) {
  return (
    `A warm, friendly children's picture-book illustration of a single human ${entry.word}, ` +
    'soft rounded shapes, gentle natural skin tone, clean simple background, centered ' +
    'composition, no text, no watermark, no other body parts attached, not photorealistic.'
  )
}

// A sport word (soccer, swimming, skiing) names the activity, not an object — depict its
// most recognizable piece of equipment/scene instead of trying to photograph the activity
// itself, and keep people out of frame entirely.
const SPORT_PROMPTS = {
  soccer: 'a soccer ball resting on green grass',
  baseball: 'a baseball and a baseball bat crossed on the ground',
  basketball: 'a basketball resting on a court',
  tennis: 'a tennis racket and a tennis ball',
  swimming: 'a pair of swim goggles and a pool float beside a swimming pool',
  running: 'a pair of running shoes on a running track',
  skiing: 'a pair of skis and ski poles standing upright in snow',
  skating: 'a pair of ice skates on ice',
  surfing: 'a surfboard standing upright in sand at the beach',
  golf: 'a golf ball and a golf club on grass',
  volleyball: 'a volleyball resting on sand',
  badminton: 'a badminton racket and a shuttlecock',
  boxing: 'a pair of boxing gloves',
  judo: 'a folded white judo uniform belt',
}

function buildSportPrompt(entry) {
  return (
    `A realistic photograph of ${SPORT_PROMPTS[entry.word]}, for a premium children's ` +
    'English-learning flashcard. Natural soft studio or outdoor lighting, centered ' +
    `composition, no people, no text, no watermark. ${REALISTIC_STYLE_GUARDRAIL}`
  )
}

// A place is a wide scene, not a single held object — the generic "single real object on a
// plain background" framing doesn't fit a park or a beach.
function buildPlacePrompt(entry) {
  return (
    `A realistic photograph of a ${entry.word}, for a premium children's English-learning ` +
    'flashcard. A clear, recognizable wide-angle scene, natural daylight, high detail ' +
    `photography, no text, no watermark, no visible people, no readable signage. ${REALISTIC_STYLE_GUARDRAIL}`
  )
}

// Shapes are abstract geometry, not objects — a plain solid 3D shape, matching the star's
// symbolic treatment above rather than trying to photograph "a triangle."
function buildShapePrompt(entry) {
  return (
    `A single realistic 3D-rendered ${entry.word}, glossy solid pastel-colored material ` +
    'with soft specular highlights, accurate geometry, soft studio lighting, plain white ' +
    `background, centered composition, no text, no watermark, no cartoon face. ${REALISTIC_STYLE_GUARDRAIL}`
  )
}

function buildPrompt(entry) {
  if (entry.category === 'bodyPart') {
    return buildBodyPartPrompt(entry)
  }
  if (entry.category === 'sport') {
    return buildSportPrompt(entry)
  }
  if (entry.category === 'place') {
    return buildPlacePrompt(entry)
  }
  if (entry.category === 'shape') {
    return buildShapePrompt(entry)
  }
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
