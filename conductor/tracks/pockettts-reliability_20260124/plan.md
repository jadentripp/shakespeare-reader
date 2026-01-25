# Implementation Plan

## Phase 1: Investigation & Repro
- [x] Task: Review PocketTTS upstream guidance and web player behavior (a3be0aa)
    - [ ] Identify loading/streaming/voice registration best practices
    - [ ] Note any thread-safety or streaming constraints
- [x] Task: Audit current PocketTTS integration and state flow (8cff951)
    - [ ] Map model load lifecycle, voice registration, playback calls
    - [ ] Identify where “ready” is set vs actually ready
- [x] Task: Reproduce failures and capture diagnostics (0e93492)
    - [ ] Tauri dev: capture model load failure stack traces
    - [ ] Web dev: capture garbled output scenario
    - [ ] Add temporary instrumentation for timing and state transitions
- [x] Task: Conductor - User Manual Verification 'Phase 1: Investigation & Repro' (Protocol in workflow.md) (6681d60)

## Phase 2: Reliability Fixes (Model Load + Playback Stability) [checkpoint: 840039a]
- [x] Task: Write failing tests for model-load gating and voice registration (59dfdf4)
    - [ ] Add unit tests for state machine (load -> ready -> register -> play)
    - [ ] Add tests for retry/error propagation
- [x] Task: Implement reliable model load/ready gating (e8615f2)
    - [ ] Ensure single load, stable ready signal, and safe retries
    - [ ] Block voice registration/playback before ready
- [x] Task: Write failing tests for playback stability (aa1e0ed)
    - [ ] Ensure streaming assembly order and decode integrity
    - [ ] Prevent concurrent generation on shared model instance
- [x] Task: Implement playback stability fixes (80516f1)
    - [ ] Fix streaming buffer handling / audio assembly
    - [ ] Guard concurrency and re-entrancy
- [x] Task: Prevent overlapping PocketTTS generations in UI (7a2bcdd)
    - [ ] Block play requests while buffering/generating
    - [ ] Ensure play button reflects loading/locked state
- [x] Task: Conductor - User Manual Verification 'Phase 2: Reliability Fixes (Model Load + Playback Stability)' (Protocol in workflow.md) (3a3e7f6)

## Phase 3: UX Loading State + Word Highlighting
- [x] Task: Write failing tests for loading UX and highlight behavior (3cbf12b)
    - [ ] Loading state visible during model/voice prep
    - [ ] Highlight timing advances with playback clock
- [x] Task: Implement loading UX state machine (02326d7)
    - [ ] Disable controls during load/prepare
    - [ ] Provide long-load fallback messaging
- [x] Task: Implement word-level highlighting (8f568dd)
    - [ ] Connect word timing data to reader rendering
    - [ ] Ensure highlights reset on stop/seek
- [ ] Task: Conductor - User Manual Verification 'Phase 3: UX Loading State + Word Highlighting' (Protocol in workflow.md)

## Phase 4: Cleanup & Coverage
- [ ] Task: Remove temporary instrumentation and finalize logging
    - [ ] Keep concise, actionable logs for TTS failures
- [ ] Task: Run full test suite and verify coverage target
    - [ ] Document any gaps or follow-up items
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Cleanup & Coverage' (Protocol in workflow.md)
