# Implementation Plan - 3D Library Feature Parity

This plan outlines the steps to bring the 3D Library ("The Reading Room") to feature parity with the 2D Library, including searching, browsing collections, and managing downloads.

## Phase 1: Foundations & Shared Logic
- [x] Task: Refactor `useLibrary` hook for better 3D compatibility 46194a2
    - [x] Extract core catalog/library logic into reusable utilities if necessary to ensure 3D page can access the same state.
- [x] Task: Implement "The Reading Desk" Geometry bf529f1
    - [x] Create a `ReadingDesk` component in `src/components/three/`.
    - [x] Add the desk to `ThreeDLibraryPage`.
    - [x] Position recently read books on the desk surface.
- [ ] Task: Conductor - User Manual Verification 'Foundations' (Protocol in workflow.md)

## Phase 2: Search & Collections UI
- [ ] Task: Create 3D Floating Search Interface
    - [ ] Implement a `SearchOverlay` component (HTML/CSS via `Html` from `@react-three/drei` or a floating 2D overlay).
    - [ ] Connect the search input to the `handleSearch` logic from the library hook.
- [ ] Task: Implement Category Selection Menu
    - [ ] Create a 3D menu/ribbon for switching collections (Popular, Adventure, etc.).
    - [ ] Update the shelf contents when a new category is selected.
- [ ] Task: Conductor - User Manual Verification 'Search & Collections' (Protocol in workflow.md)

## Phase 3: Book Interaction & State Indicators
- [ ] Task: Enhanced `BookMesh` with Status Indicators
    - [ ] Add visual markers (ribbons, icons, or color tints) for 'Downloaded', 'Available', and 'Progress'.
    - [ ] Implement a "Progress Ribbon" on the spine for books in progress.
- [ ] Task: Interactive "Pull-out" Animation
    - [ ] Implement logic to move a clicked book forward and show a focused UI.
    - [ ] Add buttons for 'Read', 'Download', and 'Delete' to the focused UI.
- [ ] Task: Conductor - User Manual Verification 'Interactions' (Protocol in workflow.md)

## Phase 4: Download Workflow & Animations
- [ ] Task: 3D Download Logic Integration
    - [ ] Connect the 'Download' button in 3D to the existing download queue.
    - [ ] Implement the "Materialization" animation (e.g., opacity fade or shader effect) while a book is downloading.
- [ ] Task: Final Polish & Refinement
    - [ ] Ensure lighting and shadows are updated correctly when books move/appear.
    - [ ] Smooth camera transitions between the desk and the bookcase.
- [ ] Task: Conductor - User Manual Verification 'Final Polish' (Protocol in workflow.md)
