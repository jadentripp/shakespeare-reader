# Track Specification: Test Suite Robustness & Bun Migration

## 1. Overview
**Goal:** Stabilize the test suite by eliminating state pollution (localStorage, DOM, Mocks) and finalizing the migration to `bun test` as the sole test runner, removing the `vitest` dependency.

**Problem:**
- **Pollution:** Tests leak state (localStorage, DOM nodes, Module mocks) into each other, causing false positives/negatives when run in parallel or sequence.
- **Environment:** Some tests (Three.js/R3F) fail due to the lack of WebGL in the `happy-dom` environment.
- **Tooling:** The project currently lists both `bun test` and `vitest`, creating confusion and redundancy.

**Scope:**
- `src/tests/` directory
- `package.json` (removing vitest)
- `src/tests/setup.ts` (global cleanup configuration)
- `vite.config.ts` (if it contains test-specific config to be removed)

## 2. Functional Requirements

### 2.1 Test Environment & Tooling
- **Primary Runner:** `bun test` MUST be the only test runner.
- **Dependency Removal:** Remove `vitest`, `@vitest/ui`, and related Vitest plugins from `package.json`.
- **Command Update:** Ensure `bun run test` executes `bun test`.

### 2.2 Global State Isolation (The "Clean Slate" Rule)
- **Automatic Cleanup:** The test setup (`setup.ts`) MUST automatically:
  - Clear `localStorage` and `sessionStorage` after every test.
  - Unmount/cleanup the DOM (reset `document.body`) after every test.
  - Restore all mocks (`bun.mock.restore()`) after every test.
- **Mechanism:** Use `beforeEach` and `afterEach` hooks in `setup.ts` to enforce this globally.

### 2.3 3D/WebGL Test Handling
- **Strategy:** Mock the graphics layer for Three.js/R3F tests.
- **Implementation:**
  - Mock `HTMLCanvasElement.prototype.getContext` to return a dummy context.
  - If necessary, mock `@react-three/fiber`'s `Canvas` component to render children without invoking WebGL.

### 2.4 Specific Pollution Fixes
- **Module Mocks:** Ensure all `mock.module()` calls are scoped or reset so they don't affect subsequent test files.
- **DOM Leaks:** Verify `SettingsSidebar` and similar component tests do not leave residual elements in the DOM.

## 3. Non-Functional Requirements
- **Performance:** Test execution speed should not significantly degrade due to cleanup hooks.
- **Reliability:** `bun test` (run all) must pass 100% consistently on the local machine.
- **Maintainability:** configuration should be centralized in `setup.ts` rather than duplicated in every test file.

## 4. Acceptance Criteria
- [ ] `bun run test` passes all tests successfully.
- [ ] `vitest` is removed from `package.json` and `node_modules`.
- [ ] Randomly running test files in different orders (using `bun test --randomize` if available, or manual selection) yields consistent results.
- [ ] Three.js tests pass without WebGL errors.
- [ ] No "cleanup" code (like `localStorage.clear()`) is required inside individual test files (it's handled globally).

## 5. Out of Scope
- Refactoring application logic (Dependency Injection) to improve testability (unless strictly necessary to unblock a test).
- Adding new feature tests (focus is only on making existing tests robust).