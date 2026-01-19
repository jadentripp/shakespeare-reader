# Implementation Plan: Library Interface Overhaul (2D/3D)

This plan outlines the steps to harmonize the 2D library design and transform the 3D bookshelf into a premium "Reading Room" environment.

## Phase 1: 2D Library Harmonization
Focus on creating a unified design language for both local library and catalog search results.

- [x] Task: Redesign `BookCard.tsx` for a unified 2D experience. 33c0b33
    - [x] Consult `deepwiki` for premium UI layout patterns and aspect ratio management.
    - [x] Write Tests: Ensure local and catalog cards render with consistent base dimensions.
    - [x] Implement: Create a shared base card component; unify shadows, typography, and image handling.
- [x] Task: Implement integrated progress bars and refined badges. 33c0b33
    - [x] Write Tests: Verify progress bar width/visibility based on reading state.
    - [x] Implement: Embed progress indicators directly into the card UI; restyle Lucide badges.
- [ ] Task: Refactor `LibraryGrid.tsx` and page sections for reduced noise.
    - [ ] Write Tests: Ensure responsive breakpoints handle unified cards correctly.
    - [ ] Implement: Update grid layouts and section headers in `YourLibrary.tsx` and `CatalogResults.tsx`.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: 2D Library Harmonization' (Protocol in workflow.md)

## Phase 2: 3D Environment & Tactile Materials
Transform the 3D void into a curated "Reading Room" using WebGPU.

- [ ] Task: Build the "Reading Room" environment geometry.
    - [ ] Consult `deepwiki` for WebGPU-specific scene optimization and environment mapping.
    - [ ] Write Tests: Ensure the environment meshes (walls, floor) load correctly.
    - [ ] Implement: Add wall meshes with subtle textures and a refined rug mesh to `ThreeDLibraryPage.tsx`.
- [ ] Task: Enhance `BookMesh.tsx` for tactile fidelity.
    - [ ] Consult `deepwiki` for realistic material shaders and mesh deformation in Three.js.
    - [ ] Write Tests: Verify mesh generation with curved spine geometry.
    - [ ] Implement: Update book geometry (curved spines, page blocks) and apply physically-based materials.
- [ ] Task: Implement "Themed Lighting" system.
    - [ ] Write Tests: Ensure light intensities/colors change when app theme toggles.
    - [ ] Implement: Create a light rig that syncs with "Natural Day" and "Warm Night" theme states.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: 3D Environment & Tactile Materials' (Protocol in workflow.md)

## Phase 3: Reactive Interaction & cinematic Polish
Add micro-interactions and cinematic transitions to complete the premium feel.

- [ ] Task: Implement "Tactile Hover" animations in 3D.
    - [ ] Consult `deepwiki` for performant hover detection and animation interpolation in WebGPU.
    - [ ] Write Tests: Verify book translation state on pointer hover.
    - [ ] Implement: Use `useFrame` or `lerp` to slide books out slightly when focused.
- [ ] Task: Refine camera transitions and cinematic effects.
    - [ ] Write Tests: Ensure camera lerps to correct target on book selection.
    - [ ] Implement: Polish `CameraController` for a smoother "zooming" feel when opening a book.
- [ ] Task: Final 2D/3D integration pass.
    - [ ] Implement: Apply consistent micro-animations (transitions, lifts) across both library modes.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Reactive Interaction & cinematic Polish' (Protocol in workflow.md)
