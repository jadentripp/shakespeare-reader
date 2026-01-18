# Implementation Plan - Fix TOC Jump and Citation Popovers

## Phase 1: Debugging and TOC Fix
- [x] Task: Add verbose logging to `MobiBookPage.tsx` navigation logic. (a99f76f)
- [x] Task: Implement a "navigation lock" state to prevent `updatePagination` or `scheduleLock` from interfering with programmatic TOC jumps. (a99f76f)
- [x] Task: Disable `scroll-behavior: smooth` during jumps if necessary to ensure immediate and reliable positioning. (a99f76f)
- [x] Task: Verify stable TOC navigation in the Iliad. (a99f76f)

## Phase 2: Citation Resolution
- [x] Task: Update `handleLinkClick` in `MobiBookPage.tsx` to identify and handle footnote-style links. (a99f76f)
- [x] Task: Implement a utility to resolve footnote content based on the link's `href` or `id`. (a99f76f)
- [x] Task: Add debug logs to verify that target footnote elements are correctly identified. (a99f76f)

## Phase 3: Popover Implementation
- [x] Task: Integrate a popover component (using Radix UI or a portal-based approach) into the reader view. (a99f76f)
- [x] Task: Implement logic to extract and display the cleaned footnote text in the popover. (a99f76f)
- [x] Task: Style the popover to match the application's appearance (light/dark themes). (a99f76f)
- [x] Task: Conductor - User Manual Verification 'Phase 3' (a99f76f)

## Phase 4: Final Polish
- [x] Task: Clean up or toggle debug logs. (a99f76f)
- [x] Task: Verify cross-book compatibility (where applicable). (a99f76f)
- [x] Task: Conductor - User Manual Verification 'Phase 4' (a99f76f)