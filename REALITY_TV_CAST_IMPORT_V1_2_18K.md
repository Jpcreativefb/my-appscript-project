# Reality TV Cast Import Staging — v1.2.18k

Adds a `RealityCastImport` staging tab to the main PATTC Predicts spreadsheet and connects it to the existing Reality TV Season Manager uploader.

## Supported show-aware profiles
- Survivor / Tribal
- The Amazing Race
- Dancing with the Stars (Performance format + show name)
- The Traitors / Social Deduction
- Special Forces: World's Toughest Test
- Other Reality TV formats

## Admin workflow
1. Open Admin → Reality TV Season Manager.
2. Expand the season.
3. Expand Add participant(s) to this season.
4. Under Reality Cast Import Sheet choose Prepare / Open Cast Sheet.
5. Open the returned `RealityCastImport` link.
6. Fill the rows already assigned to the season. Unused columns may stay blank.
7. Check `Import` for the rows you want to send to the live roster.
8. Back in Reality TV Manager choose Preview Sheet.
9. Fix any errors, then choose Import Selected Rows.
10. The sheet marks successful rows IMPORTED or UPDATED and clears their Import checkboxes.

Existing contestant status/elimination history is preserved when a staging row updates an existing contestant. Existing current tribe/group values are not overwritten merely by updating a bio/photo.

`AdminNotes` remains staging-only and is not copied into the player-facing contestant table. Secret Faithful/Traitor roles should not be stored in this normal cast import sheet.


## Production baseline
This release is rebased for production checkpoint `fe116ab` and is intentionally numbered `v1.2.18k` to avoid the older `18i` notification/reality manifest collision.
