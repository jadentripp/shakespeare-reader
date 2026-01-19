# Implementation Plan: 3D Immersive Library (WebGPU)

This plan outlines the steps to implement a high-fidelity 3D bookshelf experience using Three.js and WebGPU, integrated into the AI Reader application.

## Phase 1: Environment Setup & Foundation
Goal: Initialize the 3D context with WebGPU and establish the basic scene structure.

- [x] Task: Install dependencies (`three`, `@types/three`, `@react-three/fiber`, `@react-three/drei`). 7c41632
- [x] Task: Create a dedicated `ThreeDLibrary` component route and placeholder in `router.tsx`. e7471ec
- [x] Task: Implement `WebGPUScene` wrapper to initialize `Three.WebGPURenderer` (async initialization).
- [x] Task: Set up basic lighting (AmbientLight, DirectionalLight with shadow support).
- [ ] Task: Conductor - User Manual Verification 'Environment Setup' (Protocol in workflow.md)

## Phase 2: The 3D Bookcase Model
Goal: Build the visual structure of the bookcase and the individual book components.

- [x] Task: Create a `Bookcase` component using box geometries with high-quality wood textures/materials.
- [x] Task: Implement a `BookMesh` component that accepts a cover texture and generates a realistic book shape.
- [x] Task: Create a layout engine to position `BookMesh` components on the `Bookcase` shelves based on library data.
- [x] Task: Implement Orbit Controls for navigation.
- [ ] Task: Conductor - User Manual Verification '3D Bookcase Model' (Protocol in workflow.md)

## Phase 3: Interactivity & Polish
Goal: Add hover effects, dynamic lighting, and high-fidelity visual touches.

- [x] Task: Add hover interactions to `BookMesh` (e.g., slight protrusion, highlight).
- [x] Task: Configure high-quality shadows and contact shadows for the bookshelf.
- [x] Task: Implement the "Cinematic Zoom" camera animation using `useFrame`.
- [x] Task: Integrate the transition logic to navigate to the 2D reader after the zoom completes.
- [ ] Task: Conductor - User Manual Verification 'Interactivity & Polish' (Protocol in workflow.md)

## Phase 4: Data Integration & Optimization
Goal: Connect to the local library database and ensure performance.

- [x] Task: Fetch book data from SQLite/Rust backend and map to 3D shelf positions.
- [x] Task: Implement texture loading and caching for book covers.
- [ ] Task: Optimize rendering (e.g., frustum culling, low-poly geometry for distant books).
- [ ] Task: Conductor - User Manual Verification 'Data Integration' (Protocol in workflow.md)
