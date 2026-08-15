# Awards App v1.2.16 — Question Drag / Order Reliability Hotfix

## Purpose

Replace the slow per-question reorder workflow with one canonical ordered-list save shared by Manage Games and Awards Manager.

## Manage Games

- Desktop: drag a question by the `⋮⋮` handle and drop it on the destination row.
- Mobile: use the compact position field or the ↑ / ↓ fallback controls.
- Removed the redundant `/ total questions` text and the separate Move button.
- Reordering updates the DOM immediately, then persists the full final order in one request.
- Collapse All / Expand All remains available for scanning long games.

## Backend

- Added `adminSetQuestionOrder` POST action.
- Added batch DisplayOrder persistence that reads CategorySettings once and writes contiguous DisplayOrder ranges together.
- Legacy `adminReorderQuestion` now uses the same persistence helper.
- This removes the previous pattern that reread the entire settings sheet once per question during a reorder.

## Awards Manager

- Uses the same compact position input and drag handle behavior while questions are staged.
- Removed redundant `/ total` text and the separate Move button.
- Desktop drag is handle-only to avoid accidental drags while editing.

## Ranking foundation

The ordered-ID model used here is intentionally reusable for the future Ranking game UI. Ranking picks will still need their own player storage/scoring engine, but the drag/touch ordering interaction can reuse this component pattern.
