# Awards App Storage and Archive v2.1.0

## Production Archive and Historical Profiles

This release completes the production cleanup of the normalized storage, archive, restore, and historical-profile foundation.

## Included

### Archive lifecycle status

Manage Games now displays one of these statuses for each game:

- Not archived
- Verified copy
- Copy outdated
- Archived
- Restored

The status dashboard reads the Games sheet and ArchiveManifest only once per request, avoiding one Spreadsheet call per game.

### Current manifest record

ArchiveManifest now adds:

- Current
- SupersededByArchiveId
- SupersededAt
- LifecycleVersion

The newest verified COPY, MOVE, or RESTORE becomes the current lifecycle record. Older verified records remain intact as audit history and are marked non-current and superseded.

Opening Manage Games automatically normalizes existing pre-v2.1.0 manifest rows. No manual sheet migration is required.

### Archived Games browser

A read-only Archived Games page is available from:

- Profile → Archived Games
- Admin → Manage Games → Archived Games

The page includes:

- Search by game name, year, or GameId
- Final prediction leaderboard
- Final wager standings
- Any user's archived picks
- Winning answers and pick status
- Archived question, pick, result, and bet counts

### Public career summaries

Leaderboard player names are now selectable. The career popup shows:

- Archived games played
- Accuracy
- First-place finishes
- Longest correct-pick streak
- Fun facts
- Recent archived-game finishes

### Security

Archived games, picks, leaderboards, and career history now require a valid signed-in session token.

The archive dashboard requires an admin session token.

### Performance

Career history groups games by yearly archive spreadsheet. Each archive workbook is opened and read once per request, instead of rereading all archive tabs for every game.

Game archive badges use bulk Games and ArchiveManifest maps instead of repeated per-game sheet reads.

## Backward compatibility

- Existing ArchiveManifest rows remain valid.
- Blank Current values are treated as legacy rows until normalized.
- COPY, MOVE, RESTORE, and profile history remain compatible with v2.0.8 data.
- No normalized-storage migration needs to be rerun.
- Existing AwardsAppArchive_2026 remains the archive source.

## Live deployment checklist

1. Replace the changed files.
2. Run `clasp push`.
3. Create a new version of the existing Apps Script web-app deployment.
4. Commit and push `architecture-cleanup`.
5. Wait for Cloudflare Pages deployment.
6. Hard-refresh with Command + Shift + R.
7. Open Manage Games once. This adds and normalizes the new ArchiveManifest lifecycle columns.
8. Confirm archive badges appear.
9. Open Profile → Archived Games.
10. Open a historical game and select several leaderboard users.
11. Open the normal leaderboard and select a player's Career stats.

## Important

The automated suite verifies code behavior and integration structure locally. The Google Sheets/Apps Script deployment still requires the controlled live checklist above.
