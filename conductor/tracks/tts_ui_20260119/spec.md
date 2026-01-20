# TTS UI Enhancement Specification

## Overview

Enhance the Text-to-Speech user interface in AI Reader to provide a premium audiobook-like experience. This includes a dedicated bottom sheet TTS panel, playback progress visualization, and comprehensive audio controls that match user expectations from modern audiobook applications like Audible and Apple Books.

## Functional Requirements

### FR-1: Bottom Sheet TTS Panel
- **FR-1.1:** When TTS playback is active or initiated, display a slide-up bottom sheet panel containing all TTS controls.
- **FR-1.2:** The panel should have two states:
  - **Collapsed (mini-player):** Shows current voice name, play/pause button, and progress bar. Always visible when TTS is active.
  - **Expanded:** Full controls including voice selection, speed, volume, skip controls, and detailed progress.
- **FR-1.3:** Panel can be dismissed by swiping down or tapping outside (stops playback with confirmation) or minimized to collapsed state.
- **FR-1.4:** Panel design should use glassmorphism/blur effects consistent with the existing reader UI aesthetic.

### FR-2: Playback Progress Indicator
- **FR-2.1:** Display a seekable progress bar showing elapsed and remaining time for the current page's audio.
- **FR-2.2:** Users can tap/drag on the progress bar to seek to a specific position in the audio.
- **FR-2.3:** Show buffering state visually when audio is loading.
- **FR-2.4:** Display current page number and total pages in the TTS context (e.g., "Page 42 of 380").

### FR-3: Enhanced Playback Controls
- **FR-3.1: Playback Speed**
  - Provide speed options: 0.5x, 0.75x, 1x (default), 1.25x, 1.5x, 1.75x, 2x
  - Display current speed visually; persist user preference across sessions
  
- **FR-3.2: Skip Controls**
  - Skip backward 15 seconds button
  - Skip forward 15 seconds button
  - If skip goes beyond current page audio, navigate to previous/next page accordingly
  
- **FR-3.3: Volume Control**
  - Independent volume slider for TTS audio (0-100%)
  - Volume icon that reflects current level (muted, low, medium, high)
  - Persist volume preference across sessions
  
- **FR-3.4: Voice Quick-Switch**
  - Display current voice name/avatar in the TTS panel
  - Tap to open voice selector (reuse grouped voice list from Settings)
  - Preview button next to each voice option
  - Changing voice applies immediately to next audio segment

### FR-4: Integration with Existing Reader
- **FR-4.1:** Replace the current basic TTS controls in `ReaderTopBar` with a single TTS toggle button that opens/activates the bottom sheet.
- **FR-4.2:** Auto-advance to next page functionality continues to work seamlessly with the new UI.
- **FR-4.3:** "Read Selection" context menu option should use the new TTS system without opening the full panel.

## Non-Functional Requirements

- **NFR-1:** Smooth animations (60fps) for panel open/close and all interactive elements.
- **NFR-2:** TTS panel should not block reading content—collapsed mini-player height should be minimal (~60px).
- **NFR-3:** All controls should have appropriate touch targets (min 44x44px) for accessibility.
- **NFR-4:** Keyboard shortcuts: Space (play/pause), Arrow Left/Right (skip), Up/Down (volume).

## Acceptance Criteria

1. User can tap the TTS button in the reader to start narration and see the bottom sheet panel appear.
2. User can expand/collapse the TTS panel with smooth animation.
3. User can see a progress bar that updates in real-time as audio plays.
4. User can seek within the current page's audio by dragging the progress bar.
5. User can change playback speed and the change takes effect immediately.
6. User can skip forward/backward 15 seconds using dedicated buttons.
7. User can adjust volume independently from system volume.
8. User can change the narrator voice from the TTS panel without going to Settings.
9. All preferences (speed, volume, voice) persist across sessions.
10. Auto-advance to next page continues to work when enabled.

## Out of Scope

- Sentence-level highlighting (requires word-timing data from TTS provider)
- Chapter-based navigation (would require chapter detection in book content)
- Background playback when app is minimized (Tauri/native limitation)
- Offline TTS caching (would require significant storage management)
