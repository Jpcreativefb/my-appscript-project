# API Contract

This document describes the current working API contract between:

```txt
Cloudflare Frontend
        ↓
Apps Script API
        ↓
Google Sheets
```

The API is currently served by:

```txt
backend/Api.js
```

Main Apps Script entry point:

```js
function doGet(e)
```

Current default game:

```txt
oscars-2026
```

---

## General Notes

The API currently uses GET requests with query parameters.

Example:

```txt
?action=getCategories&gameId=oscars-2026
```

The frontend API wrapper lives in:

```txt
frontend/js/api.js
```

Frontend config lives in:

```txt
frontend/js/config.js
```

The current response format is mixed:

```txt
Some endpoints return arrays directly.
Some endpoints return objects.
Some endpoints include success true/false.
```

Do not change response shapes without updating both this file and the frontend API/page code.

---

## Endpoint: API Health / Default

### Request

```txt
?action=
```

or no action.

### Response

```json
{
  "success": true,
  "message": "API running",
  "gameId": "oscars-2026"
}
```

### Notes

Used to confirm the Apps Script deployment is reachable.

---

## Endpoint: Login

### Request

```txt
?action=login&username=TEST_USER&pin=TEST_PIN
```

### Frontend Function

```js
apiLogin(username, pin)
```

### Current Response Shape

Success response includes:

```json
{
  "success": true,
  "username": "TEST_USER"
}
```

There may be additional fields depending on backend user data.

Failure response:

```json
{
  "success": false,
  "message": "Invalid login"
}
```

or:

```json
{
  "success": false,
  "message": "Missing username or PIN"
}
```

### Frontend Usage

Login stores the returned object as session data.

Current session flow:

```txt
auth.js → setSession(res)
state.js → APP_STATE.session
app.js → auth guard
```

Important:

```txt
The login response must include username at the root level.
```

---

## Endpoint: Get Categories

### Request

```txt
?action=getCategories&gameId=oscars-2026
```

### Frontend Function

```js
apiGetCategories(gameId)
```

### Current Response Shape

This endpoint currently returns an array directly:

```json
[
  {
    "gameId": "oscars-2026",
    "id": "best-picture",
    "name": "Best Picture",
    "section": "Oscars",
    "image": "https://...",
    "displayOrder": 1,
    "layoutType": "image",
    "shortName": "Picture",
    "locked": true,
    "lockDateTime": "2027-03-15T01:30:00.000Z",
    "points": 20,
    "maxChanges": 4,
    "changePenalty": 4,
    "countsAsStatue": true,
    "scoreVersion": "",
    "winnerNomineeId": "",
    "favoriteNomineeId": "",
    "groupId": "Feature Films",
    "parentCategoryId": "",
    "followUpCategoryId": "",
    "followUpMapJSON": "",
    "predictionGame": true,
    "communityRank": true,
    "nominees": [
      {
        "id": "bugonia",
        "name": "Bugonia",
        "shortAnswer": "Bugonia",
        "movieId": "bugonia-2026",
        "movie": "Bugonia",
        "person": "",
        "image": "https://..."
      }
    ]
  }
]
```

### Frontend Usage

Used by:

```txt
frontend/js/pages/picks.js
frontend/js/pages/dashboard.js
```

Frontend currently supports direct array response:

```js
const categories =
  Array.isArray(categoriesRes)
    ? categoriesRes
    : categoriesRes.categories || [];
```

### Verified Behavior

```txt
Returns 46 categories for oscars-2026.
Categories include nominees.
Some categories may be locked.
Missing images are handled by frontend CSS.
```

---

## Endpoint: Get My Picks

### Request

```txt
?action=getMyPicks&username=TEST_USER&gameId=oscars-2026
```

### Frontend Function

```js
apiGetMyPicks(username, gameId)
```

### Current Response Shape

```json
{
  "picks": {
    "best-picture": "bugonia"
  },
  "changeCounts": {
    "best-picture": 0
  },
  "originalPicks": {
    "best-picture": "bugonia"
  }
}
```

If user has no picks:

```json
{
  "picks": {},
  "changeCounts": {},
  "originalPicks": {}
}
```

Error example:

```json
{
  "error": true,
  "message": "Error message"
}
```

### Frontend Usage

Used by:

```txt
frontend/js/pages/picks.js
frontend/js/pages/dashboard.js
```

Current picks are stored in:

```js
APP_STATE.picks
```

---

## Endpoint: Save Pick

### Request

```txt
?action=savePick&username=TEST_USER&categoryId=best-picture&nomineeId=bugonia&gameId=oscars-2026
```

### Frontend Function

```js
apiSavePick(username, categoryId, nomineeId, gameId)
```

### Current Success Response Shape

New or changed pick:

```json
{
  "success": true,
  "gameId": "oscars-2026",
  "categoryId": "best-picture",
  "nomineeId": "bugonia",
  "originalNomineeId": "bugonia",
  "changeCount": 0
}
```

Already saved pick:

```json
{
  "success": true,
  "message": "Pick already saved",
  "gameId": "oscars-2026",
  "categoryId": "best-picture",
  "nomineeId": "bugonia",
  "originalNomineeId": "bugonia",
  "changeCount": 0
}
```

Locked category:

```json
{
  "success": false,
  "message": "Category is locked"
}
```

Change limit reached:

```json
{
  "success": false,
  "message": "Change limit reached",
  "changeCount": 4,
  "maxChanges": 4
}
```

### Verified Behavior

```txt
New pick inserts a row.
Changed pick updates the existing row.
Changed pick does not append duplicate rows.
ChangeCount increments when nominee changes.
LastUpdated updates when nominee changes.
Locked categories reject saves.
```

### Important Backend Rule

Existing picks are matched by:

```txt
GameId + Username + CategoryId
```

If a matching row exists, the row must be updated in place.

Do not append duplicate rows for changed picks.

### Related Backend Files

```txt
backend/engines/PicksEngine.js
backend/repositories/PicksRepo.js
backend/services/AppCache.js
```

---

## Endpoint: Leaderboard

### Request

```txt
?action=leaderboard&gameId=oscars-2026
```

### Frontend Function

```js
apiLeaderboard(gameId)
```

### Current Response Shape

This endpoint currently returns an array directly:

```json
[
  {
    "user": "TestUser",
    "total": 0,
    "remaining": 4,
    "max": 4,
    "statues": 0,
    "eliminated": false,
    "winChance": 100
  },
  {
    "user": "Stacey",
    "total": 0,
    "remaining": 28,
    "max": 28,
    "statues": 0,
    "eliminated": false,
    "winChance": 100
  }
]
```

### Frontend Usage

Used by:

```txt
frontend/js/pages/leaderboard.js
frontend/js/pages/dashboard.js
```

Frontend currently supports direct array response:

```js
const rows =
  Array.isArray(res)
    ? res
    : res.leaderboard || [];
```

### Verified Behavior

```txt
Leaderboard renders on Cloudflare.
Dashboard reads user rank from leaderboard.
```

---

## Endpoint: User Breakdown

### Request

```txt
?action=userBreakdown&username=TEST_USER&gameId=oscars-2026
```

### Current Response Shape

Expected to return an array of category-level user scoring details.

Example expected shape:

```json
[
  {
    "category": "best-picture",
    "pick": "bugonia",
    "winner": "",
    "status": "pending",
    "points": 20,
    "originalNomineeId": "bugonia",
    "changeCount": 0
  }
]
```

### Status

```txt
Backend route exists.
Frontend is not currently wired to this endpoint.
Needs future verification before production use.
```

---

## Frontend API Wrapper

File:

```txt
frontend/js/api.js
```

Current core behavior:

```txt
Builds URL from CONFIG.API_URL.
Adds action query parameter.
Adds provided params.
Fetches response.
Parses JSON.
Logs API request.
Handles non-JSON response safely.
Returns { success:false, message:"Network error" } on fetch failure.
```

Current frontend API functions:

```js
apiLogin(username, pin)
apiGetCategories(gameId)
apiGetMyPicks(username, gameId)
apiSavePick(username, categoryId, nomineeId, gameId)
apiLeaderboard(gameId)
getPicks(username)
```

`getPicks(username)` is a temporary legacy alias for `apiGetMyPicks`.

---

## Current Verified Frontend API Consumers

```txt
frontend/js/pages/dashboard.js
frontend/js/pages/picks.js
frontend/js/pages/leaderboard.js
frontend/js/auth.js
```

---

## Known Contract Inconsistencies

The API currently has mixed response shapes.

Array responses:

```txt
getCategories
leaderboard
```

Object responses:

```txt
login
getMyPicks
savePick
userBreakdown
default health response
```

Future standardization may use:

```json
{
  "success": true,
  "data": {}
}
```

But do not change this until frontend and backend are updated together.

---

## Current Production-Safe Rule

Before changing any API response shape:

```txt
1. Update this API_CONTRACT.md file
2. Update backend endpoint
3. Update frontend API wrapper
4. Update frontend page consumers
5. Test direct backend URL
6. Test local frontend
7. Test Cloudflare frontend
8. Commit and push
```

---

## Manual Test Checklist

### Backend Direct URL Tests

```txt
?action=getCategories&gameId=oscars-2026
?action=leaderboard&gameId=oscars-2026
?action=login&username=TEST_USER&pin=TEST_PIN
?action=getMyPicks&username=TEST_USER&gameId=oscars-2026
?action=savePick&username=TEST_USER&categoryId=TEST_CATEGORY&nomineeId=TEST_NOMINEE&gameId=oscars-2026
```

### Frontend Tests

```txt
Login works
Dashboard loads
Dashboard stats load
Picks loads categories
Picks loads saved selections
Changing picks saves successfully
Picks sheet updates existing row
Leaderboard loads
Refresh keeps session and saved picks
Logout clears session
```

---

## Future API Improvements

Possible future improvements:

```txt
Add Cloudflare Worker API proxy
Move all write operations to POST
Standardize responses to { success, data, error }
Add profile endpoint
Add dashboard summary endpoint
Add admin-only endpoints
Add stronger auth/session token validation
Add API versioning
```
---

## Archived History and Production Archive Endpoints (v2.1.0)

All archived-history endpoints require a valid session token.

### Get Archived Games

```txt
?action=getArchivedGamesHistory&token=SESSION_TOKEN
```

Returns the current verified archive snapshot for each game, including lifecycle status, verification time, and entity counts.

### Get Archived Game History

```txt
?action=getArchivedGameHistory&gameId=GAME_ID&username=USERNAME&token=SESSION_TOKEN
```

Returns read-only archived leaderboards, wagers, results, and the selected user's historical picks.

### Get User Career History

```txt
?action=getUserProfileHistory&username=USERNAME&token=SESSION_TOKEN
```

Returns career totals, archived game summaries, accuracy, streaks, finishes, wager results, and fun facts.

### Admin Archive Dashboard

```txt
?action=adminGetArchiveDashboard&username=ADMIN&token=ADMIN_TOKEN
```

Admin-only. Returns one archive-status item per configured game. The dashboard reads the Games and ArchiveManifest sheets once per request and normalizes old manifest rows so exactly one verified lifecycle record is marked current for each game.

---

## Sports Player Props v1 admin actions

These Awards App actions require a valid administrator session. The Awards App backend calls the separate Sports Scores Engine through the existing server-side Sports Admin bridge; the Sports Scores Engine admin key is never returned to the browser.

### `adminGetSportsPlayerPropPlayers`

Parameters:

- `league`: `mlb` or `nfl`
- `sport`: `baseball` or `football`
- Optional `team`, `search`, and `limit`

Returns active synced players plus the supported stat types for the league.

### `adminGetSportsPlayerPropStatTypes`

Parameters:

- `league`: `mlb` or `nfl`
- `sport`: `baseball` or `football`

Returns the supported settlement statistic keys and labels.

### `adminCreateSportsPlayerProp`

Required parameters:

- `awardsGameId`
- `sportsGameId` or `espnEventId`
- `league`
- `sport`
- `sportsPlayerId`
- `sportsStatType`
- `sportsPropLine`

Optional parameters:

- `overOdds` (default `1.91` decimal)
- `underOdds` (default `1.91` decimal)

Creates one wager category with `Over` and `Under` nominees and writes the player/game/stat references to `Categories` and `CategorySettings`.

### `adminSettleSportsPlayerProps`

Parameters:

- `gameId` or `awardsGameId`
- Optional `force`
- Optional `refreshStats`

Reads final rows from `SportsPlayerGameStats`, settles Over or Under, and records an exact-line result as a push/refund.

---

## Sports Player Matchups v1 admin actions

Player matchups compare one statistic across two to twelve players from the same MLB or NFL game. They may be created as a wager (`Bets`) or a normal prediction (`Picks`).

### `adminCreateSportsPlayerMatchup`

Required parameters:

- `awardsGameId`
- `sportsGameId` or `espnEventId`
- `league`: `mlb` or `nfl`
- `sport`: `baseball` or `football`
- `sportsStatType`
- `questionMode`: `wager` or `prediction`
- `playersJSON`: JSON array containing at least two player objects

Each player object supports:

- `playerId`
- Optional `espnPlayerId`
- Optional `odds` for wager matchups

Optional parameters:

- `categoryName`
- `points` for prediction matchups
- `defaultOdds` for wager matchups

Creates one category with one nominee row per selected player. Wager matchups write selections to `Bets`; prediction matchups write selections to `Picks`.

### `adminSettleSportsPlayerMatchups`

Parameters:

- `gameId` or `awardsGameId`
- Optional `force`
- Optional `refreshStats`

Compares the selected players' final `SportsPlayerGameStats` values. The highest value wins. A tie settles as `push`; wagers refund and prediction questions award no winner.

## Advanced Sports Stat Questions v1.2

Admin actions:

- `adminGetSportsAdvancedQuestionOptions`
  - Inputs: `league`, `sport`
  - Returns supported player/team stat types, checkpoints, question kinds, and threshold operators.
- `adminCreateSportsAdvancedQuestion`
  - Inputs: `awardsGameId`, `questionMode`, `questionKind`, `entitiesJSON`, `sportsStatType`, `checkpointType`, optional threshold/operator/odds/points/categoryName.
  - Supports players and teams from one or multiple games in the same league.
- `adminSettleSportsAdvancedQuestions`
  - Inputs: `gameId`/`awardsGameId`, optional `force`, `refreshStats`.
- `adminSetupSportsAdvancedStats`
- `adminRefreshSportsAdvancedStats`
  - Inputs: a specific `sportsGameId`/`espnEventId`, or league/sport/date-window controls.
- `adminGetSportsAdvancedStatsStatus`

Sports Scores Engine read-only actions:

- `getSportsTeamGameStats`
- `getSportsStatCheckpoints`

Checkpoint precision:

- `EXACT_BOUNDARY`: safe for automatic checkpoint settlement.
- `POLL_SNAPSHOT`: first cumulative stat poll observed after the checkpoint. It is stored but requires admin review by default because later plays may already be included.


---

## Endpoint: Get Reality TV Episode Comparison

### Request

```txt
?action=getRealityTvEpisodeComparison&username=USER&token=SESSION_TOKEN&gameId=GAME_ID
```

### Frontend Function

```js
apiGetRealityTvEpisodeComparison(gameId)
```

### Behavior

Returns the latest locked Reality TV episode comparison. Before the episode lock time, `comparison.available` is false. After lock, the response contains question columns and player rows with the finalized Sole Survivor Pick and weekly answers.

---

## Admin Endpoint: Repair Reality TV Question Pack

### Action

```txt
adminRepairRealityTvQuestionPack
```

### Frontend Function

```js
apiAdminRepairRealityTvQuestionPack(seasonId, episodeId)
```

### Behavior

Starts or resumes a staged verification build. Verification checks the episode-question record, game category, and each expected answer ID. Valid existing rows are reused and only missing local records are repaired.

## Reality TV current-period recovery contract — v1.1.8

The following existing administrator actions now resolve or repair a missing current `RealityEpisodes` row before building:

- `adminUpdateRealityTvQuestionPack`
- `adminAddRealityTvCustomQuestionTemplate`
- `adminBuildRealityTvEpisodeQuestions`
- `adminRepairRealityTvQuestionPack`

Resolution order is requested episode ID, `CurrentEpisodeNumber`, newest open/review episode, newest episode, then repair/create. Repair skips Hub synchronization and preserves an existing main-category lock time when available.

`getSeasonAnchor` and `saveSeasonAnchorPick` may use a read-only current-episode view derived from the main `episode-N-eliminated` category when the normalized episode row is temporarily absent.


## Reality TV Extra Question Build Contract — v1.1.9

### Large save request

`adminUpdateRealityTvQuestionPack` is sent with POST through `apiAdminRealityTvPostRequest_`. The payload contains format settings, selected question IDs, per-question points, and display settings.

### Custom deletion

Action: `adminDeleteRealityTvCustomQuestionTemplate`

Frontend: `apiAdminDeleteRealityTvCustomQuestionTemplate({ seasonId, templateId, episodeId })`

Only `TemplateSource = custom` rows may be deleted. The reusable template is deleted. The current episode question/category is also deleted when no protected picks, wagers, or results reference it. Otherwise the played question is preserved as history.

### Automatic continuation

Question builds advance immediately within a bounded server budget. Incomplete jobs schedule `realityTvContinuePendingQuestionBuilds` as a one-time Apps Script trigger. The trigger resumes saved jobs from `CurrentIndex` and reschedules itself only while unfinished work remains.

### Readiness payload

`apiAdminGetRealityTvSeasonDetails` returns `bundle.questionReadiness` with:

- `status`: `NO_EPISODE`, `NEEDS_BUILD`, `BUILDING`, `BLOCKED`, `ERROR`, or `READY`
- counts for available, selected, inserted, ready, blocked, and needing build
- `stages` for episode, elimination linkage, selection, insertion, answer verification, and local readiness
- `questionStates` for every compatible preset and custom template

External Results Hub mapping is not required for local `READY` status.

## Reality TV mass vote and approval resilience contract — v1.1.14

### Bulk episode votes

Action: `adminSaveRealityTvEpisodeVotesBulk`

Frontend: `apiAdminSaveRealityTvEpisodeVotesBulk(payload)`

The POST payload contains `seasonId`, `episodeId`, `voteRound`, optional `votingGroupName`, and `votes`. Each vote may contain `voterParticipantId`, `targetParticipantId`, `voteStatus`, `voteValue`, `notes`, and `outsideVoter`.

Rules:

- normal voters must belong to the selected voting group for the episode;
- `outsideVoter: true` permits an explicitly added voter from outside that group;
- targets always remain members of the selected voting group;
- one voter may have only one ballot row per saved round unless separate weighted/extra-vote rows are deliberately represented by distinct stored vote records;
- the full round is validated before rows are written;
- existing matching voter/round rows are updated and new rows are appended in a bounded bulk write.

The existing single-ballot save action remains supported for corrections.

### Approval jobs

`adminApproveRealityTvResult`, `adminContinueRealityTvApproval`, `adminApproveRealityTvQuestionResult`, and `adminContinueRealityTvQuestionApproval` now use a brief claim lock. The lock protects only stage ownership and is released before settlement, roster updates, question writes, and optional Hub synchronization.

Temporary Spreadsheet service errors and retryable lock errors are retried with bounded backoff. The persisted stage remains resumable, and duplicate requests receive an already-processing response rather than starting concurrent settlement work.



## Reality TV approval reset and episode question plan contract — v1.1.15

### `adminResetRealityTvApproval`

Administrator-only POST action. Accepts `queueId`. It inspects the episode, remaining roster, saved next episode, and current approval stage, clears the stale error/progress claim, and resumes from the first unfinished stage. Completed settlement and next-episode creation are not intentionally repeated.

### `adminApplyRealityTvEpisodeQuestionPlan`

Administrator-only POST action. Accepts `seasonId`, `episodeId`, `enabledQuestionTypesJSON`, `questionPointsJSON`, and `questionDisplayJSON`. It builds or updates the selected Extra Questions for the specified open episode, safely removes unselected questions only when no picks/results depend on them, and leaves the season template defaults unchanged.

### Main elimination multiple-winner result

`multiple-elimination` settles every selected contestant as a winning nominee in `CategoryResults`. Matching picks receive the category's normal points. Only `no-elimination` uses push settlement.

### Next-episode inheritance

Approval of the main elimination creates the next episode automatically when `AutoCreateNextEpisode` is enabled and more than one active contestant remains. The new episode inherits the enabled season templates and their current points, display, image, wording, and answer-source settings. Supplemental-question approvals never create another episode.


## Reality TV staged approval progress contract — v1.1.16

`adminApproveRealityTvResult` and `adminContinueRealityTvApproval` return the normal approval state plus:

```txt
progressPercent
progressLabel
progressDetail
elapsedSeconds
estimatedRemainingSeconds
stalled
approvalProgress
questionBuild
```

Main elimination approval now uses these persisted stages:

```txt
SETTLE
BUILD_NEXT
BUILD_QUESTIONS
FINALIZE
COMPLETE
```

`BUILD_QUESTIONS` advances one enabled Extra Question per continuation request and returns the question pack's `currentIndex`, `totalCount`, and latest message. The queue stores `ApprovalStageStartedAt`, `ApprovalHeartbeatAt`, and `ApprovalQuestionBuildId` so a refreshed manager can reconstruct elapsed time and identify a potentially stalled stage.

Supplemental question approvals continue to use `SETTLE`, `SYNC_HUB`, and `COMPLETE`, but now return the same core progress fields. Remaining-time values are estimates, not deadlines; the frontend replaces an expired estimate with a longer-than-usual message while the request remains active.

When no External Results Hub spreadsheet is configured, finalization skips Hub access immediately. Local settlement, next-episode creation, and Extra Question readiness remain authoritative.

## Reality TV serialized approval queue contract — v1.1.17

`adminGetRealityTvApprovalState` is a read-only administrator endpoint used by the manager while an approval stage is running. It returns the same approval state shape as `adminContinueRealityTvApproval` without claiming or executing a stage.

Main-elimination approvals are serialized across the Apps Script project because all Reality TV seasons share the same Game Setup and result sheets. The oldest fresh `APPROVING` queue item owns the shared write path. Other approvals return:

```txt
busy: true
waiting: true
progressLabel: Waiting for another approval
progressDetail: Another Reality TV approval is using the shared game sheets...
```

A processing owner whose heartbeat is older than three minutes does not block newer queued approvals. The stalled row remains recoverable through `adminResetRealityTvApproval`.

Next-episode creation writes these heartbeat checkpoints while its request is running:

```txt
PREPARING NEXT EPISODE
CREATING MAIN QUESTION
ADDING MAIN ANSWERS
SAVING NEXT EPISODE
```

The frontend polls the read-only state every three seconds and never advances the displayed percentage beyond the last saved checkpoint. Percentages are monotonic for the life of the visible progress card.

Approval-owned rows in `RealityQuestionBuildJobs` store `ManagedBy = APPROVAL`. The generic question-pack continuation trigger ignores those rows; the approval queue advances them one template at a time and stores their exact `ApprovalQuestionBuildId` on the result queue.

A one-time `realityTvContinuePendingApprovals` trigger continues the oldest queued approval after the browser closes or a frontend request ends. Stage claims remain idempotent, so concurrent browser and trigger requests return busy instead of repeating settlement or episode creation.

## Reality TV bulk episode-question materializer contract — v1.1.18

Main-elimination approval no longer advances the generic per-template question worker. During `BUILD_QUESTIONS`, the backend calls `realityTvMaterializeEpisodeQuestionPackBulk_` once for the new episode.

The bulk materializer:

1. Reads the active roster, groups, templates, existing normalized setup, and current episode-question rows once.
2. Compiles every enabled question, setting, and answer payload in memory.
3. Writes Questions, CategorySettings, legacy Categories answer rows, QuestionOptions, and RealityEpisodeQuestions through bulk operations.
4. Flushes, clears the affected caches, and marks the linked build job complete.

Saved approval checkpoints are:

```txt
COMPILING QUESTION PACK
WRITING QUESTION PACK
VERIFYING QUESTION PACK
QUESTIONS COMPLETE
```

The pass is idempotent: existing questions are updated or verified, missing answers are added, and a retry must not intentionally duplicate valid episode-question records. Approval-owned build jobs use `ManagedBy = APPROVAL` and are ignored by the generic question-build continuation trigger.



## External Results Hub Bridge v1.2.0

### Admin actions

- `adminSetupExternalResultsBridge` — creates the local outbox and inbox sheets.
- `adminGetExternalResultsBridgeHealth` — returns Hub connectivity, schema issues, and local queue counts.
- `adminRunExternalResultsBridgeNow` — processes eligible outbound jobs immediately.
- `adminRetryExternalResultsBridgeFailures` — resets failed outbound jobs to queued.

### Local sheets

- `ExternalResultsHubOutbox` — asynchronous outbound jobs to the Hub.
- `ExternalResultsInbox` — reviewed inbound delivery rows from the Hub.

`ExternalResultsInbox` rows are staged only in v1.2.0. They are not automatically settled.

## Reality TV set-and-forget episode finalizer contract — v1.2.2

### Admin action

`adminFinalizeRealityTvEpisode` starts the server-owned all-results finalization for the submitted main elimination queue. The endpoint refuses to start when an enabled built Extra Question has neither a final result nor a submitted/pending result.

The main result queue stores:

```txt
EpisodeFinalizeMode = ALL_RESULTS
ApprovalQuestionQueueIdsJSON
NextEpisodeJobId
```

The current-episode stages are:

```txt
SETTLE_QUESTIONS
SETTLE
FINALIZE_CURRENT
COMPLETE
```

`SETTLE_QUESTIONS` settles all eligible supplemental result queues with one reused Game Setup read and one score recalculation after the batch. `SETTLE` applies the main elimination. `FINALIZE_CURRENT` completes the current episode and queues next-episode preparation. A completed current-episode approval does not wait for the next episode to finish building.

Transient retryable lock / Google Sheets failures are returned to `QUEUED` and scheduled for server continuation, up to five attempts. Manual Reset/Resume remains compatible with legacy approvals and recovery scenarios.

### Next-episode jobs

The backend automatically creates `RealityNextEpisodeJobs`. A job references the source episode and intended target episode and persists stage, heartbeat, attempt count, error state, and question-build information.

Stages:

```txt
CREATE_EPISODE
BUILD_QUESTIONS
COMPLETE
```

`realityTvContinueNextEpisodeJobs` is the server continuation worker. It waits while a current-episode approval owns the shared write path and uses the bulk episode-question materializer for enabled Extra Questions. Hub mirroring is queued asynchronously only after local preparation.

The season-details response includes `nextEpisodeJobs` with computed state for the admin progress card.


---

## External Results Inbox — v1.2.6

Administrator-only endpoints:

```txt
?action=adminGetExternalResultsInboxStatus
?action=adminValidateExternalResultsInbox
?action=adminApplyExternalResultsInbox
?action=adminRetryExternalResultsInboxErrors
```

`adminGetExternalResultsInboxStatus` returns status counts plus recent delivery batches. `adminValidateExternalResultsInbox` validates READY batches without changing game scoring. `adminApplyExternalResultsInbox` applies VALIDATED Awards/prediction batches through normal category settlement and stages Reality TV batches into their native review queues. `adminRetryExternalResultsInboxErrors` returns ERROR rows to READY for correction/revalidation.

Automatic inbound application is disabled in v1.2.6.
## External Results Hub end-to-end lifecycle — v1.2.8

The local `ExternalResultsInbox` adds native settlement tracking fields:

```txt
NativeRoute
NativeQueueId
NativeStatus
NativeUpdatedAt
```

New administrator endpoint:

```txt
?action=adminReconcileExternalResultsInbox
```

`adminGetExternalResultsInboxStatus` also reconciles staged Reality TV batches before returning summary state. A native Reality queue with `ReviewStatus = APPROVED` moves the matching Inbox batch to `APPLIED`; a rejected native queue moves it to `REJECTED`; a native worker error remains `STAGED_REALITY` so recovery operates on the same queue instead of creating a duplicate.

Reality native routing accepts `manual-reality-tv` only. Prediction providers (`kalshi`, `polymarket`) must settle prediction categories rather than Reality season queues.

The Hub provides separate mapped-result operations:

```txt
syncMappedKalshiNow
syncMappedPolymarketNow
syncMappedExternalProvidersNow
installExternalResultsProviderWatch
removeExternalResultsProviderWatch
erhScheduledMappedProviderSync
```

The recurring provider watch runs hourly and polls only active `AppMappings` market IDs. It imports/provider-reviews results but never bypasses administrator approval or the Awards App Inbox.

Provider result identity excludes changing provider timestamps; the same provider/event/market/result/outcome/finality is idempotent across repeated syncs. Hub delivery uses a deterministic mapping key when `MappingId` is blank.

