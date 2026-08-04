# Phase 1 Staked Pick Risk-First Hotfix v1.0.10

## Purpose

Prevent a Staked Prediction from silently using the minimum/default stake when a player selects an answer before choosing how many points to risk.

## Corrected player workflow

1. **Step 1 — Choose Points to Risk**
   - No amount is selected automatically for a new pick.
   - The player may type an amount or choose a preset.
   - The amount must satisfy the question/game minimum, maximum, increment, and available-balance rules.

2. **Step 2 — Choose Your Pick**
   - Answer buttons remain disabled until Step 1 contains a valid stake.
   - After a valid amount is selected, the answer buttons become available.

3. **Confirm before saving**
   - Selecting an answer displays a confirmation with the answer and exact points at risk.
   - Cancelling the confirmation saves nothing and allows the player to change the stake or answer.

## Existing picks

An existing saved staked pick reloads with its saved stake. The player may change the amount and select/confirm an answer again, subject to the question's change rules.

## Files changed

- `frontend/js/pages/picks.js`
- `frontend/css/picks.css`
- `frontend/sw.js`
- Relevant regression tests under `tests/`
- New test: `tests/staked_pick_risk_first_tests.js`

## Deployment

This is a frontend-only update. Do not run `clasp push` solely for this hotfix.

After pushing to GitHub and Cloudflare finishes deploying:

1. Hard-refresh the browser.
2. Fully quit and reopen the installed PWA.
3. Confirm the service-worker cache is `awards-app-v259-stake-before-pick`.

## Live smoke test

1. Open a Staked Prediction question with no existing pick.
2. Confirm the risk input is blank.
3. Confirm all answer buttons are disabled.
4. Choose a valid risk amount.
5. Confirm the answer buttons become enabled.
6. Select an answer.
7. Confirm the confirmation message displays the answer and exact risk amount.
8. Cancel once and verify no pick was saved.
9. Select the answer again, confirm, and verify the saved pick shows the correct amount at risk.
