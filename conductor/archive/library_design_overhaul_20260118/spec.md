# Specification: Library Interface Overhaul (2D/3D)

## Overview
Transform the library experience from a functional list into a premium, immersive discovery space. This involves harmonizing the 2D UI for a more "magazine-like" feel and evolving the 3D bookshelf from a basic demo into a polished, reactive "Reading Room."

## Functional Requirements

### 1. 2D Library Improvements
- **Unified Card Architecture:** Redesign `BookCard.tsx` to use a consistent base structure for both local library books and Gutenberg catalog results.
- **Visual Clarity:**
  - Standardize cover art aspect ratios and shadows.
  - Implement a more elegant "Reading Progress" bar.
  - Redesign badges (Popular, Primary Work, Queued) for a cleaner, consistent look.
- **Section Polish:**
  - Refactor `YourLibrary.tsx` and `ContinueReading.tsx` to reduce visual noise.
  - Implement subtle hover states (e.g., slight lift and shadow deepening).

### 2. 3D Library Improvements
- **"The Reading Room" Environment:**
  - Replace the flat plane with a curated environment (walls with subtle textures, refined rug).
  - Implement area-based lighting that feels warm and deliberate.
- **Tactile Book Meshes:**
  - Update `BookMesh.tsx` geometry to include a slightly curved spine and distinct "page block" edges.
  - Improve materials to respond better to lighting (cloth/leather-like roughness).
- **Reactive Interaction:**
  - **Tactile Hover:** Books should slide out slightly (approx. 5-10cm) when hovered.
  - **Dynamic Lighting:** Synchronize 3D scene lighting with the app's theme (Natural Day vs. Warm Night).
- **Transitions:** Ensure the camera transition from the bookshelf to the reader is fluid and cinematic.

## Non-Functional Requirements
- **Performance:** Maintain 60fps on modern hardware using WebGPU optimizations.
- **Consistency:** Adhere strictly to the "Premium Reader" design language (Stone/Amber/Slate color palette).
- **Responsiveness:** 2D grid should adapt elegantly to window resizing.

## Acceptance Criteria
- [ ] 2D local and search results share the same design language and spacing.
- [ ] The 3D scene has a defined "space" (walls/floor) that isn't a dark void.
- [ ] Hovering over a book in 3D causes it to move physically toward the viewer.
- [ ] Progress bars in 2D are integrated into the card design, not appended as an afterthought.
- [ ] Theme switching correctly updates the 3D scene's ambient and point light colors.

## Out of Scope
- Implementing actual 3D room navigation (camera is fixed to the shelf area).
- Custom 3D furniture beyond the shelf and basic room boundaries.
