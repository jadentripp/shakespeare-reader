# Specification: Migration to OpenAI Node/JS SDK (Responses API)

## Overview
This track involves migrating the AI logic from the Rust backend (Tauri) to the React frontend. The primary goal is to utilize the official OpenAI Node.js SDK (which supports the new Responses API) directly in the frontend, simplifying the architecture and improving maintainability.

## Goals
- Transition all AI-related logic (chat, model listing, key status) from Rust to TypeScript/React.
- Implement the OpenAI Responses API using the `openai` npm package.
- Maintain feature parity with the existing Rust implementation, including API key resolution from both internal settings (SQLite) and environment variables.
- Clean up the codebase by removing obsolete Rust AI code and Tauri commands.

## Functional Requirements
- **SDK Integration:** Install and integrate the `openai` JS SDK in the frontend.
- **Frontend AI Service:** Create a TypeScript service/hook to handle AI interactions.
- **API Key Resolution:**
  - Retrieve the API key from the local SQLite database via existing Tauri settings commands.
  - Fallback to `import.meta.env.OPENAI_API_KEY` or similar for development.
- **Feature Parity:**
  - `chat`: Implement chat functionality using the Responses API.
  - `list_models`: Implement model filtering logic (GPT-4+, recent models).
  - `key_status`: Provide status on whether an API key is configured.
- **Code Cleanup:** Remove `src-tauri/src/openai.rs` and unregister associated commands in `lib.rs` and `main.rs`.

## Non-Functional Requirements
- **Maintainability:** Use TypeScript for all new frontend logic.
- **Performance:** Ensure no regressions in chat response time or UI responsiveness.
- **Research-Driven:** Every task in the plan must utilize `deepwiki` to research the correct and most modern implementation patterns for the OpenAI JS SDK and Responses API.

## Acceptance Criteria
- [ ] OpenAI JS SDK is successfully integrated.
- [ ] Chat functionality works exactly as before (including reasoning traces and citations).
- [ ] Model list is populated correctly in the UI.
- [ ] API key can be set in Settings and is respected by the frontend.
- [ ] Environment variable fallback for the API key works in development.
- [ ] All Rust AI code and commands are deleted.
- [ ] Automated tests for the new JS service pass.

## Out of Scope
- Adding new AI features beyond existing parity.
- Changing the UI/UX of the chat or settings (unless required by the migration).
