// Shared Gemini image generation client for the dev scripts.
//
// Calls the Gemini API (via @google/genai) for text-to-image generation.
// Requires a GEMINI_API_KEY. Model choice is governed by image-style-guardrail.mjs —
// see that file for the policy this follows.

import { GoogleGenAI } from '@google/genai'
import { NON_CHARACTER_MODEL } from './image-style-guardrail.mjs'

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  throw new Error('GEMINI_API_KEY is required to generate images via Gemini. Set it in your environment or .env.')
}

const DEFAULT_MODEL = NON_CHARACTER_MODEL

// Gap between generations to stay under the API's per-minute rate limits.
// Not a thermal concern like the old local-inference client — just courtesy
// pacing for a shared quota.
const COOLDOWN_MS = Number(process.env.GEMINI_COOLDOWN_MS ?? 2_000)

const ai = new GoogleGenAI({ apiKey })

/** `model` lets a caller opt into a higher (pricier) tier for assets where it's worth it —
 * see image-style-guardrail.mjs's CHARACTER_MODEL, used only for the 8 mascot portraits. */
export async function generateGeminiImage({ prompt, model = DEFAULT_MODEL }) {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    // Without an explicit aspectRatio the model picks whatever framing suits the prompt, which
    // produced inconsistently-shaped icons/portraits — every asset here needs a uniform square.
    config: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } },
  })

  const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
  if (!part) {
    throw new Error(`no image returned for prompt: ${prompt.slice(0, 60)}...`)
  }
  return { bytes: Buffer.from(part.inlineData.data, 'base64'), mimeType: part.inlineData.mimeType ?? 'image/png' }
}

/** Pause between generations to stay under the API's rate limits. */
export async function geminiCooldown() {
  if (COOLDOWN_MS <= 0) return
  await new Promise((r) => setTimeout(r, COOLDOWN_MS))
}
