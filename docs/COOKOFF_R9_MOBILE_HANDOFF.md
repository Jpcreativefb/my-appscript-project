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
