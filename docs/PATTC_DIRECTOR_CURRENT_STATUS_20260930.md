# PATTC DIRECTOR CURRENT STATUS — SEPTEMBER 30, 2026

## Authoritative Director State

- Director integration branch: `director/pattc-repair-batch-r1`
- Current Director commit before this documentation update: `20898b4`
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

Status: SEND BACK FOR NARROW PERFORMANCE CORRECTION.

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

R1 is functionally accepted.

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

1. Wait for Specialist 1 narrow Bottom Nav performance correction.
2. Live-test Survivor week browsing / Clear Pick / AutoPick UX on Director preview.
3. Review Specialist 2 How-to R2 when returned.
4. Integrate only accepted work into `director/pattc-repair-batch-r1`.
5. Run final combined production gate only when the batch is ready.
6. Production release requires Joel's explicit approval.
