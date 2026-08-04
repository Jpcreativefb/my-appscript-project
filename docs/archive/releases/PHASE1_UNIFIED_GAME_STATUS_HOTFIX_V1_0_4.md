# Phase 1 Unified Game Status Hotfix v1.0.4

## Purpose

This update removes the duplicate Publish Controls workflow and makes Game Type the single source of truth for non-Hybrid gameplay methods.

## Correct Manage Games procedure

Open **Admin → Manage Games → expand a game → Settings → Availability**.

### Game Status

- **Draft** — hidden from players, entries locked, Default Game off.
- **Setup** — hidden from players, entries locked, Default Game off.
- **Preview** — visible to players for testing, but entries locked and Default Game off.
- **Live** — visible to players. Entries can be Open or Locked. Default Game can be Yes or No.

The separate Publish Controls section has been removed. There is no longer an Active toggle plus a second Activate button.

### Player access

- **Picks & Wagers: Open / Locked** is available only while Game Status is Live.
- **Default Game: Yes / No** is available only while Game Status is Live.
- **Leaderboard: Shown / Hidden** remains independent.

### Archive

Archive is no longer a normal On/Off setting. Use the deliberate buttons below the form:

- Archive Copy
- Move to Archive
- Restore Game

## Game Type controls gameplay methods

For every non-Hybrid game, the selected Game Type automatically controls the gameplay flags.

Examples:

- Prediction Game: Predictions On, Wagers Off
- Wager / Chips Game: Wagers On, Predictions Off
- Racing Wager Game: Racing Wagers On, Predictions Off
- Staked Prediction: Staked Predictions On, Wagers Off
- Confidence Pool: Predictions and Confidence On, Wagers Off
- Ranking Game: Rankings On, Predictions and Wagers Off

You do not manually change Wagers On or Predictions Off for a Wager Game. The form now displays a summary directly under Game Type, such as:

> Sports Wagers: ON • Predictions: OFF

Only **Hybrid Game** shows the Hybrid Scoring Methods controls because Hybrid is the only format intended to combine multiple gameplay methods.

## Publishing safety

Saving a game as Live runs the production preflight first. The newest settings are temporarily saved as Setup and locked, then:

- If preflight has errors, the game remains Setup and locked.
- If preflight passes, the game becomes Live with the selected Picks & Wagers state and Default Game state.
- Preview does not run the Live publishing action; it remains visible but locked.

## Corrected Test 2

1. Select **Game Type: Wager / Chips Game**.
2. Confirm the summary below Game Type says **Sports Wagers: ON • Predictions: OFF**.
3. Do not look for separate Wagers or Predictions switches; they are automatic for this type.
4. Add at least one valid active wager question with at least two active choices.
5. Run **Run Check** and correct any errors.
6. Set Game Status to **Setup**, save, and confirm the type summary remains unchanged.
7. Set Game Status to **Preview**, save, and confirm entries are locked and Default Game is No.
8. Set Game Status to **Live**, choose Entries Open or Locked, and save. Preflight runs automatically.
9. Turn Default Game to Yes only if this test game may safely become the default; otherwise leave it No.

## Deployment

This update contains both frontend and Apps Script backend changes.

```bash
clasp push
```

Then commit and push the frontend/backend files to GitHub so Cloudflare deploys the site.

The service-worker cache is:

```text
awards-app-v255-unified-game-status
```
