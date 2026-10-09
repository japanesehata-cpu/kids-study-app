#!/usr/bin/env python3
"""まちがいさがし background differences: for each theme's bg.jpg, finds a few flat-coloured
areas a child can point at (a roof, a door, a bush, a sign) and writes bg__d<N>.jpg with just
that one area recoloured. The backgrounds are flat illustrations, so an area of one colour
is usually one "thing" — no generation needed, and nothing else in the picture changes.

Writes scripts/spot-bg-diffs.json ({theme: [{id, rect: [x0, x1, y0, y1] in % of the
picture}]}), which build-spot-scenes.py folds into spotScenes.ts, and optionally a review
contact sheet.

    python3 scripts/build-spot-bg-variants.py [--theme=town] [--sheet=OUT.png]

A theme can list area ids to drop after review in spot-bg-diffs-rejected.json
({theme: ["d2", ...]}).
"""
import argparse
import json
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
SPOT_DIR = os.path.join(REPO_ROOT, "public", "images", "spot")
OUT_JSON = os.path.join(SCRIPT_DIR, "spot-bg-diffs.json")
REJECTED_JSON = os.path.join(SCRIPT_DIR, "spot-bg-diffs-rejected.json")

MAX_PER_THEME = 4
WORK_W = 480  # analysis size (bg.jpg is 960x640)
MIN_AREA = 0.004  # fraction of the picture — big enough to see and tap
MAX_AREA = 0.035  # …but not a whole wall/sky, which reads as "the picture is tinted"
MIN_FILL = 0.45  # area / bounding box — compact shapes, not long fences or outlines
MIN_GAP = 12  # % of width between chosen areas' centres
MARGIN = 4  # % — keep away from the picture's edges (the panel has rounded corners)


def rgb_to_hsv(rgb):
    out = np.zeros_like(rgb)
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    with np.errstate(invalid="ignore", divide="ignore"):
        h = np.where(mx == r, (g - b) / d % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4))
    out[..., 0] = np.where(d > 1e-6, h / 6, 0) % 1
    out[..., 1] = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    out[..., 2] = mx
    return out


def hsv_to_rgb(hsv):
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    conds = [i == k for k in range(6)]
    return np.stack([np.select(conds, c) for c in ([v, q, p, p, t, v], [t, v, v, q, p, p], [p, p, t, v, v, q])], -1)


def find_regions(img):
    """Connected areas of (near) one colour, scored for being a good tap target."""
    small = img.resize((WORK_W, WORK_W * img.height // img.width), Image.LANCZOS).filter(ImageFilter.MedianFilter(5))
    pal = small.quantize(colors=20, method=Image.MEDIANCUT)
    idx = np.asarray(pal)
    colors = np.array(pal.getpalette()[: 20 * 3]).reshape(-1, 3) / 255
    h, w = idx.shape
    total = h * w
    found = []
    for c in range(len(colors)):
        hsv = rgb_to_hsv(colors[c][None, None, :])[0, 0]
        # Skip near-white/near-grey (sky, clouds, roads, outlines): recolouring those reads
        # as a glitch rather than "that thing is a different colour".
        if hsv[1] < 0.22 or hsv[2] < 0.25:
            continue
        labels, n = ndimage.label(ndimage.binary_opening(idx == c, iterations=1))
        for lab in range(1, n + 1):
            m = labels == lab
            area = m.sum() / total
            if not (MIN_AREA <= area <= MAX_AREA):
                continue
            ys, xs = np.nonzero(m)
            x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
            fill = m.sum() / ((x1 - x0) * (y1 - y0))
            rect = [100 * x0 / w, 100 * x1 / w, 100 * y0 / h, 100 * y1 / h]
            if fill < MIN_FILL or rect[0] < MARGIN or rect[1] > 100 - MARGIN or rect[2] < MARGIN or rect[3] > 100 - MARGIN:
                continue
            # Must read as a THING: not a long strip (a band of a sky gradient, a strip of
            # grass shadow), and clearly a different colour from everything around it.
            bw, bh = x1 - x0, y1 - y0
            if max(bw / bh, bh / bw) > 3:
                continue
            ring = ndimage.binary_dilation(m, iterations=3) & ~m
            small_arr = np.asarray(small).astype(float) / 255
            inside = small_arr[m].mean(0)
            around = small_arr[ring]
            contrast = np.sqrt(((around - inside) ** 2).sum(-1))
            # Most of the border must contrast — a patch that fades into a same-coloured
            # neighbour on one side (a shadow on grass) is not an object.
            if np.mean(contrast > 0.18) < 0.75:
                continue
            # Prefer mid-sized, saturated, compact areas.
            score = fill * hsv[1] * min(area / 0.012, 1.0)
            found.append({"mask": m, "rect": rect, "score": score, "hue": hsv[0]})
    found.sort(key=lambda r: -r["score"])
    chosen = []
    for r in found:
        cx, cy = (r["rect"][0] + r["rect"][1]) / 2, (r["rect"][2] + r["rect"][3]) / 2
        if all(abs(cx - (c["rect"][0] + c["rect"][1]) / 2) + abs(cy - (c["rect"][2] + c["rect"][3]) / 2) > MIN_GAP for c in chosen):
            chosen.append(r)
        if len(chosen) == MAX_PER_THEME:
            break
    return chosen


def recolor(img, region):
    """Rotates the hue of just this area (at full size, including its anti-aliased edge)."""
    arr = np.asarray(img).astype(float) / 255
    m = Image.fromarray((region["mask"] * 255).astype(np.uint8)).resize(img.size, Image.NEAREST)
    m = np.asarray(m.filter(ImageFilter.MaxFilter(5))) > 0
    hsv = rgb_to_hsv(arr)
    # Within the dilated area, only pixels close to the area's own hue — so an outline or a
    # neighbouring thing caught by the dilation keeps its colour.
    gap = np.abs(((hsv[..., 0] - region["hue"]) + 0.5) % 1 - 0.5)
    sel = m & (gap < 0.08) & (hsv[..., 1] > 0.12)
    # A believable new colour for the thing: greenery turns autumn orange, everything else
    # gets a strong hue turn (red roof → blue, yellow sign → purple, blue door → orange).
    hue = region["hue"]
    if 0.16 < hue < 0.47:
        target = (hsv[..., 0] - hue + 0.07) % 1
    else:
        target = (hsv[..., 0] + 0.45) % 1
    hsv[..., 0] = np.where(sel, target, hsv[..., 0])
    out = hsv_to_rgb(hsv)
    soft = np.asarray(Image.fromarray((sel * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1))).astype(float)[..., None] / 255
    out = arr * (1 - soft) + out * soft
    change = np.sqrt(((out - arr) ** 2).sum(-1))[sel].mean() * 255 if sel.any() else 0
    return Image.fromarray(np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8)), change


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--theme", default="all")
    ap.add_argument("--sheet")
    a = ap.parse_args()
    themes = json.load(open(os.path.join(SCRIPT_DIR, "spot-themes.json")))
    rejected = json.load(open(REJECTED_JSON)) if os.path.exists(REJECTED_JSON) else {}
    result = json.load(open(OUT_JSON)) if os.path.exists(OUT_JSON) and a.theme != "all" else {}
    sheet_rows = []
    for theme_id in themes:
        if a.theme != "all" and theme_id != a.theme:
            continue
        folder = os.path.join(SPOT_DIR, theme_id)
        for f in os.listdir(folder):
            if f.startswith("bg__d"):
                os.remove(os.path.join(folder, f))
        img = Image.open(os.path.join(folder, "bg.jpg")).convert("RGB")
        entries = []
        for n, region in enumerate(find_regions(img), 1):
            diff_id = f"d{n}"
            if diff_id in rejected.get(theme_id, []):
                continue
            out, change = recolor(img, region)
            if change < 60:
                print(f"{theme_id}/{diff_id}: too subtle ({change:.0f})")
                continue
            out.save(os.path.join(folder, f"bg__{diff_id}.jpg"), quality=85, optimize=True)
            entries.append({"id": diff_id, "rect": [round(v, 1) for v in region["rect"]]})
            sheet_rows.append((theme_id, diff_id, img, out, region["rect"]))
        result[theme_id] = entries
        print(f"{theme_id}: {len(entries)} area(s)")
    json.dump(result, open(OUT_JSON, "w"), indent=1)

    if a.sheet and sheet_rows:
        W, H = 320, 213
        sheet = Image.new("RGB", (W * 2 + 10, len(sheet_rows) * (H + 16)), "white")
        d = ImageDraw.Draw(sheet)
        for i, (tid, did, a_img, b_img, rect) in enumerate(sheet_rows):
            y = i * (H + 16)
            sheet.paste(a_img.resize((W, H)), (0, y))
            sheet.paste(b_img.resize((W, H)), (W + 10, y))
            x0, x1, y0, y1 = [v / 100 for v in rect]
            d.rectangle([W + 10 + x0 * W, y + y0 * H, W + 10 + x1 * W, y + y1 * H], outline=(255, 0, 0), width=2)
            d.text((2, y + H), f"{tid}/{did}", fill="black")
        sheet.save(a.sheet)
        print("sheet:", a.sheet)


if __name__ == "__main__":
    main()
