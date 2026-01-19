# Specification: Settings Page Design Overhaul

## Overview
The current settings page is functional but lacks visual polish and clear organization. This track aims to transform the settings into a premium, desktop-class experience by implementing a sidebar-driven navigation, card-based grouping, and interactive previews.

## Functional Requirements
- **Sidebar Navigation:** Implement a vertical sidebar to navigate between settings categories:
  - Appearance & Theme
  - AI Assistant
  - Audio & TTS
- **Card-Based UI:** Group related settings within each category into visually distinct cards.
- **Interactive Previews:** 
  - In the "Appearance" section, show a live text preview that updates as the user changes fonts, sizes, or themes.
- **Inline Documentation:** Add descriptive sub-text to settings (e.g., explaining the difference between OpenAI models or TTS voices).
- **Responsive Design:** Ensure the sidebar layout remains functional and visually appealing on different window sizes.

## Non-Functional Requirements
- **Consistency:** Use existing Radix UI primitives and Tailwind CSS 4 patterns.
- **Performance:** Ensure switching between categories is instantaneous with no layout shift.
- **Transitions:** Use smooth CSS transitions for category switching.

## Acceptance Criteria
- [ ] Settings page is accessible via a sidebar with "Appearance", "AI", and "Audio" categories.
- [ ] All settings are grouped into logical cards with clear labels and descriptions.
- [ ] Changing a font or theme in settings immediately updates a "Preview" card within that view.
- [ ] The UI matches the "premium" aesthetic of the rest of the application (consistent spacing, typography, and shadows).
- [ ] All existing settings functionality (saving API keys, selecting voices, etc.) remains fully functional.

## Out of Scope
- Adding new settings parameters not already supported by the backend.
- Refactoring the underlying state management for settings (unless required for the UI overhaul).
