# Plan: ElevenLabs TTS Integration

## Phase 1: Configuration & Infrastructure [checkpoint: 04a081e]
Establish the foundation for using the ElevenLabs API within the application.

- [x] Task: Add ElevenLabs API Key to Settings 4cfc328
    - [ ] Update `SettingsPage.tsx` to include a password input for the ElevenLabs API key.
    - [ ] Update local storage or secure store logic to persist this key.
    - [ ] Add a `useElevenLabs` hook or utility to retrieve the key securely.
- [x] Task: Install & Configure SDK 79d4105
    - [ ] Install `@elevenlabs/elevenlabs-js`.
    - [ ] Create `src/lib/elevenlabs.ts` to wrap API calls (initialization, text-to-speech conversion).
    - [ ] Implement a basic "test voice" function to verify the key and connection in the Settings panel.
- [x] Task: Conductor - User Manual Verification 'Configuration & Infrastructure' (Protocol in workflow.md) 04a081e

## Phase 2: Core Playback Engine (Streaming)
Build the logic for fetching audio, playing it, and managing the queue.

- [x] Task: Implement Audio Stream Manager 5db8136
    - [ ] Create a `AudioPlayer` class or hook that handles:
        - Fetching audio streams for a given text chunk.
        - Buffering (playing one chunk while fetching the next).
        - Handling Play/Pause/Stop states.
- [ ] Task: Integrate with Reader Content
    - [ ] Connect the `AudioPlayer` to the `ReaderLayout` or `useMobiReader` context.
    - [ ] Implement a function `getPageText(pageIndex)` to extract clean, narrative text from the current page's HTML.
- [ ] Task: Conductor - User Manual Verification 'Core Playback Engine (Streaming)' (Protocol in workflow.md)

## Phase 3: UI Integration & Page Turning
Connect the playback engine to the user interface and implement the auto-page turn logic.

- [ ] Task: Add Playback Controls
    - [ ] Add a "Play/Pause" button to the `ReaderHeader` component.
    - [ ] Wire the button to the `AudioPlayer` states.
    - [ ] Add a visual indicator (spinner) for buffering states.
- [ ] Task: Implement Auto-Page Turn
    - [ ] Logic: When the audio for `Page N` finishes:
        - Trigger `goToNextPage()`.
        - Automatically fetch and start playing audio for `Page N+1`.
- [ ] Task: Voice Selection UI
    - [ ] Fetch the list of available voices from ElevenLabs API.
    - [ ] Add a dropdown to the `AppearancePanel` or `SettingsPage` to select the preferred voice ID.
- [ ] Task: Conductor - User Manual Verification 'UI Integration & Page Turning' (Protocol in workflow.md)

## Phase 4: Highlight-to-Speech
Allow users to select specific text for targeted narration.

- [ ] Task: Add Context Menu Action
    - [ ] Update the text selection handler (likely in `ReaderLayout` or a custom hook) to detect selections.
    - [ ] Add a "Read Aloud" button/icon near the selection popover (or existing highlight menu).
- [ ] Task: Implement Selection Playback
    - [ ] Create a separate flow in `AudioPlayer` to handle "one-off" text chunks.
    - [ ] Ensure "Selection Playback" pauses/interrupts any active "Continuous Playback".
- [ ] Task: Conductor - User Manual Verification 'Highlight-to-Speech' (Protocol in workflow.md)
