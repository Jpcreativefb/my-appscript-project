# Phase 2 — Reality TV Show Format & Question Template Manager v1.0.28

## Purpose

Generalizes the Reality TV Season Manager so it can support more than Survivor-style seasons. Administrators can choose a show format, customize participant/group/period labels, apply a preset question pack, and add reusable custom questions. Every generated result continues to require administrator review and can be mirrored into the External Results Hub.

## Show formats

- Survivor / Tribal
- Cooking Competition
- Performance / Judged Competition
- Social Deduction
- Amazing Race / Team Travel
- Team Competition
- General Elimination
- Fully Custom

## Amazing Race support

Amazing Race seasons use teams as the selectable participant. The contestant importer supports:

- Team Name
- Member 1
- Member 2
- Relationship
- Team Image URL
- Member 1 Image URL
- Member 2 Image URL
- Hometown
- Biography
- Team Color

The default Amazing Race leg pack includes:

- Which team wins the leg?
- Which team finishes last?
- Is it a non-elimination leg?
- Which team wins or uses the Fast Forward?
- Which team receives the U-Turn?
- Which team receives a time penalty?

The main exit question remains the only question that removes a team and advances the season. A non-elimination result does not automatically remove a team.

## Other preset packs

### Cooking Competition

- Individual challenge winner
- Team challenge winner
- Safety / immunity winner
- Bottom finisher

### Performance / Judged Competition

- Highest score
- Lowest score
- Perfect score
- Bottom finisher

### Social Deduction

- Shield / safety winner
- Murdered player
- Banished player
- Will a Traitor be banished?
- Mission winner

### Survivor / Tribal

The existing immunity, Tribal Council, reward, and idol questions remain available and existing Survivor seasons remain backward compatible.

## Custom questions

Administrators can add custom questions for a season with one of these answer sources:

- Active participants or teams
- Active groups
- Groups before a merge and participants afterward
- Yes / No
- Manually entered answers

Custom questions are reusable for future periods, use independent administrator review, create Hub markets/mappings, and do not remove participants or advance the season.

## Existing-season upgrades

Existing Reality TV seasons default to Survivor / Tribal until changed. When an administrator changes the format, the manager updates the current main elimination/exit question and period label. Enabled custom questions are preserved when a different preset is applied. Existing historical questions and picks are not deleted.

## External Results Hub

Each generated preset or custom question creates normalized External Results Hub records when the Hub is connected:

- External event/market
- Team, contestant, or group subjects
- AppMappings for every available answer
- Imported result and ReviewQueue row when a result is submitted

All result imports continue to require administrator approval. Auto settlement remains disabled.

## Files changed

- backend/Api.js
- backend/engines/RealityTvQuestionPackEngine.js
- backend/engines/RealityTvSeasonEngine.js
- frontend/api.js
- frontend/app.html
- frontend/css/styles.css
- frontend/js/api.js
- frontend/js/pages/adminRealityTv.js
- frontend/sw.js
- tests/reality_tv_show_format_manager_tests.js

## Deployment

1. Replace the changed files.
2. Run `clasp push -f`.
3. Edit the existing Apps Script web-app deployment and select **New version**.
4. Commit and push the frontend files to GitHub.
5. After Cloudflare deploys, hard-refresh the application.

## Validation

- 39 repository test files passed.
- JavaScript syntax checks passed for all changed JavaScript files.
- Amazing Race team creation, preset generation, Yes/No markets, Hub team subjects, custom questions, format switching, current-period relabeling, and custom-template preservation were covered by the new runtime test.
