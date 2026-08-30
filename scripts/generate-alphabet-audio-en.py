#!/usr/bin/env python3
# Regenerates public/audio/alphabet-letter-${id}.wav — one clean spoken mnemonic phrase per
# alphabet entry ("L for Lion."), mirroring hiragana/katakana's own "glyph, mnemonic's
# glyph" pattern (see alphabetSpeechPhrase in src/domain/alphabetBank.ts) rather than
# speaking the bare letter alone. Always the upper-case form: a letter's name doesn't change
# with case, and see HandwritingScreen.tsx / QuizScreen.tsx for why a bare lower-case letter
# is unsafe to synthesize on its own.
#
# Unlike word-en-*.wav's single bare word (which needs the repeat-and-trim technique — a
# lone one-syllable Kokoro synthesis reliably sounds distorted), this is already a full
# multi-word sentence with its own natural sentence-level prosody, so it's synthesized
# directly in one pass, the same way generate-tts-cache.mjs renders hiragana/katakana's
# mnemonic phrases directly with no trimming.
#
# Also fixes a real, confirmed bug: alphabet letters had NO cached audio at all before this,
# so every real visitor (Kokoro only ever answers on localhost) fell through to the
# browser's raw Web Speech fallback, whose voice reads a bare capital letter as "capital B"
# for disambiguation — a static cache file sidesteps that fallback entirely.
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

import soundfile as sf

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
KOKORO_URL = os.environ.get("KOKORO_SERVER_URL", "http://127.0.0.1:8900")
OUTPUT_DIR = os.path.join(REPO_ROOT, "public", "audio")
VOICE = "am_puck"
# Slightly slower than Kokoro's default 1.0, per feedback that the default pace read too
# flat/rushed for a young child to follow — needs kokoro_server.py's `speed` query param
# (added alongside this), so the server must be running an up-to-date copy.
SPEED = 0.85


def load_alphabet_bank():
    """alphabetBank.ts is the single source of truth for content (id/upper/mnemonic) — shell
    out to Node to import it directly, same approach as generate-word-audio-en-repeat-trim.py,
    so this can never drift out of sync with alphabetSpeechPhrase's own wording."""
    script = (
        "import('./src/domain/alphabetBank.ts').then(m => "
        "process.stdout.write(JSON.stringify(m.alphabetBank.map(a => "
        "({id: a.id, phrase: m.alphabetSpeechPhrase(a)})))))"
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
    url = f"{KOKORO_URL}/synthesize?text={urllib.parse.quote(text)}&voice={VOICE}&speed={SPEED}"
    with urllib.request.urlopen(url, timeout=30) as res:
        return res.read()


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

    print(f"Generating {len(targets)} alphabet mnemonic-phrase pronunciation(s) via Kokoro ({VOICE})...")

    for entry in targets:
        letter_id, phrase = entry["id"], entry["phrase"]
        try:
            wav_bytes = synthesize(phrase)
            audio, sr = sf.read(io.BytesIO(wav_bytes))
            out_path = os.path.join(OUTPUT_DIR, f"alphabet-letter-{letter_id}.wav")
            sf.write(out_path, audio, sr, subtype="PCM_16")
            print(f"done  alphabet-letter-{letter_id} ({len(audio) / sr:.2f}s, {phrase!r}) -> public/audio/alphabet-letter-{letter_id}.wav")
        except Exception as err:
            print(f"fail  alphabet-letter-{letter_id}: {err}", file=sys.stderr)


if __name__ == "__main__":
    main()
