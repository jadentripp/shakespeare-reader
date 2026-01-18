# Implementation Plan - Interactive AI Citations

This plan outlines the steps to implement interactive AI citations that link chat responses to specific locations in the reader.

## Phase 1: Context & Protocol Definition
Define how the AI receives context and how it should format citations.

- [x] Task: Update LLM prompt to include block indices for text segments.
- [x] Task: Update system instructions to define the `<cite>` tag protocol and usage rules.
- [x] Task: Conductor - User Manual Verification 'Context & Protocol Definition' (Protocol in workflow.md)

## Phase 2: Frontend Parsing & Interaction
Enable the chat UI to recognize and handle the citation tags.

- [x] Task: Implement a custom Markdown component to parse `<cite>` tags in `ChatPanel.tsx`.
- [x] Task: Create `CitationLink` component with distinctive styling and hover effects.
- [x] Task: Implement the `onCitationClick` handler to broadcast the citation event (snippet and index).
- [x] Task: Conductor - User Manual Verification 'Frontend Parsing & Interaction' (Protocol in workflow.md)

## Phase 3: Reader Synchronization & Highlighting
Connect the citation events to the reader's view and highlighting logic.

- [x] Task: Implement a citation event listener in `ReaderPane.tsx` (or relevant reader component).
- [x] Task: Implement robust snippet matching logic using verbatim text and block index.
- [x] Task: Implement auto-scroll/navigation to bring cited snippets into view.
- [x] Task: Implement the "Active Citation" persistent highlight style in the reader.
- [x] Task: Conductor - User Manual Verification 'Reader Synchronization & Highlighting' (Protocol in workflow.md)

## Phase 4: Integration & Edge Case Handling
Refine the experience and handle complex scenarios.

- [ ] Task: Ensure highlights are cleared or updated when a new citation is clicked or the chat is reset.
- [ ] Task: Handle "not found" scenarios gracefully (e.g., if the AI hallucinated a snippet).
- [ ] Task: Verify cross-page navigation works seamlessly for cited snippets.
- [ ] Task: Conductor - User Manual Verification 'Integration & Edge Case Handling' (Protocol in workflow.md)
