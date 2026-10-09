#!/usr/bin/env python3
"""まちがいさがし "different colour" difference: for every sprite in public/images/spot/<theme>/,
writes <sprite>__color.png — the same picture recoloured so a child can see at a glance
that it changed (a brown dog turns black, an orange fish turns blue, a white seagull turns
pink). Pure image processing, no generation: the outline and every shape stay identical, so
the ONLY difference is the colour.

How the colour is chosen:
- Animals/people (the theme's "living" list) whose main colour is brown/orange/yellow are
  darkened to near-black ("くろい いぬ") — a believable recolour for an animal, unlike blue.
- Everything else with real colour gets its hue rotated (whichever of 3 rotations moves the
  colour most).
- Mostly white/grey things get tinted (light pixels turn pink, blue or yellow).
A variant is only kept if it differs enough from the original (mean colour distance over
the object's pixels); otherwise the sprite simply never gets a colour difference.

    python3 scripts/build-spot-color-variants.py [--theme=sea] [--sheet=OUT.png]

Then run scripts/build-spot-scenes.py so spotScenes.ts picks up `colorVariant`.
"""
import argparse
import colorsys
import glob
import json
import os

import numpy as np
from scipy import ndimage
from PIL import Image, ImageDraw

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
SPOT_DIR = os.path.join(REPO_ROOT, "public", "images", "spot")
MIN_DISTANCE = 55  # mean RGB distance (0-441) over opaque pixels for a variant to count


def rgb_to_hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    nz = d > 1e-6
    rc = np.where(nz, (mx - r) / np.where(nz, d, 1), 0)
    gc = np.where(nz, (mx - g) / np.where(nz, d, 1), 0)
    bc = np.where(nz, (mx - b) / np.where(nz, d, 1), 0)
    h = np.where(r == mx, bc - gc, np.where(g == mx, 2.0 + rc - bc, 4.0 + gc - rc))
    h = np.where(nz, (h / 6.0) % 1.0, 0)
    s = np.where(mx > 1e-6, d / np.where(mx > 1e-6, mx, 1), 0)
    return np.stack([h, s, mx], -1)


def hsv_to_rgb(hsv):
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p = v * (1 - s)
    q = v * (1 - s * f)
    t = v * (1 - s * (1 - f))
    conds = [i == k for k in range(6)]
    r = np.select(conds, [v, q, p, p, t, v])
    g = np.select(conds, [t, v, v, q, p, p])
    b = np.select(conds, [p, p, t, v, v, q])
    return np.stack([r, g, b], -1)


def recolor(rgba, living):
    """Returns (new RGBA array, how) or (None, reason)."""
    rgb = rgba[..., :3].astype(np.float64) / 255.0
    alpha = rgba[..., 3]
    opaque = alpha > 128
    hsv = rgb_to_hsv(rgb)
    colored = opaque & (hsv[..., 1] > 0.25) & (hsv[..., 2] > 0.25)
    n_opaque = max(int(opaque.sum()), 1)
    # Sampled a few px in, since the crop adds a transparent margin around even a square one.
    k = min(8, alpha.shape[0] // 4, alpha.shape[1] // 4)
    border = np.concatenate([alpha[k, k:-k], alpha[-k - 1, k:-k], alpha[k:-k, k], alpha[k:-k, -k - 1]])
    if (border > 128).mean() > 0.5:
        # The white backdrop was never keyed out (a square sticker) — recolouring would
        # tint the backdrop, not the object.
        return None, "backdrop not cut out"
    colored_frac = colored.sum() / n_opaque

    candidates = []
    if colored_frac >= 0.3:
        hues = hsv[..., 0][colored]
        # dominant hue: circular mean
        ang = np.angle(np.mean(np.exp(2j * np.pi * hues))) / (2 * np.pi) % 1.0
        # Only the main colour changes (the bucket turns blue, the sand under it stays
        # sand) — pixels within ±0.09 of the dominant hue, so it reads as "this thing is a
        # different colour", not a photo negative.
        hue_gap = np.abs(((hsv[..., 0] - ang) + 0.5) % 1.0 - 0.5)
        main = colored & (hue_gap < 0.09)
        main_v = hsv[..., 2][main].mean() if main.any() else 1
        main_s = hsv[..., 1][main].mean() if main.any() else 1
        brown = (ang < 0.13 or ang > 0.97) and (main_v < 0.8 or main_s < 0.55)
        if living and brown:
            # A brown animal turns black/charcoal — keeps its shading so eyes and fur lines
            # still read.
            out = hsv.copy()
            out[..., 1] = np.where(main, out[..., 1] * 0.15, out[..., 1])
            out[..., 2] = np.where(main, out[..., 2] * 0.42 + 0.1, out[..., 2])
            candidates.append(("black", out))
        for rot in (0.33, 0.5, 0.67):
            out = hsv.copy()
            out[..., 0] = np.where(main, (out[..., 0] + rot) % 1.0, out[..., 0])
            candidates.append((f"hue+{int(rot * 360)}", out))
    else:
        light = opaque & (hsv[..., 2] > 0.6) & (hsv[..., 1] <= 0.25)
        # Leave the sticker's white die-cut rim (light pixels touching the transparent
        # outside) white — only the object's own white parts get tinted.
        labels, _ = ndimage.label(light)
        outside = ndimage.binary_dilation(~opaque, iterations=2)
        rim_labels = np.unique(labels[outside & light])
        light &= ~np.isin(labels, rim_labels[rim_labels > 0])
        if light.sum() / n_opaque < 0.3:
            return None, "no dominant colour or white area"
        for name, hue in (("pink", 0.92), ("blue", 0.58), ("yellow", 0.14)):
            out = hsv.copy()
            out[..., 0] = np.where(light, hue, out[..., 0])
            out[..., 1] = np.where(light, 0.55, out[..., 1])
            out[..., 2] = np.where(light, np.minimum(out[..., 2], 0.95), out[..., 2])
            candidates.append((name, out))

    best = None
    for name, out in candidates:
        new_rgb = hsv_to_rgb(out)
        dist = np.sqrt(((new_rgb - rgb) ** 2).sum(-1))[opaque].mean() * 255
        # The "black" option is preferred for warm animals whenever it's visible enough.
        score = dist + (1000 if name == "black" and dist >= MIN_DISTANCE else 0)
        if best is None or score > best[0]:
            best = (score, name, new_rgb, dist)
    _, name, new_rgb, dist = best
    if dist < MIN_DISTANCE:
        return None, f"too subtle ({dist:.0f})"
    result = rgba.copy()
    result[..., :3] = np.clip(new_rgb * 255 + 0.5, 0, 255).astype(np.uint8)
    return result, f"{name} ({dist:.0f})"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--theme", default="all")
    ap.add_argument("--sheet", help="also write a before/after contact sheet here")
    args = ap.parse_args()
    themes = json.load(open(os.path.join(SCRIPT_DIR, "spot-themes.json")))
    pairs = []
    for theme_id, spec in themes.items():
        if args.theme != "all" and theme_id != args.theme:
            continue
        living = set(spec.get("living", []))
        for sid in spec["sprites"]:
            path = os.path.join(SPOT_DIR, theme_id, f"{sid}.png")
            out_path = os.path.join(SPOT_DIR, theme_id, f"{sid}__color.png")
            if not os.path.exists(path):
                continue
            rgba = np.array(Image.open(path).convert("RGBA"))
            result, how = recolor(rgba, sid in living)
            if result is None:
                if os.path.exists(out_path):
                    os.remove(out_path)
                print(f"{theme_id}/{sid}: skipped — {how}")
                continue
            img = Image.fromarray(result)
            img.quantize(colors=256, method=Image.FASTOCTREE).save(out_path, optimize=True)
            pairs.append((theme_id, sid, path, out_path))
            print(f"{theme_id}/{sid}: {how}")

    if args.sheet and pairs:
        cell = 120
        cols = 8  # 4 before/after pairs per row
        rows = (len(pairs) * 2 + cols - 1) // cols
        sheet = Image.new("RGB", (cols * cell, rows * (cell + 14)), (255, 255, 255))
        draw = ImageDraw.Draw(sheet)
        for i, (theme_id, sid, a, b) in enumerate(pairs):
            for j, p in enumerate((a, b)):
                k = i * 2 + j
                x, y = (k % cols) * cell, (k // cols) * (cell + 14)
                im = Image.open(p).convert("RGBA")
                im.thumbnail((cell - 8, cell - 8))
                sheet.paste(im, (x + 4, y + 4), im)
                if j == 0:
                    draw.text((x + 2, y + cell), f"{theme_id}/{sid}"[:30], fill=(0, 0, 0))
        sheet.save(args.sheet)
        print("sheet:", args.sheet)


if __name__ == "__main__":
    main()
