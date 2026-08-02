# Phase 1 Question Mode Table Repair v1.0.16

## Why this update is necessary

v1.0.15 inserted `ScoreMode` into the in-code `Questions` header list, while an existing Google Sheet appended the new header at the far right. A newly appended question could therefore place `ScoreMode` under `EntryType` and shift every later value into the wrong column.

The pasted `wagerhybrid` row shows the signature: `EntryType` contains `fixed-points`, `StorageVersion` contains a date, and the final `ScoreMode` cell contains `3`.

## New storage method

`Questions` is restored to its original schema. Question scoring mode is stored in a small dedicated sheet:

- `GameId`
- `QuestionId`
- `ScoreMode`
- `UpdatedAt`
- `Source`

`CategorySettings.ScoreMode` remains a compatibility mirror for existing scoring and settlement engines. The Questions sheet no longer stores ScoreMode.

## One-time repair

After deploying this version, run this function once from the Apps Script editor:

```text
repairQuestionsSheetAfterV115Now
```

The repair:

1. Creates a timestamped backup copy of `Questions`.
2. Creates/backfills `QuestionModes` from `CategorySettings`.
3. Detects games containing the v1.0.15 shifted-row signature.
4. Removes only those games' damaged normalized Question rows.
5. Removes the appended `ScoreMode` column from `Questions`.
6. Rebuilds affected questions from the existing Categories projection.
7. Rebuilds the Questions data index and clears caches.

Do not delete the generated Questions backup until the Hybrid test is complete.

## Deployment order

1. Apply the v1.0.16 changed files.
2. Run the local tests.
3. Run `clasp push`.
4. Create a new Apps Script web-app version if the deployment is versioned.
5. Run `repairQuestionsSheetAfterV115Now` once.
6. Push the frontend to GitHub and wait for Cloudflare.
7. Hard-refresh and reopen the installed PWA.
8. Open the Hybrid test question, select `Wager`, and save it once.
9. Confirm the `QuestionModes` row says `wager`.
10. Leave and reopen Game Setup and confirm the mode remains Wager.

## Expected Questions header after repair

The `Questions` sheet ends with:

```text
PayloadJSON | SourceSystem | CreatedAt | UpdatedAt | StorageVersion
```

It should no longer contain a `ScoreMode` column.
