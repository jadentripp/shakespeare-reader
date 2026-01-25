#!/usr/bin/env python3
"""
Local Qwen3-TTS server for the AI Reader application.

Usage:
    cd conductor/qwen-tts
    uv sync
    uv run python server.py

The server runs on http://localhost:5123 by default.
"""

import argparse
import base64
import io
import json
import threading
import time
from typing import Optional

import numpy as np
import soundfile as sf
import torch
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Global model instance (loaded lazily)
_model = None
_model_lock = threading.Lock()
_model_name = "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice"

# Detect best device
# MPS works on Intel Macs with AMD GPUs, not just Apple Silicon
if torch.cuda.is_available():
    DEVICE = "cuda"
    DTYPE = torch.bfloat16
elif torch.backends.mps.is_available():
    DEVICE = "mps"
    DTYPE = torch.float32 
else:
    DEVICE = "cpu"
    DTYPE = torch.float32
    torch.set_num_threads(8)  # Optimize for multi-core CPU

print(f"[Qwen3-TTS] Using device: {DEVICE}, dtype: {DTYPE}")

SPEAKERS = {
    "Aiden": {"id": "Aiden", "name": "Aiden", "description": "Sunny American male voice with a clear midrange", "language": "English"},
    "Ryan": {"id": "Ryan", "name": "Ryan", "description": "Dynamic male voice with strong rhythmic drive", "language": "English"},
    "Vivian": {"id": "Vivian", "name": "Vivian", "description": "Bright, slightly edgy young female voice", "language": "Chinese"},
    "Serena": {"id": "Serena", "name": "Serena", "description": "Warm, gentle young female voice", "language": "Chinese"},
    "Ono_Anna": {"id": "Ono_Anna", "name": "Ono Anna", "description": "Playful Japanese female voice", "language": "Japanese"},
    "Sohee": {"id": "Sohee", "name": "Sohee", "description": "Warm Korean female voice with rich emotion", "language": "Korean"},
}
DEFAULT_SPEAKER = "Aiden"

def get_model():
    """Lazily load the Qwen3-TTS model."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from qwen_tts import Qwen3TTSModel
                print(f"[Qwen3-TTS] Loading model: {_model_name}")
                start = time.time()
                
                # Try to load from local cache first to avoid "Fetching" logs
                try:
                    _model = Qwen3TTSModel.from_pretrained(
                        _model_name, 
                        device_map=DEVICE, 
                        torch_dtype=DTYPE,
                        local_files_only=True
                    )
                    print("[Qwen3-TTS] Loaded from local cache.")
                except Exception:
                    print("[Qwen3-TTS] Local cache check failed or files missing, allowing download...")
                    _model = Qwen3TTSModel.from_pretrained(
                        _model_name, 
                        device_map=DEVICE, 
                        torch_dtype=DTYPE
                    )
                
                print(f"[Qwen3-TTS] Model loaded in {time.time() - start:.2f}s")
                print(f"[Qwen3-TTS] Supported speakers: {_model.get_supported_speakers()}")
    return _model


def audio_to_base64(audio: np.ndarray, sample_rate: int = 24000) -> str:
    """Convert numpy audio array to base64-encoded WAV."""
    buffer = io.BytesIO()
    sf.write(buffer, audio, sample_rate, format="WAV")
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "model": _model_name})


@app.route("/tts", methods=["POST"])
def tts():
    """
    Text-to-speech endpoint.
    
    Request body:
    {
        "text": "Hello world",
        "speaker": "Aiden",  // optional, default "Aiden"
        "language": "English",  // optional, default "auto"
        "instruct": "Read in a calm, narrative tone"  // optional
    }
    
    Response:
    {
        "audio_base64": "...",
        "sample_rate": 24000,
        "duration": 1.5
    }
    """
    try:
        data = request.get_json()
        if not data or "text" not in data:
            return jsonify({"error": "Missing 'text' field"}), 400
        
        text = data["text"]
        speaker = data.get("speaker", DEFAULT_SPEAKER).lower()
        language = data.get("language", "English")
        instruct = data.get("instruct")
        
        if not text.strip():
            return jsonify({"error": "Empty text"}), 400
        
        print(f"[Qwen3-TTS] Generating speech for {len(text)} chars with speaker={speaker}")
        start = time.time()
        
        model = get_model()
        
        # Generate speech using CustomVoice model
        wavs, sample_rate = model.generate_custom_voice(
            text=text,
            speaker=speaker,
            language=language,
            instruct=instruct,
            do_sample=False,
        )
        
        # wavs is a list, get the first result
        audio = wavs[0] if isinstance(wavs, list) else wavs
        duration = len(audio) / sample_rate
        print(f"[Qwen3-TTS] Generated {duration:.2f}s audio in {time.time() - start:.2f}s")
        
        audio_base64 = audio_to_base64(audio, sample_rate)
        
        return jsonify({
            "audio_base64": audio_base64,
            "sample_rate": sample_rate,
            "duration": duration,
        })
        
    except Exception as e:
        print(f"[Qwen3-TTS] Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/tts/stream", methods=["POST"])
def tts_stream():
    """Streaming TTS endpoint (SSE)."""
    try:
        data = request.get_json()
        if not data or "text" not in data:
            return jsonify({"error": "Missing 'text' field"}), 400
        
        text = data["text"]
        speaker = data.get("speaker", DEFAULT_SPEAKER).lower()
        language = data.get("language", "English")
        instruct = data.get("instruct")
        
        if not text.strip():
            return jsonify({"error": "Empty text"}), 400
        
        print(f"[Qwen3-TTS] Streaming speech for {len(text)} chars")
        
        def generate():
            try:
                model = get_model()
                wavs, sample_rate = model.generate_custom_voice(
                    text=text,
                    speaker=speaker,
                    language=language,
                    instruct=instruct,
                    do_sample=False,
                )
                
                audio = wavs[0] if isinstance(wavs, list) else wavs
                audio_base64 = audio_to_base64(audio, sample_rate)
                chunk = {
                    "audio_base64": audio_base64,
                    "sample_rate": sample_rate,
                    "duration": len(audio) / sample_rate,
                    "done": True,
                }
                yield f"data: {json.dumps(chunk)}\n\n"
                
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return Response(
            generate(),
            mimetype="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
        
    except Exception as e:
        print(f"[Qwen3-TTS] Stream error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/voices", methods=["GET"])
def voices():
    """List available speakers."""
    voices_list = [
        {"id": v["id"], "name": v["name"], "description": v["description"], "language": v["language"]}
        for v in SPEAKERS.values()
    ]
    return jsonify({"voices": voices_list})


def main():
    global _model_name
    import multiprocessing
    multiprocessing.freeze_support()
    
    parser = argparse.ArgumentParser(description="Qwen3-TTS Server")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=5123, help="Port to bind to")
    parser.add_argument("--model", default=_model_name, help="Model name to use")
    parser.add_argument("--preload", action="store_true", help="Preload model on startup")
    args = parser.parse_args()
    
    _model_name = args.model
    
    if args.preload:
        print("[Qwen3-TTS] Preloading model...")
        get_model()
    
    print(f"[Qwen3-TTS] Starting server on http://{args.host}:{args.port}")
    app.run(host=args.host, port=args.port, threaded=True)


if __name__ == "__main__":
    main()
