# Implementation Plan - AI Assistant Overhaul

## Phase 1: Database & Backend Persistence [checkpoint: 3d58feb]
- [x] **Task: Update Database Schema** be7acb0
    - [x] Add a `book_message` table for general chats or modify `highlight_message` to make `highlight_id` optional.
    - [x] Update `src-tauri/src/db.rs` with new migrations and query functions.
- [x] **Task: Expose Backend Commands** 2a265e6
    - [x] Create/Update Tauri commands for listing and adding general book messages.
    - [x] Update `src-tauri/src/lib.rs` and `src/lib/tauri.ts`.
- [ ] **Task: Conductor - User Manual Verification 'Phase 1: Persistence' (Protocol in workflow.md)**

## Phase 2: Frontend Integration & Markdown
- [x] **Task: Implement Markdown Rendering** 9197157
    - [x] Update `ChatPanel.tsx` (or `ChatSidebar.tsx`) to use the `Markdown` component for assistant messages.
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
