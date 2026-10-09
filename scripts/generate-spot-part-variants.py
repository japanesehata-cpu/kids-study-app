#!/usr/bin/env python3
"""まちがいさがし "part" difference: <sprite>__part.png — the same sticker with ONE part
changed (a shorter tail, a longer beak, closed eyes, different ears), so the two pictures
differ only in that detail. Uses SDXL inpainting (same DreamShaper XL Lightning checkpoint as
generate-spot-scenes-local.py) on just the boxes listed in scripts/spot-part-variants.json;
every pixel outside those boxes is copied from the original sprite, so nothing else can
drift.

    taskpolicy -c background ~/realvisxl-test/.venv/bin/python3 \\
        scripts/generate-spot-part-variants.py [--pairs=forest/fox,...] [--force]

Resumable (existing __part.png files are kept unless --force). Env: SPOT_COOLDOWN_S
(default 45). Afterwards run scripts/build-spot-scenes.py so spotScenes.ts picks up
`partVariant`.
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
MODEL_DIR = os.environ.get("SPOT_MODEL_DIR", os.path.expanduser("~/realvisxl-test/models/dreamshaper-xl-lightning"))
COOLDOWN_S = float(os.environ.get("SPOT_COOLDOWN_S", 45))
CANVAS = 768
INNER = 640  # sprite is drawn this big, centred, on the white canvas
STYLE = (
    "flat vector illustration for a children's picture book, simple flat shapes, bold clean "
    "outline, bright cheerful pastel colors, high key, clean, minimal"
)
NEGATIVE = (
    "photo, realistic, 3d, render, painting, vintage, sepia, dark, muted, gloomy, gradient "
    "background, shadow, text, letters, numbers, watermark, logo"
)
MIN_CHANGE = 18
RIM_PX_BIG = 10  # white die-cut rim width on the 768 canvas (~3-4px at sprite size, like the originals)  # mean RGB distance inside the mask for a variant to count


def white_alpha(rgb, tolerance=28, grey=True):
    """Alpha for a generated canvas: white connected to the border is transparent. The fill
    runs on a slightly shrunk white mask so it can't leak through a 1-2px gap in an outline
    into white parts inside the object (eye whites, a white belly)."""
    arr = np.asarray(rgb.convert("RGB")).astype(int)
    light = arr.min(-1) > 255 - tolerance
    # Inpainted backdrops sometimes come out light grey rather than pure white.
    greyish = (arr.max(-1) - arr.min(-1) < 14) & (arr.min(-1) > 185) if grey else False
    white = Image.fromarray(np.where(light | greyish, 255, 0).astype(np.uint8))
    # .copy(): an image made by fromarray shares numpy's buffer and floodfill silently no-ops on it.
    marks = white.filter(ImageFilter.MinFilter(5)).copy()
    w, h = marks.size
    border = [(x, y) for x in range(0, w, 4) for y in (0, h - 1)] + [(x, y) for y in range(0, h, 4) for x in (0, w - 1)]
    for xy in border:
        if marks.getpixel(xy) == 255:
            ImageDraw.floodfill(marks, xy, 128)
    reached = Image.fromarray(np.where(np.asarray(marks) == 128, 255, 0).astype(np.uint8))
    bg = (np.asarray(reached.filter(ImageFilter.MaxFilter(5))) > 0) & (np.asarray(white) > 0)
    return np.where(bg, 0, 255).astype(np.uint8)


def thermal_wait():
    for _ in range(60):
        out = os.popen("pmset -g therm 2>/dev/null").read()
        if "CPU_Speed_Limit" not in out or "CPU_Speed_Limit \t= 100" in out or "= 100" in out:
            return
        time.sleep(30)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pairs")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--seed", type=int, default=11)
    ap.add_argument("--strength", type=float, default=1.0)
    ap.add_argument("--guidance", type=float, default=4.5)
    a = ap.parse_args()
    spec = {k: v for k, v in json.load(open(os.path.join(SCRIPT_DIR, "spot-part-variants.json"))).items() if not k.startswith("_") and not v.get("rejected")}
    wanted = a.pairs.split(",") if a.pairs else list(spec)
    jobs = [p for p in wanted if a.force or not os.path.exists(os.path.join(SPOT_DIR, f"{p}__part.png"))]
    print(f"{len(jobs)} part variant(s) to generate", flush=True)
    if not jobs:
        return

    pipe = StableDiffusionXLInpaintPipeline.from_pretrained(MODEL_DIR, torch_dtype=torch.bfloat16, variant="fp16")
    pipe.scheduler = EulerDiscreteScheduler.from_config(pipe.scheduler.config, timestep_spacing="trailing")
    pipe = pipe.to("mps")
    pipe.vae.to(torch.float32)

    def decode(latents):
        # The inpaint pipeline casts the VAE back to the pipeline dtype after encoding the
        # input image, so force fp32 again here (bf16 VAE decode → blank image on Apple GPU).
        pipe.vae.to(torch.float32)
        with torch.no_grad():
            img = pipe.vae.decode(latents.to(torch.float32) / pipe.vae.config.scaling_factor).sample
        img = ((img[0].clamp(-1, 1) + 1) * 127.5).round().to(torch.uint8).permute(1, 2, 0).cpu().numpy()
        return Image.fromarray(img)

    for i, pair in enumerate(jobs):
        thermal_wait()
        t0 = time.time()
        entry = spec[pair]
        src = Image.open(os.path.join(SPOT_DIR, f"{pair}.png")).convert("RGBA")
        sw, sh = src.size
        scale = INNER / max(sw, sh)
        w, h = round(sw * scale), round(sh * scale)
        ox, oy = (CANVAS - w) // 2, (CANVAS - h) // 2
        canvas = Image.new("RGB", (CANVAS, CANVAS), (255, 255, 255))
        big = src.resize((w, h), Image.LANCZOS)
        canvas.paste(big, (ox, oy), big)

        mask = Image.new("L", (CANVAS, CANVAS), 0)
        md = ImageDraw.Draw(mask)
        for x0, y0, x1, y1 in entry["boxes"]:
            md.rounded_rectangle([ox + x0 * w, oy + y0 * h, ox + x1 * w, oy + y1 * h], radius=24, fill=255)

        # A blurred mask lets the model blend the new part into the old outline instead of
        # drawing a seam along the box edge.
        soft_mask = mask.filter(ImageFilter.GaussianBlur(10))

        # Blank the part in the input — otherwise the model mostly redraws the same part.
        init = canvas.copy()
        init.paste((255, 255, 255), (0, 0, CANVAS, CANVAS), mask)

        gen = torch.Generator(device="cpu").manual_seed(a.seed + i)
        latents = pipe(
            prompt=f"{STYLE}, {entry['prompt']}, cute sticker, isolated on a solid pure white background",
            negative_prompt=NEGATIVE, image=init, mask_image=soft_mask, width=CANVAS, height=CANVAS,
            num_inference_steps=10, strength=a.strength, guidance_scale=a.guidance, generator=gen, output_type="latent",
        ).images
        out = decode(latents)
        if os.environ.get("SPOT_DEBUG_DIR"):
            out.save(os.path.join(os.environ["SPOT_DEBUG_DIR"], pair.replace("/", "_") + "_raw.png"))
            Image.fromarray(white_alpha(out)).save(os.path.join(os.environ["SPOT_DEBUG_DIR"], pair.replace("/", "_") + "_alpha.png"))

        # Everything outside the repaint zone is the ORIGINAL sprite, pixel for pixel. Inside
        # it, the object is what the model drew minus its white backdrop (keyed on the big
        # canvas, where the cut is clean), and a fresh white die-cut rim is grown around it
        # to match the rest of the sticker.
        gen_obj = Image.fromarray(white_alpha(out))
        rim_big = gen_obj.filter(ImageFilter.MaxFilter(RIM_PX_BIG * 2 + 1))
        crop_box = (ox, oy, ox + w, oy + h)
        to_small = lambda im: im.crop(crop_box).resize((sw, sh), Image.LANCZOS)
        gen_rgb = np.asarray(to_small(out)).astype(float)
        obj_s = np.asarray(to_small(gen_obj)).astype(float) / 255
        rim_s = np.asarray(to_small(rim_big)).astype(float) / 255
        zone = np.asarray(to_small(soft_mask)).astype(float)[..., None] / 255

        white = np.full_like(gen_rgb, 255.0)
        gen_color = gen_rgb * obj_s[..., None] + white * (1 - obj_s[..., None])
        gen_rgba = np.dstack([gen_color, rim_s * 255])
        src_arr = np.asarray(src).astype(float)
        merged = src_arr * (1 - zone) + gen_rgba * zone
        # Opacity switches over hard at the zone's midline: blending it would leave the
        # original's rim as a half-transparent ghost outline next to the new part.
        merged[..., 3] = np.where(zone[..., 0] > 0.5, gen_rgba[..., 3], src_arr[..., 3])
        if entry.get("keepShape"):
            # An inside change (eyes, a pattern): the outline must not move, so keep the
            # original's opacity and only take the new colours.
            merged[..., 3] = src_arr[..., 3]
            merged[..., :3] = src_arr[..., :3] * (1 - zone) + gen_rgb * zone
        rgba = np.clip(merged + 0.5, 0, 255).astype(np.uint8)

        # Drop stray specks the model left floating near the part: keep only what is
        # connected to the sticker's body (seeded from the original's solid centre).
        solid = Image.fromarray(np.where(rgba[..., 3] > 128, 255, 0).astype(np.uint8)).copy()
        # The seed must be a pixel the repaint didn't touch, or a part that changed right
        # at the centre could make the fill start in empty space and erase the whole sticker.
        ys, xs = np.nonzero((src_arr[..., 3] > 250) & (rgba[..., 3] > 250) & (zone[..., 0] < 0.05))
        k = np.argmin((ys - ys.mean()) ** 2 + (xs - xs.mean()) ** 2)
        ImageDraw.floodfill(solid, (int(xs[k]), int(ys[k])), 128)
        rgba[np.asarray(solid) == 255, 3] = 0
        result = Image.fromarray(rgba)

        m_small = np.asarray(soft_mask.crop((ox, oy, ox + w, oy + h)).resize((sw, sh))) > 128
        res_arr = np.asarray(result).astype(float)
        src_arr = np.asarray(src).astype(float)
        diff = np.sqrt((((res_arr[..., :3] * res_arr[..., 3:] - src_arr[..., :3] * src_arr[..., 3:]) / 255) ** 2).sum(-1))
        change = diff[m_small].mean() if m_small.any() else 0
        target = os.path.join(SPOT_DIR, f"{pair}__part.png")
        if change < MIN_CHANGE:
            print(f"{pair}: change too small ({change:.0f}) — not saved", flush=True)
        else:
            result.quantize(colors=256, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG).save(target, optimize=True)
            print(f"done {pair} (change {change:.0f}) in {time.time() - t0:.0f}s ({i + 1}/{len(jobs)})", flush=True)
        if i < len(jobs) - 1:
            time.sleep(COOLDOWN_S)


if __name__ == "__main__":
    main()
