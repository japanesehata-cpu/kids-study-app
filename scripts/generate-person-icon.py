"""Generates the generic person-silhouette icon used by かぞえる's にん (people) counter.

Why a silhouette instead of a photo: repeating a photorealistic person N times to show
"N people" either repeats one identifiable face (looks like N copies of the same person,
not N different people) or would need N distinct AI-generated faces — and this app has an
established policy against generating photorealistic human faces/bodies at all (see
generate-word-images-local.py's EXTRA_NEGATIVE "place"/"bodyPart" entries). A generic,
faceless silhouette sidesteps both problems: it reads naturally as "a person" no matter how
many copies are shown side by side.

Usage:
    python3 scripts/generate-person-icon.py
Writes directly into public/images/words/person.png.
"""

import os

from PIL import Image, ImageDraw

SIZE = 480
CX = SIZE / 2
BG = (250, 243, 232, 255)  # same unified warm cream used by the shape/coin icons
FILL = (255, 122, 92, 255)  # same unified coral used by the flat shape icons

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(SCRIPT_DIR, "..", "public", "images", "words", "person.png")

img = Image.new("RGBA", (SIZE, SIZE), BG)
d = ImageDraw.Draw(img)

# Head
head_r = 70
head_cy = 130
d.ellipse([CX - head_r, head_cy - head_r, CX + head_r, head_cy + head_r], fill=FILL)

# Body: a rounded trapezoid (shoulders wider than waist).
body_top_y = head_cy + head_r - 10
body_top_half_w = 90
body_bottom_half_w = 130
body_bottom_y = 430
d.polygon(
    [
        (CX - body_top_half_w, body_top_y + 40),
        (CX - body_top_half_w, body_top_y + 20),
        (CX, body_top_y),
        (CX + body_top_half_w, body_top_y + 20),
        (CX + body_top_half_w, body_top_y + 40),
        (CX + body_bottom_half_w, body_bottom_y),
        (CX - body_bottom_half_w, body_bottom_y),
    ],
    fill=FILL,
)
d.ellipse([CX - body_top_half_w, body_top_y, CX + body_top_half_w, body_top_y + 80], fill=FILL)

img.save(OUT_PATH)
print("wrote", OUT_PATH)
