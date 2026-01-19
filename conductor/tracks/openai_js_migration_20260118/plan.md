# Implementation Plan: Migration to OpenAI Node/JS SDK (Responses API)

This plan outlines the migration of AI logic from the Rust backend to the React frontend using the `openai` JS SDK.

## Phase 1: Foundation & Research [checkpoint: 3442538]
- [x] Task: Research OpenAI JS SDK Responses API implementation via `deepwiki`. aabea8e
    - [ ] Use `deepwiki` to find the exact syntax for the Responses API in `openai-node`.
    - [ ] Research best practices for handling OpenAI API keys in a Tauri/React frontend.
- [x] Task: Install `openai` npm package and configure environment variables. 86be48d
    - [ ] Run `bun add openai`.
    - [ ] Ensure `VITE_OPENAI_API_KEY` or similar is supported in `.env`.
- [x] Task: Conductor - User Manual Verification 'Foundation & Research' (Protocol in workflow.md) 3442538

## Phase 2: AI Service Implementation
- [ ] Task: Create `src/lib/openai.ts` service.
    - [ ] Research with `deepwiki` the most idiomatic way to structure a shared AI service in React/TypeScript.
    - [ ] Implement `resolveApiKey` to check Tauri settings first, then environment variables.
    - [ ] Implement `listModels` with the same filtering logic as the Rust version.
    - [ ] Implement `chat` using the Responses API, ensuring support for reasoning and message parts.
- [ ] Task: Write unit tests for `src/lib/openai.ts`.
    - [ ] Mock the OpenAI SDK and Tauri commands.
    - [ ] Verify API key resolution priority.
    - [ ] Verify model filtering and chat response parsing.
- [ ] Task: Conductor - User Manual Verification 'AI Service Implementation' (Protocol in workflow.md)

## Phase 3: Integration & UI Update
- [ ] Task: Update Chat components to use the new JS service.
    - [ ] Research with `deepwiki` the best pattern for replacing Tauri `invoke` calls with local JS service calls in React components.
    - [ ] Update `useChat` hook (or equivalent) to call the new JS `chat` and `listModels` functions.
    - [ ] Ensure `ChatModelSelector.tsx` and `ChatPanel.tsx` function correctly with the new logic.
- [ ] Task: Verify end-to-end functionality.
    - [ ] Test chat with a valid API key from settings.
    - [ ] Test chat with an environment variable.
    - [ ] Verify reasoning traces still appear correctly.
- [ ] Task: Conductor - User Manual Verification 'Integration & UI Update' (Protocol in workflow.md)

## Phase 4: Backend Cleanup
- [ ] Task: Remove Rust AI code.
    - [ ] Research with `deepwiki` the safest way to remove Tauri commands without breaking the build.
    - [ ] Delete `src-tauri/src/openai.rs`.
    - [ ] Remove `openai` module and command registrations from `src-tauri/src/lib.rs` and `src-tauri/src/main.rs`.
    - [ ] Remove `reqwest` if no longer used for other features.
- [ ] Task: Final verification and build.
    - [ ] Ensure the app builds successfully (`npm run build`).
    - [ ] Run all frontend tests.
- [ ] Task: Conductor - User Manual Verification 'Backend Cleanup' (Protocol in workflow.md)
