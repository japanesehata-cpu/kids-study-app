#!/usr/bin/env python3
"""Tiny local HTTP server that wraps a loaded Piper voice for on-demand TTS.

The model is loaded once at startup and kept warm in memory, so each
request only pays for inference, not process/model-load time.

Run with the piper-env virtualenv's Python — one process per voice, since
each one keeps a full model loaded in memory:
    ~/piper-env/bin/python3 scripts/piper_server.py
    ~/piper-env/bin/python3 scripts/piper_server.py --lang en --model ~/en_US-lessac-medium.onnx --port 8900 --warmup-text hello

The app's TTS layer (src/lib/tts.ts) probes GET /health on the Japanese
server (port 8899 by default) and the English one (port 8900) and, for
whichever language it's about to speak, sends the request to the matching
server if it's reachable. It falls back to the browser's built-in speech
synthesis otherwise, so running either server is optional.
"""

import argparse
import io
import os
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

from piper import PiperVoice

# Two different Piper packages end up installed across this project's voices: piper-plus
# (older synthesize(text, wav_file, length_scale=..., noise_scale=..., noise_w=...) API,
# used by the Japanese Tsukuyomi-chan multilingual model's venv) and the current official
# piper-tts (synthesize_wav(text, wav_file, syn_config=SynthesisConfig(...)) API, needed for
# standard eSpeak-phonemized English voices like en_US-lessac-medium, which piper-plus's
# PhonemeType enum doesn't recognize). Detect which one is active in this process's venv
# instead of hard-coding it, so the same script works from either virtualenv.
_USES_NEW_API = hasattr(PiperVoice, "synthesize_wav")
if _USES_NEW_API:
    from piper.config import SynthesisConfig


def synthesize_to_wav(voice, text, wav_file, length_scale, noise_scale, noise_w):
    if _USES_NEW_API:
        config = SynthesisConfig(length_scale=length_scale, noise_scale=noise_scale, noise_w_scale=noise_w)
        voice.synthesize_wav(text, wav_file, syn_config=config)
    else:
        voice.synthesize(text, wav_file, length_scale=length_scale, noise_scale=noise_scale, noise_w=noise_w)

HOST = "127.0.0.1"

# >1.0 stretches phoneme durations, i.e. slows speech down; <1.0 speeds it up. For the
# Japanese Tsukuyomi-chan voice, 1.25 then 1.12 both still read as unnaturally slow/
# deliberate rather than clear — 0.95 (a touch brisker than Piper's own 1.0 default) is
# what actually sounds like natural conversational pace instead of a dead-slow read. Kept
# as the default for every voice; override with --length-scale if a given voice needs it.
DEFAULT_LENGTH_SCALE = 0.95

# VITS's built-in stochastic variation. Piper's own default is 0.667 — bumping it up a
# little adds more natural micro-variation in pitch/pacing instead of a dead-flat read,
# without going high enough to introduce audible artifacts.
DEFAULT_NOISE_SCALE = 0.75
DEFAULT_NOISE_W = 0.85


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--model",
        default=os.path.expanduser("~/tsukuyomi-chan-6lang-fp16.onnx"),
        help="Path to the Piper .onnx voice model (default: the Japanese Tsukuyomi-chan voice)",
    )
    parser.add_argument("--port", type=int, default=8899, help="Port to listen on (default: 8899)")
    parser.add_argument(
        "--warmup-text",
        default="こんにちは",
        help="Short phrase synthesized once at startup to warm up the model (default: Japanese greeting)",
    )
    parser.add_argument("--length-scale", type=float, default=DEFAULT_LENGTH_SCALE)
    parser.add_argument("--noise-scale", type=float, default=DEFAULT_NOISE_SCALE)
    parser.add_argument("--noise-w", type=float, default=DEFAULT_NOISE_W)
    return parser.parse_args()


def make_handler(voice, length_scale, noise_scale, noise_w):
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

                try:
                    buf = io.BytesIO()
                    with wave.open(buf, "wb") as wav_file:
                        synthesize_to_wav(voice, text, wav_file, length_scale, noise_scale, noise_w)
                    audio_bytes = buf.getvalue()

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

    print(f"Loading voice model from {args.model} ...")
    voice = PiperVoice.load(args.model)
    print("Model loaded. Warming up...")
    _warmup_buf = io.BytesIO()
    with wave.open(_warmup_buf, "wb") as _warmup_wav:
        synthesize_to_wav(voice, args.warmup_text, _warmup_wav, args.length_scale, args.noise_scale, args.noise_w)
    print(f"Ready. Listening on http://{HOST}:{args.port}")

    handler = make_handler(voice, args.length_scale, args.noise_scale, args.noise_w)
    server = ThreadingHTTPServer((HOST, args.port), handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
