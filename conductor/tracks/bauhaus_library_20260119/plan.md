# Implementation Plan - Bauhaus-Inspired 2D Library Redesign

## Phase 1: Minimalist Book Card Component [checkpoint: ff0c9c8]
- [x] Task: Create `BookCardMinimal.tsx` with sharp edges and hover-only actions [2c1c6a3]
    - [x] Create new component file `src/components/library/BookCardMinimal.tsx`
    - [x] Implement prop interface matching `BookCardProps`
    - [x] Add strict geometric styling (no border-radius)
    - [x] Implement hover overlay for "Read" and "Delete" actions
    - [x] Add unit tests in `src/tests/BookCardMinimal.test.tsx`
- [x] Task: Integrate `BookCardMinimal` into `LibraryGrid` [b86eef6]
    - [x] Update `LibraryGrid` to support the new card variant
    - [x] Update tests to verify grid rendering with new cards
- [x] Task: Conductor - User Manual Verification 'Minimalist Book Card Component' (Protocol in workflow.md) [ff0c9c8]

## Phase 2: Top-Down Navigation & Header
- [x] Task: Create `BauhausHeader.tsx` [42f3591]
    - [x] Create `src/components/library/BauhausHeader.tsx`
    - [x] Implement massive typographic header ("LIBRARY")
    - [x] Add horizontal filter bar for "Collections"
    - [x] Integrate search input as a bold, underlined field
    - [x] Add unit tests for header interactions and rendering
- [~] Task: Refactor `LibraryPage` layout
    - [ ] Remove `LibraryCollections` sidebar
    - [ ] Replace `LibraryHeader` with `BauhausHeader`
    - [ ] Ensure full-width layout for the main content area
    - [ ] Update integration tests for `LibraryPage`
- [ ] Task: Conductor - User Manual Verification 'Top-Down Navigation & Header' (Protocol in workflow.md)

## Phase 3: Global Bauhaus Styling & Polish
- [ ] Task: Update Global Colors & Typography
    - [ ] Define Bauhaus accent color (e.g., #E02E2E) in Tailwind config (or CSS variables)
    - [ ] Enforce geometric sans-serif for UI elements in the library view
    - [ ] Update `LibraryGrid` spacing to be uniform and generous
- [ ] Task: Final Polish & cleanup
    - [ ] Remove unused sidebar components if no longer needed
    - [ ] Ensure responsive behavior (grid adapts, header scales)
    - [ ] Verify accessibility (contrast, focus states)
- [ ] Task: Conductor - User Manual Verification 'Global Bauhaus Styling & Polish' (Protocol in workflow.md)
