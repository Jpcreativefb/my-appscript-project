# Reality TV Historical Results v1.2.5

## Purpose

Fix historical Reality TV episode questions so settled results are visible for every question, including multiple winners, without spreading elimination styling to unrelated questions.

## Player behavior

- Main elimination: winning eliminated contestant(s) remain grayscale with an **ELIMINATED** overlay.
- Immunity questions: every settled winner is highlighted with **IMMUNITY**.
- Reward questions: every settled winner is highlighted with **REWARD**.
- Safety questions: every settled safe contestant/team is highlighted with **SAFE**.
- Other preset/custom questions use an appropriate result label when recognized, otherwise **RESULT**.
- Multiple winners are all rendered and all count as correct matches.
- Non-winning answers remain normal.
- A contestant being eliminated in an episode no longer makes that contestant appear eliminated on every other question in that episode.

## Data source

`CategoryResults` is authoritative for settled results. The Reality TV startup payload merges `winnerNomineeIds`, `resultStatus`, and `resultResolved` into player categories. `CategorySettings.winnerNomineeId` remains a fallback for older single-winner history.

## Deployment

This release changes both the Awards App backend and frontend. Run `clasp push`, update the existing Apps Script web deployment to a new version, push GitHub, allow Cloudflare Pages to deploy, then hard refresh. The separate External Results Hub Apps Script project does not change.
