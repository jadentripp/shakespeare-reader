# Implementation Plan - AI Assistant Overhaul

## Phase 1: Database & Backend Persistence [checkpoint: 3d58feb]
- [x] **Task: Update Database Schema** be7acb0
    - [x] Add a `book_message` table for general chats or modify `highlight_message` to make `highlight_id` optional.
    - [x] Update `src-tauri/src/db.rs` with new migrations and query functions.
- [x] **Task: Expose Backend Commands** 2a265e6
    - [x] Create/Update Tauri commands for listing and adding general book messages.
    - [x] Update `src-tauri/src/lib.rs` and `src/lib/tauri.ts`.
- [ ] **Task: Conductor - User Manual Verification 'Phase 1: Persistence' (Protocol in workflow.md)**

## Phase 2: Frontend Integration & Markdown [checkpoint: 103ebe8]
- [x] **Task: Implement Markdown Rendering** b5c96de
- [x] **Task: Connect General Chat to Database** b5c96de
- [x] **Task: Add "New Chat" Functionality** b5c96de
- [ ] **Task: Conductor - User Manual Verification 'Phase 2: UI & Integration' (Protocol in workflow.md)**

## Phase 3: UX Polish [checkpoint: 103ebe8]
- [x] **Task: Improve Context Indicators** dbe4903
- [x] **Task: Final Verification** 103ebe8

## Phase 4: Cursor-Style Unified Context
- [x] **Task: Implement Multi-Context State** bedbf778
- [x] **Task: Context Pills UI** dbe4903
- [x] **Task: Multi-Context System Prompt & Citations** 3a9c7b2
- [x] **Task: Interactive Citations UI** afec522
- [x] **Task: "Add to Chat" Integration** 4b9e2c1
