"""Regenerates the 8 flat-cutout shape images (see wordBank.ts's 'shape' category) as
simple, deterministic geometric drawings rather than AI-generated photos.

Why: the AI pipeline (generate-word-images-local.py) reliably mis-rendered these three —
'diamond' as a faceted 3D gemstone, 'oval' as a hollow ring, 'rectangle' as two overlapping
sheets — even after two rounds of prompt engineering, because "diamond"/"oval" carry very
strong competing associations (gemstone, letter O) in the base model's training data. A
human review of all 10 shape images (2025-09) confirmed those three were broken and asked
for every flat shape to be simplified and given one unified look — exact geometry and a
single flat fill color are trivial to guarantee by drawing them directly, and impossible to
fully guarantee through a diffusion model's prompt alone.

'cube' and 'sphere' were reviewed in the same pass and kept as their existing AI-generated
photos (the reviewer preferred the photorealistic wood look for the two solid/3D shapes) —
not regenerated here.

Usage:
    python3 scripts/generate-shape-images.py
Writes directly into public/images/words/{id}.png.
"""

import math
import os

from PIL import Image, ImageDraw

SIZE = 480
CX, CY = SIZE / 2, SIZE / 2
R = 150  # base radius/half-extent shared by every shape below

BG = (250, 243, 232, 255)    # unified warm cream background
FILL = (255, 122, 92, 255)   # unified coral fill — same hue for all 8 shapes
STROKE = (196, 74, 51, 255)  # darker coral outline
STROKE_W = 8

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(SCRIPT_DIR, "..", "public", "images", "words")


def new_canvas():
    return Image.new("RGBA", (SIZE, SIZE), BG)


def save(img, name):
    img.save(os.path.join(OUT_DIR, f"{name}.png"))
    print("wrote", name)


def regular_polygon(cx, cy, radius, sides, rotation_deg=-90):
    pts = []
    for i in range(sides):
        angle = math.radians(rotation_deg + i * 360 / sides)
        pts.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    return pts


# ---- circle ----
img = new_canvas()
d = ImageDraw.Draw(img)
d.ellipse([CX - R, CY - R, CX + R, CY + R], fill=FILL, outline=STROKE, width=STROKE_W)
save(img, "circle")

# ---- square (slightly rounded corners) ----
img = new_canvas()
d = ImageDraw.Draw(img)
s = R * 1.05
d.rounded_rectangle([CX - s, CY - s, CX + s, CY + s], radius=22, fill=FILL, outline=STROKE, width=STROKE_W)
save(img, "square")

# ---- triangle (equilateral, solid) ----
img = new_canvas()
d = ImageDraw.Draw(img)
pts = regular_polygon(CX, CY + 10, R * 1.15, 3, rotation_deg=-90)
d.polygon(pts, fill=FILL, outline=STROKE, width=STROKE_W)
save(img, "triangle")

# ---- rectangle (clearly landscape, one shape only — not two overlapping sheets) ----
img = new_canvas()
d = ImageDraw.Draw(img)
rw, rh = R * 1.35, R * 0.75
d.rounded_rectangle([CX - rw, CY - rh, CX + rw, CY + rh], radius=18, fill=FILL, outline=STROKE, width=STROKE_W)
save(img, "rectangle")

# ---- oval (solid ellipse, egg-like portrait proportions — not a hollow ring) ----
img = new_canvas()
d = ImageDraw.Draw(img)
ow, oh = R * 0.78, R * 1.15
d.ellipse([CX - ow, CY - oh, CX + ow, CY + oh], fill=FILL, outline=STROKE, width=STROKE_W)
save(img, "oval")

# ---- diamond (flat rhombus, point top/bottom, like a playing-card suit — not a gemstone) ----
img = new_canvas()
d = ImageDraw.Draw(img)
dw, dh = R * 0.8, R * 1.15
pts = [(CX, CY - dh), (CX + dw, CY), (CX, CY + dh), (CX - dw, CY)]
d.polygon(pts, fill=FILL, outline=STROKE, width=STROKE_W)
save(img, "diamond")

# ---- pentagon (regular — all 5 sides/angles equal, not a home-plate shape) ----
img = new_canvas()
d = ImageDraw.Draw(img)
pts = regular_polygon(CX, CY + 8, R * 1.05, 5, rotation_deg=-90)
d.polygon(pts, fill=FILL, outline=STROKE, width=STROKE_W)
save(img, "pentagon")

# ---- hexagon (regular) ----
img = new_canvas()
d = ImageDraw.Draw(img)
pts = regular_polygon(CX, CY, R * 1.05, 6, rotation_deg=-90)
d.polygon(pts, fill=FILL, outline=STROKE, width=STROKE_W)
save(img, "hexagon")

print("done — cube/sphere intentionally left untouched (kept as AI-generated photos)")
