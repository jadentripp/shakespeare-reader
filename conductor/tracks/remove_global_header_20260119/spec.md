# Specification: Global Header Removal

## Overview
Remove the global application header in `src/App.tsx` to reclaim vertical space. Relocate essential navigation (3D Space, Settings) to a minimalist floating menu.

## Requirements
- Remove the `<header>` element from `AppLayout`.
- Add a minimalist floating navigation component (top-right) for "3D Space" and "Settings".
- Ensure the main content area occupies the full viewport height.
