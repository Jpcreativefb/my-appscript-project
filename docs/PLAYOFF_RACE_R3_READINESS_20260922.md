# Playoff Race R3 production readiness — 2026-09-22

## Status
NOT READY for production. The existing synthetic backend is accessible and its Script/Sheet identities match. Google setup is complete; actual browser Draft/Finalize acceptance awaits the owner's race-owner login at http://127.0.0.1:8796/. No production writes, reset, merge, push, or deployment were performed.

Current production is architecture-cleanup commit 5ee7215ae82a8f6d5b32027d29040bf314007cd1 and Apps Script version 406. Cloudflare production deployment 33f69db8-7e97-4870-9b27-98da7adc83a6 reports source 5ee7215; the canonical page serves the R3 integration loader. Preserve this release as the rollback baseline.

## Confirmed integration causes
- Cloudflare preview contains frontend 295d0ad, but its Apps Script target remains v405 (Confidence checkpoint 123ea46). Production is now v406 (Visual Studio checkpoint 5ee7215), which must be preserved.
- Preview Playoff Race writes are deliberately blocked because that preview shares production data. Preserve that guard.
- The production game is inactive/Status Draft. Category and game lock flags are false. Timing currently resolves to Week 2.
- The actual R3 finalization path called the old late-entry formula: Week 3 finalized at 85% although the R3 preview/helper advertised 100%. One line now selects the existing game-aware original multiplier.

## Additional validation
New test: tests/nfl_playoff_race_finalization_integration_r3_tests.js.
It invokes the actual Finalize-to-save path with storage/timing dependencies mocked: original Weeks 3/4/5/10, rates 100/95/90/65%; moving rank 1 to 3 reduces all three displaced teams to 85% in Week 4; other teams retain 100%; original snapshot is preserved; Week 5 adjustment is rejected.
The test failed on 295d0ad (85% instead of 100%) and passed with the correction.
This does not replace actual browser persistence acceptance. Previously completed broad tests were not repeated.

## Exact proposed production reset — NOT EXECUTED
Spreadsheet: AwardsAppBackend, 1py9-zQIAp2aSl9oK6oyH8UQ6151m2mSE2TmwoyXWveY.
Only account found in this game's ballots/snapshots: testuser.
GameId for every proposed row: nfl-playoff-race-2026.

1. RankingEntries!A2:H33: 32 ballots, testuser only.
   - Rows 2–17: afc-playoff-seeds, ranks 1–16: bal, buf, cin, cle, den, kc, mia, hou, ind, jax, ne, nyj, pit, ten, lv, lac.
   - Rows 18–33: nfc-playoff-seeds, ranks 1–16: ari, atl, car, chi, dal, tb, det, gb, la, min, no, nyg, phi, sea, sf, was.
2. NflForecastSnapshots!A2:K4: three snapshots, testuser only.
   - Row 2: AFC original, 4688e131-2eff-4de2-8b9e-c8d8bee91c9b, effective week 0, multiplier 1, inactive, 2026-09-18T16:08:01.312Z, legacy-ranking-migration.
   - Row 3: NFC original, 87ed680c-39f2-4402-b05c-e48a551ba9b7, effective week 0, multiplier 1, active, 2026-09-18T16:08:03.027Z, legacy-ranking-migration.
   - Row 4: AFC update, 27d4e55e-39e1-4a90-814e-70f16ffca64c, effective week 2, multiplier 1, active, 2026-09-18T18:10:20.066Z, player-checkpoint-update.
3. No NflForecastDrafts sheet exists in production; no Draft deletion is presently proposed.

Both ballots and snapshots must be cleared together after approval: retained ballots can be migrated back into snapshots by a state read. Never delete by age. Re-read and match game/account/forecast IDs immediately before the approved operation; stop if new records appear. Clear exact contents rather than deleting unrelated sheet rows. Preserve all accounts, categories, other games and player data.

Read-only raw backup: /Users/joel/PATTC-Football-R3-backups/production-reset-inventory-20260922.json
SHA-256: 81fb239f9523af099ec9f1583da9ea443414dfc66c845999e9f310f5cb9bd0c7
Contains exact raw cells and headers for the proposed rows plus relevant current settings. Refresh backup immediately before any approved mutation.

### Settings requiring a separate approval
- Games row 13: Active FALSE, Status Draft; archived FALSE; lockAllPicks/votingLocked/resultsFinalized FALSE. Opening the game requires explicit approval to change Active/Status.
- CategorySettings rows 136 and 137: both conference Locked FALSE, no lock date. Preserve these open flags.
- NflPlayoffRaceSettings row 2: SeasonStartDate 2026-09-17; CurrentWeekMode auto; CurrentWeekOverride 2; UpdateWindowMode auto; UpdateWindowWeek 2; MultiplierOverride 1.
- For an explicitly approved fresh Week 3 start, use CurrentWeekMode override and CurrentWeekOverride 3; leave adjustment window closed during Week 3 and clear stale manual window/multiplier overrides. Agree on the automatic calendar before returning to auto timing. Do not silently alter dates.
- Preserve categories/nominees and NFL Cup relationship/weight. No category rebuild is proposed.

## Home Hub correction
Automatic Home enrichment was starting getDashboardGamesHub(fastStartup:false), then getMyLeagues and leaderboards even without an explicit request. These optional calls are now initiated by Load progress and standings, with a local loading/error status. Initial Home retains the existing authenticated fastStartup:true path and server-filtered game availability. Career Stats remains opt-in; session validation is unchanged. A stale response cannot change the destination after navigation. Route/cache versions are updated in both app.js mirrors and app.html.

Focused tests passed:
- nfl_playoff_race_finalization_integration_r3_tests.js (new)
- dashboard_optional_details_r3_tests.js (new)
- dashboard_career_lazy_r1_tests.js (directly affected)
- nfl_playoff_race_per_team_r3_tests.js (directly affected)
- JavaScript syntax and git diff whitespace checks

Browser acceptance still pending; do not infer real server persistence from these unit tests.

## Local combined release candidate
Worktree: /Users/joel/PATTC-Football-Studio-Integration-R3
Branch: codex/football-r3-preserve-studio-20260922
Base: 5ee7215. Football patches are applied locally; no branches were merged.
Includes Confidence 123ea46, Home Hub + Playoff Race 295d0ad and the targeted corrections.
Conflicts in frontend/app.html and functions/api/app.js were combined explicitly: Studio R3 loader/production flag and Preview appearance-write guard remain, together with football cache versions and Preview ranking-write guards.

Combined-candidate validation passed:
- owner_visual_studio_r3_production_integration_tests.js
- nfl_playoff_race_preview_route_tests.js
- nfl_playoff_race_finalization_integration_r3_tests.js
- dashboard_optional_details_r3_tests.js
- git diff --check
- Studio editor/core/demo and AppearanceEngine match 5ee7215 byte-for-byte.
- NFL Cup engine/frontend match 5ee7215 byte-for-byte.
- Confidence PicksEngine/picks frontend match 295d0ad byte-for-byte.

The restored Apps Script HEAD backup is preserved at /Users/joel/Awards-App-Updates/backups/apps-script-before-studio-r3-20260922-015224. Football differs in Api.js, core/ApiSecurity.js, engines/RankingGameEngine.js and engines/NflPlayoffRaceEngine.js. No upload was made to that project. Re-read HEAD and deployment versions before any future upload.

## Acceptance environment — private local artifacts only
Existing synthetic deployment and identities are recorded in /private/tmp/pattc-playoff-r3-isolated-20260922/backend/RaceTestBoundary.js and .clasp.json. The synthetic project is distinct from production and uses a new blank Sheet with only synthetic users/teams. Google setup has succeeded. All external Sheet access/network calls are blocked in the isolated copy; original session authorization remains active. No production player data was copied.
Local UI: /private/tmp/pattc-playoff-r3-browser-20260922 on 127.0.0.1:8796. Every POST checks the remote Script/Sheet identity. Production and legacy fallback URLs are replaced only in this temporary copy.
Do not copy the boundary, credentials, isolated URLs or fixture IDs into the release candidate. Do not repeat Google setup or create another project.

## Deployment and rollback — explicit approval required
1. Finish synthetic browser acceptance: save AFC Draft, reload/restore and edit it; verify no official snapshot or multiplier; save NFC independently; finalize Week 3 originals at 100%; validate later-entry and adjustment behavior while preserving official forecasts until adjustment finalization. Verify initial Home navigation and optional-detail failures do not block games.
2. Review/approve the separate football checkpoint and this combined candidate based on 5ee7215. Recheck live branch heads, deployments and current Apps Script HEAD; preserve a fresh HEAD backup. Never upload the football-only checkout over Studio production.
3. After explicit approval, commit/integrate the combined candidate into architecture-cleanup using normal history-preserving Git operations. No force push or branch replacement. Run the focused integration checks on the exact resulting source.
4. From the combined release source only, upload/version the matching Apps Script backend and update the existing production deployment currently at 406. Then release the matching Cloudflare frontend/Pages Functions through the production pipeline. Keep deployment URLs and preview write guards unchanged. Check the release contains no synthetic endpoint/Sheet/PIN/boundary.
5. Obtain separate explicit approval for the exact testuser reset and Week 3 game-opening/timing settings listed above. Re-read matching records, refresh the private backup, and stop if new legitimate submissions exist. Use a coordinated maintenance window so state reads cannot remigrate retained ballots between reset operations. Do not alter Visual Studio appearance rows, Drafts, Published layouts, user accounts, categories or other games.
6. Verify production Home, Confidence, NFL Cup, Studio access and Playoff Race availability read-only. Record matching backend version and Cloudflare deployment ID.

Rollback: restore the production web deployment to Apps Script version 406 and roll Cloudflare back to deployment 33f69db8-7e97-4870-9b27-98da7adc83a6 (5ee7215). Do not roll back to 2520543/123ea46/295d0ad. Preserve R3 data tables and all player/appearance data; code rollback is separate from any record restoration. Restore only exact backed-up reset rows after separate approval and after checking for newly submitted forecasts. Preserve/restore the previously backed-up development HEAD independently from the deployed version.

Do not mark this release accepted until browser acceptance and owner approvals are complete.
