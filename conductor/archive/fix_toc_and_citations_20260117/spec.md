# Specification - Fix TOC Jump and Implement Citation Popovers

## Overview
This track addresses two main issues in the AI Reader:
1.  **TOC Navigation Snap-back:** When navigating via the Table of Contents, the reader jumps to the correct location but immediately snaps back to the previous position.
2.  **Broken Citations:** Kindle-style citation links (e.g., `kindle:pos:fid...`) for footnotes are not functional. These will be implemented as interactive popovers.

## Functional Requirements

### 1. TOC Navigation Fix
- Ensure stable navigation to TOC targets.
- Prevent the "snap-back" behavior by implementing a navigation lock that pauses automatic pagination updates and page-locking during programmatic jumps.
- Add comprehensive debug logging to the browser console to track the navigation lifecycle (jump start, scroll events, pagination updates, and lock triggers).

### 2. Citation Popovers
- Intercept clicks on citation links (e.g., links with `kindle:pos:fid` or `id="fnref..."`).
- Resolve the target footnote content (e.g., elements with `id="fn..."`) within the book's HTML.
- Display footnote content in a visually consistent popover near the citation.

### 3. Debugging & Observability
- Implement `console.log` tracking in `MobiBookPage.tsx` for:
    - `jumpToElement` entry and target parameters.
    - `scrollLeft` transitions.
    - `updatePagination` and `lockToPage` triggers.

## Acceptance Criteria
- TOC jumps in "The Iliad" remain at the target location without snapping back.
- Clicking a citation (e.g., `[1]`) displays the corresponding footnote in a popover.
- Debug logs are visible in the console for verification.
