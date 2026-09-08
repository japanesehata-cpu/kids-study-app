"""Generates the 6 Japanese coin icon images (1/5/10/50/100/500円) used by the おかね
category as deterministic geometric drawings, not AI-generated photos.

Why: real Japanese coins have specific, recognizable engravings (1円's young tree, 5円's
rice ear, 10円's Byōdō-in temple, ...) that a diffusion model cannot reliably reproduce —
the same "AI can't guarantee an exact real-world design" failure mode that made
diamond/oval/rectangle (see generate-shape-images.py) come out wrong. Drawing them
directly instead guarantees the one thing that actually matters for this app's teaching
goal — clearly telling the 6 denominations apart — via each coin's real distinguishing
features: material color (aluminum/brass/copper/silver/bicolor) and whether it has a
center hole (5円 and 50円 do; the others don't), plus the printed value for certainty.

Usage:
    python3 scripts/generate-coin-images.py
Writes directly into public/images/words/yen{1,5,10,50,100,500}.png.
"""

import os

from PIL import Image, ImageDraw, ImageFont

SIZE = 480
CX, CY = SIZE / 2, SIZE / 2
R = 190
BG = (250, 243, 232, 255)  # same unified warm cream used by the shape icons
STROKE_W = 6

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(SCRIPT_DIR, "..", "public", "images", "words")


def find_font(size):
    # STHeiti is a CJK font (has 円) and renders plain digits cleanly too, so one font
    # covers both the number and the 円 character with a consistent, bold, legible look.
    candidates = [
        "/System/Library/Fonts/STHeiti Medium.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def new_canvas():
    return Image.new("RGBA", (SIZE, SIZE), BG)


def draw_coin(name, fill, stroke, hole, label, bicolor_inner=None):
    img = new_canvas()
    d = ImageDraw.Draw(img)
    d.ellipse([CX - R, CY - R, CX + R, CY + R], fill=fill, outline=stroke, width=STROKE_W)
    inner_r = R * 0.62
    if bicolor_inner:
        d.ellipse(
            [CX - inner_r, CY - inner_r, CX + inner_r, CY + inner_r],
            fill=bicolor_inner,
            outline=stroke,
            width=STROKE_W,
        )
    if hole:
        hole_r = R * 0.34
        d.ellipse([CX - hole_r, CY - hole_r, CX + hole_r, CY + hole_r], fill=BG, outline=stroke, width=STROKE_W)
        # Number sits above the hole, 円 below it, when there's a hole in the middle.
        num_font = find_font(int(R * 0.62))
        yen_font = find_font(int(R * 0.34))
        num_bbox = d.textbbox((0, 0), label, font=num_font)
        d.text((CX - (num_bbox[2] - num_bbox[0]) / 2, CY - R * 0.92), label, font=num_font, fill=stroke)
        yen_bbox = d.textbbox((0, 0), "円", font=yen_font)
        d.text((CX - (yen_bbox[2] - yen_bbox[0]) / 2, CY + R * 0.45), "円", font=yen_font, fill=stroke)
    else:
        # Bicolor (500円) keeps the number confined to the inner disc, same reasoning as
        # the hole case above — otherwise a 3-digit number badly overlaps the ring seam.
        text_r = inner_r if bicolor_inner else R
        size_scale = 0.78 if len(label) == 1 else (0.55 if len(label) == 2 else 0.42)
        num_font = find_font(int(text_r * size_scale))
        yen_font = find_font(int(text_r * 0.34))
        num_bbox = d.textbbox((0, 0), label, font=num_font)
        d.text((CX - (num_bbox[2] - num_bbox[0]) / 2, CY - text_r * 0.62), label, font=num_font, fill=stroke)
        yen_bbox = d.textbbox((0, 0), "円", font=yen_font)
        d.text((CX - (yen_bbox[2] - yen_bbox[0]) / 2, CY + text_r * 0.16), "円", font=yen_font, fill=stroke)
    img.save(os.path.join(OUT_DIR, f"{name}.png"))
    print("wrote", name)


# aluminum, no hole
draw_coin("yen1", (222, 224, 226, 255), (150, 152, 156, 255), False, "1")
# brass/gold, WITH hole (real 5-yen has a hole)
draw_coin("yen5", (201, 162, 39, 255), (140, 108, 20, 255), True, "5")
# copper/bronze, no hole
draw_coin("yen10", (181, 101, 29, 255), (120, 64, 14, 255), False, "10")
# silver, WITH hole (real 50-yen has a hole)
draw_coin("yen50", (176, 176, 184, 255), (120, 120, 128, 255), True, "50")
# silver, no hole
draw_coin("yen100", (192, 192, 200, 255), (130, 130, 140, 255), False, "100")
# bicolor gold ring + silver center (real 500-yen is the "special" bicolor coin)
draw_coin("yen500", (201, 162, 39, 255), (140, 108, 20, 255), False, "500", bicolor_inner=(192, 192, 200, 255))

print("done")
