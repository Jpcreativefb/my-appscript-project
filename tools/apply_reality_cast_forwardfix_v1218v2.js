#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const changed = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) throw new Error(`Missing required file: ${rel}`);
  return fs.readFileSync(p, 'utf8');
}
function write(rel, text, before) {
  if (text === before) return;
  fs.writeFileSync(path.join(root, rel), text);
  changed.push(rel);
}
function replaceAllRequired(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Could not find ${label}`);
  return text.split(from).join(to);
}

// ---------------------------------------------------------------------------
// 1) Cast staging operations are small server-owned calls. Route them directly
//    to Apps Script JSONP rather than the generic upload/POST bridge that can
//    surface an Apps Script HTML page as "invalid response".
// ---------------------------------------------------------------------------
for (const rel of ['frontend/js/api.js', 'frontend/api.js']) {
  const before = read(rel);
  let text = before;
  for (const action of [
    'adminPrepareRealityCastDraft',
    'adminPreviewRealityCastDraft',
    'adminLoadRealityCastDraft',
    'adminPrepareRealityCastImport',
    'adminPreviewRealityCastImport',
    'adminImportRealityCastImport'
  ]) {
    text = replaceAllRequired(
      text,
      `return apiAdminRealityTvPostRequest_("${action}", payload || {});`,
      `return apiAdminRealityTvRequest_("${action}", payload || {});`,
      `${action} frontend transport`
    );
  }
  write(rel, text, before);
}

// ---------------------------------------------------------------------------
// 2) Add direct doGet/JSONP routes. doPost routes remain for compatibility.
// ---------------------------------------------------------------------------
{
  const rel = 'backend/Api.js';
  const before = read(rel);
  let text = before;
  const marker = '/* REALITY CAST FORWARD FIXES v1.2.18v2 */';
  const doGetPos = text.indexOf('function doGet(e)');
  if (doGetPos < 0) throw new Error('Could not find doGet(e) in backend/Api.js');
  const doGetText = text.slice(doGetPos);
  const actions = [
    'adminPrepareRealityCastDraft',
    'adminPreviewRealityCastDraft',
    'adminLoadRealityCastDraft',
    'adminPrepareRealityCastImport',
    'adminPreviewRealityCastImport',
    'adminImportRealityCastImport'
  ];
  const missing = actions.filter(action => !doGetText.includes(`if (action === "${action}")`));
  if (missing.length) {
    const anchor = '    if (action === "adminSubmitRealityTvResult") {';
    const pos = text.indexOf(anchor, doGetPos);
    if (pos < 0) throw new Error('Could not find Reality TV doGet insertion anchor.');
    let block = `    ${marker}\n`;
    for (const action of missing) {
      const fn = 'api' + action[0].toUpperCase() + action.slice(1);
      block += `    if (action === "${action}") {\n`;
      block += `      return json(${fn}(params));\n`;
      block += `    }\n`;
    }
    block += '\n';
    text = text.slice(0, pos) + block + text.slice(pos);
  }
  write(rel, text, before);
}

// ---------------------------------------------------------------------------
// 3) Repair RealityCastImport staging-row placement/recovery. This preserves
//    checked rows an admin already typed into and attaches missing server-owned
//    draft/season routing metadata on Prepare/Preview.
// ---------------------------------------------------------------------------
{
  const rel = 'backend/engines/RealityTvSeasonEngine.js';
  const before = read(rel);
  let text = before;
  const newMarker = '/* REALITY CAST STAGING FORWARD FIX v1.2.18v2 */';
  const alreadyFixed = text.includes(newMarker) || text.includes('REALITY CAST STAGING ROWS v1.2.18m2');
  if (!alreadyFixed) {
    const startAnchor = 'function realityTvPrepareCastImportSheet_(season) {';
    const endAnchor = 'function realityTvNormalizeCastImportRow_(row, season, profile) {';
    const start = text.indexOf(startAnchor);
    const end = text.indexOf(endAnchor, start);
    if (start < 0 || end < 0) throw new Error('Could not locate Reality cast staging function anchors.');

    const replacement = `${newMarker}\n` + String.raw`function realityTvCastImportIdentityPresent_(row) {
  return !!(
    realityTvString_(row && row.Name) ||
    realityTvString_(row && row.FullName) ||
    realityTvString_(row && row.Member1) ||
    realityTvString_(row && row.Member2)
  );
}

function realityTvCastImportSystemFields_(season, profile) {
  return {
    SeasonId: season.SeasonId,
    GameId: season.GameId,
    ShowProfile: profile.label,
    ShowFormat: season.ShowFormat,
    ShowName: season.ShowName,
    SeasonName: season.SeasonName,
    LastError: ""
  };
}

function realityTvAdoptUnscopedCastRows_(season, profile) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(REALITY_TV_CAST_IMPORT_SHEET);
  if (!sheet) return 0;
  const rows = realityTvReadObjects_(ss, REALITY_TV_CAST_IMPORT_SHEET);
  let adopted = 0;
  rows.forEach(function(row) {
    if (realityTvString_(row.SeasonId) || realityTvString_(row.GameId)) return;
    if (!realityTvBool_(row.Import)) return;
    if (!realityTvCastImportIdentityPresent_(row)) return;
    realityTvUpdateObjectRow_(sheet, row.__rowNumber, realityTvCastImportSystemFields_(season, profile));
    adopted += 1;
  });
  return adopted;
}

function realityTvCastImportLastMeaningfulRow_(rows) {
  return (rows || []).reduce(function(last, row) {
    const meaningful = Object.keys(row || {}).some(function(header) {
      if (header === "__rowNumber" || header === "Import") return false;
      return realityTvString_(row[header]) !== "";
    });
    return meaningful ? Math.max(last, realityTvNumber_(row.__rowNumber, 1)) : last;
  }, 1);
}

function realityTvPrepareCastImportSheet_(season) {
  const ss = SpreadsheetApp.getActive();
  const sheet = realityTvGetOrCreateSheet_(ss, REALITY_TV_CAST_IMPORT_SHEET, REALITY_TV_CAST_IMPORT_HEADERS);
  const profile = realityTvCastImportProfile_(season);
  const schema = realityTvHeaderMap_(sheet);
  const headerRange = sheet.getRange(1, 1, 1, schema.headers.length);
  headerRange.setFontWeight("bold").setWrap(true);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(Math.min(2, schema.headers.length));

  // Server-owned routing fields stay available to the importer but are hidden
  // from normal editing so the cast sheet reads like a staging worksheet.
  if (schema.headers.length >= 8) {
    try { sheet.hideColumns(3, 6); } catch (err) { /* already hidden is fine */ }
  }

  const notes = {
    Import: "Check the rows you want Preview / Import to use.",
    ImportStatus: "Filled automatically after import: IMPORTED, UPDATED, SKIPPED, or ERROR.",
    SeasonId: "System field. Filled automatically; do not enter it manually.",
    GameId: "System field. Filled automatically; do not enter it manually.",
    ShowProfile: "System field. Selected automatically from the show format.",
    ShowFormat: "System field. Filled automatically from Reality TV Season Manager.",
    ShowName: "System field. Filled automatically from Reality TV Season Manager.",
    SeasonName: "System field. Filled automatically from Reality TV Season Manager.",
    Name: "Playable display name. Survivor/Traitors/Special Forces require this. Amazing Race can auto-build it from Member 1 & Member 2.",
    ImageUrl: "Image used by the app. Blank is allowed during staging and produces only a preview warning.",
    TeamOrTribe: "Starting tribe/team/group. For Survivor this is the starting tribe.",
    TeamColor: "Optional color name or hex value for tribe/team display.",
    Member1: "Amazing Race racer 1 or DWTS celebrity.",
    Member2: "Amazing Race racer 2 or DWTS professional partner.",
    KnownFor: "What the contestant is known for: actor, athlete, reality personality, etc.",
    OriginalShowOrSport: "Prior show/franchise or sport, especially useful for Traitors and Special Forces.",
    RecruitNumber: "Optional Special Forces recruit number.",
    SourceUrl: "Official cast/bio page or other source used to verify the contestant information.",
    ImageSourceUrl: "Page where the original image was obtained.",
    AdminNotes: "Staging-only notes. These are NOT copied to the player-facing RealityContestants table."
  };
  schema.headers.forEach(function(header, index) {
    if (notes[header]) sheet.getRange(1, index + 1).setNote(notes[header]);
  });

  const widths = {
    Import: 70, ImportStatus: 115, SeasonId: 180, GameId: 180, ShowProfile: 130, ShowFormat: 130,
    ShowName: 170, SeasonName: 150, Name: 180, FullName: 180, ImageUrl: 260, TeamOrTribe: 140,
    TeamColor: 100, Member1: 170, Member1ImageUrl: 240, Member2: 170, Member2ImageUrl: 240,
    Relationship: 150, Age: 70, Hometown: 160, Occupation: 160, KnownFor: 170,
    OriginalShowOrSport: 170, RecruitNumber: 100, Biography: 320, ExternalSubjectId: 180,
    SourceUrl: 260, ImageSourceUrl: 260, AdminNotes: 240, ImportedAt: 150, LastError: 260
  };
  schema.headers.forEach(function(header, index) {
    if (widths[header]) sheet.setColumnWidth(index + 1, widths[header]);
  });

  // Recover rows typed into the old blank checkbox area. A checked row with a
  // cast identity and no routing metadata belongs to the season/draft currently
  // being prepared.
  const adoptedCount = realityTvAdoptUnscopedCastRows_(season, profile);

  let rows = realityTvReadObjects_(ss, REALITY_TV_CAST_IMPORT_SHEET);
  let seasonRows = rows.filter(function(row) {
    return realityTvKey_(row.SeasonId) === realityTvKey_(season.SeasonId);
  });

  // Maintain a visible 24-row working block. Checkbox-only FALSE rows do not
  // count as meaningful placement and therefore cannot push the template far
  // down the sheet.
  const blankSeasonRows = seasonRows.filter(function(row) {
    return !realityTvCastImportIdentityPresent_(row) && !realityTvString_(row.ImportStatus);
  });
  const blanksNeeded = Math.max(0, 24 - blankSeasonRows.length);
  if (blanksNeeded) {
    const startRow = realityTvCastImportLastMeaningfulRow_(rows) + 1;
    const systemFields = realityTvCastImportSystemFields_(season, profile);
    const values = [];
    for (let i = 0; i < blanksNeeded; i += 1) {
      const payload = Object.assign({ Import: false, ImportStatus: "" }, systemFields);
      values.push(schema.headers.map(function(header) {
        return Object.prototype.hasOwnProperty.call(payload, header) ? payload[header] : "";
      }));
    }
    sheet.getRange(startRow, 1, values.length, schema.headers.length).setValues(values);
  }

  // Apply checkbox validation only to rows owned by this season/draft. Using a
  // data-validation rule preserves TRUE values already selected by the admin.
  rows = realityTvReadObjects_(ss, REALITY_TV_CAST_IMPORT_SHEET);
  seasonRows = rows.filter(function(row) {
    return realityTvKey_(row.SeasonId) === realityTvKey_(season.SeasonId);
  });
  const importCol = schema.map.Import;
  if (importCol !== undefined && typeof SpreadsheetApp.newDataValidation === "function") {
    const checkboxRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    seasonRows.forEach(function(row) {
      sheet.getRange(row.__rowNumber, importCol + 1).setDataValidation(checkboxRule);
    });
  }

  return {
    sheet: sheet,
    sheetUrl: realityTvCastImportSheetUrl_(ss, sheet),
    profile: profile,
    adoptedCount: adoptedCount,
    preparedRowCount: seasonRows.length
  };
}

`;
    text = text.slice(0, start) + replacement + text.slice(end);
  }
  write(rel, text, before);
}

// ---------------------------------------------------------------------------
// 4) Bust the frontend API helper URL so PWA/browser sessions request the fix.
// ---------------------------------------------------------------------------
{
  const rel = 'frontend/app.html';
  const before = read(rel);
  let text = before;
  const marker = 'v1218v2-reality-cast-forward';
  if (!text.includes(marker)) {
    const re = /(<script\s+src="\.\/js\/api\.js\?v=)([^"&]+)((?:&[^"=]+=[^"&]*)*"[^>]*><\/script>)/;
    text = text.replace(re, (all, p1, version, p3) => `${p1}${version}-${marker}${p3}`);
    if (text === before) throw new Error('Could not bump frontend/app.html api.js cache marker.');
  }
  write(rel, text, before);
}

const runtime = path.join(root, 'CHANGED_FILES_V1_2_18V2_RUNTIME.txt');
fs.writeFileSync(runtime, changed.join('\n') + (changed.length ? '\n' : ''));
console.log('Reality cast forward fixes v1.2.18v2 applied.');
console.log('Changed files:');
changed.forEach(file => console.log('  ' + file));
console.log('Total changed this pass: ' + changed.length);
