# PATTC Predicts — Current Project State

**Updated:** September 21, 2026  
**Canonical location:** `docs/PATTC-CURRENT-STATE.md` on branch `coordination/pattc-current-state`  
**Status:** Football launch stabilization; Visual Studio paused. This checkpoint supersedes the older September 15 Director status, preserved in Git history.

## New-chat instruction

> Continue PATTC. Read `docs/PATTC-CURRENT-STATE.md` on branch `coordination/pattc-current-state`; verify the current checkpoint and continue from NEXT ACTION. Do not restart completed features or ask me to reconstruct prior history.

This is a handoff/documentation branch, not a deployable application branch.

## Verified and reported checkpoints

- Production GitHub branch `architecture-cleanup` was verified September 21 at `252054398698ccf83cd77794e4105e7e9dc31cdb`. Last owner-reported main Apps Script production deployment: version **401**; deployment state should be rechecked before any release.
- Football preview Git branch `preview/football-recovery-r3-20260917` and owner-reported Cloudflare deployment: commit **123ea46**, URL `https://9f4149c8.my-appscript-project.pages.dev`.
- The owner’s `clasp deployments` output showed existing main Apps Script deployment version **405**, `PATTC NFL Confidence Weekly R1 Preview - 123ea46`. Versions 401 and 405 use the SAME main Apps Script project; distinct deployments do not necessarily isolate Google Sheet data.
- Source `functions/api/app.js` at `123ea46` routes ordinary Confidence API requests to the primary version-401 endpoint, and a limited set of other preview actions to version 405. A matching corrected Confidence preview route has not been confirmed deployed.
- Main Mac football checkout was previously verified at `/Users/joel/PATTC-Football-Preview-R3`, branch `feature/nfl-confidence-weekly-r1`, commit `123ea46`, then clean. **Recheck on the actual computer before changes.**
- Work Mac: older macOS, VS Code and GitHub-backed football checkout. Avoid toolchain upgrades or local Wrangler/workerd workflows that fail on older macOS. Source work can continue there; use Main Mac for runtime-dependent acceptance and deployments.
- Owner moved Sports games’ planned start to **NFL Week 3** and reports no current-game player picks. An older handoff reported saved Playoff Race forecasts for the owner; inspect real records before assuming there are none or resetting anything.

## Active priorities — owner-approved order

### 1. Home Hub startup reliability — FIRST

On Mac and phone, the Hub intermittently shows `Could not load games — Failed to fetch`, sometimes taking approximately 45 seconds before eventually loading. **Exact failing request and root cause are not yet established.** Identify the single slow/failing request (URL/path, timing, HTTP status, upstream) and apply a targeted fix; do not undertake a broad backend rewrite or assume that cache refresh fixes the problem. Source entry points include `frontend/js/app.js` (session validation and app initialization), `functions/api/app.js` (Cloudflare/Apps Script proxy) and `backend/services/AppCache.js` (Sheet caching). These are leads, not proven causes.

### 2. Playoff Race — locked before Week 3 start

Owner reports Playoff Race is already locked. Determine whether that refers to game-wide locks, an existing owner forecast outside an adjustment window, or a new player’s original-entry eligibility. Inspect actual saved settings, effective current week, forecast records, game status, and initial-submission/adjustment rules. Preserve historical forecasts, multipliers, and Week 4/8/12/15 checkpoint rules; do not indiscriminately unlock existing forecasts or change scoring to fix initial-entry access.

### 3. Team Fantasy — all 32-team rankings

Show scores/rankings for **all 32 NFL teams at all eight positions**: QB, RB, WR/TE, OL, K, DL, LB, DB, including teams nobody picked. Use completed NFL statistics and existing PATTC position scoring formulas. Missing statistics should show Pending, not invented numbers. Preserve player lineup selection, usage limits, scoring, standings and Cup contributions. Keep changes isolated to rankings/stat aggregation.

### 4. NFL Confidence — one game, separate weeks

`nfl-confidence-2026` is ONE season-long game with weekly matchup groups. Each week gets a fresh confidence range, picks, completion status and weekly score; season standings accumulate weekly points/correct picks. Preserve the existing game, questions, kickoff locks and past results.

Both Week 1 and Week 2 questions exist. Week 1 was deactivated as an earlier workaround. September 21 browser diagnostic showed new weekly frontend code loaded, 16 currently available questions, all identified as Week 2. The week selector function is wired into compact slate rendering, but visible navigation and data eligibility still need acceptance. Do not recreate questions or reactivate Week 1 without checking historical effects. Candidate `123ea46` contains weekly corrections; ordinary preview requests currently point to old production backend as noted above.

An **R1b correction ZIP** was prepared in chat from the owner’s archive at commit `123ea46`, but installation, repository commit/push and deployment have **not** been confirmed. Do not assume it is present on either Mac or on GitHub. Verify exact working tree and package before installation. Preview and production Apps Script deployments may share the same Sheets; do not test saved picks on real player data without independently verified isolation.

### 5. NFL Cup and other games

After Hub, Playoff Race, Team Fantasy and Confidence are ready, confirm each child game’s active/hold state, Cup weights, independent weekly vs season awards, and avoidance of double counting. Survivor was previously reported usable with Week 2 setup; reconcile with owner’s newer Week 3 start decision without inventing missed picks. NFL Futures and unverified modes remain on hold.

## Visual Studio R3 — PAUSED, PRESERVE

Codex reported local branch `codex/visual-studio-completion-20260921`, commit `9913be7`, in `/Users/joel/PATTC-Visual-Studio-Completion-R3`, with 23/23 focused test suites and isolated test-backend acceptance. This local commit was not independently verified as pushed to GitHub. During owner testing, the editor unexpectedly closed or became unresponsive after a color change, and Save Section gave no visible confirmation. Edited Draft color reappeared when Studio reopened. Keep Visual Studio paused and isolated from football until owner reprioritizes it; no production layout publication or merge.

Older Reality TV / Awards branches and details remain preserved in the September 15 Director file in Git history. Its older Reality-first NEXT ACTION and older production baseline are superseded.

## Working and release rules

- One active launch target at a time: small confirmed fix → focused tests → owner visual approval → full gate once → controlled integration/deploy → smoke test.
- Distinguish local source, GitHub commit, Cloudflare frontend, main Apps Script deployment, external Sports Engine, and Sheets data. A Git push does not deploy the rest.
- Before changing source on either Mac, check `pwd`, branch, `git log -1 --oneline`, `git status --short`, and remote. Do not overwrite uncommitted work, reset/clean repositories, or confuse the local Visual Studio and football checkouts.
- No changes to production deployments, live game settings, stored picks or Sheets without explicit informed approval. Preview may use production Sheets even with a different hostname or deployment version.
- Codex is optional and Visual Studio is paused; avoid unnecessary repeat tests and Work Mac runtime-installation cycles.
- Report verified facts, owner-reported status, and remaining uncertainties separately. Keep instructions compact and copy-pasteable.

## NEXT ACTION — Home Hub on the Work Mac

1. In the existing football VS Code terminal on the **Work Mac**, run **read-only**: `pwd; git branch --show-current; git log -1 --oneline; git status --short; git remote -v`. Do not assume that checkout matches Main Mac.
2. Use the earlier Network evidence, or obtain one **redacted** capture of the slow/failed Hub startup request with URL/path, status, timing, and upstream. Never share session tokens, passwords or PINs.
3. Trace only the implicated startup path; prepare the smallest isolated correction and focused tests. Use Main Mac for runtime verification if Work Mac tooling cannot run.
4. Then address Playoff Race original-entry locking, Team Fantasy all-team rankings, return to Confidence R1b, and finish Cup launch checks.
