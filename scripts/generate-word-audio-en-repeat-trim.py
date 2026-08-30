#!/usr/bin/env python3
# Regenerates public/audio/word-en-${id}.wav for englishWords entries using the
# repeat-and-trim technique: a bare single-word Kokoro synthesis reliably sounds
# distorted (confirmed: G2P phonemes are correct, so the problem is Kokoro's acoustic
# model on an isolated word), but saying the word twice ("word, word.") gives the
# *second* occurrence natural prosody carried over from the first. This is now the
# standard way every word-bank pronunciation is generated — not just the original 10
# flagged words — so plain single-word synthesis (generate-word-audio-en.mjs) should no
# longer be used for word-en-*.wav at all.
#
# A single amplitude threshold can't reliably find the boundary between the two
# occurrences: a stop consonant inside the word (the "p" in "ship") can dip the envelope
# just as low as the gap between words. Instead this finds the two energy peaks (each
# occurrence's vowel nucleus) and splits at the true local minimum between them, which
# works regardless of how loud either occurrence is or how shallow the gap is.
#
# Usage:
#   ~/kokoro-env/bin/python3 scripts/kokoro_server.py --port 8900   # in another terminal
#   ~/kokoro-env/bin/python3 scripts/generate-word-audio-en-repeat-trim.py
#   ~/kokoro-env/bin/python3 scripts/generate-word-audio-en-repeat-trim.py --only=ship,grape
#   ~/kokoro-env/bin/python3 scripts/generate-word-audio-en-repeat-trim.py --force

import io
import json
import os
import subprocess
import sys
import urllib.parse
import urllib.request

import numpy as np
import soundfile as sf

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
KOKORO_URL = os.environ.get("KOKORO_SERVER_URL", "http://127.0.0.1:8900")
OUTPUT_DIR = os.path.join(REPO_ROOT, "public", "audio")
PAD = 0.04  # seconds of padding kept on each side of the extracted word


def load_word_bank():
    """wordBank.ts is the single source of truth for word content — shell out to Node to
    import it directly rather than hand-duplicating the list here, so this can never drift
    out of sync with the app (same approach as generate-word-images-local.py)."""
    script = (
        "import('./src/domain/wordBank.ts').then(m => "
        "process.stdout.write(JSON.stringify(m.wordBank)))"
    )
    result = subprocess.run(
        ["node", "--experimental-strip-types", "-e", script],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(result.stdout)


def check_kokoro_running():
    try:
        urllib.request.urlopen(f"{KOKORO_URL}/health", timeout=1.5)
        return True
    except Exception:
        return False


def synthesize(text):
    url = f"{KOKORO_URL}/synthesize?text={urllib.parse.quote(text)}"
    with urllib.request.urlopen(url, timeout=30) as res:
        return res.read()


def envelope(audio, sr, win_s=0.01):
    win = int(sr * win_s)
    n = len(audio) // win
    return np.array([np.sqrt(np.mean(audio[i * win:(i + 1) * win] ** 2)) for i in range(n)]), win


def smooth(env, radius=3):
    kernel = np.ones(2 * radius + 1) / (2 * radius + 1)
    return np.convolve(env, kernel, mode="same")


def active_range(env, rel_thresh=0.02):
    thresh = env.max() * rel_thresh
    above = np.where(env > thresh)[0]
    return int(above[0]), int(above[-1])


def extract_second_occurrence(audio, sr):
    env, win = envelope(audio, sr)
    smoothed = smooth(env)

    # Split the active span at its time midpoint, then take the tallest peak on each side —
    # this keeps a two-syllable word's own internal peaks (e.g. "to-MA-to") from being
    # mistaken for the two separate word occurrences.
    s_start, s_end = active_range(smoothed)
    mid = (s_start + s_end) // 2
    p1 = s_start + int(np.argmax(smoothed[s_start:mid]))
    p2 = mid + int(np.argmax(smoothed[mid:s_end + 1]))

    # The split point is the *nearest genuinely silent* local minimum to p2, not just the
    # deepest dip anywhere between p1 and p2, and not just the nearest local wiggle either.
    # A multi-syllable word (hip-po-POT-a-mus, back-PACK, EL-bow) has its own internal
    # syllable gaps: taking the global minimum can pick a dip that's still inside word 1
    # (leaking its tail into the extracted "second occurrence"'s start), while taking the
    # nearest local minimum with no depth check can stop at a shallow formant ripple within
    # a single vowel, well short of the real word/word gap. Scanning backward from p2 for
    # the last local minimum that actually drops below a noise-floor-relative threshold
    # finds the true gap; if nothing in range is that quiet (true for short monosyllables
    # like "ship" whose two occurrences nearly run together — see the original word-list
    # this technique was built for), falling back to the global minimum reproduces the
    # split points already confirmed correct by ear for those.
    local_minima = [i for i in range(p1 + 1, p2) if smoothed[i] <= smoothed[i - 1] and smoothed[i] <= smoothed[i + 1]]
    quiet_thresh = smoothed.max() * 0.08
    quiet_minima = [i for i in local_minima if smoothed[i] < quiet_thresh]
    if quiet_minima:
        valley_idx = quiet_minima[-1]
    else:
        valley_idx = p1 + int(np.argmin(smoothed[p1:p2 + 1]))

    tail_thresh = smoothed[p2] * 0.08
    end_frame = p2
    while end_frame < len(smoothed) - 1 and smoothed[end_frame] > tail_thresh:
        end_frame += 1

    pad = int(PAD * sr)
    start = max(0, valley_idx * win - pad)
    end = min(len(audio), end_frame * win + pad)
    return audio[start:end]


def main():
    only = None
    force = False
    for arg in sys.argv[1:]:
        if arg.startswith("--only="):
            only = set(arg[len("--only="):].split(","))
        elif arg == "--force":
            force = True

    if not check_kokoro_running():
        print(
            f"Kokoro server doesn't seem to be running at {KOKORO_URL}. Start it with "
            "~/kokoro-env/bin/python3 scripts/kokoro_server.py --port 8900, then re-run this script.",
            file=sys.stderr,
        )
        sys.exit(1)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    word_bank = load_word_bank()
    targets = [w for w in word_bank if only is None or w["id"] in only]
    if not force:
        targets = [w for w in targets if not os.path.exists(os.path.join(OUTPUT_DIR, f"word-en-{w['id']}.wav"))]

    print(f"Generating {len(targets)} repeat-and-trim word pronunciation(s) via Kokoro...")

    for entry in targets:
        word_id, word = entry["id"], entry["word"]
        try:
            wav_bytes = synthesize(f"{word}, {word}.")
            audio, sr = sf.read(io.BytesIO(wav_bytes))
            segment = extract_second_occurrence(audio, sr)
            out_path = os.path.join(OUTPUT_DIR, f"word-en-{word_id}.wav")
            sf.write(out_path, segment, sr, subtype="PCM_16")
            print(f"done  word-en-{word_id} ({len(segment) / sr:.2f}s) -> public/audio/word-en-{word_id}.wav")
        except Exception as err:
            print(f"fail  word-en-{word_id}: {err}", file=sys.stderr)


if __name__ == "__main__":
    main()
