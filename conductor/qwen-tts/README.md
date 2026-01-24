# Qwen3-TTS Local Server

Local text-to-speech server using [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS), a state-of-the-art open-source TTS model.

## Requirements

- Python 3.11+ (3.12 recommended)
- [uv](https://docs.astral.sh/uv/) package manager
- ~8GB RAM for 1.7B model (CPU), or ~4GB for 0.6B model
- ~3GB disk space for model weights (downloaded on first run)

**Platform Support:**
- macOS (Apple Silicon M1/M2/M3) ✅
- macOS (Intel x86_64) ✅ (uses PyTorch 2.2.2 - last Intel-compatible version)
- Linux x86_64 ✅
- Windows x86_64 ✅

## Quick Start

```bash
cd conductor/qwen-tts
uv sync                      # Install dependencies
uv run python server.py      # Start server (downloads model on first run)
```

The server runs at `http://localhost:5123`.

## Options

```bash
uv run python server.py --help

# Preload model on startup (recommended for faster first request)
uv run python server.py --preload

# Use smaller 0.6B model (less VRAM)
uv run python server.py --model Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice

# Custom port
uv run python server.py --port 8080
```

## Available Speakers

| Speaker | Language | Description |
|---------|----------|-------------|
| Aiden | English | Sunny American male voice with clear midrange |
| Ryan | English | Dynamic male voice with strong rhythmic drive |
| Vivian | Chinese | Bright, slightly edgy young female voice |
| Serena | Chinese | Warm, gentle young female voice |
| Ono_Anna | Japanese | Playful female voice with light, nimble timbre |
| Sohee | Korean | Warm female voice with rich emotion |

## API Endpoints

### POST /tts
Generate speech from text.

```json
{
  "text": "Hello, world!",
  "speaker": "Aiden",
  "language": "English",
  "instruct": "Read in a calm, narrative tone"
}
```

Response:
```json
{
  "audio_base64": "...",
  "sample_rate": 24000,
  "duration": 1.5
}
```

### GET /voices
List available speakers.

### GET /health
Health check endpoint.

## Integration with AI Reader

The AI Reader app automatically connects to this server when TTS provider is set to "Qwen".

In the app settings, select **Qwen (Local)** as your TTS provider to use free, unlimited local TTS.
