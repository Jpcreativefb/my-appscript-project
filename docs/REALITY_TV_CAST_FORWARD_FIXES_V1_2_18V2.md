# PATTC Predicts v1.2.18v2 — Reality Cast Forward Fixes

This hotfix carries the previously validated Reality cast-sheet transport and staging-row fixes forward onto the newer v1.2.18n+ production baseline.

## Fixed

- All new-season and existing-season `RealityCastImport` prepare/preview/load/import calls bypass the generic POST upload bridge and use the normal authenticated Apps Script JSONP transport.
- Matching direct Apps Script `doGet` routes are added while POST routes remain for compatibility.
- `RealityCastImport` no longer applies checkboxes to the entire unused sheet before prepared rows are created.
- Checked rows that already contain a contestant/team identity but have blank routing metadata are adopted into the currently prepared season/draft.
- Server-owned routing columns C:H are hidden from normal editing.
- The sheet keeps a visible 24-row prepared block for the current season/draft.
- Checkbox validation is limited to owned rows and preserves existing TRUE selections.
- The frontend API helper cache URL is bumped so stale PWA/browser sessions request the corrected transport.

## Intended admin test

1. Admin → Reality TV Season Manager → Create Reality TV Season.
2. Enter Show Name, Season Name, Year, Show Format.
3. Prepare / Open New Season Cast Sheet.
4. Enter at least two cast names, check Import.
5. Preview New Season Cast.
6. Load Selected Cast Into Season.
7. Confirm the roster appears before Create Season & Episode 1.

Existing rows entered before this hotfix should not need to be retyped if they are checked and contain Name/FullName/Member1/Member2.
