#!/usr/bin/env python3
# Regenerates public/audio/alphabet-letter-${id}.wav — one clean spoken letter name per
# alphabet entry (always the upper-case form: a letter's name doesn't change with case,
# and see HandwritingScreen.tsx / QuizScreen.tsx for why a bare lower-case letter is
# unsafe to synthesize on its own). Kokoro itself pronounces isolated letters correctly
# (confirmed via direct phoneme inspection: "B" and "b" both -> bˈi, no "capital" prefix
# anywhere) — the problem this fixes is that alphabet letters had NO cached audio at all,
# so every real visitor (Kokoro only ever answers on localhost) fell through to the
# browser's raw Web Speech fallback, whose voice reads a bare capital letter as "capital
# B" for disambiguation. A static cache file sidesteps that fallback entirely, the same
# way word-en-*.wav and the hiragana/katakana caches already do.
#
# Same repeat-and-trim technique as generate-word-audio-en-repeat-trim.py: a single bare
# synthesis of a one-syllable utterance sounds clipped/distorted, but saying it twice and
# keeping the second occurrence (which inherits natural prosody from the first) sounds
# clean. voice=am_puck explicitly, matching the alphabet category's kokoroVoice (aru) —
# the running Kokoro server's own --voice default may differ.
#
# Usage:
#   ~/kokoro-env/bin/python3 scripts/kokoro_server.py --port 8900   # in another terminal
#   ~/kokoro-env/bin/python3 scripts/generate-alphabet-audio-en.py
#   ~/kokoro-env/bin/python3 scripts/generate-alphabet-audio-en.py --only=a,i
#   ~/kokoro-env/bin/python3 scripts/generate-alphabet-audio-en.py --force

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
VOICE = "am_puck"
PAD = 0.04


def load_alphabet_bank():
    script = (
        "import('./src/domain/alphabetBank.ts').then(m => "
        "process.stdout.write(JSON.stringify(m.alphabetBank)))"
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
    url = f"{KOKORO_URL}/synthesize?text={urllib.parse.quote(text)}&voice={VOICE}"
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

    s_start, s_end = active_range(smoothed)
    mid = (s_start + s_end) // 2
    p1 = s_start + int(np.argmax(smoothed[s_start:mid]))
    p2 = mid + int(np.argmax(smoothed[mid:s_end + 1]))

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

    bank = load_alphabet_bank()
    targets = [a for a in bank if only is None or a["id"] in only]
    if not force:
        targets = [a for a in targets if not os.path.exists(os.path.join(OUTPUT_DIR, f"alphabet-letter-{a['id']}.wav"))]

    print(f"Generating {len(targets)} repeat-and-trim alphabet letter pronunciation(s) via Kokoro ({VOICE})...")

    for entry in targets:
        letter_id, upper = entry["id"], entry["upper"]
        try:
            wav_bytes = synthesize(f"{upper}, {upper}.")
            audio, sr = sf.read(io.BytesIO(wav_bytes))
            segment = extract_second_occurrence(audio, sr)
            out_path = os.path.join(OUTPUT_DIR, f"alphabet-letter-{letter_id}.wav")
            sf.write(out_path, segment, sr, subtype="PCM_16")
            print(f"done  alphabet-letter-{letter_id} ({len(segment) / sr:.2f}s) -> public/audio/alphabet-letter-{letter_id}.wav")
        except Exception as err:
            print(f"fail  alphabet-letter-{letter_id}: {err}", file=sys.stderr)


if __name__ == "__main__":
    main()
