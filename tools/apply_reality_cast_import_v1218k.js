#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MARKER = 'v1218k-reality-cast-import';
const changed = new Set();

function file(rel) { return path.join(ROOT, rel); }
function read(rel) { return fs.readFileSync(file(rel), 'utf8'); }
function write(rel, text) {
  const p = file(rel);
  const prior = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  if (prior === text) return false;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
  changed.add(rel);
  return true;
}
function assertContains(text, needle, label) {
  if (!text.includes(needle)) throw new Error(`Could not locate ${label || needle}`);
}
function insertAfterOnce(text, anchor, addition, label) {
  if (text.includes(addition.trim())) return text;
  assertContains(text, anchor, label);
  return text.replace(anchor, anchor + addition);
}
function insertBeforeOnce(text, anchor, addition, label) {
  if (text.includes(addition.trim())) return text;
  assertContains(text, anchor, label);
  return text.replace(anchor, addition + anchor);
}
function replaceOnce(text, from, to, label) {
  if (text.includes(to)) return text;
  assertContains(text, from, label);
  return text.replace(from, to);
}

const BACKEND_CAST_FUNCTIONS = String.raw`

function realityTvCastImportProfile_(season) {
  const format = realityTvKey_(season && season.ShowFormat);
  const show = realityTvKey_(season && season.ShowName);
  if (format === "survivor-tribal" || show.indexOf("survivor") !== -1) {
    return {
      id: "survivor",
      label: "Survivor",
      required: ["Name"],
      recommended: ["FullName", "ImageUrl", "TeamOrTribe", "TeamColor", "Age", "Hometown", "Occupation", "Biography", "SourceUrl", "ImageSourceUrl"],
      help: "One row per contestant. Team / Tribe is the starting tribe. Team Color can be a color name or hex value."
    };
  }
  if (format === "amazing-race" || show.indexOf("amazing race") !== -1) {
    return {
      id: "amazing-race",
      label: "The Amazing Race",
      required: ["Member1", "Member2"],
      recommended: ["Name", "ImageUrl", "Member1ImageUrl", "Member2ImageUrl", "Relationship", "Hometown", "Biography", "SourceUrl", "ImageSourceUrl"],
      help: "One row per team. Enter both racers in Member 1 and Member 2. Leave Name blank to auto-create ‘Member 1 & Member 2’."
    };
  }
  if (format === "performance" && (show.indexOf("dancing") !== -1 || show.indexOf("stars") !== -1)) {
    return {
      id: "dwts",
      label: "Dancing with the Stars",
      required: ["Name", "Member2"],
      recommended: ["FullName", "ImageUrl", "Member1", "Member1ImageUrl", "Member2ImageUrl", "Relationship", "KnownFor", "Biography", "SourceUrl", "ImageSourceUrl"],
      help: "One row per couple. Name is the celebrity/couple display name. Member 1 is the celebrity and Member 2 is the professional partner."
    };
  }
  if (format === "social-deduction" || show.indexOf("traitor") !== -1) {
    return {
      id: "traitors",
      label: "The Traitors",
      required: ["Name"],
      recommended: ["FullName", "ImageUrl", "Age", "Hometown", "Occupation", "KnownFor", "OriginalShowOrSport", "Biography", "SourceUrl", "ImageSourceUrl"],
      help: "One row per player. Known For and Original Show / Sport are useful for crossover reality stars. Do not put secret Faithful/Traitor roles here."
    };
  }
  if (show.indexOf("special forces") !== -1) {
    return {
      id: "special-forces",
      label: "Special Forces: World's Toughest Test",
      required: ["Name"],
      recommended: ["FullName", "ImageUrl", "Age", "Hometown", "Occupation", "KnownFor", "OriginalShowOrSport", "RecruitNumber", "Biography", "SourceUrl", "ImageSourceUrl"],
      help: "One row per recruit. Recruit Number is optional. Original Show / Sport keeps the recruit's background available for profiles."
    };
  }
  return {
    id: format || "other",
    label: realityTvString_(season && season.ShowName || "Reality TV"),
    required: ["Name"],
    recommended: ["FullName", "ImageUrl", "TeamOrTribe", "Age", "Hometown", "Occupation", "Biography", "SourceUrl", "ImageSourceUrl"],
    help: "One row per playable participant or team. Unused columns can stay blank."
  };
}

function realityTvCastImportSheetUrl_(spreadsheet, sheet) {
  return spreadsheet.getUrl() + "#gid=" + sheet.getSheetId();
}

function realityTvPrepareCastImportSheet_(season) {
  const ss = SpreadsheetApp.getActive();
  const sheet = realityTvGetOrCreateSheet_(ss, REALITY_TV_CAST_IMPORT_SHEET, REALITY_TV_CAST_IMPORT_HEADERS);
  const profile = realityTvCastImportProfile_(season);
  const schema = realityTvHeaderMap_(sheet);
  const headerRange = sheet.getRange(1, 1, 1, schema.headers.length);
  headerRange.setFontWeight("bold").setWrap(true);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(Math.min(8, schema.headers.length));

  const notes = {
    Import: "Check the rows you want Import Selected Rows to create or update.",
    ImportStatus: "Filled automatically after import: IMPORTED, UPDATED, SKIPPED, or ERROR.",
    SeasonId: "Filled automatically by Prepare Cast Sheet. Do not change for this season block.",
    ShowProfile: "Friendly show template selected automatically from the Reality TV season.",
    Name: "Playable display name. Amazing Race can leave this blank and it will be built from Member 1 & Member 2.",
    ImageUrl: "Image used by the app. A stable Awards App asset URL is preferred when available.",
    TeamOrTribe: "Starting tribe/team/group. For Survivor this is the starting tribe.",
    TeamColor: "Optional color name or hex value for tribe/team display.",
    Member1: "Amazing Race racer 1 or DWTS celebrity.",
    Member2: "Amazing Race racer 2 or DWTS professional partner.",
    KnownFor: "What the contestant is known for: actor, athlete, reality personality, etc.",
    OriginalShowOrSport: "Prior show/franchise or sport, especially useful for Traitors and Special Forces.",
    RecruitNumber: "Optional Special Forces recruit number.",
    SourceUrl: "Official cast/bio page or other source used to verify the contestant information.",
    ImageSourceUrl: "Page where the original image was obtained. Keep this even if ImageUrl later becomes an asset: URL.",
    AdminNotes: "Staging-only notes. These are NOT copied to the player-facing RealityContestants table."
  };
  schema.headers.forEach(function(header, index) {
    if (notes[header]) sheet.getRange(1, index + 1).setNote(notes[header]);
  });

  const importCol = schema.map.Import;
  if (importCol !== undefined && sheet.getMaxRows() > 1) {
    sheet.getRange(2, importCol + 1, sheet.getMaxRows() - 1, 1).insertCheckboxes();
  }

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

  const rows = realityTvReadObjects_(ss, REALITY_TV_CAST_IMPORT_SHEET);
  const seasonRows = rows.filter(function(row) {
    return realityTvKey_(row.SeasonId) === realityTvKey_(season.SeasonId);
  });
  if (!seasonRows.length) {
    const templateRows = [];
    for (let i = 0; i < 24; i += 1) {
      templateRows.push({
        Import: false,
        ImportStatus: "",
        SeasonId: season.SeasonId,
        GameId: season.GameId,
        ShowProfile: profile.label,
        ShowFormat: season.ShowFormat,
        ShowName: season.ShowName,
        SeasonName: season.SeasonName
      });
    }
    const startRow = sheet.getLastRow() + 1;
    const values = templateRows.map(function(payload) {
      return schema.headers.map(function(header) {
        return Object.prototype.hasOwnProperty.call(payload, header) ? payload[header] : "";
      });
    });
    sheet.getRange(startRow, 1, values.length, schema.headers.length).setValues(values);
    if (importCol !== undefined) sheet.getRange(startRow, importCol + 1, values.length, 1).insertCheckboxes();
  }

  return {
    sheet: sheet,
    sheetUrl: realityTvCastImportSheetUrl_(ss, sheet),
    profile: profile
  };
}

function realityTvNormalizeCastImportRow_(row, season, profile) {
  const member1 = realityTvString_(row.Member1);
  const member2 = realityTvString_(row.Member2);
  let name = realityTvString_(row.Name || row.FullName);
  if (!name && profile.id === "amazing-race" && member1 && member2) name = member1 + " & " + member2;
  if (!name && profile.id === "dwts" && member1 && member2) name = member1 + " & " + member2;

  let fullName = realityTvString_(row.FullName || name);
  let normalizedMember1 = member1;
  let normalizedRelationship = realityTvString_(row.Relationship);
  if (profile.id === "dwts") {
    normalizedMember1 = member1 || fullName || name;
    if (!normalizedRelationship) normalizedRelationship = "Celebrity / Pro";
  }

  const externalSubjectId = realityTvString_(row.ExternalSubjectId);
  return {
    __rowNumber: row.__rowNumber,
    selected: realityTvBool_(row.Import),
    name: name,
    fullName: fullName || name,
    imageUrl: realityTvString_(row.ImageUrl),
    teamOrTribe: realityTvString_(row.TeamOrTribe),
    teamColor: realityTvString_(row.TeamColor),
    member1: normalizedMember1,
    member1ImageUrl: realityTvString_(row.Member1ImageUrl),
    member2: member2,
    member2ImageUrl: realityTvString_(row.Member2ImageUrl),
    relationship: normalizedRelationship,
    age: realityTvString_(row.Age),
    hometown: realityTvString_(row.Hometown),
    occupation: realityTvString_(row.Occupation),
    knownFor: realityTvString_(row.KnownFor),
    originalShowOrSport: realityTvString_(row.OriginalShowOrSport),
    recruitNumber: realityTvString_(row.RecruitNumber),
    biography: realityTvString_(row.Biography),
    externalSubjectId: externalSubjectId,
    sourceUrl: realityTvString_(row.SourceUrl),
    imageSourceUrl: realityTvString_(row.ImageSourceUrl),
    adminNotes: realityTvString_(row.AdminNotes)
  };
}

function realityTvCastImportValidation_(item, profile) {
  const errors = [];
  const warnings = [];
  if (!item.name) errors.push("Name is required.");
  if (profile.id === "amazing-race") {
    if (!item.member1) errors.push("Member 1 is required for an Amazing Race team.");
    if (!item.member2) errors.push("Member 2 is required for an Amazing Race team.");
  }
  if (profile.id === "dwts" && !item.member2) errors.push("Professional partner (Member 2) is required for DWTS.");
  if (!item.imageUrl) warnings.push("Image URL is blank.");
  if (item.age && !/^\d{1,3}$/.test(item.age)) warnings.push("Age is not a whole number; it will be saved as entered.");
  return { errors: errors, warnings: warnings };
}

function realityTvCastImportExisting_(existing, item) {
  const external = realityTvKey_(item.externalSubjectId);
  if (external) {
    const byExternal = existing.find(function(row) {
      return realityTvKey_(row.ExternalSubjectId) === external;
    });
    if (byExternal) return byExternal;
  }
  const id = realityTvKey_(realityTvSlug_(item.name));
  const byId = existing.find(function(row) { return realityTvKey_(row.ContestantId) === id; });
  if (byId) return byId;
  return existing.find(function(row) { return realityTvKey_(row.Name) === realityTvKey_(item.name); }) || null;
}

function realityTvCastImportPreview_(season) {
  const prepared = realityTvPrepareCastImportSheet_(season);
  const ss = SpreadsheetApp.getActive();
  const rows = realityTvReadObjects_(ss, REALITY_TV_CAST_IMPORT_SHEET).filter(function(row) {
    if (realityTvKey_(row.SeasonId) !== realityTvKey_(season.SeasonId)) return false;
    return !!(realityTvString_(row.Name) || realityTvString_(row.FullName) || realityTvString_(row.Member1) || realityTvString_(row.Member2));
  });
  const existing = realityTvContestantsForSeason_(season.SeasonId);
  const seen = {};
  const items = rows.map(function(row) {
    const item = realityTvNormalizeCastImportRow_(row, season, prepared.profile);
    const validation = realityTvCastImportValidation_(item, prepared.profile);
    const key = realityTvKey_(item.externalSubjectId || item.name);
    if (key && seen[key]) validation.errors.push("Duplicate staging row for " + item.name + ".");
    if (key) seen[key] = true;
    const match = item.name ? realityTvCastImportExisting_(existing, item) : null;
    return {
      rowNumber: item.__rowNumber,
      selected: item.selected,
      name: item.name,
      member1: item.member1,
      member2: item.member2,
      teamOrTribe: item.teamOrTribe,
      imageUrl: item.imageUrl,
      action: match ? "UPDATE" : "CREATE",
      existingContestantId: match ? realityTvString_(match.ContestantId) : "",
      errors: validation.errors,
      warnings: validation.warnings
    };
  });
  return {
    success: true,
    seasonId: season.SeasonId,
    sheetUrl: prepared.sheetUrl,
    profile: prepared.profile,
    items: items,
    rowCount: items.length,
    selectedCount: items.filter(function(item) { return item.selected; }).length,
    createCount: items.filter(function(item) { return item.selected && item.action === "CREATE" && !item.errors.length; }).length,
    updateCount: items.filter(function(item) { return item.selected && item.action === "UPDATE" && !item.errors.length; }).length,
    errorCount: items.filter(function(item) { return item.errors.length; }).length,
    warningCount: items.reduce(function(total, item) { return total + item.warnings.length; }, 0)
  };
}

function apiAdminPrepareRealityCastImport(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");
  const prepared = realityTvPrepareCastImportSheet_(season);
  return {
    success: true,
    seasonId: season.SeasonId,
    sheetName: REALITY_TV_CAST_IMPORT_SHEET,
    sheetUrl: prepared.sheetUrl,
    profile: prepared.profile,
    message: "RealityCastImport is ready for " + prepared.profile.label + ". Fill the season rows, check Import on the rows you want, then Preview Sheet before importing."
  };
}

function apiAdminPreviewRealityCastImport(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");
  return realityTvCastImportPreview_(season);
}

function apiAdminImportRealityCastImport(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");
  const prepared = realityTvPrepareCastImportSheet_(season);
  const ss = SpreadsheetApp.getActive();
  const sheet = prepared.sheet;
  const allRows = realityTvReadObjects_(ss, REALITY_TV_CAST_IMPORT_SHEET).filter(function(row) {
    return realityTvKey_(row.SeasonId) === realityTvKey_(season.SeasonId) && realityTvBool_(row.Import);
  });
  if (!allRows.length) throw new Error("Check Import on at least one RealityCastImport row first.");
  if (allRows.length > 250) throw new Error("A maximum of 250 cast rows can be imported at once.");

  const existing = realityTvContestantsForSeason_(season.SeasonId);
  const existingById = {};
  existing.forEach(function(row) { existingById[realityTvKey_(row.ContestantId)] = row; });
  const usedIds = {};
  existing.forEach(function(row) { usedIds[realityTvKey_(row.ContestantId)] = true; });
  let nextOrder = existing.length ? Math.max.apply(null, existing.map(function(row) { return realityTvNumber_(row.DisplayOrder, 0); })) + 1 : 1;
  const now = new Date();
  const payloads = [];
  const newIds = {};
  const resultsByRow = {};
  const seen = {};
  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  allRows.forEach(function(row) {
    const item = realityTvNormalizeCastImportRow_(row, season, prepared.profile);
    const validation = realityTvCastImportValidation_(item, prepared.profile);
    const duplicateKey = realityTvKey_(item.externalSubjectId || item.name);
    if (duplicateKey && seen[duplicateKey]) validation.errors.push("Duplicate selected staging row.");
    if (duplicateKey) seen[duplicateKey] = true;
    if (validation.errors.length) {
      errorCount += 1;
      resultsByRow[row.__rowNumber] = { status: "ERROR", error: validation.errors.join(" ") };
      return;
    }

    let match = realityTvCastImportExisting_(existing, item);
    let contestantId;
    if (match) {
      contestantId = realityTvString_(match.ContestantId);
    } else {
      contestantId = realityTvSlug_(item.externalSubjectId || item.name);
      const baseId = contestantId;
      let suffix = 2;
      while (usedIds[realityTvKey_(contestantId)]) contestantId = baseId + "-" + suffix++;
    }

    const isNew = !match;
    const base = match ? Object.assign({}, match) : {};
    const startingGroup = realityTvString_(item.teamOrTribe);
    const contestant = Object.assign(base, {
      SeasonId: season.SeasonId,
      GameId: season.GameId,
      ContestantId: contestantId,
      Name: item.name,
      FullName: item.fullName || item.name,
      ImageUrl: item.imageUrl,
      Member1: item.member1,
      Member2: item.member2,
      Relationship: item.relationship,
      Member1ImageUrl: item.member1ImageUrl,
      Member2ImageUrl: item.member2ImageUrl,
      TeamColor: item.teamColor,
      Age: item.age,
      Hometown: item.hometown,
      Occupation: item.occupation,
      Biography: item.biography,
      KnownFor: item.knownFor,
      OriginalShowOrSport: item.originalShowOrSport,
      RecruitNumber: item.recruitNumber,
      SourceUrl: item.sourceUrl,
      ImageSourceUrl: item.imageSourceUrl,
      ExternalSubjectId: item.externalSubjectId || realityTvString_(base.ExternalSubjectId) || contestantId,
      UpdatedAt: now
    });

    if (isNew) {
      contestant.TeamOrTribe = startingGroup;
      contestant.StartingGroup = startingGroup;
      contestant.CurrentGroup = startingGroup;
      contestant.FinalGroup = startingGroup;
      contestant.Status = "ACTIVE";
      contestant.EliminatedEpisode = "";
      contestant.EliminatedAt = "";
      contestant.DisplayOrder = nextOrder++;
      contestant.Active = true;
      contestant.CreatedAt = now;
      createdCount += 1;
      newIds[realityTvKey_(contestantId)] = true;
      usedIds[realityTvKey_(contestantId)] = true;
      existing.push(contestant);
    } else {
      if (!realityTvString_(contestant.TeamOrTribe) && startingGroup) contestant.TeamOrTribe = startingGroup;
      if (!realityTvString_(contestant.StartingGroup) && startingGroup) contestant.StartingGroup = startingGroup;
      if (!realityTvString_(contestant.CurrentGroup) && startingGroup) contestant.CurrentGroup = startingGroup;
      if (!realityTvString_(contestant.FinalGroup) && startingGroup) contestant.FinalGroup = startingGroup;
      updatedCount += 1;
    }
    payloads.push(contestant);
    resultsByRow[row.__rowNumber] = { status: isNew ? "IMPORTED" : "UPDATED", error: "" };
  });

  if (payloads.length) {
    realityTvBulkUpsertObjects_(ss, REALITY_TV_CONTESTANTS_SHEET, REALITY_TV_CONTESTANT_HEADERS,
      ["SeasonId", "ContestantId"], payloads);
    const changedRows = realityTvContestantsForSeason_(season.SeasonId);
    const newlyCreated = changedRows.filter(function(row) { return !!newIds[realityTvKey_(row.ContestantId)]; });
    realityTvSyncGroupsFromContestants_(season);
    if (newlyCreated.length) realityTvEnsureContestantGroupHistory_(season, newlyCreated);
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = values[0].map(realityTvString_);
  const map = {};
  headers.forEach(function(header, index) { map[header] = index; });
  Object.keys(resultsByRow).forEach(function(rowNumberText) {
    const rowNumber = Number(rowNumberText);
    const index = rowNumber - 1;
    if (!values[index]) return;
    const result = resultsByRow[rowNumber];
    if (map.ImportStatus !== undefined) values[index][map.ImportStatus] = result.status;
    if (map.ImportedAt !== undefined) values[index][map.ImportedAt] = result.status === "ERROR" ? "" : now;
    if (map.LastError !== undefined) values[index][map.LastError] = result.error || "";
    if (map.Import !== undefined && result.status !== "ERROR") values[index][map.Import] = false;
  });
  dataRange.setValues(values);
  if (map.Import !== undefined && sheet.getMaxRows() > 1) {
    sheet.getRange(2, map.Import + 1, sheet.getMaxRows() - 1, 1).insertCheckboxes();
  }

  realityTvClearRuntimeCaches_(season.GameId, season.SeasonId);
  return {
    success: true,
    createdCount: createdCount,
    updatedCount: updatedCount,
    errorCount: errorCount,
    sheetUrl: prepared.sheetUrl,
    message: createdCount + " new cast entr" + (createdCount === 1 ? "y" : "ies") + " imported, " +
      updatedCount + " existing entr" + (updatedCount === 1 ? "y" : "ies") + " updated" +
      (errorCount ? ", and " + errorCount + " row" + (errorCount === 1 ? " has" : "s have") + " errors to fix." : ".")
  };
}
`;

const FRONTEND_CAST_FUNCTIONS = fs.readFileSync(path.join(ROOT, 'tools/reality_cast_frontend_v1218k.snippet'), 'utf8');

function patchBackend() {
  const rel = 'backend/engines/RealityTvSeasonEngine.js';
  let text = read(rel);
  text = insertAfterOnce(text,
    'const REALITY_TV_HUB_PROPERTY = "EXTERNAL_RESULTS_HUB_SPREADSHEET_ID";',
    '\nconst REALITY_TV_CAST_IMPORT_SHEET = "RealityCastImport";',
    'Reality TV hub property constant');

  text = replaceOnce(text,
    '  "ExternalSubjectId", "Status", "EliminatedEpisode", "EliminatedAt",',
    '  "ExternalSubjectId", "KnownFor", "OriginalShowOrSport", "RecruitNumber", "SourceUrl", "ImageSourceUrl", "Status", "EliminatedEpisode", "EliminatedAt",',
    'RealityContestants profile fields');

  const contestantHeaderEnd = `const REALITY_TV_EPISODE_HEADERS = [`;
  if (!text.includes('const REALITY_TV_CAST_IMPORT_HEADERS = [')) {
    assertContains(text, contestantHeaderEnd, 'episode headers');
    const headers = `const REALITY_TV_CAST_IMPORT_HEADERS = [\n  "Import", "ImportStatus", "SeasonId", "GameId", "ShowProfile", "ShowFormat", "ShowName", "SeasonName",\n  "Name", "FullName", "ImageUrl", "TeamOrTribe", "TeamColor", "Member1", "Member1ImageUrl", "Member2", "Member2ImageUrl",\n  "Relationship", "Age", "Hometown", "Occupation", "KnownFor", "OriginalShowOrSport", "RecruitNumber", "Biography",\n  "ExternalSubjectId", "SourceUrl", "ImageSourceUrl", "AdminNotes", "ImportedAt", "LastError"\n];\n\n`;
    text = text.replace(contestantHeaderEnd, headers + contestantHeaderEnd);
  }

  text = insertAfterOnce(text,
    '  realityTvGetOrCreateSheet_(ss, REALITY_TV_CONTESTANTS_SHEET, REALITY_TV_CONTESTANT_HEADERS);',
    '\n  realityTvGetOrCreateSheet_(ss, REALITY_TV_CAST_IMPORT_SHEET, REALITY_TV_CAST_IMPORT_HEADERS);',
    'Reality TV system contestants sheet');

  text = insertBeforeOnce(text,
    'function apiAdminSubmitRealityTvResult(payload) {',
    BACKEND_CAST_FUNCTIONS + '\n',
    'Reality TV result submit function');
  write(rel, text);
}

function patchApiRoutes() {
  const rel = 'backend/Api.js';
  let text = read(rel);
  const anchor = `    if (action === "adminBulkAddRealityTvContestants") {\n      return json(apiAdminBulkAddRealityTvContestants(body));\n    }`;
  const add = `\n    if (action === "adminPrepareRealityCastImport") {\n      return json(apiAdminPrepareRealityCastImport(body));\n    }\n    if (action === "adminPreviewRealityCastImport") {\n      return json(apiAdminPreviewRealityCastImport(body));\n    }\n    if (action === "adminImportRealityCastImport") {\n      return json(apiAdminImportRealityCastImport(body));\n    }`;
  text = insertAfterOnce(text, anchor, add, 'Reality TV bulk-add POST route');
  write(rel, text);
}

function patchFrontendApi(rel) {
  let text = read(rel);
  const anchor = `async function apiAdminBulkAddRealityTvContestants(payload) {\n  return apiAdminRealityTvPostRequest_("adminBulkAddRealityTvContestants", payload || {});\n}`;
  const add = `\n\nasync function apiAdminPrepareRealityCastImport(payload) {\n  return apiAdminRealityTvPostRequest_("adminPrepareRealityCastImport", payload || {});\n}\n\nasync function apiAdminPreviewRealityCastImport(payload) {\n  return apiAdminRealityTvPostRequest_("adminPreviewRealityCastImport", payload || {});\n}\n\nasync function apiAdminImportRealityCastImport(payload) {\n  return apiAdminRealityTvPostRequest_("adminImportRealityCastImport", payload || {});\n}`;
  text = insertAfterOnce(text, anchor, add, `${rel} Reality TV bulk-add wrapper`);
  write(rel, text);
}

function patchRealityFrontend() {
  const rel = 'frontend/js/pages/adminRealityTv.js';
  let text = read(rel);
  const oldCard = `        <div id="realityTvBulkPreview_\${adminRealityTvEscape_(season.SeasonId)}" class="reality-tv-bulk-preview"></div>\n      </div>\n      <div class="admin-sub">New participants or teams are added to the season roster. Existing questions are not changed; they appear in the next newly created period.</div>`;
  const newCard = `        <div id="realityTvBulkPreview_\${adminRealityTvEscape_(season.SeasonId)}" class="reality-tv-bulk-preview"></div>\n      </div>\n\n      <div class="reality-tv-existing-bulk-add reality-tv-cast-sheet-card">\n        <h4>Reality Cast Import Sheet</h4>\n        <div class="admin-sub">Best for building a season roster over time. The main spreadsheet gets a <strong>RealityCastImport</strong> staging tab with show-aware guidance, source links, Import checkboxes, preview, and safe create/update handling.</div>\n        <div class="admin-actions reality-tv-bulk-actions">\n          <button type="button" class="admin-small-button secondary" onclick="adminRealityTvPrepareCastSheet_('\${adminRealityTvEscape_(season.SeasonId)}')">Prepare / Open Cast Sheet</button>\n          <button type="button" class="admin-small-button secondary" onclick="adminRealityTvPreviewCastSheet_('\${adminRealityTvEscape_(season.SeasonId)}')">Preview Sheet</button>\n          <button type="button" class="admin-small-button" onclick="adminRealityTvImportCastSheet_('\${adminRealityTvEscape_(season.SeasonId)}')">Import Selected Rows</button>\n        </div>\n        <div id="realityTvCastImportMessage_\${adminRealityTvEscape_(season.SeasonId)}" class="admin-message"></div>\n      </div>\n      <div class="admin-sub">New participants or teams are added to the season roster. Existing questions are not changed; they appear in the next newly created period.</div>`;
  text = replaceOnce(text, oldCard, newCard, 'existing season bulk upload card');
  text = insertBeforeOnce(text,
    'async function adminRealityTvBulkAddToSeason(seasonId) {',
    FRONTEND_CAST_FUNCTIONS + '\n',
    'Reality TV bulk-add frontend function');
  write(rel, text);
}

function bumpVersionInFile(rel, constantName, prefix) {
  let text = read(rel);
  const re = new RegExp(`const ${constantName} = "([^"]+)";`);
  const m = text.match(re);
  if (!m) throw new Error(`Could not find ${constantName} in ${rel}`);
  if (m[1].includes(MARKER)) return;
  const oldValue = m[1];
  const newValue = oldValue + '-' + MARKER;
  text = text.replace(m[0], `const ${constantName} = "${newValue}";`);
  write(rel, text);
  return { oldValue, newValue };
}

function escapeRegExp_(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceExactMarkerInTests(oldValue, newValue) {
  if (!oldValue || oldValue === newValue) return;
  const dir = file('tests');
  if (!fs.existsSync(dir)) return;
  const exactQuoted = new RegExp(`(["'])${escapeRegExp_(oldValue)}\\1`, 'g');
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.js')) continue;
    const rel = path.join('tests', name);
    const prior = read(rel);
    if (!exactQuoted.test(prior)) {
      exactQuoted.lastIndex = 0;
      continue;
    }
    exactQuoted.lastIndex = 0;
    write(rel, prior.replace(exactQuoted, function(match, quote) {
      return quote + newValue + quote;
    }));
  }
}

function replaceExactMarkerInShellFiles(oldValue, newValue) {
  if (!oldValue || oldValue === newValue) return;
  [
    'frontend/app.html',
    'frontend/index.html'
  ].forEach(function(rel) {
    if (!fs.existsSync(file(rel))) return;
    const prior = read(rel);
    if (!prior.includes(oldValue)) return;
    write(rel, prior.split(oldValue).join(newValue));
  });
}


function alignServiceWorkerCacheWithAppVersion_(oldAppVersion, newAppVersion) {
  if (!oldAppVersion || !newAppVersion) return null;

  const rel = 'frontend/sw.js';
  let text = read(rel);

  const re =
    /const AWARDS_CACHE = "([^"]+)";/;

  const match = text.match(re);

  if (!match) {
    throw new Error(
      'Could not find AWARDS_CACHE in frontend/sw.js'
    );
  }

  const oldValue = match[1];

  if (oldValue.includes(newAppVersion)) {
    return null;
  }

  if (!oldValue.includes(oldAppVersion)) {
    throw new Error(
      'AWARDS_CACHE does not contain the prior APP_ASSET_VERSION.'
    );
  }

  const newValue =
    oldValue.replace(
      oldAppVersion,
      newAppVersion
    );

  text = text.replace(
    match[0],
    'const AWARDS_CACHE = "' +
      newValue +
      '";'
  );

  write(rel, text);

  return {
    oldValue: oldValue,
    newValue: newValue
  };
}

function bumpReleaseMarkers() {
  const app1 = bumpVersionInFile('frontend/js/app.js', 'APP_ASSET_VERSION');
  const app2 = bumpVersionInFile('frontend/app.js', 'APP_ASSET_VERSION');
  if (app1 && app2 && app1.oldValue !== app2.oldValue) {
    throw new Error('frontend/js/app.js and frontend/app.js asset versions were out of sync before v1.2.18k.');
  }

  if (app1) {
    replaceExactMarkerInShellFiles(app1.oldValue, app1.newValue);
    replaceExactMarkerInTests(app1.oldValue, app1.newValue);
  }

  const sw = alignServiceWorkerCacheWithAppVersion_(
    app1 ? app1.oldValue : null,
    app1 ? app1.newValue : null
  );
  if (sw) {
    replaceExactMarkerInTests(sw.oldValue, sw.newValue);
  }
}

function main() {
  patchBackend();
  patchApiRoutes();
  patchFrontendApi('frontend/js/api.js');
  patchFrontendApi('frontend/api.js');
  patchRealityFrontend();
  bumpReleaseMarkers();
  const runtimeList = Array.from(changed).sort();
  fs.writeFileSync(file('CHANGED_FILES_V1_2_18K_RUNTIME.txt'), runtimeList.join('\n') + '\n');
  console.log('Reality Cast Import v1.2.18k applied.');
  console.log(`Changed ${runtimeList.length} existing file(s):`);
  runtimeList.forEach(rel => console.log('  ' + rel));
}

main();
