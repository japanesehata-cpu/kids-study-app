#!/usr/bin/env python3
# Regenerates public/audio/alphabet-letter-${id}.wav — one spoken mnemonic phrase per
# alphabet entry ("A ... for Apple!", see alphabetSpeechPhrase in
# src/domain/alphabetBank.ts for the live-fallback text this mirrors) rather than speaking
# the bare letter alone. Always the upper-case form: a letter's name doesn't change with
# case, and see HandwritingScreen.tsx / QuizScreen.tsx for why a bare lower-case letter is
# unsafe to synthesize on its own.
#
# The letter and "for <word>" are synthesized as two SEPARATE clips and spliced together
# with an explicit silence gap, rather than relying on punctuation (comma/ellipsis) inside
# one synthesis call to produce a pause — confirmed by direct envelope measurement that
# Kokoro's punctuation-driven pauses only run ~30-70ms regardless of comma/ellipsis/period,
# too short to read as a real pause, which is why "A for Apple" ran together. Splicing gives
# full deterministic control over the gap instead.
#
# Also fixes a real, confirmed bug: alphabet letters had NO cached audio at all before this,
# so every real visitor (Kokoro only ever answers on localhost) fell through to the
# browser's raw Web Speech fallback, whose voice reads a bare capital letter as "capital B"
# for disambiguation — a static cache file sidesteps that fallback entirely.
#
# Also generates public/audio/alphabet-review-${id}.wav — one spoken example sentence per
# alphabetBank entry's exampleSentenceEn, played during AlphabetTraceScreen's review pass
# (see src/screens/AlphabetTraceScreen.tsx). Unlike the letter+mnemonic clips above, a full
# sentence already carries natural Kokoro prosody on a single plain synthesis call — same
# reasoning as generate-sentence-audio-en.py — so this uses that script's simple
# synthesize-once-and-trim technique instead of the splicing trick, just at SPEED=0.9
# (a full sentence doesn't need SPEED's aggressive 0.7 slow-down, which was tuned
# specifically for isolated single-letter clarity) while keeping VOICE=am_puck so the
# review sentences sound like the same character as the letter/mnemonic clips.
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
# Slower than Kokoro's default 1.0 — per feedback that even 0.85 still read too fast for a
# young child to follow. Needs kokoro_server.py's `speed` query param.
SPEED = 0.7
# Used for the review-sentence loop only (see module docstring) — gentler than SPEED since a
# full sentence doesn't need the aggressive slow-down tuned for isolated single letters.
REVIEW_SPEED = 0.9
# Explicit, deterministic silence between the letter and "for <word>" — see the module
# docstring for why this is spliced in rather than left to punctuation.
PAUSE_S = 0.45
# Padding kept around each trimmed segment's real speech content.
PAD_S = 0.06


def load_alphabet_bank():
    """alphabetBank.ts is the single source of truth for content (id/upper/mnemonic) — shell
    out to Node to import it directly, same approach as generate-word-audio-en-repeat-trim.py,
    so this can never drift out of sync with the app's own data."""
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


def synthesize(text, speed=SPEED):
    url = f"{KOKORO_URL}/synthesize?text={urllib.parse.quote(text)}&voice={VOICE}&speed={speed}"
    with urllib.request.urlopen(url, timeout=30) as res:
        audio, sr = sf.read(io.BytesIO(res.read()))
        return audio, sr


def trim_to_speech(audio, sr, rel_thresh=0.05):
    """Cuts silence off both ends, keeping PAD_S of padding on each side — same idea as
    generate-word-audio-en-repeat-trim.py's active_range, just without needing envelope
    smoothing or peak-finding since there's only one occurrence to isolate here."""
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

    bank = load_alphabet_bank()
    targets = [a for a in bank if only is None or a["id"] in only]
    if not force:
        targets = [a for a in targets if not os.path.exists(os.path.join(OUTPUT_DIR, f"alphabet-letter-{a['id']}.wav"))]

    print(f"Generating {len(targets)} alphabet mnemonic-phrase pronunciation(s) via Kokoro ({VOICE}, speed={SPEED})...")

    for entry in targets:
        letter_id, upper, mnemonic = entry["id"], entry["upper"], entry["mnemonic"]
        try:
            letter_audio, sr = synthesize(f"{upper}.")
            rest_audio, sr2 = synthesize(f"For {mnemonic}!")
            assert sr == sr2

            letter_clip = trim_to_speech(letter_audio, sr)
            rest_clip = trim_to_speech(rest_audio, sr)
            silence = np.zeros(int(PAUSE_S * sr), dtype=letter_clip.dtype)
            combined = np.concatenate([letter_clip, silence, rest_clip])

            out_path = os.path.join(OUTPUT_DIR, f"alphabet-letter-{letter_id}.wav")
            sf.write(out_path, combined, sr, subtype="PCM_16")
            print(f"done  alphabet-letter-{letter_id} ({len(combined) / sr:.2f}s, '{upper} ... for {mnemonic}!') -> public/audio/alphabet-letter-{letter_id}.wav")
        except Exception as err:
            print(f"fail  alphabet-letter-{letter_id}: {err}", file=sys.stderr)

    review_targets = [a for a in bank if only is None or a["id"] in only]
    if not force:
        review_targets = [
            a for a in review_targets
            if not os.path.exists(os.path.join(OUTPUT_DIR, f"alphabet-review-{a['id']}.wav"))
        ]

    print(f"Generating {len(review_targets)} alphabet review-sentence pronunciation(s) via Kokoro ({VOICE}, speed={REVIEW_SPEED})...")

    for entry in review_targets:
        letter_id, sentence = entry["id"], entry["exampleSentenceEn"]
        try:
            audio, sr = synthesize(sentence, speed=REVIEW_SPEED)
            clip = trim_to_speech(audio, sr)

            out_path = os.path.join(OUTPUT_DIR, f"alphabet-review-{letter_id}.wav")
            sf.write(out_path, clip, sr, subtype="PCM_16")
            print(f"done  alphabet-review-{letter_id} ({len(clip) / sr:.2f}s, '{sentence}') -> public/audio/alphabet-review-{letter_id}.wav")
        except Exception as err:
            print(f"fail  alphabet-review-{letter_id}: {err}", file=sys.stderr)


if __name__ == "__main__":
    main()
