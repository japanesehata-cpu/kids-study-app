#!/usr/bin/env python3
"""Keys out a solid chroma-key backdrop (see generate-character-portraits.mjs's prompt),
leaving only the character on a transparent background.

Color alone isn't reliable: for some characters (e.g. koko's mint hair + lavender accents
+ the pink cheek blush and warm skin every character has), there's no single backdrop hue
far enough from all of them at once — a chroma-key-colored pixel somewhere on the
character's own face would get keyed out right along with the real background. This adds
a second, spatial check on top of the color one: a candidate pixel only counts as
background if it's part of the connected region touching the image border. A stray patch
of similarly-colored pixels inside the character's own face isn't reachable from the
border (it's boxed in by different-colored character pixels all around it), so it survives
even though its raw color alone would have matched.

Usage: python3 scripts/remove_bg.py <input> <output>
Requires Pillow + numpy + scipy: pip3 install --user pillow numpy scipy
"""
import sys
import numpy as np
from scipy import ndimage
from PIL import Image, ImageFilter

HUE_TOLERANCE = 22  # counts as "candidate background color" within this hue distance. Kept
# tight deliberately: warm skin tone (hue ~10-20) sat close enough to a yellow-green
# backdrop (hue ~49, distance 36) that a wider tolerance treated a chunk of the character's
# own face as a background candidate.
MIN_SATURATION = 50  # 0-255; skin/cheek tones measured at 25-51 here, backgrounds at 150+,
# so this comfortably separates "chroma-key backdrop" from "the character's own warm skin"

VALUE_TOLERANCE = 45  # achromatic path: counts as candidate within this value distance

CORNER_FRACTION = 0.06  # size of each sampled corner patch, as a fraction of image size
ERODE_ITER = 2  # severs thin antialiased bridges between background and character
DILATE_ITER = 3  # reclaims most of what erosion trimmed off the real background region


def sample_background(h: np.ndarray, s: np.ndarray, v: np.ndarray) -> tuple[float, float, float]:
    height, width = h.shape
    c = max(2, int(min(height, width) * CORNER_FRACTION))
    patches = [(slice(0, c), slice(0, c)), (slice(0, c), slice(-c, None)), (slice(-c, None), slice(0, c)), (slice(-c, None), slice(-c, None))]
    hs, ss, vs = [], [], []
    for ry, rx in patches:
        hs.append(h[ry, rx])
        ss.append(s[ry, rx])
        vs.append(v[ry, rx])
    return float(np.median(np.concatenate(hs))), float(np.median(np.concatenate(ss))), float(np.median(np.concatenate(vs)))


def border_connected_background(candidate: np.ndarray) -> np.ndarray:
    """Keeps only the candidate-mask pixels reachable from the image border, so an
    isolated patch of background-colored pixels inside the character survives."""
    eroded = ndimage.binary_erosion(candidate, iterations=ERODE_ITER, border_value=1)
    labels, _ = ndimage.label(eroded)
    border_labels = set(labels[0, :]) | set(labels[-1, :]) | set(labels[:, 0]) | set(labels[:, -1])
    border_labels.discard(0)
    core = np.isin(labels, list(border_labels))
    return ndimage.binary_dilation(core, iterations=DILATE_ITER) & candidate


def feather_and_save(img: Image.Image, is_bg: np.ndarray, path_out: str) -> None:
    arr = np.asarray(img)
    out = arr.copy()
    alpha = np.where(is_bg, 0, 255).astype(np.uint8)
    out[..., 3] = np.minimum(arr[..., 3], alpha)

    result = Image.fromarray(out)
    a = result.getchannel("A")
    a = a.filter(ImageFilter.GaussianBlur(1.2))
    result.putalpha(a)
    result.save(path_out)


# Double-check thresholds (see verify_cutout): every generated portrait is checked against
# these automatically, every time — not just when something looked wrong by eye.
MAX_BORDER_ALPHA = 20  # outer ring should be almost fully transparent (clean cutout)
# These portraits are a consistent template (oversized head, huge centered eyes, small body
# below a visible neck gap), so a fixed band reliably lands on the core face — eyes/nose/
# cheeks — for every character. It deliberately stops well above the neck: the gap between
# an oversized head and the small body below it is normal for every character (not a
# defect) and sits almost exactly where a plain center-square check would look, alongside
# other legitimate gaps around trailing ears/ribbons/pigtails (one measured at 1388px,
# swamping any threshold that would still catch a real defect).
FACE_Y_RANGE = (0.29, 0.56)
FACE_X_RANGE = (0.36, 0.64)
HOLE_ALPHA_THRESHOLD = 128  # pixels this transparent or more, inside the face band, are "hole" candidates
MAX_HOLE_PIXELS = 60  # a single contiguous hole up to this size is a normal antialiasing/detail
# gap (measured up to 20px in clean references) — anything bigger is very likely a real chunk
# of face erased


def verify_cutout(alpha: np.ndarray, check_face: bool = True) -> list[str]:
    """Automated double-check for the two failure modes seen in practice: leftover
    background/shadow tint, and the subject's own face getting keyed out along with it.
    Returns a list of warning strings — empty means it passed clean.

    The face check looks for a single large contiguous low-alpha blob within a fixed face
    band rather than just the darkest pixel anywhere in the image — a real character
    silhouette naturally has plenty of small gaps (between pigtails, under an ear, between
    fingers, at the neck) that individually mean nothing; only a sizeable contiguous hole
    within the face itself indicates the cutout actually ate part of the character. That
    band is calibrated to the character-portrait template specifically (oversized head,
    centered eyes) — pass check_face=False for other subjects (e.g. reward decorations)
    that don't share that template, where the band wouldn't mean anything."""
    height, width = alpha.shape
    m = max(1, int(min(height, width) * 0.12))
    border = np.concatenate([alpha[:m, :].ravel(), alpha[-m:, :].ravel(), alpha[:, :m].ravel(), alpha[:, -m:].ravel()])

    warnings = []
    if border.mean() > MAX_BORDER_ALPHA:
        warnings.append(f"possible background/shadow residue (border alpha avg={border.mean():.0f}, want <={MAX_BORDER_ALPHA})")

    if check_face:
        y0, y1 = int(height * FACE_Y_RANGE[0]), int(height * FACE_Y_RANGE[1])
        x0, x1 = int(width * FACE_X_RANGE[0]), int(width * FACE_X_RANGE[1])
        center = alpha[y0:y1, x0:x1]
        holes = center < HOLE_ALPHA_THRESHOLD
        labels, n = ndimage.label(holes)
        largest_hole = max((int((labels == i).sum()) for i in range(1, n + 1)), default=0)
        if largest_hole > MAX_HOLE_PIXELS:
            warnings.append(f"possible face/body cut into (largest hole={largest_hole}px in center region, want <={MAX_HOLE_PIXELS}px)")

    return warnings


def remove_measured_background(path_in: str, path_out: str, check_face: bool = True) -> list[str]:
    img = Image.open(path_in).convert("RGBA")
    hsv = img.convert("RGB").convert("HSV")
    h, s, v = (np.asarray(band, dtype=np.int16) for band in hsv.split())

    bg_hue, bg_sat, bg_val = sample_background(h, s, v)

    if bg_sat < 25:
        candidate = np.abs(v.astype(np.float32) - bg_val) <= VALUE_TOLERANCE
    else:
        hue_distance = np.minimum(np.abs(h - bg_hue), 255 - np.abs(h - bg_hue))
        candidate = (hue_distance <= HUE_TOLERANCE) & (s >= MIN_SATURATION)

    is_bg = border_connected_background(candidate)
    feather_and_save(img, is_bg, path_out)

    result_alpha = np.asarray(Image.open(path_out).convert("RGBA"))[..., 3].astype(np.float32)
    return verify_cutout(result_alpha, check_face=check_face)


if __name__ == "__main__":
    check_face = "--no-face-check" not in sys.argv
    positional = [a for a in sys.argv[1:] if not a.startswith("--")]
    warnings = remove_measured_background(positional[0], positional[1], check_face=check_face)
    if warnings:
        for w in warnings:
            print(f"WARN: {w}")
        print(f"done with warnings: {positional[1]}")
        sys.exit(1)
    print(f"done (double-check passed): {positional[1]}")
