#!/usr/bin/env node
/**
 * まちがいさがし scene assets (SCENE ILLUSTRATION track — see image-style-guardrail.mjs):
 * per theme, one wide background illustration and a set of single-object sprites. Sprites
 * are generated on plain white and keyed to transparency with remove_bg.py; the app places
 * them on the background and creates the differences itself.
 *
 * Usage:
 *   node scripts/generate-spot-scenes.mjs --theme=sea [--out=DIR] [--only=bg,crab]
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateGeminiImage, geminiCooldown } from './gemini-client.mjs'
import { SCENE_ILLUSTRATION_GUARDRAIL } from './image-style-guardrail.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.join(SCRIPT_DIR, '..')

// Shared with generate-spot-scenes-local.py, so both generators draw the same themes.
export const THEMES = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, 'spot-themes.json'), 'utf8'))

function args() {
  const get = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
  return { theme: get('theme'), out: get('out'), only: get('only')?.split(',') }
}

function backgroundPrompt(desc) {
  return (
    `A wide landscape background scene for a children's spot-the-difference game: ${desc}. ` +
    'Keep it simple and uncluttered with large open areas where small objects will be placed ' +
    'later — no characters, no animals, no small objects, no people. ' +
    SCENE_ILLUSTRATION_GUARDRAIL
  )
}

function spritePrompt(desc) {
  return (
    `A single isolated sticker-like illustration of ${desc}, centered, filling about 70% of the ` +
    'frame, on a perfectly plain pure white background. Nothing else in the image: no ground, ' +
    'no shadow, no scenery, no border. ' +
    SCENE_ILLUSTRATION_GUARDRAIL
  )
}

async function main() {
  const { theme, out, only } = args()
  const spec = THEMES[theme]
  if (!spec) throw new Error(`unknown --theme (${Object.keys(THEMES).join(', ')})`)
  const dir = out ?? path.join(REPO_ROOT, 'public', 'images', 'spot', theme)
  fs.mkdirSync(dir, { recursive: true })

  const jobs = [
    { id: 'bg', prompt: backgroundPrompt(spec.background), aspectRatio: '3:2' },
    ...Object.entries(spec.sprites).map(([id, desc]) => ({ id, prompt: spritePrompt(desc), aspectRatio: '1:1', sprite: true })),
  ].filter((j) => !only || only.includes(j.id))

  for (const job of jobs) {
    const { bytes } = await generateGeminiImage({ prompt: job.prompt, aspectRatio: job.aspectRatio })
    const target = path.join(dir, `${job.id}.png`)
    if (job.sprite) {
      const raw = path.join(dir, `${job.id}.raw.png`)
      fs.writeFileSync(raw, bytes)
      execFileSync('python3', [path.join(SCRIPT_DIR, 'remove_bg.py'), raw, target])
      fs.unlinkSync(raw)
    } else {
      fs.writeFileSync(target, bytes)
    }
    console.log(`done ${theme}/${job.id}`)
    await geminiCooldown()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
