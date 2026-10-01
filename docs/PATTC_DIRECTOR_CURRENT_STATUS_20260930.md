# PATTC DIRECTOR CURRENT STATUS — SEPTEMBER 30, 2026

## Authoritative Director State

- Director integration branch: `director/pattc-repair-batch-r1`
- Current Director commit: `a37f505`
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


## Hub game discovery UX clarification

For the separate Hub/sign-in game discovery enhancement:
- do not use an "Open Game" button
- avoid implying that the card immediately launches a game
- show where the game lives instead, such as "Available in Sports Hub" or "Available in Reality Hub"
- optionally provide a lightweight link to the relevant Hub/location, not directly into the game
- keep the card informational: game name, short description, where to find it
- reuse already-loaded Hub/game data where possible and do not add blocking first-paint requests


## Integration Update — Loading / How-to R2 Follow-up

How-to R2 follow-up live-fix integration: COMPLETE.

Integrated Director commit: `a2a15c0`.

Included:
- returning users now transition to the shorter Game Tips deck after a completed first loading visit
- Skip also records completion
- the persistent How-to "?" control is smaller and positioned lower above Bottom Navigation
- no backend request added
- no Bottom Navigation logic changed
- no Admin behavior changed

Focused R2 regression, syntax, and diff checks passed before integration.

Remaining live check:
- confirm returning-user Game Tips appear on the next visit
- confirm the smaller/lower "?" button placement is acceptable


## Bottom Nav routing correction performance gate

Status: SEND BACK — DO NOT INTEGRATE YET.

Specialist commit reviewed: `346c6baea5fe37f61623858708a149a1e682c6a1` (`Prevent stale bottom-nav route completions`).

Focused routing tests passed:
- bottom_nav_consistency_r1_tests.js
- bottom_nav_routing_consistency_r1_tests.js

However, the Home compact first-paint performance contract failed repeatedly, including on a clean standalone rerun:
`AssertionError: Home compact first-paint path must remain unchanged`.

Because the failure reproduced outside the full production gate, treat it as real until explained. Do not weaken the performance assertion.

Required specialist follow-up:
- diagnose why the shared-router generation/guard change is increasing or destabilizing Home compact first paint
- preserve the stale-route protection
- avoid adding synchronous work to the Home critical path
- keep Bottom Nav Appearance behavior unchanged
- rerun focused routing tests + ed_launch_blocker_performance_tests.js until stable PASS
- then rerun full production checks
- no merge/deploy


## Integration Update — Survivor R2 Live UX

Survivor R2 live UX integration: COMPLETE.

Integrated Director commit: `1f258b9`.
Specialist commit: `57c86d3`.

Included:
- Survivor-specific lazy-module refresh so week browsing / Clear Pick code can surface live
- visible AutoPick strategy choices including Favorite, Spread Favorite, Record, Ranked, and Random
- Random Eligible is no longer forced as the only strategy
- Missed Pick Protection moved to the main Survivor player UI with Admin authority preserved
- larger Game X of Y presentation
- no backend engine modification
- no new blocking Survivor state request
- existing performance/memoization work preserved

Focused Survivor regression, syntax, and diff checks passed before integration.

Remaining live acceptance:
- week selector appears
- past/current/future week states work
- Clear Pick appears and works before kickoff
- duplicate-team protection works across weeks
- AutoPick strategy controls respond
- Missed Pick Protection toggle appears in main UI and respects Admin gate
- Game X of Y size is acceptable
- default resolved current week is correct
- load performance remains improved


## Bottom Nav A/B performance isolation result

Result: performance harness instability confirmed on the same Work Mac.

Accepted baseline `6f81a63`:
- run 1 PASS
- run 2 PASS
- runs 3, 4, and 5 FAIL on the same Home compact first-paint assertion

Routing correction `46d305d`:
- runs 1 through 5 all PASS

Conclusion:
- the Home assertion can fail on the accepted baseline under the same Work Mac environment
- the failure is therefore not attributable to the Bottom Nav routing correction
- do not weaken or remove the performance test
- do not change routing again to chase this synthetic timer variability
- proceed to the full production gate on `46d305d`

Routing correction remains unmerged until full production checks pass.


## Bottom Nav full-gate timing-only failure

Routing commit `46d305d` remains unmerged.

After same-Mac A/B isolation showed the accepted baseline itself intermittently fails the synthetic Home timing assertion while `46d305d` passed 5/5 standalone runs, the full production gate was attempted on `46d305d`.

Gate result:
- JavaScript syntax PASS
- frontend compatibility mirrors PASS
- regression phase stopped in `ed_launch_blocker_performance_tests.js`
- failing assertion this time was `emmysStaked first usable timing must improve materially`

Important:
- the performance harness file is byte-identical between accepted baseline `6f81a63` and `46d305d`
- the executed Picks/API dependencies for this measurement are also unchanged between those refs
- therefore this failure is not evidence that the Bottom Nav routing correction changed the Emmys/Staked path

Do not weaken the performance test and do not alter routing to chase this timing-only failure.
Require one clean full production gate before integration; if repeated gates continue to fail only on synthetic timer assertions, diagnose the harness separately from the routing correction.


## Bottom Nav gate — stale Game Hub routing assertion

Full gate on routing commit `46d305d` advanced past prior timing-only failures and stopped at `tests/games_phase1_integration_tests.js`.

Failure:
`assert(source.includes('await renderGameModeHubPage()'))`

Diagnosis:
- this is a stale ownership/location assertion, not a behavior failure
- Game Hub still routes through `case "game-hub"`
- it still invokes `renderGameModeHubPage()`
- the render is now intentionally wrapped by the shared stale-route commit helper:
  `appCommitAsyncRouteHtml_(app, page, function() { return renderGameModeHubPage(); })`
- both app mirrors use the same guarded path

Allowed correction:
- update only the stale test assertion to match the new authoritative guarded render path
- do not weaken any performance, security, data-integrity, locking, scoring, or user-visible behavior contract
- rerun the full production gate afterward


## Bottom Nav routing correction full gate: PASS

Routing source commit tested: `46d305de5032d101b8043872a12e497d93b649e9`.

Same-Mac A/B isolated the synthetic timing instability:
- accepted baseline `6f81a63` intermittently failed the Home timing assertion
- routing commit `46d305d` passed 5/5 standalone timing runs

One stale Game Hub routing assertion was updated in the detached verification worktree to reflect the new guarded render owner:
`appCommitAsyncRouteHtml_(app, page, function() { return renderGameModeHubPage(); })`

After that update, full production checks PASS:
- 172 JavaScript syntax files PASS
- frontend mirrors PASS
- 298 regression tests PASS
- legacy hardening PASS
- RC1 through RC9 production contracts PASS
- ALL PRODUCTION CHECKS PASSED

Warnings observed but not failures:
- simulated logout push cleanup warning
- SportsOddsApiLog lock diagnostic warning

Status: DIRECTOR ACCEPTED FOR INTEGRATION, pending committing/pushing the stale Game Hub test assertion update onto the specialist branch and then cherry-picking the final specialist head into the Director branch.


## Integration Update — Bottom Nav Routing Correction

Bottom Nav routing integration complete.

Integrated Director commit: `a37f505`.

Accepted behavior:
- stale async route completions can no longer repaint an older page over the newest navigation
- Survivor -> Home late render race is guarded
- stale browser-history completion is rejected
- stale deferred route finalization cannot reset active navigation
- Home compact render path remains direct
- no route-time Bottom Nav restore/re-render was reintroduced
- previously accepted icon/label/Appearance behavior remains intact

Verification:
- focused Bottom Nav consistency PASS
- focused Bottom Nav routing consistency PASS
- Game Hub integration regression PASS after stale ownership assertion update
- Survivor R2 live UX contract PASS
- full production gate previously passed on the final routing behavior: 298 regressions + RC1 through RC9

Mirror synchronization:
- frontend/js/app.js and frontend/app.js are synchronized in Director integration
- this also preserves the Survivor R2 lazy-module cache marker in both mirrors

Status: DIRECTOR ACCEPTED + INTEGRATED.
Remaining live check: repeat Survivor -> Home / other Bottom Nav taps in preview to confirm no intermittent bounce remains.
