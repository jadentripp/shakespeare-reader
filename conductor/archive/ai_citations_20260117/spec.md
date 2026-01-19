# Specification: Interactive AI Citations

## Overview
This track introduces "Interactive AI Citations" to the AI Reader. When the AI assistant provides summaries or analysis, it will wrap cited snippets from the book in custom tags. These citations will be interactive in the chat panel; clicking a citation will automatically scroll the reader to the referenced text and apply a persistent highlight, allowing users to verify the AI's insights against the original source text.

## Functional Requirements
- **AI Tagging Protocol:** The system will instruct the LLM to wrap cited text in `<cite snippet="..." index="...">text</cite>` tags.
- **Robust Snippet Matching:** The frontend will use the `snippet` (verbatim text) and `index` (paragraph/block ID provided in context) to uniquely identify the location in the reader.
- **Interactive Chat UI:**
    - Parse `<cite>` tags in the chat response into clickable components.
    - Style citations with a distinctive color and a hover state to indicate interactivity.
- **Reader Synchronization:**
    - On citation click: Scroll the target snippet into view.
    - Apply a persistent "Active Citation" highlight to the snippet.
    - Handle cross-page navigation if the cited snippet is on a different page/section of the currently loaded book.
- **Context Enhancement:** Update the prompt construction logic to include paragraph or block indices so the AI can reference them in its citations.

## Non-Functional Requirements
- **Reliability:** Snippet matching must handle minor character variations (e.g., whitespace, curly vs. straight quotes).
- **Performance:** Highlighting and scrolling should feel instantaneous and smooth.
- **Accessibility:** Interactive citations must be keyboard-accessible and provide appropriate aria-labels.

## Acceptance Criteria
- [ ] AI assistant includes `<cite>` tags in its responses when summarizing or referencing text.
- [ ] Citations in the chat are clickable and visually distinct.
- [ ] Clicking a citation scrolls the reader to the correct passage.
- [ ] The referenced passage is highlighted with a persistent "active" style.
- [ ] Clicking a citation for text on a different page successfully navigates to that page.

## Out of Scope
- Multi-book citations (citations are limited to the currently open book).
- User-created citations (this feature is for AI-generated references only).
- Citation export functionality (saving citations as separate notes).
