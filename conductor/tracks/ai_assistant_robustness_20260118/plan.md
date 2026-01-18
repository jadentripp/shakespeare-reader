# Implementation Plan - AI Assistant Robustness & UX Overhaul

## Phase 1: Database & Backend Foundation
Update the data layer to support reasoning traces, robust citations, and persistent thread positions.

- [x] Task: Update `book_message` schema to include `reasoning_summary` and `context_map` JSON columns
- [x] Task: Update `book_chat_thread` schema to include `last_cfi` for persistent thread positions
- [x] Task: Refactor `openai.rs` to use the `/v1/responses` endpoint and the new response object shape
- [x] Task: Implement `get_thread_max_citation_index` helper in `db.rs` to support cumulative indexing
- [x] Task: Add unit tests in `db.rs` for new schema fields and citation indexing logic
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend Foundation' (Protocol in workflow.md)

## Phase 2: Optimistic UI & Responses API Integration
Implement the frontend changes to handle the new API and provide immediate user feedback.

- [ ] Task: Update `src/lib/tauri.ts` wrappers to handle reasoning summaries and full citation metadata
- [ ] Task: Implement optimistic state updates in `MobiBookPage.tsx` (immediate message rendering)
- [ ] Task: Add "Thinking..." ghost bubble state to `ChatSidebar.tsx` during `chatSending`
- [ ] Task: Integrate the new `reasoning_summary` into the message processing loop
- [ ] Task: Conductor - User Manual Verification 'Phase 2: UI Responsiveness' (Protocol in workflow.md)

## Phase 3: Robust Citations & Reasoning UI
Enhance the citations with position data and add the expandable reasoning section.

- [ ] Task: Update citation extraction logic to store `cfi` and `page_number` in the database `context_map`
- [ ] Task: Implement cumulative indexing logic ( Turn N starts at Index Turn N-1 + 1)
- [ ] Task: Add expandable "AI Reasoning" section component to `ChatSidebar.tsx`
- [ ] Task: Update `handleCitationClick` to use the stored `cfi` for jumping, regardless of current page
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Citations & Reasoning' (Protocol in workflow.md)

## Phase 4: Thread Navigation & Polish
Finalize the thread navigation and ensure metadata separation is clean.

- [ ] Task: Implement "Auto-Jump" logic: selecting a thread scrolls the reader to its `last_cfi`
- [ ] Task: Update thread list UI to show both `title` and `created_at` timestamp separately
- [ ] Task: Final verification of citation persistence across page reflows
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Navigation & History' (Protocol in workflow.md)
