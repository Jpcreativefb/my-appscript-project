# PATTC Cookoff R9 — Mobile experience staging handoff

Branch: `feature/cookoff-mobile-experience-r9`
Baseline: `feature/cookoff-experience-r1` at `4811fa7dd4e4dfd9cc7eb347459f3fd1eddc6b9c`

## Implemented in this isolated branch
- Split existing player view into Enter Cookoff, Vote / Judge, and Results panels.
- When registration is closed, hide entry navigation. When results are released and voting ends, default to results.
- For <=700px and ranked/combined ballots, show compact dish rows with assigned color stripe, subtle food photo, dish title, tasting checkbox, expandable info and ingredients, touch reorder handle, desktop drag hooks, and up/down buttons.
- Preserve the authenticated voting API and existing server-side scoring/authorization.
- Keep the full existing criteria-only ballot path intact.

## Not yet implemented
- Admin palette selection and strict color-versus-number choice; existing color rendering is reused.
- Cookoff registration schedule/automatic transition, contest entrant self-rank locking, official judge appointment/multipliers, entry divisions, or award categories.
- No production deployment or data migration.

## Manual acceptance on staging
1. Open an existing Voting/Competition test game with registration open. Confirm three navigation tabs and no loss of existing entry data.
2. Submit/edit a test entry and verify admin approval/publishing.
3. Open a phone-width browser (390px). Confirm the compact ballot, recognizable color identifiers, hidden-to-expanded details and images.
4. Mark two dishes "Ate"; verify only tasted dishes appear ranked; reorder via touch grip and via arrow buttons.
5. Ensure untried dishes cannot be ranked by the mobile UI. Configure "Only evaluated/tested entries are eligible" in Admin to enforce this at the server.
6. Submit a ballot only after scoring is finalized; verify reloading retains rank and tasted state, and duplicate save replaces rather than appends.
7. Close registration and verify Entry tab is absent; verify Vote/Results remain navigable. Close voting and release results; verify Results defaults.
8. Check desktop ballot remains operational; test with zero published dishes and an already-voted account.
9. Review visual performance with Safari/iPhone and Chrome/Android, photo fallbacks, touch accessibility and focus.
10. Run existing `tests/cookoff_v1_final_tests.js`, voting competition tests, full targeted regression suite, and `git diff --check`.

## Important engineering audit before merge
- Existing `votingPageBallotLimit_` uses eligible dish count. Check cases with fewer tasted dishes than Top N; verify backend accepts only valid ranks and minimum-evaluated policy is enforced.
- Verify evaluation-save response errors are visible after workspace re-renders.
- Ensure changes based on Oct 18 Cookoff branch are rebased safely against the current release before integration. Do not replace later code.
- Confirm mobile drag doesn't interfere with scroll. No production rollout before physical-device acceptance.

## Boundaries
Do not create a separate Cookoff engine or type; preserve `VotingCompetitionEngine`, dedicated sheets, identity guards, result reveal rules and scoring-contract lock. No merge, deploy, setup operations, or live ballots without Director authorization.


## Integration checkpoint — November 5, 2026
The R9 branch now includes unaccepted changes to:
- Authenticated multi-entry submission and server-locked unique color, number, and combination assignment.
- Admin-managed identifier mode, palette, multi-dish limits, registration deadline, entry awards, rules, host instructions, and pickup directions.
- Per-category ballots and standings with global tasted-state reuse.
- Official judge authorization and weighted scoring by category audience.
- Alternate direct rank entry, per-category partial draft saving, and optional countdown/Next Category navigation.
- A private Apps Script draft-finalization handler with opt-in installation function. **No time trigger has been installed.**
- New tests: cookoff_r9_integration_tests.js and cookoff_r9_multi_entry_tests.js.

### NOT RELEASE-READY / PENDING DESIGN + IMPLEMENTATION
- Contestant automatic locked first-place self-rank is not implemented yet, particularly when the contestant owns multiple dishes.
- Pre-submit reservation that displays a permanent randomized identifier upon entering the form is not implemented; assignment is durable on successful submission only.
- Entry divisions separate from award categories, per-category criteria-scoring settings, and full category-specific judging lifecycle require further work.
- A trigger must be explicitly installed in the isolated preview Apps Script project and an after-deadline finalization test must pass; doing nothing does **not** guarantee drafts are counted.
- Criteria-only drafts are not auto-finalized by the current rank-based finalizer.
- Physical phone, multi-user access, concurrent submission, and timer-trigger tests are still pending.
- Reconcile branch with current accepted release. This branch MUST NOT be pushed directly to production because its underlying history diverges from the release branch.

### Required Work Mac tests before preview deployment
```bash
cd ~/Documents/PATTC-Cookoff-R9-Review
git pull --ff-only
node --check backend/engines/VotingCompetitionEngine.js
node --check frontend/js/pages/adminGameSetup.js
node --check frontend/js/pages/voting.js
node tests/cookoff_r9_mobile_smoke_tests.js
node tests/cookoff_r9_integration_tests.js
node tests/cookoff_r9_multi_entry_tests.js
node tests/cookoff_v1_final_tests.js
node tests/voting_competition_v1218z_tests.js
git diff --check HEAD~34 HEAD
git status --short
```

### Deployment safety gate
1. Do not run the old `install_voting_competition_v1218z.sh` script: it deploys to production.
2. Confirm the exact Apps Script Preview ID and Cloudflare Pages Preview source before attempting staging.
3. Obtain PASS on all targeted regression tests, frontend-browser validation and isolated Apps Script runtime simulations; do not rely on a single syntax test.
4. Test two simultaneous real entries for distinct assignments, two dishes owned by one account, cross-account ownership, judge-only access, categorized ballots, restart/reload draft restoration, and after-deadline finalization.
5. Confirm all requested self-ranking/reservation/division rules and run physical-phone acceptance.
6. Only then prepare a release candidate, rollback checkpoints and a separate production authorization.
