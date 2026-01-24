# PocketTTS Investigation Notes

## Upstream guidance (model card)
- `load_model()` and `get_state_for_audio_prompt()` are relatively slow; guidance is to keep model and voice states in memory for reuse. This supports a single-load + cached-voice design.
- The model card explicitly lists running the TTS in a web browser (WebAssembly) as an unsupported feature for the reference implementation.
- The model supports audio streaming, which implies the playback path should treat the stream as ordered chunks and avoid re-entrancy during decode.

## Web player behavior (official demo)
- The Kyutai PocketTTS web demo runs entirely in-browser and exposes a small set of predefined voices, suggesting a dedicated web/WASM/WebGPU port (distinct from the reference implementation mentioned in the model card).
- The demo implies a single, persistent model instance with user-triggered playback, which aligns with caching guidance.

## Implications for our integration
- We should treat model and voice state as long-lived, singletons (load once, cache voice states, gate playback until ready).
- The official model card doesn’t document word-level timing support for PocketTTS; word highlighting may require inference from audio duration or an auxiliary alignment strategy.
- The web demo’s behavior reinforces avoiding concurrent generation on the same model instance.

## Sources
- Kyutai PocketTTS model card (Hugging Face)
- Kyutai PocketTTS web demo
- Kyutai JAX‑JS site
