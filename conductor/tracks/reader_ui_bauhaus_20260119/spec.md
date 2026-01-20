# Track Specification: Reader UI Bauhaus Alignment

## Overview
This track aims to bring the Reader interface into full visual alignment with the "Modern Minimalist (Bauhaus-inspired)" redesign of the 2D Library. The goal is to eliminate visual inconsistency by applying a strict geometric, monochromatic, and bold typographic system to the reading experience.

## Functional Requirements

### 1. Reader Top Bar & Navigation
- **Branding:** Update the "AI Reader" brand mark in the top bar to match the sharp, boxed style used in the Library.
- **Typography:** Change the book title and author display to use the bold geometric sans-serif font.
- **Borders:** Implement a bold, 2px bottom border (black in light mode, white in dark mode) for the top bar.

### 2. Sidebars & Floating Panels (Chat, Appearance, TTS)
- **Geometry:** Remove all `border-radius` from the AI Chat sidebar, the Appearance panel, and the TTS bottom sheet.
- **Separation:** Use 2px solid borders to define the boundaries of these panels.
- **Typography:** All panel headers (e.g., "AI ASSISTANT", "APPEARANCE") and button labels must use the bold geometric sans-serif.
- **Inputs:** Update text areas and input fields to have sharp corners and bold borders.

### 3. Controls & Progress Indicators
- **Accents:** Replace all amber/orange highlights and active states with Bauhaus Red (`#E02E2E`).
- **Progress Bars:** The reading progress bar (Top Bar) and the TTS progress bar must be sharp, rectangular lines in Bauhaus Red.
- **Buttons:** Update icons (Lucide) to be contained within sharp, square button boundaries where applicable.

### 4. Global Reader Polish
- **Color Palette:** Shift the UI background of panels to a pure monochromatic scale (White/Gray/Black).
- **Transitions:** Ensure hover states on buttons use bold color inversions (e.g., White text on Black background) rather than subtle opacity shifts.

## Non-Functional Requirements
- **Visual Consistency:** The transition between the Library and the Reader should feel seamless, with no "soft" UI elements remaining in the Reader.
- **Readability:** While UI elements are bold/Bauhaus, the actual book text (the serif font) must remain undisturbed to ensure a high-quality reading experience.

## Acceptance Criteria
- No rounded corners are visible in any part of the Reader UI.
- All primary accents (active buttons, progress bars) are Bauhaus Red (`#E02E2E`).
- UI headers and buttons use bold geometric sans-serif typography.
- Sidebars and panels are delimited by 2px solid borders.
