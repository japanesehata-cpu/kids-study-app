// GUARDRAIL — single source of truth for every generated image in this project.
//
// Three tracks. Do not blend them, and do not add a fourth without updating this file
// (and the relevant script(s)) deliberately, not as a side effect of some other change:
//
// 1. CHARACTER track — the 8 mascots (momo/sora/hana/koko/yui/toki/mitsu/kazu) and any
//    future mascot. Cute 3D chibi style, exactly matching the 8 that already exist. See
//    generate-character-portraits.mjs.
//
// 2. EVERYTHING ELSE (realistic) track — word-bank flashcards, and any future asset that
//    teaches a child what a real thing actually looks like (an object to count, an icon
//    for a new category, etc) — recognizing the object correctly is the whole point, so
//    accuracy beats cuteness here. Concretely: no anthropomorphizing (an apple should not
//    have a face or eyes), no anatomically wrong proportions (a giraffe needs its actual
//    long neck), no stylization that could teach a wrong mental model of the real object.
//    See generate-word-images.mjs and REALISTIC_STYLE_GUARDRAIL below.
//
// 3. DECORATION track — celebratory/UI reward graphics that aren't teaching content and
//    aren't a character (a medal, a star, a sparkle for the results-screen reward burst).
//    Neither of the above rules applies: not realism (nobody needs to learn what a real
//    trophy looks like), not the character template (no face/eyes/proportions rules). Cute,
//    glossy, polished 3D-rendered objects matching the app's overall warm aesthetic. See
//    generate-reward-images.mjs and DECORATION_STYLE_GUARDRAIL below.
//
// 4. SCENE ILLUSTRATION track — まちがいさがし (spot-the-difference) scenes only: themed
//    background illustrations plus separate transparent object sprites the app composes
//    into a scene. A picture-book illustration (not a photo) on purpose — chosen with the
//    user (2026-10-05): a puzzle board needs objects that read instantly at small size and
//    a coherent scene, which a soft outlined illustration gives and a pasted-together photo
//    collage did not. Objects still stay recognizable as the real thing (no faces on
//    inanimate objects, real proportions) since children also name what they spot. See
//    generate-spot-scenes.mjs and SCENE_ILLUSTRATION_GUARDRAIL below.
//
// Model tier policy: character portraits and reward decorations are both reused everywhere
// (home screen, quiz, results) and are relatively few in number, so both use one tier above
// the cheapest — worth the extra cost. Word-bank flashcards use the cheapest currently-GA
// Gemini image model with no announced shutdown date, since there are many more of them and
// each is used in fewer places. Both model constants below must always resolve to a model
// that (a) is currently generally available and (b) has no publicly announced EOS/shutdown
// date — check https://ai.google.dev/gemini-api/docs/models before changing either.

export const CHARACTER_MODEL = process.env.GEMINI_CHARACTER_MODEL ?? 'gemini-3.1-flash-image'
export const NON_CHARACTER_MODEL = process.env.GEMINI_IMAGE_MODEL ?? 'gemini-3.1-flash-lite-image'

/** Appended to every non-character image prompt. Keeps the "teach the real thing"
 * requirement from silently drifting per-prompt as new asset types get added. */
export const REALISTIC_STYLE_GUARDRAIL =
  'Accurate natural anatomy, proportions, texture and coloring — true to life, not ' +
  'stylized, not cartoonish, not a toy, not 3D-animated, not an illustration. Do not ' +
  'anthropomorphize: no faces, eyes, or expressions added to objects that do not have ' +
  'them in reality (e.g. no eyes on an apple). Do not alter real anatomy for cuteness ' +
  '(e.g. a giraffe keeps its real long neck, not a shortened one). No text, no letters, ' +
  'no watermark, no logos.'

/** Appended to every reward-decoration prompt (see generate-reward-images.mjs). Distinct
 * from REALISTIC_STYLE_GUARDRAIL on purpose — these are celebratory UI accents, not
 * teaching content, so the polished-toy look that would be wrong for a flashcard is exactly
 * right here. */
export const DECORATION_STYLE_GUARDRAIL =
  'Polished 3D-rendered object, extremely glossy and premium, warm bright pastel colors ' +
  'matching a cute children\'s app aesthetic, soft studio lighting from the upper front ' +
  'with bright specular highlights and jewel-like shine, smooth rounded stylized shapes, ' +
  'high-quality 3D animation rendering — like a premium mobile game reward icon. Avoid: ' +
  'realistic textures, dark shadows, muted colors, any face, eyes, or character. No text, ' +
  'no letters, no watermark, no logos.'

/** Appended to every まちがいさがし scene/sprite prompt (see generate-spot-scenes.mjs). */
export const SCENE_ILLUSTRATION_GUARDRAIL =
  "Gentle children's picture-book illustration: clean soft dark-brown outlines, flat pastel " +
  'colors with very light shading, simple readable shapes, warm and calm mood. Objects keep ' +
  'their real shapes and proportions; no faces or eyes on inanimate objects. No text, no ' +
  'letters, no numbers, no watermark, no logos.'
