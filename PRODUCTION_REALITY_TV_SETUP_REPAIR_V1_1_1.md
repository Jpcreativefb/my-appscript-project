# Production Reality TV Setup Repair v1.1.1

## Purpose

This release repairs an activation-blocking Reality TV setup failure where a season could be created successfully but the long initial request stopped after creating only part of the enabled episode question pack. The result could be one extra category with no answers while the activation preflight reported that there were no contestants or answers to pick.

## Reliability changes

### Staged initial question creation

Season creation now completes the following critical data first:

1. Game and normalized season
2. Participant/team roster
3. Group/team records and group-history records
4. Main elimination/exit question
5. All main-question answers

Enabled extra questions are then created through the existing resumable question-build job, one question and answer set at a time. A browser or Cloudflare timeout can be resumed without duplicating categories or nominees.

### Repair from Manage Games

When the activation preflight finds errors on a Reality TV-managed game, the result includes **Repair Reality TV Setup**. The repair:

- Reuses the current episode and existing categories.
- Restores missing main-question answers.
- Creates missing enabled extra questions.
- Adds missing answers to partially created questions.
- Verifies every enabled extra question.
- Reruns the activation check when finished.

The repair is idempotent and safe to run again.

### Safe season retry

Submitting the same create-season form again for an existing season now launches the same repair path instead of only returning a duplicate-season message.

## Tribe, team, and group history

A new normalized sheet is created automatically:

`RealityContestantGroupHistory`

Each assignment stores the participant, group, start episode, optional end episode, assignment type, and notes.

The Reality TV Manager now includes **Participant Group / Tribe History**, where the administrator can set a new tribe/team/group and the first episode where it applies.

Rules:

- Existing episode questions and picks are frozen.
- A switch applies only from the selected episode forward.
- Participant bios show starting, current, final/latest, and full group history.
- Group-based questions use the assignment active for that exact episode.
- Eliminated participants keep their final group in history.

## Merge / individual-play control

The season setting **Individual play starts** determines the first episode/leg/round that should use individual answers.

- `0`: automatic behavior; groups are used while at least two active groups exist.
- A positive episode number: `groups-or-participants` questions switch to individuals starting with that period.
- Questions marked as group-only are skipped after individual play starts, with a visible explanation in the build results.

## Deployment

This release changes Apps Script backend and frontend files. Push the backend with `clasp push -f`, deploy a new version of the existing web app, then push the frontend to GitHub/Cloudflare and hard-refresh.
