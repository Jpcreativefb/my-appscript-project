# Phase 1 Game Setup Editor Hotfix v1.0.7

## Purpose

This update corrects the remaining Game Setup question editor issues.

## Changes

### Score Mode now follows Game Type

For non-Hybrid games, Score Mode is no longer an independent setting:

- Prediction / Head-to-Head / Survivor: `fixed-points`
- Confidence Pool: `confidence-points`
- Staked Prediction: `staked-points`
- Wager / Chips and Racing Wager: `wager`
- Ranking: `ranking`

The Score Mode control is displayed as read-only with an explanation. Hybrid games still allow a different Score Mode per question.

The backend enforces the same rule. A stale browser or old CategorySettings row cannot change a Staked Prediction question back to Fixed Points when it is saved.

Game-level Minimum Stake, Maximum Stake, and Stake Increment remain the defaults. Question-level values only override those amounts; they do not change Score Mode.

### Permanent Delete Question

Each question now has:

- Archive Question — keeps the question and history but hides/locks it.
- Delete Question — permanently removes a new or unused question and all of its answers.

Permanent deletion is blocked when the question has saved Picks, Bets, or CategoryResults. Use Archive Question in that situation so historical data remains valid.

### Clear save-state buttons

Question and answer Save buttons now show:

- Normal: `SAVE QUESTION` or `SAVE ANSWER`
- Changed: `CHANGES MADE — SAVE NOW` in orange
- Saving: `SAVING...` in blue
- Saved: `SAVED ✓` in green
- Failed: `SAVE FAILED — TRY AGAIN` in red

### Save All Changes

A sticky Game Setup button now saves all edited existing questions and answers with one click:

- Normal: `SAVE ALL CHANGES`
- Changed: `CHANGES MADE — SAVE ALL NOW`
- Saving: `SAVING ALL...`
- Complete: `ALL CHANGES SAVED ✓`

Large saves are split into safe request batches automatically.

## Files changed

- `backend/Api.js`
- `backend/admin/AdminCategories.js`
- `frontend/api.js`
- `frontend/js/api.js`
- `frontend/js/pages/adminGameSetup.js`
- `frontend/css/styles.css`
- `frontend/sw.js`
- Tests listed in the hotfix package

## Deployment

This update changes both Apps Script and the frontend.

```bash
clasp push
git add backend frontend tests PHASE1_GAME_SETUP_EDITOR_HOTFIX_V1_0_7.md PHASE1_GAME_SETUP_EDITOR_TEST_REPORT_V1_0_7.txt
git commit -m "Fix Game Setup score mode and bulk saves"
git push origin architecture-cleanup
```

Create a new Apps Script web-app deployment version when the active deployment uses fixed versions.

After Cloudflare finishes, hard-refresh the browser and fully close/reopen the installed PWA.

Service-worker cache:

`awards-app-v256-game-setup-save-delete`

## Retest Staked Prediction

1. Open the Staked Prediction game.
2. Open Categories / Questions / Nominees.
3. Open the question Settings.
4. Confirm Score Mode displays Staked Points and is controlled by Game Type.
5. Edit the question text and an answer.
6. Confirm both Save buttons become `CHANGES MADE — SAVE NOW`.
7. Click `CHANGES MADE — SAVE ALL NOW`.
8. Confirm the buttons turn green and display saved messages.
9. Leave Game Setup and reopen it.
10. Confirm the text, answer, and Staked Points remain.
11. Run Check. The missing `staked-points` error should be gone.
