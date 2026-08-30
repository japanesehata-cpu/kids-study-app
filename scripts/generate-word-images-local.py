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
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
MODEL_PATH = os.path.expanduser("~/realvisxl-test/models/RealVisXL_V4.0_Lightning.safetensors")
OUTPUT_DIR = os.path.join(REPO_ROOT, "public", "images", "words")
ICON_SIZE = 480
GEN_SIZE = 768
LOCK_PATH = "/tmp/generate-word-images-local.lock"

# Kept low to minimize sustained GPU load: fewer steps means less compute per image, and
# the cooldown lets the GPU idle back down between images instead of running at a
# continuous peak for the whole batch — same reasoning as generate-tts-cache.mjs's
# thermal cooldown between VOICEVOX calls. Override via env var if needed.
INFERENCE_STEPS = int(os.environ.get("DIFFUSION_STEPS", 6))
COOLDOWN_SECONDS = float(os.environ.get("DIFFUSION_COOLDOWN_S", 10))


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
    # A dramatic silk drape reads inconsistently across renders (deep shadows and
    # highlights can make the same fabric look like several different shades) — a
    # flat, minimally-folded square swatch shows the true color evenly, and keeps
    # every color card looking like part of the same set. "Completely flat... lying
    # on a table" reads more reliably than "flat... with slight folds", which still
    # let some colors drift into a dramatic draped/twisted look.
    return f"""
RAW product photograph of a folded square {word} colored fabric
swatch, lying completely flat on a table, minimal folds,
entirely and accurately {word}, no other colors, no pattern,
soft even studio lighting, plain white background, centered
composition, natural unedited product photograph
"""


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
    return f"""
RAW product photograph of a real {word},
one {word} centered in frame,
natural material and texture,
soft diffused daylight,
neutral studio background,
shallow depth of field,
photographed with a professional camera lens,
natural unedited product photograph
"""


def body_part_prompt(word):
    # "macro" reliably pushed toward unpleasant, over-textured skin close-ups (visible
    # pores, wrinkles, veins) — found by QA on toe/knee/teeth/ear specifically. A plain
    # "photograph" at a normal (not macro) distance, with skin described positively
    # rather than just "clean," avoids that without losing the body part itself.
    # Deliberately age/gender-neutral wording — avoid specifying a child's body part.
    if word == "teeth":
        return """
RAW photograph of a real human smile showing healthy white teeth,
lips slightly parted, centered in frame, natural even skin tone,
soft diffused daylight, neutral studio background, well-lit,
natural unedited photograph
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
    "swimming": "a swimmer swimming in a pool, mid-stroke",
    "running": "a runner sprinting on an outdoor running track",
    "skiing": "a skier skiing down a snowy slope",
    "skating": "an ice skater gliding on an ice rink",
    "surfing": "a surfer riding a wave on a surfboard",
    "golf": "a golfer swinging a golf club on a grass course",
    "volleyball": "an athlete spiking a volleyball at a net",
    "badminton": "an athlete swinging a badminton racket at a shuttlecock",
    "boxing": "an athlete wearing boxing gloves in a fighting stance",
    "judo": "two athletes in judo uniforms grappling during a judo match",
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
    return f"""
RAW product photograph of a real solid painted wooden {word} shape block,
one centered in frame,
natural wood grain visible through matte paint,
soft diffused daylight,
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
    "stingray": """
RAW underwater wildlife photograph of a real stingray,
side profile view showing its flat diamond-shaped body and long
tail, gliding alone through clear open water, natural skin texture,
soft diffused light through water,
unedited documentary nature photograph
""",
    "crocodile": """
RAW wildlife photograph of a real crocodile's head from the side,
long narrow V-shaped snout with a visible fourth tooth jutting up
outside the closed jaw, natural scale texture,
soft diffused daylight, unedited documentary nature photograph
""",
    "alligator": """
RAW wildlife photograph of a real alligator's head from the side,
short wide rounded U-shaped snout, no teeth visible outside the
closed jaw, natural dark scale texture,
soft diffused daylight, unedited documentary nature photograph
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
    # not a generic heron-like wading bird.
    "crane": """
RAW wildlife photograph of a real Japanese red-crowned crane,
side profile view, entire body visible, standing in snow,
white body plumage, black wing feathers, small red patch on the
crown of the head, long black neck,
soft diffused daylight, unedited documentary nature photograph
""",
    "porcupine": """
RAW wildlife photograph of a real porcupine,
side profile view, entire body visible, covered in long thick
sharp quills standing out from its body, natural coloring,
soft diffused daylight, unedited documentary nature photograph
""",
    "squid": """
RAW underwater wildlife photograph of a real squid,
side profile view, long torpedo-shaped mantle with side fins,
two long tentacles and eight arms trailing behind, natural
translucent skin, soft diffused light through water,
unedited documentary nature photograph
""",
    "mole": """
RAW macro wildlife photograph of a real mole on soil,
side profile view, entire small body visible, no visible eyes,
long pointed pink snout, huge broad shovel-like front paws with
claws held forward, dark velvety fur, small compact body,
soft diffused daylight, unedited documentary nature photograph
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
    # that association entirely.
    "melon": """
RAW documentary photograph of a whole melon growing on a vine in a
garden, intact rind, resting on soil among green leaves,
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
    # texture is the culturally standard "mayonnaise" reference in Japan.
    "mayonnaise": """
RAW product photograph of a real mayonnaise squeeze bottle,
clear plastic bottle with diamond quilted texture, red twist cap,
plain white label with no readable text, standing upright,
soft diffused daylight, neutral studio background,
natural unedited product photograph
""",
    # Long, slender, dark green, bumpy-skinned Asian/Japanese cucumber (kyuri) rather
    # than a short bumpy Western cucumber — shown whole, not cut, so the characteristic
    # shape reads clearly.
    "cucumber": """
RAW product photograph of a real whole Japanese cucumber,
long slender dark green bumpy skin, one whole cucumber centered
in frame, soft diffused daylight, neutral studio background,
natural unedited product photograph
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
    "oval": """
RAW product photograph of a real solid painted wooden oval shape
block, a flat elongated ellipse, not a bowl or dish, centered in
frame, natural wood grain through matte paint, soft diffused
daylight, neutral studio background, natural unedited product photograph
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
}

WORD_NEGATIVE_OVERRIDES = {
    "lettuce": "cabbage, round head, tight compact leaves",
    "shrimp": "insect, spider, face, eyes, antennae close-up",
    "worm": "caterpillar, green, insect legs, segmented shell, coiled into a ring",
    "ambulance": "logo, badge, emblem, readable text, letters, license plate",
    "pentagon": "six sides, seven sides, eight sides, square, cube, hexagon, octagon",
    "melon": "cut, sliced, cross section, halved, quartered, seeds visible",
    "mole": "rat, vole, capybara, nutria, visible eyes, long tail",
    "river": "narrow, tiny, small stream, brook, trickle",
    "stream": "wide, large river, distant riverbanks, broad open water",
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

    print(f"Generating {len(targets)} image(s) via local RealVisXL V4.0 Lightning...")
    if not targets:
        return

    with SingleInstanceLock():
        print("MPS available:", torch.backends.mps.is_available())
        print("Loading RealVisXL V4.0 Lightning...")
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
                    guidance_scale=1.3,
                    generator=generator,
                ).images[0]
                image = image.resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS)
                image.save(out_path)
                elapsed = time.time() - start
                print(f"done  ({i + 1}/{len(targets)}) {word_id} -> {out_path} ({elapsed:.1f}s)")
            except Exception as err:  # noqa: BLE001 - report and keep going through the batch
                print(f"fail  {word_id}: {err}", file=sys.stderr)

            if i < len(targets) - 1:
                time.sleep(COOLDOWN_SECONDS)


if __name__ == "__main__":
    main()
