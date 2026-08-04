# Phase 2C — Season Survivor Pick v1.0.27

## Scope

This release adds the optional **Season Survivor Pick** to Reality TV seasons. The normalized `SeasonAnchor` engine is provider-neutral so Sports Weekly Win and Playoff Survival adapters can be added later, but this release activates only the Reality TV contestant-survival mode.

## Admin controls

Each Reality TV game can independently configure:

- Enabled / disabled
- Display label
- Starting multiplier
- Growth per successful episode
- Maximum multiplier cap
- Weekly eligible fixed-points cap
- Loss penalty
- Quit / medical-withdrawal behavior
- Whether a user may switch before lock

The manager shows the maximum possible weekly bonus before saving. Lowering the multiplier cap clamps current user multipliers immediately. Changed settings apply prospectively; previously earned episode adjustments remain unchanged.

## User workflow

The Picks page displays a Season Survivor card when enabled.

- A user may join during any open episode.
- A new or replacement pick starts at the configured starting multiplier.
- The selection carries forward automatically while the contestant remains active.
- A pre-lock manual switch is optional and resets the streak/multiplier.
- An eliminated selection receives the configured penalty and requires a new pick.
- A no-elimination episode preserves the streak and multiplier without adding growth or a bonus.

## Scoring

Normal question scoring is not changed.

`Weekly bonus = min(earned fixed points for the episode, eligible-points cap) × (applied multiplier − 1)`

`Season Survivor adjustment = weekly bonus − loss penalty`

The first selected episode uses the starting multiplier. A survival increases the multiplier for the next episode, up to the admin cap. Bonus calculations are refreshed whenever elimination or an additional episode question is approved.

## Normalized sheets

- `SeasonAnchorSettings`
- `UserSeasonAnchors`
- `SeasonAnchorHistory`

The history table stores the multiplier and eligible-points cap that applied to that episode, preventing later admin setting changes from rewriting past scoring.

## External Results Hub

No separate Hub market is required for Season Survivor Picks. The engine consumes the same administrator-approved Reality TV elimination/withdrawal result already mirrored through the External Results Hub. The derived user streak and bonus history remain in the main Awards App spreadsheet, which is the source of truth for user scoring.

## Leaderboard

Season Survivor bonuses and penalties are included in fixed-point and combined leaderboard totals. Leaderboard cards show the current selection, streak, multiplier, and cumulative Survivor adjustment.

## Deployment

This release changes Apps Script backend and Cloudflare frontend files. Run `clasp push -f`, deploy a new Apps Script web-app version, push frontend files to GitHub, allow Cloudflare to deploy, and hard-refresh the app.
