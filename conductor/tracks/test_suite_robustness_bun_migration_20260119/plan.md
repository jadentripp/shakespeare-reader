# Implementation Plan - Test Suite Robustness & Bun Migration

## Phase 1: Environment & Tooling Cleanup
- [x] Task: Remove Vitest dependencies (`vitest`, `@vitest/ui`, plugins) from `package.json` and `node_modules`. [5050021]
- [x] Task: Update `package.json` scripts to strictly use `bun test` (e.g., `"test": "bun test"`). [5050021]
- [x] Task: Audit and remove any `vite.config.ts` or `vitest.config.ts` files if they are solely for testing configuration. [5050021]
- [x] Task: Update `src/tests/setup.ts` imports to replace any lingering Vitest globals if present (though `bun:test` should be compatible). [5050021]
- [ ] Task: Conductor - User Manual Verification 'Environment & Tooling Cleanup' (Protocol in workflow.md)

## Phase 2: Global State Isolation & Pollution Fixes
- [ ] Task: Enhance `src/tests/setup.ts` to clear `localStorage` and `sessionStorage` in `afterEach`.
- [ ] Task: Enhance `src/tests/setup.ts` to cleanup DOM (`document.body.innerHTML = ''` or similar) in `afterEach`.
- [ ] Task: Enhance `src/tests/setup.ts` to restore all mocks (`bun.mock.restore()`) in `afterEach`.
- [ ] Task: Refactor `elevenlabs.test.ts` to ensure `mock.module` calls are properly scoped or reset, preventing pollution of other tests.
- [ ] Task: Verify that `useReaderAppearance` tests (localStorage) and `SettingsSidebar` tests (DOM) no longer collide when run together.
- [ ] Task: Conductor - User Manual Verification 'Global State Isolation & Pollution Fixes' (Protocol in workflow.md)

## Phase 3: 3D/WebGL Test Compatibility
- [ ] Task: Create a `src/tests/mocks/webgl.ts` (or similar) to mock `HTMLCanvasElement.prototype.getContext` and `@react-three/fiber` components.
- [ ] Task: Integrate the WebGL mock into `src/tests/setup.ts` so it applies globally or to relevant tests.
- [ ] Task: Run `ThreeDLibraryPage.test.tsx` and other 3D tests to verify they pass without crashing.
- [ ] Task: Conductor - User Manual Verification '3D/WebGL Test Compatibility' (Protocol in workflow.md)

## Phase 4: Final Verification & Cleanup
- [ ] Task: Execute the full test suite (`bun test`) to ensure all tests pass (Green).
- [ ] Task: Execute the test suite with randomization (`bun test --randomize`) to confirm strict isolation.
- [ ] Task: Update project documentation (`README.md`, `AGENTS.md`) to reflect `bun test` as the single source of truth for testing.
- [ ] Task: Conductor - User Manual Verification 'Final Verification & Cleanup' (Protocol in workflow.md)