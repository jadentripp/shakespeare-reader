# Specification: Enhanced AI Assistant with Persistent Contextual Chat

## Goal
Transform the AI assistant into a persistent, context-aware companion that supports threaded conversations about specific highlights and the general page content, with full Markdown support.

## Requirements
- **Persistent General Chat:** Store "page-level" chat messages in the database, associated with the book but not a specific highlight.
- **Markdown Rendering:** Replace plain text rendering in the chat UI with the existing `Markdown` component.
- **New Chat Session:** Add a button to reset the current general chat session (archiving or clearing history).
- **Highlight Integration:** Ensure that saving a highlight seamlessly transitions the chat context to that highlight.
- **Context Clarity:** Clearly indicate in the UI what the AI is currently "looking at" (e.g., "Chatting about Highlight #12" vs "Chatting about Page 45").

## Technical Considerations
- **Database Schema:** May need a new table `book_message` or an optional `highlight_id` in the existing messages table to support general book chat.
- **Markdown Component:** Leverage `src/components/ui/markdown.tsx`.
- **State Management:** Update `MobiBookPage.tsx` to fetch and display general messages from the database.
