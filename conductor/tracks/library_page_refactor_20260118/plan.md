# Implementation Plan - LibraryPage Refactor

This plan outlines the steps to refactor `src/routes/LibraryPage.tsx` into a more maintainable structure by extracting components and logic.

## Phase 1: Preparation & Hook Extraction
Focus on moving the "brains" of the Library page into a dedicated hook.

- [x] Task: Create `src/hooks/useLibrary.ts` and migrate state/logic.
    - [x] Identify all `useState`, `useMemo`, and TanStack Query hooks in `LibraryPage.tsx`.
    - [x] Extract them into a comprehensive `useLibrary` hook.
    - [x] Export a clean interface of state and handlers.
- [x] Task: Update `LibraryPage.tsx` to use the new `useLibrary` hook.
    - [x] Verify that functionality remains identical with the centralized logic.
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Component Extraction
Decompose the 1,600+ line UI into feature-based components.

- [x] Task: Create `src/components/library/` directory.
- [x] Task: Extract Search & Filter components.
    - [x] Implement `LibraryHeader.tsx` and `LibraryCollections.tsx`.
- [x] Task: Extract Download Status component.
    - [x] Implement `DownloadStatusBar.tsx`.
- [x] Task: Extract Book Display components.
    - [x] Implement `LibraryGrid.tsx` and `BookCard.tsx`.
- [x] Task: Extract Empty State & Loading components.
    - [x] Implement `LibrarySkeleton.tsx` and `LibraryEmptyState.tsx`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Final Integration & Cleanup
Reassemble the page and ensure it meets the line count target.

- [x] Task: Refactor `LibraryPage.tsx` to use all extracted components.
    - [x] Replace inline JSX with new components.
    - [x] Ensure proper prop passing or hook usage.
- [x] Task: Verify line count and code quality.
    - [x] Confirm `LibraryPage.tsx` is < 600 lines.
    - [x] Run linting and type checks.
- [x] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
