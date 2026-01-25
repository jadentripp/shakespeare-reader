# Specification: Qwen TTS Production Sidecar

## Overview
This track focuses on productionizing the Qwen TTS (local Python server) by bundling it as a standalone sidecar executable within the Tauri application. It ensures the server is manageable, resource-efficient, and easy for end-users to use without requiring a local Python installation.

## Functional Requirements
- **Standalone Binary:** Package the Qwen TTS Python server (and its dependencies like `torch`, `transformers`) into a platform-specific executable using PyInstaller.
- **On-Demand Lifecycle:**
    - The server should NOT start automatically on app boot.
    - The server starts only when the user selects "Qwen" in the settings or attempts to use Qwen for audio generation.
    - The server should terminate when the user switches to another provider or closes the application.
- **State Management (Rust):**
    - Implement a Rust-based `SidecarManager` (as a Tauri Plugin or managed state).
    - Track states: `Stopped`, `Starting`, `Running`, `Errored`.
- **Frontend Integration:**
    - Update the Settings page to show real-time server status (Starting..., Online, Offline).
    - Handle "Errored" states gracefully with user-friendly messages.
- **Tauri Configuration:**
    - Configure `tauri.conf.json` with the `externalBin` (sidecar) definition.
    - Update CSP to allow communication with the sidecar's port (5123).

## Non-Functional Requirements
- **Performance:** Ensure the sidecar startup doesn't freeze the main UI (use asynchronous commands).
- **Resource Management:** Ensure the process is killed cleanly on app exit (standard Tauri behavior).
- **Compatibility:** Initial support for macOS (Darwin), with a structure ready for Windows/Linux.

## Acceptance Criteria
- [ ] PyInstaller can successfully build a working standalone executable of the `qwen-tts` server.
- [ ] The Tauri app bundles this executable and can launch it as a sidecar.
- [ ] The server only runs when needed (On-Demand).
- [ ] The Settings page UI correctly reflects the server status (Starting/Online/Offline).
- [ ] Audio generation via Qwen works using the bundled sidecar.

## Out of Scope
- Supporting all GPU architectures (will focus on CPU/Metal for macOS for now).
- Automatic downloading of large model files (models will be bundled or expected in a specific path initially).
