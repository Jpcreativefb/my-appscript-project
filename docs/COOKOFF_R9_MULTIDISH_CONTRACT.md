# Cookoff R9 Multi-Dish Entry — implementation contract

## User requirement
The same authenticated contestant can submit multiple dishes in one Cookoff, while the Entry section is open. Existing entries remain intact.

## Current backend blocker
`votingCompetitionSaveParticipant_` in `backend/engines/VotingCompetitionEngine.js` currently resolves `existing` by username only. A subsequent submission will overwrite the first entry. `apiGetVotingCompetitionState_` returns only `ownEntry`. Do not enable "Submit Another Dish" in the live app until the server supports distinct entry IDs and returns all owned entries.

## Expected behavior
- Admin configures `allowMultipleEntries` and `maxEntriesPerParticipant` (including unlimited); default stays single-entry for legacy Voting/Competition games.
- New submission creates a distinct entry ID, with a separate, server-assigned identifier and photo. Existing entry edits require an explicit owned entry ID; never infer which of several entries to overwrite.
- Ownership is validated using the authenticated session on the server, not a client-supplied username.
- Expose `ownEntries` plus legacy-compatible `ownEntry` for one-entry clients. Listing is limited to the logged-in contestant.
- Each dish has independent entry-name, approval/publish status, category eligibility, image and assigned identifier. Assignments persist across edits. Default category selection is all, with Admin exceptions, but this must be validated and persisted server-side before activation.
- After successful submit, show an assignment receipt with large colored rectangle (or number) and the requested "GOOD LUCK! CAN’T WAIT TO TASTE THAT DISH!!" confirmation. Show "My Cookoff Entries" with Edit and + Submit Another Dish.
- When registration closes, hide creation and editing, but previously submitted entries remain readable in an appropriate contestant history view.
- In color-only mode, guarantee uniqueness across *all entries in that Cookoff*, not per contestant, and handle exhausted palettes; number-only and combo modes similarly enforce unique assignments.
- If a contestant owns several entries, R9 contestant locked self-rank behavior requires a separate explicit policy. Never force several entries into #1 or silently award self-vote points.

## Required tests
1. One account creates two dishes without replacing the first.
2. Editing dish B does not mutate A, including photos, status, color, and categories.
3. A second account cannot edit dish A using forged entry ID.
4. Admin limit 1 and N and unlimited; closed registration cannot create another.
5. Existing one-entry games continue behaving exactly as before.
6. Retry/idempotency: network retry does not create duplicate dishes.
7. Concurrent submissions cannot receive the same identifier.
8. Player listing includes own dishes only; public ballots show only approved published dishes.
9. Assignment locked on edit; approval decisions stay dish-specific.
10. Multi-dish contestant voting self-rank policy agreed before counted ballots.

## Safety
Do not deploy, merge, run setup, or modify existing production sheets until migration and end-to-end verification are accepted. Keep the present R9 HTML entry enhancements as visual groundwork only; custom award selection, host settings, and the multi-entry button require dedicated server/admin integration.
