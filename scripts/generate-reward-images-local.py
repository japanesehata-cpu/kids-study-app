#!/usr/bin/env python3
"""Reward-burst decorations for the results screen (public/images/rewards/<id>.png, shown
by src/components/StampReward.tsx), generated on-device — the DECORATION track in
image-style-guardrail.mjs. Replaces the Gemini version (generate-reward-images.mjs), since
Gemini is reserved for character design (docs/architecture.md).

Same checkpoint and settings as the まちがいさがし scripts (DreamShaper XL Lightning, Euler
trailing, few steps, bf16 on Apple GPU, fp32 VAE decode). Each image is drawn on a flat
plain white backdrop, which is keyed out here (light, nearly grey pixels connected to the
border — see key_backdrop), then tidied: only the centred object is kept (floor
shadows and specks dropped) and it is re-centred in a square.

Candidates are written to a review folder, never straight into public/ — look at the sheet,
then copy the chosen one over:

    taskpolicy -c background ~/realvisxl-test/.venv/bin/python3 \\
        scripts/generate-reward-images-local.py [--only=medal,star] [--seeds=3] [--seed0=1] \\
        [--out=DIR] [--sheet=OUT.png]
    cp <out>/medal_s2.png public/images/rewards/medal.png

Env: SPOT_COOLDOWN_S (default 20), SPOT_MODEL_DIR.
"""
import argparse
import os
import time

import numpy as np
import torch
from diffusers import EulerDiscreteScheduler, StableDiffusionXLPipeline
from PIL import Image, ImageDraw, ImageFilter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
REWARD_DIR = os.path.join(REPO_ROOT, "public", "images", "rewards")
MODEL_DIR = os.environ.get("SPOT_MODEL_DIR", os.path.expanduser("~/realvisxl-test/models/dreamshaper-xl-lightning"))
COOLDOWN_S = float(os.environ.get("SPOT_COOLDOWN_S", 20))
STEPS = 8
GUIDANCE = 3.0
GEN_SIZE = 1024
ICON_SIZE = 320  # same as the existing assets

# Keep these ids in sync with src/components/StampReward.tsx. Shipped picks: medal seed 1,
# star seed 2 (both with the first prompts below), heart seed 13, sparkle seed 11.
REWARDS = {
    "medal": "a gold medal on a short red and blue ribbon, a raised star on the medal",
    "star": "one five-pointed gold star with rounded points",
    "heart": "one pink and red heart floating in the air",
    # "cross" is what finally got four points (the shipped one is seed 11) — but most seeds
    # then draw a literal cross, so expect to look through several. Without it: 5-6 points.
    "sparkle": "one simple four-pointed twinkle sparkle shaped like a thin cross with long curved points, pale gold, glowing white core",
}

# The DECORATION_STYLE_GUARDRAIL in image-style-guardrail.mjs, rewritten as SDXL tags. CLIP
# reads only the first 77 tokens, so the backdrop comes right after the object — when it was
# last it got cut off and the model painted a grey studio gradient that can't be keyed out.
# White, not a chroma-key green: naming a colour for the backdrop tinted the object itself
# (green stars and hearts), while white is what the まちがいさがし sprites already key well.
STYLE = (
    "isolated on a plain pure white background, cute glossy 3d game reward icon, polished, "
    "jewel-like shine, bright highlights, smooth rounded shapes, warm pastel colors, centered"
)
NEGATIVE = (
    "shadow, drop shadow, floor, ground, reflection, gradient, vignette, grey background, green, "
    "face, eyes, character, text, letters, watermark, logo, photo, dark, muted, "
    "multiple objects, cropped, frame, border"
)
MARGIN = 0.06  # empty border around the object in the final square, like the current assets


def prompt_for(detail):
    return f"{detail}, {STYLE}"


def components(alpha, threshold=128):
    """Connected opaque regions of an alpha array, largest first, as lists of (y, x)."""
    h, w = alpha.shape
    seen = alpha < threshold
    found = []
    for y0 in range(h):
        for x0 in range(w):
            if seen[y0, x0]:
                continue
            seen[y0, x0] = True
            stack, pixels = [(y0, x0)], []
            while stack:
                y, x = stack.pop()
                pixels.append((y, x))
                for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= yy < h and 0 <= xx < w and not seen[yy, xx]:
                        seen[yy, xx] = True
                        stack.append((yy, xx))
            found.append(pixels)
    return sorted(found, key=len, reverse=True)


def tidy(path):
    """Drops what the keying left behind besides the object — a floor shadow or reflection
    in a slightly different green, specks — by keeping only the biggest opaque region (plus
    any piece at least a fifth its size, e.g. a detached ribbon end), then crops to it and
    re-centres it in a square. Returns a warning when there's no clear object left, i.e. the
    backdrop wasn't keyable and the cut ate the object."""
    im = Image.open(path).convert("RGBA")
    arr = np.asarray(im).copy()
    h, w = arr.shape[:2]
    parts = [p for p in components(arr[..., 3]) if len(p) >= 0.01 * h * w]
    if not parts:
        return ["no solid object left after keying (backdrop probably not plain white)"]
    # The object is the region nearest the centre (it was asked for centred); a leftover
    # patch of backdrop can be bigger, but it sits against the edge.
    def centre_distance(part):
        return min((y - h / 2) ** 2 + (x - w / 2) ** 2 for y, x in part[:: max(1, len(part) // 400)])

    def touches_edge(part):
        return any(y in (0, h - 1) or x in (0, w - 1) for y, x in part)

    main = min(parts, key=centre_distance)
    keep = np.zeros(arr.shape[:2], bool)
    for part in parts:
        if part is main or (len(part) >= 0.2 * len(main) and not touches_edge(part)):
            ys, xs = zip(*part)
            keep[list(ys), list(xs)] = True
    warnings = [] if len(main) >= 0.04 * h * w else ["object is tiny after keying, check it"]
    # Grow the kept mask by a couple of pixels so the soft anti-aliased edge stays.
    grown = Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
    arr[..., 3] = np.minimum(arr[..., 3], np.asarray(grown))
    out = Image.fromarray(arr)
    out = out.crop(out.getbbox())
    side = int(max(out.size) / (1 - 2 * MARGIN))
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.alpha_composite(out, ((side - out.width) // 2, (side - out.height) // 2))
    square.resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS).save(path)
    return warnings


def key_backdrop(image):
    """Makes the light backdrop transparent. The model paints it as a soft off-white studio
    gradient with a faint floor shadow, not one flat colour, so a pixel counts as backdrop
    when it is light and nearly grey (the gold, pink and red of the rewards are all strongly
    coloured) — and only when it is connected to the image border, so a white highlight
    inside the object survives. remove_bg.py is built for the mascots' chroma key and ate
    the gold and pink here."""
    rgb = np.asarray(image.convert("RGB")).astype(int)
    h, w = rgb.shape[:2]
    chroma = rgb.max(-1) - rgb.min(-1)
    light = rgb.mean(-1)
    candidate = (chroma < 28) & (light > 165)
    backdrop = np.zeros((h, w), bool)
    stack = [(y, x) for y in range(h) for x in (0, w - 1)] + [(y, x) for x in range(w) for y in (0, h - 1)]
    while stack:
        y, x = stack.pop()
        if backdrop[y, x] or not candidate[y, x]:
            continue
        backdrop[y, x] = True
        for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= yy < h and 0 <= xx < w and not backdrop[yy, xx]:
                stack.append((yy, xx))
    alpha = Image.fromarray(np.where(backdrop, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1))
    out = image.convert("RGBA")
    out.putalpha(alpha)
    return out


def cut_out(raw_image, out_path):
    """Key out the backdrop at the shipped size, then tidy. Returns warnings (empty when the
    result looks like one clean object)."""
    small = raw_image.convert("RGB").resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS)
    key_backdrop(small).save(out_path)
    return tidy(out_path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only")
    ap.add_argument("--seeds", type=int, default=3)
    ap.add_argument("--seed0", type=int, default=1)
    ap.add_argument("--out", default=os.path.join(REPO_ROOT, "..", "reward-review"))
    ap.add_argument("--sheet")
    a = ap.parse_args()
    ids = a.only.split(",") if a.only else list(REWARDS)
    unknown = [i for i in ids if i not in REWARDS]
    if unknown:
        raise SystemExit(f"unknown reward id(s): {', '.join(unknown)} (known: {', '.join(REWARDS)})")
    os.makedirs(a.out, exist_ok=True)

    pipe = StableDiffusionXLPipeline.from_pretrained(MODEL_DIR, torch_dtype=torch.bfloat16, variant="fp16")
    pipe.scheduler = EulerDiscreteScheduler.from_config(pipe.scheduler.config, timestep_spacing="trailing")
    pipe = pipe.to("mps")
    # bf16 VAE decode gives a blank image on Apple GPUs.
    pipe.vae.to(torch.float32)

    def decode(latents):
        with torch.no_grad():
            img = pipe.vae.decode(latents.to(torch.float32) / pipe.vae.config.scaling_factor).sample
        img = ((img[0].clamp(-1, 1) + 1) * 127.5).round().to(torch.uint8).permute(1, 2, 0).cpu().numpy()
        return Image.fromarray(img)

    results = []
    n_jobs = len(ids) * a.seeds
    done = 0
    for rid in ids:
        for s in range(a.seeds):
            seed = a.seed0 + s
            t0 = time.time()
            gen = torch.Generator(device="cpu").manual_seed(seed)
            latents = pipe(
                prompt=prompt_for(REWARDS[rid]), negative_prompt=NEGATIVE, width=GEN_SIZE, height=GEN_SIZE,
                num_inference_steps=STEPS, guidance_scale=GUIDANCE, generator=gen, output_type="latent",
            ).images
            raw_image = decode(latents)
            raw_image.save(os.path.join(a.out, f"{rid}_s{seed}.raw.png"))
            out = os.path.join(a.out, f"{rid}_s{seed}.png")
            warnings = cut_out(raw_image, out)
            results.append((rid, seed, out, warnings))
            done += 1
            note = "" if not warnings else " — CHECK: " + "; ".join(warnings)
            print(f"done {rid} seed {seed} in {time.time() - t0:.0f}s ({done}/{n_jobs}){note}", flush=True)
            if done < n_jobs:
                time.sleep(COOLDOWN_S)

    if a.sheet:
        # Current asset first, then each candidate, on two backdrops (the results screen is
        # light pink; dark shows any leftover green fringe).
        T = 180
        cols = a.seeds + 1
        sheet = Image.new("RGB", (cols * T, len(ids) * (2 * T + 16)), "white")
        d = ImageDraw.Draw(sheet)
        for r, rid in enumerate(ids):
            current = os.path.join(REWARD_DIR, f"{rid}.png")
            row = [current if os.path.exists(current) else None] + [p for i, _, p, _ in results if i == rid]
            y = r * (2 * T + 16)
            for c, p in enumerate(row):
                if not p:
                    continue
                im = Image.open(p).convert("RGBA").resize((T, T))
                for k, colour in enumerate(((255, 233, 244), (60, 50, 60))):
                    bg = Image.new("RGBA", (T, T), colour + (255,))
                    bg.alpha_composite(im)
                    sheet.paste(bg.convert("RGB"), (c * T, y + k * T))
            d.text((2, y + 2 * T + 2), f"{rid}: current, seeds {a.seed0}..{a.seed0 + a.seeds - 1}", fill="black")
        sheet.save(a.sheet)
        print("sheet:", a.sheet)

    flagged = [f"{rid}_s{seed}" for rid, seed, _, w in results if w]
    if flagged:
        print(f"{len(flagged)} candidate(s) flagged, look closely: {', '.join(flagged)}")


if __name__ == "__main__":
    main()
