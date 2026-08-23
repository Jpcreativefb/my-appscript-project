#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const MARKER = 'v1218n-reality-production-automation';
const changed = new Set();

function p(rel) { return path.join(ROOT, rel); }
function read(rel) { return fs.readFileSync(p(rel), 'utf8'); }
function write(rel, text) {
  const prior = fs.existsSync(p(rel)) ? fs.readFileSync(p(rel), 'utf8') : '';
  if (prior === text) return;
  fs.mkdirSync(path.dirname(p(rel)), { recursive: true });
  fs.writeFileSync(p(rel), text);
  changed.add(rel);
}
function need(text, needle, label) {
  if (!text.includes(needle)) throw new Error('Could not locate ' + (label || needle));
}
function insertBefore(text, anchor, addition, label) {
  if (text.includes(addition.trim())) return text;
  need(text, anchor, label);
  return text.replace(anchor, addition + anchor);
}
function insertAfter(text, anchor, addition, label) {
  if (text.includes(addition.trim())) return text;
  need(text, anchor, label);
  return text.replace(anchor, anchor + addition);
}
function replaceOnce(text, from, to, label) {
  if (text.includes(to)) return text;
  need(text, from, label);
  return text.replace(from, to);
}
function appendReleaseMarker(text) {
  if (text.includes(MARKER)) return text;
  return text.replace(/(const\s+(?:APP_ASSET_VERSION|APP_ROUTE_HOTFIX_VERSION|PWA_VERSION)\s*=\s*["'])([^"']+)(["'])/g,
    (m, a, b, c) => a + b + '-' + MARKER + c)
    .replace(/(const\s+CACHE_NAME\s*=\s*["'])([^"']+)(["'])/g,
      (m, a, b, c) => a + b + '-' + MARKER + c);
}

// ---------- Backend: RealityTvSeasonEngine ----------
let engine = read('backend/engines/RealityTvSeasonEngine.js');

engine = replaceOnce(engine,
  '"ExternalSubjectId", "KnownFor", "OriginalShowOrSport", "RecruitNumber", "SourceUrl", "ImageSourceUrl", "Status", "EliminatedEpisode", "EliminatedAt",',
  '"ExternalSubjectId", "KnownFor", "OriginalShowOrSport", "RecruitNumber", "SourceUrl", "ImageSourceUrl", "ExitReason", "Status", "EliminatedEpisode", "EliminatedAt",',
  'Reality contestant headers');
engine = replaceOnce(engine,
  '"ExternalMarketId", "OutcomeType", "Status", "EliminatedContestantIds",\n  "ResultQueueId"',
  '"ExternalMarketId", "OutcomeType", "Status", "EliminatedContestantIds", "ExitReasonsJSON",\n  "ResultQueueId"',
  'Reality episode headers');
engine = replaceOnce(engine,
  '"OutcomeType", "SelectedContestantIds", "ReviewStatus", "EvidenceUrl", "Notes",',
  '"OutcomeType", "SelectedContestantIds", "ExitReasonsJSON", "ReviewStatus", "EvidenceUrl", "Notes",',
  'Reality result queue headers');

const backendHelpers = String.raw`

function realityTvExitReasonDefinitions_() {
  return {
    "standard-elimination": "Standard elimination",
    "voted-out": "Voted out",
    "fire-making-loss": "Fire-making loss",
    "banished": "Banished",
    "murdered": "Murdered",
    "race-elimination": "Race elimination",
    "judges-elimination": "Judges' elimination",
    "challenge-elimination": "Challenge elimination",
    "finale-cut": "Finale cut",
    "failed-task": "Failed task",
    "medical-withdrawal": "Medical withdrawal",
    "quit": "Quit / voluntary withdrawal",
    "disqualified": "Disqualified",
    "other": "Other"
  };
}

function realityTvNormalizeExitReason_(value, outcomeType) {
  const key = realityTvKey_(value);
  const defs = realityTvExitReasonDefinitions_();
  const outcome = realityTvKey_(outcomeType);
  if (outcome === "medical-withdrawal" && (!key || key === "standard-elimination")) return "medical-withdrawal";
  if (outcome === "quit" && (!key || key === "standard-elimination")) return "quit";
  if (defs[key]) return key;
  if (outcome === "medical-withdrawal") return "medical-withdrawal";
  if (outcome === "quit") return "quit";
  return "standard-elimination";
}

function realityTvStatusForExitReason_(reason, outcomeType) {
  const key = realityTvNormalizeExitReason_(reason, outcomeType);
  if (key === "quit") return "QUIT";
  if (key === "medical-withdrawal") return "WITHDRAWN";
  if (key === "disqualified") return "DISQUALIFIED";
  return "ELIMINATED";
}

function realityTvCastDraftSeason_(payload) {
  payload = payload || {};
  const showName = realityTvString_(payload.showName);
  const seasonName = realityTvString_(payload.seasonName);
  if (!showName) throw new Error("Enter the show name before preparing the cast sheet.");
  if (!seasonName) throw new Error("Enter the season name before preparing the cast sheet.");
  const year = realityTvNumber_(payload.year, new Date().getFullYear());
  const format = typeof realityTvShowFormatDefinition_ === "function"
    ? realityTvShowFormatDefinition_(payload.showFormat || "survivor-tribal")
    : { id: realityTvString_(payload.showFormat || "survivor-tribal"), participantType: "individual", participantLabel: "Contestant", groupLabel: "Group", periodLabel: "Episode" };
  const gameId = realityTvSlug_(payload.gameId || (showName + "-" + seasonName + "-" + year));
  const draftSeasonId = realityTvString_(payload.draftSeasonId) || ("draft-" + gameId);
  return {
    SeasonId: draftSeasonId,
    GameId: gameId,
    ShowName: showName,
    SeasonName: seasonName,
    SeasonNumber: realityTvString_(payload.seasonNumber || ""),
    Year: year,
    ShowFormat: format.id,
    ParticipantType: realityTvString_(payload.participantType || format.participantType),
    ParticipantLabel: realityTvString_(payload.participantLabel || format.participantLabel),
    GroupLabel: realityTvString_(payload.groupLabel || format.groupLabel),
    PeriodLabel: realityTvString_(payload.periodLabel || format.periodLabel),
    CurrentEpisodeNumber: 1
  };
}

function apiAdminPrepareRealityCastDraft(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const draft = realityTvCastDraftSeason_(payload);
  const prepared = realityTvPrepareCastImportSheet_(draft);
  return {
    success: true,
    draftSeasonId: draft.SeasonId,
    gameId: draft.GameId,
    sheetName: REALITY_TV_CAST_IMPORT_SHEET,
    sheetUrl: prepared.sheetUrl,
    profile: prepared.profile,
    message: "New-season cast staging is ready. Fill the draft rows, check Import, then Preview / Load Cast before creating the season."
  };
}

function apiAdminPreviewRealityCastDraft(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const draft = realityTvCastDraftSeason_(payload);
  const preview = realityTvCastImportPreview_(draft);
  preview.draftSeasonId = draft.SeasonId;
  preview.gameId = draft.GameId;
  return preview;
}

function apiAdminLoadRealityCastDraft(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const draft = realityTvCastDraftSeason_(payload);
  const prepared = realityTvPrepareCastImportSheet_(draft);
  const rows = realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_CAST_IMPORT_SHEET).filter(function(row) {
    return realityTvKey_(row.SeasonId) === realityTvKey_(draft.SeasonId) && realityTvBool_(row.Import);
  });
  if (!rows.length) throw new Error("Check Import on at least two draft cast rows first.");
  const seen = {};
  const errors = [];
  const contestants = [];
  rows.forEach(function(row) {
    const item = realityTvNormalizeCastImportRow_(row, draft, prepared.profile);
    const validation = realityTvCastImportValidation_(item, prepared.profile);
    const duplicateKey = realityTvKey_(item.externalSubjectId || item.name);
    if (duplicateKey && seen[duplicateKey]) validation.errors.push("Duplicate selected staging row for " + item.name + ".");
    if (duplicateKey) seen[duplicateKey] = true;
    if (validation.errors.length) {
      errors.push("Row " + row.__rowNumber + ": " + validation.errors.join(" "));
      return;
    }
    contestants.push({
      name: item.name,
      fullName: item.fullName,
      imageUrl: item.imageUrl,
      teamOrTribe: item.teamOrTribe,
      teamColor: item.teamColor,
      member1: item.member1,
      member1ImageUrl: item.member1ImageUrl,
      member2: item.member2,
      member2ImageUrl: item.member2ImageUrl,
      relationship: item.relationship,
      age: item.age,
      hometown: item.hometown,
      occupation: item.occupation,
      knownFor: item.knownFor,
      originalShowOrSport: item.originalShowOrSport,
      recruitNumber: item.recruitNumber,
      biography: item.biography,
      externalSubjectId: item.externalSubjectId,
      sourceUrl: item.sourceUrl,
      imageSourceUrl: item.imageSourceUrl
    });
  });
  if (errors.length) throw new Error(errors.slice(0, 5).join(" "));
  if (contestants.length < 2) throw new Error("Select at least two valid cast rows before creating a season.");
  return {
    success: true,
    draftSeasonId: draft.SeasonId,
    sheetUrl: prepared.sheetUrl,
    profile: prepared.profile,
    contestantCount: contestants.length,
    contestants: contestants,
    message: contestants.length + " cast rows are ready to create the season."
  };
}

function realityTvFinalizeCastDraftForSeason_(draftSeasonId, season) {
  const draftId = realityTvString_(draftSeasonId);
  if (!draftId || !season) return 0;
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(REALITY_TV_CAST_IMPORT_SHEET);
  if (!sheet) return 0;
  const rows = realityTvReadObjects_(ss, REALITY_TV_CAST_IMPORT_SHEET).filter(function(row) {
    return realityTvKey_(row.SeasonId) === realityTvKey_(draftId);
  });
  const now = new Date();
  rows.forEach(function(row) {
    realityTvUpdateObjectRow_(sheet, row.__rowNumber, {
      Import: false,
      ImportStatus: realityTvString_(row.Name || row.FullName || row.Member1 || row.Member2) ? "IMPORTED" : "",
      SeasonId: season.SeasonId,
      GameId: season.GameId,
      ShowProfile: realityTvString_(row.ShowProfile),
      ShowFormat: season.ShowFormat,
      ShowName: season.ShowName,
      SeasonName: season.SeasonName,
      ImportedAt: realityTvString_(row.Name || row.FullName || row.Member1 || row.Member2) ? now : "",
      LastError: ""
    });
  });
  return rows.length;
}

function apiAdminSetRealityTvIndividualPlay(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");
  const startEpisode = Math.max(0, realityTvNumber_(payload.startEpisode, 0));
  realityTvUpdateObjectRow_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_SEASONS_SHEET), season.__rowNumber, {
    IndividualPlayStartsEpisode: startEpisode,
    UpdatedAt: new Date()
  });
  return {
    success: true,
    startEpisode: startEpisode,
    automatic: startEpisode === 0,
    message: startEpisode
      ? "Individual play will begin in " + realityTvString_(season.PeriodLabel || "Episode") + " " + startEpisode + "."
      : "Individual play is automatic again. Group-aware questions switch to individuals when fewer than two active groups remain."
  };
}

function apiAdminBulkUpdateRealityTvContestantGroups(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");
  const assignments = realityTvParseJson_(payload.assignmentsJSON || payload.assignments, []);
  if (!Array.isArray(assignments) || !assignments.length) throw new Error("Select at least one participant to move.");
  if (assignments.length > 100) throw new Error("A maximum of 100 participants can be moved at once.");
  const effectiveEpisode = Math.max(1, realityTvNumber_(payload.effectiveEpisode, realityTvNumber_(season.CurrentEpisodeNumber, 1) + 1));
  const notes = realityTvString_(payload.notes);
  const assignmentType = realityTvString_(payload.assignmentType || "SWAP");
  const contestants = realityTvContestantsForSeason_(season.SeasonId);
  const contestantById = {};
  contestants.forEach(function(row) { contestantById[realityTvKey_(row.ContestantId)] = row; });
  const targetContestants = [];
  const wantedGroups = {};
  assignments.forEach(function(item) {
    const contestant = contestantById[realityTvKey_(item && item.contestantId)];
    const groupName = realityTvString_(item && item.groupName);
    if (!contestant) throw new Error("One selected participant was not found.");
    if (!groupName) throw new Error("Every selected participant needs a destination group / tribe.");
    targetContestants.push(contestant);
    wantedGroups[realityTvKey_(groupName)] = groupName;
  });

  let groups = realityTvGroupsForSeason_(season.SeasonId);
  const groupByName = {};
  groups.forEach(function(row) { groupByName[realityTvKey_(row.GroupName)] = row; });
  const now = new Date();
  const groupPayloads = [];
  Object.keys(wantedGroups).forEach(function(key) {
    if (groupByName[key]) return;
    const groupName = wantedGroups[key];
    const group = {
      SeasonId: season.SeasonId,
      GameId: season.GameId,
      GroupId: (realityTvKey_(season.ShowFormat) === "survivor-tribal" ? "tribe-" : "group-") + realityTvSlug_(groupName),
      GroupName: groupName,
      GroupType: realityTvString_(season.GroupLabel || "Group"),
      ImageUrl: "",
      Color: "#64748B",
      Active: true,
      DisplayOrder: groups.length + groupPayloads.length + 1,
      CreatedAt: now,
      UpdatedAt: now
    };
    groupPayloads.push(group);
    groupByName[key] = group;
  });
  if (groupPayloads.length) {
    realityTvBulkUpsertObjects_(SpreadsheetApp.getActive(), REALITY_TV_GROUPS_SHEET, REALITY_TV_GROUP_HEADERS, ["SeasonId", "GroupId"], groupPayloads);
  }

  realityTvEnsureContestantGroupHistory_(season, targetContestants);
  const allHistory = realityTvGroupHistoryForSeason_(season.SeasonId);
  const byContestant = realityTvGroupHistoryByContestant_(allHistory);
  const historyPayloads = [];
  assignments.forEach(function(item) {
    const contestantId = realityTvString_(item.contestantId);
    const groupName = realityTvString_(item.groupName);
    const group = groupByName[realityTvKey_(groupName)];
    const history = (byContestant[realityTvKey_(contestantId)] || []).map(function(row) { return Object.assign({}, row); });
    history.forEach(function(row) {
      const start = Math.max(1, realityTvNumber_(row.StartEpisode, 1));
      const end = realityTvNumber_(row.EndEpisode, 0);
      if (start < effectiveEpisode && (!end || end >= effectiveEpisode)) {
        row.EndEpisode = effectiveEpisode - 1;
        row.Active = false;
        row.UpdatedAt = now;
        historyPayloads.push(row);
      }
    });
    const sameStart = history.find(function(row) { return realityTvNumber_(row.StartEpisode, 0) === effectiveEpisode; });
    const nextFuture = history.filter(function(row) { return realityTvNumber_(row.StartEpisode, 0) > effectiveEpisode; })
      .sort(function(a, b) { return realityTvNumber_(a.StartEpisode, 0) - realityTvNumber_(b.StartEpisode, 0); })[0] || null;
    const endEpisode = nextFuture ? Math.max(effectiveEpisode, realityTvNumber_(nextFuture.StartEpisode, effectiveEpisode + 1) - 1) : "";
    if (sameStart) {
      sameStart.GroupId = group.GroupId;
      sameStart.GroupName = groupName;
      sameStart.AssignmentType = assignmentType;
      sameStart.Notes = notes;
      sameStart.EndEpisode = endEpisode;
      sameStart.Active = !nextFuture;
      sameStart.UpdatedAt = now;
      historyPayloads.push(sameStart);
    } else {
      historyPayloads.push({
        AssignmentId: season.SeasonId + "-" + contestantId + "-episode-" + effectiveEpisode + "-" + realityTvSlug_(groupName),
        SeasonId: season.SeasonId,
        GameId: season.GameId,
        ContestantId: contestantId,
        GroupId: group.GroupId,
        GroupName: groupName,
        StartEpisode: effectiveEpisode,
        EndEpisode: endEpisode,
        AssignmentType: assignmentType,
        Notes: notes,
        Active: !nextFuture,
        CreatedAt: now,
        UpdatedAt: now
      });
    }
  });
  if (historyPayloads.length) {
    realityTvBulkUpsertObjects_(SpreadsheetApp.getActive(), REALITY_TV_GROUP_HISTORY_SHEET, REALITY_TV_GROUP_HISTORY_HEADERS, ["AssignmentId"], historyPayloads);
  }
  const refreshedHistory = realityTvGroupHistoryForSeason_(season.SeasonId);
  const profiles = realityTvContestantGroupProfilesFromHistory_(season, refreshedHistory);
  const contestantPayloads = targetContestants.map(function(row) {
    const profile = profiles[realityTvKey_(row.ContestantId)] || {};
    return Object.assign({}, row, {
      TeamOrTribe: profile.currentGroup || row.TeamOrTribe || "",
      StartingGroup: profile.startingGroup || row.StartingGroup || "",
      CurrentGroup: profile.currentGroup || row.CurrentGroup || row.TeamOrTribe || "",
      FinalGroup: profile.finalGroup || row.FinalGroup || row.TeamOrTribe || "",
      UpdatedAt: now
    });
  });
  realityTvBulkUpsertObjects_(SpreadsheetApp.getActive(), REALITY_TV_CONTESTANTS_SHEET, REALITY_TV_CONTESTANT_HEADERS, ["SeasonId", "ContestantId"], contestantPayloads);
  realityTvSyncGroupsFromContestants_(season);
  return {
    success: true,
    movedCount: assignments.length,
    effectiveEpisode: effectiveEpisode,
    message: assignments.length + " participant" + (assignments.length === 1 ? "" : "s") + " updated beginning in " + realityTvString_(season.PeriodLabel || "Episode") + " " + effectiveEpisode + ". Historical assignments were preserved."
  };
}
`;
engine = insertBefore(engine, 'function apiAdminPrepareRealityCastImport(payload) {', backendHelpers, 'cast import API block');

// Preserve rich profile fields when a new season is created from the staging sheet.
engine = replaceOnce(engine,
  '      Biography: realityTvString_(item.biography || item.Biography),\n      ExternalSubjectId: realityTvString_(item.externalSubjectId || item.ExternalSubjectId || contestantId),',
  '      Biography: realityTvString_(item.biography || item.Biography),\n      KnownFor: realityTvString_(item.knownFor || item.KnownFor),\n      OriginalShowOrSport: realityTvString_(item.originalShowOrSport || item.OriginalShowOrSport),\n      RecruitNumber: realityTvString_(item.recruitNumber || item.RecruitNumber),\n      SourceUrl: realityTvString_(item.sourceUrl || item.SourceUrl),\n      ImageSourceUrl: realityTvString_(item.imageSourceUrl || item.ImageSourceUrl),\n      ExitReason: "",\n      ExternalSubjectId: realityTvString_(item.externalSubjectId || item.ExternalSubjectId || contestantId),',
  'new season contestant profile fields');
// Apply same enhancement to additional/bulk-created contestants where anchors remain.
engine = engine.replace(/      Biography: realityTvString_\(item\.biography \|\| item\.Biography\),\n      ExternalSubjectId: realityTvString_\(item\.externalSubjectId \|\| item\.ExternalSubjectId \|\| contestantId\),/g,
  '      Biography: realityTvString_(item.biography || item.Biography),\n      KnownFor: realityTvString_(item.knownFor || item.KnownFor),\n      OriginalShowOrSport: realityTvString_(item.originalShowOrSport || item.OriginalShowOrSport),\n      RecruitNumber: realityTvString_(item.recruitNumber || item.RecruitNumber),\n      SourceUrl: realityTvString_(item.sourceUrl || item.SourceUrl),\n      ImageSourceUrl: realityTvString_(item.imageSourceUrl || item.ImageSourceUrl),\n      ExitReason: "",\n      ExternalSubjectId: realityTvString_(item.externalSubjectId || item.ExternalSubjectId || contestantId),');

// Mark draft sheet rows as imported after successful creation.
engine = insertBefore(engine,
  '  return {\n    success: true,\n    message: existingSeason',
  '  if (payload.castDraftSeasonId) realityTvFinalizeCastDraftForSeason_(payload.castDraftSeasonId, createdSeason);\n',
  'create season return block');

// Add per-contestant exit reasons to result submission.
engine = replaceOnce(engine,
  '  const validTypes = ["elimination", "double-elimination", "multiple-elimination", "no-elimination", "medical-withdrawal", "quit"];',
  '  const exitReasonsInput = realityTvParseJson_(payload.exitReasonsJSON || payload.exitReasons, {});\n  const exitReasons = {};\n  selectedIds.forEach(function(id) {\n    exitReasons[id] = realityTvNormalizeExitReason_(exitReasonsInput && exitReasonsInput[id], outcomeType);\n  });\n  const validTypes = ["elimination", "double-elimination", "multiple-elimination", "no-elimination", "medical-withdrawal", "quit"];',
  'result validation types');
engine = replaceOnce(engine,
  '    SelectedContestantIds: JSON.stringify(selectedIds),\n    ReviewStatus: "PENDING",',
  '    SelectedContestantIds: JSON.stringify(selectedIds),\n    ExitReasonsJSON: JSON.stringify(exitReasons),\n    ReviewStatus: "PENDING",',
  'queue selected contestant ids');

engine = replaceOnce(engine,
  '  const outcomeType = realityTvKey_(queue.OutcomeType);\n  const contestants = realityTvContestantsForSeason_(season.SeasonId);',
  '  const outcomeType = realityTvKey_(queue.OutcomeType);\n  const exitReasons = realityTvParseJson_(queue.ExitReasonsJSON, {});\n  const contestants = realityTvContestantsForSeason_(season.SeasonId);',
  'settlement outcome type');
engine = replaceOnce(engine,
  '      Status: outcomeType === "quit" ? "QUIT" : outcomeType === "medical-withdrawal" ? "WITHDRAWN" : "ELIMINATED",\n      EliminatedEpisode: episode.EpisodeNumber,',
  '      ExitReason: realityTvNormalizeExitReason_(exitReasons[realityTvKey_(contestant.ContestantId)] || exitReasons[contestant.ContestantId], outcomeType),\n      Status: realityTvStatusForExitReason_(exitReasons[realityTvKey_(contestant.ContestantId)] || exitReasons[contestant.ContestantId], outcomeType),\n      EliminatedEpisode: episode.EpisodeNumber,',
  'contestant elimination status');
engine = replaceOnce(engine,
  '    EliminatedContestantIds: JSON.stringify(selectedIds),\n    UpdatedAt: now',
  '    EliminatedContestantIds: JSON.stringify(selectedIds),\n    ExitReasonsJSON: JSON.stringify(exitReasons),\n    UpdatedAt: now',
  'episode eliminated ids');

write('backend/engines/RealityTvSeasonEngine.js', engine);

// ---------- Backend: RealityTvQuestionPackEngine ----------
let pack = read('backend/engines/RealityTvQuestionPackEngine.js');
pack = insertAfter(pack,
  '    { templateId: "idol-finder", formats: ["survivor-tribal"], label: "Immunity idol finder", help: "Active contestants plus a No one option.", questionTemplate: "Who will find a hidden immunity idol in Episode {episode}?", answerSource: "active-participants", resultKey: "idol-finder", displayOrder: 50, includeNoOutcome: true, noOutcomeLabel: "No one" },',
  '\n    { templateId: "fire-making-winner", formats: ["survivor-tribal"], label: "Fire-making challenge winner", help: "Use for a Survivor fire-making challenge or finale stage.", questionTemplate: "Who will win the fire-making challenge in {period} {episode}?", answerSource: "active-participants", resultKey: "fire-making-winner", displayOrder: 60, includeNoOutcome: true, noOutcomeLabel: "No fire-making challenge" },',
  'Survivor standard question definitions');
pack = replaceOnce(pack,
  '  const individualStart = Math.max(0, realityTvNumber_(season.IndividualPlayStartsEpisode, 0));\n  const isIndividualPeriod = individualStart > 0 && episodeNumber >= individualStart;',
  '  const individualStart = Math.max(0, realityTvNumber_(season.IndividualPlayStartsEpisode, 0));\n  const automaticIndividualPlay = individualStart === 0 && groups.length < 2;\n  const isIndividualPeriod = (individualStart > 0 && episodeNumber >= individualStart) || automaticIndividualPlay;',
  'individual play determination');
pack = replaceOnce(pack,
  'reason: "This group-based question is pre-merge only. Individual play starts in " + realityTvString_(season.PeriodLabel || "Episode") + " " + individualStart + "."',
  'reason: individualStart > 0\n          ? "This group-based question is pre-merge only. Individual play starts in " + realityTvString_(season.PeriodLabel || "Episode") + " " + individualStart + "."\n          : "This group-based question was skipped automatically because Team / Tribe information is incomplete: fewer than two active groups remain."',
  'pre-merge skip reason');
write('backend/engines/RealityTvQuestionPackEngine.js', pack);

// ---------- Backend API routes ----------
let api = read('backend/Api.js');
const routeAnchor = '    if (action === "adminPrepareRealityCastImport") {\n      return json(apiAdminPrepareRealityCastImport(body));\n    }';
const routes = String.raw`
    if (action === "adminPrepareRealityCastDraft") {
      return json(apiAdminPrepareRealityCastDraft(body));
    }
    if (action === "adminPreviewRealityCastDraft") {
      return json(apiAdminPreviewRealityCastDraft(body));
    }
    if (action === "adminLoadRealityCastDraft") {
      return json(apiAdminLoadRealityCastDraft(body));
    }
    if (action === "adminBulkUpdateRealityTvContestantGroups") {
      return json(apiAdminBulkUpdateRealityTvContestantGroups(body));
    }
    if (action === "adminSetRealityTvIndividualPlay") {
      return json(apiAdminSetRealityTvIndividualPlay(body));
    }
`;
api = insertBefore(api, routeAnchor, routes, 'Reality cast import routes');
write('backend/Api.js', api);

// ---------- Frontend API wrappers ----------
const frontendApiWrappers = String.raw`

async function apiAdminPrepareRealityCastDraft(payload) {
  return apiAdminRealityTvPostRequest_("adminPrepareRealityCastDraft", payload || {});
}

async function apiAdminPreviewRealityCastDraft(payload) {
  return apiAdminRealityTvPostRequest_("adminPreviewRealityCastDraft", payload || {});
}

async function apiAdminLoadRealityCastDraft(payload) {
  return apiAdminRealityTvPostRequest_("adminLoadRealityCastDraft", payload || {});
}

async function apiAdminBulkUpdateRealityTvContestantGroups(payload) {
  return apiAdminRealityTvPostRequest_("adminBulkUpdateRealityTvContestantGroups", payload || {});
}

async function apiAdminSetRealityTvIndividualPlay(payload) {
  return apiAdminRealityTvPostRequest_("adminSetRealityTvIndividualPlay", payload || {});
}
`;
['frontend/js/api.js', 'frontend/api.js'].forEach(function(rel) {
  let text = read(rel);
  text = insertBefore(text, 'async function apiAdminPrepareRealityCastImport(payload) {', frontendApiWrappers, rel + ' cast import wrappers');
  write(rel, text);
});

// ---------- Frontend Reality Manager ----------
let front = read('frontend/js/pages/adminRealityTv.js');
front = insertAfter(front,
  'let ADMIN_REALITY_TV_BULK_PREVIEW = {};',
  '\nlet ADMIN_REALITY_TV_CREATE_CAST_DRAFT = null;',
  'Reality TV globals');
front = insertAfter(front,
  '    { id: "idol-finder", formats: ["survivor-tribal"], label: "Immunity idol finder", help: "Includes a No one outcome." },',
  '\n    { id: "fire-making-winner", formats: ["survivor-tribal"], label: "Fire-making challenge winner", help: "Optional finale/twist question using active contestants." },',
  'frontend Survivor question presets');

// Rich roster fields.
front = replaceOnce(front,
  '          <input class="input rt-roster-team-color" placeholder="Team color" value="${adminRealityTvValue_(contestant.teamColor)}">\n          <textarea class="input rt-roster-biography" rows="2" placeholder="Biography / notes">${adminRealityTvValue_(contestant.biography)}</textarea>',
  '          <input class="input rt-roster-team-color" placeholder="Team color" value="${adminRealityTvValue_(contestant.teamColor)}">\n          <input class="input rt-roster-known-for" placeholder="Known for" value="${adminRealityTvValue_(contestant.knownFor)}">\n          <input class="input rt-roster-original-show" placeholder="Original show / sport" value="${adminRealityTvValue_(contestant.originalShowOrSport)}">\n          <input class="input rt-roster-recruit-number" placeholder="Recruit number" value="${adminRealityTvValue_(contestant.recruitNumber)}">\n          <input class="input rt-roster-source-url" placeholder="Official bio / source URL" value="${adminRealityTvValue_(contestant.sourceUrl)}">\n          <input class="input rt-roster-image-source-url" placeholder="Image source URL" value="${adminRealityTvValue_(contestant.imageSourceUrl)}">\n          <textarea class="input rt-roster-biography" rows="2" placeholder="Biography / notes">${adminRealityTvValue_(contestant.biography)}</textarea>',
  'roster profile inputs');
front = replaceOnce(front,
  '      teamColor: row.querySelector(".rt-roster-team-color").value.trim()\n    };',
  '      teamColor: row.querySelector(".rt-roster-team-color").value.trim(),\n      knownFor: row.querySelector(".rt-roster-known-for").value.trim(),\n      originalShowOrSport: row.querySelector(".rt-roster-original-show").value.trim(),\n      recruitNumber: row.querySelector(".rt-roster-recruit-number").value.trim(),\n      sourceUrl: row.querySelector(".rt-roster-source-url").value.trim(),\n      imageSourceUrl: row.querySelector(".rt-roster-image-source-url").value.trim()\n    };',
  'collect rich roster fields');
front = replaceOnce(front,
  '    teamColor: ["teamcolor", "color"]\n  };',
  '    teamColor: ["teamcolor", "color"],\n    knownFor: ["knownfor", "famousfor", "background"],\n    originalShowOrSport: ["originalshoworsport", "originalshow", "show", "sport", "franchise"],\n    recruitNumber: ["recruitnumber", "recruit", "number"],\n    sourceUrl: ["sourceurl", "source", "biourl", "officialbio"],\n    imageSourceUrl: ["imagesourceurl", "imagesource", "photosource"]\n  };',
  'bulk roster aliases');
front = replaceOnce(front,
  '  const positional = ["name", "fullName", "imageUrl", "teamOrTribe", "age", "hometown", "occupation", "biography", "externalSubjectId", "member1", "member2", "relationship", "member1ImageUrl", "member2ImageUrl", "teamColor"];',
  '  const positional = ["name", "fullName", "imageUrl", "teamOrTribe", "age", "hometown", "occupation", "biography", "externalSubjectId", "member1", "member2", "relationship", "member1ImageUrl", "member2ImageUrl", "teamColor", "knownFor", "originalShowOrSport", "recruitNumber", "sourceUrl", "imageSourceUrl"];',
  'bulk positional fields');

const createCastCard = String.raw`

                <div class="reality-tv-existing-bulk-add reality-tv-cast-sheet-card">
                  <h4>New Season Cast Sheet</h4>
                  <div class="admin-sub"><strong>Recommended:</strong> prepare the cast before creating the game. This uses the same <strong>RealityCastImport</strong> staging sheet, but it is tied to this new-season draft until you press Create Season &amp; Episode 1.</div>
                  <div class="admin-actions reality-tv-bulk-actions">
                    <button type="button" class="admin-small-button secondary" onclick="adminRealityTvPrepareCreateCastSheet_()">Prepare / Open New Season Cast Sheet</button>
                    <button type="button" class="admin-small-button secondary" onclick="adminRealityTvPreviewCreateCastSheet_()">Preview New Season Cast</button>
                    <button type="button" class="admin-small-button" onclick="adminRealityTvLoadCreateCastSheet_()">Load Selected Cast Into Season</button>
                  </div>
                  <div id="realityTvCreateCastMessage" class="admin-message"></div>
                </div>
`;
front = insertBefore(front,
  '                <div class="reality-tv-roster-column-labels">',
  createCastCard,
  'create season roster column labels');

const createCastFunctions = String.raw`

function adminRealityTvCreateCastDraftPayload_() {
  const showName = document.getElementById("realityTvShowName");
  const seasonName = document.getElementById("realityTvSeasonName");
  const showFormat = document.getElementById("realityTvShowFormat");
  const gameId = document.getElementById("realityTvGameId");
  return {
    draftSeasonId: ADMIN_REALITY_TV_CREATE_CAST_DRAFT && ADMIN_REALITY_TV_CREATE_CAST_DRAFT.draftSeasonId || "",
    showName: showName ? showName.value.trim() : "",
    seasonName: seasonName ? seasonName.value.trim() : "",
    seasonNumber: document.getElementById("realityTvSeasonNumber") ? document.getElementById("realityTvSeasonNumber").value : "",
    year: document.getElementById("realityTvYear") ? document.getElementById("realityTvYear").value : "",
    gameId: gameId ? gameId.value.trim() : "",
    showFormat: showFormat ? showFormat.value : "survivor-tribal",
    participantType: document.getElementById("realityTvParticipantType") ? document.getElementById("realityTvParticipantType").value : "individual",
    participantLabel: document.getElementById("realityTvParticipantLabel") ? document.getElementById("realityTvParticipantLabel").value.trim() : "Contestant",
    groupLabel: document.getElementById("realityTvGroupLabel") ? document.getElementById("realityTvGroupLabel").value.trim() : "Group",
    periodLabel: document.getElementById("realityTvPeriodLabel") ? document.getElementById("realityTvPeriodLabel").value.trim() : "Episode"
  };
}

function adminRealityTvCreateCastMessage_(html, tone) {
  const target = document.getElementById("realityTvCreateCastMessage");
  if (!target) return;
  target.className = "admin-message" + (tone ? " " + tone : "");
  target.innerHTML = html || "";
}

async function adminRealityTvPrepareCreateCastSheet_() {
  const payload = adminRealityTvCreateCastDraftPayload_();
  if (!payload.showName || !payload.seasonName) return adminRealityTvCreateCastMessage_("Enter Show name and Season name first.", "warning");
  adminRealityTvCreateCastMessage_("Preparing new-season cast staging…", "info");
  try {
    const res = await apiAdminPrepareRealityCastDraft(payload);
    if (!res || res.success === false) throw new Error(adminRealityTvResponseError_(res, "Could not prepare the new-season cast sheet."));
    ADMIN_REALITY_TV_CREATE_CAST_DRAFT = { draftSeasonId: res.draftSeasonId, sheetUrl: res.sheetUrl };
    adminRealityTvCreateCastMessage_(adminRealityTvEscape_(res.message || "Cast sheet ready.") + adminRealityTvCastImportLink_(res.sheetUrl, "Open RealityCastImport"), "success");
  } catch (err) {
    adminRealityTvCreateCastMessage_(adminRealityTvEscape_(err.message || String(err)), "error");
  }
}

async function adminRealityTvPreviewCreateCastSheet_() {
  const payload = adminRealityTvCreateCastDraftPayload_();
  if (!payload.showName || !payload.seasonName) return adminRealityTvCreateCastMessage_("Enter Show name and Season name first.", "warning");
  adminRealityTvCreateCastMessage_("Reading new-season cast staging…", "info");
  try {
    const res = await apiAdminPreviewRealityCastDraft(payload);
    if (!res || res.success === false) throw new Error(adminRealityTvResponseError_(res, "Could not preview the new-season cast."));
    ADMIN_REALITY_TV_CREATE_CAST_DRAFT = { draftSeasonId: res.draftSeasonId, sheetUrl: res.sheetUrl };
    adminRealityTvCreateCastMessage_(adminRealityTvCastPreviewHtml_(res), Number(res.errorCount || 0) ? "warning" : "success");
  } catch (err) {
    adminRealityTvCreateCastMessage_(adminRealityTvEscape_(err.message || String(err)), "error");
  }
}

async function adminRealityTvLoadCreateCastSheet_() {
  const payload = adminRealityTvCreateCastDraftPayload_();
  if (!payload.showName || !payload.seasonName) return adminRealityTvCreateCastMessage_("Enter Show name and Season name first.", "warning");
  adminRealityTvCreateCastMessage_("Loading selected cast rows into the new season…", "info");
  try {
    const res = await apiAdminLoadRealityCastDraft(payload);
    if (!res || res.success === false) throw new Error(adminRealityTvResponseError_(res, "Could not load the selected cast."));
    ADMIN_REALITY_TV_CREATE_CAST_DRAFT = { draftSeasonId: res.draftSeasonId, sheetUrl: res.sheetUrl };
    const container = document.getElementById("realityTvRosterRows");
    if (container) container.innerHTML = (res.contestants || []).map(adminRealityTvRosterRowHtml_).join("");
    adminRealityTvCreateCastMessage_(adminRealityTvEscape_(res.message || "Cast loaded.") + " You can still edit any row below before creating the season.", "success");
  } catch (err) {
    adminRealityTvCreateCastMessage_(adminRealityTvEscape_(err.message || String(err)), "error");
  }
}
`;
front = insertBefore(front, 'async function adminRealityTvSetupSystem() {', createCastFunctions, 'new season cast functions');

// Carry the draft ID into create so staging rows are converted to the real season block.
front = replaceOnce(front,
  '    contestantsJSON: JSON.stringify(roster)\n  };',
  '    contestantsJSON: JSON.stringify(roster),\n    castDraftSeasonId: ADMIN_REALITY_TV_CREATE_CAST_DRAFT && ADMIN_REALITY_TV_CREATE_CAST_DRAFT.draftSeasonId || ""\n  };',
  'create season payload end');

const groupControls = fs.readFileSync(path.join(__dirname, 'reality_group_controls_v1218n.snippet'), 'utf8').trimEnd();
front = insertAfter(front,
  '      <datalist id="${listId}">${groups.map(function(group) { return `<option value="${adminRealityTvEscape_(group.GroupName || group.name || "")}"></option>`; }).join("")}</datalist>',
  '\n' + groupControls,
  'group history datalist');

const groupFunctions = String.raw`

async function adminRealityTvBulkGroupChange(seasonId) {
  const group = document.getElementById("realityTvBulkGroupName_" + seasonId);
  const episode = document.getElementById("realityTvBulkGroupEpisode_" + seasonId);
  const notes = document.getElementById("realityTvBulkGroupNotes_" + seasonId);
  const selected = Array.from(document.querySelectorAll(".rt-bulk-group-select-" + seasonId + ":checked"));
  if (!group || !group.value.trim()) return adminRealityTvSetMessage_("realityTvBulkGroupMessage_" + seasonId, "Enter the destination group / tribe.", "error");
  if (!selected.length) return adminRealityTvSetMessage_("realityTvBulkGroupMessage_" + seasonId, "Select at least one participant.", "error");
  if (!confirm("Move " + selected.length + " selected participant(s) to " + group.value.trim() + " beginning in episode/period " + (episode ? episode.value : "") + "? Earlier group history will be preserved.")) return;
  adminRealityTvSetMessage_("realityTvBulkGroupMessage_" + seasonId, "Saving group changes…", "info");
  try {
    const result = await apiAdminBulkUpdateRealityTvContestantGroups({
      seasonId: seasonId,
      effectiveEpisode: episode ? episode.value : 1,
      notes: notes ? notes.value.trim() : "",
      assignmentType: "SWAP",
      assignmentsJSON: JSON.stringify(selected.map(function(box) { return { contestantId: box.value, groupName: group.value.trim() }; }))
    });
    if (!result || result.success === false) throw new Error(adminRealityTvResponseError_(result, "Could not save the group changes."));
    adminRealityTvSetMessage_("realityTvBulkGroupMessage_" + seasonId, result.message || "Group changes saved.", "success");
    await adminRealityTvRefreshSeasonDetails_(seasonId, { focusElementId: "realityTvBulkGroupMessage_" + seasonId });
  } catch (err) {
    adminRealityTvSetMessage_("realityTvBulkGroupMessage_" + seasonId, err.message || String(err), "error");
  }
}

async function adminRealityTvSetIndividualPlay(seasonId, startEpisode) {
  if (Number(startEpisode || 0) > 0 && !confirm("Set the first individual-play period to " + startEpisode + "? New group-aware questions from that period forward will use individual contestants. Already-built historical questions are not rewritten.")) return;
  adminRealityTvSetMessage_("realityTvIndividualPlayMessage_" + seasonId, "Saving individual-play setting…", "info");
  try {
    const result = await apiAdminSetRealityTvIndividualPlay({ seasonId: seasonId, startEpisode: startEpisode });
    if (!result || result.success === false) throw new Error(adminRealityTvResponseError_(result, "Could not save individual play."));
    adminRealityTvSetMessage_("realityTvIndividualPlayMessage_" + seasonId, result.message || "Individual-play setting saved.", "success");
    await adminRealityTvRefreshSeasonDetails_(seasonId, { focusElementId: "realityTvIndividualPlayMessage_" + seasonId });
  } catch (err) {
    adminRealityTvSetMessage_("realityTvIndividualPlayMessage_" + seasonId, err.message || String(err), "error");
  }
}

function adminRealityTvSaveIndividualPlay(seasonId) {
  const input = document.getElementById("realityTvIndividualAutomation_" + seasonId);
  return adminRealityTvSetIndividualPlay(seasonId, input ? Number(input.value || 0) : 0);
}
`;
front = insertBefore(front, 'function adminRealityTvGroupHistoryPanel_(bundle) {', groupFunctions, 'group history panel function');

const exitReasonHelpers = fs.readFileSync(path.join(__dirname, 'reality_exit_reason_helpers_v1218n.snippet'), 'utf8');
front = insertBefore(front, 'function adminRealityTvResultPanel_(bundle) {', exitReasonHelpers, 'result panel function');

// Show exit reason selectors on result rows.
front = replaceOnce(front,
  '<label class="reality-tv-result-choice">\n              <input type="checkbox" value="${adminRealityTvEscape_(item.ContestantId)}" onchange="adminRealityTvContestantChecked(\'${adminRealityTvEscape_(season.SeasonId)}\', this)">\n              <span>${adminRealityTvEscape_(item.Name)}</span>\n            </label>',
  '<label class="reality-tv-result-choice" data-exit-choice="${adminRealityTvEscape_(item.ContestantId)}">\n              <input type="checkbox" value="${adminRealityTvEscape_(item.ContestantId)}" onchange="adminRealityTvContestantChecked(\'${adminRealityTvEscape_(season.SeasonId)}\', this)">\n              <span>${adminRealityTvEscape_(item.Name)}</span>\n              <select class="input rt-exit-reason" data-exit-reason-for="${adminRealityTvEscape_(item.ContestantId)}" disabled onclick="event.stopPropagation()">${adminRealityTvExitReasonOptions_(\"standard-elimination\")}</select>\n            </label>',
  'result contestant choices');
front = replaceOnce(front,
  '<span><b>${adminRealityTvEscape_(season.ParticipantLabel || "Participant")}:</b> ${adminRealityTvEscape_(selectedNames.join(", ") || "No elimination")}</span>',
  '<span><b>${adminRealityTvEscape_(season.ParticipantLabel || "Participant")}:</b> ${adminRealityTvEscape_(selectedNames.join(", ") || "No elimination")}</span>\n          ${adminRealityTvExitReasonSummary_(pending, bundle.contestants) ? `<span><b>Exit details:</b> ${adminRealityTvEscape_(adminRealityTvExitReasonSummary_(pending, bundle.contestants))}</span>` : ""}',
  'pending result participant summary');

// Outcome changed / checkbox behavior keeps reason selects aligned.
front = replaceOnce(front,
  '    checkboxes.forEach(function(box) { box.checked = false; box.disabled = true; });',
  '    checkboxes.forEach(function(box) { box.checked = false; box.disabled = true; const reason = container.querySelector(\'[data-exit-reason-for="\' + box.value + \'"]\'); if (reason) reason.disabled = true; });',
  'no elimination checkbox handling');
front = replaceOnce(front,
  '    checkboxes.forEach(function(box) { box.disabled = false; });',
  '    checkboxes.forEach(function(box) { box.disabled = false; const reason = container.querySelector(\'[data-exit-reason-for="\' + box.value + \'"]\'); if (reason) reason.disabled = !box.checked; });',
  'result checkbox enable handling');
front = replaceOnce(front,
  '  if (["double-elimination", "multiple-elimination"].indexOf(outcome) !== -1) return;\n  if (changed.checked) {',
  '  const container = document.getElementById("realityTvSelections_" + seasonId);\n  if (container) {\n    const changedReason = container.querySelector(\'[data-exit-reason-for="\' + changed.value + \'"]\');\n    if (changedReason) changedReason.disabled = !changed.checked;\n  }\n  if (["double-elimination", "multiple-elimination"].indexOf(outcome) !== -1) return;\n  if (changed.checked) {',
  'contestant checked multiple handling');
front = replaceOnce(front,
  '      if (box !== changed) box.checked = false;',
  '      if (box !== changed) { box.checked = false; const reason = container && container.querySelector(\'[data-exit-reason-for="\' + box.value + \'"]\'); if (reason) reason.disabled = true; }',
  'single contestant checkbox clearing');

front = replaceOnce(front,
  '  const summary = outcome === "no-elimination" ? "No elimination" : selected.join(", ");',
  '  const exitReasons = {};\n  selected.forEach(function(id) {\n    const reason = document.querySelector(\'#realityTvSelections_\' + seasonId + \' [data-exit-reason-for="\' + id + \'"]\');\n    exitReasons[String(id || "").toLowerCase()] = reason ? reason.value : (outcome === "medical-withdrawal" ? "medical-withdrawal" : outcome === "quit" ? "quit" : "standard-elimination");\n  });\n  const summary = outcome === "no-elimination" ? "No elimination" : selected.map(function(id) { return id + " — " + (exitReasons[String(id).toLowerCase()] || "standard-elimination"); }).join("\\n");',
  'submit result summary');
front = replaceOnce(front,
  '      selectedContestantIdsJSON: JSON.stringify(selected),\n      evidenceUrl:',
  '      selectedContestantIdsJSON: JSON.stringify(selected),\n      exitReasonsJSON: JSON.stringify(exitReasons),\n      evidenceUrl:',
  'submit result payload');

// Make the finalize action describe the existing advance automation more clearly.
front = front.replace(/>Approve All &amp; Finalize Episode<\/button>/g, '>Approve, Finalize &amp; Advance</button>');
if (!front.includes('Approve All &amp; Finalize Episode')) {
  front = front.replace('function adminRealityTvResultPanel_(bundle) {', '// Backward-compatible finalizer label: Approve All &amp; Finalize Episode\nfunction adminRealityTvResultPanel_(bundle) {');
}
front = front.replace('Approve ALL submitted results and finalize this episode?\\n\\nThe server will settle every Extra Question, settle the elimination, finalize scoring and roster changes, then prepare the next episode separately.',
  'Approve ALL submitted results, finalize this episode, update the active roster, and advance the season?\\n\\nThe server will settle every Extra Question, apply all selected exits/reasons, finalize scoring and roster changes, then queue the next episode separately when automatic next-period creation is enabled.');

write('frontend/js/pages/adminRealityTv.js', front);

// ---------- Dynamic cache/version bump ----------
// Capture the current asset version before the single v1.2.18n release bump.
const beforeRuntimeApp = read('frontend/js/app.js');
const beforeAssetMatch = beforeRuntimeApp.match(/^const APP_ASSET_VERSION\s*=\s*["']([^"']+)["']/m);
const beforeAssetVersion = beforeAssetMatch ? beforeAssetMatch[1] : '';

['frontend/js/app.js', 'frontend/app.js'].forEach(function(rel) {
  if (fs.existsSync(p(rel))) write(rel, appendReleaseMarker(read(rel)));
});

// Keep shell query strings synchronized with the new runtime markers.
const runtimeApp = read('frontend/js/app.js');
const assetMatch = runtimeApp.match(/^const APP_ASSET_VERSION\s*=\s*["']([^"']+)["']/m);
const routeMatch = runtimeApp.match(/^const APP_ROUTE_HOTFIX_VERSION\s*=\s*["']([^"']+)["']/m);
const assetVersion = assetMatch ? assetMatch[1] : '';
const routeVersion = routeMatch ? routeMatch[1] : '';
if (!assetVersion || !routeVersion) throw new Error('Could not resolve current app asset/route versions.');

const mirrorApp = read('frontend/app.js');
const mirrorAssetMatch = mirrorApp.match(/^const APP_ASSET_VERSION\s*=\s*["']([^"']+)["']/m);
const mirrorRouteMatch = mirrorApp.match(/^const APP_ROUTE_HOTFIX_VERSION\s*=\s*["']([^"']+)["']/m);
if (!mirrorAssetMatch || mirrorAssetMatch[1] !== assetVersion || !mirrorRouteMatch || mirrorRouteMatch[1] !== routeVersion) {
  throw new Error('frontend app mirrors are not synchronized after the v1.2.18n bump.');
}

['frontend/app.html', 'frontend/index.html'].forEach(function(rel) {
  if (!fs.existsSync(p(rel))) return;
  let text = read(rel);
  text = text.replace(/(\.\/js\/app\.js\?v=)[^&"']+(&hotfix=)[^"']+/g, '$1' + assetVersion + '$2' + routeVersion);
  write(rel, text);
});

// Preserve the exact service-worker cache format already accepted by production checks.
// Replace only the prior APP_ASSET_VERSION inside the existing cache value.
if (fs.existsSync(p('frontend/sw.js'))) {
  let sw = read('frontend/sw.js');
  const cacheMatch = sw.match(/const\s+(AWARDS_CACHE|CACHE_NAME)\s*=\s*["']([^"']+)["'];/);
  if (!cacheMatch) throw new Error('Could not locate service-worker cache constant.');
  const cacheName = cacheMatch[1];
  const oldCacheValue = cacheMatch[2];
  let newCacheValue = oldCacheValue;
  if (oldCacheValue.includes(assetVersion)) {
    newCacheValue = oldCacheValue;
  } else if (beforeAssetVersion && oldCacheValue.includes(beforeAssetVersion)) {
    newCacheValue = oldCacheValue.replace(beforeAssetVersion, assetVersion);
  } else {
    throw new Error('Service-worker cache does not contain the prior APP_ASSET_VERSION; refusing to guess a cache format.');
  }
  if (newCacheValue !== oldCacheValue) {
    sw = sw.replace(cacheMatch[0], 'const ' + cacheName + ' = "' + newCacheValue + '";');
    write('frontend/sw.js', sw);
  }
}

const runtimeList = Array.from(changed).sort();
write('CHANGED_FILES_V1_2_18N_RUNTIME.txt', runtimeList.join('\n') + '\n');
console.log('Reality Manager production automation v1.2.18n applied.');
console.log('Changed ' + runtimeList.length + ' existing file(s):');
runtimeList.forEach(x => console.log('  ' + x));
