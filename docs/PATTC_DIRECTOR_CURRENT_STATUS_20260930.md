# PATTC DIRECTOR CURRENT STATUS — SEPTEMBER 30, 2026

## Authoritative Director State

- Director integration branch: `director/pattc-repair-batch-r1`
- Current Director commit: `a393ac6`
- Production remains unchanged.
- Production branch remains `architecture-cleanup`.
- Known production baseline before this repair batch: `eb3bd11`.
- Existing production Apps Script deployment ID remains protected:
  `AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo`
- Do not deploy production without Joel's explicit approval.

## Accepted / Integrated in Director Batch

1. Admin read retry
2. PATTC Director operating standard
3. Loading / How-to Play R1 — functionally live-tested and accepted
4. NFL Survivor Player Experience R1 — live load improved from roughly 62 sec to about 15–17 sec
5. Survivor Week Browsing / Advance Picks — integrated at Director commit `20898b4`
   - week selector
   - past-week read-only browsing
   - future advance picks
   - cross-week duplicate-team protection
   - Clear Pick
   - AutoPick UX correction
   - larger/outward matchup arrows
   - stronger `Game X of Y`

## Pending Live Review — Survivor

Check on the Director Cloudflare preview:

- week selector appears
- past weeks browse read-only
- future weeks accept advance picks
- Clear Pick works before kickoff
- duplicate-team protection works across weeks
- AutoPick modal controls are interactive
- arrows remain visible/easier to tap
- `Game X of Y` is more prominent
- default week resolves correctly
- load time remains near the improved ~15–17 sec range

## Specialist 1 — Bottom Navigation Consistency R1

Status: DIRECTOR ACCEPTED AND INTEGRATED.

Real Work Mac checks already passed:
- focused Bottom Nav regression
- JS syntax
- frontend mirrors
- `git diff --check`
- Home Hub nav compatibility after stale ownership assertions were updated
- Home identity / Hub Appearance after stale ownership assertions were updated
- Hub media / gradients after stale ownership assertions were updated

Full production gate still fails at:
`tests/ed_launch_blocker_performance_tests.js`

Contract:
`Home compact first-paint path must remain unchanged`

Do not weaken this performance contract.

Specialist 1 must identify which Bottom Navigation change adds work to Home compact first paint and correct that narrowly while preserving:
- one resolved nav source of truth
- icon OFF stays OFF
- label OFF stays OFF
- valid Appearance replaces fallback
- empty Appearance does not erase last valid settings
- route changes do not restore stale fallback
- remote icon failure distinct from intentionally disabled icon
- six-slot contract
- Home Hub appearance behavior

Do not restore the old duplicated Dashboard renderer/cache simply to satisfy the test.

## Specialist 2 — Loading / How-to R2

Status: DIRECTOR ACCEPTED AND INTEGRATED.

Integrated commit: `a393ac6`.

R1 was functionally accepted and R2 refinement is now integrated.

R2 refinement requested:
- mobile-first fuller How-to presentation
- larger typography/spacing
- more precise game-specific explanations for Team Fantasy, Confidence, Survivor, Playoff Race
- lightweight local/static illustrations only
- Previous / Next
- slower rotation
- Finish How-To / Skip
- game still opens immediately when ready
- returning users may see Tips/rule reminders/strategy notes
- allow reopening full How-to where practical
- no new backend dependency
- no Bottom Nav changes
- no Admin behavior changes
- no artificial delay

## Simplified Process — Required Going Forward

### If specialist can push

`specialist branch -> focused tests -> commit -> push -> Director review -> one cherry-pick -> push Director -> verify local/remote SHA`

### If specialist cannot push

Use:
- `SPECIALIST_REPORT.md`
- `FILES_CHANGED.txt`
- `TEST_RESULTS.txt`
- `RISKS_AND_OPEN_ITEMS.md`
- `APPLY_PLAN.md`
- complete new test files only

Do not use:
- Google Drive
- temporary docs
- Base64/LZW reconstruction
- whole-file reconstruction
- hand-built PATCH.diff
- many manual file-copy commands

Director applies the plan to the real worktree with a guarded helper script.

## Command / Testing Rule

- one short command per phase
- avoid long multiline paste chains on Work Mac
- use guarded one-command apply/verify scripts when practical
- focused tests during specialist work
- full production gate at meaningful acceptance checkpoints, not every tiny change
- do not repeat cherry-picks
- verify branch/status before commit
- verify local/remote SHA after push

## Anti-Drift Rule

Every specialist assignment must begin/resume with:
- specialist number
- exact task
- branch/worktree
- starting commit
- in-scope files/systems
- forbidden scope
- expected tests
- no merge / no deploy

If a specialist starts discussing another task, stop and re-anchor immediately.

If a specialist chat repeatedly times out, start a fresh compact specialist session rather than continuing a broken reconstruction workflow.

## Next Exact Actions

1. Live-test Bottom Navigation R1 on the Director Cloudflare preview.
2. Live-test Survivor week browsing / Clear Pick / AutoPick UX on the Director preview.
3. Live-test Loading / How-to R2 presentation and no-delay behavior.
4. Run the final combined production gate when live checks are accepted.
5. Prepare one PR / merge / production deployment only with Joel's explicit approval.


## Live Review Update — Bottom Navigation R1

Bottom Navigation live review: PASS.

Verified on Director preview:
- icon OFF stays blank with no emoji/fallback
- label OFF stays hidden
- icon/label re-enable correctly
- route changes do not restore stale fallback
- refresh preserves last valid Appearance
- failed remote custom icon does not turn into fallback emoji
- Home remains fast

Bottom Navigation R1 is live-accepted for this batch.


## Live Review Update — Survivor R1/R2

Status: SEND BACK FOR NARROW UX / INTEGRATION CORRECTION.

Director preview findings:
- week selector does not appear
- past/future week browsing therefore cannot be exercised
- duplicate-team blocking across weeks cannot be live-verified yet
- Clear Pick is not visible
- AutoPick modal does not expose the requested pick-strategy choices such as Record / Favorite / Ranked
- Random Eligible appears forced on
- Missed Pick Protection cannot be toggled
- preferred UX: move Missed Pick Protection out of the modal and place it in the main Survivor UI near Clear Selected Pick once a pick exists
- matchup arrows are good
- Game X of Y is clearer but still needs to be larger
- current-week default cannot be verified because the week selector is missing
- load performance remains materially improved

Important: the Director branch source does contain Survivor week-browsing / Clear Pick implementation markers, so the live absence should be diagnosed as an integration/runtime/rendering issue rather than assuming the feature was never merged.

Required specialist correction:
1. make the week selector actually render in the live Survivor player UI
2. make past/current/future week states accessible from it
3. make Clear Pick visibly available for editable current/future picks
4. restore real AutoPick strategy selection controls; Random Eligible must not be forced
5. move Missed Pick Protection to the main Survivor UI near Clear Selected Pick, with a working on/off control
6. make Game X of Y larger/more prominent
7. preserve the accepted performance improvement
8. do not redesign unrelated Survivor behavior
9. do not merge or deploy


## Live Review Update — Bottom Navigation Intermittent Route Bounce

Status: REOPENED FOR NARROW ROUTING CORRECTION.

Live defect:
- intermittently, tapping a Bottom Navigation destination can return the user to the previously open page before trying to load the requested destination again
- observed example: tapping Home from Survivor briefly/incorrectly returned to Survivor, then attempted navigation again

Previously accepted icon/label/appearance behavior remains good.

Required correction:
- diagnose the duplicate/stale navigation event or route-state race
- one tap must result in one destination transition
- do not reintroduce stale nav restore/re-render work
- preserve Home compact first-paint performance
- preserve icon OFF, label OFF, Appearance persistence, and remote-icon-failure behavior
- do not redesign Bottom Navigation


## Live Review Update — Loading / How-to R2

Status: CONDITIONAL PASS — SMALL PRESENTATION REFINEMENT ONLY.

Live PASS:
- larger mobile guide presentation
- correct game-specific instructions for Team Fantasy, Confidence, Survivor, and Playoff Race
- Previous / Next work
- Skip / Finish How-To work
- local diagrams/examples display correctly
- game opens immediately when ready; How-to does not block
- Admin pages behave normally

Needs small correction:
- returning-user shorter tips behavior was not observed live; verify/fix that path
- make the persistent "?" reopen control smaller and move it lower on the page

New enhancement request (separate from R2 acceptance):
- on Hub pages and/or after sign-in, show a compact set of different available games with a short description of each game
- should reuse already-loaded active-game / hub data where possible and avoid adding a blocking backend request to first paint
- keep this as a lightweight discovery/presentation enhancement, not a redesign of the Home Hub
