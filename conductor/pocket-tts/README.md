# Pocket TTS Server

Local Pocket TTS server for AI Reader. Pocket TTS is a 100M parameter model from Kyutai that runs in real-time on CPU.

## Features

- **Fast**: ~6x real-time on modern CPUs, ~200ms latency to first audio chunk
- **Lightweight**: 100M parameters, runs on CPU without GPU
- **Voice cloning**: Uses HuggingFace voice repository
- **MIT License**: Trained on public English datasets only

## Development

```bash
cd conductor/pocket-tts
uv sync
uv run python server.py
```

The server runs on http://localhost:5123 by default.

### Available voices

- `alba` - Clear female voice, casual style (default)
- `marius` - Male voice with natural tone
- `javert` - Deep authoritative male voice
- `jean` - Warm male voice
- `fantine` - Gentle female voice
- `cosette` - Young female voice
- `eponine` - Expressive female voice
- `azelma` - Soft female voice

## API Endpoints

### POST /tts

Generate speech from text.

```json
{
  "text": "Hello world",
  "speaker": "alba"
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

### POST /tts/stream

Streaming TTS via Server-Sent Events.

### GET /voices

List available voices.

### GET /health

Health check.

## Bundling for Tauri

```bash
uv run python bundle.py
```

This creates a PyInstaller bundle in `dist/pocket-tts-{target}/` that can be used as a Tauri sidecar.

## Migration from Qwen TTS

Old Qwen speaker names are automatically mapped:
- `aiden` → `alba`
- `ryan` → `marius`
- `vivian` → `cosette`
- `serena` → `fantine`
- `ono_anna` → `eponine`
- `sohee` → `azelma`
