# AI Reader Project Context

AI Reader is an AI-powered desktop application for reading and interacting with public-domain literature from Project Gutenberg. It features a modern, paginated reading interface with AI-assisted analysis and research capabilities.

## Tech Stack

- **Desktop Framework:** [Tauri v2](https://tauri.app/) (Rust-based shell)
- **Frontend Framework:** [React 19](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Bun](https://bun.sh/) (native bundler & dev server)
- **Package Manager:** [Bun](https://bun.sh/)
- **Routing & State:** [TanStack Router](https://tanstack.com/router/v1) & [TanStack Query](https://tanstack.com/query/v5)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [Radix UI](https://www.radix-ui.com/)
- **Database:** SQLite via [rusqlite](https://github.com/rusqlite/rusqlite) in Rust
- **AI Integration:** [OpenAI API](https://openai.com/api/) (Chat, Assistant, Model Selection)
- **Audio/TTS:** [ElevenLabs](https://elevenlabs.io/)
- **3D Components:** [React Three Fiber](https://r3f.docs.pmnd.rs/) & [Three.js](https://threejs.org/)
- **Testing:** [Bun Test](https://bun.sh/docs/cli/test) & [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## Project Structure

- `src/`: React frontend application.
  - `components/`: UI components, organized by feature (reader, library, settings, three, ui).
  - `lib/`: Core logic, utilities, hooks, and Tauri command wrappers.
  - `routes/`: Route components for different pages (Library, Book, Settings, etc.).
  - `tests/`: Extensive test suite using Bun Test.
- `src-tauri/`: Rust backend and Tauri configuration.
  - `src/`: Rust logic for database management, book downloading/extraction, and Gutendex integration.
- `conductor/`: Project management and specification documents (Product Definition, Tech Stack, Tracks).

## Building and Running

- `bun install`: Install dependencies.
- `bun run dev`: Start the Bun development server (Web only).
- `bun run tauri dev`: Run the desktop application in development mode.
- `bun run build`: Build web assets.
- `bun run tauri build`: Build the production desktop application.
- `bun run test`: Execute the test suite using Bun Test.
- `bun run db:reset`: Clear the local database and downloaded book files.

## Development Conventions

- **Frontend:**
  - Uses React 19 features (e.g., `use` hook patterns where applicable).
  - TanStack Router for type-safe routing.
  - Tailwind CSS for utility-first styling.
  - Icons provided by `lucide-react`.
- **Backend:**
  - Tauri commands are defined in `src-tauri/src/lib.rs`.
  - SQLite database is initialized and managed in `src-tauri/src/db.rs`.
  - Book processing logic (MOBI to HTML) is in `src-tauri/src/books.rs`.
- **Testing:**
  - Bun Test is the primary testing framework.
  - Tests are located in `src/tests/`.
  - Note: `AGENTS.md` may contain outdated information regarding testing; rely on `package.json` and the `src/tests/` directory.
- **AI:**
  - OpenAI integration is centralized in `src/lib/openai.ts`.
  - Supports model selection and customizable prompts.

## Key Files

- `src/App.tsx`: Main application entry and provider setup.
- `src/router.tsx`: TanStack Router configuration.
- `src-tauri/src/lib.rs`: Main entry point for the Rust backend and Tauri command definitions.
- `src-tauri/tauri.conf.json`: Tauri application configuration and permissions.
- `conductor/tracks.md`: Registry of development "tracks" and progress.
