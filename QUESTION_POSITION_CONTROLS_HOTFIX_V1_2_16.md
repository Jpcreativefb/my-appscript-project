# Awards App v1.2.16 — Shared Question Position Controls Hotfix

## Why
The first Manage Games ↑/↓ question controls were not reliable enough for production and did not scale to games with 20–30 questions. Awards Manager also needed the same ordering behavior so admins do not learn two different systems.

## Manage Games
- Every question summary shows `#<position>`.
- ↑ and ↓ move one position using the same backend target-position operation.
- Type a destination position and press **Move** or Enter. Example: moving question 29 to position 4 inserts it at #4 and shifts the old #4–#28 down one position.
- The backend atomically rewrites canonical `DisplayOrder` values for the entire game after each move.
- **Collapse All Questions** and **Expand All Questions** make large games easier to scan; collapsed cards hide metadata and keep the question title/position controls prominent.

## Awards Manager
- Review, Sort & Build Questions uses the same visible question position.
- Supports ↑/↓, direct position entry, and desktop drag/drop.
- Collapsed staged-question cards show the question-focused summary; Advanced Settings and Markets / Answers remain inside the expanded card.
- Reordering automatically recalculates the staged display order before build.

## Validation
The regression suite executes the real backend reorder with 30 questions and verifies a direct `#29 → #4` move plus canonical renumbering of all 30 questions.
