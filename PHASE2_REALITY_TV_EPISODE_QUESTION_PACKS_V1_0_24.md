# Phase 2 Reality TV Episode Question Packs v1.0.24

## Purpose

Extends the Reality TV Season Manager beyond elimination questions while preserving the stable v1.0.23 staged elimination approval workflow.

## Standard episode question pack

Elimination remains mandatory and continues to control contestant status and next-episode creation.

Optional independent questions:

- Immunity winner
- Tribe going to Tribal Council
- Reward winner
- Hidden immunity idol finder

Immunity and reward use active tribes while two or more tribes remain, then automatically switch to active contestants after the merge. Tribal Council questions are skipped when fewer than two active tribes remain. Idol questions include a `No one` result.

## Normalized sheets

- `RealityQuestionTemplates`
- `RealityEpisodeQuestions`
- `RealityQuestionResultQueue`

## Approval rules

Every result requires administrator review. Supplemental question approvals:

- Write to `CategoryResults`
- Lock and settle only that question
- Update the matching Hub ImportedResults and ReviewQueue rows
- Do not eliminate contestants
- Do not create the next episode

Only the existing elimination workflow changes the roster and builds the next episode.

## External Results Hub

Each generated question creates:

- One `ExternalMarkets` row
- Reusable contestant or tribe `ExternalSubjects`
- One `AppMappings` row per answer
- A pending `ImportedResults` and `ReviewQueue` row when a result is submitted

All mappings use `manual-reality-tv`, `AutoSettle = FALSE`, and `RequireAdminReview = TRUE`.

## Existing seasons

Open the season card, expand `Episode Question Pack`, select the desired question types, and choose `Save & Build Current Episode`.

Generated historical questions are never deleted when a template is later disabled.

## Installation

This release changes both Apps Script and Cloudflare frontend files.

1. Replace the listed changed files.
2. Run `clasp push -f`.
3. Edit the existing Apps Script web-app deployment and choose `New version`.
4. Commit and push the frontend files to GitHub.
5. After Cloudflare deploys, hard-refresh the Awards App.

## First use for an existing season

1. Open `Admin → Reality TV Season Manager`.
2. Expand the season.
3. Expand `Episode Question Pack`.
4. Select the desired question types.
5. Choose `Save & Build Current Episode`.
6. Open Game Setup to verify the new questions and answers.
7. Return to the manager to submit each result for review.
