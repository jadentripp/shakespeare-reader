# Track Spec: PocketTTS Reliability + UX

## Overview
Fix PocketTTS reliability issues (model load failures and garbled output) and improve UX for TTS playback in AI Reader. Ensure playback is stable in Tauri dev and web dev, add a clear loading state, and implement word-level highlighting during playback. No Python sidecar is allowed for Tauri; maintain the current in-app/WASM approach.

## Functional Requirements
1. **Model Load Reliability**
   - Ensure PocketTTS models load exactly once and expose a stable “ready” state.
   - Prevent voice registration or playback requests before models are loaded.
   - Provide retry and clear error reporting if model load fails.

2. **Voice Registration / Conditioning**
   - Register and cache predefined voices only after models are fully loaded.
   - Avoid re-register loops that trigger “Models are not loaded yet.”
   - Keep voice state caching where possible for fast subsequent playback.

3. **Playback Stability**
   - Eliminate garbled/invalid audio output across repeated runs.
   - Ensure streaming audio assembly/decoding is consistent and resilient.
   - Guard against concurrent generation using unsafe shared state.

4. **Loading State UX**
   - When user presses play, show a clear loading/progress state.
   - Disable or gate controls while models/voices are loading.
   - Provide a visible fallback message if loading exceeds a threshold.

5. **Word Highlighting**
   - Implement word-level highlighting during playback.
   - Ensure highlight timing advances in sync with audio playback.

## Non-Functional Requirements
- Must work in Tauri dev and web dev on Intel Macs.
- No Python sidecar for Tauri.
- Avoid UI freezes; loading and generation should not block the main thread.
- Respect existing visual design (Bauhaus-inspired UI).

## Acceptance Criteria
- Tauri dev can play PocketTTS reliably without “Models are not loaded yet.”
- Playback is intelligible and consistent across multiple runs.
- Play button shows a clear loading state until models and voices are ready.
- Word-level highlighting visibly tracks speech during playback.
- No Python sidecar is introduced.

## Out of Scope
- Switching to a different TTS provider.
- Full redesign of TTS panel UI beyond loading/feedback states.
- Cross-origin isolation changes unless required for stability.
