# v1.2.17a — Confidence Compact Card + Save All

## Scope
This checkpoint changes the player Confidence workflow only. It does not add Confidence sorting, live-score details, odds/records, Image Packs, or Theme Packs yet.

## Player changes
- Sports Confidence games render as a dense one-row-per-game weekly card.
- City text is small; the team nickname is the dominant label.
- The entire team panel is the winner-selection button.
- Winner and confidence value can be chosen in either order.
- Selecting a winner does not call Apps Script immediately.
- Assigning a confidence value does not call Apps Script immediately.
- Used confidence values disappear from the other dropdowns immediately.
- Clearing/reassigning a value releases it immediately.
- Unsaved selections are kept as a browser-local draft when the server baseline has not changed.
- One `Save All Picks` action writes the changed card in one POST request.
- Confidence picks can be changed until the individual game's lock/kickoff time.
- Selected team stays in color; the unselected team is muted/grayscale.
- Existing correct/wrong result state already receives green/red row treatment.

## Backend changes
- New authenticated POST action: `saveConfidencePicksBatch`.
- The server validates the full intended Confidence assignment before writing anything.
- Confidence-number swaps are supported atomically (for example 16↔15 in one Save All request).
- Existing rows are written in contiguous batches; new rows are appended in one range write.
- Picks caches are cleared once after the batch.
- Sports Confidence Builder now creates future questions with `maxChanges: -1`; kickoff remains the lock.

## Files changed
- backend/Api.js
- backend/engines/PicksEngine.js
- backend/engines/SportsConfidenceBuilderEngine.js
- frontend/api.js
- frontend/js/api.js
- frontend/js/pages/picks.js
- frontend/css/picks.css
- frontend/sw.js
- tests/confidence_compact_batch_v1217a_tests.js
- CONFIDENCE_COMPACT_BATCH_V1_2_17A.md
- CHANGED_FILES_V1_2_17A.txt

## Verification
`bash tools/run_production_checks.sh`

Expected checkpoint result:
- 118 JavaScript files syntax checked
- API/app compatibility mirrors synchronized
- 102 regression tests
- v1.2.16 release/security contract retained
- ALL PRODUCTION CHECKS PASSED
