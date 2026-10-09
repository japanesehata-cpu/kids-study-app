#!/usr/bin/env python3
"""Closed-eye frames for the mascot portraits (public/images/characters/<id>__blink.png),
used by CharacterPortrait for a quick blink. SDXL inpainting (the same DreamShaper XL
Lightning checkpoint as the まちがいさがし scripts) repaints ONLY the two eye areas listed in
scripts/blink-eyes.json; every other pixel — and the whole alpha channel — is the original.

The face is cropped and upscaled to 1024 so the model works at its native size, the eye
areas are first filled with the surrounding skin tone (otherwise the model just redraws open
eyes), and the result is feathered back in.

    taskpolicy -c background ~/realvisxl-test/.venv/bin/python3 \\
        scripts/generate-blink-portraits.py [--ids=momo,sora] [--seeds=3] [--out=DIR] [--sheet=OUT.png]

Writes candidates as <out>/<id>__blink_s<seed>.png (default out: a review folder); copy the
chosen one to public/images/characters/<id>__blink.png after looking at the sheet.
Env: SPOT_COOLDOWN_S (default 20).
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
CHAR_DIR = os.path.join(REPO_ROOT, "public", "images", "characters")
MODEL_DIR = os.environ.get("SPOT_MODEL_DIR", os.path.expanduser("~/realvisxl-test/models/dreamshaper-xl-lightning"))
COOLDOWN_S = float(os.environ.get("SPOT_COOLDOWN_S", 20))
GEN = 1024
CROP = 240  # face crop (in the 480px portrait) that gets upscaled to GEN
PAD = 6  # px around each eye box in the portrait (less above, where the fringe starts)
PAD_TOP = 1

PROMPT = (
    "cute 3d chibi doll character face, cartoon render, sleeping, both eyes closed shut, each "
    "closed eye drawn as a simple downward curved line with a few eyelashes, no eyeballs "
    "visible, peaceful happy expression, smooth skin, soft studio lighting, pastel colors"
)
NEGATIVE = "hair over face, bangs over eyes, open eyes, brown eyes, small eyes, eyeballs, looking at viewer, winking, iris, pupil, eyeball, sclera, eye highlights, staring, text, watermark, realistic photo"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids")
    ap.add_argument("--seeds", type=int, default=3)
    ap.add_argument("--seed0", type=int, default=5)
    ap.add_argument("--out", default=os.path.join(REPO_ROOT, "..", "blink-review"))
    ap.add_argument("--sheet")
    a = ap.parse_args()
    spec = {k: v for k, v in json.load(open(os.path.join(SCRIPT_DIR, "blink-eyes.json"))).items() if not k.startswith("_")}
    ids = a.ids.split(",") if a.ids else list(spec)
    os.makedirs(a.out, exist_ok=True)

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

    results = []
    n_jobs = len(ids) * a.seeds
    done = 0
    for cid in ids:
        src = Image.open(os.path.join(CHAR_DIR, f"{cid}.png")).convert("RGBA")
        boxes = spec[cid]
        cx = (boxes[0][0] + boxes[1][2]) / 2
        cy = (min(b[1] for b in boxes) + max(b[3] for b in boxes)) / 2
        x0 = int(round(cx - CROP / 2))
        y0 = int(round(cy - CROP / 2))
        crop_box = (x0, y0, x0 + CROP, y0 + CROP)
        k = GEN / CROP

        # Opaque face crop on a neutral backdrop (only matters at the very edges).
        face = Image.new("RGBA", (CROP, CROP), (250, 225, 220, 255))
        face.alpha_composite(src.crop(crop_box))
        big = face.convert("RGB").resize((GEN, GEN), Image.LANCZOS)

        mask = Image.new("L", (GEN, GEN), 0)
        md = ImageDraw.Draw(mask)
        for bx0, by0, bx1, by1 in boxes:
            md.ellipse([(bx0 - PAD - x0) * k, (by0 - PAD_TOP - y0) * k, (bx1 + PAD - x0) * k, (by1 + PAD - y0) * k], fill=255)
        soft = mask.filter(ImageFilter.GaussianBlur(14))

        # Fill each eye with the skin just below it (the cheek), so there is no eye left for
        # the model to copy.
        arr = np.asarray(big).astype(float)
        init = arr.copy()
        for bx0, by0, bx1, by1 in boxes:
            sx0, sx1 = int((bx0 - x0) * k), int((bx1 - x0) * k)
            sy = int((by1 + PAD + 4 - y0) * k)
            skin = np.median(arr[sy : sy + int(8 * k), sx0:sx1].reshape(-1, 3), axis=0)
            eye = Image.new("L", mask.size, 0)
            ImageDraw.Draw(eye).ellipse(
                [(bx0 - PAD - x0) * k, (by0 - PAD_TOP - y0) * k, (bx1 + PAD - x0) * k, (by1 + PAD - y0) * k], fill=255
            )
            init[np.asarray(eye) > 0] = skin
        init_img = Image.fromarray(np.clip(init, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
        # keep everything outside the eyes sharp
        init_img = Image.composite(init_img, big, mask)

        for s in range(a.seeds):
            seed = a.seed0 + s
            t0 = time.time()
            gen = torch.Generator(device="cpu").manual_seed(seed)
            latents = pipe(
                prompt=PROMPT, negative_prompt=NEGATIVE, image=init_img, mask_image=soft, width=GEN, height=GEN,
                num_inference_steps=10, strength=0.99, guidance_scale=4.5, generator=gen, output_type="latent",
            ).images
            out = decode(latents).resize((CROP, CROP), Image.LANCZOS)
            m = np.asarray(soft.resize((CROP, CROP), Image.LANCZOS)).astype(float)[..., None] / 255
            res = np.asarray(src).astype(float).copy()
            region = res[y0 : y0 + CROP, x0 : x0 + CROP]
            region[..., :3] = region[..., :3] * (1 - m) + np.asarray(out).astype(float) * m
            result = Image.fromarray(np.clip(res + 0.5, 0, 255).astype(np.uint8))
            path = os.path.join(a.out, f"{cid}__blink_s{seed}.png")
            result.save(path)
            results.append((cid, seed, path))
            done += 1
            print(f"done {cid} seed {seed} in {time.time() - t0:.0f}s ({done}/{n_jobs})", flush=True)
            if done < n_jobs:
                time.sleep(COOLDOWN_S)

    if a.sheet:
        T = 200
        cols = a.seeds + 1
        sheet = Image.new("RGB", (cols * T, len(ids) * (T + 14)), "white")
        d = ImageDraw.Draw(sheet)
        for r, cid in enumerate(ids):
            src = Image.open(os.path.join(CHAR_DIR, f"{cid}.png")).convert("RGBA")
            boxes = spec[cid]
            cx = (boxes[0][0] + boxes[1][2]) / 2
            cy = (min(b[1] for b in boxes) + max(b[3] for b in boxes)) / 2
            cb = (int(cx - 90), int(cy - 70), int(cx + 90), int(cy + 110))
            row = [src] + [Image.open(p) for c, _, p in results if c == cid]
            for c, im in enumerate(row):
                bg = Image.new("RGBA", im.size, (200, 230, 200, 255))
                bg.alpha_composite(im)
                sheet.paste(bg.convert("RGB").crop(cb).resize((T, T)), (c * T, r * (T + 14)))
            d.text((2, r * (T + 14) + T), f"{cid}: orig, seeds {a.seed0}..{a.seed0 + a.seeds - 1}", fill="black")
        sheet.save(a.sheet)
        print("sheet:", a.sheet)


if __name__ == "__main__":
    main()
