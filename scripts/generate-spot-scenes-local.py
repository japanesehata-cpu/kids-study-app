#!/usr/bin/env python3
"""まちがいさがし scene assets, generated on-device (SCENE ILLUSTRATION track, see
image-style-guardrail.mjs) with DreamShaper XL Lightning — an SDXL checkpoint that does
picture-book illustration well and is distilled to ~5 steps instead of SDXL's usual 30+.
Same outputs as generate-spot-scenes.mjs (the Gemini version): per theme in
spot-themes.json, a wide bg.jpg plus one transparent PNG per sprite (white backdrop keyed
out by key_white_background below, then cropped to the object).

Built to keep the machine cool rather than fast (requested): few steps, moderate sizes,
bf16, a long cooldown between images, and a wait whenever macOS reports
thermal throttling. Run it at background priority too:

    taskpolicy -c background ~/realvisxl-test/.venv/bin/python3 \\
        scripts/generate-spot-scenes-local.py --theme=all|sea [--out=DIR] [--only=bg,crab]

Env: SPOT_COOLDOWN_S (default 60), SPOT_MODEL_DIR (default
~/realvisxl-test/models/dreamshaper-xl-lightning).
"""
import argparse
import json
import os
import subprocess
import time

import torch
from diffusers import EulerDiscreteScheduler, StableDiffusionXLPipeline
from PIL import Image, ImageDraw, ImageFilter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
MODEL_DIR = os.environ.get("SPOT_MODEL_DIR", os.path.expanduser("~/realvisxl-test/models/dreamshaper-xl-lightning"))
COOLDOWN_S = float(os.environ.get("SPOT_COOLDOWN_S", 60))
# Euler (trailing spacing), 8 steps, guidance 3 — chosen from a side-by-side pilot: DPM++ SDE
# at 5 steps / guidance 2 gave dark, muddy, sepia images that ignored the style words.
STEPS = 8
GUIDANCE = 3.0
BG_SIZE = (1152, 768)
SPRITE_SIZE = (768, 768)
# Saved sizes: a panel renders ~350px wide on a phone, so 2x of that is plenty.
BG_SAVE = (960, 640)
# Sprites show at well under 240px on a phone; a 256-colour palette PNG at that size is ~15KB
# instead of ~120KB for full RGBA at 360px, with no visible loss in flat illustrations.
SPRITE_MAX = 240

STYLE = (
    "flat vector illustration for a children's picture book, simple flat shapes, bold clean "
    "outline, bright cheerful pastel colors, high key, clean, minimal"
)
NEGATIVE = (
    "photo, realistic, 3d, render, painting, vintage, sepia, dark, muted, gloomy, gradient "
    "background, shadow, text, letters, numbers, watermark, logo"
)
# Backgrounds must leave the stage empty for the puzzle's own objects.
# Things (not animals) kept coming back as a girl wearing the scarf / holding the map, or as a
# repeating wallpaper pattern; name those failures explicitly for every non-living sprite.
OBJECT_NEGATIVE = NEGATIVE + ", person, girl, boy, people, hands, face, eyes, scenery, pattern, multiple objects"
BG_NEGATIVE = NEGATIVE + ", chair, umbrella, toy, ball, bucket, boat, animal, people, character, object"


def background_prompt(desc):
    return f"{STYLE}, wide landscape background, {desc}, large empty open areas, nothing in the foreground"


def sprite_prompt(desc, living):
    face = "" if living else ", no face, no eyes"
    return f"{STYLE}, cute sticker of {desc}{face}, single object, whole object visible, centered, isolated on a solid pure white background"


def key_white_background(image, tolerance=28, pad=8):
    """Makes the white backdrop transparent and crops to the object. Only white CONNECTED
    TO THE EDGE is removed (flood fill from the border), so white parts inside the object —
    a sail, a highlight — survive. remove_bg.py is built for the mascots' coloured chroma
    key and rejects these stickers. The 1px blur softens the cut edge."""
    rgb = image.convert("RGB")
    marked = rgb.copy()
    sentinel = (255, 0, 255)
    w, h = marked.size
    for x in range(0, w, 8):
        for y in (0, h - 1):
            if sum(marked.getpixel((x, y))) > 3 * (255 - tolerance):
                ImageDraw.floodfill(marked, (x, y), sentinel, thresh=tolerance)
    for y in range(0, h, 8):
        for x in (0, w - 1):
            if sum(marked.getpixel((x, y))) > 3 * (255 - tolerance):
                ImageDraw.floodfill(marked, (x, y), sentinel, thresh=tolerance)
    mask = Image.new("L", (w, h), 255)
    mp, kp = marked.load(), mask.load()
    for y in range(h):
        for x in range(w):
            if mp[x, y] == sentinel:
                kp[x, y] = 0
    mask = mask.filter(ImageFilter.GaussianBlur(1))
    out = rgb.convert("RGBA")
    out.putalpha(mask)
    box = mask.point(lambda v: 255 if v > 24 else 0).getbbox()
    if box:
        l, t, r, b = box
        out = out.crop((max(0, l - pad), max(0, t - pad), min(w, r + pad), min(h, b + pad)))
    return out


def keying_failed(sprite):
    """True when the backdrop wasn't plain white (the model painted a sky square behind a
    seagull, say): after keying, the sticker's outer ring is still mostly opaque."""
    a = sprite.getchannel("A")
    w, h = a.size
    ring = [a.getpixel((x, y)) for x in range(w) for y in (0, 1, h - 2, h - 1)]
    ring += [a.getpixel((x, y)) for y in range(h) for x in (0, 1, w - 2, w - 1)]
    return sum(1 for v in ring if v > 128) / len(ring) > 0.3


def wait_until_cool():
    """Blocks while macOS reports thermal pressure (`pmset -g therm` shows a CPU speed
    limit below 100 or a recorded warning level)."""
    while True:
        out = subprocess.run(["pmset", "-g", "therm"], capture_output=True, text=True).stdout
        limited = any(
            line.strip().startswith("CPU_Speed_Limit") and not line.strip().endswith("100")
            for line in out.splitlines()
        )
        warned = "warning level" in out and "No thermal warning level" not in out
        if not limited and not warned:
            return
        print("  thermal pressure reported, waiting 120s...", flush=True)
        time.sleep(120)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--theme", default="all", help="theme id, or 'all'")
    ap.add_argument("--out")
    ap.add_argument("--only")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--pairs", help="comma-separated theme/id list to (re)generate, overriding --theme/--only")
    a = ap.parse_args()

    themes = json.load(open(os.path.join(SCRIPT_DIR, "spot-themes.json")))
    pairs = set(a.pairs.split(",")) if a.pairs else None
    theme_ids = list(themes) if a.theme == "all" or pairs else [a.theme]
    only = set(a.only.split(",")) if a.only else None

    jobs = []
    for theme in theme_ids:
        spec = themes[theme]
        out_dir = a.out or os.path.join(REPO_ROOT, "public", "images", "spot", theme)
        os.makedirs(out_dir, exist_ok=True)
        living = set(spec.get("living", []))
        jobs.append((theme, "bg", background_prompt(spec["background"]), BG_NEGATIVE, BG_SIZE, False, os.path.join(out_dir, "bg.jpg")))
        for sid, d in spec["sprites"].items():
            neg = NEGATIVE if sid in living else OBJECT_NEGATIVE
            jobs.append((theme, sid, sprite_prompt(d, sid in living), neg, SPRITE_SIZE, True, os.path.join(out_dir, f"{sid}.png")))
    # Resumable: anything already on disk is kept (delete a file to regenerate it).
    if pairs:
        jobs = [j for j in jobs if f"{j[0]}/{j[1]}" in pairs]
    else:
        jobs = [j for j in jobs if (not only or j[1] in only) and (only or not os.path.exists(j[6]))]
    print(f"{len(jobs)} image(s) to generate", flush=True)
    if not jobs:
        return

    pipe = StableDiffusionXLPipeline.from_pretrained(MODEL_DIR, torch_dtype=torch.bfloat16, variant="fp16")
    pipe.scheduler = EulerDiscreteScheduler.from_config(pipe.scheduler.config, timestep_spacing="trailing")
    # No enable_attention_slicing(): on Apple GPUs in bf16 it produces NaN (a blank image)
    # at any size above 512px, and it only saves memory, not heat.
    pipe = pipe.to("mps")
    pipe.vae.to(torch.float32)

    def decode(latents):
        with torch.no_grad():
            img = pipe.vae.decode(latents.to(torch.float32) / pipe.vae.config.scaling_factor).sample
        img = ((img[0].clamp(-1, 1) + 1) * 127.5).round().to(torch.uint8).permute(1, 2, 0).cpu().numpy()
        return Image.fromarray(img)

    for i, (theme, job_id, prompt, negative, (w, h), is_sprite, target) in enumerate(jobs):
        wait_until_cool()
        t0 = time.time()
        for attempt in range(3 if is_sprite else 1):
            gen = torch.Generator(device="cpu").manual_seed(a.seed + i + 1000 * attempt)
            latents = pipe(
                prompt=prompt, negative_prompt=negative, width=w, height=h,
                num_inference_steps=STEPS, guidance_scale=GUIDANCE, generator=gen, output_type="latent",
            ).images
            image = decode(latents)
            if not is_sprite:
                break
            sprite = key_white_background(image)
            if not keying_failed(sprite):
                break
            print(f"  {theme}/{job_id}: backdrop not white, retrying with a new seed", flush=True)
            time.sleep(COOLDOWN_S)
        if is_sprite:
            sprite.thumbnail((SPRITE_MAX, SPRITE_MAX), Image.LANCZOS)
            sprite = sprite.quantize(colors=256, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG)
            sprite.save(target, optimize=True)
        else:
            image.resize(BG_SAVE, Image.LANCZOS).convert("RGB").save(target, quality=85, optimize=True)
        print(f"done {theme}/{job_id} in {time.time() - t0:.0f}s ({i + 1}/{len(jobs)})", flush=True)
        if i < len(jobs) - 1:
            time.sleep(COOLDOWN_S)

if __name__ == "__main__":
    main()
