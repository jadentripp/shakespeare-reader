# Specification - LibraryPage Refactor

## Overview
The goal of this track is to refactor `src/routes/LibraryPage.tsx`, which currently exceeds 1,600 lines. The refactor will involve splitting the file into smaller, feature-based components and extracting complex logic into custom hooks. This will improve maintainability, readability, and testability, adhering to a target of fewer than 600 lines for the main route file.

## Functional Requirements
- **Feature-based Component Extraction:** Decompose the UI into distinct components within `src/components/library/` (e.g., `LibrarySearch`, `LibraryGrid`, `LibraryFilters`).
- **Logic Extraction:** Move state management, data fetching (TanStack Query), and side effects into a custom hook (e.g., `useLibrary.ts`).
- **Preserve Functionality:** Ensure all existing features (search, filtering, pagination, book downloading, library management) continue to function exactly as before.
- **Improved Readability:** Reduce `LibraryPage.tsx` to under 600 lines of code.

## Non-Functional Requirements
- **Consistency:** Follow the architectural pattern established in `src/components/reader/`.
- **Testability:** Ensure extracted components and hooks are easily unit-testable.
- **Code Quality:** Maintain existing styling and UI behavior using Tailwind CSS and Radix UI.

## Acceptance Criteria
- [ ] `src/routes/LibraryPage.tsx` is less than 600 lines of code.
- [ ] New components are created in `src/components/library/`.
- [ ] A `useLibrary` hook manages the core logic.
- [ ] All automated tests for the library page pass.
- [ ] Manual verification confirms no regressions in search, filtering, or book management.

## Out of Scope
- Adding new features or changing existing UI/UX design.
- Refactoring other route files (unless directly required for this task).
- Database schema changes.
