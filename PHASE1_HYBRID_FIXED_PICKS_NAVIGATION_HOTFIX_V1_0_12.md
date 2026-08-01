# Phase 1 Hybrid Fixed Picks and Navigation Hotfix v1.0.12

## Problems corrected

1. A Hybrid game could show a fixed-point question on the Picks page but reject the submitted answer with:
   `Fixed-point predictions are not enabled for this game`.
2. Picks, Wagers, and Leaderboard did not provide a clear path back to the Hybrid Game Sections hub.

## Root cause

Hybrid Standard Predictions were represented by two separate stored flags: `PredictionEnabled` and `FixedPointsEnabled`. Older or partially saved Hybrid rows could contain `PredictionEnabled=TRUE` and `FixedPointsEnabled=FALSE`. The player could see the question, but pick validation and leaderboard scoring used only `FixedPointsEnabled`.

## Corrections

- Hybrid now uses one admin method named **Standard Predictions (Fixed Points)**.
- Saving that method writes both `PredictionEnabled` and `FixedPointsEnabled` consistently.
- Existing Hybrid rows are repaired at read time: either old flag enables the complete Standard Predictions method.
- Pick validation accepts fixed-point Hybrid questions when Standard Predictions are enabled.
- Leaderboard scoring uses the same compatibility rule.
- Games cache version was increased to bypass stale Hybrid flag data.
- Picks, Wagers, and Leaderboard now show **Back to Game Sections** when opened from a Hybrid game.
- Betting page payload includes Hybrid identity for reliable navigation.

## Installation

Copy the hotfix files into the repository, then run:

```bash
node tests/hybrid_fixed_pick_navigation_tests.js
node tests/games_phase1_integration_tests.js
clasp push
```

If the Apps Script web app uses fixed versions, create a new deployment version. Push the frontend to GitHub so Cloudflare deploys it. Then hard-refresh the browser and fully close/reopen the PWA.

## Test 4 retest

1. In the Hybrid game, confirm **Standard Predictions (Fixed Points)** and **Sports Wagers** are enabled.
2. Save the game.
3. Open the game and choose **Make Picks**.
4. Submit the fixed-point prediction. It should save without the disabled message.
5. Click **Back to Game Sections**.
6. Open **Place Wagers** and confirm only wager questions appear.
7. Click **Back to Game Sections**.
8. Open **View Leaderboard** and confirm the same back button is present.

## Cache version

`awards-app-v261-hybrid-fixed-picks-navigation`
