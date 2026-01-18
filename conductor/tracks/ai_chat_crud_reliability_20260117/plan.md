# Plan - Improved AI Chat CRUD Reliability

## Phase 1: Backend & Database Enhancements [checkpoint: 88c7e0c]
Implement the necessary Rust commands and database logic to support full CRUD for threads and messages.

- [x] Task: Update SQLite schema to ensure foreign key cascade for `book_message` (or implement manual cleanup) (1e249fc)
- [x] Task: Implement `rename_book_chat_thread` command in `db.rs` and expose in `lib.rs` (dc8fd8e)
- [x] Task: Implement `delete_book_message` command in `db.rs` and expose in `lib.rs` (93a55e2)
- [x] Task: Implement `clear_default_book_messages` command in `db.rs` to remove messages with `thread_id IS NULL` (e7902d2)
- [x] Task: Add unit tests in `db.rs` for new CRUD operations (5b43f7d)
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend' (Protocol in workflow.md)

## Phase 2: Frontend API & Thread UI
Update the React frontend to use the new commands and enhance the thread management UI.

- [x] Task: Add new Tauri command wrappers to `src/lib/tauri.ts` (805d958)
- [ ] Task: Implement "Rename Thread" UI in `ChatSidebar.tsx` (inline edit or dialog)
- [ ] Task: Add "Clear Chat" button to `ChatSidebar.tsx` for the default chat state
- [ ] Task: Refactor "New Chat" logic in `MobiBookPage.tsx` to ensure immediate selection and cache invalidation
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Thread UI' (Protocol in workflow.md)

## Phase 3: Message Management & Polish
Implement individual message deletion and refine the overall chat experience.

- [ ] Task: Add hover-to-show "Delete" button to message bubbles in `ChatSidebar.tsx`
- [ ] Task: Implement message deletion logic with TanStack Query cache invalidation
- [ ] Task: Add confirmation dialog for deleting assistant messages
- [ ] Task: Final verification of empty states and navigation transitions
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Message Management' (Protocol in workflow.md)
