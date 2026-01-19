# Specification: 3D Immersive Library (WebGPU)

## Overview
Transform the current 2D Library Page into a high-fidelity, immersive 3D environment. Users will browse their downloaded literature on a realistic, beautifully rendered 3D bookshelf using Three.js and the cutting-edge WebGPU renderer.

## User Experience
- **Visuals:** A "legit" 3D bookcase with high-resolution wood textures, dynamic shadows, and realistic lighting (ambient and point lights).
- **Interactivity:**
    - **Orbit Controls:** Smooth mouse-based rotation and panning to explore the shelf.
    - **Hover Effects:** Subtle physics-based "wobble" or slight protrusion when hovering over a book.
    - **Selection:** Clicking a book triggers a cinematic camera zoom into the cover.
- **Transition:** A seamless "zoom-to-texture" transition that leads the user from the 3D world into the 2D reader.

## Functional Requirements
- **WebGPU Implementation:** Use `Three.WebGPURenderer` for state-of-the-art performance and visual fidelity.
- **Dynamic Book Generation:**
    - Programmatically generate 3D book meshes based on the user's local library.
    - Map existing book cover images as textures onto the 3D meshes.
- **Performance:** Use instancing or optimized geometries to ensure the bookcase remains fluid even with dozens of books.
- **Tauri Integration:** Ensure the WebGPU context initializes correctly within the Tauri 2 webview (requires modern hardware/drivers).

## Non-Functional Requirements
- **Visual Fidelity:** Priority on lighting, shadows, and material quality to create a "premium" feel.
- **Modern Hardware Only:** As requested, this feature will specifically target WebGPU-capable systems.

## Acceptance Criteria
- [ ] 3D Library page is accessible from the main navigation.
- [ ] Books from the local SQLite database are rendered as 3D objects on the shelf.
- [ ] Orbit controls allow free movement around the bookcase.
- [ ] Clicking a book zooms the camera in and opens the `BookPage` or `MobiBookPage`.
- [ ] The scene utilizes WebGPU for rendering.

## Out of Scope
- VR/AR support.
- Fully simulated physics (e.g., books falling off the shelf).
- Character models or room exploration beyond the bookcase.
