# Specification - Improved AI Chat CRUD Reliability

## Overview
Enhance the reliability and completeness of AI chat management by implementing full CRUD (Create, Read, Update, Delete) operations for chat threads and individual messages. This includes fixing orphaned data issues, providing a way to clear the default chat, and improving the UI for managing chat history.

## Functional Requirements

### 1. Database & Backend (Rust/SQLite)
- **Cascade Deletion:** Ensure `book_message` entries are deleted when their parent `book_chat_thread` is deleted (via foreign key or manual cleanup).
- **Update Thread Title:** Add a command to rename an existing `book_chat_thread`.
- **Delete Individual Message:** Add a command to delete a specific `book_message` by its ID.
- **Clear Default Chat:** Add a command to delete all `book_message` entries for a specific `book_id` where `thread_id` is NULL.

### 2. Frontend (React)
- **Thread Management:**
    - Provide a "Rename" option in the thread history list.
    - Implement a "Clear Chat" button for the default chat (no thread selected).
    - Ensure "New Chat" creates a thread with a timestamp-based title (e.g., "Chat Jan 17, 14:30") and immediately switches to it.
- **Message Management:**
    - Add a "Delete" icon (trash can) that appears on hover for each message bubble.
    - Confirm deletion of messages if they are from the assistant (to avoid accidental loss of long responses).
- **Reliability & State:**
    - Correctly invalidate TanStack Query keys after any CRUD operation to ensure the UI stays in sync.
    - Handle "Empty State" gracefully after deleting the last message in a thread or clearing the default chat.

## Non-Functional Requirements
- **Data Integrity:** No "orphaned" messages should remain in the database after a thread is deleted.
- **Performance:** UI should respond immediately to CRUD actions (optimistic updates where appropriate, or fast refetching).

## Acceptance Criteria
- [ ] Deleting a thread removes all associated messages from the `book_message` table.
- [ ] Users can rename a thread, and the new name persists after a refresh.
- [ ] Users can delete individual messages from both threads and the default chat.
- [ ] "Clear Chat" effectively resets the default chat to its empty state.
- [ ] Starting a "New Chat" creates a new entry in the history and sets it as the active thread.

## Out of Scope
- AI-generated thread titles (titles remain timestamp-based or user-defined).
- Branching chat threads.
- Search within chat history.
