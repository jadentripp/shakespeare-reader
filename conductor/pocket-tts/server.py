#!/usr/bin/env python3
"""
Local Pocket TTS server for the AI Reader application.

Usage:
    cd conductor/pocket-tts
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
from pathlib import Path
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
_voice_states: dict[str, dict] = {}

# Pocket TTS outputs 24kHz audio
SAMPLE_RATE = 24000

print(f"[Pocket-TTS] Using device: cpu (Pocket TTS is CPU-optimized)")

# Available voices from Hugging Face voices repository
VOICES = {
    "alba": {"id": "alba", "name": "Alba", "description": "Clear female voice, casual style", "hf_path": "hf://kyutai/tts-voices/alba-mackenna/casual.wav"},
    "marius": {"id": "marius", "name": "Marius", "description": "Male voice with natural tone", "hf_path": "hf://kyutai/tts-voices/marius/casual.wav"},
    "javert": {"id": "javert", "name": "Javert", "description": "Deep authoritative male voice", "hf_path": "hf://kyutai/tts-voices/javert/casual.wav"},
    "jean": {"id": "jean", "name": "Jean", "description": "Warm male voice", "hf_path": "hf://kyutai/tts-voices/jean/casual.wav"},
    "fantine": {"id": "fantine", "name": "Fantine", "description": "Gentle female voice", "hf_path": "hf://kyutai/tts-voices/fantine/casual.wav"},
    "cosette": {"id": "cosette", "name": "Cosette", "description": "Young female voice", "hf_path": "hf://kyutai/tts-voices/cosette/casual.wav"},
    "eponine": {"id": "eponine", "name": "Eponine", "description": "Expressive female voice", "hf_path": "hf://kyutai/tts-voices/eponine/casual.wav"},
    "azelma": {"id": "azelma", "name": "Azelma", "description": "Soft female voice", "hf_path": "hf://kyutai/tts-voices/azelma/casual.wav"},
}
DEFAULT_VOICE = "alba"


def get_model():
    """Lazily load the Pocket TTS model."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from pocket_tts import TTSModel
                print("[Pocket-TTS] Loading model...")
                start = time.time()
                _model = TTSModel.load_model()
                print(f"[Pocket-TTS] Model loaded in {time.time() - start:.2f}s")
    return _model


def get_voice_state(voice_id: str) -> dict:
    """Get or create voice state for a given voice."""
    global _voice_states
    
    if voice_id not in _voice_states:
        model = get_model()
        voice_info = VOICES.get(voice_id, VOICES[DEFAULT_VOICE])
        hf_path = voice_info["hf_path"]
        
        print(f"[Pocket-TTS] Loading voice state for {voice_id} from {hf_path}")
        start = time.time()
        _voice_states[voice_id] = model.get_state_for_audio_prompt(hf_path)
        print(f"[Pocket-TTS] Voice state loaded in {time.time() - start:.2f}s")
    
    return _voice_states[voice_id]


def audio_to_base64(audio: torch.Tensor | np.ndarray, sample_rate: int = SAMPLE_RATE) -> str:
    """Convert audio tensor/array to base64-encoded WAV."""
    if isinstance(audio, torch.Tensor):
        audio = audio.numpy()
    
    buffer = io.BytesIO()
    sf.write(buffer, audio, sample_rate, format="WAV")
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "model": "pocket-tts"})


@app.route("/tts", methods=["POST"])
def tts():
    """
    Text-to-speech endpoint.
    
    Request body:
    {
        "text": "Hello world",
        "speaker": "alba",  // optional, default "alba"
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
        speaker = data.get("speaker", DEFAULT_VOICE).lower()
        
        if not text.strip():
            return jsonify({"error": "Empty text"}), 400
        
        # Map old Qwen speaker names to Pocket TTS voices
        speaker_map = {
            "aiden": "alba",
            "ryan": "marius",
            "vivian": "cosette",
            "serena": "fantine",
            "ono_anna": "eponine",
            "sohee": "azelma",
        }
        speaker = speaker_map.get(speaker, speaker)
        
        if speaker not in VOICES:
            speaker = DEFAULT_VOICE
        
        print(f"[Pocket-TTS] Generating speech for {len(text)} chars with voice={speaker}")
        start = time.time()
        
        model = get_model()
        voice_state = get_voice_state(speaker)
        
        audio = model.generate_audio(voice_state, text)
        
        duration = len(audio) / SAMPLE_RATE
        print(f"[Pocket-TTS] Generated {duration:.2f}s audio in {time.time() - start:.2f}s")
        
        audio_base64 = audio_to_base64(audio, SAMPLE_RATE)
        
        return jsonify({
            "audio_base64": audio_base64,
            "sample_rate": SAMPLE_RATE,
            "duration": duration,
        })
        
    except Exception as e:
        print(f"[Pocket-TTS] Error: {e}")
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
        speaker = data.get("speaker", DEFAULT_VOICE).lower()
        
        if not text.strip():
            return jsonify({"error": "Empty text"}), 400
        
        # Map old Qwen speaker names to Pocket TTS voices
        speaker_map = {
            "aiden": "alba",
            "ryan": "marius",
            "vivian": "cosette",
            "serena": "fantine",
            "ono_anna": "eponine",
            "sohee": "azelma",
        }
        speaker = speaker_map.get(speaker, speaker)
        
        if speaker not in VOICES:
            speaker = DEFAULT_VOICE
        
        print(f"[Pocket-TTS] Streaming speech for {len(text)} chars with voice={speaker}")
        
        def generate():
            try:
                model = get_model()
                voice_state = get_voice_state(speaker)
                
                chunks = []
                for chunk in model.generate_audio_stream(voice_state, text):
                    chunks.append(chunk)
                    chunk_base64 = audio_to_base64(chunk, SAMPLE_RATE)
                    chunk_data = {
                        "audio_base64": chunk_base64,
                        "sample_rate": SAMPLE_RATE,
                        "duration": len(chunk) / SAMPLE_RATE,
                        "done": False,
                    }
                    yield f"data: {json.dumps(chunk_data)}\n\n"
                
                # Send final done message
                yield f"data: {json.dumps({'done': True})}\n\n"
                
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return Response(
            generate(),
            mimetype="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
        
    except Exception as e:
        print(f"[Pocket-TTS] Stream error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/voices", methods=["GET"])
def voices():
    """List available voices."""
    voices_list = [
        {"id": v["id"], "name": v["name"], "description": v["description"], "language": "English"}
        for v in VOICES.values()
    ]
    return jsonify({"voices": voices_list})


def main():
    import multiprocessing
    multiprocessing.freeze_support()
    
    parser = argparse.ArgumentParser(description="Pocket TTS Server")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=5123, help="Port to bind to")
    parser.add_argument("--preload", action="store_true", help="Preload model on startup")
    args = parser.parse_args()
    
    if args.preload:
        print("[Pocket-TTS] Preloading model...")
        get_model()
        # Also preload the default voice
        get_voice_state(DEFAULT_VOICE)
    
    print(f"[Pocket-TTS] Starting server on http://{args.host}:{args.port}")
    app.run(host=args.host, port=args.port, threaded=True)


if __name__ == "__main__":
    main()
