# Phase 2 Reality TV Question Build Verification v1.0.30

## Purpose

Fixes checked Reality TV episode questions that appeared to be missing and cleans the Reality TV Season Manager layout.

## Question build changes

- Stores a per-question build result in `RealityQuestionBuildJobs.BuildResultsJSON`.
- Verifies every checked question before a build job is marked complete.
- Safely repairs missing verification stages from older or interrupted build jobs.
- Shows `Built`, `Verified`, or `Skipped` for each selected question.
- Shows the exact skip reason instead of silently omitting the question.
- Increases the frontend staged-build request budget dynamically for larger packs.
- Does not count temporary `busy` responses as completed stages.
- Preserves idempotent question, answer, and External Results Hub mapping creation.

## Valid skip cases

A checked question can be intentionally skipped when it cannot have at least two valid answers. The manager now explains this. Examples:

- A team/tribe question has no Team / Tribe values in the participant roster.
- Only one active group remains and there is no valid alternate outcome.
- Fewer than two active participants remain.

Questions with one active group plus a configured no-result answer are now allowed because they have two valid outcomes.

## Layout changes

Existing-season question settings are split into collapsible sections:

1. Show Format & Labels
2. Main Elimination / Exit Question
3. Extra Episode / Leg / Round Questions
4. Add Custom Question

New-season setup is split into:

1. Season Basics
2. Main Exit & Extra Questions
3. Optional Season Survivor Pick
4. Participant / Team Roster
5. Publishing & Automation

Question options and major fields now have `?` help popups.

## Data update

The existing `RealityQuestionBuildJobs` sheet receives one new column automatically:

- `BuildResultsJSON`

No manual sheet editing is required.

## Deployment

Backend and frontend deployment are both required.
