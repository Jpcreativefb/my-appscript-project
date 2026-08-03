# Phase 2 Reality TV Visual Roster & Episode Layout v1.0.31

## Included

- Per-question Answer Display and Image Source controls in the Reality TV Manager.
- Main elimination/exit question display and image controls.
- Automatic reuse of participant, couple, and team roster images.
- Normalized `RealityGroups` table for tribe/team/group names, images, colors, status, and order.
- Group/team image and color editor inside each Reality TV season.
- Season Survivor Pick permanently shown above episode questions with:
  - Current participant/team image
  - Current and next multiplier
  - Current and longest streak
  - Total bonus, penalties, and net adjustment
  - Maximum weekly bonus
  - Expandable participant/team profile
- Newest Episode, Leg, Round, Week, or Heat immediately below the Season Survivor Pick.
- Older periods shown as collapsed sections beneath the newest period.
- Expandable participant/team biography and profile details.
- Tribe/team grouping with group-color borders and optional group images.
- `YOUR PICK` highlighting on selected answers.
- `ELIMINATED` image overlay with 50% opacity and grayscale treatment.
- Compatibility matching for older `tribe-*` and `group-*` nominee IDs.

## Display choices

Each generated question can use:

- Automatic
- Image cards
- Compact image cards
- List
- Text cards

Each generated question can use images from:

- Participant/team roster
- Saved group/tribe image
- Custom answer images
- No images

Missing images fall back safely without breaking the question.

## New normalized sheet

`RealityGroups`

Columns include season/game IDs, group ID/name/type, image URL, color, active state, display order, and timestamps.

## Historical safety

- Historical episode questions and answers are not deleted.
- Eliminated contestants remain visible on historical questions.
- Existing open questions may receive updated presentation settings.
- Final historical scoring remains unchanged.

## Deployment

This release changes both Apps Script backend and Cloudflare frontend files. Push the backend with `clasp push -f`, deploy a new Apps Script web-app version, then commit/push the frontend and hard-refresh after Cloudflare deployment.
