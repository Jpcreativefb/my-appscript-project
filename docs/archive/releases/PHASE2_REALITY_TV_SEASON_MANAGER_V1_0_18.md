# Phase 2B — Reality TV Season Manager v1.0.18

## Purpose

Adds a KISS Reality TV workflow to the main Awards App while preserving the separate External Results Hub architecture.

An administrator enters the season and contestant roster once. The app creates Episode 1 automatically. Each week the administrator records the result, reviews it, and selects **Approve & Build Next Episode**. The completed episode is settled and the next episode is created with only active contestants.

## New normalized sheets

Running the manager creates these sheets in the main Awards App spreadsheet:

- `RealitySeasons`
- `RealityContestants`
- `RealityEpisodes`
- `RealityResultQueue`

The main app remains the source of truth for games, questions, nominees, picks, balances, `CategoryResults`, and leaderboards.

## Main features

- New **Admin → Reality TV Season Manager** page.
- One-time season setup with show, season, year, weekly schedule, lock offset, points, and question template.
- Contestant roster builder with optional image, team/tribe, age, hometown, and occupation.
- Automatically creates the game, Episode 1 question, and all contestant answers.
- Uses permanent contestant IDs across episode questions.
- Creates separate episode questions so historical answers remain unchanged.
- Every result enters `RealityResultQueue` as `PENDING`.
- No automatic settlement without administrator approval.
- **Approve & Build Next Episode**:
  - writes results to `CategoryResults`;
  - locks and settles the completed question;
  - updates contestant status;
  - creates the next episode question;
  - copies only currently active contestants;
  - calculates the new air time and lock time.
- Supports:
  - standard elimination;
  - medical withdrawal;
  - contestant quit;
  - no elimination (question is pushed);
  - double elimination (question is pushed and both contestants are removed).
- Stops creating elimination episodes when one or zero active contestants remain.
- Manual next-episode repair button is included.
- Late-entry contestants can be added without altering historical episode questions.

## External Results Hub integration

The manager can connect to the separate External Results Hub using the Hub spreadsheet URL or ID.

When connected, it mirrors:

- episode events into `ExternalEvents`;
- episode questions/outcomes into `ExternalMarkets`;
- contestants into `ExternalSubjects`;
- generated nominee mappings into `AppMappings`;
- submitted results into `ImportedResults`;
- pending approvals into `ReviewQueue`.

All mirrored results are created with administrator review required and auto-settlement disabled. Hub access failures do not block the main Reality TV workflow.

## Installation

1. Replace the files from the changed-files package in their matching folders.
2. Run `clasp push` from the repository root.
3. Deploy a new Apps Script web-app version.
4. Commit and push the frontend files to GitHub.
5. Allow Cloudflare Pages to deploy.
6. Hard refresh the Awards App.
7. Open **Admin → Reality TV Season Manager**.
8. If the setup page reports missing tables, select **Set Up Manager**.
9. Select **Connect Hub** and paste the External Results Hub spreadsheet URL or ID.

## First controlled test

1. Create a draft test season with three contestants.
2. Confirm Episode 1 appears in Game Setup with all three answers.
3. Record one contestant as eliminated.
4. Confirm the result displays as `PENDING` and nothing is settled yet.
5. Select **Approve & Build Next Episode**.
6. Confirm:
   - Episode 1 is final and locked;
   - the correct `CategoryResults` rows exist;
   - the eliminated contestant is inactive;
   - Episode 2 exists;
   - Episode 2 contains only the two active contestants;
   - the Hub contains the event, market, mappings, imported result, and review record.

## Safety behavior

- Previous episode questions and answers are never edited when a contestant leaves.
- Double eliminations and no-elimination episodes push the single-answer question rather than scoring it unfairly.
- Existing Game Setup delete protections remain unchanged.
- Retrying next-episode creation returns the existing episode instead of creating a duplicate.
