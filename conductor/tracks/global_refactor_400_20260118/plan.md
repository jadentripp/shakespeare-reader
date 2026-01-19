# Implementation Plan - Global 400-Line Limit Refactor

This plan outlines the steps to refactor the codebase to ensure no source file exceeds 400 lines, focusing on modularity and domain-driven structure.

## Phase 1: Tauri Bridge Decomposition [checkpoint: 6a4c99c]
Transition `src/lib/tauri.ts` into a modular directory structure.

- [x] Task: Create `src/lib/tauri/` directory. (d211ea0)
- [x] Task: Extract Gutenberg-related functions. (d211ea0)
    - [x] Create `src/lib/tauri/gutenberg.ts`.
    - [x] Migrate `gutendexCatalogPage` and `downloadGutenbergMobi`.
- [x] Task: Extract Book-related functions. (d211ea0)
    - [x] Create `src/lib/tauri/books.ts`.
    - [x] Migrate `listBooks` and `hardDeleteBook`.
- [x] Task: Refactor `src/lib/tauri.ts` as an export hub. (d211ea0)
    - [x] Re-export all functions from the new sub-modules.
- [x] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md) (6a4c99c)

## Phase 2: MobiBookPage Refactor
Decompose the primary reader route.

- [x] Task: Create `src/lib/reader/hooks/useMobiReader.ts` and migrate logic. (268c068)
    - [x] Write tests for `useMobiReader`.
    - [x] Migrate state, refs, and TanStack Query hooks.
- [x] Task: Extract UI components to `src/components/reader/`. (268c068)
    - [x] Implement `ReaderToolbar.tsx`.
    - [x] Implement `ReaderContent.tsx`.
- [x] Task: Update `MobiBookPage.tsx` to use new hook and components. (268c068)
- [~] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: ChatSidebar Refactor
Decompose the AI assistant sidebar.

- [ ] Task: Create `src/lib/reader/hooks/useChatSidebar.ts`.
    - [ ] Write tests for `useChatSidebar`.
    - [ ] Migrate sidebar-specific state and logic.
- [ ] Task: Extract UI components to `src/components/reader/`.
    - [ ] Implement `ChatMessageList.tsx`.
    - [ ] Implement `ChatInputArea.tsx`.
- [ ] Task: Update `ChatSidebar.tsx` to use new hook and components.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Utilities & Cleanup
Address remaining offenders and ensure project-wide compliance.

- [ ] Task: Refactor `src/components/ui/loader.tsx`.
    - [ ] Split into smaller component modules if necessary.
- [ ] Task: Refactor `src/hooks/useLibrary.ts`.
    - [ ] Split into sub-hooks or smaller logic units.
- [ ] Task: Final Line Count Verification.
    - [ ] Run a project-wide script to confirm all files in `src/` are < 400 lines.
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
