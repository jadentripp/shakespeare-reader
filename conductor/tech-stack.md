# Technology Stack - AI Reader

## Frontend
- **Framework:** React 19 (TypeScript)
- **Build Tool:** Bun (native bundler & dev server)
- **Routing:** TanStack Router
- **Data Fetching:** TanStack Query

## Styling & UI
- **Styling:** Tailwind CSS 4
- **Components:** Radix UI Primitives
- **3D Graphics:** Three.js (with WebGPU support)
- **3D Hooks:** @react-three/fiber, @react-three/drei
- **Icons:** Lucide React

## Desktop Shell
- **Core:** Tauri 2 (Rust)
- **Capabilities:** System notifications, file system access, window management.

## Data & Backend
- **Database:** SQLite (default, via Rust/rusqlite) or PostgreSQL (via sqlx, enabled with `AI_READER_POSTGRES=1`)
- **Networking:** reqwest (Rust), TanStack Query (Frontend)

## AI & Services
- **LLM Provider:** OpenAI API (utilizing the Responses API for agentic reasoning)
- **TTS Provider:** ElevenLabs API (via `@elevenlabs/elevenlabs-js`) and Qwen3-TTS (Local Sidecar)
- **Local AI Sidecar:** Qwen3-TTS 0.6B (PyTorch-based Python server)
- **Book Source:** Project Gutenberg (via Gutendex API)

## Development & Infrastructure
- **Package Manager:** Bun
- **Python Bundling:** PyInstaller (for standalone sidecar execution)
- **Testing:** Bun Test, React Testing Library
- **Language:** TypeScript 5.x, Rust 2021 Edition, Python 3.11+ (Sidecar)
