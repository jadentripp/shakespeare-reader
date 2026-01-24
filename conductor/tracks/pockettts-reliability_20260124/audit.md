# PocketTTS Integration Audit

## Components
- UI entry points: `src/routes/SettingsPage.tsx`, `src/components/reader/TTSPanel.tsx`, `src/routes/TtsDemoPage.tsx`.
- Core service: `src/lib/pocket-tts.ts` (PocketTTSService) and worker runtime in `public/pocket-tts/worker/inference-worker.js`.
- Playback: `src/lib/tts.ts` (AudioPlayer) calls `pocketTTSService.textToSpeech` and decodes WAV.

## Model Load Lifecycle
1. `PocketTTSService.ensureReady()` sets status to `loading` and spawns a Worker (`boot-worker.js`).
2. Boot worker imports `inference-worker.js` then posts `boot_ready`.
3. Service receives `boot_ready` and posts `set_model_base_url` and `load`.
4. Worker `load` calls `loadModels()`:
   - Loads ONNX runtime, model sessions, tokenizer, voices.
   - Sets `isReady = true`, posts `status: Ready` (state `idle`), `model_status: ready`, then `loaded`.
   - Note: `load` handler also posts `loaded` after `loadModels()` resolves, so `loaded` is emitted twice.
5. Service `onmessage` handles:
   - `status` -> updates local status.
   - `model_status: ready` and `loaded` -> sets status `ready` and resolves `readyPromise`.

## Voice Registration / Conditioning
- `getVoices()` calls `ensureReady()` then `ensureVoicePrompts()`.
- `ensureVoicePrompts()` registers voices from local prompts in `LOCAL_VOICE_PROMPTS` by sending `register_voice`.
- Worker `register_voice` encodes voice audio, updates `predefinedVoices`, emits `voice_registered` and `voices_loaded`.
- Service tracks `voiceNames` and `voices` from `voices_loaded` and resolves pending registrations on `voice_registered`.

## Playback Flow
- `AudioPlayer.play()` calls `pocketTTSService.textToSpeech(text, voiceId)`.
- `PocketTTSService.textToSpeech()`:
  - `ensureReady()` -> `setVoice()` -> `ensureVoicePrompts()` -> worker `set_voice`.
  - Guards concurrent generation via `pendingGeneration`.
- Worker `generate` -> streams `audio_chunk` messages then `stream_ended`.
- Service combines chunks, converts to WAV base64, resolves the response.

## Ready State vs Actual Readiness
- Service marks `ready` on `model_status` or `loaded` before voice prompts are necessarily registered.
- `ensureVoicePrompts()` is only triggered by `getVoices()` or `setVoice()`, so UI may show `ready` while voice registration is still pending.

## Potential Reliability Hotspots
- **Double `loaded` event**: Worker emits `loaded` inside `loadModels()` and again in `load` handler, which may cause repeated ready transitions.
- **Voice registration after ready**: `ready` does not imply voices are registered; the UI can attempt playback or display ready while voice prompts are still loading.
- **Reload resets**: `reload()` resets worker and status but does not clear cached `voiceNames`/`voices`, `workerReady`, or pending registers, which can cause stale state.
- **Worker isGenerating guard**: Worker ignores generate if already generating; service also guards with `pendingGeneration`, but no queueing or explicit error when worker ignores.

## Notes for Upcoming Fixes
- Consider explicit `voiceReady` state separate from `modelReady` and reflect it in UI.
- Ensure reload clears cached voice state and pending registrations.
- Collapse duplicated `loaded` events or make `ensureReady()` idempotent to avoid double ready transitions.
