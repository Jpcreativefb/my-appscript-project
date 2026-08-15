# v1.2.16 Production Smoke Test

Complete this after deploying the Apps Script backend and then the frontend.

## A. Release / login

- [ ] Open the live PWA in a private/incognito browser window.
- [ ] Existing user can log in with the same PIN used before v1.2.16.
- [ ] New user signup succeeds.
- [ ] Logout and login again succeeds.
- [ ] Wrong PIN is rejected.
- [ ] PIN reset request does not expose the PIN in the browser URL.
- [ ] PIN reset completes and the old active session is no longer accepted.

## B. Authorization checks

Use two test accounts: one normal user and one administrator.

- [ ] Normal user can load dashboard, categories, picks, leaderboard, profile, and leagues they are allowed to access.
- [ ] Normal user cannot open or execute administrator API actions.
- [ ] Saving a pick works for the logged-in user.
- [ ] Saving/removing a wager works for the logged-in user.
- [ ] Editing the user's own profile works.
- [ ] Reality TV Season Survivor pick save/finalize works for the logged-in user.
- [ ] Admin tools still load and authorized writes succeed for the admin account.

## C. Existing-user credential migration

In the Users sheet after existing users log in / the schema initializes:

- [ ] PIN values are no longer ordinary four-digit values and begin with `hmac-sha256-v1$` after migration.
- [ ] New/renewed SessionToken values begin with `sha256$` rather than containing the browser bearer token.
- [ ] Existing users were not forced to choose a new PIN.
- [ ] Disabled users cannot authenticate.

Do not copy PIN/session values into screenshots, chat, or release notes.

## D. Core game matrix

Create small disposable/private games so live production data is not damaged.

### Standard Prediction
- [ ] Create/configure game.
- [ ] User makes and changes a pick before lock.
- [ ] Lock blocks further changes.
- [ ] Enter result.
- [ ] Score/leaderboard is correct.
- [ ] Archive/history is readable.

### Confidence
- [ ] Confidence values save.
- [ ] Lock works.
- [ ] Result scoring applies correct confidence points.

### Staked Prediction
- [ ] Risk amount is chosen before/finalized with the pick.
- [ ] Balance/score changes correctly after settlement.

### Wager / Sports Wager
- [ ] Available wager loads.
- [ ] Bet amount saves.
- [ ] Bet can be changed/removed while allowed.
- [ ] Final event settles correctly.
- [ ] Balance/leaderboard reflects settlement.

### Hybrid
- [ ] Standard/confidence/staked/wager sections all render as configured.
- [ ] Each enabled section accepts the appropriate player action.
- [ ] Final scoring combines the sections correctly.

## E. Fall feature matrix

### Awards / Emmys preparation
- [ ] Awards Manager opens.
- [ ] Kalshi and/or Polymarket event search works.
- [ ] View Event loads current markets.
- [ ] Selected markets create/link the intended question/answers.
- [ ] Hub mapping is created.
- [ ] External result remains administrator-reviewed (no surprise auto-settlement).
- [ ] Approved result reaches CategoryResults and the leaderboard correctly.

### Reality TV
- [ ] Season Manager loads existing season without timeout/stuck overlay.
- [ ] Current episode questions/answers are correct.
- [ ] Player picks save and can change before lock.
- [ ] Extra Question result submission works.
- [ ] Approve All & Finalize Episode completes through durable checkpoints.
- [ ] Historical episode shows correct winner/safe/eliminated overlays.
- [ ] Next episode is prepared with the correct remaining roster.
- [ ] Season Survivor pick/image/status works.

### Football / Sports
- [ ] League controls can be enabled without closing unexpectedly.
- [ ] Schedule/games load for the intended football league.
- [ ] Hand-picked wager game reaches the Awards App game.
- [ ] Live/final score updates.
- [ ] Final wager settlement is correct.

## F. UX / devices

- [ ] Dashboard clearly identifies picks/wagers remaining.
- [ ] Completed game cards show Complete.
- [ ] Mobile Safari / iPhone: login, dashboard, picks, Reality TV, leaderboard, admin quick actions.
- [ ] Android/Chrome or desktop Chrome: same main flow.
- [ ] PWA refresh does not leave stale v1.2.15 assets after one hard refresh/reopen.
- [ ] Profile/avatar images load correctly.

## G. Final release decision

Only tag v1.2.16 as the production baseline after the applicable smoke sections pass. If a test fails, record the exact game, user role, action, visible message, and Apps Script execution error before modifying code.
