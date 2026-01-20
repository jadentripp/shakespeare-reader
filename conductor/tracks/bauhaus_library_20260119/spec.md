# Track Specification: Bauhaus-Inspired 2D Library Redesign

## Overview
This track aims to overhaul the visual design of the 2D Library interface to reflect a "Modern Minimalist (Bauhaus-inspired)" aesthetic. The goal is to move away from the current utility-focused layout to a bold, geometric, and highly functional gallery experience. The design will prioritize clean lines, strong sans-serif typography for UI elements, and a strict top-down hierarchy.

## Functional Requirements

### 1. Header & Navigation (Minimalist Top-Down)
- **Redesign:** Replace the current header and sidebar structure.
- **Header:** Create a massive, bold typographic header (e.g., "LIBRARY" or "COLLECTIONS") using a geometric sans-serif font.
- **Filter Bar:** Move "Collections" and active filters to a clean, horizontal bar immediately below the header. This removes the need for a persistent sidebar, utilizing the full screen width.
- **Search:** Integrate the search input seamlessly into this top section, likely as a bold, underlined field rather than a contained box.

### 2. Layout Structure
- **Full-Width Grid:** The book grid should span the full width of the container (respecting reasonable maximums) to create a "gallery" feel.
- **Grid Geometry:** Enforce a strict, uniform grid with substantial whitespace (gutters) between items to let the content breathe.

### 3. Book Card Redesign (Invisible Actions)
- **Clean State:** In its default state, the book card should display *only* the cover art and essential typographic details (Title, Author, Progress).
- **Typography:**
  - Titles: Strong, legible sans-serif or slab-serif.
  - Authors: Smaller, geometric sans-serif.
- **Hover Interaction:**
  - Upon hovering the card, a distinct overlay (e.g., a semi-transparent bold color or dark layer) appears.
  - **Actions:** "Read" and "Delete" (or "More") buttons appear clearly within this overlay.
- **Progress:** Redesign the progress bar to be a sharp, geometric line (possibly distinct color like Red or Yellow) rather than a soft rounded pill.

### 4. Color & Texture
- **Palette:** Strictly monochromatic UI (Black, White, Grays) to allow book covers to pop.
- **Accents:** Use a single bold accent color (e.g., Bauhaus Red or Yellow) for active states, progress indicators, or primary buttons.
- **Shapes:** Remove rounded corners (border-radius) from buttons, inputs, and cards where possible, opting for sharp, rectangular edges to emphasize the "Constructivist" vibe.

## Non-Functional Requirements
- **Responsiveness:** The grid must fluidly adapt to resizing, maintaining the geometric integrity.
- **Performance:** Hover effects must be performant (CSS-driven) to avoid lag in large libraries.
- **Accessibility:** Ensure the high-contrast aesthetic maintains WCAG compliance for text readability and focus states.

## Acceptance Criteria
- The sidebar is removed; collections are accessible via a horizontal menu.
- Book cards have sharp corners (or minimal radius) and reveal actions only on hover.
- The UI uses a monochromatic base with a defined bold accent color.
- Typography for headers and UI elements is geometric sans-serif.
- Book lists and grids align perfectly to a strict layout grid.
