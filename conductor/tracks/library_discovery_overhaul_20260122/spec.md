# Track Specification: Library Discovery Overhaul

## Overview
Improve the library's discovery experience by consolidating redundant search views, ensuring the "Most Popular" tab displays actual results by default, and enriching featured collections with more robust search queries.

## Functional Requirements

### 1. Consolidate "Most Popular" and "Search All"
- **Unification:** Remove the "Search All" tab.
- **Immediate Results:** Update the "Most Popular" tab (`collection-popular`) so it fetches and displays books immediately upon selection, rather than showing a "Search the Catalog" prompt.
- **Default State:** "Most Popular" remains the default catalog view. It will display the top-downloaded books from Project Gutenberg (which is the default sort order for the Gutendex `/books/` endpoint).

### 2. Robust Featured Collections
- **Greek Epic:** Update the search query from just "homer" to a broader set of terms including "homer hesiod epic myth" to capture a wider range of classical epic literature.
- **Greek Tragedy:** Ensure the search query captures the major playwrights (Aeschylus, Sophocles, Euripides).

### 3. Expanded Collection Selection
- **New Collections:** Add "Gothic Horror" and "Philosophy" to the horizontal featured collections menu to provide more variety and depth.
- **Alignment:** Ensure the `src/lib/gutenberg.ts` definitions match the backend search keys in `src-tauri/src/gutendex.rs`.

## Technical Changes

### Frontend (`src/lib/gutenberg.ts` & `src/components/library/BauhausHeader.tsx`)
- Update `COLLECTIONS` array:
    - Change `collection-popular` kind to `'collection'`.
    - Remove `collection-all`.
    - Add `collection-gothic` and `collection-philosophy`.
- Update `FEATURED_COLLECTIONS` in `BauhausHeader.tsx` to reflect these changes.

### Backend (`src-tauri/src/gutendex.rs`)
- Update `catalog_base_url` mappings:
    - `greek-epic`: Broaden search query.
    - `greek-tragedy`: Refine search query if necessary.

## Acceptance Criteria
- [ ] Opening the Library defaults to the "Most Popular" tab with a grid of results (no empty search prompt).
- [ ] The "Search All" tab is removed from the horizontal navigation.
- [ ] Selecting "Greek Epic" shows a more diverse set of books beyond just the Iliad/Odyssey.
- [ ] "Gothic Horror" and "Philosophy" appear in the featured collections and return relevant results.
- [ ] Global search still works across all views.
