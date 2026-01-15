# Track Spec: Reader UI Overhaul

## Overview
This track aims to transform the core reading experience from a basic digital viewer into a premium "Classic Academic" environment. We will focus on immersive layouts, advanced typography controls, and a structured navigation hierarchy.

## Functional Requirements
- **Immersive Page Layout:**
    - Implement a dual-column "open book" layout for wide screens.
    - Add a subtle "paper" texture/gradient background to the reading pane.
    - Refine margins and line heights for a book-like feel.
- **Appearance Customization Panel:**
    - Create a pop-over menu for appearance settings.
    - Support switching between curated fonts (EB Garamond, Baskerville, etc.).
    - Provide granular control over line height and page margins.
- **Structured Table of Contents:**
    - Redesign the sidebar into a hierarchical Act > Scene list.
    - Add "active" state tracking to highlight the user's current location in the sidebar.
    - Use a refined sans-serif metadata style for scene descriptions.

## Non-Functional Requirements
- **Fluidity:** All layout transitions (e.g., toggling columns) should be smooth.
- **Performance:** Custom font switching should be near-instantaneous without flickering the iframe.

## Acceptance Criteria
- User can toggle between single and dual column layouts.
- Changes in the appearance panel are reflected immediately in the reader.
- The sidebar clearly indicates the current Act and Scene.
- Visuals align with the cream/slate "Classic Academic" color palette.

## Out of Scope
- Global app settings overhaul (only focused on the Reader UI).
- Annotations or highlighting logic (layout only).
