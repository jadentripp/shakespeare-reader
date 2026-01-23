# Track Specification: Library Discovery Overhaul

## Overview
Improve the library's discovery experience by ensuring the "Most Popular" tab displays actual results by default and enriching featured collections with more robust search queries.

## Functional Requirements

### 1. Fix "Most Popular" Behavior
- **Immediate Results:** Update the "Most Popular" tab (`collection-popular`) so it fetches and displays books immediately upon selection.
- **Default State:** "Most Popular" remains the default catalog view.

### 2. Robust Featured Collections
- **Greek Epic:** Update search query to "homer hesiod epic myth".
- **Greek Tragedy:** Update search query to "aeschylus sophocles euripides tragedy".

### 3. Expanded Collection Selection
- **New Collections:** Add "Gothic Horror" and "Philosophy" to the featured collections.

## Acceptance Criteria
- [x] Library defaults to "Most Popular" with results visible immediately.
- [x] "Gothic Horror" and "Philosophy" appear in collections.
- [x] Greek collections return more diverse results.
