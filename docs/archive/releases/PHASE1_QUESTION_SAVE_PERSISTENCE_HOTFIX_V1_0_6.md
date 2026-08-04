# Phase 1 Question Save Persistence Hotfix v1.0.6

## Problem

In Admin > Manage Games > Categories / Questions / Nominees, editing an existing question could show "Category saved" but the original question text and other question fields returned after leaving and reopening Game Setup.

## Root cause

The normalized Questions sheet is the canonical source used to rebuild the Game Setup screen. Existing normalized rows used spreadsheet-style field names such as `Question`, `Section`, and `Active`, while the admin form sent JavaScript-style names such as `category`, `section`, and `active`.

The normalized update helper checked the existing spreadsheet value before checking the lower-camel-case admin payload. As a result, the old normalized value won during an update even though the compatibility Categories rows were changed.

## Correction

`backend/engines/NormalizedQuestionStorageEngine.js` now:

- Checks both spreadsheet header names and lower-camel-case payload names before falling back to the existing value.
- Recognizes legacy aliases such as `category`, `name`, `categoryId`, `nominee`, `nomineeId`, `fileId`, and `espnEventId`.
- Applies the same persistence correction to existing answers/options.

## Deployment

This is an Apps Script backend update.

```bash
clasp push
```

If the web app uses a fixed Apps Script deployment version, create and deploy a new version.

No frontend or service-worker cache update is required.

## Retest

1. Open Admin > Manage Games.
2. Open the test game.
3. Select Categories / Questions / Nominees.
4. Add a number to the existing question text.
5. Click Save Question.
6. Leave Game Setup and reopen it.
7. Confirm the changed question remains.
8. Confirm Score Mode remains Staked Points.
9. Run Check again.

## Automated validation

- All 18 regression suites pass.
- JavaScript syntax validation passes across backend, frontend, and tests.
- New regression: `tests/normalized_question_update_persistence_tests.js`.
