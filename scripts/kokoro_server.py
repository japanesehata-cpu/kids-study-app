#!/usr/bin/env python3
"""Tiny local HTTP server that wraps a loaded Kokoro-82M voice for on-demand TTS.

Mirrors piper_server.py's tiny REST contract (GET /health, GET /synthesize?text=...)
so src/lib/tts.ts's local-voice-server tier doesn't need to know or care which engine
is actually behind a given language's port — it's Piper for Japanese, Kokoro for
English, because Kokoro's dedicated English G2P (Misaki) turned out meaningfully more
accurate on word stress than Piper's espeak-ng phonemization for this app's vocabulary
(confirmed by ear across all 100 word-bank entries — see the pronunciation review
artifacts from that comparison).

Run with the kokoro-env virtualenv's Python (needs Python 3.10+; this repo's default
python3 was too old, hence the separate venv):
    ~/kokoro-env/bin/python3 scripts/kokoro_server.py
    ~/kokoro-env/bin/python3 scripts/kokoro_server.py --voice af_heart --port 8900

The model + voice pack auto-download from Hugging Face (hexgrad/Kokoro-82M) on first
run and are cached under ~/.cache/huggingface — no manual download step.
"""

import argparse
import io
import time
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

import numpy as np
import soundfile as sf

from kokoro import KPipeline

HOST = "127.0.0.1"
SAMPLE_RATE = 24000


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--voice", default="af_heart", help="Kokoro voice name (default: af_heart)")
    parser.add_argument("--lang-code", default="a", help="Kokoro language code (default: a = American English)")
    parser.add_argument("--port", type=int, default=8900, help="Port to listen on (default: 8900)")
    parser.add_argument("--speed", type=float, default=1.0, help="Speech speed multiplier (default: 1.0)")
    return parser.parse_args()


def synthesize_to_wav_bytes(pipeline, text, voice, speed):
    """Runs one text through the pipeline and concatenates every chunk it yields into a
    single WAV. Kokoro splits long input into multiple chunks at sentence boundaries; the
    short phrases this app ever sends normally come back as a single chunk, but this stays
    correct even when that's not true."""
    chunks = [audio for _, _, audio in pipeline(text, voice=voice, speed=speed)]
    audio = np.concatenate(chunks) if len(chunks) > 1 else chunks[0]

    buf = io.BytesIO()
    sf.write(buf, audio, SAMPLE_RATE, format="WAV", subtype="PCM_16")
    return buf.getvalue()


def make_handler(pipeline, voice, speed):
    class Handler(BaseHTTPRequestHandler):
        def _set_cors_headers(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")

        def do_OPTIONS(self):
            self.send_response(204)
            self._set_cors_headers()
            self.end_headers()

        def do_GET(self):
            parsed = urlparse(self.path)

            if parsed.path == "/health":
                self.send_response(200)
                self._set_cors_headers()
                self.send_header("Content-Type", "text/plain")
                self.end_headers()
                self.wfile.write(b"ok")
                return

            if parsed.path == "/synthesize":
                params = parse_qs(parsed.query)
                text = (params.get("text") or [""])[0]
                if not text.strip():
                    self.send_response(400)
                    self._set_cors_headers()
                    self.end_headers()
                    return
                # Kokoro's voice packs are lightweight embeddings shared by one loaded model,
                # so a single running pipeline can synthesize with any of them per call — no
                # need for a separate server process per character voice. Falls back to the
                # server's --voice default when the caller doesn't ask for a specific one.
                request_voice = (params.get("voice") or [voice])[0]
                # Same override pattern for speed — falls back to the server's --speed
                # default (1.0 unless overridden at startup) when not given per-request.
                request_speed = float((params.get("speed") or [speed])[0])

                try:
                    audio_bytes = synthesize_to_wav_bytes(pipeline, text, request_voice, request_speed)

                    self.send_response(200)
                    self._set_cors_headers()
                    self.send_header("Content-Type", "audio/wav")
                    self.send_header("Content-Length", str(len(audio_bytes)))
                    self.end_headers()
                    self.wfile.write(audio_bytes)
                except Exception as exc:  # noqa: BLE001 - report synthesis failures to the client
                    print(f"Synthesis error for text={text!r}: {exc}")
                    self.send_response(500)
                    self._set_cors_headers()
                    self.end_headers()
                return

            self.send_response(404)
            self._set_cors_headers()
            self.end_headers()

        def log_message(self, format, *args):  # noqa: A002 - keep server logs terse
            pass

    return Handler


def main():
    args = parse_args()

    print(f"Loading Kokoro pipeline (lang_code={args.lang_code!r}, voice={args.voice!r}) ...")
    t0 = time.time()
    pipeline = KPipeline(lang_code=args.lang_code)
    print(f"Pipeline loaded in {time.time() - t0:.1f}s. Warming up...")
    synthesize_to_wav_bytes(pipeline, "Hello", args.voice, args.speed)
    print(f"Ready. Listening on http://{HOST}:{args.port}")

    handler = make_handler(pipeline, args.voice, args.speed)
    server = ThreadingHTTPServer((HOST, args.port), handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
