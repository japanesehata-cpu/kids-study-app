#!/usr/bin/env python3
"""One-off dev script: generates a photorealistic flashcard PNG for every entry in the
word bank via a locally-running RealVisXL V4.0 Lightning (SDXL) checkpoint, saved to
public/images/words/<id>.png. Mirrors generate-word-images.mjs's role, but runs the
model on-device (Apple Silicon MPS) instead of calling the Gemini API — chosen so image
generation has no per-image cloud cost and, per local testing, negligible thermal load
compared to a full-step SDXL run (see the "Local Model Settings" in the style guide this
follows: 768x768, 8 steps, guidance 1.3, DPM++ SDE Karras).

Prompt style follows the project's photorealistic style guide (RAW photograph language,
explicit negative prompt against CGI/illustration/overprocessing) rather than Gemini's
natural-language instruction style — see PROMPT_TEMPLATES / NEGATIVE_PROMPT below.

Usage:
    cd scripts && /Users/hirokihata/realvisxl-test/.venv/bin/python3 generate-word-images-local.py
    /Users/hirokihata/realvisxl-test/.venv/bin/python3 generate-word-images-local.py --only=dog,cat
    /Users/hirokihata/realvisxl-test/.venv/bin/python3 generate-word-images-local.py --force

Requires the RealVisXL_V4.0_Lightning.safetensors checkpoint at MODEL_PATH below (already
downloaded to ~/realvisxl-test/models) and the venv at ~/realvisxl-test/.venv (already has
torch/diffusers/transformers/accelerate installed).
"""

import argparse
import hashlib
import json
import os
import subprocess
import sys
import time

import torch
from diffusers import StableDiffusionXLPipeline, DPMSolverMultistepScheduler
from PIL import Image, ImageDraw

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
# Defaults to the Lightning (distilled, few-step) checkpoint. Override via env vars to
# use the standard (non-distilled) RealVisXL V4.0 checkpoint instead — better overall
# photorealism/texture quality at the cost of much slower generation (needs many more
# steps and a normal guidance_scale; Lightning is specifically distilled to converge in
# very few steps and doesn't render well at higher step counts).
MODEL_PATH = os.path.expanduser(
    os.environ.get("DIFFUSION_MODEL_PATH", "~/realvisxl-test/models/RealVisXL_V4.0_Lightning.safetensors")
)
OUTPUT_DIR = os.path.join(REPO_ROOT, "public", "images", "words")
ICON_SIZE = 480
GEN_SIZE = 768
LOCK_PATH = "/tmp/generate-word-images-local.lock"

# Kept low to minimize sustained GPU load: fewer steps means less compute per image, and
# the cooldown lets the GPU idle back down between images instead of running at a
# continuous peak for the whole batch — same reasoning as generate-tts-cache.mjs's
# thermal cooldown between VOICEVOX calls. Override via env var if needed.
INFERENCE_STEPS = int(os.environ.get("DIFFUSION_STEPS", 6))
GUIDANCE_SCALE = float(os.environ.get("DIFFUSION_GUIDANCE", 1.3))
COOLDOWN_SECONDS = float(os.environ.get("DIFFUSION_COOLDOWN_S", 10))
# On top of the per-image cooldown above, take a much longer break every N images so the
# chip gets a real chance to fully cool rather than just idling briefly between bursts —
# for a long batch at a higher step count (see the standard, non-Lightning checkpoint
# option), the per-image gap alone isn't enough to keep it off sustained thermal load.
BATCH_COOLDOWN_EVERY = int(os.environ.get("DIFFUSION_BATCH_COOLDOWN_EVERY", 0))
BATCH_COOLDOWN_SECONDS = float(os.environ.get("DIFFUSION_BATCH_COOLDOWN_S", 300))


def _pid_is_alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


class SingleInstanceLock:
    """Refuses to run if another instance of this script is already generating — the
    inner loop only ever runs one diffusion inference at a time by construction (a plain
    sequential `for`, no threads/async/batching), but nothing stops two separate
    processes from being launched back to back and overlapping. Keeping local Mac load
    to exactly one inference at a time is a hard requirement here, not just a default."""

    def __enter__(self):
        if os.path.exists(LOCK_PATH):
            with open(LOCK_PATH) as f:
                existing_pid = int(f.read().strip() or -1)
            if _pid_is_alive(existing_pid):
                sys.exit(
                    f"Another generate-word-images-local.py run is already in progress (pid {existing_pid}). "
                    "Refusing to start a second one — only one local diffusion inference may run at a time."
                )
        with open(LOCK_PATH, "w") as f:
            f.write(str(os.getpid()))
        return self

    def __exit__(self, *exc_info):
        try:
            os.remove(LOCK_PATH)
        except FileNotFoundError:
            pass


def load_word_bank():
    """wordBank.ts is the single source of truth for word content — shell out to Node to
    import it directly rather than hand-duplicating the list here, so this can never drift
    out of sync with the app."""
    script = (
        "import('./src/domain/wordBank.ts').then(m => "
        "process.stdout.write(JSON.stringify(m.wordBank)))"
    )
    result = subprocess.run(
        ["node", "--experimental-strip-types", "-e", script],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(result.stdout)


# ---------------------------------------------------------------------------
# Prompt style — see the project's photorealistic image style guide. Every template
# below follows its shape: a RAW-photograph opening, natural materials/lighting,
# camera/lens language, ending on "unedited ... photograph". None of the generic
# quality boosters (highly detailed, 8K, cinematic, epic, hyperreal) are used.
# ---------------------------------------------------------------------------

# Kept well under CLIP's 77-token limit, with room left for EXTRA_NEGATIVE below (the
# project's original reference prompt/negative prompt both ran ~100 tokens on their own
# and were silently truncated by the tokenizer — trimmed here to the exclusions that
# matter most while staying within budget).
NEGATIVE_PROMPT = """
octane render, 3d render, CGI, illustration, cartoon, digital art,
plastic, metallic, chrome, HDR, overprocessed, neon colors,
stylized, low quality, blurry, deformed anatomy, extra limbs,
malformed features, text, watermark
"""

# Appended only for categories where a real photo is prone to a specific unwanted
# artifact the base negative prompt doesn't cover.
EXTRA_NEGATIVE = {
    "vehicle": "logo, brand name, badge, emblem, license plate, readable text on vehicle",
    "clothing": "person wearing it, mannequin, human body",
    "bodyPart": "other body parts, full body, face, jewelry, arm hair, body hair",
    "place": "visible people, readable signage",
    "instrument": "logo, brand name, readable text",
    "animal": "front view, facing camera, portrait, head-on",
    "color": "draped, hanging fabric, dramatic folds, twisted, silk, swirl",
}

# Animal photography sub-styles: not every animal reads well as "perched on a branch,
# 85mm telephoto" (that's a bird pose) or "full body on land" (doesn't fit an octopus).
BIRD_IDS = {
    "owl", "duck", "chicken", "penguin", "macaw", "flamingo", "peacock", "swan", "goose",
    "pelican", "toucan", "parrot", "woodpecker", "hummingbird", "eagle", "hawk", "falcon",
    "vulture", "crow", "raven", "magpie", "robin", "sparrow", "stork", "heron", "crane",
    "quail", "turkey", "ostrich",
}
MARINE_IDS = {
    "fish", "dolphin", "whale", "shark", "octopus", "jellyfish", "starfish", "seahorse",
    "stingray", "squid", "lobster", "crab", "shrimp", "seal", "walrus", "otter",
}
INSECT_IDS = {
    "bee", "butterfly", "ladybug", "snail", "dragonfly", "firefly", "grasshopper",
    "caterpillar", "mantis", "wasp", "ant", "spider", "centipede", "worm", "scorpion",
}
REPTILE_IDS = {"frog", "turtle", "chameleon", "crocodile", "alligator", "iguana"}


def animal_prompt(word):
    # Kept under CLIP's 77-token limit — see the NEGATIVE_PROMPT comment above for why.
    # Every variant demands a side profile silhouette, not a front-facing portrait: a
    # head-on shot hides exactly the features (a tapir's snout, a shrimp's curved body)
    # that make an animal recognizable as that species rather than a generic face.
    if word in BIRD_IDS:
        return f"""
RAW wildlife photograph of a real {word} perched on a branch,
side profile view, entire body visible from the side, natural
feather texture, soft diffused daylight, neutral colors, shallow
depth of field, smooth background bokeh, telephoto lens,
unedited documentary nature photograph
"""
    if word in MARINE_IDS:
        return f"""
RAW underwater wildlife photograph of a real {word},
side profile view, entire body visible from the side showing its
true body shape, natural skin or shell texture, soft diffused
light through water, shallow depth of field, soft-focus background,
unedited documentary nature photograph
"""
    if word in INSECT_IDS:
        return f"""
RAW macro wildlife photograph of a real {word},
side profile view, entire body visible from the side showing its
true body shape, natural exoskeleton texture, soft diffused
daylight, shallow depth of field, macro lens background bokeh,
unedited documentary nature photograph
"""
    if word in REPTILE_IDS:
        return f"""
RAW wildlife photograph of a real {word} on a branch or rock,
side profile view, entire body visible from the side, natural
scale or skin texture, soft diffused daylight, neutral green and
brown colors, shallow depth of field, smooth background bokeh,
unedited documentary nature photograph
"""
    return f"""
RAW wildlife photograph of a real {word} standing outdoors,
side profile view, entire body visible from the side showing its
true silhouette and proportions, natural fur texture, soft diffused
daylight, shallow depth of field, smooth background bokeh, telephoto lens,
unedited documentary nature photograph
"""


PREPARED_DISH_IDS = {
    "pizza", "hamburger", "hotdog", "rice", "noodles", "sushi", "cake", "cookie", "donut",
    "icecream", "sandwich", "soup", "spaghetti", "salad", "pasta", "dumpling", "taco",
    "burrito", "curry", "ramen", "udon", "pancake", "waffle", "omelette", "toast",
    "popcorn", "pretzel", "muffin", "bagel",
}


def food_prompt(word):
    if word in PREPARED_DISH_IDS:
        return f"""
RAW product photograph of a real serving of {word},
one plate or bowl of {word} centered in frame,
natural appetizing texture and coloring, realistic ingredients,
soft diffused daylight,
neutral natural colors,
shallow depth of field,
smooth light beige background,
photographed with a professional camera lens,
natural unedited food photograph
"""
    return f"""
RAW product photograph of a real fresh {word},
one {word} centered in frame,
natural texture with subtle realistic imperfections,
soft diffused daylight,
neutral natural colors,
shallow depth of field,
smooth light beige background,
photographed with a professional camera lens,
natural unedited product photograph
"""


NATURE_SCENE_IDS = {
    "mountain", "rainbow", "cloud", "volcano", "waterfall", "desert", "river",
    "lake", "ocean", "forest", "valley", "cave", "cliff", "jungle", "swamp", "pond",
    "stream", "hill", "meadow", "wave", "comet", "galaxy", "meteor", "glacier",
}
# Space objects, not landscapes — "planet" was getting swept into the landscape
# template (which pulled toward the nearest thing it resembles: a canyon) since
# NATURE_SCENE_IDS' wide-angle-lens/daylight language has no "this is in space" signal.
SPACE_IDS = {"planet", "comet", "galaxy", "meteor"}

ISLAND_PROMPT = """
RAW aerial documentary photograph of a real island,
small landmass completely surrounded by ocean water on all sides,
seen from directly above, blue water visible on every edge,
natural daylight, neutral natural colors,
photographed with a professional wide-angle lens,
unedited aerial landscape photograph, no people, no boats
"""

SPACE_PROMPTS = {
    "planet": "a real planet in space, spherical, visible surface detail and atmosphere, floating in a starfield, black background of space",
    "comet": "a real comet in space with a bright icy nucleus and a long glowing tail, starfield background",
    "galaxy": "a real spiral galaxy in space, glowing spiral arms of stars, black background of space",
    "meteor": "a real meteor streaking across a dark night sky, bright glowing trail, stars visible in background",
}


def nature_prompt(word):
    if word == "island":
        return ISLAND_PROMPT
    if word in SPACE_IDS:
        return f"""
RAW astrophotograph of {SPACE_PROMPTS[word]},
high detail, unedited space photograph, no text, no people
"""
    if word in NATURE_SCENE_IDS:
        return f"""
RAW documentary landscape photograph of a real {word},
wide-angle nature photography, natural daylight,
neutral natural colors,
photographed with a professional wide-angle lens,
unedited landscape photograph,
no people, no buildings, no text
"""
    return f"""
RAW product photograph of a real {word},
one {word} centered in frame,
natural texture and coloring,
soft diffused daylight,
neutral natural colors,
shallow depth of field,
smooth light beige background,
photographed with a professional camera lens,
natural unedited product photograph
"""


def color_prompt(word):
    # QA finding: the fabric-swatch framing (however flat/plain) still reads as "a
    # {word} handkerchief" first and "the color {word}" second — a child sees an object,
    # not a color sample. Filling the ENTIRE frame with the color (a flat painted
    # surface, not a garment-shaped piece of fabric) makes the color itself the whole
    # subject instead of a property of some other object.
    #
    # SUPERSEDED — kept only as the CATEGORY_PROMPT_BUILDERS fallback so a build_prompt()
    # call for an unrecognized color word doesn't crash; the actual "color" category
    # images below (see CSS_HEX_COLORS / write_color_swatch) are generated as flat PIL
    # rectangles, not via this diffusion prompt at all. QA on the Standard checkpoint
    # found the "solid flat surface" framing was still not reliable: gold/silver got
    # rendered with heavy brushed-metal/foil texture instead of a flat color, and most
    # others picked up a visible directional-lighting gradient across the frame — plus
    # QA specifically asked for hex-accurate reference colors, which a diffusion model
    # can't guarantee at all (it approximates from training data, no exact color
    # control). A flat PIL fill pinned to the standard CSS4 named-color hex value sidesteps
    # every one of these at once: no texture, no gradient, and pixel-exact color.
    return f"""
RAW photograph of a solid {word} colored flat surface filling the
entire frame edge to edge, no visible object or shape, uniform
{word} color from edge to edge, no other colors, no pattern,
no texture, no fabric folds, soft even studio lighting,
natural unedited photograph
"""


# Standard CSS4 named-color hex values — see color_prompt()'s comment for why colors
# are generated this way instead of through the diffusion pipeline.
CSS_HEX_COLORS = {
    "red": "#FF0000",
    "blue": "#0000FF",
    "yellow": "#FFFF00",
    "green": "#008000",
    "purple": "#800080",
    "pink": "#FFC0CB",
    "brown": "#A52A2A",
    "black": "#000000",
    "gray": "#808080",
    "white": "#FFFFFF",
    "gold": "#FFD700",
    "silver": "#C0C0C0",
    "turquoise": "#40E0D0",
    "beige": "#F5F5DC",
    "navy": "#000080",
    "maroon": "#800000",
    "indigo": "#4B0082",
}
COLOR_SWATCH_BORDER = "#D9D4C8"  # soft neutral border, visible against light or dark UI
# QA: gold/silver as a pure flat fill read as "yellow"/"gray" rather than a metallic —
# a diagonal highlight band (the classic flat-illustration shorthand for a metallic
# sheen) keeps the exact base hex dominant while still reading as gold/silver.
METALLIC_COLORS = {"gold", "silver"}


def _add_metallic_sheen(img):
    import numpy as np

    w, h = img.size
    arr = np.asarray(img).astype(np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    # Diagonal position along the shine axis, normalized to roughly [-1, 1].
    diag = (xx + yy) / (w + h) * 2 - 1
    # A narrow bright band centered on the diagonal, softly falling off — a highlight
    # streak, not a full-frame gradient, so the base color still reads as dominant.
    band_center = -0.35
    band_width = 0.28
    highlight = np.exp(-((diag - band_center) ** 2) / (2 * band_width ** 2))
    highlight = highlight[..., None] * 55  # max brightness boost — kept low enough that
    # the base hex color still reads as dominant instead of washing out to near-white
    arr = np.clip(arr + highlight, 0, 255).astype("uint8")
    return Image.fromarray(arr)


def write_color_swatch(word_id, out_path):
    hex_color = CSS_HEX_COLORS[word_id]
    img = Image.new("RGB", (ICON_SIZE, ICON_SIZE), hex_color)
    if word_id in METALLIC_COLORS:
        img = _add_metallic_sheen(img)
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, ICON_SIZE - 1, ICON_SIZE - 1], outline=COLOR_SWATCH_BORDER, width=3)
    img.save(out_path)


def vehicle_prompt(word):
    # Side profile + explicitly plain grille/paint (not just a negative-prompt "no
    # logos") — found by QA that a 3/4 front angle reliably shows a manufacturer badge
    # on the grille even with "unbranded" in the negative prompt (this model runs at a
    # low guidance_scale for the Lightning checkpoint, which weakens negative-prompt
    # adherence far more than positive-prompt adherence).
    return f"""
RAW product photograph of a real {word},
side profile view, one {word} centered in frame,
plain unbranded paint, no manufacturer badge or emblem,
natural paint and material texture,
soft diffused daylight,
shallow depth of field,
smooth neutral background,
photographed with a professional camera lens,
natural unedited product photograph
"""


def clothing_prompt(word):
    return f"""
RAW product photograph of a real {word},
one {word} laid flat on a simple surface, centered in frame,
natural fabric texture and folds,
soft diffused daylight,
neutral studio background,
photographed with a professional camera lens,
natural unedited flat-lay product photograph
"""


def generic_object_prompt(word):
    # QA sweep found nearly every word using this builder rendering as a picture
    # framed/shadow-boxed art piece instead of the object itself — traced it to the
    # literal word "frame" in "centered in frame" (ordinary photography jargon, but the
    # model was taking it as an instruction to include a picture frame). Dropping that
    # phrase eliminated the framing bug across every word tested.
    return f"""
RAW product photograph of a real {word},
one {word} placed on a plain table,
natural material and texture,
soft diffused daylight,
neutral studio background,
shallow depth of field,
natural unedited product photograph
"""


def body_part_prompt(word):
    # QA: the previous "photograph of a real human {word}" framing at portrait distance
    # showed a fully recognizable adult face for every word — even ones with nothing to
    # do with the face — and for the joints near the torso (chin, shoulder, elbow, knee)
    # showed bare shoulders/chest. Not appropriate for a kids' app. The base negative
    # prompt already says "face" and it didn't stop any of this (weak adherence, a
    # familiar pattern) — every branch below instead crops tightly enough that a face
    # structurally can't be in frame, and where a part sits near the torso, clothing
    # covers everything except the part itself.
    if word == "teeth":
        return """
RAW extreme close-up photograph of a real human smile, showing only
the mouth and healthy white teeth, lips slightly parted, nothing
above the nose visible, no eyes, no full face, natural even skin
tone, soft diffused daylight, neutral studio background,
natural unedited photograph
"""
    # QA round 2: the first-pass "nose"/"hair" framings above still leaked an eye into
    # frame (extreme close-up on a face reliably includes the eye right next to it,
    # regardless of what the prompt asks to exclude) — needed reinforced wording plus
    # WORD_SEED_OVERRIDES. "shoulder"/"elbow" leaked bare chest/nipple the same way.
    # "knee" was the worst: five different clothed-leg framings in a row (shorts, rolled
    # trousers while sitting, fabric-crease-only while standing) each still produced
    # either underwear, a skeleton overlay, or bare-chested nudity — sitting/standing
    # poses on a bent leg have an extremely strong bias toward fashion-shoot framing on
    # this model. A kneeling-to-tie-a-shoelace pose finally broke it: it's a pose the
    # model associates with practical fully-clothed activity, not fashion, and it
    # naturally produces a sharp, clear knee bend. See WORD_SEED_OVERRIDES for all five.
    if word == "nose":
        return """
RAW extreme close-up photograph of only the tip and nostrils of a
real human nose, filling almost the entire frame, cropped so tightly
that the eyes are far outside the frame and not visible at all,
natural even skin tone, soft diffused daylight, neutral studio
background, natural unedited photograph
"""
    if word == "head":
        return """
RAW photograph of the back of a real human head, hair covering the
scalp, viewed from directly behind so no face is visible at all,
natural daylight, neutral studio background,
natural unedited photograph
"""
    if word == "hair":
        return """
RAW product photograph of a single lock of real human hair, a
small bundle of several long hair strands tied together at one end,
lying on a plain surface, no head, no face, no scalp, no person,
just the hair strands themselves, soft diffused daylight, neutral
studio background, natural unedited product photograph
"""
    if word == "chin":
        return """
RAW extreme close-up photograph of a real human chin and jawline
only, cropped tightly so the mouth is barely visible and the eyes
and nose are out of frame, natural even skin tone, soft diffused
daylight, neutral studio background, natural unedited photograph
"""
    if word == "elbow":
        return """
RAW close-up photograph of a real human arm bent at the elbow,
wearing an opaque plain short-sleeve t-shirt with the sleeve
covering the shoulder and upper arm down to just above the elbow,
only the forearm and elbow bare below the sleeve, cropped tightly so
no face and no bare shoulder are visible, natural daylight, neutral
studio background, natural unedited photograph
"""
    if word == "shoulder":
        return """
RAW close-up photograph of a real human shoulder, wearing an opaque
plain crew-neck t-shirt that fully covers the chest and torso, the
fabric visibly covering the chest with only the rounded top of the
shoulder and upper arm exposed above the sleeve line, cropped
tightly so no face, no chest skin, and no nipple are visible,
natural daylight, neutral studio background,
natural unedited photograph
"""
    if word == "knee":
        return """
RAW close-up photograph of a person kneeling on one bent knee on the
ground, tying a shoelace, wearing long opaque trousers that fully
cover both legs, a sharp fabric crease at the bent knee, no bare
skin visible anywhere, cropped tightly on just the kneeling leg,
natural daylight, neutral studio background, natural unedited photograph
"""
    return f"""
RAW photograph of a real human {word},
centered in frame, smooth healthy skin, natural even skin tone,
soft diffused daylight,
neutral studio background,
well-lit, clearly isolated,
photographed with a standard portrait lens,
natural unedited photograph
"""


SPORT_ACTIONS = {
    "soccer": "an athlete kicking a soccer ball on a grass field",
    "baseball": "an athlete swinging a baseball bat at a ball",
    "basketball": "an athlete shooting a basketball toward a hoop",
    "tennis": "an athlete swinging a tennis racket at a ball on a court",
    # QA sweep: shows a visible face despite the shared sport_prompt() "no visible
    # faces" instruction. Tried "viewed from behind, face down" and a from-behind-and-
    # below underwater framing (8 seeds total) — every one still turned the swimmer to
    # face the camera, an extremely strong bias in this checkpoint's underwater-action
    # training data (similar in kind to mole's). Best available, not a full fix.
    "swimming": "a swimmer swimming freestyle in a pool, viewed from behind and slightly above, face down in the water and not visible, mid-stroke with one arm extended forward",
    "running": "a runner sprinting on an outdoor running track",
    "skiing": "a skier skiing down a snowy slope",
    "skating": "an ice skater in casual winter clothing gliding on an indoor ice rink, ice skates clearly visible",
    "surfing": "a surfer riding a wave on a surfboard",
    "golf": "a golfer swinging a golf club on a grass course",
    "volleyball": "an athlete spiking a volleyball at a net",
    "badminton": "an athlete viewed from behind, swinging a badminton racket at a shuttlecock, back to the camera",
    "boxing": "an athlete wearing boxing gloves in a fighting stance",
    "judo": "two athletes in judo uniforms grappling during a judo match, both viewed from the side or behind with their faces turned away from the camera",
}


def sport_prompt(word):
    subject = SPORT_ACTIONS.get(word, f"an athlete playing {word}")
    return f"""
RAW action photograph of {subject},
mid-action, natural daylight,
neutral natural colors,
shallow depth of field,
photographed with a professional sports camera lens,
natural unedited photograph, no visible faces, no logos, no readable text
"""


def shape_prompt(word):
    # QA: "square" rendered as a picture-framed shadow box instead of a solid block —
    # same "centered in frame" literal-word bug found and fixed in generic_object_prompt().
    # QA sweep: square/rectangle/diamond were too similar to the "blocks" toy word —
    # both used the same wooden-block material, and a flat block face IS a square/
    # rectangle, so they read as the same object. Switching material to bright plastic
    # helped rectangle, but square/diamond still came out as a 3D cube/faceted gem —
    # "thin flat...piece" alone didn't stop 3D depth. Describing it as a flat cutout
    # fixed the 3D problem, but the word "cardboard" pulled it toward plain undyed
    # brown cardboard/paper, losing the color entirely — foam craft material keeps the
    # flat-cutout framing while avoiding that specific color association.
    return f"""
RAW product photograph of a real flat craft foam cutout shape in the
form of a {word}, made of bright vividly colored foam, paper-thin
with no three-dimensional depth or thickness, not cardboard, not
brown, not unpainted, lying flat on a table viewed from directly
above, soft diffused daylight,
neutral studio background,
photographed with a professional camera lens,
natural unedited product photograph
"""


WEATHER_SCENES = {
    "rain": "heavy rain falling on a window, many large visible water droplets and streaks running down clear glass, blurred greenery behind",
    "snow": "snow falling over a snow-covered landscape, soft visible snowflakes",
    "wind": "tall grass and tree branches bending in a strong wind",
    "storm": "a dark dramatic storm cloud over a landscape",
    "lightning": "a lightning bolt striking across a dark stormy sky",
    "thunder": "a dramatic dark thundercloud with a visible lightning flash inside it",
    "fog": "a quiet landscape blanketed in thick soft fog",
    "ice": "a smooth clear block of ice",
    "hail": "small round hailstones scattered on the ground",
    "sunshine": "warm bright sunlight streaming through green tree leaves",
    "breeze": "light curtains drifting gently in a soft breeze",
    "drizzle": "a light drizzle of fine rain against a soft grey sky",
    "frost": "delicate white frost crystals on a window pane",
    "humidity": "condensation water droplets on a cold glass surface",
}


def weather_prompt(word):
    scene = WEATHER_SCENES.get(word, word)
    return f"""
RAW documentary photograph of {scene},
natural daylight,
neutral natural colors,
photographed with a professional camera lens,
natural unedited photograph,
no people
"""


def place_prompt(word):
    return f"""
RAW documentary photograph of a real {word},
wide-angle scene, natural daylight,
neutral natural colors,
photographed with a professional wide-angle lens,
natural unedited photograph,
no visible people, no readable signage
"""


CATEGORY_PROMPT_BUILDERS = {
    "animal": animal_prompt,
    "food": food_prompt,
    "nature": nature_prompt,
    "color": color_prompt,
    "vehicle": vehicle_prompt,
    "clothing": clothing_prompt,
    "household": generic_object_prompt,
    "school": generic_object_prompt,
    "weather": weather_prompt,
    "bodyPart": body_part_prompt,
    "toy": generic_object_prompt,
    "sport": sport_prompt,
    "instrument": generic_object_prompt,
    "shape": shape_prompt,
    "place": place_prompt,
}


# Per-word overrides for cases the category template gets wrong even after tuning: the
# generic "fresh {word}" framing for lettuce reliably comes out looking like cabbage (a
# round head, not lettuce's loose upright leaves); "shrimp" without more guidance reads
# as a front-facing bug-like creature instead of its familiar curved-body silhouette;
# "worm" curled into a ring reads as a caterpillar and picks up green segmented texture
# instead of a smooth pink-brown earthworm. Found via visual QA — add more entries here
# as spot-checking turns up further specific failures.
WORD_PROMPT_OVERRIDES = {
    "bat": """
RAW wildlife photograph of a real bat in flight,
wings fully spread showing their membrane shape, side view,
natural fur texture, dark night sky background, soft flash lighting,
unedited documentary nature photograph
""",
    "walrus": """
RAW wildlife photograph of a real walrus,
side profile view, entire body visible from head to tail,
long visible tusks, natural wrinkled skin texture, resting on ice,
soft diffused daylight, unedited documentary nature photograph
""",
    "otter": """
RAW wildlife photograph of a real otter lying on a rock,
side profile view, full body stretched out from head to long tail,
natural wet fur texture, soft diffused daylight,
unedited documentary nature photograph
""",
    "platypus": """
RAW wildlife photograph of a real platypus,
side profile view, entire body visible, distinctive flat duck-like
bill clearly visible, flat wide tail, webbed feet, natural brown
fur texture, resting on a riverbank,
soft diffused daylight, unedited documentary nature photograph
""",
    "crocodile": """
RAW wildlife photograph of a real crocodile's head from the side,
long narrow V-shaped snout with a visible fourth tooth jutting up
outside the closed jaw, natural scale texture,
soft diffused daylight, unedited documentary nature photograph
""",
    # QA found the mouth kept rendering open with teeth showing despite the prompt
    # already saying "closed jaw, no teeth" — the earlier wording apparently wasn't
    # forceful enough against this model's strong "reptile with open mouth and teeth"
    # training bias. Paired with a seed override below.
    "alligator": """
RAW wildlife photograph of a real alligator's head from the side,
mouth fully closed, short wide flat rounded U-shaped snout much
wider than a crocodile's snout, no teeth visible anywhere,
natural dark scale texture, soft diffused daylight,
unedited documentary nature photograph
""",
    # Japanese tree sparrow (スズメ) specifically, not the house sparrow — the
    # chestnut-brown cap and black cheek patch are its distinguishing field marks.
    "sparrow": """
RAW wildlife photograph of a real Japanese tree sparrow,
side profile view, entire body visible, perched on a branch,
chestnut brown cap, black patch on white cheek, black bib,
soft diffused daylight, unedited documentary nature photograph
""",
    # Japanese red-crowned crane (タンチョウ) — the culturally iconic crane in Japan,
    # not a generic heron-like wading bird. Re-worded after a QA flag even though the
    # species framing was already correct — spells out the red crown as a small
    # circular patch (not spiky head plumes, which an earlier render drifted toward).
    "crane": """
RAW wildlife photograph of a real Japanese red-crowned crane,
side profile view, entire body clearly visible, standing in snow,
pure white body plumage, black wing feathers, one small bright red
circular bald patch on the crown of the head, long black stripe
down the neck, soft diffused daylight,
unedited documentary nature photograph
""",
    # QA sweep: read as a hedgehog. A hedgehog's spines are short and cover a small
    # round curled-up body; spelling out that size/shape contrast (and adding it to the
    # negative) pushes away from that reading.
    "porcupine": """
RAW wildlife photograph of a real porcupine, full body visible, not
curled up, very long thick black-and-white banded quills much
longer than the animal's head, quills far longer than a hedgehog's
short spines, natural coloring, soft diffused daylight,
unedited documentary nature photograph
""",
    # QA sweep: too tight a crop on the head/neck made it indistinguishable from an emu
    # or rhea — an ostrich's most recognizable trait is its huge body on very long bare
    # legs, which needs the whole animal in frame to read.
    "ostrich": """
RAW wildlife photograph of a real adult ostrich, full body visible
from head to feet, standing on very long bare legs, small head on a
long neck, large round body covered in black and white feathers,
natural savanna ground, soft diffused daylight,
unedited documentary nature photograph
""",
    # QA sweep: rendered with no visible tail at all — a scorpion's defining feature is
    # its segmented tail arching up over its back ending in a stinger, which needs to be
    # spelled out explicitly or it gets dropped.
    "scorpion": """
RAW macro wildlife photograph of a real scorpion viewed from above,
a pair of large pincer claws in front, eight legs, and a long
segmented tail curving up and over its back ending in a sharp
pointed stinger, the tail and stinger clearly visible, natural dark
coloring, soft diffused daylight, unedited documentary nature photograph
""",
    # QA sweep: rendered as an ordinary iridescent green jewel beetle held in a hand in
    # daylight, no glow at all — the defining feature (bioluminescence at night) needs
    # much stronger, more literal wording, and the scene needs to structurally rule out
    # daylight/a person entirely rather than just naming "dusk". QA specifically wants a
    # Japanese Genji firefly (ゲンジボタル).
    "firefly": """
RAW long-exposure wildlife photograph taken outdoors at night in
near-total darkness, a real Japanese Genji firefly in flight, small
soft-bodied dark brown beetle, its abdomen tip glowing brightly with
vivid yellow-green bioluminescent light, the glowing light the only
light source in the completely black night scene, no daylight, no
hand, no person, unedited documentary nature photograph
""",
    "squid": """
RAW underwater wildlife photograph of a real squid, side profile
view, long torpedo-shaped mantle with only two small triangular fins
near the tail tip, not a large fish-like tail fin, ten distinct
tentacles and arms with visible round suckers trailing from the
head end, natural translucent skin, soft diffused light through
water, unedited documentary nature photograph
""",
    # QA sweep: still rendered with prominent visible eyes and rat-like ears no matter
    # how the prompt asked to hide them — tried "no visible eyes", "eyes hidden under
    # fur", a nose-buried-in-soil framing, and finally a from-above-behind framing where
    # the face structurally shouldn't be visible at all (16 seeds across these 4
    # attempts) — every one still turned the mole to face the camera with visible eyes.
    # Best available, not a full fix; see WORD_SEED_OVERRIDES below.
    "mole": """
RAW macro wildlife photograph of a real mole seen from directly
above and behind as it digs forward into soil, only its back, dark
velvety fur, and huge broad shovel-like front paws visible, its head
and face pointed away from the camera into the dirt and completely
out of view, small compact body, soft diffused daylight,
unedited documentary nature photograph
""",
    "grape": """
RAW product photograph of a real bunch of grapes,
one full cluster of many grapes hanging together, on the vine,
natural texture with a light dusty bloom, soft diffused daylight,
neutral studio background, natural unedited product photograph
""",
    # "product photograph of a whole melon" kept rendering it cut open regardless of
    # negative prompting (strong training bias toward cut-open melon food photography) —
    # reframing it as a garden/vine photograph instead of product photography avoided
    # that association entirely. QA sweep: also wants the distinctive rough netted skin
    # of a Japanese Yubari-style melon, not smooth skin.
    "melon": """
RAW documentary photograph of a whole melon growing on a vine in a
garden, intact rind covered in a rough raised netted pattern like a
cantaloupe, resting on soil among green leaves,
natural outdoor daylight, unedited garden photograph
""",
    # The generic "romaine lettuce" fix for the food template doesn't apply here — this
    # needed its own scene since a plain "bunch of noodles" rendered as an unrecognizable
    # abstract blur.
    "noodles": """
RAW product photograph of a real serving of noodles,
a coiled tangled bunch of long noodles piled on a plate,
visible individual strands, natural texture, soft diffused daylight,
neutral studio background, natural unedited food photograph
""",
    # Kewpie mayonnaise's red-capped, clear soft squeeze bottle with a diamond-quilted
    # texture is the culturally standard "mayonnaise" reference in Japan. QA found the
    # label kept rendering as garbled fake brand text no matter how the prompt asked for
    # a blank/unlabeled one (tried "blank plain white label" and "no label at all", both
    # still produced fake text — a strong training bias for a labeled design on this
    # bottle shape). Framing the shot as an extreme close-up on the cap and shoulder
    # instead pushes the label out of frame entirely, sidestepping the problem rather
    # than fighting it. See WORD_SEED_OVERRIDES — seed 42 was the only one of several
    # tried that kept the label fully out of frame.
    "mayonnaise": """
RAW product photograph of a real soft squeeze mayonnaise bottle,
extreme close-up on the cap and shoulder of the bottle, soft narrow
spouted red cap in sharp focus, clear plastic bottle with diamond
quilted texture showing the creamy mayonnaise inside, very shallow
depth of field, lower half of the bottle softly out of focus and
blurred, standing upright, soft diffused daylight
""",
    # QA sweep: rendered as an odd top-down spiral-embossed vase shape, not recognizable
    # as a ketchup bottle at all. The same close-crop-on-the-cap trick used for
    # mayonnaise (which sidesteps this model's garbled-label bias entirely) applies here.
    "ketchup": """
RAW product photograph of a real plastic squeeze ketchup bottle,
extreme close-up on the cap and shoulder of the bottle, red plastic
squeeze bottle with a white flip-top cap in sharp focus, very
shallow depth of field, lower half of the bottle softly out of focus
and blurred, standing upright, soft diffused daylight
""",
    # Long, slender, dark green, bumpy-skinned Asian/Japanese cucumber (kyuri) rather
    # than a short bumpy Western cucumber. QA found it still rendering too short/stubby
    # (closer to a Western pickling cucumber) — spelled out a length ratio and added a
    # matching negative to push it further from that shape.
    "cucumber": """
RAW product photograph of a real whole Japanese cucumber,
very long and slender, at least four times longer than it is wide,
uniform width along its whole length, dark green bumpy skin, one
whole cucumber centered in frame, soft diffused daylight,
neutral studio background, natural unedited product photograph
""",
    # "top" the toy (a spinning top) needs disambiguating from "top" the generic word —
    # the plain toy_prompt rendered it as a picture frame instead.
    "top": """
RAW product photograph of a real wooden spinning top toy,
classic cone shape with a pointed tip and a hand grip on top,
colorful painted stripes, standing upright, centered in frame,
soft diffused daylight, neutral studio background,
natural unedited product photograph
""",
    # QA sweep: same fixes as square/rectangle/diamond in shape_prompt() — flat
    # cutout instead of a wooden block (which reads as "blocks" the toy), and dropped
    # "centered in frame" (the literal word "frame" was rendering this as a bowl/dish —
    # the same bug fixed in generic_object_prompt()/shape_prompt()). "cardboard cutout"
    # itself then pulled toward plain undyed brown cardboard, losing the color — foam
    # craft material avoids that specific association.
    "oval": """
RAW product photograph of a real flat craft foam cutout shape in the
form of an oval ellipse, made of bright vividly colored foam,
paper-thin with no three-dimensional depth or thickness, not a bowl
or dish, not cardboard, not brown, not unpainted, lying flat on a
table viewed from directly above, soft diffused daylight,
neutral studio background, natural unedited product photograph
""",
    "lettuce": """
RAW product photograph of a fresh head of romaine lettuce,
long upright pale green leaves, whole head standing upright,
side view, natural texture, soft diffused daylight, neutral
studio background, unedited product photograph
""",
    "shrimp": """
RAW underwater wildlife photograph of a real shrimp,
side profile view showing its curved C-shaped body and small legs,
translucent pale body, soft diffused light through water,
shallow depth of field, unedited documentary nature photograph
""",
    "worm": """
RAW macro wildlife photograph of a real earthworm,
stretched out straight, entire elongated body visible from the side,
smooth pink-brown segmented skin, no legs, on soil,
soft diffused daylight, unedited documentary nature photograph
""",
    # Emergency-vehicle text/branding turned out extremely hard to suppress for this
    # word specifically — every seed tried with the general vehicle_prompt() template
    # rendered garbled fake lettering and/or a visible grille badge (tried: 5+ seeds,
    # a higher guidance_scale, a "die-cast toy" reframing — all still showed text).
    # This exact wording + WORD_SEED_OVERRIDES below is the one combination that came
    # out clean; kept as a hardcoded pair rather than left to the general template.
    "ambulance": """
RAW product photograph of a real ambulance,
one ambulance centered in frame, plain unbranded grille with
no manufacturer emblem, plain white body with only a simple red
cross symbol and no other markings, natural paint texture,
soft diffused daylight, shallow depth of field, smooth neutral
background, natural unedited photograph
""",
    # The generic shape_prompt rendered this as a 6- or 8-sided shape almost every time —
    # even spelling out "five straight edges" explicitly wasn't reliable across seeds.
    # Anchoring it to a concrete, well-known pentagon-shaped real object (a baseball home
    # plate) worked far better, though still not on every seed — this exact wording is
    # paired with WORD_SEED_OVERRIDES below, the one combination confirmed correct by eye.
    "pentagon": """
RAW product photograph of a real solid painted wooden pentagon shape block,
shaped exactly like a baseball home plate, a flat bottom, two straight
angled sides, and a pointed top forming five straight edges total,
centered in frame, natural wood grain through matte paint,
soft diffused daylight, neutral studio background,
natural unedited product photograph
""",
    # "river" and "stream" both fell into nature_prompt()'s shared generic landscape
    # template ("a real {word}, wide-angle nature photography...") with nothing to tell
    # the model they're different scales of the same thing — both rendered as visually
    # near-identical narrow forest creeks, indistinguishable to a child. Anchored each to
    # an explicit, opposite scale cue instead.
    "river": """
RAW documentary landscape photograph of a real wide river,
a broad, substantial river much wider than a person could jump across,
calm open water, visible riverbanks on both sides, flowing through an
open landscape, wide-angle nature photography, natural daylight,
neutral natural colors, unedited landscape photograph,
no people, no buildings, no boats, no text
""",
    "stream": """
RAW documentary landscape photograph of a real small narrow stream,
a thin trickling brook barely a step wide, shallow clear water running
over visible pebbles, meandering through a green meadow,
wide-angle nature photography, natural daylight, neutral natural colors,
unedited landscape photograph, no people, no buildings, no text
""",

    # --- 2026-09 image review round: entries below fix specific issues a full
    # visual QA pass flagged on the already-deployed images (see the word-pronunciation
    # session's image review artifact) — grouped by category, each with a short note on
    # what was wrong before.

    # ANIMALS
    "sloth": """
RAW wildlife photograph of a real sloth hanging from a tree branch,
side profile view, entire body visible, long curved sharp claws
clearly visible gripping the branch, natural shaggy fur texture,
soft diffused daylight, unedited documentary nature photograph
""",
    # QA: rendered small enough to read as a wallaby, not a kangaroo specifically.
    "kangaroo": """
RAW wildlife photograph of a real large adult kangaroo standing
upright, side profile view, entire body visible, thick powerful
muscular hind legs, long thick tail, tall body clearly larger and
more heavily built than a wallaby, natural fur texture, standing
outdoors, soft diffused daylight, unedited documentary nature photograph
""",
    # QA: number of arms read as unnatural — a top-down view (not side profile) is what
    # actually shows a starfish's five-arm shape clearly.
    "starfish": """
RAW underwater wildlife photograph of a real starfish,
seen from directly above, exactly five arms clearly visible in a
star shape, natural bumpy textured skin, resting on sand,
soft diffused light through water, unedited documentary nature photograph
""",
    # QA: shape unclear — a stingray's flat diamond body only reads clearly from directly
    # above, not the side-profile framing every other MARINE_IDS entry uses. QA sweep
    # also found the "over sand... light through water" wording ambiguous enough that it
    # got rendered beached on dry sand instead of submerged — spelled out visible water
    # covering it explicitly.
    "stingray": """
RAW underwater wildlife photograph of a real stingray, taken from
below the water's surface looking down, fully submerged underwater
swimming just above a sandy sea floor, its flat diamond-shaped body
and long thin tail clearly visible, water clearly visible all around
it, natural skin texture, soft diffused light through water,
unedited documentary nature photograph
""",
    "seal": """
RAW wildlife photograph of a real seal resting on a rock,
side profile view, entire body clearly visible from head to tail,
smooth rounded torpedo-shaped body, natural wet fur texture,
soft diffused daylight, unedited documentary nature photograph
""",
    # QA: wants the Malayan tapir specifically — its signature two-tone black-and-white
    # "saddle" pattern is the single most identifying feature. The first attempt at
    # spelling this out ("front half black, back half white") still came out uniformly
    # dark with no pattern at all — describing it as two blankets draped over the body
    # (rather than just naming the two colored halves) got a clear black/white contrast
    # on the best of 4 seeds tried, though still not the crisp saddle boundary real
    # Malayan tapirs have — best available, not a full fix. See WORD_SEED_OVERRIDES.
    "tapir": """
RAW wildlife photograph of a real Malayan tapir standing outdoors,
side profile view, entire body visible, the front half of the body
painted solid black like a saddle blanket, the back half of the
body painted solid white like a blanket draped over its rear, a
sharp straight-line boundary between the black front and white back,
short flexible trunk-like snout, soft diffused daylight,
unedited documentary nature photograph
""",
    "peacock": """
RAW wildlife photograph of a real peacock with its tail fully
fanned open and upright, showing the full spread of iridescent
blue-green tail feathers covered in eye-spot patterns, standing
outdoors, soft diffused daylight, unedited documentary nature photograph
""",
    "hummingbird": """
RAW wildlife photograph of a real hummingbird hovering in mid-air
near a flower, side profile view, entire body visible, wings a
soft motion blur from rapid flapping, iridescent feather texture,
soft diffused daylight, unedited documentary nature photograph
""",
    "vulture": """
RAW wildlife photograph of a real vulture perched on a dry branch,
side profile view, entire body visible, dry African savanna
landscape background with sparse dry grass and open sky, natural
feather texture, soft diffused daylight, unedited documentary nature photograph
""",

    # FOOD
    "hotdog": """
RAW product photograph of a real hotdog in a bun,
topped with visible lines of ketchup and yellow mustard,
one hotdog centered in frame, natural appetizing texture,
soft diffused daylight, neutral natural colors, shallow depth of
field, smooth light beige background, natural unedited food photograph
""",
    "rice": """
RAW product photograph of a real full bowl of steamed white rice,
a generous mounded serving filling the bowl, many individual
grains visible, natural texture, soft diffused daylight,
neutral studio background, natural unedited food photograph
""",
    # QA: rendered as the pepper fruit/plant rather than the ground table condiment.
    "pepper": """
RAW product photograph of a real pepper shaker filled with ground
black pepper, coarsely ground black pepper visible through clear
glass, standing upright, centered in frame, soft diffused daylight,
neutral studio background, natural unedited product photograph
""",
    # QA: wants a Japanese-style rolled omelette (tamagoyaki), not a Western folded
    # omelette. Round 2's regen added a visible ham/tomato filling that isn't part of
    # tamagoyaki — plain egg only, no filling, fixes that.
    "omelette": """
RAW product photograph of a real Japanese tamagoyaki rolled omelette,
plain egg only with no filling inside, sliced crosswise into round
pieces showing swirled golden-yellow egg layers, on a plate, natural
appetizing texture, soft diffused daylight, neutral natural colors,
smooth light beige background, natural unedited food photograph
""",
    "tea": """
RAW product photograph of a real cup of hot green tea,
visible steam rising, in a traditional Japanese ceramic teacup
with no handle, soft diffused daylight, neutral studio background,
natural unedited product photograph
""",
    "coffee": """
RAW product photograph of a real cup of coffee in a coffee mug
with a handle, viewed from a clear three-quarter angle showing
both the cup and the coffee inside, soft diffused daylight,
neutral studio background, natural unedited product photograph
""",
    # QA: wants Japan's "ramune" style soda specifically, with its distinctive marble-neck
    # bottle and visible carbonation. In practice this model could not render the marble
    # at all — 20 seeds tried across four framings (plain description, "Codd-neck bottle"
    # terminology, an extreme macro crop on just the neck) and none showed it; "Codd-neck"
    # even backfired by embossing the literal word "Codd" as fake branding, and the macro
    # crop produced abstract water-droplet texture with no bottle shape at all. Settled for
    # this framing + WORD_SEED_OVERRIDES below, which reliably gives a clean, correctly
    # shaped glass soda bottle with visible carbonation and no garbled embossed text — the
    # closest available, missing only the marble.
    # QA sweep: read as plain water — the clear/colorless soda plus faint bubbles
    # wasn't enough of a visual cue. A distinctly colored soda (a common ramune flavor)
    # with clearly rising bubble streams reads unambiguously as a fizzy drink.
    "soda": """
RAW product photograph of a real Japanese ramune soda bottle,
distinctive round glass bottle with a visible glass marble trapped
in the narrow neck, plain unlabeled glass with no engraving or
embossed writing anywhere, bright blue colored soda visible inside
with many clearly rising carbonation bubble streams, standing
upright, soft diffused daylight, neutral studio background,
natural unedited product photograph
""",
    "bean": """
RAW product photograph of a small pile of real dried soybeans,
many individual beans visible, natural texture and coloring,
soft diffused daylight, neutral natural colors, shallow depth of
field, smooth light beige background, natural unedited product photograph
""",
    # QA: wants the premium Japanese Satonishiki cherry variety specifically — bright
    # glossy red, always shown in a joined pair with its stem.
    "cherry": """
RAW product photograph of a real pair of Satonishiki cherries
joined by their stems, bright glossy red skin, natural texture,
soft diffused daylight, neutral natural colors, shallow depth of
field, smooth light beige background, natural unedited product photograph
""",
    # QA: wants a Thai mango variety specifically, whole and uncut. The studio product-
    # shot framing had the same strong cut-open bias papaya had (still showed a bitten/
    # split mango despite "no cuts, no bite marks") — the same fix as papaya (show it
    # still on the tree) broke the bias, 4/4 seeds whole.
    "mango": """
RAW photograph of ripe Thai mangoes still hanging from a mango tree
branch, whole intact fruit attached to the tree by its stem, smooth
uncut golden-yellow skin, tropical green leaves in background,
natural daylight, unedited documentary photograph
""",
    # QA: wants a whole, uncut papaya. The default studio product-shot framing had an
    # extremely strong bias toward showing papaya cut open (14/14 seeds across three
    # studio framings — plain, market-crate pair, single-fruit-only — still split it open
    # to reveal the seeds, since that's how papaya is almost always photographed).
    # Switching the context to the fruit still hanging on its tree broke the bias
    # entirely (5/6 seeds came out whole) — paired with WORD_SEED_OVERRIDES below.
    "papaya": """
RAW photograph of ripe papaya fruits still hanging from a papaya
tree trunk, whole intact fruit attached to the tree by its stem,
smooth yellow-orange skin, tropical green leaves in background,
natural daylight, unedited documentary photograph
""",
    # QA: wants the Japanese Kiyou (貴陽) plum variety specifically — notably large,
    # bright crimson-red skin (not the darker purple-red of a generic sumomo).
    "plum": """
RAW product photograph of a real large Japanese Kiyou plum,
round shape, smooth bright crimson-red skin, one whole large plum
centered in frame, natural texture, soft diffused daylight, neutral
natural colors, shallow depth of field, smooth light beige background,
natural unedited product photograph
""",

    # NATURE
    "flower": """
RAW product photograph of a real flower in full bloom,
natural smooth petal shapes and texture, one flower centered in
frame, soft diffused daylight, neutral natural colors, shallow
depth of field, smooth light beige background, natural unedited product photograph
""",
    # QA: an incidental lake in the background was distracting from the mountain itself.
    # "no lake or body of water in the scene" alone wasn't enough — the model kept adding
    # one anyway (weak negative-prompt adherence, same pattern as alligator/mayonnaise).
    # Naming a specific dry terrain (rocky slopes and scree) instead of just negating
    # water gave the model something concrete to fill the foreground with — paired with
    # WORD_SEED_OVERRIDES below, 8/8 seeds tried came out lake-free.
    "mountain": """
RAW documentary landscape photograph of a real mountain peak, dry
rocky slopes and scree, clear sky in the background, no lake, no
river, no pond, no water of any kind in the scene, wide-angle nature
photography, natural daylight, neutral natural colors,
unedited landscape photograph, no people, no buildings, no text
""",
    "grass": """
RAW documentary photograph of a real lush patch of green grass,
dense thick grass filling most of the frame, natural texture,
soft diffused daylight, neutral natural colors,
natural unedited photograph, no people
""",
    # QA: a spiral shell read as a snail shell, not "seashell" — a bivalve (clam/scallop)
    # shape is the more universally recognized "seashell" silhouette.
    "seashell": """
RAW product photograph of a real bivalve seashell,
a single open scallop or clam shell showing its ridged fan shape,
natural texture and coloring, soft diffused daylight,
neutral studio background, natural unedited product photograph
""",
    # QA: wants playground sand specifically, not beach sand.
    "sand": """
RAW documentary photograph of real light tan playground sand,
loose fine sand filling the frame, natural texture,
soft diffused daylight, natural unedited photograph, no people
""",
    "forest": """
RAW documentary landscape photograph of a real old-growth primary
forest, tall mature trees, dense natural canopy, wide-angle nature
photography, natural daylight, neutral natural colors,
unedited landscape photograph, no people, no buildings, no text
""",
    # QA sweep: rendered as a dried decorative branch arrangement on a table, not
    # recognizable as a plant root — needed the root shown actually emerging from soil.
    "root": """
RAW documentary photograph of a real plant's roots exposed at the
base of its stem, pale branching root system visible where it meets
dark soil, growing in the ground, natural daylight, neutral natural
colors, unedited nature photograph, no people
""",
    # QA: the previous render looked like a beach, not the open ocean itself.
    "ocean": """
RAW documentary landscape photograph of the real open ocean,
wide expanse of deep blue open water with gentle waves, no visible
shore or beach in frame, wide-angle nature photography, natural
daylight, neutral natural colors, unedited landscape photograph,
no people, no boats, no text
""",

    # VEHICLES
    # QA: wants a Japanese commuter train aesthetic — a modern electric multiple unit,
    # not a generic/Western-style train.
    "train": """
RAW product photograph of a real Japanese commuter electric train,
modern multiple-unit train car, side profile view, plain unbranded
paint with no readable text, natural material texture,
soft diffused daylight, shallow depth of field, smooth neutral
background, natural unedited product photograph
""",
    "submarine": """
RAW product photograph of a real submarine underwater,
side profile view, entire hull visible, surrounded by blue ocean
water, natural material texture, soft diffused light through
water, natural unedited underwater photograph
""",
    # QA sweep: rendered as a confusing broken-looking toy model kit with scattered
    # panel lines, not clearly a spaceship.
    "spaceship": """
RAW product photograph of a real sleek futuristic spaceship model,
entire spacecraft visible, smooth streamlined metallic hull, small
viewport windows, standing on display against a dark starry
background, soft dramatic lighting, natural unedited product photograph
""",
    "rocket": """
RAW product photograph of a real space rocket standing upright on
a launch pad, entire rocket visible, launch tower structure beside
it, natural material texture, daylight, natural unedited photograph
""",
    "tram": """
RAW product photograph of a real tram running on street-level
rails, side profile view, plain unbranded paint with no readable
text, urban street setting, natural material texture,
soft diffused daylight, natural unedited photograph
""",
    # QA: wants it visibly on the ocean. The "product photograph, water spray around it"
    # framing (originally meant to keep it moving/dynamic) pulled it onto a plain studio
    # background every time, and switching to an action shot on real water (see script
    # history) put a rider on it every time instead — a strong bias, jet skis are almost
    # never photographed unridden mid-action. A parked/docked framing broke both biases
    # at once: real ocean water, no rider, on all 6 seeds tried.
    "jet ski": """
RAW photograph of a real jet ski parked and floating empty at a
dock, side profile view, entire jet ski visible, blue ocean water
around it, no one aboard, empty seat, sunny daylight,
natural unedited photograph
""",
    "kayak": """
RAW product photograph of a real kayak floating on a calm lake,
side profile view, entire kayak visible, still water and shoreline
in the background, natural material texture, soft diffused
daylight, natural unedited photograph, no people
""",
    "canoe": """
RAW product photograph of a real canoe floating on a calm lake,
side profile view, entire canoe visible, still water and shoreline
in the background, natural material texture, soft diffused
daylight, natural unedited photograph, no people
""",
    "subway": """
RAW product photograph of a real subway train stopped at an
underground subway station platform, side profile view, plain
unbranded paint with no readable text, natural material texture,
station lighting, natural unedited photograph, no people
""",
    # QA: wants it visibly climbing a mountain slope. The "product photograph" framing
    # (used for the other vehicles) pulled it onto a plain studio background every time,
    # dropping the mountain context. Switching to "documentary photograph" and describing
    # the mountainside filling the frame fixed it on all 6 seeds tried — see
    # WORD_SEED_OVERRIDES below.
    "cable car": """
RAW documentary photograph of a real cable car gondola climbing a
steep mountain slope on its cable, entire cable car visible, rocky
mountain slope filling the background, cable line visible extending
up the mountainside, daylight, natural unedited photograph, no people
""",
    "hot air balloon": """
RAW product photograph of a real hot air balloon floating high in
the sky, entire balloon and basket visible, colorful balloon
envelope, blue sky background, soft diffused daylight,
natural unedited photograph, no people
""",

    # CLOTHING / HOUSEHOLD / SCHOOL
    # QA: rendered too plain/colorless.
    "shirt": """
RAW product photograph of a real colorful patterned shirt,
one shirt laid flat on a simple surface, centered in frame,
vivid natural color and pattern, natural fabric texture and folds,
soft diffused daylight, neutral studio background,
natural unedited flat-lay product photograph
""",
    "shoes": """
RAW product photograph of a real pair of sneakers,
side profile view, both sneakers centered in frame,
natural fabric and rubber texture, soft diffused daylight,
neutral studio background, natural unedited product photograph
""",
    "scarf": """
RAW product photograph of a real knitted wool scarf,
long knitted texture clearly visible, loosely coiled on a simple
surface, centered in frame, soft diffused daylight,
neutral studio background, natural unedited flat-lay product photograph
""",
    "umbrella": """
RAW product photograph of a real open umbrella in falling rain,
entire umbrella visible, visible raindrops around it,
natural fabric texture, soft diffused daylight,
natural unedited photograph, no people
""",
    "toilet": """
RAW product photograph of a real toilet with its lid closed,
side profile view, entire toilet visible, natural ceramic texture,
soft diffused daylight, neutral studio background,
natural unedited product photograph
""",
    # QA: previous render looked like a decorative cushion, not a bed pillow.
    "pillow": """
RAW product photograph of a real rectangular bed pillow,
plain white pillowcase, soft puffy filled shape, centered in
frame, natural fabric texture, soft diffused daylight,
neutral studio background, natural unedited product photograph
""",
    "book": """
RAW product photograph of a real closed book standing upright,
visible front cover with a plain solid-color cover and no readable
text, natural paper and cover texture, soft diffused daylight,
neutral studio background, natural unedited product photograph
""",
    # QA: wants a clean modern laptop look (referencing a MacBook), not a bulky old
    # desktop tower. "plain unbranded lid" alone didn't stop a fake brand logo from
    # rendering on the bezel below the screen (12 seeds tried, every one had some kind
    # of garbled logo there — a strong bias, laptop bezels almost always carry a brand
    # in training photos). Cropping the shot so that bezel strip is out of frame entirely
    # (paired with WORD_SEED_OVERRIDES below) sidesteps it while keeping the screen and
    # keyboard both clearly visible.
    "computer": """
RAW product photograph of a real modern silver laptop computer, open
at a natural angle, tight close-up crop showing only the upper
screen area and the keyboard, the thin hinge bezel strip between them
cropped out of frame and not visible, plain unbranded brushed metal,
screen showing a plain blue desktop background, soft diffused
daylight, neutral studio background,
natural unedited product photograph
""",
    # QA sweep: rendered as colored pencils (wooden, pointed graphite-style tip) instead
    # of wax crayons — spelling out the wax-stick shape and explicitly ruling out wood/
    # pencil features fixes the mix-up.
    "crayon": """
RAW product photograph of a real set of many colorful wax crayons, a
dozen or more short thick cylindrical wax sticks in different bright
colors arranged together, smooth rounded blunt tips, no wood, not
pencils, natural wax texture, soft diffused daylight, neutral
studio background, natural unedited product photograph
""",

    # ROUND 2 — QA sweep of the ~80 no-note flagged words. Several of these are
    # ambiguous single words (nail/iron/pot/recorder each have an unrelated common
    # meaning) that generic_object_prompt()/instrument builder can't disambiguate on
    # their own — they need the specific real-world object spelled out.
    "nail": """
RAW product photograph of a single real metal hardware nail, made of
steel with a flat round head and a sharp pointed tip, plain bare
metal, lying on a plain wooden surface, soft diffused daylight,
neutral studio background, natural unedited product photograph
""",
    "iron": """
RAW product photograph of a real clothes iron for ironing clothing,
a household appliance with a flat metal soleplate, a handle on top,
and a power cord, standing upright on its heel, soft diffused
daylight, neutral studio background, natural unedited product photograph
""",
    "pot": """
RAW product photograph of a real metal cooking pot, a round pot with
two small side handles, used for cooking on a stove, sitting empty
on a plain surface, soft diffused daylight, neutral studio
background, natural unedited product photograph
""",
    "vacuum": """
RAW product photograph of a real upright vacuum cleaner, the entire
appliance visible from the floor nozzle up to the handle, a
household cleaning appliance, standing upright, soft diffused
daylight, neutral studio background, natural unedited product photograph
""",
    "ball": """
RAW product photograph of a real bouncy rubber toy ball, smooth
round bright solid-colored rubber, a child's playground ball, soft
diffused daylight, neutral studio background, natural unedited
product photograph
""",
    "slide": """
RAW documentary photograph of a real playground slide, a tall metal
or plastic slide with steps or a ladder leading up to a platform and
a sloped chute going down, entire structure visible, natural
daylight, neutral natural colors, natural unedited photograph,
no visible people, no readable signage
""",
    "recorder": """
RAW product photograph of a real wooden recorder musical instrument,
a simple woodwind flute-like instrument with finger holes along a
straight tube and a mouthpiece at the top end, standing upright,
soft diffused daylight, neutral studio background, natural unedited
product photograph
""",
    "tambourine": """
RAW product photograph of a real tambourine, a round hand drum frame
with pairs of small jingling metal discs set into the rim all the
way around, the metal discs clearly visible, soft diffused daylight,
neutral studio background, natural unedited product photograph
""",
    # QA sweep: rendered as an old antique leather-bound novel with foreign gothic
    # script, not recognizable as a modern school textbook.
    "textbook": """
RAW product photograph of a real modern school textbook, a thick
paperback book with a colorful printed cover showing simple shapes
and no readable text, lying flat, soft diffused daylight, neutral
studio background, natural unedited product photograph
""",
    # QA sweep: rendered as a chalk pastel stick / lipstick tube, not recognizable as a
    # modern felt-tip marker pen.
    "marker": """
RAW product photograph of a real modern felt-tip marker pen, a
cylindrical plastic barrel with its cap posted on the opposite end,
bright solid plastic color, no readable text or logo, lying on a
plain surface, soft diffused daylight, neutral studio background,
natural unedited product photograph
""",
    # QA: wants Japanese school stationery specifically. A liquid-glue squeeze bottle
    # also kept rendering fake garbled brand text on its label no matter how the prompt
    # asked for a blank one (same pattern as mayonnaise/soda). Japan's common school
    # glue (のり) is a solid twist-up glue stick, not a liquid bottle — switching to that
    # shape sidesteps the label problem entirely since a glue stick has no wide label
    # surface the model wants to fill in with fake text.
    "glue": """
RAW product photograph of a real Japanese school glue stick, a solid
twist-up glue stick similar to a large lip balm tube, cap removed
and set beside it, a small amount of solid white glue visible
extended from the tip, plain unbranded white plastic tube, soft
diffused daylight, neutral studio background, natural unedited
product photograph
""",
    # QA: wants Japanese school stationery specifically — a standard cylindrical stick
    # of blackboard chalk, not a rustic soap-like block.
    "chalk": """
RAW product photograph of a few real cylindrical sticks of white
blackboard chalk, standard thin round chalk sticks used in a
Japanese classroom, some chalk dust scattered nearby, soft diffused
daylight, neutral studio background, natural unedited product photograph
""",

    # PLACES
    # QA: animals were too small to make out. "wide-angle scene" was working against
    # "in the foreground" — dropping the wide-angle framing and saying the animals should
    # fill a big part of the frame instead got them clearly large and close on all 6
    # seeds tried (paired with WORD_SEED_OVERRIDES below).
    # QA sweep: an extreme close-up on a single animal made this indistinguishable from
    # a wildlife photo — lost the "zoo" context entirely (just looked like "tiger").
    # Two or more animals plus a clearly visible fence/enclosure keeps them large while
    # still reading as a zoo, not just an animal portrait.
    "zoo": """
RAW documentary photograph of a real zoo enclosure, two or more
zoo animals clearly visible and reasonably large in frame, a
zoo fence or enclosure barrier clearly visible in the shot, natural
daylight, neutral natural colors, natural unedited photograph,
no visible people, no readable signage
""",
    # QA: wants livestock emphasized more — "wide-angle scene" left them too small and
    # distant in the field.
    "farm": """
RAW close-up documentary photograph of real farm livestock, several
cows or sheep close to the camera and filling most of the frame,
clearly recognizable, farmland visible only at the edges of the
frame, natural daylight, neutral natural colors, natural unedited
photograph, no visible people
""",
    "station": """
RAW documentary photograph of a real train station,
a train stopped at the platform, wide-angle scene, natural
daylight, neutral natural colors, natural unedited photograph,
no visible people, no readable signage
""",
    "library": """
RAW documentary photograph of a real library interior,
tall bookshelves densely filled with books clearly visible,
wide-angle scene, natural daylight, neutral natural colors,
natural unedited photograph, no visible people, no readable signage
""",
    # QA: wants a closer crop — the wide-angle coastal framing left the lighthouse
    # itself too small.
    "lighthouse": """
RAW close-up documentary photograph of a real lighthouse tower at
dusk, the lighthouse filling most of the frame top to bottom, warm
sunset lighting, only a narrow strip of coastline visible at the
base, natural colors, natural unedited photograph,
no visible people, no readable signage
""",
    "park": """
RAW documentary photograph of a real public park,
green lawn and trees with a lively gathering-place feel, benches
and pathways visible, wide-angle scene, natural daylight,
neutral natural colors, natural unedited photograph,
no visible people, no readable signage
""",
    "school": """
RAW documentary photograph of a real school classroom,
a teacher standing at the front and students seated at desks,
wide-angle scene, natural daylight, neutral natural colors,
natural unedited photograph, no readable signage, no visible faces
""",
    # QA: wants both a doctor and a patient to appear. "a doctor and a patient clearly
    # visible" alone rendered only the patient every time — spelling out the doctor's
    # action (standing beside the bed, examining) rather than just naming their presence
    # got both figures in frame reliably (paired with WORD_SEED_OVERRIDES below).
    "hospital": """
RAW documentary photograph of a real hospital room, a doctor in a
white coat standing beside the bed examining a patient lying in the
bed, both the doctor and the patient clearly visible in frame,
wide-angle scene, natural daylight, neutral natural colors, natural
unedited photograph, no readable signage, no visible faces
""",
    "playground": """
RAW documentary photograph of a real playground,
several different play structures visible such as a slide, swings,
and climbing equipment, wide-angle scene, natural daylight,
neutral natural colors, natural unedited photograph,
no visible people, no readable signage
""",
    # QA questioned whether this was really ice skating. It was, but the default
    # sport_prompt() template's "no visible faces" instruction (meant to avoid rendering
    # a photorealistic child's face) kept losing to a strong bias toward frontal
    # skater shots — 5/6 seeds tried still showed a clear face. Framing the shot from
    # behind the skater instead (so there's no face to render in the first place) is
    # what actually worked, paired with WORD_SEED_OVERRIDES below. This fully replaces
    # the shared sport_prompt()/SPORT_ACTIONS template for this one word.
    "skating": """
RAW action photograph of an ice skater in casual winter clothing
gliding on an indoor ice rink, photographed from behind and to the
side so the back of the head is shown and the face is not visible,
ice skates clearly visible, mid-action, natural daylight, neutral
natural colors, shallow depth of field, photographed with a
professional sports camera lens, natural unedited photograph,
no logos, no readable text
""",
}

WORD_NEGATIVE_OVERRIDES = {
    "lettuce": "cabbage, round head, tight compact leaves",
    "shrimp": "insect, spider, face, eyes, antennae close-up",
    "worm": "caterpillar, green, insect legs, segmented shell, coiled into a ring",
    "ambulance": "logo, badge, emblem, readable text, letters, license plate",
    "pentagon": "six sides, seven sides, eight sides, square, cube, hexagon, octagon",
    "melon": "cut, sliced, cross section, halved, quartered, seeds visible",
    "mole": "rat, vole, capybara, nutria, visible eyes, long tail, external ears, whiskers, face, front view",
    "river": "narrow, tiny, small stream, brook, trickle",
    "stream": "wide, large river, distant riverbanks, broad open water",
    "alligator": "open mouth, visible teeth, narrow snout, pointed snout, crocodile",
    "mayonnaise": "readable text, logo, letters, brand name, garbled text",
    "soda": "readable text, embossed logo, engraved text, brand name, cursive writing, label, clear, colorless, transparent liquid, water",
    "papaya": "cut, sliced, halved, cross section, cut open, seeds visible, interior, flesh",
    "cable car": "studio background, plain background, indoor, showroom, gray backdrop, neutral background",
    "jet ski": "studio background, plain background, indoor, showroom, garage, person, rider, human, man, woman, driver",
    "computer": "logo, brand name, readable text, letters, engraved text, hinge bezel, bottom bezel strip",
    "hospital": "empty room, no people, single person only",
    "skating": "face, visible face, facial features, front view, facing camera",
    "zoo": "distant, small, tiny, far away, empty enclosure, wide empty space",
    # QA sweep: this word's default hash-derived seed happened to render a folded 3D
    # card-corner shape instead of a flat fill (5/6 seeds tried were fine — a one-off
    # bad draw, not a prompt problem). Reuses the "color" category's extra negative plus
    # terms targeting the specific 3D-corner artifact, paired with WORD_SEED_OVERRIDES
    # below.
    "blue": "draped, hanging fabric, dramatic folds, twisted, silk, swirl, corner, edge, fold, 3d shape, object, card, paper, cube, block",
    "nose": "eye, eyes, eyelashes, eyebrow, eyelid, full face, mouth, lips",
    "hair": "face, eye, eyes, head, scalp, forehead, person, skin",
    "elbow": "bare shoulder, shirtless, no shirt, bare chest, face",
    "shoulder": "bare chest, nude torso, nipple, shirtless, topless, bare skin below the collarbone, face",
    "knee": "bare skin, bare leg, shorts, underwear, briefs, bare chest, nipple, torso, waist, bone, skeleton, x-ray, medical illustration, face",
    "cucumber": "short, stubby, thick, gherkin, pickle",
    "kangaroo": "wallaby, small, joey",
    "starfish": "four arms, six arms, seven arms, side view",
    "ocean": "beach, shore, sand, coastline",
    "mountain": "lake, water, reflection, river, pond, ocean, sea, stream",
    "seashell": "spiral shell, conch, snail shell",
    "squid": "fish, fish tail, large tail fin, dorsal fin, cuttlefish",
    "firefly": "daylight, sunlight, hand, person, iridescent, green, shiny hard shell, jewel beetle",
    "porcupine": "hedgehog, short spines, curled up, round ball shape",
    "tapir": "uniform coloring, solid brown, solid black, solid gray, no pattern",
    "farm": "distant, small, tiny, far away, empty field, wide empty space",
    "lighthouse": "distant, small, tiny, wide shot, far away",
    "crayon": "pencil, wood, wooden, sharpened point, graphite tip",
    "mango": "cut, sliced, peeled, bite mark, bitten, exposed flesh, interior",
    "plum": "dark purple, dark red, small",
}


def build_prompt(entry):
    override = WORD_PROMPT_OVERRIDES.get(entry["word"])
    if override:
        return override
    builder = CATEGORY_PROMPT_BUILDERS[entry["category"]]
    return builder(entry["word"])


def build_negative_prompt(entry):
    # A word-level override already targets exactly what that word needs excluded —
    # stacking the category-wide extra on top risks going over CLIP's 77-token limit
    # (confirmed happens for shrimp/worm), so it replaces rather than adds to it.
    word_extra = WORD_NEGATIVE_OVERRIDES.get(entry["word"])
    if word_extra:
        return f"{NEGATIVE_PROMPT},\n{word_extra}"
    extra = EXTRA_NEGATIVE.get(entry["category"])
    return NEGATIVE_PROMPT if not extra else f"{NEGATIVE_PROMPT},\n{extra}"


# A word whose default hash-derived seed produced a QA failure (a logo, garbled text, a
# wrong/unrecognizable composition) that a different seed fixed with the same prompt —
# found via visual QA. The prompt fix alone doesn't guarantee a clean result every time
# for logo/text-prone subjects like emergency vehicles, since this model runs at a low
# guidance_scale that weakens negative-prompt adherence; add entries here as spot-checks
# turn up more.
WORD_SEED_OVERRIDES = {
    "ambulance": 555,  # pairs with the WORD_PROMPT_OVERRIDES entry above — see its comment
    "pentagon": 1,  # pairs with the WORD_PROMPT_OVERRIDES entry above — see its comment
    "melon": 1,  # pairs with the WORD_PROMPT_OVERRIDES entry above — see its comment
    # Tried 11 seeds against the strengthened "mouth fully closed" prompt — every one
    # still showed an open mouth with visible teeth (a very strong training bias for
    # "reptile head" imagery), except this one, which comes out nearly closed with only
    # a tooth tip showing — the best available, not a perfect result.
    "alligator": 999,
    # Tried seeds [1, 42, 100, 999] against the close-crop-on-cap prompt above — 1, 100,
    # and 999 all still rendered a fake brand label in the shot; only 42 kept the label
    # fully out of frame as intended.
    "mayonnaise": 42,
    # Tried 20 seeds across four prompt framings — none rendered the ramune marble, but
    # this seed gives a clean bottle with no garbled embossed text (many other seeds had
    # fake cursive brand text embossed in the glass). Best available, not a full fix.
    "soda": 88,
    # Tried 14 seeds in studio framings, all cut the fruit open. This seed (tree framing)
    # was the clearest single whole fruit of the 5/6 that broke the cut-open bias.
    "papaya": 1,
    # Naming the dry terrain broke the lake bias on all 8 seeds tried; this one has the
    # cleanest single-peak silhouette.
    "mountain": 42,
    "cablecar": 1,
    "jetski": 42,
    "computer": 42,
    # 6/6 seeds gave both a doctor and a patient; this one was the cleanest composition.
    "hospital": 100,
    # Only 1 of 6 seeds kept the face out of frame from behind.
    "skating": 999,
    "zoo": 42,
    "blue": 1,
    # Body-part content-safety fixes (see body_part_prompt() comment): each needed a
    # specific seed after the framing change to reliably avoid faces/exposure. Note:
    # these seeds are tied to whichever checkpoint (MODEL_PATH) generated them — the
    # same seed number produces a different image on a different checkpoint, so a seed
    # picked for Lightning isn't guaranteed to still work if generating with the
    # standard checkpoint instead (this happened to nose: seed 42 worked on Lightning
    # but showed an eye instead of a nose on the standard checkpoint — 999 works on both).
    "nose": 999,
    "hair": 42,
    "elbow": 999,
    "shoulder": 999,
    "knee": 1,
    "mole": 1,
    "mango": 100,
    "tapir": 1,
}


def seed_for(word_id):
    if word_id in WORD_SEED_OVERRIDES:
        return WORD_SEED_OVERRIDES[word_id]
    digest = hashlib.sha256(word_id.encode()).hexdigest()
    return int(digest, 16) % (2**31)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="comma-separated word ids to (re)generate")
    parser.add_argument("--force", action="store_true", help="regenerate even if the PNG already exists")
    parser.add_argument(
        "--out-dir",
        default=OUTPUT_DIR,
        help="write PNGs here instead of public/images/words — for trying settings without touching real output",
    )
    args = parser.parse_args()
    only_ids = set(args.only.split(",")) if args.only else None
    out_dir = args.out_dir

    os.makedirs(out_dir, exist_ok=True)

    word_bank = load_word_bank()
    targets = [w for w in word_bank if only_ids is None or w["id"] in only_ids]
    if not args.force:
        targets = [w for w in targets if not os.path.exists(os.path.join(out_dir, f"{w['id']}.png"))]

    # Color words never go through the diffusion pipeline at all — see color_prompt()'s
    # comment for why. Handle them first so a --only run made up entirely of colors
    # never even loads the (slow, heat-generating) SDXL pipeline.
    color_targets = [w for w in targets if w["category"] == "color"]
    targets = [w for w in targets if w["category"] != "color"]
    for entry in color_targets:
        out_path = os.path.join(out_dir, f"{entry['id']}.png")
        write_color_swatch(entry["id"], out_path)
        print(f"done  {entry['id']} -> {out_path} (flat color swatch, no diffusion)")

    print(f"Generating {len(targets)} image(s) via {os.path.basename(MODEL_PATH)} "
          f"({INFERENCE_STEPS} steps, guidance={GUIDANCE_SCALE})...")
    if not targets:
        return

    with SingleInstanceLock():
        print("MPS available:", torch.backends.mps.is_available())
        print(f"Loading {os.path.basename(MODEL_PATH)}...")
        pipe = StableDiffusionXLPipeline.from_single_file(
            MODEL_PATH,
            torch_dtype=torch.bfloat16,
            use_safetensors=True,
        )
        pipe.scheduler = DPMSolverMultistepScheduler.from_config(
            pipe.scheduler.config,
            algorithm_type="sde-dpmsolver++",
            use_karras_sigmas=True,
        )
        pipe = pipe.to("mps")

        for i, entry in enumerate(targets):
            word_id = entry["id"]
            out_path = os.path.join(out_dir, f"{word_id}.png")
            prompt = build_prompt(entry)
            negative_prompt = build_negative_prompt(entry)
            generator = torch.Generator(device="cpu").manual_seed(seed_for(word_id))

            start = time.time()
            try:
                # One inference at a time by construction — a plain sequential loop,
                # no threads/async, no batching (num_images_per_prompt stays at its
                # default of 1) — see SingleInstanceLock's docstring for the other half
                # of this guarantee (no overlap between separate process runs).
                image = pipe(
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    width=GEN_SIZE,
                    height=GEN_SIZE,
                    num_inference_steps=INFERENCE_STEPS,
                    guidance_scale=GUIDANCE_SCALE,
                    generator=generator,
                ).images[0]
                image = image.resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS)
                image.save(out_path)
                elapsed = time.time() - start
                print(f"done  ({i + 1}/{len(targets)}) {word_id} -> {out_path} ({elapsed:.1f}s)")
            except Exception as err:  # noqa: BLE001 - report and keep going through the batch
                print(f"fail  {word_id}: {err}", file=sys.stderr)

            if i < len(targets) - 1:
                if BATCH_COOLDOWN_EVERY and (i + 1) % BATCH_COOLDOWN_EVERY == 0:
                    print(f"  ...cooling down {BATCH_COOLDOWN_SECONDS:.0f}s after {i + 1} images...")
                    time.sleep(BATCH_COOLDOWN_SECONDS)
                else:
                    time.sleep(COOLDOWN_SECONDS)


if __name__ == "__main__":
    main()
