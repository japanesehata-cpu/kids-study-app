#!/usr/bin/env python3
"""One-off dev script: generates the かぞえる (counting)-only images that have no
wordBank entry of their own and so can't go through generate-word-images-local.py's
wordBank-driven loop — mirrors that script's pipeline settings/style exactly (see its
docstring), just with a small hardcoded target list instead of loading wordBank.ts.

Currently generates:
  - shoe.png   (そく/soku's exampleWordId) — wordBank's own 'shoes' word is correctly a
    *pair* (WORD_PROMPT_OVERRIDES in generate-word-images-local.py explicitly renders
    "a real pair of sneakers"), since the English word "shoes" is plural. But
    CountingQuestionView tiles exampleWordId's image N times to depict a count — reusing
    the pair image would show 2N shoe shapes for a count of N, the same "image already
    depicts more than one item" bug found and fixed for tsubu/pea. Every other counting
    entry's per-copy image is a single countable unit, so this needs its own dedicated
    single-shoe asset rather than reusing 'shoes'. (そく technically counts *pairs* of
    footwear, so this is a deliberate simplification favoring the redesign's actual goal —
    a kid can visually verify the count badge against what's on screen — over literal
    real-world unit accuracy.)
  - birthdaycake.png (さい/sai's exampleWordId) — replaces the existing image, which had
    3 lit candles baked into a single cake. Tiling that N times showed N cakes but 3N
    candles, the most visually salient countable-looking thing on screen, inviting a
    child to count candles instead of cakes and land on the wrong number. Regenerated
    with exactly 1 candle so each tiled copy contributes exactly one of anything
    countable, consistent with the fix above and with every other entry in the bank.

Usage:
    cd scripts && /Users/hirokihata/realvisxl-test/.venv/bin/python3 generate-counting-extra-images.py
    /Users/hirokihata/realvisxl-test/.venv/bin/python3 generate-counting-extra-images.py --only=shoe
"""

import argparse
import os
import sys
import time

import torch
from diffusers import StableDiffusionXLPipeline, DPMSolverMultistepScheduler
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
MODEL_PATH = os.path.expanduser(
    os.environ.get("DIFFUSION_MODEL_PATH", "~/realvisxl-test/models/RealVisXL_V4.0_Lightning.safetensors")
)
OUTPUT_DIR = os.path.join(REPO_ROOT, "public", "images", "words")
ICON_SIZE = 480
GEN_SIZE = 768
INFERENCE_STEPS = int(os.environ.get("DIFFUSION_STEPS", 6))
GUIDANCE_SCALE = float(os.environ.get("DIFFUSION_GUIDANCE", 1.3))
COOLDOWN_SECONDS = float(os.environ.get("DIFFUSION_COOLDOWN_S", 10))

NEGATIVE_PROMPT = """
octane render, 3d render, CGI, illustration, cartoon, digital art,
plastic, metallic, chrome, HDR, overprocessed, neon colors,
stylized, low quality, blurry, deformed anatomy, extra limbs,
malformed features, text, watermark
"""

TARGETS = {
    "shoe": {
        "seed": 1,
        "prompt": """
RAW product photograph of a single real sneaker, only one shoe,
no matching pair, side profile view, entire shoe visible,
natural fabric and rubber texture, soft diffused daylight,
neutral studio background, natural unedited product photograph
""",
        "negative": f"{NEGATIVE_PROMPT},\ntwo shoes, pair of shoes, matching shoe",
    },
    "birthdaycake": {
        "seed": 1,
        "prompt": """
RAW product photograph of a real birthday cake with white frosting
and colorful sprinkles on a cake stand, exactly one lit candle
standing upright in the center of the cake, only a single candle,
natural appetizing texture, soft diffused daylight,
neutral studio background, natural unedited food photograph
""",
        "negative": f"{NEGATIVE_PROMPT},\nmultiple candles, two candles, three candles, several candles",
    },
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="comma-separated ids to (re)generate (default: all)")
    parser.add_argument(
        "--out-dir",
        default=OUTPUT_DIR,
        help="write PNGs here instead of public/images/words",
    )
    args = parser.parse_args()
    only_ids = set(args.only.split(",")) if args.only else None
    out_dir = args.out_dir
    os.makedirs(out_dir, exist_ok=True)

    targets = {k: v for k, v in TARGETS.items() if only_ids is None or k in only_ids}
    if not targets:
        print("nothing to do")
        return

    print(f"Generating {len(targets)} image(s) via {os.path.basename(MODEL_PATH)}...")
    print("MPS available:", torch.backends.mps.is_available())
    pipe = StableDiffusionXLPipeline.from_single_file(
        MODEL_PATH,
        torch_dtype=torch.bfloat16,
        use_safetensors=True,
    )
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(
        pipe.scheduler.config,
        algorithm_type="sde-dpmsolver++",
        use_karras_sigmas=True,
    )
    pipe = pipe.to("mps")

    items = list(targets.items())
    for i, (word_id, spec) in enumerate(items):
        out_path = os.path.join(out_dir, f"{word_id}.png")
        generator = torch.Generator(device="cpu").manual_seed(spec["seed"])
        start = time.time()
        try:
            image = pipe(
                prompt=spec["prompt"],
                negative_prompt=spec["negative"],
                width=GEN_SIZE,
                height=GEN_SIZE,
                num_inference_steps=INFERENCE_STEPS,
                guidance_scale=GUIDANCE_SCALE,
                generator=generator,
            ).images[0]
            image = image.resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS)
            image.save(out_path)
            elapsed = time.time() - start
            print(f"done  ({i + 1}/{len(items)}) {word_id} -> {out_path} ({elapsed:.1f}s)")
        except Exception as err:  # noqa: BLE001
            print(f"fail  {word_id}: {err}", file=sys.stderr)

        if i < len(items) - 1:
            time.sleep(COOLDOWN_SECONDS)


if __name__ == "__main__":
    main()
