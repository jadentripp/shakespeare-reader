# Implementation Plan - AI Assistant Overhaul

## Phase 1: Database & Backend Persistence
- [ ] **Task: Update Database Schema**
    - [ ] Add a `book_message` table for general chats or modify `highlight_message` to make `highlight_id` optional.
    - [ ] Update `src-tauri/src/db.rs` with new migrations and query functions.
- [ ] **Task: Expose Backend Commands**
    - [ ] Create/Update Tauri commands for listing and adding general book messages.
    - [ ] Update `src-tauri/src/lib.rs` and `src/lib/tauri.ts`.
- [ ] **Task: Conductor - User Manual Verification 'Phase 1: Persistence' (Protocol in workflow.md)**

## Phase 2: Frontend Integration & Markdown
- [ ] **Task: Implement Markdown Rendering**
    - [ ] Update `ChatPanel.tsx` (or `ChatSidebar.tsx`) to use the `Markdown` component for assistant messages.
- [ ] **Task: Connect General Chat to Database**
    - [ ] Refactor `MobiBookPage.tsx` to use TanStack Query for general messages instead of local state.
- [ ] **Task: Add "New Chat" Functionality**
    - [ ] Implement a way to clear the current general chat history for a book.
- [ ] **Task: Conductor - User Manual Verification 'Phase 2: UI & Integration' (Protocol in workflow.md)**

## Phase 3: UX Polish
- [ ] **Task: Improve Context Indicators**
    - [ ] Add visual cues when switching between page chat and highlight chat.
    - [ ] Ensure "Ask about the meaning..." placeholder is dynamic based on context.
- [ ] **Task: Final Verification**
    - [ ] Verify that chats survive app restarts.
    - [ ] Verify that Markdown (tables, bold, etc.) renders correctly.
- [ ] **Task: Conductor - User Manual Verification 'Phase 3: UX Polish' (Protocol in workflow.md)**
