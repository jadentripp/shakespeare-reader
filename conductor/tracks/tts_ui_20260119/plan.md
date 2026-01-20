# TTS UI Enhancement - Implementation Plan

## Phase 1: Foundation - Audio Player Enhancements

- [x] Task: Extend AudioPlayer with seek, speed, and volume capabilities 950f084
    - [x] Write tests for `AudioPlayer.seek(position)` method
    - [x] Write tests for `AudioPlayer.setPlaybackRate(rate)` method  
    - [x] Write tests for `AudioPlayer.setVolume(level)` method
    - [x] Write tests for `AudioPlayer.getDuration()` and `AudioPlayer.getCurrentTime()` methods
    - [x] Implement seek functionality in `elevenlabs.ts`
    - [x] Implement playback rate control (0.5x - 2x)
    - [x] Implement volume control (0-1 range)
    - [x] Implement duration/currentTime tracking with state updates

- [x] Task: Add progress state to AudioPlayer 950f084
    - [x] Write tests for progress state updates (currentTime, duration, buffered)
    - [x] Implement progress state that updates during playback
    - [x] Ensure progress state is exposed via `useSyncExternalStore` pattern

- [x] Task: Persist TTS preferences 
    - [x] Write tests for saving/loading TTS preferences (speed, volume)
    - [x] Add `tts_playback_speed` and `tts_volume` to settings storage
    - [x] Load preferences on app initialization in `useTTS` hook

- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation - Audio Player Enhancements' (Protocol in workflow.md)

## Phase 2: TTS Panel Component - Structure & Styling

- [ ] Task: Create TTSPanel component shell
    - [ ] Write tests for TTSPanel rendering in collapsed and expanded states
    - [ ] Create `src/components/reader/TTSPanel.tsx` with collapsed mini-player state
    - [ ] Implement expanded state with full controls layout
    - [ ] Add glassmorphism/blur styling consistent with reader aesthetic

- [ ] Task: Implement panel animation and gestures
    - [ ] Write tests for panel open/close state transitions
    - [ ] Implement smooth slide-up animation for panel appearance
    - [ ] Implement swipe-down gesture to collapse/dismiss panel
    - [ ] Implement tap-to-expand on collapsed mini-player

- [ ] Task: Create progress bar component
    - [ ] Write tests for TTSProgressBar rendering and interaction
    - [ ] Create `src/components/reader/TTSProgressBar.tsx`
    - [ ] Implement seekable progress bar with elapsed/remaining time display
    - [ ] Add buffering state visual indicator
    - [ ] Display page context (e.g., "Page 42 of 380")

- [ ] Task: Conductor - User Manual Verification 'Phase 2: TTS Panel Component - Structure & Styling' (Protocol in workflow.md)

## Phase 3: Enhanced Playback Controls

- [ ] Task: Implement playback speed control
    - [ ] Write tests for speed selector component
    - [ ] Create speed selector UI (0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x)
    - [ ] Connect speed selector to AudioPlayer.setPlaybackRate
    - [ ] Persist selected speed preference

- [ ] Task: Implement skip controls
    - [ ] Write tests for skip forward/backward functionality
    - [ ] Create skip buttons UI (-15s, +15s)
    - [ ] Implement skip logic that handles page boundaries
    - [ ] Navigate to previous/next page if skip exceeds current audio bounds

- [ ] Task: Implement volume control
    - [ ] Write tests for volume slider component
    - [ ] Create volume slider with dynamic icon (muted/low/medium/high)
    - [ ] Connect volume slider to AudioPlayer.setVolume
    - [ ] Persist volume preference

- [ ] Task: Conductor - User Manual Verification 'Phase 3: Enhanced Playback Controls' (Protocol in workflow.md)

## Phase 4: Voice Quick-Switch

- [ ] Task: Create voice selector for TTS panel
    - [ ] Write tests for voice selector rendering in TTS panel context
    - [ ] Create inline voice selector component (reuse grouped voice list logic)
    - [ ] Display current voice name prominently in panel header
    - [ ] Add preview button functionality for each voice

- [ ] Task: Implement immediate voice switching
    - [ ] Write tests for voice change during playback
    - [ ] Implement logic to queue voice change for next audio segment
    - [ ] Update `useTTS` hook to support runtime voice changes
    - [ ] Persist selected voice preference

- [ ] Task: Conductor - User Manual Verification 'Phase 4: Voice Quick-Switch' (Protocol in workflow.md)

## Phase 5: Reader Integration

- [ ] Task: Update ReaderTopBar with TTS toggle
    - [ ] Write tests for new TTS toggle button behavior
    - [ ] Replace existing TTS controls with single toggle button
    - [ ] Toggle button opens TTS panel and starts playback if not already playing
    - [ ] Show visual indicator when TTS is active (e.g., pulsing icon)

- [ ] Task: Integrate TTSPanel with BookPage
    - [ ] Write tests for TTS panel integration in reader view
    - [ ] Add TTSPanel to reader layout (positioned at bottom)
    - [ ] Connect panel to existing `useTTS` hook state
    - [ ] Ensure auto-advance functionality works with new panel

- [ ] Task: Add keyboard shortcuts
    - [ ] Write tests for keyboard shortcut handlers
    - [ ] Implement Space for play/pause
    - [ ] Implement Arrow Left/Right for skip backward/forward
    - [ ] Implement Arrow Up/Down for volume adjustment

- [ ] Task: Handle "Read Selection" context menu
    - [ ] Write tests for read selection flow with new TTS system
    - [ ] Ensure selected text playback uses new AudioPlayer features
    - [ ] Selection playback should not open full panel (inline experience)

- [ ] Task: Conductor - User Manual Verification 'Phase 5: Reader Integration' (Protocol in workflow.md)

## Phase 6: Polish & Accessibility

- [ ] Task: Ensure accessibility compliance
    - [ ] Write tests for ARIA attributes and focus management
    - [ ] Add proper ARIA labels to all TTS controls
    - [ ] Ensure keyboard navigation works throughout panel
    - [ ] Verify minimum touch target sizes (44x44px)

- [ ] Task: Animation polish
    - [ ] Review and optimize all animations for 60fps
    - [ ] Add micro-interactions (button press feedback, progress updates)
    - [ ] Ensure panel transitions don't block main thread

- [ ] Task: Final integration testing
    - [ ] Write end-to-end tests for complete TTS flow
    - [ ] Test all playback scenarios (play, pause, seek, skip, speed, volume, voice change)
    - [ ] Test page auto-advance with all new features
    - [ ] Verify preference persistence across app restarts

- [ ] Task: Conductor - User Manual Verification 'Phase 6: Polish & Accessibility' (Protocol in workflow.md)
