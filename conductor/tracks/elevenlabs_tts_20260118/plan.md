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

## Phase 2: Core Playback Engine (Streaming) [checkpoint: 90f8071]
Build the logic for fetching audio, playing it, and managing the queue.

- [x] Task: Implement Audio Stream Manager 5db8136
    - [ ] Create a `AudioPlayer` class or hook that handles:
        - Fetching audio streams for a given text chunk.
        - Buffering (playing one chunk while fetching the next).
        - Handling Play/Pause/Stop states.
- [x] Task: Integrate with Reader Content 2e5a376
    - [ ] Connect the `AudioPlayer` to the `ReaderLayout` or `useMobiReader` context.
    - [ ] Implement a function `getPageText(pageIndex)` to extract clean, narrative text from the current page's HTML.
- [x] Task: Conductor - User Manual Verification 'Core Playback Engine (Streaming)' (Protocol in workflow.md) 90f8071

## Phase 3: UI Integration & Page Turning [checkpoint: a68a1b9]
Connect the playback engine to the user interface and implement the auto-page turn logic.

- [x] Task: Add Playback Controls 9c37eb7
    - [ ] Add a "Play/Pause" button to the `ReaderHeader` component.
    - [ ] Wire the button to the `AudioPlayer` states.
    - [ ] Add a visual indicator (spinner) for buffering states.
- [x] Task: Implement Auto-Page Turn 37e8222
    - [ ] Logic: When the audio for `Page N` finishes:
        - Trigger `goToNextPage()`.
        - Automatically fetch and start playing audio for `Page N+1`.
- [x] Task: Voice Selection UI f59f026
    - [ ] Fetch the list of available voices from ElevenLabs API.
    - [ ] Add a dropdown to the `AppearancePanel` or `SettingsPage` to select the preferred voice ID.
- [x] Task: Conductor - User Manual Verification 'UI Integration & Page Turning' (Protocol in workflow.md) a68a1b9

## Phase 4: Highlight-to-Speech
Allow users to select specific text for targeted narration.

- [x] Task: Add Context Menu Action 693ab82
- [x] Task: Implement Selection Playback 693ab82
    - [ ] Create a separate flow in `AudioPlayer` to handle "one-off" text chunks.
    - [ ] Ensure "Selection Playback" pauses/interrupts any active "Continuous Playback".
- [ ] Task: Conductor - User Manual Verification 'Highlight-to-Speech' (Protocol in workflow.md)
