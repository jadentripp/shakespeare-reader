# Track Specification: Fix Test Suite Robustness & Bun Migration

## Overview
This track focuses on resolving the current test suite failures to ensure a stable and green baseline for future development. The primary goal is to fix 12 failing tests identified across `elevenlabs.test.ts`, `audioPlayerEnhanced.test.ts`, `TTSPanelPhase3.test.tsx`, `ReadingRoom.test.tsx`, and `BookMesh.test.tsx`.

## Functional Requirements
- **Fix ElevenLabs Service Mocks:**
  - Investigate and resolve the `TypeError: elevenLabsService.textToSpeech is not a function` error affecting multiple tests.
  - Ensure the `elevenLabsService` mock correctly implements the expected interface in both unit and component tests.
- **Fix AudioPlayer Tests:**
  - Resolve failures in `audioPlayerEnhanced.test.ts` caused by the service mock failure.
  - Verify that `seek`, `getDuration`, and playback controls are correctly tested.
- **Fix TTSPanel Component Tests:**
  - Fix the crash in `TTSPanelPhase3.test.tsx` where `elevenLabsService.getVoices()` is failing.
- **Fix 3D Component Tests:**
  - Investigate why `ReadingRoom` and `BookMesh` tests are unable to find elements (e.g., `data-testid="floor"`).
  - Update tests to align with current React Three Fiber rendering or testing library patterns.

## Non-Functional Requirements
- **Code Coverage:** Maintain or improve existing code coverage.
- **Performance:** Ensure tests run efficiently without unnecessary delays.
- **Stability:** Eliminate flakiness in the repaired tests.

## Acceptance Criteria
- [ ] executing `bun test` results in **zero** failures.
- [ ] All 12 currently failing tests pass.
- [ ] No existing passing tests are broken by the fixes.

## Out of Scope
- Adding new feature tests (unless required to fix coverage gaps created by refactoring).
- Major refactoring of the application code (focus is on fixing tests/mocks).
