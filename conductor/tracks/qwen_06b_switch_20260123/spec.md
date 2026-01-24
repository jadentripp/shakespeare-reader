# Specification: Qwen TTS 0.6B Model Switch

## Overview
The current Qwen3-TTS implementation uses the 1.7B parameter model, which is experiencing significant latency issues on the current hardware. This track aims to switch the local sidecar server to the 0.6B parameter `CustomVoice` variant to improve inference speed while maintaining compatibility with the existing speaker set and API.

## Functional Requirements
- Update the default model in `conductor/qwen-tts/server.py` to `Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice`.
- Ensure the `/tts`, `/tts/stream`, and `/voices` endpoints continue to function correctly with the smaller model.
- Maintain support for the existing 9 premium speakers (Vivian, Ryan, Aiden, etc.).

## Non-Functional Requirements
- **Performance**: Significant reduction in inference latency compared to the 1.7B model.
- **Stability**: The server should remain stable and handle requests without crashing or requiring system dependencies like `flash-attn` or `sox`.

## Acceptance Criteria
- The Qwen-TTS server loads the `Qwen3-TTS-12Hz-0.6B-CustomVoice` model successfully.
- TTS generation via the `/tts` endpoint is verified to be faster than the previous 1.7B implementation.
- Audio output is generated correctly and remains compatible with the AI Reader frontend.

## Out of Scope
- Installation of missing system dependencies (`flash-attn`, `sox`).
- Changes to the React frontend TTS logic.
- Switching to the Base or VoiceDesign model variants.
