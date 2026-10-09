#!/usr/bin/env python3
"""まちがいさがし background differences drawn by AI (approach B): repaints one box of a
theme's bg.jpg — usually removing what's there (a cloud, a tree, a picture on the wall) —
and writes bg__<id>.jpg. Only the box (with a feathered edge) comes from the model; every
other pixel is the original, so nothing else in the picture can drift. Same checkpoint and
settings family as generate-spot-part-variants.py.

Spec: scripts/spot-bg-inpaint.json. Output list: scripts/spot-bg-inpaint-diffs.json
({theme: [{id, rect}]}), which build-spot-scenes.py merges with spot-bg-diffs.json.

    taskpolicy -c background ~/realvisxl-test/.venv/bin/python3 \\
        scripts/generate-spot-bg-inpaint.py [--pairs=sea/b1,...] [--force] [--seed=N] [--sheet=OUT.png]

Resumable (existing files kept unless --force). Env: SPOT_COOLDOWN_S (default 30).
"""
import argparse
import json
import os
import time

import numpy as np
import torch
from diffusers import EulerDiscreteScheduler, StableDiffusionXLInpaintPipeline
from PIL import Image, ImageDraw, ImageFilter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
SPOT_DIR = os.path.join(REPO_ROOT, "public", "images", "spot")
SPEC = os.path.join(SCRIPT_DIR, "spot-bg-inpaint.json")
OUT_JSON = os.path.join(SCRIPT_DIR, "spot-bg-inpaint-diffs.json")
MODEL_DIR = os.environ.get("SPOT_MODEL_DIR", os.path.expanduser("~/realvisxl-test/models/dreamshaper-xl-lightning"))
COOLDOWN_S = float(os.environ.get("SPOT_COOLDOWN_S", 30))
GEN_SIZE = (1152, 768)
STYLE = (
    "flat vector illustration for a children's picture book, simple flat shapes, bold clean "
    "outline, bright cheerful pastel colors, high key, clean, minimal"
)
NEGATIVE = (
    "photo, realistic, 3d, render, painting, vintage, sepia, dark, muted, gloomy, text, "
    "letters, numbers, watermark, logo, person, people, animal, character"
)


def load_spec():
    spec = json.load(open(SPEC))
    return {t: v for t, v in spec.items() if not t.startswith("_")}


def write_outputs():
    """Lists every non-rejected entry whose image exists."""
    out = {}
    for theme, entries in load_spec().items():
        keep = [
            {"id": e["id"], "rect": e["box"]}
            for e in entries
            if not e.get("rejected") and os.path.exists(os.path.join(SPOT_DIR, theme, f"bg__{e['id']}.jpg"))
        ]
        if keep:
            out[theme] = keep
    json.dump(out, open(OUT_JSON, "w"), indent=1)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pairs")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--seed", type=int, default=21)
    ap.add_argument("--sheet")
    a = ap.parse_args()
    spec = load_spec()
    wanted = set(a.pairs.split(",")) if a.pairs else None
    jobs = []
    for theme, entries in spec.items():
        for e in entries:
            key = f"{theme}/{e['id']}"
            if e.get("rejected") or (wanted and key not in wanted):
                continue
            target = os.path.join(SPOT_DIR, theme, f"bg__{e['id']}.jpg")
            if a.force or not os.path.exists(target):
                jobs.append((theme, e, target))
    print(f"{len(jobs)} background repaint(s) to generate", flush=True)

    if jobs:
        pipe = StableDiffusionXLInpaintPipeline.from_pretrained(MODEL_DIR, torch_dtype=torch.bfloat16, variant="fp16")
        pipe.scheduler = EulerDiscreteScheduler.from_config(pipe.scheduler.config, timestep_spacing="trailing")
        pipe = pipe.to("mps")

        def decode(latents):
            # The inpaint pipeline re-casts the VAE after encoding; bf16 decode → blank image on Apple GPU.
            pipe.vae.to(torch.float32)
            with torch.no_grad():
                img = pipe.vae.decode(latents.to(torch.float32) / pipe.vae.config.scaling_factor).sample
            img = ((img[0].clamp(-1, 1) + 1) * 127.5).round().to(torch.uint8).permute(1, 2, 0).cpu().numpy()
            return Image.fromarray(img)

        for i, (theme, e, target) in enumerate(jobs):
            t0 = time.time()
            src = Image.open(os.path.join(SPOT_DIR, theme, "bg.jpg")).convert("RGB")
            big = src.resize(GEN_SIZE, Image.LANCZOS)
            gw, gh = GEN_SIZE
            x0, x1, y0, y1 = e["box"]
            mask = Image.new("L", GEN_SIZE, 0)
            ImageDraw.Draw(mask).rounded_rectangle([x0 / 100 * gw, y0 / 100 * gh, x1 / 100 * gw, y1 / 100 * gh], radius=18, fill=255)
            soft = mask.filter(ImageFilter.GaussianBlur(12))
            # The box starts as a heavy blur of itself: keeps the area's colours as a hint but
            # wipes out the thing being removed, so the model doesn't just redraw it.
            init = big.copy()
            init.paste(big.filter(ImageFilter.GaussianBlur(40)), (0, 0), mask)
            gen = torch.Generator(device="cpu").manual_seed(a.seed + i)
            latents = pipe(
                prompt=f"{STYLE}, background scenery, {e['prompt']}",
                negative_prompt=NEGATIVE, image=init, mask_image=soft, width=gw, height=gh,
                num_inference_steps=10, strength=0.99, guidance_scale=4.5, generator=gen, output_type="latent",
            ).images
            out = decode(latents).resize(src.size, Image.LANCZOS)
            m = np.asarray(soft.resize(src.size, Image.LANCZOS)).astype(float)[..., None] / 255
            merged = np.asarray(src).astype(float) * (1 - m) + np.asarray(out).astype(float) * m
            Image.fromarray(np.clip(merged + 0.5, 0, 255).astype(np.uint8)).save(target, quality=85, optimize=True)
            print(f"done {theme}/{e['id']} in {time.time() - t0:.0f}s ({i + 1}/{len(jobs)})", flush=True)
            if i < len(jobs) - 1:
                time.sleep(COOLDOWN_S)

    out = write_outputs()
    print(f"{sum(len(v) for v in out.values())} usable background repaint(s) in {len(out)} theme(s)")

    if a.sheet:
        rows = [(t, e) for t, es in spec.items() for e in es if not e.get("rejected") and (not wanted or f"{t}/{e['id']}" in wanted)
                and os.path.exists(os.path.join(SPOT_DIR, t, f"bg__{e['id']}.jpg"))]
        W, H = 400, 267
        sheet = Image.new("RGB", (W * 2 + 10, len(rows) * (H + 16)), "white")
        d = ImageDraw.Draw(sheet)
        for r, (t, e) in enumerate(rows):
            y = r * (H + 16)
            sheet.paste(Image.open(os.path.join(SPOT_DIR, t, "bg.jpg")).resize((W, H)), (0, y))
            sheet.paste(Image.open(os.path.join(SPOT_DIR, t, f"bg__{e['id']}.jpg")).resize((W, H)), (W + 10, y))
            x0, x1, y0, y1 = [v / 100 for v in e["box"]]
            d.rectangle([x0 * W, y + y0 * H, x1 * W, y + y1 * H], outline=(255, 0, 0), width=1)
            d.text((2, y + H + 2), f"{t}/{e['id']}: {e['prompt']}", fill="black")
        sheet.save(a.sheet)
        print("sheet:", a.sheet)


if __name__ == "__main__":
    main()
