# Technology Stack - AI Reader

## Frontend
- **Framework:** React 19 (TypeScript)
- **Build Tool:** Vite
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
- **Database:** SQLite (managed via Rust/rusqlite)
- **Networking:** reqwest (Rust), TanStack Query (Frontend)

## AI & Services
- **LLM Provider:** OpenAI API (utilizing the Responses API for agentic reasoning)
- **TTS Provider:** ElevenLabs API (via `@elevenlabs/elevenlabs-js`)
- **Book Source:** Project Gutenberg (via Gutendex API)

## Development & Infrastructure
- **Package Manager:** Bun
- **Testing:** Vitest, React Testing Library
- **Language:** TypeScript 5.x, Rust 2021 Edition
