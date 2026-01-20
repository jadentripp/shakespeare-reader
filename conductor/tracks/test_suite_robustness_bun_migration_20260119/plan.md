# Implementation Plan - Fix Test Suite Robustness & Bun Migration

## Phase 1: Fix ElevenLabs Service Mocks & Audio Tests [checkpoint: 2056580]
This phase addresses the critical service mock failures causing the majority of test breakages.

- [x] Task: Analyze and Fix `elevenlabs.test.ts`
    - [x] Read `src/lib/elevenlabs.ts` to understand the actual service interface.
    - [x] Read `src/tests/elevenlabs.test.ts` to identify the broken mock definition.
    - [x] Update the mock to correctly implement `textToSpeech` and `getVoices`.
    - [x] Verify fix by running `bun test src/tests/elevenlabs.test.ts`.
- [x] Task: Fix `audioPlayerEnhanced.test.ts`
    - [x] Ensure the mock fix propagates to this file (or update local mocks if defined separately).
    - [x] Verify fix by running `bun test src/tests/audioPlayerEnhanced.test.ts`.
- [x] Task: Fix `TTSPanelPhase3.test.tsx`
    - [x] Investigate the `undefined` error for `elevenLabsService.getVoices()`.
    - [x] Ensure the component properly handles the mocked service response.
    - [x] Verify fix by running `bun test src/tests/TTSPanelPhase3.test.tsx`.
- [~] Task: Conductor - User Manual Verification 'Fix ElevenLabs Service Mocks & Audio Tests' (Protocol in workflow.md)

## Phase 2: Fix 3D Component Tests [checkpoint: 2408c69]
This phase addresses the rendering issues in React Three Fiber tests.

- [x] Task: Fix `ReadingRoom.test.tsx`
    - [x] Analyze `src/components/three/ReadingRoom.tsx` to verify `data-testid` attributes or mesh naming.
    - [x] Update test queries to correctly target 3D elements (e.g., using `three-test-renderer` patterns or checking how `bun test` handles R3F).
    - [x] Verify fix by running `bun test src/tests/ReadingRoom.test.tsx`.
- [x] Task: Fix `BookMesh.test.tsx`
    - [x] Analyze `src/components/three/BookMesh.tsx` for similar querying issues.
    - [x] Update test expectations to match the actual rendered structure.
    - [x] Verify fix by running `bun test src/tests/BookMesh.test.tsx`.
- [x] Task: Conductor - User Manual Verification 'Fix 3D Component Tests' (Protocol in workflow.md)

## Phase 3: Final Verification [checkpoint: dfa447e]

- [x] Task: Run Full Test Suite
    - [x] Execute `bun test` to ensure all 212 tests pass.
    - [x] Address any regressions if found.
- [x] Task: Conductor - User Manual Verification 'Final Verification' (Protocol in workflow.md)
