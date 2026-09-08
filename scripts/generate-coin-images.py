"""Generates the 6 Japanese coin icon images (1/5/10/50/100/500円) used by the おかね
category as deterministic geometric drawings, not AI-generated photos.

Why: real Japanese coins have specific, recognizable engravings (1円's young tree, 5円's
rice ear, 10円's Byōdō-in temple, ...) that a diffusion model cannot reliably reproduce —
the same "AI can't guarantee an exact real-world design" failure mode that made
diamond/oval/rectangle (see generate-shape-images.py) come out wrong. Drawing them
directly instead guarantees the one thing that actually matters for this app's teaching
goal — clearly telling the 6 denominations apart — via each coin's real distinguishing
features: material color (aluminum/brass/copper/silver) and whether it has a center hole
(5円 and 50円 do; the others don't), plus the printed value for certainty.

500円 (real-world bicolor) originally got a matching gold-ring-over-silver-disc
treatment, but a HIL comparison against the other 5 (all a single flat color, either a
plain disc or a plain ring-with-hole) found the thick second ring read as visually
structurally different from the rest of the set — like a target, not a coin family
member. Settled on the same plain-disc shape as 1/10/100円, silver like 100円, with the
printed number in the gold stroke color instead — keeps a bicolor-ish visual hint without
introducing a second concentric shape.

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


def draw_coin(name, fill, stroke, hole, label, text_color=None):
    text_color = text_color or stroke
    img = new_canvas()
    d = ImageDraw.Draw(img)
    d.ellipse([CX - R, CY - R, CX + R, CY + R], fill=fill, outline=stroke, width=STROKE_W)
    if hole:
        hole_r = R * 0.34
        d.ellipse([CX - hole_r, CY - hole_r, CX + hole_r, CY + hole_r], fill=BG, outline=stroke, width=STROKE_W)
        # Number sits above the hole, 円 below it, when there's a hole in the middle.
        num_font = find_font(int(R * 0.62))
        yen_font = find_font(int(R * 0.34))
        num_bbox = d.textbbox((0, 0), label, font=num_font)
        d.text((CX - (num_bbox[2] - num_bbox[0]) / 2, CY - R * 0.92), label, font=num_font, fill=text_color)
        yen_bbox = d.textbbox((0, 0), "円", font=yen_font)
        d.text((CX - (yen_bbox[2] - yen_bbox[0]) / 2, CY + R * 0.45), "円", font=yen_font, fill=text_color)
    else:
        text_r = R
        size_scale = 0.78 if len(label) == 1 else (0.55 if len(label) == 2 else 0.42)
        num_font = find_font(int(text_r * size_scale))
        yen_font = find_font(int(text_r * 0.34))
        num_bbox = d.textbbox((0, 0), label, font=num_font)
        d.text((CX - (num_bbox[2] - num_bbox[0]) / 2, CY - text_r * 0.62), label, font=num_font, fill=text_color)
        yen_bbox = d.textbbox((0, 0), "円", font=yen_font)
        d.text((CX - (yen_bbox[2] - yen_bbox[0]) / 2, CY + text_r * 0.16), "円", font=yen_font, fill=text_color)
    img.save(os.path.join(OUT_DIR, f"{name}.png"))
    print("wrote", name)


GOLD, GOLD_STROKE = (201, 162, 39, 255), (140, 108, 20, 255)
SILVER, SILVER_STROKE = (192, 192, 200, 255), (130, 130, 140, 255)

# aluminum, no hole
draw_coin("yen1", (222, 224, 226, 255), (150, 152, 156, 255), False, "1")
# brass/gold, WITH hole (real 5-yen has a hole)
draw_coin("yen5", GOLD, GOLD_STROKE, True, "5")
# copper/bronze, no hole
draw_coin("yen10", (181, 101, 29, 255), (120, 64, 14, 255), False, "10")
# silver, WITH hole (real 50-yen has a hole)
draw_coin("yen50", (176, 176, 184, 255), (120, 120, 128, 255), True, "50")
# silver, no hole
draw_coin("yen100", SILVER, SILVER_STROKE, False, "100")
# same silver disc as 100円 (no hole, like 100円) but the number printed in gold — a
# nod to the real 500-yen's bicolor look without a second concentric ring (see the
# HIL comparison note in this file's docstring for why the ring version was dropped).
draw_coin("yen500", SILVER, SILVER_STROKE, False, "500", text_color=GOLD_STROKE)

print("done")
