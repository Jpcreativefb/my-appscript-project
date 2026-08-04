# Awards App Storage & Performance Foundation v2.0

## Purpose

This release normalizes question storage and reduces the amount of spreadsheet data read when a player opens one game. It is an additive migration from Hybrid Game Foundation v1.9.2.

## New canonical storage

The setup creates these sheets:

- `Questions` — one row per question.
- `QuestionOptions` — one row per answer/nominee.
- `DataIndex` — game-to-row indexes for normalized data.
- `ArchiveManifest` — verified archive history.
- `StorageMigrationLog` — migration results and errors.

`CategorySettings` also receives a `GameId` column when missing.

The existing `Categories` sheet remains temporarily for compatibility with older sports, ranking, and voting functions. New questions no longer create blank question-anchor rows in `Categories`.

## Performance changes

The main player paths now use game-scoped reads:

- Questions and answers
- Category settings
- Category results
- Picks
- Bets/wagers
- Betting odds/category details

Large transaction sheets are filtered by `GameId` before full rows are read. Bulk answer creation updates normalized storage in one batch and rebuilds its index once.

## Migration behavior

Migration is merge-safe:

- Existing normalized question fields are not overwritten by a later legacy sync.
- Existing normalized-only answers are preserved.
- Legacy rows are used to seed normalized storage and remain a compatibility projection.
- Ambiguous `CategorySettings` rows with blank `GameId` are reported rather than guessed.

## Storage health panel

Admin includes:

- **Setup / Migrate Storage**
- **Check Storage Health**
- Per-game question, answer, and legacy-row counts
- Largest tracked sheets by active cell count
- Estimated percentage of the 10-million-cell spreadsheet limit

## Archive foundation

**Archive Data Copy** creates or reuses `AwardsAppArchive_<year>` and copies:

- Games
- Questions
- QuestionOptions
- Categories compatibility rows
- CategorySettings
- CategoryResults
- Picks
- Bets

Every entity is verified using both row counts and content hashes. The result is recorded in `ArchiveManifest`.

A failed verification never removes source rows. Backend MOVE mode additionally requires explicit confirmation and refuses to move a game with unresolved active questions.

## Deployment

1. Confirm the current branch is `architecture-cleanup`.
2. Replace the files in the changed-files package.
3. Run `clasp push`.
4. Create a new Apps Script web-app deployment version.
5. Commit and push the frontend files to `architecture-cleanup`.
6. After Cloudflare deploys, hard-refresh the app.
7. Run once in Apps Script:

```javascript
setupNormalizedQuestionStorage({
  migrateExisting: true,
  force: false
});
```

Alternatively, use **Admin → Tools → Setup / Migrate Storage**.

## First production test

Use a test game first:

1. Run storage setup.
2. Confirm `Questions`, `QuestionOptions`, `DataIndex`, `ArchiveManifest`, and `StorageMigrationLog` exist.
3. Open Game Setup and confirm questions/answers load normally.
4. Create and clone one question and answer.
5. Make and settle one test pick.
6. Run **Check Storage Health**.
7. Run **Archive Data Copy** for the test game.
8. Open the archive spreadsheet and compare the manifest counts.

Do not manually delete `Categories` yet. It remains part of the compatibility layer in this release.
