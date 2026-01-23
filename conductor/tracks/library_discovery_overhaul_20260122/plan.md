# Implementation Plan: Library Discovery Overhaul

## Phase 1: Backend & Data Definition (COMPLETED)
- [x] Task: Update Backend Search Queries in `src-tauri/src/gutendex.rs` 7364bb1
- [x] Task: Update Frontend Collection Definitions in `src/lib/gutenberg.ts` adca6e0
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Backend & Data Definition'

## Phase 2: View Separation & State Management
Introduce the view toggle and logic to separate the local library from the discovery catalog.

- [x] Task: Update `useCatalogSearch.ts` with View State
- [x] Task: Refactor `LibraryPage.tsx` Layout
- [x] Task: Update `BauhausHeader.tsx` for View Switching
- [ ] Task: Conductor - User Manual Verification 'Phase 2: UI Integration & Refinement' (Protocol in workflow.md)

## Phase 3: Collection Refinement & Polish
- [x] Task: Finalize Discover UI adca6e0
    - Remove "Search All" and add the new collections (Gothic, Philosophy).
- [x] Task: Update Tests 53b6016
    - Update and add tests to verify the view switching logic and proper component isolation.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Final Integration' (Protocol in workflow.md)