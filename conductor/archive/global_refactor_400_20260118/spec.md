# Specification - Global 400-Line Limit Refactor

## Overview
The goal of this track is to enforce a strict maintainability limit across the codebase: no source file should exceed 400 lines of code. This refactor will target all current offenders, primarily focusing on `ChatSidebar.tsx`, `MobiBookPage.tsx`, and `tauri.ts`, but also addressing `loader.tsx` and the recently created `useLibrary.ts`.

## Functional Requirements
- **Targeted Decompositions:**
    - **UI Routes/Components (`MobiBookPage`, `ChatSidebar`):** Extract complex state and side effects into custom hooks and decompose massive JSX blocks into smaller, feature-based sub-components.
    - **Library Bridges (`tauri.ts`):** Transition from a single monolithic file to a domain-specific directory structure (e.g., `src/lib/tauri/books.ts`, `src/lib/tauri/gutenberg.ts`).
    - **Hooks & Utilities (`useLibrary.ts`, `loader.tsx`):** Split into smaller, focused modules if they cannot be reduced through logical simplification.
- **Preserve Functionality:** The refactor must not introduce any changes to the existing UI/UX or application logic.
- **Improved Readability:** Ensure all files are under the 400-line threshold.

## Non-Functional Requirements
- **Consistency:** Adhere to the architectural patterns established in the recent Library page refactor.
- **Testability:** Maintain or improve test coverage for all refactored units.
- **Code Quality:** Maintain existing styling and UI behavior using Tailwind CSS and Radix UI.

## Acceptance Criteria
- [ ] No file in `src/` exceeds 400 lines of code.
- [ ] `src/lib/tauri.ts` is replaced by a domain-structured directory.
- [ ] All automated tests pass.
- [ ] Manual verification confirms no regressions in reading, chatting, or library management.

## Out of Scope
- Adding new features or fixing existing bugs (unless they are a direct result of the refactor).
- Refactoring files that are already under the 400-line limit.
