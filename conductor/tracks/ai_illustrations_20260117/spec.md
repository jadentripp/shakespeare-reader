# Specification: Illustration & Image Support (Track: `ai_illustrations_20260117`)

## Overview
This track adds support for displaying illustrations and images embedded within book files (specifically .mobi/Gutenberg files). Currently, the reader focuses primarily on text; this enhancement will extract, store, and render images inline to provide a richer, more faithful reading experience for classic literature like the Iliad.

## Functional Requirements
- **Extraction & Storage:** The backend must extract images from the book files during the import/download process and store them (either in the database or as local assets).
- **Inline Rendering:** Images must be rendered within the `ReaderPane` at their correct positions relative to the text.
- **Responsive Layout:** Images should automatically scale to fit the width of the reading column while maintaining aspect ratio.
- **Click-to-Zoom (Lightbox):** Clicking an image should open a high-resolution "zoom" view (lightbox) to allow detailed inspection.
- **Captions & Metadata:** Display associated captions below images and use descriptive text for `alt` attributes to ensure accessibility.
- **Lazy Loading:** Implement lazy loading for images to maintain high performance and low memory usage in long books.
- **User Actions:** Provide a "Save Image" option (via right-click or a discreet UI element) to allow users to export illustrations.

## Non-Functional Requirements
- **Performance:** Adding images should not significantly increase the initial load time of a book (achieved via lazy loading).
- **Memory Management:** Ensure that extracted images are cached efficiently and do not lead to memory leaks in the Tauri/WebView environment.
- **Accessibility:** All images must have appropriate ARIA labels or alt-text derived from the book source.

## Acceptance Criteria
- [ ] Images from the Iliad (and other illustrated books) appear inline in the `ReaderPane`.
- [ ] Images scale correctly when the window is resized or the layout changes (single vs. dual column).
- [ ] Clicking an image opens a modal/lightbox view.
- [ ] Right-clicking an image provides an option to "Save Image As...".
- [ ] Scrolling remains smooth even when passing through multiple images.

## Out of Scope
- **Image Editing:** No built-in tools for cropping or filtering images.
- **External Image Search:** This track only supports images already present in the source book files.
- **Animated Formats:** Support is limited to static image formats (JPEG, PNG, etc.) typically found in .mobi files.
