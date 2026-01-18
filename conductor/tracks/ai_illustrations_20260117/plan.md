# Implementation Plan: Illustration & Image Support (`ai_illustrations_20260117`)

This plan covers the extraction of images from book files in the Rust backend and their rendering and interaction in the React frontend.

## Phase 1: Backend Image Extraction & Serving
In this phase, we will enhance the Tauri backend to extract images from .mobi files and provide a way for the frontend to access them.

- [~] Task: Research and implement MOBI image extraction logic in Rust
    - [ ] Identify where images are stored in the current MOBI parsing logic (`src-tauri/src/books.rs`)
    - [ ] Implement a method to extract raw image data (blobs) from the book file
- [ ] Task: Update Database Schema for Image Tracking
    - [ ] Create a migration to add an `images` table or update `books` to track extracted assets
    - [ ] Store image metadata (index, format) and link them to their respective books
- [ ] Task: Create Tauri Command to Fetch Image Data
    - [ ] Implement `get_book_image` command that returns base64 or a local protocol URL for an image
- [ ] Task: Conductor - User Manual Verification 'Backend Image Extraction & Serving' (Protocol in workflow.md)

## Phase 2: Frontend Rendering & Style
This phase focuses on updating the reader to recognize image tags and display them correctly within the text flow.

- [ ] Task: Update HTML Processing for Images
    - [ ] Modify `src/lib/readerHtml.ts` to identify image placeholders/tags in the source HTML
    - [ ] Ensure image tags are preserved and mapped to the correct asset IDs
- [ ] Task: Implement Inline Image Component
    - [ ] Create a `ReaderImage` component that handles lazy loading
    - [ ] Implement responsive scaling (max-width: 100%) and aspect ratio maintenance
- [ ] Task: Style Captions and Layout
    - [ ] Add styling for image captions derived from the source
    - [ ] Ensure images are centered or correctly aligned within the `ReaderPane`
- [ ] Task: Conductor - User Manual Verification 'Frontend Rendering & Style' (Protocol in workflow.md)

## Phase 3: Interactive Features & Lightbox
Adding the "Click-to-Zoom" and "Save Image" functionality to enhance the user experience.

- [ ] Task: Implement Lightbox/Zoom Modal
    - [ ] Create a full-screen modal to display the high-resolution version of an image
    - [ ] Add zoom and pan controls for the lightbox
- [ ] Task: Implement "Save Image" Functionality
    - [ ] Add a context menu or button to save the image locally using Tauri's `dialog` and `fs` APIs
- [ ] Task: Conductor - User Manual Verification 'Interactive Features & Lightbox' (Protocol in workflow.md)

## Phase 4: Performance & Final Polish
Ensuring the implementation is robust and doesn't degrade the reading experience.

- [ ] Task: Optimize Lazy Loading and Memory
    - [ ] Verify that images are only loaded when in view
    - [ ] Check for memory leaks when switching between heavily illustrated books
- [ ] Task: Final UI/UX Pass
    - [ ] Ensure accessibility (alt-text) is correctly applied to all images
    - [ ] Refine transition animations for the lightbox
- [ ] Task: Conductor - User Manual Verification 'Performance & Final Polish' (Protocol in workflow.md)
