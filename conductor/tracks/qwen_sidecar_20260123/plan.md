# Implementation Plan: Qwen TTS Production Sidecar

This plan covers the transition of the local Qwen TTS Python server into a production-ready Tauri sidecar, focusing on standalone bundling, Rust-managed lifecycle, and frontend state synchronization.

## Phase 1: PyInstaller Packaging (Standalone Binary)
- [x] Task: Create a standalone Python build script in `conductor/qwen-tts/bundle.py` that uses PyInstaller to bundle the server. f4a4a45
- [x] Task: Verify the standalone binary runs correctly on the current platform (macOS) without the virtual environment. 3f01edb
- [x] Task: Update `tauri.conf.json` to include the sidecar binary and configure the required naming convention (e.g., `qwen-tts-aarch64-apple-darwin`). 63c7f81
- [~] Task: Conductor - User Manual Verification 'Phase 1: PyInstaller Packaging' (Protocol in workflow.md)

## Phase 2: Rust Sidecar Manager (Tauri Integration)
- [ ] Task: Implement a Rust-based `SidecarState` struct and `SidecarStatus` enum in `src-tauri/src/lib.rs` (or a new module).
- [ ] Task: Implement Tauri commands `start_qwen_sidecar`, `stop_qwen_sidecar`, and `get_qwen_status`.
- [ ] Task: Integrate sidecar lifecycle management in the Rust backend to ensure the process starts on demand and stops cleanly on app exit.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Rust Sidecar Manager' (Protocol in workflow.md)

## Phase 3: Frontend Status & Lifecycle Control
- [ ] Task: Write unit tests for the sidecar lifecycle events in the React frontend.
- [ ] Task: Update the `SettingsPage` to listen for sidecar status events and show real-time status (Starting, Online, Offline, Error).
- [ ] Task: Implement "Lazy-Loading" logic in `SettingsPage`: start the sidecar when Qwen is selected or a preview is requested.
- [ ] Task: Update `qwenTTSService` in `src/lib/qwen-tts.ts` to coordinate with the new Tauri sidecar commands instead of assuming a manual server is running.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Frontend Status & Lifecycle Control' (Protocol in workflow.md)

## Phase 4: Verification & Polishing
- [ ] Task: Verify end-to-end audio generation using the bundled sidecar.
- [ ] Task: Implement graceful error handling in the UI if the sidecar fails to start (e.g., port conflict or missing binary).
- [ ] Task: Final audit of the `tauri.conf.json` and CSP settings for production security.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Verification & Polishing' (Protocol in workflow.md)
