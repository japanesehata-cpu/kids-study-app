#!/usr/bin/env python3
# Regenerates public/audio/word-en-${id}.wav for the handful of englishWords entries whose
# plain single-word Kokoro synthesis sounds distorted on every voice (see the
# REPEAT_TRIM_FIXED_IDS comment in generate-word-audio-en.mjs). Their G2P phonemes are
# confirmed correct, so the problem is Kokoro's acoustic model on an isolated word — saying
# the word twice ("word, word.") gives the *second* occurrence natural prosody carried over
# from the first, so this synthesizes that and cuts out just the second occurrence.
#
# A single amplitude threshold can't reliably find the boundary between the two occurrences:
# a stop consonant inside the word (the "p" in "ship") can dip the envelope just as low as the
# gap between words. Instead this finds the two energy peaks (each word's vowel nucleus) and
# splits at the true local minimum between them, which works regardless of how loud either
# occurrence is or how shallow the gap between them is.
#
# Usage:
#   ~/kokoro-env/bin/python3 scripts/kokoro_server.py --port 8900   # in another terminal
#   ~/kokoro-env/bin/python3 scripts/generate-word-audio-en-repeat-trim.py
#   ~/kokoro-env/bin/python3 scripts/generate-word-audio-en-repeat-trim.py --only=ship,grape

import sys
import urllib.request
import urllib.parse
import numpy as np
import soundfile as sf
import io
import os

KOKORO_URL = os.environ.get("KOKORO_SERVER_URL", "http://127.0.0.1:8900")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "audio")
PAD = 0.04  # seconds of padding kept on each side of the extracted word

# Keep in sync with REPEAT_TRIM_FIXED_IDS in generate-word-audio-en.mjs. Every one of these
# ids' word text is identical to the id itself, which the split-in-half text below relies on.
WORDS = ["bird", "fish", "sheep", "koala", "fox", "grape", "tomato", "potato", "peach", "ship"]


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
    for arg in sys.argv[1:]:
        if arg.startswith("--only="):
            only = set(arg[len("--only="):].split(","))

    if not check_kokoro_running():
        print(
            f"Kokoro server doesn't seem to be running at {KOKORO_URL}. Start it with "
            "~/kokoro-env/bin/python3 scripts/kokoro_server.py --port 8900, then re-run this script.",
            file=sys.stderr,
        )
        sys.exit(1)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    words = [w for w in WORDS if only is None or w in only]
    print(f"Generating {len(words)} repeat-and-trim word pronunciation(s) via Kokoro...")

    for word in words:
        try:
            wav_bytes = synthesize(f"{word}, {word}.")
            audio, sr = sf.read(io.BytesIO(wav_bytes))
            segment = extract_second_occurrence(audio, sr)
            out_path = os.path.join(OUTPUT_DIR, f"word-en-{word}.wav")
            sf.write(out_path, segment, sr, subtype="PCM_16")
            print(f"done  word-en-{word} ({len(segment) / sr:.2f}s) -> public/audio/word-en-{word}.wav")
        except Exception as err:
            print(f"fail  word-en-{word}: {err}", file=sys.stderr)


if __name__ == "__main__":
    main()
