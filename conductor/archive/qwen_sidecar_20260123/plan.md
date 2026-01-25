# Implementation Plan: Qwen TTS Production Sidecar

This plan covers the transition of the local Qwen TTS Python server into a production-ready Tauri sidecar, focusing on standalone bundling, Rust-managed lifecycle, and frontend state synchronization.

## Phase 1: PyInstaller Packaging (Standalone Binary) [checkpoint: b822ff2]
- [x] Task: Create a standalone Python build script in `conductor/qwen-tts/bundle.py` that uses PyInstaller to bundle the server. f4a4a45
- [x] Task: Verify the standalone binary runs correctly on the current platform (macOS) without the virtual environment. 3f01edb
- [x] Task: Update `tauri.conf.json` to include the sidecar binary and configure the required naming convention (e.g., `qwen-tts-aarch64-apple-darwin`). 63c7f81
- [x] Task: Conductor - User Manual Verification 'Phase 1: PyInstaller Packaging' (Protocol in workflow.md) 0f5eed7

## Phase 2: Rust Sidecar Manager (Tauri Integration) [checkpoint: 6a0dfd4]
- [x] Task: Implement a Rust-based `SidecarState` struct and `SidecarStatus` enum in `src-tauri/src/lib.rs` (or a new module). 5245cdd
- [x] Task: Implement Tauri commands `start_qwen_sidecar`, `stop_qwen_sidecar`, and `get_qwen_status`. 554dbb0
- [x] Task: Integrate sidecar lifecycle management in the Rust backend to ensure the process starts on demand and stops cleanly on app exit. ab9d17f
- [x] Task: Conductor - User Manual Verification 'Phase 2: Rust Sidecar Manager' (Protocol in workflow.md) eb83815

## Phase 3: Frontend Status & Lifecycle Control [checkpoint: 92226cc]
- [x] Task: Write unit tests for the sidecar lifecycle events in the React frontend. 1a39af9
- [x] Task: Update the `SettingsPage` to listen for sidecar status events and show real-time status (Starting, Online, Offline, Error). 7f1d0e9
- [x] Task: Implement "Lazy-Loading" logic in `SettingsPage`: start the sidecar when Qwen is selected or a preview is requested. 925eef5
- [x] Task: Update `qwenTTSService` in `src/lib/qwen-tts.ts` to coordinate with the new Tauri sidecar commands instead of assuming a manual server is running. d8428c8
- [x] Task: Conductor - User Manual Verification 'Phase 3: Frontend Status & Lifecycle Control' (Protocol in workflow.md) 2ecb84f

## Phase 4: Verification & Polishing [checkpoint: eaef037]
- [x] Task: Verify end-to-end audio generation using the bundled sidecar. 7ec7d3b
- [x] Task: Implement graceful error handling in the UI if the sidecar fails to start (e.g., port conflict or missing binary). 8d3d42c
- [x] Task: Final audit of the `tauri.conf.json` and CSP settings for production security. (Audited - no changes needed)
- [x] Task: Conductor - User Manual Verification 'Phase 4: Verification & Polishing' (Protocol in workflow.md) 47a265f
