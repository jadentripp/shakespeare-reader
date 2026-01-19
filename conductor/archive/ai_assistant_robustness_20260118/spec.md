# Specification - AI Assistant Robustness & UX Overhaul

## Overview
Improve the AI Assistant's reliability and user experience by fixing citation bugs, enhancing the UI with optimistic updates and reasoning traces (GPT-5), and ensuring thread navigation is context-aware.

## Functional Requirements

### 1. Database & Backend (Rust/SQLite)
- **Responses API Migration:** Update `openai.rs` to use the OpenAI `/v1/responses` endpoint instead of `/v1/chat/completions`.
- **Reasoning Traces:** 
    - Capture reasoning summaries from the model (`reasoning: { "summary": "auto" }`).
    - Store `reasoning_summary` in the `book_message` table.
- **Robust Citations:**
    - Persist the full `context_map` (JSON) for every assistant message in the database.
    - Each source in the map must include the verbatim `text`, `block_index`, `cfi`, and `page_number`.
- **Thread Metadata:**
    - Ensure `book_chat_thread` uses `created_at` for chronological ordering.
    - Rename operations should only affect the `title` field, never the `created_at` timestamp.

### 2. Frontend (React)
- **Optimistic UI:**
    - Immediately render the user's message in the chat list with a "sending" state.
    - Show a "Thinking..." ghost bubble immediately.
- **Reasoning UI:**
    - Add an expandable "AI Reasoning" section above the assistant's message bubble that displays the reasoning summary.
- **Cumulative Citations:**
    - Indices must be unique and cumulative across the entire thread history (e.g., if Turn 1 ends at citation [3], Turn 2 starts at [4]).
    - Citation bubbles in the chat should display "[Index] Page X".
- **Context-Aware Navigation:**
    - Clicking a citation must scroll the reader to the stored `cfi` position.
    - Selecting a thread from the history list must automatically jump the reader to the last `cfi` position associated with that thread.

## Non-Functional Requirements
- **Data Integrity:** Citation numbers must remain identical when viewing historical threads.
- **Performance:** UI must feel instantaneous (Optimistic updates).

## Acceptance Criteria
- [ ] AI responses show an expandable reasoning trace.
- [ ] User messages appear immediately upon clicking send.
- [ ] Citations increment correctly across multiple turns in a thread.
- [ ] Clicking a citation in an old chat jumps the reader to the correct page/position.
- [ ] Renaming a thread does not remove the date/time from the history list view.
- [ ] Selecting an old thread from history scrolls the book to where the user last was in that conversation.
