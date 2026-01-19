# Specification: ElevenLabs TTS Integration

## Overview
Integrate ElevenLabs Text-to-Speech (TTS) to transform "AI Reader" into an audiobook player. Users can listen to books seamlessly across pages or select specific text passages to hear them read aloud. This feature enhances accessibility and allows for a "hands-free" reading experience using high-quality AI voices.

## Functional Requirements

### 1. Audio Playback Engine
- **SDK:** Use `@elevenlabs/elevenlabs-js` for audio generation.
- **Continuous Playback:**
    - The player must buffer upcoming text to ensure gapless playback.
    - **Auto-Page Turn:** As narration advances to text on the next page, the reader must automatically turn the page to keep the visual text in sync with the audio.
- **Highlight-to-Speech:**
    - Users can select a specific range of text and trigger a "Read Aloud" action from the context menu or selection toolbar.
    - Playback for this mode stops automatically at the end of the selection.

### 2. User Interface
- **Primary Controls (Header):**
    - Place a "Play/Pause" button and a "Loading/Buffering" indicator in the Reader's top navigation bar (consistent with "Reader Header" pattern).
    - When active, the button toggles between "Play" and "Pause".
- **Voice Selection:**
    - Add a "Voice" dropdown to the existing "Appearance" or "Settings" panel.
    - List standard ElevenLabs voices (e.g., Rachel, Clyde, etc.).
    - Persist the user's choice.
- **API Key:**
    - Add an input field for `ELEVENLABS_API_KEY` in the Settings page (alongside the OpenAI key).

### 3. State Management
- **Sync:** The audio player needs to be aware of the current text content (`readerHtml` or `book` data).
- **Position Tracking:** The system must track which paragraph/sentence is currently being read to trigger the auto-page turn correctly.

## Non-Functional Requirements
- **Latency:** Minimize the delay between clicking "Play" and hearing audio (use streaming if possible, or aggressive pre-fetching).
- **Cost Awareness:** Do not pre-generate audio for the *entire* book at once to save user API credits. Buffer only 1-2 pages ahead.
- **Error Handling:** Gracefully handle invalid API keys or network failures (show a toast notification).

## Acceptance Criteria
- [ ] User can input and save their ElevenLabs API key in Settings.
- [ ] User can click "Play" in the Reader header to start narration from the top of the current page.
- [ ] Audio plays continuously, and the page turns automatically when the narration crosses the page boundary.
- [ ] User can select text -> click "Read Aloud" -> hear only that selection.
- [ ] User can change the narrator voice in Settings.
- [ ] Playback stops immediately if the user navigates away or clicks "Pause".

## Out of Scope
- Word-level highlighting (karaoke style) for the initial version (unless the API makes it trivial with timestamps).
- Offline TTS (using OS voices) as a fallback.
- "Conversational" mode (interrupting the narrator to chat).
