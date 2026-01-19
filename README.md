# AI Reader

AI Reader is an AI-powered desktop reader for public-domain books and long-form literature. Browse Project Gutenberg via Gutendex, download .mobi files locally, and read with a focused, paginated layout. Highlights, notes, and AI chat help you study and explore the text.

[DeepWiki](https://deepwiki.com/jadentripp/ai-reader)

## Quickstart (non-technical)

1) Download the latest macOS build from the GitHub Releases page.  
2) Open the `.dmg` file and drag **AI Reader** into **Applications**.  
3) Open **Applications** and launch **AI Reader**.  
4) If macOS says it “can’t be opened,” right‑click **AI Reader** → **Open** → **Open**.  
   If you don’t see that, go to **System Settings → Privacy & Security** and click **Open Anyway**.  
5) In the app, search for a book or pick a featured collection, download it, and start reading.  
6) Optional: open **Settings** and paste your OpenAI API key to enable the AI Assistant.

## Features

### Library and discovery
- Search Project Gutenberg (via Gutendex) with curated collections and categories
- Download queue with local library management
- Cover art, author metadata, and popularity sorting

### Reading experience
- Paginated reader with single or two-column spreads
- Appearance controls for font, line height, and margins
- Table of contents generated from document headings
- Progress saved per book

### Highlights and notes
- Highlight passages and attach notes
- Browse highlights with page references

### AI assistant
- Chat about the current page or a selected highlight
- One-click summaries in modern English
- Model selection from your OpenAI account

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Routing/data | TanStack Router, TanStack Query |
| Styling | Tailwind CSS, Radix UI |
| Desktop | Tauri 2 (Rust) |
| Database | SQLite (via Tauri) |
| AI | OpenAI API |
| Package manager | Bun |

## Getting Started

### Prerequisites
- Bun (v1.0+)
- Rust toolchain (for Tauri)
- OpenAI API key (for AI features)

### Install

```bash
git clone https://github.com/jadentripp/ai-reader.git
cd ai-reader
bun install
```

### Development

```bash
# Web dev server
bun run dev

# Desktop app in dev mode
bun run tauri dev
```

### Production build

```bash
# Build web assets
bun run build

# Build the desktop app
bun run tauri build
```

## Scripts

- `bun run dev`: Vite dev server
- `bun run tauri dev`: Tauri desktop app (dev)
- `bun run build`: Type-check and build web assets
- `bun run tauri build`: Build the desktop app
- `bun run preview`: Preview production build
- `bun run db:reset`: Clear local database and downloaded books
- `bun run test`: Run Vitest

## Configuration

### OpenAI API key

Set your API key in Settings, or via environment variable:

```bash
export OPENAI_API_KEY="your-key-here"
```

### Data storage

- SQLite database lives under `tmp/` by default in development.
- Downloaded books are stored under `tmp/books`.
- To override the database path, set `SHAKESPEARE_DB_PATH` (legacy env var name).

## Project Structure

```
ai-reader/
├── src/                    # React application
│   ├── components/         # UI components
│   │   ├── reader/         # Reader-specific components
│   │   └── ui/             # Shared UI primitives
│   ├── routes/             # Route components
│   ├── lib/                # Utilities and hooks
│   └── assets/             # Static assets
├── src-tauri/              # Tauri desktop shell
│   ├── src/                # Rust source code
│   └── capabilities/       # App permissions
├── public/                 # Public static files
└── dist/                   # Build output
```

## Acknowledgments

This project is built to read and explore works from Project Gutenberg, the digital library that makes tens of thousands of free eBooks available to the public.

## License

MIT
