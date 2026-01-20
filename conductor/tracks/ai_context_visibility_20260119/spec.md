# Specification: AI Context Visibility & Multi-Segment Selection

## Overview
Improve the AI interaction UX by allowing users to visually "stage" multiple text segments into the AI context before and during a conversation. This track introduces a "Context Tray" and a distinctive visual state for staged snippets.

## Functional Requirements
- **Staging Area (Context Tray):** A new UI component above the chat input that displays "chips" for each text segment currently in the AI's context.
- **Multi-Selection:** Users can select multiple disparate segments of text and add them sequentially to the chat context using an "Add to Chat" button in the selection menu.
- **Context Management:** 
    - Users can remove individual snippets from the Context Tray by clicking an 'X' on their respective chips.
    - A "Clear Context" button to wipe the tray.
- **Visual Feedback (Reader):**
    - Staged snippets that are not yet permanent highlights should be rendered in the reader with a distinctive "Bauhaus Blue" (`#0055A4`) background to distinguish them from permanent red highlights.
- **Persistence:** Staged segments remain in the tray after a message is sent to support multi-turn conversations about those specific passages.

## Non-Functional Requirements
- **Visual Consistency:** Use Bauhaus Blue (#0055A4) for context-specific accents, maintaining the primary Red/Yellow/Blue Bauhaus palette.
- **Performance:** Adding/removing context should be instantaneous without requiring full-page re-renders.

## Acceptance Criteria
- [ ] Selecting text and clicking "Add to Chat" creates a chip in the Context Tray.
- [ ] Multiple chips can exist simultaneously.
- [ ] Staged text is highlighted in blue in the reader.
- [ ] Removing a chip removes the blue highlight from the reader.
- [ ] Sending a message does not clear the tray.
- [ ] Clicking 'X' on a chip removes it from the context.

## Out of Scope
- Creating permanent highlights from staged snippets (this is handled by the existing "Highlight" button).
- Sharing context across different books.
