# Shakespeare Reader

A lightweight desktop and web reader for Shakespeare’s plays, built with Tauri + React + TypeScript.

## Features

- Browse and read plays in a focused, distraction-free UI
- Desktop app via Tauri, plus a web build via Vite
- Fast startup and small footprint

## Tech Stack

- React + TypeScript (Vite)
- Tauri for the desktop shell
- Bun for package management and scripts

## Getting Started

Install dependencies:

```bash
bun install
```

Start the web app (Vite dev server):

```bash
bun run dev
```

Start the desktop app (Tauri):

```bash
bun run tauri dev
```

Build production assets:

```bash
bun run build
```

Preview the production web build:

```bash
bun run preview
```

## Project Structure

- `src/` React app source
- `src/routes/` route modules
- `src/lib/` shared utilities
- `src-tauri/` Tauri Rust code and config

## Contributing

PRs welcome. Please include a brief description of changes and any relevant screenshots for UI updates.
