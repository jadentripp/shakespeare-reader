# Track Specification - 3D Library Feature Parity

## Overview
Transform "The Reading Room" (3D Library) from a simple viewer into a fully functional alternative to the 2D Library. Users should be able to search the Project Gutenberg catalog, browse collections, manage their local library, and see their reading progress entirely within the immersive 3D environment.

## Functional Requirements
- **Integrated Catalog Search:**
    - Implement a floating search bar/overlay in the 3D scene.
    - Search queries should trigger `gutendex` API calls and update the books displayed on the shelves.
- **Collection & Category Browsing:**
    - Add a 3D UI menu to switch between different book collections (matching the 2D "Collections" chips).
- **Dynamic Book Status:**
    - Visual indicators on book spines to show if a book is:
        - `Local`: Already downloaded.
        - `Remote`: Available in the catalog but not downloaded.
        - `Downloading`: Currently being fetched (with a progress animation).
- **Interactive "Pull-out" Management:**
    - Clicking a book pulls it forward/out from the shelf.
    - A focused UI appears next to the book with contextual actions:
        - `Read` (for local books).
        - `Download` (for remote books).
        - `Delete` (for local books).
        - Progress percentage display.
- **"The Reading Desk" (Continue Reading):**
    - Render a desk or table surface in the foreground of the scene.
    - Place the top 1-3 most recently read books on the desk for quick access.
    - Implement progress "ribbons" or markers on the spines of books with active progress sitting on the shelves.

## Non-Functional Requirements
- **Performance:** Ensure that updating the bookcase with new search results remains smooth (handle geometry/texture updates efficiently).
- **Aesthetic Consistency:** Maintain the "private library" atmosphere with warm lighting and tactile animations.
- **Visual Feedback:** Use "materialization" effects (e.g., opacity fades or particle effects) when a book is being downloaded/added to the shelf.

## Acceptance Criteria
- [ ] User can search for a book in 3D and see results appear on the shelf.
- [ ] User can download a book from the 3D shelf and see a "materializing" animation.
- [ ] User can delete a local book from the 3D shelf.
- [ ] User can see their "Continue Reading" books on a desk in front of the bookcase.
- [ ] User can switch between categories (e.g., "Popular", "Adventure") in 3D.

## Out of Scope
- Infinite walking/multiple rooms (limiting to a single, dynamic bookcase and desk).
- Advanced sorting within the 3D shelf (initial implementation will follow default catalog/library sorting).
