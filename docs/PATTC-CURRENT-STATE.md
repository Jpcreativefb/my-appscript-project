# PATTC Predicts — Current Project State

**Purpose:** This is the canonical continuation record for PATTC Predicts. Read this file before starting or resuming work. Update it after meaningful checkpoints, integrations, deploys, or priority changes.

**Coordination branch:** `coordination/pattc-current-state`

**Last updated:** 2026-09-15

---

## How to Resume in a New Chat

Use this exact instruction:

> Continue PATTC. Read `docs/PATTC-CURRENT-STATE.md` on branch `coordination/pattc-current-state` and continue from **NEXT ACTION**.

Do not make Joel reconstruct prior history unless something in this file is genuinely missing or stale.

---

## Working Rules Going Forward

PATTC has accumulated too many parallel branches, previews, handoffs, and test cycles. From this point forward use one simple release flow:

**Edit → focused tests → Joel visual approval → full gate once → integrate/deploy.**

Rules:

- Work on **one launch target at a time**.
- Do not require Codex to finish or ship work; Codex is an optional audit when available.
- Do not run the full regression gate after every cosmetic adjustment.
- Do not create a new layout generation just because one visual detail is wrong.
- Do not use ZIP handoffs unless an external worker literally cannot access the repository/worktree.
- Do not merge, deploy, `clasp push`, reset, clean, or delete branches without explicit approval.
- Real browser acceptance is required before calling a player-facing UI release-ready.
- Prefer one terminal and one worktree at a time.
- Keep UI changes KISS: clear, compact, mobile-friendly, collapsible where useful, no unnecessary nested complexity.
- **DON'T SIMPLIFY PATTC. CLARIFY PATTC.**

---

## Authoritative Production Baseline

**Production branch:** `architecture-cleanup`

**Current verified production SHA:**
`3be0fca681b988f403b7138070539f52bf96299d`

**Commit:** `Integrate Awards Stakes R1 and purse reserve guard`

This remains the production source baseline unless GitHub is rechecked and shown to have moved.

**Apps Script production deployment referenced during this release cycle:** version 388.

Do not treat feature branches below as production until intentionally integrated.

---

## Current Priority Order

1. **Reality TV — finish browser acceptance and launch first**
   - DWTS launch urgency.
2. **Football launch cut — ship the usable sports core before more polish**
   - Team Fantasy first because it is closest.
   - Then Survivor/Confidence only to the minimum launch-ready level.
3. **Awards**
   - Finish launch blockers after Reality/football.
4. **Visual Studio**
   - Parked until the app itself is launched/stable.

No new feature expansion until the current launch target is closed unless it is required to make the target usable.

---

## Reality TV — ACTIVE / HIGHEST PRIORITY

### Current Safe Checkpoint

**Branch:** `work/reality-tv-polish-r2-20260915`

**Commit:**
`a6eab94de55f2a46fe77f16d1b2f0e8ceeca6a9f`

**Message:** `Checkpoint Reality TV browser findings corrections - browser pending`

**Parent checkpoint:**
`6617ca598ee6085f02249ea3b18591efe9bf47ab`

### Verification Status

- 48/48 Reality/RTV test files PASS on Work Mac.
- JavaScript syntax checks PASS.
- `frontend/api.js` and `frontend/js/api.js` are byte-identical mirrors.
- Corrected Reality source successfully compiled through Wrangler before the local Workers runtime refused to launch due OS support.
- **Browser acceptance is still pending.**

### Work Mac Environment Limitation

Work Mac is macOS 11.6 / Darwin 20.6.0.

Wrangler 4.50.0 can install and compile the project, but Cloudflare `workerd` refuses to run because it requires macOS 13.5+.

This is an environment blocker, not a Reality source failure.

Do not modify Reality source just to work around the Work Mac `workerd` limitation.

### Reality R2 Corrections Already Implemented

- Spoiler Shield changed from passive section appearance to compact actionable control.
- Spoiler reveal continues to use existing privacy/reveal logic.
- Sole Survivor scroll-collapse is now runtime-driven rather than CSS-only.
- More Stats reduced to a subtle secondary action.
- Contestant typography/density tightened.
- Previous Episode duplication root cause fixed; rendering is intended to be idempotent.
- Historical episodes retain user saved selections and actual result/eliminated details.
- Vote Detail remains `Voter | Voted For | Round | Status | Value`.
- Standings presentation aligned more closely to common PATTC language.
- Reality Compare moved toward common PATTC Compare presentation.
- Historical Compare now accepts an eligible episode ID through a narrow API/backend adapter.
- Historical Compare preserves lock/spoiler privacy and rejects hidden/unlocked episodes before group picks are read.

### Exact R2 Changed Files

- `backend/Api.js`
- `backend/engines/RealityTvSeasonEngine.js`
- `frontend/api.js`
- `frontend/css/picks.css`
- `frontend/js/api.js`
- `frontend/js/pages/picks.js`
- `tests/reality_awards_rc16_results_ready_followup_tests.js`
- `tests/reality_tv_player_polish_r1_tests.js`

### Browser Acceptance Items Still Required

Verify on a real browser/runtime:

- Spoiler Shield ON/OFF visual state and action.
- Sole Survivor expanded → compact sticky transition after scrolling → restored expanded state on scroll-back.
- More Stats remains visually subtle.
- Previous Episodes show exactly one entry per episode, including after refresh/navigation.
- Previous Episode expanded content shows saved pick and actual result/eliminated contestant without large bios.
- Standings presentation remains usable/collapsible.
- Compare defaults to latest eligible episode and can switch to older eligible episodes.
- Compare does not reveal other users' picks before eligible.
- Mobile has no horizontal overflow and long names wrap correctly.

### Reality Layout Lock

Player order:

**Hero → Spoiler Shield → Sole Survivor → Current Episode Questions → Your Season → Standings → Compare → Previous Episodes → Rules / How to Play**

Do not create another Reality layout generation. Continue the existing Reality Clean/Cinematic framework in `frontend/js/pages/picks.js` and `frontend/css/picks.css`.

---

## Awards / Staked Prediction

### Production Baseline

Awards Stakes R1 is already integrated in `architecture-cleanup` at `3be0fca`.

### Continuation Branch

**Branch:** `codex/awards-stakes-launch-readiness`

**Current branch SHA:** `3be0fca681b988f403b7138070539f52bf96299d`

Codex created the branch/worktree but made **no additional code changes** before hitting the usage limit.

### Known Launch Blockers

- Top Staked Prediction Points balance does not dynamically reflect projected balance while risk changes.
- Confirm Pick takes roughly 10+ seconds in observed browser testing; target is approximately 1–3 seconds under normal conditions.
- Availability semantics are wrong: `Available From/Until` should control pick/edit window, not game visibility.
- After pick window expiry, players still need to view saved picks, wagers, results, stats, standings, compare, and rules in read-only mode.
- Admin must always be able to edit expired availability dates.
- Need explicit Hub Assignment control with legacy fallback when unset.
- Need top Awards stats bar: Rank, Score, Points Behind, Statues/Categories Won, Pending Points, Available Staked Points.
- Need common PATTC Standings and Compare.
- Rules + How to Play should be bottom collapsibles.
- Appearance/Image Pack remains a blocker.
- Save failure UI currently hides backend error detail because frontend prefers only `result.message`; should surface `message || error`.

### Awards Appearance / Image Pack Known Issue

Observed behavior indicates Emmy images may exist as per-game overrides instead of being truly stored in the selected `Emmy2026` pack.

Desired operation:

**Move/Copy Game Images to Selected Image Pack**

Requirements:

- reuse existing Drive refs, no reupload;
- copy active game overrides into selected pack;
- verify each copy before clearing corresponding override;
- keep override active if copy fails;
- invalidate runtime cache;
- return copied/cleared/skipped/errors.

Do not revisit Awards until Reality and the football launch cut are closed unless explicitly reprioritized.

---

## Football / Sports Launch Cut

Goal is no longer to polish every sports mode simultaneously. Goal is to ship a usable football core quickly.

### Team Fantasy

Status: closest sports mode to launch-ready.

Existing major capabilities already implemented/tested across prior releases:

- 8 positions: QB, RB, WR/TE, OL, K, DL, LB, DB.
- Manual / Random / Auto picks.
- pre-kickoff replacement enforcement.
- usage limits.
- weekly H2H/all-play W-L-T.
- two-entry support option.
- kickoff-aware reminders.
- durable auto-fill worker.
- retry protections.
- logout push privacy.
- per-game canonical routing.

Launch cut should focus only on current live correctness and UI usability, not new features.

### Survivor / Sports Survivor

Substantial UI/logic exists, but not production-ready.

Known blocker:

- real sports runtime routing mismatch where real payload previously showed `sportsMode=false` while local preview forced sports mode with synthetic matchups.

**Synthetic matchup data must never be allowed into production.**

Locked player structure:

**Hero → Weekly Matchup Slider → Selected Team / Finalize Pick → Survivor Stats / Used Teams → Standings → Compare → Rules**

No autosave; explicit Finalize.

### Confidence

Design direction is locked but implementation/finalization still needs work.

**NO slider.** Games remain stacked vertically.

Locked player order:

**Hero → Player Stats → Active/Upcoming stacked matchups → Locked/Finished matchups → Standings → Compare → Rules → How to Play**

Do not redesign before the football launch cut decision is made.

---

## Visual Studio R3 — PARKED

**Branch:** `kent/owner-visual-studio-r3-local-20260914`

**Committed checkpoint:**
`6659372d021385747d45f3b573ae96cba4ff51e6`

**Message:** `Checkpoint Owner Visual Studio R3 responsive controls`

The committed R3 checkpoint is safely on GitHub.

MainMac historically still had additional uncommitted/untracked Visual Studio-related files outside the checkpoint. Do not clean/reset/delete that MainMac tree casually.

Browser acceptance for R3 was blocked by local proxy/upstream problems and is not a current launch priority.

Do not merge Visual Studio work into current Reality/Awards/sports release work.

---

## Tool / Environment Guidance

### VS Code / Git

- Branches are safety checkpoints, not separate production apps.
- Closing VS Code terminals does not delete work.
- Prefer one terminal and one worktree at a time.
- Avoid `git clean`, `git reset --hard`, deleting worktrees, or mass branch cleanup until current-state file says it is safe.

### Riley

Use Riley for implementation passes when useful.

Riley outputs must be treated as reports until independently verified.

If Riley cannot access the Mac worktree, use a patch against an exact baseline commit and verify with `git apply --check` before applying.

### Codex

Codex is optional audit/review, not a release gate.

Current Codex limit was hit and availability resumes later; do not wait for Codex to finish launch work.

### Wrangler / Cloudflare

- MainMac can run the local Wrangler preview workflow.
- Work Mac macOS 11.6 cannot run current Cloudflare `workerd` locally.
- On Work Mac, prefer a remote Cloudflare Pages preview deployment or use MainMac for final local browser acceptance.
- Do not change source to compensate for unsupported Work Mac runtime.

---

## Release / Certification Policy

The app had already passed broad production certification before the recent UI-polish branches. Do not restart months of certification for every appearance tweak.

Use this release cadence:

1. Focused tests while iterating.
2. Real browser acceptance by Joel.
3. Full production regression gate once at the release checkpoint.
4. Integrate.
5. Deploy.
6. Smoke test production.

Do not call a feature live/release-ready merely because tests pass.

---

## Branches That Matter Right Now

- `architecture-cleanup` → production source baseline at `3be0fca`
- `coordination/pattc-current-state` → this canonical project-state file
- `work/reality-tv-polish-r2-20260915` → Reality R2 corrected checkpoint at `a6eab94`
- `codex/awards-stakes-launch-readiness` → clean Awards continuation branch at `3be0fca`
- `kent/owner-visual-studio-r3-local-20260914` → Visual Studio R3 checkpoint at `6659372`

Older backup/feature branches can be cleaned later, but branch cleanup is not a launch task.

---

# NEXT ACTION

**Finish Reality TV browser acceptance before touching another feature.**

On the Work Mac, first attempt a **Cloudflare Pages preview deployment** of the Reality R2 branch so Joel can view the corrected UI without local `workerd`.

Start by identifying the existing Cloudflare Pages project from the Reality R2 worktree. Do not deploy to production and do not merge `work/reality-tv-polish-r2-20260915` into `architecture-cleanup` yet.

If a safe remote preview cannot be produced quickly, use the MainMac for the final Reality browser pass instead of spending more time fixing the Work Mac environment.

Once Reality is visually accepted:

**full gate once → integrate Reality → deploy → smoke test → move to football launch cut.**
