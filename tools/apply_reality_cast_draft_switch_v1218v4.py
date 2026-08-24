#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
MARKER = 'REALITY CAST DRAFT SWITCH v1.2.18v4'


def replace_once(path: Path, old: str, new: str, label: str):
    text = path.read_text()
    if new in text:
        print(f'  OK already applied: {label}')
        return False
    if old not in text:
        raise SystemExit(f'STOP: Could not find expected {label} anchor in {path.relative_to(ROOT)}')
    path.write_text(text.replace(old, new, 1))
    print(f'  PATCHED: {label}')
    return True

engine = ROOT / 'backend/engines/RealityTvSeasonEngine.js'

replace_once(
    engine,
    '''function realityTvCastImportSheetUrl_(spreadsheet, sheet) {\n  return spreadsheet.getUrl() + "#gid=" + sheet.getSheetId();\n}\n''',
    '''/* REALITY CAST DRAFT SWITCH v1.2.18v4 */\nfunction realityTvCastImportSheetUrl_(spreadsheet, sheet, rangeA1) {\n  const rangePart = realityTvString_(rangeA1);\n  return spreadsheet.getUrl() + "#gid=" + sheet.getSheetId() + (rangePart ? "&range=" + encodeURIComponent(rangePart) : "");\n}\n''',
    'RealityCastImport range-aware deep link'
)

replace_once(
    engine,
    '''  const gameId = realityTvSlug_(payload.gameId || (showName + "-" + seasonName + "-" + year));\n  const draftSeasonId = realityTvString_(payload.draftSeasonId) || ("draft-" + gameId);\n  return {\n''',
    '''  const gameId = realityTvSlug_(payload.gameId || (showName + "-" + seasonName + "-" + year));\n\n  // v1.2.18v4: a new show/season must never inherit the prior create-form draft id.\n  // Reuse a staging block only when its server-owned routing metadata matches\n  // the current Game + Show + Season + Format; otherwise create a deterministic\n  // show-aware draft id. This also lets an admin switch back to a prior draft.\n  const generatedDraftSeasonId = "draft-" + realityTvSlug_([gameId, showName, seasonName, year, format.id].join("-"));\n  let draftSeasonId = generatedDraftSeasonId;\n  try {\n    const rows = realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_CAST_IMPORT_SHEET);\n    const existingDraft = rows.find(function(row) {\n      const rowSeasonId = realityTvString_(row.SeasonId);\n      if (realityTvKey_(rowSeasonId).indexOf("draft-") !== 0) return false;\n      return realityTvKey_(row.GameId) === realityTvKey_(gameId) &&\n        realityTvKey_(row.ShowName) === realityTvKey_(showName) &&\n        realityTvKey_(row.SeasonName) === realityTvKey_(seasonName) &&\n        realityTvKey_(row.ShowFormat) === realityTvKey_(format.id);\n    });\n    if (existingDraft) draftSeasonId = realityTvString_(existingDraft.SeasonId) || generatedDraftSeasonId;\n  } catch (ignore) {\n    draftSeasonId = generatedDraftSeasonId;\n  }\n  return {\n''',
    'show-aware new-season draft identity'
)

replace_once(
    engine,
    '''  return {\n    sheet: sheet,\n    sheetUrl: realityTvCastImportSheetUrl_(ss, sheet),\n    profile: profile,\n    adoptedCount: adoptedCount,\n    preparedRowCount: seasonRows.length\n  };\n}\n''',
    '''  const firstPreparedRow = seasonRows.length\n    ? seasonRows.reduce(function(first, row) { return Math.min(first, realityTvNumber_(row.__rowNumber, first)); }, realityTvNumber_(seasonRows[0].__rowNumber, 2))\n    : 2;\n  try { sheet.setActiveRange(sheet.getRange(firstPreparedRow, 1)); } catch (ignore) { /* deep link below is enough */ }\n\n  return {\n    sheet: sheet,\n    sheetUrl: realityTvCastImportSheetUrl_(ss, sheet, "A" + firstPreparedRow),\n    profile: profile,\n    adoptedCount: adoptedCount,\n    preparedRowCount: seasonRows.length,\n    firstPreparedRow: firstPreparedRow\n  };\n}\n''',
    'current-draft prepared-row deep link'
)

asset_old = 'v1218n-reality-production-automation'
asset_new = 'v1218n-reality-production-automation-v1218v4-reality-draft-switch'
for rel in ['frontend/js/app.js', 'frontend/app.js']:
    p = ROOT / rel
    text = p.read_text()
    if 'v1218v4-reality-draft-switch' in text:
        print(f'  OK already applied: cache marker {rel}')
    else:
        if asset_old not in text:
            raise SystemExit(f'STOP: Could not find current Reality asset marker in {rel}')
        p.write_text(text.replace(asset_old, asset_new, 1))
        print(f'  PATCHED: cache marker {rel}')

for rel, count in [('frontend/app.html', None), ('frontend/sw.js', 1)]:
    p = ROOT / rel
    text = p.read_text()
    if 'v1218v4-reality-draft-switch' in text:
        print(f'  OK already applied: cache marker {rel}')
        continue
    if asset_old not in text:
        raise SystemExit(f'STOP: Could not find current Reality asset marker in {rel}')
    p.write_text(text.replace(asset_old, asset_new, count if count is not None else -1))
    print(f'  PATCHED: cache marker {rel}')

print('Reality TV cast draft switching v1.2.18v4 applied successfully.')
