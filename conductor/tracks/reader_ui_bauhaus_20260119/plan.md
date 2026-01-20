# Implementation Plan - Reader UI Bauhaus Alignment

## Phase 1: Top Bar & Global Reader Styling
- [x] Task: Update `ReaderTopBar.tsx` for Bauhaus aesthetic 412fcd0
    - [ ] Create/Update tests in `src/tests/ReaderTopBar.test.tsx` to verify sharp edges, bold borders, and Bauhaus typography
    - [ ] Implement sharp corners (remove border-radius)
    - [ ] Add 2px solid bottom border (monochromatic)
    - [ ] Update book title and author to bold geometric sans-serif
    - [ ] Update AI Reader branding to the boxed Bauhaus style
- [ ] Task: Update Global Reader Accent Colors
    - [ ] Update progress bar in `ReaderTopBar.tsx` to Bauhaus Red (`#E02E2E`) and sharp edges
    - [ ] Update interactive highlights and active button states in the reader view to use Bauhaus Red
- [ ] Task: Conductor - User Manual Verification 'Top Bar & Global Reader Styling' (Protocol in workflow.md)

## Phase 2: Sidebars & Floating Panels
- [ ] Task: Refactor AI Chat Sidebar
    - [ ] Create/Update tests in `src/tests/useChatSidebar.test.tsx` (or related UI tests) to verify geometric changes
    - [ ] Remove all border-radius from the chat container
    - [ ] Add 2px solid borders for panel separation
    - [ ] Update headers ("AI ASSISTANT") and button labels to bold geometric sans-serif
    - [ ] Update input fields to have sharp corners and bold borders
- [ ] Task: Refactor Appearance Panel
    - [ ] Create/Update tests in `src/tests/AppearancePanel.test.tsx` for Bauhaus alignment
    - [ ] Apply sharp corners and bold 2px borders
    - [ ] Update typography to bold geometric sans-serif
- [ ] Task: Conductor - User Manual Verification 'Sidebars & Floating Panels' (Protocol in workflow.md)

## Phase 3: TTS Panel & Final Polish
- [ ] Task: Refactor TTS Bottom Sheet
    - [ ] Create/Update tests in `src/tests/TTSPanelPhase3.test.tsx` to verify Bauhaus design
    - [ ] Remove border-radius and add bold 2px borders to the TTS panel
    - [ ] Update TTS progress bar to Bauhaus Red and sharp edges
    - [ ] Apply bold geometric sans-serif to all labels and controls
- [ ] Task: Final Global Polish & Cleanup
    - [ ] Ensure all hover states use bold monochromatic color inversions
    - [ ] Verify that all remaining "soft" UI elements in the reader are sharpened
    - [ ] Run full test suite to ensure no regressions in reading functionality
- [ ] Task: Conductor - User Manual Verification 'TTS Panel & Final Polish' (Protocol in workflow.md)
