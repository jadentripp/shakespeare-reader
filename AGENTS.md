# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the React + TypeScript app. Key entry points are `src/main.tsx`, `src/App.tsx`, and route config in `src/router.tsx` with route modules under `src/routes/`.
- Shared utilities live in `src/lib/`, and static assets live in `src/assets/` and `public/`.
- The Tauri desktop shell lives in `src-tauri/` with Rust source in `src-tauri/src/`, config in `src-tauri/tauri.conf.json`, and build artifacts in `src-tauri/target/`.
- Web build output is emitted to `dist/`.

## Build, Test, and Development Commands
- `bun install`: install dependencies (Bun is the expected package manager; see `bun.lock`).
- `bun run dev`: start the Bun dev server for the web UI.
- `bun run tauri dev`: run the desktop app in development mode.
- `bun run build`: type-check (`tsc`) and build the web bundle into `dist/`.
- `bun run preview`: serve the production build locally.

## Coding Style & Naming Conventions
- TypeScript/React code uses 2-space indentation and double quotes (see `src/App.tsx`).
- Components are PascalCase (e.g., `AppLayout`), hooks and utilities are camelCase (e.g., `dbInit`).
- No repo-wide formatter or linter config is present; keep changes consistent with nearby files.

## Testing Guidelines
- No test framework or test scripts are configured in `package.json`.
- If you add tests, document the tool and include a `bun run test` script. Prefer naming like `*.test.tsx` colocated with the module or under a new `tests/` directory.

## Commit & Pull Request Guidelines
- This directory does not include a Git history, so no commit conventions can be inferred.
- If you are starting conventions, keep commits scoped and imperative (e.g., `ui: add library filter`) and ensure PRs describe changes, testing steps, and screenshots for UI updates.

## Configuration & Security Notes
- Desktop capabilities and permissions are defined in `src-tauri/capabilities/`. Review changes there carefully.
- Environment-specific settings should be tracked in config files, not committed secrets.
