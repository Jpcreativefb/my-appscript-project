# Hybrid Game Foundation Deployment

## Recommended safe deployment

1. Make a backup copy of the current Google Spreadsheet.
2. Commit or copy the current working repository before replacing files.
3. Replace the project with the full release, or copy only the files listed in `HYBRID_GAME_CHANGED_FILES.txt`.
4. From the repository root, push the backend:

```bash
clasp push
```

5. Deploy a new Apps Script web-app version.
6. Deploy the updated `frontend` directory to Cloudflare Pages.
7. Sign in as an administrator and open Manage Games. Saving or opening the updated admin setup automatically adds missing optional columns.
8. For an explicit one-time setup, run `setupUniversalQuestionSystem()` from the Apps Script editor. It only adds missing columns and repairs/creates `CategoryResults`; it does not delete existing rows.
9. Hard-refresh the browser after the Cloudflare deployment.

## First test game

Create a temporary standalone hybrid game with:

- Fixed Points: On
- Staked Predictions: On
- Starting Points: 1,000
- Minimum Stake: 10
- Maximum Stake: 100
- Increment: 10
- Win Multiplier: 1
- Loss Multiplier: 1

Create three test questions:

1. Fixed-points question.
2. Staked-points question.
3. Existing confidence or wager question.

Verify that a staked pick reserves points immediately, a second question cannot exceed the remaining available points, and manual settlement updates the balance and leaderboard correctly.

## Parent/mini test

1. Create a parent game such as `nfl-2026`.
2. Create two mini games and assign the parent.
3. Set one child to Add Points and one to Weighted Points.
4. Verify each mini game has its own leaderboard and the parent leaderboard includes their net contributions.

## Rollback

Restore the previous code deployment. The additional spreadsheet columns can remain; older code ignores them. No destructive data conversion is required.
