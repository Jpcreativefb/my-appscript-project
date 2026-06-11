# Awards App Betting Game Add-on

This adds a betting-style game mode without replacing the current Picks game.

## What this mode does

Users start with a bankroll, such as 1000 chips. For each category, they choose one nominee and wager chips. If that nominee wins, the payout is:

BetAmount × Odds

If the nominee loses, the stake is lost.

The betting leaderboard sorts by current bankroll, then possible max bankroll, then won bets.

## Files to add

Add this backend file:

backend/engines/BettingEngine.js

Add these frontend files:

frontend/js/pages/betting.js
frontend/css/betting.css

## Backend API change

Open:

backend/Api.js

Inside doGet(e), add the snippet from:

snippets/Api_doGet_insert.js

Place it before the DEFAULT section.

## Frontend API change

Open:

frontend/js/api.js

Add the snippet from:

snippets/frontend_api_insert.js

Place it after the existing API helper functions.

## Frontend route change

Open:

frontend/js/app.js

Inside renderPage(page), add the route snippet from:

snippets/app_js_route_insert.js

Place it before the default case.

## App shell change

Open:

frontend/app.html

Use the three snippets in:

snippets/app_html_insert.html

That adds the CSS file, the Betting nav button, and the betting page script.

## Sheet setup

Use:

snippets/sheet_headers.md

Important: after adding BettingEngine.js, you can also run this function once from Apps Script to create/repair the Bets sheet and add the BettingOdds column:

setupBettingSheets()

## Recommended first betting game row

In the Games sheet, add or update a game row like:

GameId: oscars-2026-betting
Name: Oscars 2026 Betting
Year: 2026
Type: betting
Active: TRUE
Archived: FALSE
DefaultGame: FALSE
BettingEnabled: TRUE
StartingBankroll: 1000
MinBet: 10
MaxBet: 250

Then add matching Categories and CategorySettings rows using GameId:

oscars-2026-betting

## Deployment

After adding the files and sheet columns:

1. Run setupBettingSheets() once in Apps Script.
2. Run clasp push.
3. Deploy/update the Apps Script web app if needed.
4. If using Cloudflare/frontend hosting, commit and push the frontend files too.
