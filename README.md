# Shakespeare Reader

A modern, AI-powered desktop reader for books and literary works. Built with Tauri, React, and TypeScript.

## ✨ Features

### 📖 Reading Experience
- **Paginated reading** with single or dual-column layouts
- **Customizable appearance** — fonts, line height, and margins
- **Table of contents** auto-generated from document headings
- **Progress saving** — resume where you left off

### ✏️ Highlights & Notes
- **Text highlighting** — select passages to save
- **Personal notes** — annotate your highlights
- **Organized sidebar** — browse all highlights with page references

### 🤖 AI Assistant
- **Context-aware chat** — ask questions about the current page or selected highlight
- **Multiple models** — choose from available OpenAI models
- **Summarization** — get modern English summaries of passages

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, Radix UI |
| Desktop | Tauri 2.0 (Rust) |
| Database | SQLite (via Tauri) |
| AI | OpenAI API |
| Package Manager | Bun |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [Rust](https://rustup.rs/) (for Tauri)
- OpenAI API key (for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/jadentripp/shakespeare-reader.git
cd shakespeare-reader

# Install dependencies
bun install
```

### Development

```bash
# Start web development server
bun run dev

# Start desktop app in development mode
bun run tauri dev
```

### Production Build

```bash
# Build web assets
bun run build

# Build desktop app
bun run tauri build
```

## Project Structure

```
shakespeare-reader/
├── src/                    # React application
│   ├── components/         # UI components
│   │   ├── reader/         # Reader-specific components
│   │   └── ui/             # Shared UI primitives
│   ├── routes/             # Page components
│   ├── lib/                # Utilities and hooks
│   └── assets/             # Static assets
├── src-tauri/              # Tauri desktop shell
│   ├── src/                # Rust source code
│   └── capabilities/       # App permissions
├── public/                 # Public static files
└── dist/                   # Build output
```

## Configuration

### OpenAI API Key

Set your API key in the app's Settings page, or via environment variable:

```bash
export OPENAI_API_KEY="your-key-here"
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

For UI changes, please include screenshots.

## Acknowledgments

This project is built to read and explore works from [Project Gutenberg](https://www.gutenberg.org/), the pioneering digital library that has made over 70,000 free eBooks available to the public. Their decades-long mission to digitize and preserve literary works makes projects like this possible.

## License

MIT
