# Track Plan: Reader UI Overhaul

## Phase 1: Immersive Layout & Styling [checkpoint: f9fd1fd]
This phase focuses on the core reading environment, implementing the dual-column layout and the paper-like aesthetic.

- [x] Task: Create a new `ReaderLayout` component to handle single vs dual column logic. 49c07dc
- [x] Task: Update `MobiBookPage.tsx` to use the `ReaderLayout`. 49c07dc
- [x] Task: Define and apply global CSS variables for paper textures and refined line heights. 49c07dc
- [x] Task: Conductor - User Manual Verification 'Phase 1: Immersive Layout & Styling' (Protocol in workflow.md) 8561ea4

## Phase 2: Appearance Customization Panel [checkpoint: 6b3eb34]
- [x] Task: Create an `AppearancePanel` component with font selection and margin/line-height sliders. 7b8bc6d
- [x] Task: Implement state management for reader appearance settings (persisted in local storage). c5b07ff
- [x] Task: Update the reader iframe to reactively apply style changes from the panel. 79b1a1a
- [x] Task: Conductor - User Manual Verification 'Phase 2: Appearance Customization Panel' (Protocol in workflow.md) 6b3eb34

## Phase 3: Hierarchical Table of Contents
Redesigning the sidebar into a structured, position-aware Act/Scene navigator.

- [~] Task: Refactor `parseSceneLinks` to extract a nested Act > Scene hierarchy.
- [ ] Task: Redesign the sidebar UI to display the new hierarchy with refined sans-serif styles.
- [ ] Task: Implement "active" item tracking based on the current page/cfi.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Hierarchical Table of Contents' (Protocol in workflow.md)
