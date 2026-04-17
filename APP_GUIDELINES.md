# Project Rules for AI Assistant

This document contains strict rules that the AI assistant MUST follow when making changes to this codebase.

## 1. Version Control & Bumping
- **CRITICAL**: Every time a functional change, bug fix, or UI update is made, the version number MUST be incremented by `0.0.1`.
- Update **`App.js`**: Change the `APP_VERSION` constant (e.g., from `V1.3.4` to `V1.3.5`).
- Update **`package.json`**: Change the `"version"` field to match.

## 2. Standardized Layout
- All pages MUST use the static header layout established in `PlayView.js` / `BuilderView.js`.
- NO sticky headers, NO floating cards, NO z-index overlays over the main content.
- Every page must have a solid white header section with consistent padding.

## 3. Database Sync
- Use `snake_case` for database columns (e.g., `maybe_cards`, `removed_history`).
- Always use `StorageService.deleteDeck(id)` for deletions to ensure cloud sync.
