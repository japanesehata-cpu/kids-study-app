#!/usr/bin/env python3
# Generates public/audio/sentence-${pool}-${id}.wav — one spoken question per
# colorSentenceBank.ts / animalSentenceBank.ts entry ("What color is a banana?", "What
# animal has a pocket on its belly?"). Unlike a bare single word
# (generate-word-audio-en-repeat-trim.py's repeat-and-trim workaround), a full sentence
# already carries natural Kokoro prosody on a single plain synthesis call — confirmed
# already in this session for feedback phrases — so no splicing/repeat trick is needed
# here, just synthesize once and trim the surrounding silence.
#
# The `sentence-${pool}-` prefix matches questionGenerators/englishSentence.ts's
# pool-prefixed sentenceId exactly (e.g. "color-banana", "animal-kangaroo") — see that
# file for why (keeps ids globally unique across banks even where a bank-local id could
# coincidentally collide, e.g. 'elephant' existing in both banks).
#
# voice=af_heart matches kokoro_server.py's own default (and so already matches every
# existing word-en-*.wav file, which was generated without an explicit voice override) —
# passed explicitly here so this script keeps working correctly even if that default ever
# changes. speed=0.9 is a light slow-down for a listening-comprehension exercise, not the
# more aggressive 0.7 alphabet.py uses for single letters.
#
# Usage:
#   ~/kokoro-env/bin/python3 scripts/kokoro_server.py --port 8900   # in another terminal
#   ~/kokoro-env/bin/python3 scripts/generate-sentence-audio-en.py
#   ~/kokoro-env/bin/python3 scripts/generate-sentence-audio-en.py --only=color-banana,animal-kangaroo
#   ~/kokoro-env/bin/python3 scripts/generate-sentence-audio-en.py --force

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
VOICE = "af_heart"
SPEED = 0.9
PAD_S = 0.06

# (module path, exported array name, fixed pool prefix or None to use each entry's own
# "category" field instead — miscSentenceBank.ts covers many categories in one file, so its
# prefix varies per entry rather than being fixed for the whole file).
BANKS = [
    ("./src/domain/colorSentenceBank.ts", "colorSentenceBank", "color"),
    ("./src/domain/animalSentenceBank.ts", "animalSentenceBank", "animal"),
    ("./src/domain/miscSentenceBank.ts", "miscSentenceBank", None),
]


def load_sentence_pool():
    """colorSentenceBank.ts / animalSentenceBank.ts / miscSentenceBank.ts are the single
    source of truth for content (id/question/...) — shell out to Node to import them
    directly, same approach as the other generate-*-audio scripts, so this can never drift
    out of sync with the app's own data. Returns a flat list of {sentence_id, question}
    with sentence_id already prefixed to match the app's own cache-key scheme
    (questionGenerators/englishSentence.ts's buildPool)."""
    entries = []
    for module_path, export_name, fixed_pool in BANKS:
        script = f"import('{module_path}').then(m => process.stdout.write(JSON.stringify(m.{export_name})))"
        result = subprocess.run(
            ["node", "--experimental-strip-types", "-e", script],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
        for entry in json.loads(result.stdout):
            prefix = fixed_pool if fixed_pool is not None else entry["category"]
            entries.append({"sentence_id": f"{prefix}-{entry['id']}", "question": entry["question"]})
    return entries


def check_kokoro_running():
    try:
        urllib.request.urlopen(f"{KOKORO_URL}/health", timeout=1.5)
        return True
    except Exception:
        return False


def synthesize(text):
    url = f"{KOKORO_URL}/synthesize?text={urllib.parse.quote(text)}&voice={VOICE}&speed={SPEED}"
    with urllib.request.urlopen(url, timeout=30) as res:
        audio, sr = sf.read(io.BytesIO(res.read()))
        return audio, sr


def trim_to_speech(audio, sr, rel_thresh=0.05):
    """Cuts silence off both ends, keeping PAD_S of padding on each side — same approach as
    generate-alphabet-audio-en.py's trim_to_speech."""
    win = int(sr * 0.01)
    n = len(audio) // win
    env = np.array([np.sqrt(np.mean(audio[i * win:(i + 1) * win] ** 2)) for i in range(n)])
    thresh = env.max() * rel_thresh
    above = np.where(env > thresh)[0]
    pad = int(PAD_S * sr)
    start = max(0, above[0] * win - pad)
    end = min(len(audio), (above[-1] + 1) * win + pad)
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

    pool = load_sentence_pool()
    targets = [e for e in pool if only is None or e["sentence_id"] in only]
    if not force:
        targets = [e for e in targets if not os.path.exists(os.path.join(OUTPUT_DIR, f"sentence-{e['sentence_id']}.wav"))]

    print(f"Generating {len(targets)} sentence-question pronunciation(s) via Kokoro ({VOICE}, speed={SPEED})...")

    for entry in targets:
        sentence_id, question = entry["sentence_id"], entry["question"]
        try:
            audio, sr = synthesize(question)
            clip = trim_to_speech(audio, sr)

            out_path = os.path.join(OUTPUT_DIR, f"sentence-{sentence_id}.wav")
            sf.write(out_path, clip, sr, subtype="PCM_16")
            print(f"done  sentence-{sentence_id} ({len(clip) / sr:.2f}s, '{question}') -> public/audio/sentence-{sentence_id}.wav")
        except Exception as err:
            print(f"fail  sentence-{sentence_id}: {err}", file=sys.stderr)


if __name__ == "__main__":
    main()
