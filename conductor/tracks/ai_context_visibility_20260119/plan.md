# Plan: AI Context Visibility & Multi-Segment Selection

## Phase 1: Core Staging Logic & Context Tray UI [checkpoint: 7b6264b]
Implement the foundational logic for managing multiple context snippets and create the visual "Context Tray" in the chat interface.

- [x] Task: Create `src/tests/contextStaging.test.ts` to define multi-snippet management logic. 1249f05
- [x] Task: Update `useHighlights` hook to support a "staged snippets" state separate from permanent highlights. 1249f05
- [x] Task: Implement `addSnippetToContext` and `removeSnippetFromContext` actions. 1249f05
- [x] Task: Create `src/components/reader/ContextTray.tsx` component (Bauhaus style chips). 8f315cb
- [x] Task: Integrate `ContextTray` into `ChatSidebar.tsx` above the chat input. 8f315cb
- [x] Task: Conductor - User Manual Verification 'Core Staging Logic & Context Tray UI' (Protocol in workflow.md) 7b6264b

## Phase 2: Reader Visualization & Interaction
Update the reader's visual feedback to show staged snippets in "Bauhaus Blue" and integrate the selection menu.

- [ ] Task: Create `src/tests/readerContextVisualization.test.tsx` to verify blue highlight rendering.
- [ ] Task: Update `readerStyles.ts` to include the `readerContextSnippet` class with Bauhaus Blue (#0055A4).
- [ ] Task: Modify `renderHighlights` in `useHighlights.ts` to render staged snippets with the new blue style.
- [ ] Task: Update the floating selection menu in `ReaderPane.tsx` to change "Chat" to "Add to Chat" and ensure it triggers the staging logic.
- [ ] Task: Conductor - User Manual Verification 'Reader Visualization & Interaction' (Protocol in workflow.md)

## Phase 3: AI Context Integration
Ensure the staged snippets are correctly passed to the OpenAI API and maintained across conversation turns.

- [ ] Task: Update `src/tests/aiContextIntegration.test.ts` to verify prompt construction with multiple snippets.
- [ ] Task: Update `useChat.ts` to pull from the new "staged snippets" state instead of just the single `selectedHighlight`.
- [ ] Task: Modify `buildChatSystemPrompt` in `citations.ts` to handle multiple focused snippets in a clean, structured way.
- [ ] Task: Implement the "Clear Context" functionality to wipe the tray.
- [ ] Task: Conductor - User Manual Verification 'AI Context Integration' (Protocol in workflow.md)
