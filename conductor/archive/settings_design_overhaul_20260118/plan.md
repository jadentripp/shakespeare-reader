# Implementation Plan - Settings Page Design Overhaul

This plan outlines the steps to overhaul the settings page with a sidebar navigation, card-based UI, and interactive previews.

## User Review Required

> [!IMPORTANT]
> This plan involves a significant UI refactor of the `SettingsPage.tsx`. Ensure existing functionality (saving keys, selecting voices) is preserved.

## Proposed Changes

### UI/UX Improvements
- Replace the single-scroll layout with a sidebar-driven navigation.
- Implement sections for "Appearance", "AI Assistant", and "Audio & TTS".
- Use card-based grouping for settings within each section.
- Add an interactive "Appearance Preview" card.
- Improve inline documentation for complex settings.

## Phases

### Phase 1: Foundation & Sidebar Layout
Establish the new structural layout for the settings page.

- [x] Task: Create a new `SettingsSidebar` component for navigating categories.
    - [x] Write Tests: Ensure sidebar items render and respond to clicks.
    - [x] Implement: Create the sidebar with icons and labels.
- [x] Task: Refactor `SettingsPage.tsx` to use the sidebar layout.
    - [x] Write Tests: Ensure the correct section is rendered based on sidebar selection.
    - [x] Implement: Wrap current settings sections in a layout that responds to sidebar state.
- [~] Task: Conductor - User Manual Verification 'Phase 1: Foundation & Sidebar Layout' (Protocol in workflow.md)

### Phase 2: Appearance & Theme Section
Revamp the appearance settings and add an interactive preview.

- [x] Task: Implement the "Appearance" section with a "Preview" card.
    - [x] Write Tests: Verify that changing theme/font settings updates the preview state.
    - [x] Implement: Create a card that displays sample text reacting to current appearance settings.
- [x] Task: Migrate existing appearance settings (if any) to the new card-based UI.
    - [x] Write Tests: Ensure settings are correctly read and written.
    - [x] Implement: Move font size, theme, etc., into the "Appearance" section cards.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Appearance & Theme Section' (Protocol in workflow.md)

### Phase 3: AI Assistant & Audio Sections
Refactor the remaining settings into the new sidebar structure.

- [x] Task: Refactor "AI Assistant" settings into cards.
    - [x] Write Tests: Verify OpenAI key and model selection still work.
    - [x] Implement: Group API key, status, and model selection into cards with descriptions.
- [x] Task: Refactor "Audio & TTS" settings into cards.
    - [x] Write Tests: Verify ElevenLabs voice selection, preview, and sliders still work.
    - [x] Implement: Group voice selection, advanced parameters (stability, etc.), and test connection into cards.
- [x] Task: Conductor - User Manual Verification 'Phase 3: AI Assistant & Audio Sections' (Protocol in workflow.md)

### Phase 4: Final Polish & Refinement
Apply transitions and ensure responsive behavior.

- [x] Task: Add smooth transitions between sections.
    - [x] Implement: Use Framer Motion or CSS transitions for section switching.
- [x] Task: Ensure responsive behavior on different window sizes.
    - [x] Write Tests: Check layout at various widths.
    - [x] Implement: Adjust sidebar/content layout for smaller windows.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Final Polish & Refinement' (Protocol in workflow.md)
