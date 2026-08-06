/* =========================
   REALITY TV SEASON MANAGER
   Production v1.1.14
========================= */

const REALITY_TV_SEASONS_SHEET = "RealitySeasons";
const REALITY_TV_CONTESTANTS_SHEET = "RealityContestants";
const REALITY_TV_EPISODES_SHEET = "RealityEpisodes";
const REALITY_TV_GROUPS_SHEET = "RealityGroups";
const REALITY_TV_GROUP_HISTORY_SHEET = "RealityContestantGroupHistory";
const REALITY_TV_RESULTS_QUEUE_SHEET = "RealityResultQueue";
const REALITY_TV_EPISODE_VOTES_SHEET = "RealityEpisodeVotes";
const REALITY_TV_HUB_PROPERTY = "EXTERNAL_RESULTS_HUB_SPREADSHEET_ID";

const REALITY_TV_SEASON_HEADERS = [
  "SeasonId", "GameId", "ShowName", "SeasonName", "SeasonNumber", "Year",
  "ShowFormat", "ParticipantType", "ParticipantLabel", "GroupLabel", "PeriodLabel",
  "Provider", "FirstEpisodeDateTime", "WeeklyIntervalDays", "LockOffsetMinutes",
  "Points", "QuestionTemplate", "EliminationLayoutType", "EliminationImageSource", "IndividualPlayStartsEpisode",
  "PickChangesAllowed", "MaxPickChanges", "PickChangePenalty", "CurrentEpisodeNumber", "Status",
  "AutoCreateNextEpisode", "CreatedAt", "UpdatedAt"
];

const REALITY_TV_CONTESTANT_HEADERS = [
  "SeasonId", "GameId", "ContestantId", "Name", "FullName", "ImageUrl",
  "TeamOrTribe", "StartingGroup", "CurrentGroup", "FinalGroup", "Member1", "Member2", "Relationship", "Member1ImageUrl",
  "Member2ImageUrl", "TeamColor", "Age", "Hometown", "Occupation", "Biography",
  "ExternalSubjectId", "Status", "EliminatedEpisode", "EliminatedAt",
  "DisplayOrder", "Active", "CreatedAt", "UpdatedAt"
];

const REALITY_TV_EPISODE_HEADERS = [
  "SeasonId", "GameId", "EpisodeId", "EpisodeNumber", "EpisodeName",
  "AirDateTime", "LockDateTime", "CategoryId", "ExternalEventId",
  "ExternalMarketId", "OutcomeType", "Status", "EliminatedContestantIds",
  "ResultQueueId", "NextEpisodeCreated", "ScheduleStatus", "OriginalAirDateTime",
  "ScheduleNotes", "CreatedAt", "UpdatedAt"
];

const REALITY_TV_GROUP_HEADERS = [
  "SeasonId", "GameId", "GroupId", "GroupName", "GroupType",
  "ImageUrl", "Color", "Active", "DisplayOrder", "CreatedAt", "UpdatedAt"
];


const REALITY_TV_GROUP_HISTORY_HEADERS = [
  "AssignmentId", "SeasonId", "GameId", "ContestantId", "GroupId", "GroupName",
  "StartEpisode", "EndEpisode", "AssignmentType", "Notes", "Active",
  "CreatedAt", "UpdatedAt"
];

const REALITY_TV_QUEUE_HEADERS = [
  "QueueId", "SeasonId", "GameId", "EpisodeId", "EpisodeNumber", "CategoryId",
  "OutcomeType", "SelectedContestantIds", "ReviewStatus", "EvidenceUrl", "Notes",
  "SubmittedBy", "SubmittedAt", "ReviewedBy", "ReviewedAt", "PushStatus",
  "ApprovalStage", "ApprovalStartedAt", "ApprovalCompletedAt", "ApprovalAttemptCount",
  "PushedAt", "NextEpisodeId", "HubImportedResultId", "HubReviewId",
  "ErrorMessage", "UpdatedAt"
];

const REALITY_TV_EPISODE_VOTE_HEADERS = [
  "VoteId", "SeasonId", "GameId", "EpisodeId", "EpisodeNumber",
  "VoteRoundId", "VoteRoundLabel", "VoterContestantId", "TargetContestantId",
  "VoteStatus", "VoteValue", "Notes", "RecordedBy", "RecordedAt", "UpdatedAt"
];

const REALITY_TV_HUB_HEADERS = {
  ExternalEvents: [
    "Provider", "ExternalEventId", "EventName", "EventType", "StartDate",
    "EndDate", "Status", "SourceUrl", "LastUpdated", "RawJSON", "CreatedAt"
  ],
  ExternalMarkets: [
    "Provider", "ExternalMarketId", "ExternalEventId", "MarketQuestion",
    "OutcomesJSON", "PricesJSON", "ClosingTime", "ResolutionStatus",
    "WinningOutcome", "ResolutionSource", "SourceUrl", "LastUpdated",
    "RawJSON", "CreatedAt"
  ],
  ExternalSubjects: [
    "Provider", "ExternalSubjectId", "Name", "SubjectType", "ImageUrl",
    "MetadataJSON", "SourceUrl", "LastUpdated", "CreatedAt"
  ],
  AppMappings: [
    "MappingId", "AppGameId", "CategoryId", "NomineeId", "Provider",
    "ExternalEventId", "ExternalMarketId", "ExternalSubjectId", "ResultKey",
    "ComparisonOperator", "Threshold", "ExpectedOutcome", "AutoSettle",
    "RequireAdminReview", "SourceUrl", "SourceConfigJSON", "Active",
    "CreatedAt", "UpdatedAt"
  ],
  ImportedResults: [
    "ImportedResultId", "Provider", "ExternalEventId", "ExternalMarketId",
    "ResultKey", "ResultValue", "Finality", "WinningOutcome",
    "ProviderTimestamp", "ImportedAt", "EvidenceUrl", "SourceUrl",
    "RawJSON", "ReviewStatus", "ReviewRequired", "SourceFingerprint",
    "CreatedAt", "UpdatedAt"
  ],
  ReviewQueue: [
    "ReviewId", "ImportedResultId", "Provider", "ExternalEventId",
    "ExternalMarketId", "ResultKey", "ResultValue", "Finality",
    "WinningOutcome", "EvidenceUrl", "ReviewStatus", "ReviewedBy",
    "ReviewedAt", "ReviewNotes", "PushStatus", "PushedAt",
    "PushMessage", "CreatedAt", "UpdatedAt"
  ]
};

function realityTvString_(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function realityTvKey_(value) {
  return realityTvString_(value).toLowerCase();
}

function realityTvBool_(value) {
  return value === true || ["true", "yes", "1", "on"].indexOf(realityTvKey_(value)) !== -1;
}

function realityTvNumber_(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function realityTvIsRetryableSpreadsheetError_(err) {
  const message = err && err.message ? String(err.message) : String(err || "");
  return /service spreadsheets (?:failed|timed out)|internal error|please try again|lock timeout|another process was holding the lock/i.test(message);
}

function realityTvSpreadsheetRetry_(label, fn, maxAttempts) {
  const attempts = Math.max(1, realityTvNumber_(maxAttempts, 5));
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return fn();
    } catch (err) {
      lastError = err;
      if (!realityTvIsRetryableSpreadsheetError_(err) || attempt >= attempts) throw err;
      if (typeof Utilities !== "undefined" && typeof Utilities.sleep === "function") {
        Utilities.sleep(Math.min(5000, 500 * attempt * attempt));
      }
    }
  }
  throw lastError || new Error((label || "Spreadsheet operation") + " failed.");
}

function realityTvApprovalLock_() {
  if (typeof LockService.getDocumentLock === "function") {
    const documentLock = LockService.getDocumentLock();
    if (documentLock) return documentLock;
  }
  if (typeof LockService.getUserLock === "function") return LockService.getUserLock();
  return LockService.getScriptLock();
}

function realityTvApprovalProcessingFresh_(queue, processingStatus) {
  if (realityTvString_(queue && queue.PushStatus).toUpperCase() !== realityTvString_(processingStatus).toUpperCase()) return false;
  const updatedAt = new Date(queue && (queue.UpdatedAt || queue.ApprovalStartedAt) || 0).getTime();
  return Number.isFinite(updatedAt) && updatedAt > 0 && (Date.now() - updatedAt) < 120000;
}

function realityTvClaimApprovalStage_(options) {
  const lock = realityTvApprovalLock_();
  if (!lock.tryLock(750)) {
    return { success: true, busy: true, complete: false, message: "Another approval request is claiming this stage." };
  }
  try {
    let queue = realityTvSpreadsheetRetry_("Read Reality TV approval queue", function() {
      return options.getQueue(options.queueId);
    }, 4);
    if (!queue) throw new Error(options.notFoundMessage || "Approval queue item not found.");
    if (realityTvString_(queue.ApprovalStage || "SETTLE").toUpperCase() !== realityTvString_(options.stage).toUpperCase()) {
      return { success: true, changed: true, queue: queue };
    }
    if (realityTvApprovalProcessingFresh_(queue, options.processingStatus)) {
      return {
        success: true,
        busy: true,
        complete: false,
        message: options.busyMessage || "This approval stage is already running."
      };
    }
    const attempts = realityTvNumber_(queue.ApprovalAttemptCount, 0) + 1;
    const sheet = SpreadsheetApp.getActive().getSheetByName(options.sheetName);
    realityTvSpreadsheetRetry_("Claim Reality TV approval stage", function() {
      realityTvUpdateObjectRow_(sheet, queue.__rowNumber, {
        PushStatus: options.processingStatus,
        ApprovalAttemptCount: attempts,
        ErrorMessage: "",
        UpdatedAt: new Date()
      });
    }, 4);
    queue = realityTvSpreadsheetRetry_("Reload Reality TV approval queue", function() {
      return options.getQueue(options.queueId);
    }, 4);
    return { success: true, busy: false, queue: queue, attempts: attempts };
  } finally {
    lock.releaseLock();
  }
}

function realityTvSlug_(value) {
  return realityTvString_(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function realityTvId_(prefix) {
  return prefix + "-" + Utilities.getUuid().replace(/-/g, "").slice(0, 18);
}

function realityTvParseJson_(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === "object")) return value;
  const text = realityTvString_(value);
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error("Invalid JSON: " + err.message);
  }
}

function realityTvPickRules_(source) {
  source = source || {};
  const allowedValue = source.PickChangesAllowed !== undefined
    ? source.PickChangesAllowed
    : source.pickChangesAllowed;
  const allowed = allowedValue === undefined || allowedValue === ""
    ? true
    : realityTvBool_(allowedValue);
  const maxValue = source.MaxPickChanges !== undefined
    ? source.MaxPickChanges
    : source.maxPickChanges;
  let maxChanges = -1;
  if (!allowed) maxChanges = 0;
  else if (maxValue !== undefined && maxValue !== "" && maxValue !== null) {
    maxChanges = Math.max(-1, Math.floor(realityTvNumber_(maxValue, -1)));
  }
  const penaltyValue = source.PickChangePenalty !== undefined
    ? source.PickChangePenalty
    : source.pickChangePenalty;
  return {
    allowed: allowed,
    maxChanges: maxChanges,
    changePenalty: Math.max(0, realityTvNumber_(penaltyValue, 0))
  };
}

function realityTvApplyPickRulesToSeasonCategories_(season) {
  if (!season || typeof adminUpdateCategory !== "function") return 0;
  const rules = realityTvPickRules_(season);
  const ids = {};
  realityTvEpisodesForSeason_(season.SeasonId).forEach(function(row) {
    if (row.CategoryId) ids[realityTvKey_(row.CategoryId)] = row.CategoryId;
  });
  if (typeof REALITY_TV_EPISODE_QUESTIONS_SHEET !== "undefined") {
    realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_EPISODE_QUESTIONS_SHEET).forEach(function(row) {
      if (realityTvKey_(row.SeasonId) === realityTvKey_(season.SeasonId) && row.CategoryId) {
        ids[realityTvKey_(row.CategoryId)] = row.CategoryId;
      }
    });
  }
  Object.keys(ids).forEach(function(key) {
    adminUpdateCategory({
      gameId: season.GameId,
      categoryId: ids[key],
      maxChanges: rules.maxChanges,
      changePenalty: rules.changePenalty
    });
  });
  return Object.keys(ids).length;
}

function realityTvDate_(value, label) {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  const text = realityTvString_(value);
  if (!text) return null;
  const date = new Date(text);
  if (isNaN(date.getTime())) {
    throw new Error((label || "Date") + " is invalid.");
  }
  return date;
}

function realityTvIso_(value) {
  const date = realityTvDate_(value, "Date");
  return date ? date.toISOString() : "";
}

function realityTvGetOrCreateSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);

  const lastColumn = sheet.getLastColumn();
  const existing = lastColumn > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(realityTvString_)
    : [];

  if (!existing.length || existing.every(function(value) { return !value; })) {
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    return sheet;
  }

  const missing = headers.filter(function(header) {
    return existing.indexOf(header) === -1;
  });
  if (missing.length) {
    sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function realityTvEnsureSystem_() {
  const ss = SpreadsheetApp.getActive();
  realityTvGetOrCreateSheet_(ss, REALITY_TV_SEASONS_SHEET, REALITY_TV_SEASON_HEADERS);
  realityTvGetOrCreateSheet_(ss, REALITY_TV_CONTESTANTS_SHEET, REALITY_TV_CONTESTANT_HEADERS);
  realityTvGetOrCreateSheet_(ss, REALITY_TV_EPISODES_SHEET, REALITY_TV_EPISODE_HEADERS);
  realityTvGetOrCreateSheet_(ss, REALITY_TV_GROUPS_SHEET, REALITY_TV_GROUP_HEADERS);
  realityTvGetOrCreateSheet_(ss, REALITY_TV_GROUP_HISTORY_SHEET, REALITY_TV_GROUP_HISTORY_HEADERS);
  realityTvGetOrCreateSheet_(ss, REALITY_TV_RESULTS_QUEUE_SHEET, REALITY_TV_QUEUE_HEADERS);
  realityTvGetOrCreateSheet_(ss, REALITY_TV_EPISODE_VOTES_SHEET, REALITY_TV_EPISODE_VOTE_HEADERS);
  return { success: true };
}

function realityTvClearRuntimeCaches_(gameId, seasonId) {
  if (typeof clearGameCaches === "function") clearGameCaches(gameId);
  else if (typeof clearAppCaches === "function") clearAppCaches();
  if (typeof CacheService === "undefined") return;
  try {
    const cache = CacheService.getScriptCache();
    cache.remove("rtv_user_core_" + realityTvSlug_(gameId));
    if (seasonId) {
      realityTvEpisodesForSeason_(seasonId).forEach(function(episode) {
        cache.remove("rtv_episode_compare_" + realityTvSlug_(gameId) + "_" + realityTvNumber_(episode.EpisodeNumber, 0));
      });
    }
  } catch (err) {
    // Cache invalidation is best-effort and must never block a saved result, vote, or schedule change.
  }
}

function realityTvReadObjects_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(realityTvString_);
  return values.slice(1).map(function(row, index) {
    const object = { __rowNumber: index + 2 };
    headers.forEach(function(header, column) {
      object[header] = row[column];
    });
    return object;
  }).filter(function(row) {
    return headers.some(function(header) { return realityTvString_(row[header]) !== ""; });
  });
}

function realityTvHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(realityTvString_);
  const map = {};
  headers.forEach(function(header, index) { map[header] = index; });
  return { headers: headers, map: map };
}

function realityTvAppendObject_(sheet, payload) {
  const schema = realityTvHeaderMap_(sheet);
  const row = schema.headers.map(function(header) {
    return Object.prototype.hasOwnProperty.call(payload, header) ? payload[header] : "";
  });
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function realityTvUpdateObjectRow_(sheet, rowNumber, patch) {
  const schema = realityTvHeaderMap_(sheet);
  const range = sheet.getRange(rowNumber, 1, 1, schema.headers.length);
  const row = range.getValues()[0];
  let changed = false;
  Object.keys(patch || {}).forEach(function(header) {
    if (schema.map[header] === undefined) return;
    row[schema.map[header]] = patch[header];
    changed = true;
  });
  if (changed) range.setValues([row]);
}

function realityTvUpsertObject_(spreadsheet, sheetName, headers, keyFields, payload) {
  const sheet = realityTvGetOrCreateSheet_(spreadsheet, sheetName, headers);
  const rows = realityTvReadObjects_(spreadsheet, sheetName);
  const found = rows.find(function(row) {
    return keyFields.every(function(field) {
      return realityTvKey_(row[field]) === realityTvKey_(payload[field]);
    });
  });
  if (found) {
    realityTvUpdateObjectRow_(sheet, found.__rowNumber, payload);
    return found.__rowNumber;
  }
  return realityTvAppendObject_(sheet, payload);
}

function realityTvBulkUpsertObjects_(spreadsheet, sheetName, headers, keyFields, payloads) {
  const items = Array.isArray(payloads) ? payloads.filter(Boolean) : [];
  if (!items.length) return { updated: 0, appended: 0, total: 0 };

  const sheet = realityTvGetOrCreateSheet_(spreadsheet, sheetName, headers);
  const schema = realityTvHeaderMap_(sheet);
  const width = schema.headers.length;
  const existingCount = Math.max(0, sheet.getLastRow() - 1);
  const rows = existingCount
    ? sheet.getRange(2, 1, existingCount, width).getValues()
    : [];
  const indexByKey = {};

  function keyFor_(rowOrPayload, isRow) {
    return keyFields.map(function(field) {
      const value = isRow
        ? rowOrPayload[schema.map[field]]
        : rowOrPayload[field];
      return realityTvKey_(value);
    }).join("||");
  }

  rows.forEach(function(row, index) {
    indexByKey[keyFor_(row, true)] = index;
  });

  let updated = 0;
  let appended = 0;
  items.forEach(function(payload) {
    const key = keyFor_(payload, false);
    let rowIndex = indexByKey[key];
    if (rowIndex === undefined) {
      rowIndex = rows.length;
      rows.push(new Array(width).fill(""));
      indexByKey[key] = rowIndex;
      appended += 1;
    } else {
      updated += 1;
    }
    Object.keys(payload).forEach(function(header) {
      if (schema.map[header] === undefined) return;
      rows[rowIndex][schema.map[header]] = payload[header];
    });
  });

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, width).setValues(rows);
  }
  return { updated: updated, appended: appended, total: items.length };
}

function realityTvExtractSpreadsheetId_(value) {
  const text = realityTvString_(value);
  if (!text) return "";
  const match = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : text;
}

function realityTvGetHubId_() {
  return realityTvString_(PropertiesService.getScriptProperties().getProperty(REALITY_TV_HUB_PROPERTY));
}

function realityTvOpenHub_() {
  const id = realityTvGetHubId_();
  if (!id) return null;
  return SpreadsheetApp.openById(id);
}

function realityTvGetSeason_(seasonId) {
  realityTvEnsureSystem_();
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_SEASONS_SHEET).find(function(row) {
    return realityTvKey_(row.SeasonId) === realityTvKey_(seasonId);
  }) || null;
}

function realityTvGetSeasonByGameId_(gameId) {
  realityTvEnsureSystem_();
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_SEASONS_SHEET).find(function(row) {
    return realityTvKey_(row.GameId) === realityTvKey_(gameId);
  }) || null;
}

function realityTvGetEpisode_(episodeId) {
  realityTvEnsureSystem_();
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_EPISODES_SHEET).find(function(row) {
    return realityTvKey_(row.EpisodeId) === realityTvKey_(episodeId);
  }) || null;
}

function realityTvGetQueue_(queueId) {
  realityTvEnsureSystem_();
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_RESULTS_QUEUE_SHEET).find(function(row) {
    return realityTvKey_(row.QueueId) === realityTvKey_(queueId);
  }) || null;
}

function realityTvContestantsForSeason_(seasonId) {
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_CONTESTANTS_SHEET)
    .filter(function(row) { return realityTvKey_(row.SeasonId) === realityTvKey_(seasonId); })
    .sort(function(a, b) { return realityTvNumber_(a.DisplayOrder, 999) - realityTvNumber_(b.DisplayOrder, 999); });
}

function realityTvEpisodesForSeason_(seasonId) {
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_EPISODES_SHEET)
    .filter(function(row) { return realityTvKey_(row.SeasonId) === realityTvKey_(seasonId); })
    .sort(function(a, b) { return realityTvNumber_(a.EpisodeNumber, 0) - realityTvNumber_(b.EpisodeNumber, 0); });
}

function realityTvQueueForSeason_(seasonId) {
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_RESULTS_QUEUE_SHEET)
    .filter(function(row) { return realityTvKey_(row.SeasonId) === realityTvKey_(seasonId); })
    .sort(function(a, b) { return new Date(b.SubmittedAt || 0).getTime() - new Date(a.SubmittedAt || 0).getTime(); });
}

function realityTvEpisodeVotesForSeason_(seasonId) {
  realityTvEnsureSystem_();
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_EPISODE_VOTES_SHEET)
    .filter(function(row) { return realityTvKey_(row.SeasonId) === realityTvKey_(seasonId); })
    .sort(function(a, b) {
      const episodeDiff = realityTvNumber_(a.EpisodeNumber, 0) - realityTvNumber_(b.EpisodeNumber, 0);
      if (episodeDiff) return episodeDiff;
      const roundDiff = realityTvString_(a.VoteRoundLabel).localeCompare(realityTvString_(b.VoteRoundLabel));
      if (roundDiff) return roundDiff;
      return new Date(a.RecordedAt || 0).getTime() - new Date(b.RecordedAt || 0).getTime();
    });
}

function realityTvGetEpisodeVote_(voteId) {
  realityTvEnsureSystem_();
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_EPISODE_VOTES_SHEET).find(function(row) {
    return realityTvKey_(row.VoteId) === realityTvKey_(voteId);
  }) || null;
}

function realityTvVoteStatus_(value) {
  const key = realityTvKey_(value || "valid").replace(/[^a-z0-9]+/g, "-");
  const allowed = ["valid", "nullified", "not-read", "lost-vote", "abstained"];
  if (allowed.indexOf(key) === -1) throw new Error("Select a valid vote status.");
  return key.toUpperCase();
}

function apiAdminSaveRealityTvEpisodeVote(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const season = realityTvGetSeason_(payload.seasonId || payload.SeasonId);
  if (!season) throw new Error("Reality TV season not found.");
  const episode = realityTvGetEpisode_(payload.episodeId || payload.EpisodeId);
  if (!episode || realityTvKey_(episode.SeasonId) !== realityTvKey_(season.SeasonId)) {
    throw new Error("Episode not found for this season.");
  }

  const contestants = realityTvContestantsForSeason_(season.SeasonId);
  const contestantById = {};
  contestants.forEach(function(row) { contestantById[realityTvKey_(row.ContestantId)] = row; });
  const voterId = realityTvString_(payload.voterContestantId || payload.VoterContestantId);
  const targetId = realityTvString_(payload.targetContestantId || payload.TargetContestantId);
  if (!contestantById[realityTvKey_(voterId)]) throw new Error("Select a valid voter.");

  const status = realityTvVoteStatus_(payload.voteStatus || payload.VoteStatus);
  const targetRequired = ["VALID", "NULLIFIED", "NOT-READ"].indexOf(status) !== -1;
  if (targetRequired && !contestantById[realityTvKey_(targetId)]) throw new Error("Select who received the vote.");
  if (!targetRequired && targetId && !contestantById[realityTvKey_(targetId)]) throw new Error("Select a valid vote target.");

  const voteValue = Math.max(0, Math.min(20, Math.floor(realityTvNumber_(payload.voteValue || payload.VoteValue, targetRequired ? 1 : 0))));
  if (targetRequired && voteValue < 1) throw new Error("Vote value must be at least 1.");
  const roundLabel = realityTvString_(payload.voteRoundLabel || payload.VoteRoundLabel) || "Round 1 — Initial Vote";
  const voteId = realityTvString_(payload.voteId || payload.VoteId) || realityTvId_("rtv-vote");
  const existing = realityTvGetEpisodeVote_(voteId);
  if (existing && (realityTvKey_(existing.SeasonId) !== realityTvKey_(season.SeasonId) || realityTvKey_(existing.EpisodeId) !== realityTvKey_(episode.EpisodeId))) {
    throw new Error("This vote belongs to a different episode.");
  }
  const now = new Date();
  const record = {
    VoteId: voteId,
    SeasonId: season.SeasonId,
    GameId: season.GameId,
    EpisodeId: episode.EpisodeId,
    EpisodeNumber: episode.EpisodeNumber,
    VoteRoundId: realityTvSlug_(roundLabel),
    VoteRoundLabel: roundLabel,
    VoterContestantId: voterId,
    TargetContestantId: targetRequired ? targetId : (targetId || ""),
    VoteStatus: status,
    VoteValue: voteValue,
    Notes: realityTvString_(payload.notes || payload.Notes),
    RecordedBy: realityTvString_(payload.username || payload.RecordedBy || "administrator"),
    RecordedAt: existing && existing.RecordedAt ? existing.RecordedAt : now,
    UpdatedAt: now
  };
  realityTvUpsertObject_(SpreadsheetApp.getActive(), REALITY_TV_EPISODE_VOTES_SHEET, REALITY_TV_EPISODE_VOTE_HEADERS, ["VoteId"], record);
  realityTvClearRuntimeCaches_(season.GameId, season.SeasonId);
  return { success: true, message: existing ? "Vote updated." : "Vote added.", vote: record };
}

function realityTvEpisodeVoteRecord_(season, episode, contestantById, payload, existing) {
  payload = payload || {};
  const voterId = realityTvString_(payload.voterContestantId || payload.VoterContestantId);
  const targetId = realityTvString_(payload.targetContestantId || payload.TargetContestantId);
  if (!contestantById[realityTvKey_(voterId)]) throw new Error("Select a valid voter.");

  const status = realityTvVoteStatus_(payload.voteStatus || payload.VoteStatus);
  const targetRequired = ["VALID", "NULLIFIED", "NOT-READ"].indexOf(status) !== -1;
  if (targetRequired && !contestantById[realityTvKey_(targetId)]) throw new Error("Select who received the vote.");
  if (!targetRequired && targetId && !contestantById[realityTvKey_(targetId)]) throw new Error("Select a valid vote target.");

  const voteValue = Math.max(0, Math.min(20, Math.floor(realityTvNumber_(payload.voteValue || payload.VoteValue, targetRequired ? 1 : 0))));
  if (targetRequired && voteValue < 1) throw new Error("Vote value must be at least 1.");
  const roundLabel = realityTvString_(payload.voteRoundLabel || payload.VoteRoundLabel) || "Round 1 — Initial Vote";
  const now = new Date();
  return {
    VoteId: realityTvString_(payload.voteId || payload.VoteId) || (existing && existing.VoteId) || realityTvId_("rtv-vote"),
    SeasonId: season.SeasonId,
    GameId: season.GameId,
    EpisodeId: episode.EpisodeId,
    EpisodeNumber: episode.EpisodeNumber,
    VoteRoundId: realityTvSlug_(roundLabel),
    VoteRoundLabel: roundLabel,
    VoterContestantId: voterId,
    TargetContestantId: targetRequired ? targetId : (targetId || ""),
    VoteStatus: status,
    VoteValue: voteValue,
    Notes: realityTvString_(payload.notes || payload.Notes),
    RecordedBy: realityTvString_(payload.username || payload.RecordedBy || "administrator"),
    RecordedAt: existing && existing.RecordedAt ? existing.RecordedAt : now,
    UpdatedAt: now
  };
}

function apiAdminSaveRealityTvEpisodeVotesBulk(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const season = realityTvGetSeason_(payload.seasonId || payload.SeasonId);
  if (!season) throw new Error("Reality TV season not found.");
  const episode = realityTvGetEpisode_(payload.episodeId || payload.EpisodeId);
  if (!episode || realityTvKey_(episode.SeasonId) !== realityTvKey_(season.SeasonId)) {
    throw new Error("Episode not found for this season.");
  }

  let submitted = payload.votes || payload.Votes || realityTvParseJson_(payload.votesJSON || payload.VotesJSON, []);
  if (!Array.isArray(submitted)) throw new Error("Vote rows must be supplied as a list.");
  submitted = submitted.filter(function(row) { return row && typeof row === "object"; });
  if (!submitted.length) throw new Error("Enter at least one vote before saving the round.");
  if (submitted.length > 100) throw new Error("A maximum of 100 vote rows can be saved at once.");

  const contestants = realityTvContestantsForSeason_(season.SeasonId);
  const contestantById = {};
  contestants.forEach(function(row) { contestantById[realityTvKey_(row.ContestantId)] = row; });

  const votingGroupName = realityTvString_(payload.votingGroupName || payload.VotingGroupName);
  const restrictToVotingGroup = votingGroupName && votingGroupName !== "__ALL__";
  const groupByContestantId = {};
  if (restrictToVotingGroup) {
    contestants.forEach(function(row) {
      const profile = typeof realityTvContestantGroupProfile_ === "function"
        ? realityTvContestantGroupProfile_(season.SeasonId, row.ContestantId)
        : null;
      const groupName = typeof realityTvGroupNameForEpisodeFromProfile_ === "function"
        ? realityTvGroupNameForEpisodeFromProfile_(profile || {}, episode.EpisodeNumber, row.TeamOrTribe)
        : realityTvString_(row.TeamOrTribe);
      groupByContestantId[realityTvKey_(row.ContestantId)] = groupName;
    });
  }

  const existingRows = realityTvEpisodeVotesForSeason_(season.SeasonId).filter(function(row) {
    return realityTvKey_(row.EpisodeId) === realityTvKey_(episode.EpisodeId);
  });
  const existingById = {};
  const existingByBallot = {};
  existingRows.forEach(function(row) {
    existingById[realityTvKey_(row.VoteId)] = row;
    existingByBallot[
      [realityTvKey_(row.VoteRoundId || row.VoteRoundLabel), realityTvKey_(row.VoterContestantId)].join("|")
    ] = row;
  });

  const submittedBallots = {};
  const records = submitted.map(function(row) {
    const requestedId = realityTvKey_(row.voteId || row.VoteId);
    const roundLabel = realityTvString_(row.voteRoundLabel || row.VoteRoundLabel) || "Round 1 — Initial Vote";
    const submittedBallotKey = [realityTvKey_(realityTvSlug_(roundLabel)), realityTvKey_(row.voterContestantId || row.VoterContestantId)].join("|");
    if (submittedBallots[submittedBallotKey]) throw new Error("Each voter can have only one ballot in the same voting round.");
    submittedBallots[submittedBallotKey] = true;
    if (restrictToVotingGroup) {
      const voterId = realityTvString_(row.voterContestantId || row.VoterContestantId);
      const targetId = realityTvString_(row.targetContestantId || row.TargetContestantId);
      const outsideVoter = realityTvBool_(row.outsideVoter || row.OutsideVoter);
      const voterGroup = realityTvString_(groupByContestantId[realityTvKey_(voterId)]);
      const targetGroup = realityTvString_(groupByContestantId[realityTvKey_(targetId)]);
      if (!outsideVoter && realityTvKey_(voterGroup) !== realityTvKey_(votingGroupName)) {
        throw new Error("The voter is not a member of the selected voting tribe. Use Add Outside Voter for an exception.");
      }
      if (targetId && realityTvKey_(targetGroup) !== realityTvKey_(votingGroupName)) {
        throw new Error("Vote targets must be members of the selected voting tribe.");
      }
    }
    const ballotKey = [realityTvKey_(realityTvSlug_(roundLabel)), realityTvKey_(row.voterContestantId || row.VoterContestantId)].join("|");
    const existing = (requestedId && existingById[requestedId]) || existingByBallot[ballotKey] || null;
    if (existing && (realityTvKey_(existing.SeasonId) !== realityTvKey_(season.SeasonId) || realityTvKey_(existing.EpisodeId) !== realityTvKey_(episode.EpisodeId))) {
      throw new Error("A vote row belongs to a different episode.");
    }
    return realityTvEpisodeVoteRecord_(season, episode, contestantById, Object.assign({}, row, {
      voteId: existing ? existing.VoteId : (row.voteId || row.VoteId || ""),
      username: payload.username || row.username || row.RecordedBy || "administrator"
    }), existing);
  });

  const sheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODE_VOTES_SHEET);
  const updates = [];
  const appends = [];
  records.forEach(function(record) {
    const prior = existingById[realityTvKey_(record.VoteId)] || null;
    const values = REALITY_TV_EPISODE_VOTE_HEADERS.map(function(header) { return record[header] === undefined ? "" : record[header]; });
    if (prior) updates.push({ rowNumber: prior.__rowNumber, values: values });
    else appends.push(values);
  });

  realityTvSpreadsheetRetry_("Save episode vote round", function() {
    updates.forEach(function(update) {
      sheet.getRange(update.rowNumber, 1, 1, REALITY_TV_EPISODE_VOTE_HEADERS.length).setValues([update.values]);
    });
    if (appends.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, appends.length, REALITY_TV_EPISODE_VOTE_HEADERS.length).setValues(appends);
    }
    if (typeof SpreadsheetApp.flush === "function") SpreadsheetApp.flush();
  }, 5);

  realityTvClearRuntimeCaches_(season.GameId, season.SeasonId);
  return {
    success: true,
    message: records.length + " vote" + (records.length === 1 ? "" : "s") + " saved for " + realityTvString_(episode.EpisodeName) + ".",
    savedCount: records.length,
    votes: records
  };
}


function apiAdminDeleteRealityTvEpisodeVote(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const vote = realityTvGetEpisodeVote_(payload.voteId || payload.VoteId);
  if (!vote) return { success: true, message: "Vote was already removed." };
  const season = realityTvGetSeason_(vote.SeasonId);
  const sheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODE_VOTES_SHEET);
  sheet.deleteRow(vote.__rowNumber);
  if (season) realityTvClearRuntimeCaches_(season.GameId, season.SeasonId);
  else if (typeof clearAppCaches === "function") clearAppCaches();
  return { success: true, message: "Vote deleted.", voteId: vote.VoteId };
}

function realityTvScheduleStatus_(value) {
  const key = realityTvKey_(value || "scheduled").replace(/[^a-z0-9]+/g, "-");
  const allowed = {
    scheduled: "SCHEDULED",
    delayed: "DELAYED",
    rescheduled: "RESCHEDULED",
    tba: "TBA"
  };
  if (!allowed[key]) throw new Error("Select a valid episode schedule status.");
  return allowed[key];
}

function realityTvEpisodeQuestionCategoryIds_(seasonId, episodeId) {
  if (typeof realityTvEpisodeQuestionsForSeason_ !== "function") return [];
  const seen = {};
  return realityTvEpisodeQuestionsForSeason_(seasonId)
    .filter(function(row) { return realityTvKey_(row.EpisodeId) === realityTvKey_(episodeId); })
    .map(function(row) { return realityTvString_(row.CategoryId); })
    .filter(function(categoryId) {
      const key = realityTvKey_(categoryId);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
}

function realityTvUpdateEpisodeQuestionTiming_(season, episode) {
  const categoryIds = [realityTvString_(episode.CategoryId)]
    .concat(realityTvEpisodeQuestionCategoryIds_(season.SeasonId, episode.EpisodeId))
    .filter(Boolean);
  const seen = {};
  categoryIds.forEach(function(categoryId) {
    const key = realityTvKey_(categoryId);
    if (!key || seen[key]) return;
    seen[key] = true;
    adminUpdateCategory({
      gameId: season.GameId,
      categoryId: categoryId,
      lockDateTime: episode.LockDateTime || ""
    });
  });
}

function realityTvSyncEpisodeScheduleToHub_(season, episode) {
  try {
    const hub = realityTvOpenHub_();
    if (!hub) return { success: false, skipped: true };
    const now = new Date();
    const status = realityTvKey_(episode.ScheduleStatus || episode.Status || "scheduled") === "tba"
      ? "delayed"
      : realityTvString_(episode.ScheduleStatus || episode.Status || "scheduled").toLowerCase();
    realityTvUpsertObject_(hub, "ExternalEvents", REALITY_TV_HUB_HEADERS.ExternalEvents,
      ["Provider", "ExternalEventId"], {
        Provider: "manual-reality-tv",
        ExternalEventId: episode.ExternalEventId,
        EventName: season.ShowName + " " + episode.EpisodeName,
        EventType: "reality-tv",
        StartDate: episode.AirDateTime || "",
        EndDate: episode.AirDateTime || "",
        Status: status,
        SourceUrl: "",
        LastUpdated: now,
        RawJSON: JSON.stringify({
          seasonId: season.SeasonId,
          episodeId: episode.EpisodeId,
          scheduleStatus: episode.ScheduleStatus || "SCHEDULED",
          originalAirDateTime: episode.OriginalAirDateTime || "",
          scheduleNotes: episode.ScheduleNotes || ""
        }),
        CreatedAt: now
      });
    realityTvUpsertObject_(hub, "ExternalMarkets", REALITY_TV_HUB_HEADERS.ExternalMarkets,
      ["Provider", "ExternalMarketId"], {
        Provider: "manual-reality-tv",
        ExternalMarketId: episode.ExternalMarketId,
        ExternalEventId: episode.ExternalEventId,
        ClosingTime: episode.LockDateTime || "",
        LastUpdated: now,
        RawJSON: JSON.stringify({
          seasonId: season.SeasonId,
          episodeId: episode.EpisodeId,
          scheduleStatus: episode.ScheduleStatus || "SCHEDULED"
        })
      });
    return { success: true };
  } catch (err) {
    return { success: false, warning: err && err.message ? err.message : String(err) };
  }
}

function realityTvApplyEpisodeSchedule_(season, episode, patch) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODES_SHEET);
  const oldAir = episode.AirDateTime || "";
  const changedAir = String(oldAir || "") !== String(patch.AirDateTime || "");
  const update = {
    AirDateTime: patch.AirDateTime || "",
    LockDateTime: patch.LockDateTime || "",
    ScheduleStatus: patch.ScheduleStatus || "SCHEDULED",
    ScheduleNotes: realityTvString_(patch.ScheduleNotes),
    OriginalAirDateTime: episode.OriginalAirDateTime || (changedAir ? oldAir : ""),
    UpdatedAt: new Date()
  };
  realityTvUpdateObjectRow_(sheet, episode.__rowNumber, update);
  const refreshed = realityTvGetEpisode_(episode.EpisodeId);
  realityTvUpdateEpisodeQuestionTiming_(season, refreshed);
  realityTvSyncEpisodeScheduleToHub_(season, refreshed);
  return refreshed;
}

function apiAdminUpdateRealityTvEpisodeSchedule(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const season = realityTvGetSeason_(payload.seasonId || payload.SeasonId);
  if (!season) throw new Error("Reality TV season not found.");
  const episode = realityTvGetEpisode_(payload.episodeId || payload.EpisodeId);
  if (!episode || realityTvKey_(episode.SeasonId) !== realityTvKey_(season.SeasonId)) {
    throw new Error("Episode not found for this season.");
  }
  if (realityTvKey_(episode.Status) === "final") {
    throw new Error("A finalized episode schedule cannot be changed. Reopen the episode first if a correction is required.");
  }

  const scheduleStatus = realityTvScheduleStatus_(payload.scheduleStatus || payload.ScheduleStatus);
  let airDateTime = "";
  let lockDateTime = "";
  if (scheduleStatus !== "TBA") {
    const air = realityTvDate_(payload.airDateTime || payload.AirDateTime, "Episode air date/time");
    if (!air) throw new Error("Episode air date/time is required unless the episode is marked TBA.");
    const requestedLock = realityTvString_(payload.lockDateTime || payload.LockDateTime);
    const lock = requestedLock
      ? realityTvDate_(requestedLock, "Episode lock date/time")
      : new Date(air.getTime() - (realityTvNumber_(season.LockOffsetMinutes, 5) * 60000));
    if (!lock) throw new Error("Episode lock date/time is invalid.");
    if (lock.getTime() > air.getTime()) throw new Error("The lock time cannot be after the episode air time.");
    airDateTime = air;
    lockDateTime = lock;
  }

  const oldAir = episode.AirDateTime ? new Date(episode.AirDateTime) : null;
  const newAir = airDateTime ? new Date(airDateTime) : null;
  const shiftFuture = realityTvBool_(payload.shiftFutureEpisodes || payload.ShiftFutureEpisodes);
  const deltaMs = oldAir && !Number.isNaN(oldAir.getTime()) && newAir && !Number.isNaN(newAir.getTime())
    ? newAir.getTime() - oldAir.getTime()
    : 0;

  const updated = [];
  updated.push(realityTvApplyEpisodeSchedule_(season, episode, {
    AirDateTime: airDateTime,
    LockDateTime: lockDateTime,
    ScheduleStatus: scheduleStatus,
    ScheduleNotes: payload.scheduleNotes || payload.ScheduleNotes || ""
  }));

  if (shiftFuture && deltaMs && scheduleStatus !== "TBA") {
    const seasonAnchor = season.FirstEpisodeDateTime ? new Date(season.FirstEpisodeDateTime) : null;
    if (seasonAnchor && !Number.isNaN(seasonAnchor.getTime())) {
      const seasonSheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_SEASONS_SHEET);
      realityTvUpdateObjectRow_(seasonSheet, season.__rowNumber, {
        FirstEpisodeDateTime: new Date(seasonAnchor.getTime() + deltaMs),
        UpdatedAt: new Date()
      });
    }
    realityTvEpisodesForSeason_(season.SeasonId)
      .filter(function(row) {
        return realityTvNumber_(row.EpisodeNumber, 0) > realityTvNumber_(episode.EpisodeNumber, 0) &&
          realityTvKey_(row.Status) !== "final" && row.AirDateTime;
      })
      .sort(function(a, b) { return realityTvNumber_(a.EpisodeNumber, 0) - realityTvNumber_(b.EpisodeNumber, 0); })
      .forEach(function(row) {
        const futureAir = new Date(row.AirDateTime);
        const futureLock = row.LockDateTime ? new Date(row.LockDateTime) : null;
        if (Number.isNaN(futureAir.getTime())) return;
        updated.push(realityTvApplyEpisodeSchedule_(season, row, {
          AirDateTime: new Date(futureAir.getTime() + deltaMs),
          LockDateTime: futureLock && !Number.isNaN(futureLock.getTime())
            ? new Date(futureLock.getTime() + deltaMs)
            : new Date(futureAir.getTime() + deltaMs - (realityTvNumber_(season.LockOffsetMinutes, 5) * 60000)),
          ScheduleStatus: "RESCHEDULED",
          ScheduleNotes: realityTvString_(row.ScheduleNotes || "Schedule shifted after " + episode.EpisodeName + " was rescheduled.")
        }));
      });
  }

  realityTvClearRuntimeCaches_(season.GameId, season.SeasonId);
  return {
    success: true,
    message: scheduleStatus === "TBA"
      ? episode.EpisodeName + " is marked TBA. Its questions remain in place and unlocked until a new time is saved."
      : episode.EpisodeName + " schedule updated" + (updated.length > 1 ? "; " + (updated.length - 1) + " future episode(s) shifted." : "."),
    episode: updated[0],
    updatedEpisodes: updated,
    shiftedFutureCount: Math.max(0, updated.length - 1)
  };
}

function realityTvFormatQuestion_(template, episodeNumber, season) {
  const raw = realityTvString_(template) || "Who will be eliminated in Episode {episode}?";
  return raw
    .replace(/\{episode\}/gi, String(episodeNumber))
    .replace(/\{period\}/gi, realityTvString_(season && season.PeriodLabel || "Episode"));
}

function realityTvUpdateCurrentPeriodPresentation_(season, episode) {
  if (!season || !episode) return episode;
  const periodLabel = realityTvString_(season.PeriodLabel || "Episode");
  const episodeNumber = realityTvNumber_(episode.EpisodeNumber, 1);
  const episodeName = periodLabel + " " + episodeNumber;
  const question = realityTvFormatQuestion_(season.QuestionTemplate, episodeNumber, season);

  const categoryPatch = {
    gameId: season.GameId,
    categoryId: episode.CategoryId,
    category: question,
    section: episodeName
  };
  if (realityTvKey_(episode.Status || "open") !== "final") {
    categoryPatch.points = Math.max(0, realityTvNumber_(season.Points, 1));
    categoryPatch.lockDateTime = episode.LockDateTime;
  }
  adminUpdateCategory(categoryPatch);

  const sheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODES_SHEET);
  realityTvUpdateObjectRow_(sheet, episode.__rowNumber, {
    EpisodeName: episodeName,
    UpdatedAt: new Date()
  });

  try {
    const hub = realityTvOpenHub_();
    if (hub) {
      const now = new Date();
      const active = realityTvContestantsForSeason_(season.SeasonId).filter(function(row) {
        return realityTvBool_(row.Active) && realityTvKey_(row.Status || "active") === "active";
      });
      realityTvUpsertObject_(hub, "ExternalEvents", REALITY_TV_HUB_HEADERS.ExternalEvents,
        ["Provider", "ExternalEventId"], {
          Provider: "manual-reality-tv",
          ExternalEventId: episode.ExternalEventId,
          EventName: season.ShowName + " " + episodeName,
          EventType: "reality-tv",
          StartDate: episode.AirDateTime,
          EndDate: episode.AirDateTime,
          Status: realityTvString_(episode.Status || "scheduled"),
          SourceUrl: "",
          LastUpdated: now,
          RawJSON: JSON.stringify({ seasonId: season.SeasonId, episodeId: episode.EpisodeId }),
          CreatedAt: now
        });
      realityTvUpsertObject_(hub, "ExternalMarkets", REALITY_TV_HUB_HEADERS.ExternalMarkets,
        ["Provider", "ExternalMarketId"], {
          Provider: "manual-reality-tv",
          ExternalMarketId: episode.ExternalMarketId,
          ExternalEventId: episode.ExternalEventId,
          MarketQuestion: question,
          OutcomesJSON: JSON.stringify(active.map(function(item) { return item.Name; })),
          PricesJSON: "{}",
          ClosingTime: episode.LockDateTime,
          ResolutionStatus: "pending",
          WinningOutcome: "",
          ResolutionSource: "manual-reality-tv",
          SourceUrl: "",
          LastUpdated: now,
          RawJSON: JSON.stringify({ seasonId: season.SeasonId, episodeId: episode.EpisodeId }),
          CreatedAt: now
        });
    }
  } catch (err) {
    // The main application remains authoritative. A temporary Hub problem must not block format edits.
  }

  return realityTvGetEpisode_(episode.EpisodeId) || episode;
}

function realityTvEpisodeTiming_(season, episodeNumber) {
  const first = realityTvDate_(season.FirstEpisodeDateTime, "First episode date/time");
  if (!first) throw new Error("First episode date/time is required.");
  const intervalDays = realityTvNumber_(season.WeeklyIntervalDays, 7);
  const air = new Date(first.getTime() + ((episodeNumber - 1) * intervalDays * 86400000));
  const lock = new Date(air.getTime() - (realityTvNumber_(season.LockOffsetMinutes, 5) * 60000));
  return { airDateTime: air, lockDateTime: lock };
}

function realityTvCreateEpisode_(season, episodeNumber, options) {
  options = options || {};
  const ss = SpreadsheetApp.getActive();
  const existing = realityTvEpisodesForSeason_(season.SeasonId).find(function(row) {
    return realityTvNumber_(row.EpisodeNumber, 0) === episodeNumber;
  });
  if (existing && !options.repair) return existing;

  realityTvEnsureContestantGroupHistory_(season);
  const eligibleContestants = realityTvContestantsEligibleForEpisode_(season.SeasonId, episodeNumber);
  if (eligibleContestants.length < 2) {
    throw new Error("At least two eligible " + realityTvString_(season.ParticipantLabel || "participants").toLowerCase() + "s are required to create or repair " + realityTvString_(season.PeriodLabel || "period").toLowerCase() + " " + episodeNumber + ".");
  }

  const categoryId = existing && existing.CategoryId ? existing.CategoryId : "episode-" + episodeNumber + "-eliminated";
  const setup = adminGetGameSetup({ gameId: season.GameId });
  const existingCategory = (setup.categories || []).find(function(item) {
    return realityTvKey_(item.categoryId || item.id) === realityTvKey_(categoryId);
  }) || null;
  const calculatedTiming = realityTvEpisodeTiming_(season, episodeNumber);
  const timing = {
    airDateTime: existing && existing.AirDateTime
      ? existing.AirDateTime
      : (existingCategory && (existingCategory.airDateTime || existingCategory.AirDateTime)) || calculatedTiming.airDateTime,
    lockDateTime: existing && existing.LockDateTime
      ? existing.LockDateTime
      : (existingCategory && (existingCategory.lockDateTime || existingCategory.LockDateTime)) || calculatedTiming.lockDateTime
  };
  const externalEventId = existing && existing.ExternalEventId ? existing.ExternalEventId : season.GameId + "-episode-" + episodeNumber;
  const externalMarketId = existing && existing.ExternalMarketId ? existing.ExternalMarketId : season.GameId + "-episode-" + episodeNumber + "-elimination";
  const periodLabel = realityTvString_(season.PeriodLabel || "Episode");
  const question = realityTvFormatQuestion_(season.QuestionTemplate, episodeNumber, season);
  const groupAssignments = realityTvGroupAssignmentsForEpisode_(season.SeasonId, episodeNumber);
  const groups = realityTvGroupsForSeason_(season.SeasonId);
  const groupByName = {};
  groups.forEach(function(group) { groupByName[realityTvKey_(group.GroupName)] = group; });
  const eliminationImageSource = typeof realityTvNormalizeImageSource_ === "function" ? realityTvNormalizeImageSource_(season.EliminationImageSource || "roster") : realityTvKey_(season.EliminationImageSource || "roster");
  const eliminationAnswers = eligibleContestants.map(function(contestant) {
    const assignment = groupAssignments[realityTvKey_(contestant.ContestantId)] || {};
    const groupName = realityTvString_(assignment.GroupName || contestant.TeamOrTribe);
    const group = groupByName[realityTvKey_(groupName)] || {};
    let imageUrl = contestant.ImageUrl || "";
    if (eliminationImageSource === "group") imageUrl = group.ImageUrl || "";
    if (eliminationImageSource === "none") imageUrl = "";
    return { contestant: contestant, assignment: assignment, groupName: groupName, group: group, imageUrl: imageUrl };
  });
  const eliminationLayout = typeof realityTvResolvedQuestionLayout_ === "function"
    ? realityTvResolvedQuestionLayout_({ LayoutType: season.EliminationLayoutType || "auto" }, eliminationAnswers.map(function(item) { return { imageUrl: item.imageUrl }; }))
    : realityTvString_(season.EliminationLayoutType || "image");

  let category = (setup.categories || []).find(function(item) {
    return realityTvKey_(item.categoryId) === realityTvKey_(categoryId);
  });

  if (!category) {
    adminCreateCategory({
      gameId: season.GameId,
      category: question,
      categoryId: categoryId,
      section: periodLabel + " " + episodeNumber,
      points: realityTvNumber_(season.Points, 1),
      maxChanges: realityTvPickRules_(season).maxChanges,
      changePenalty: realityTvPickRules_(season).changePenalty,
      locked: false,
      lockDateTime: timing.lockDateTime,
      displayOrder: episodeNumber,
      groupId: "reality-tv-eliminations",
      layoutType: eliminationLayout,
      shortName: periodLabel + " " + episodeNumber,
      countsAsStatue: false,
      questionType: "reality-elimination",
      scoringEngine: "manual",
      selectionMode: "single",
      scoreMode: "fixed-points",
      oddsMode: "none",
      resultSource: "external-results-hub",
      settlementStatus: "pending",
      maxSelections: 1,
      minSelections: 1,
      allowDraw: false,
      allowPush: true,
      resultSourceType: "reality-tv",
      resultProvider: "manual-reality-tv",
      externalEventId: externalEventId,
      externalMarketId: externalMarketId,
      statKey: "eliminated",
      autoSettle: false,
      requireAdminReview: true,
      sourceConfigJSON: JSON.stringify({ seasonId: season.SeasonId, episodeNumber: episodeNumber })
    });
  }

  const refreshedSetup = adminGetGameSetup({ gameId: season.GameId });
  category = (refreshedSetup.categories || []).find(function(item) {
    return realityTvKey_(item.categoryId) === realityTvKey_(categoryId);
  });
  if (!category) throw new Error("Episode question could not be created: " + categoryId + ".");
  adminUpdateCategory({
    gameId: season.GameId,
    categoryId: categoryId,
    category: question,
    points: realityTvNumber_(season.Points, 1),
    maxChanges: realityTvPickRules_(season).maxChanges,
    changePenalty: realityTvPickRules_(season).changePenalty,
    lockDateTime: timing.lockDateTime,
    layoutType: eliminationLayout
  });

  const existingNomineeIds = {};
  (category.nominees || []).forEach(function(item) {
    existingNomineeIds[realityTvKey_(item.nomineeId)] = true;
  });
  const missingContestants = eligibleContestants.filter(function(contestant) {
    return !existingNomineeIds[realityTvKey_(contestant.ContestantId)];
  });

  if (missingContestants.length) {
    adminBulkCreateNominees({
      gameId: season.GameId,
      categoryId: categoryId,
      category: question,
      section: periodLabel + " " + episodeNumber,
      itemsJSON: JSON.stringify(missingContestants.map(function(contestant) {
        const answer = eliminationAnswers.find(function(item) { return realityTvKey_(item.contestant.ContestantId) === realityTvKey_(contestant.ContestantId); }) || {};
        const profile = realityTvContestantGroupProfile_(season.SeasonId, contestant.ContestantId);
        return {
          nominee: contestant.Name,
          nomineeId: contestant.ContestantId,
          shortAnswer: contestant.Name,
          fileId: "",
          logoUrl: answer.imageUrl || "",
          person: contestant.FullName || contestant.Name,
          metadataJSON: JSON.stringify({
            fullName: contestant.FullName || contestant.Name,
            teamOrTribe: answer.groupName || "",
            startingGroup: profile.startingGroup || "",
            currentGroup: profile.currentGroup || "",
            finalGroup: profile.finalGroup || "",
            groupHistory: profile.history || [],
            teamColor: contestant.TeamColor || (answer.group || {}).Color || "",
            age: contestant.Age || "",
            hometown: contestant.Hometown || "",
            occupation: contestant.Occupation || "",
            biography: contestant.Biography || "",
            member1: contestant.Member1 || "",
            member2: contestant.Member2 || "",
            relationship: contestant.Relationship || "",
            status: contestant.Status || "ACTIVE",
            eliminatedEpisode: contestant.EliminatedEpisode || ""
          }),
          active: true
        };
      }))
    });
  }

  const now = new Date();
  const episode = {
    SeasonId: season.SeasonId,
    GameId: season.GameId,
    EpisodeId: existing && existing.EpisodeId ? existing.EpisodeId : season.SeasonId + "-episode-" + episodeNumber,
    EpisodeNumber: episodeNumber,
    EpisodeName: existing && existing.EpisodeName ? existing.EpisodeName : periodLabel + " " + episodeNumber,
    AirDateTime: timing.airDateTime,
    LockDateTime: timing.lockDateTime,
    CategoryId: categoryId,
    ExternalEventId: externalEventId,
    ExternalMarketId: externalMarketId,
    OutcomeType: existing && existing.OutcomeType ? existing.OutcomeType : "elimination",
    Status: existing && existing.Status ? existing.Status : "OPEN",
    EliminatedContestantIds: existing && existing.EliminatedContestantIds ? existing.EliminatedContestantIds : "",
    ResultQueueId: existing && existing.ResultQueueId ? existing.ResultQueueId : "",
    NextEpisodeCreated: existing && existing.NextEpisodeCreated !== "" ? existing.NextEpisodeCreated : false,
    ScheduleStatus: existing && existing.ScheduleStatus ? existing.ScheduleStatus : "SCHEDULED",
    OriginalAirDateTime: existing && existing.OriginalAirDateTime ? existing.OriginalAirDateTime : "",
    ScheduleNotes: existing && existing.ScheduleNotes ? existing.ScheduleNotes : "",
    CreatedAt: existing && existing.CreatedAt ? existing.CreatedAt : now,
    UpdatedAt: now
  };
  realityTvUpsertObject_(ss, REALITY_TV_EPISODES_SHEET, REALITY_TV_EPISODE_HEADERS, ["EpisodeId"], episode);

  const seasonSheet = ss.getSheetByName(REALITY_TV_SEASONS_SHEET);
  realityTvUpdateObjectRow_(seasonSheet, season.__rowNumber || realityTvGetSeason_(season.SeasonId).__rowNumber, {
    CurrentEpisodeNumber: Math.max(realityTvNumber_(season.CurrentEpisodeNumber, 1), episodeNumber),
    UpdatedAt: now
  });

  if (!options.skipHubSync) {
    realityTvSyncEpisodeToHub_(season, episode, eligibleContestants, question);
  }
  if (!options.skipQuestionPack && typeof realityTvStartQuestionPackBuild_ === "function") {
    const enabledTypes = realityTvQuestionTemplatesForSeason_(season.SeasonId)
      .filter(function(row) { return realityTvBool_(row.Enabled); })
      .map(function(row) { return row.TemplateId; });
    if (enabledTypes.length) {
      episode.questionBuild = realityTvStartQuestionPackBuild_(season, episode, enabledTypes);
      if (episode.questionBuild && !episode.questionBuild.complete && typeof realityTvAdvanceQuestionPackBuild_ === "function") {
        episode.questionBuild = realityTvAdvanceQuestionPackBuild_(episode.questionBuild, Math.max(2, enabledTypes.length + 1), 18000);
      }
    }
  }
  episode.repaired = !!options.repair;
  episode.answerCount = eligibleContestants.length;
  return episode;
}

function realityTvSyncEpisodeToHub_(season, episode, contestants, question) {
  try {
    const hub = realityTvOpenHub_();
    if (!hub) return { success: false, skipped: true, message: "External Results Hub is not configured." };
    const now = new Date();

    realityTvUpsertObject_(hub, "ExternalEvents", REALITY_TV_HUB_HEADERS.ExternalEvents,
      ["Provider", "ExternalEventId"], {
        Provider: "manual-reality-tv",
        ExternalEventId: episode.ExternalEventId,
        EventName: season.ShowName + " " + episode.EpisodeName,
        EventType: "reality-tv",
        StartDate: episode.AirDateTime,
        EndDate: episode.AirDateTime,
        Status: "scheduled",
        SourceUrl: "",
        LastUpdated: now,
        RawJSON: JSON.stringify({ seasonId: season.SeasonId, episodeId: episode.EpisodeId }),
        CreatedAt: now
      });

    realityTvUpsertObject_(hub, "ExternalMarkets", REALITY_TV_HUB_HEADERS.ExternalMarkets,
      ["Provider", "ExternalMarketId"], {
        Provider: "manual-reality-tv",
        ExternalMarketId: episode.ExternalMarketId,
        ExternalEventId: episode.ExternalEventId,
        MarketQuestion: question,
        OutcomesJSON: JSON.stringify(contestants.map(function(item) { return item.Name; })),
        PricesJSON: "{}",
        ClosingTime: episode.LockDateTime,
        ResolutionStatus: "pending",
        WinningOutcome: "",
        ResolutionSource: "manual-reality-tv",
        SourceUrl: "",
        LastUpdated: now,
        RawJSON: JSON.stringify({ seasonId: season.SeasonId, episodeId: episode.EpisodeId }),
        CreatedAt: now
      });

    const subjectRows = contestants.map(function(contestant) {
      const assignment = realityTvGroupAssignmentForEpisode_(season.SeasonId, contestant.ContestantId, episode.EpisodeNumber);
      const profile = realityTvContestantGroupProfile_(season.SeasonId, contestant.ContestantId);
      return {
        Provider: "manual-reality-tv",
        ExternalSubjectId: contestant.ExternalSubjectId || contestant.ContestantId,
        Name: contestant.Name,
        SubjectType: realityTvKey_(season.ParticipantType) === "team" ? "team" : "contestant",
        ImageUrl: contestant.ImageUrl || "",
        MetadataJSON: JSON.stringify({
          fullName: contestant.FullName || "",
          teamOrTribe: realityTvString_((assignment || {}).GroupName || contestant.TeamOrTribe),
          startingGroup: profile.startingGroup || "",
          currentGroup: profile.currentGroup || "",
          finalGroup: profile.finalGroup || "",
          groupHistory: profile.history || [],
          age: contestant.Age || "",
          hometown: contestant.Hometown || "",
          occupation: contestant.Occupation || "",
          member1: contestant.Member1 || "",
          member2: contestant.Member2 || "",
          relationship: contestant.Relationship || "",
          teamColor: contestant.TeamColor || ""
        }),
        SourceUrl: "",
        LastUpdated: now,
        CreatedAt: now
      };
    });
    const mappingRows = contestants.map(function(contestant) {
      return {
        MappingId: season.GameId + "-" + episode.CategoryId + "-" + contestant.ContestantId,
        AppGameId: season.GameId,
        CategoryId: episode.CategoryId,
        NomineeId: contestant.ContestantId,
        Provider: "manual-reality-tv",
        ExternalEventId: episode.ExternalEventId,
        ExternalMarketId: episode.ExternalMarketId,
        ExternalSubjectId: contestant.ExternalSubjectId || contestant.ContestantId,
        ResultKey: "eliminated",
        ComparisonOperator: "eq",
        Threshold: "",
        ExpectedOutcome: contestant.Name,
        AutoSettle: false,
        RequireAdminReview: true,
        SourceUrl: "",
        SourceConfigJSON: JSON.stringify({ seasonId: season.SeasonId, episodeId: episode.EpisodeId }),
        Active: true,
        CreatedAt: now,
        UpdatedAt: now
      };
    });

    realityTvBulkUpsertObjects_(hub, "ExternalSubjects", REALITY_TV_HUB_HEADERS.ExternalSubjects,
      ["Provider", "ExternalSubjectId"], subjectRows);
    realityTvBulkUpsertObjects_(hub, "AppMappings", REALITY_TV_HUB_HEADERS.AppMappings,
      ["MappingId"], mappingRows);
    return { success: true };
  } catch (err) {
    return { success: false, skipped: true, error: err.message };
  }
}

function realityTvCreateHubPendingResult_(season, episode, selectedContestants, outcomeType, evidenceUrl, notes) {
  try {
    const hub = realityTvOpenHub_();
      if (!hub) return { importedResultId: "", reviewId: "", skipped: true };
      const now = new Date();
      const names = selectedContestants.map(function(item) { return item.Name; });
      const resultValue = outcomeType === "no-elimination" ? "NO ELIMINATION" : names.join(", ");
      const importedResultId = realityTvId_("rt-result");
      const reviewId = realityTvId_("rt-review");
      const fingerprint = ["manual-reality-tv", episode.ExternalEventId, episode.ExternalMarketId, resultValue].join("|").toLowerCase();
    
      realityTvAppendObject_(realityTvGetOrCreateSheet_(hub, "ImportedResults", REALITY_TV_HUB_HEADERS.ImportedResults), {
        ImportedResultId: importedResultId,
        Provider: "manual-reality-tv",
        ExternalEventId: episode.ExternalEventId,
        ExternalMarketId: episode.ExternalMarketId,
        ResultKey: "eliminated",
        ResultValue: resultValue,
        Finality: "FINAL",
        WinningOutcome: resultValue,
        ProviderTimestamp: now,
        ImportedAt: now,
        EvidenceUrl: evidenceUrl || "",
        SourceUrl: evidenceUrl || "",
        RawJSON: JSON.stringify({ seasonId: season.SeasonId, episodeId: episode.EpisodeId, outcomeType: outcomeType }),
        ReviewStatus: "PENDING",
        ReviewRequired: true,
        SourceFingerprint: fingerprint,
        CreatedAt: now,
        UpdatedAt: now
      });
    
      realityTvAppendObject_(realityTvGetOrCreateSheet_(hub, "ReviewQueue", REALITY_TV_HUB_HEADERS.ReviewQueue), {
        ReviewId: reviewId,
        ImportedResultId: importedResultId,
        Provider: "manual-reality-tv",
        ExternalEventId: episode.ExternalEventId,
        ExternalMarketId: episode.ExternalMarketId,
        ResultKey: "eliminated",
        ResultValue: resultValue,
        Finality: "FINAL",
        WinningOutcome: resultValue,
        EvidenceUrl: evidenceUrl || "",
        ReviewStatus: "PENDING",
        ReviewedBy: "",
        ReviewedAt: "",
        ReviewNotes: notes || "",
        PushStatus: "NOT PUSHED",
        PushedAt: "",
        PushMessage: "Waiting for Reality TV Season Manager approval.",
        CreatedAt: now,
        UpdatedAt: now
      });
      return { importedResultId: importedResultId, reviewId: reviewId };
  } catch (err) {
    return { importedResultId: "", reviewId: "", skipped: true, error: err.message };
  }
}

function realityTvUpdateHubReview_(queue, reviewStatus, reviewer, message) {
  try {
    const hub = realityTvOpenHub_();
      if (!hub || !queue.HubReviewId) return;
      const now = new Date();
      const reviewRows = realityTvReadObjects_(hub, "ReviewQueue");
      const review = reviewRows.find(function(row) { return realityTvKey_(row.ReviewId) === realityTvKey_(queue.HubReviewId); });
      if (review) {
        realityTvUpdateObjectRow_(hub.getSheetByName("ReviewQueue"), review.__rowNumber, {
          ReviewStatus: reviewStatus,
          ReviewedBy: reviewer || "",
          ReviewedAt: now,
          PushStatus: reviewStatus === "APPROVED" ? "PUSHED" : "NOT PUSHED",
          PushedAt: reviewStatus === "APPROVED" ? now : "",
          PushMessage: message || "",
          UpdatedAt: now
        });
      }
      const importedRows = realityTvReadObjects_(hub, "ImportedResults");
      const imported = importedRows.find(function(row) { return realityTvKey_(row.ImportedResultId) === realityTvKey_(queue.HubImportedResultId); });
      if (imported) {
        realityTvUpdateObjectRow_(hub.getSheetByName("ImportedResults"), imported.__rowNumber, {
          ReviewStatus: reviewStatus,
          UpdatedAt: now
        });
      }
  } catch (err) {
    return { success: false, skipped: true, error: err.message };
  }
}


function realityTvNormalizeColor_(value, fallback) {
  const text = realityTvString_(value);
  if (/^#[0-9a-f]{6}$/i.test(text)) return text.toUpperCase();
  if (/^[0-9a-f]{6}$/i.test(text)) return ("#" + text).toUpperCase();
  return fallback || "#64748B";
}

function realityTvGroupsForSeason_(seasonId) {
  realityTvEnsureSystem_();
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_GROUPS_SHEET)
    .filter(function(row) { return realityTvKey_(row.SeasonId) === realityTvKey_(seasonId); })
    .sort(function(a, b) {
      return realityTvNumber_(a.DisplayOrder, 999) - realityTvNumber_(b.DisplayOrder, 999) ||
        realityTvString_(a.GroupName).localeCompare(realityTvString_(b.GroupName));
    });
}

function realityTvSyncGroupsFromContestants_(seasonOrId) {
  const season = typeof seasonOrId === "object" ? seasonOrId : realityTvGetSeason_(seasonOrId);
  if (!season) return [];
  realityTvEnsureSystem_();
  const current = realityTvGroupsForSeason_(season.SeasonId);
  const currentByName = {};
  current.forEach(function(row) { currentByName[realityTvKey_(row.GroupName)] = row; });
  const derived = {};
  realityTvContestantsForSeason_(season.SeasonId).forEach(function(contestant) {
    const name = realityTvString_(contestant.TeamOrTribe);
    if (!name) return;
    const key = realityTvKey_(name);
    if (!derived[key]) derived[key] = { name: name, color: "", imageUrl: "" };
    if (!derived[key].color && contestant.TeamColor) derived[key].color = contestant.TeamColor;
  });
  const now = new Date();
  const groupPrefix = realityTvKey_(season.ShowFormat) === "survivor-tribal" ? "tribe" : "group";
  Object.keys(derived).sort().forEach(function(key, index) {
    const prior = currentByName[key] || {};
    realityTvUpsertObject_(SpreadsheetApp.getActive(), REALITY_TV_GROUPS_SHEET, REALITY_TV_GROUP_HEADERS,
      ["SeasonId", "GroupId"], {
        SeasonId: season.SeasonId,
        GameId: season.GameId,
        GroupId: prior.GroupId || groupPrefix + "-" + realityTvSlug_(derived[key].name),
        GroupName: derived[key].name,
        GroupType: realityTvString_(season.GroupLabel || "Group"),
        ImageUrl: prior.ImageUrl || derived[key].imageUrl || "",
        Color: realityTvNormalizeColor_(prior.Color || derived[key].color, "#64748B"),
        Active: prior.Active === "" || prior.Active === undefined ? true : realityTvBool_(prior.Active),
        DisplayOrder: prior.DisplayOrder || (index + 1),
        CreatedAt: prior.CreatedAt || now,
        UpdatedAt: now
      });
  });
  return realityTvGroupsForSeason_(season.SeasonId);
}

function apiAdminSaveRealityTvGroups(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");
  const groups = realityTvParseJson_(payload.groupsJSON || payload.groups || [], []);
  if (!Array.isArray(groups)) throw new Error("Groups must be an array.");
  const now = new Date();
  const existing = realityTvGroupsForSeason_(season.SeasonId);
  const existingById = {};
  existing.forEach(function(row) { existingById[realityTvKey_(row.GroupId)] = row; });
  groups.forEach(function(item, index) {
    item = item || {};
    const name = realityTvString_(item.groupName || item.GroupName);
    if (!name) return;
    const groupPrefix = realityTvKey_(season.ShowFormat) === "survivor-tribal" ? "tribe" : "group";
    const id = realityTvString_(item.groupId || item.GroupId || (groupPrefix + "-" + realityTvSlug_(name)));
    const prior = existingById[realityTvKey_(id)] || {};
    realityTvUpsertObject_(SpreadsheetApp.getActive(), REALITY_TV_GROUPS_SHEET, REALITY_TV_GROUP_HEADERS,
      ["SeasonId", "GroupId"], {
        SeasonId: season.SeasonId,
        GameId: season.GameId,
        GroupId: id,
        GroupName: name,
        GroupType: realityTvString_(item.groupType || item.GroupType || season.GroupLabel || "Group"),
        ImageUrl: realityTvString_(item.imageUrl || item.ImageUrl),
        Color: realityTvNormalizeColor_(item.color || item.Color, "#64748B"),
        Active: item.active === undefined ? true : realityTvBool_(item.active),
        DisplayOrder: realityTvNumber_(item.displayOrder || item.DisplayOrder, index + 1),
        CreatedAt: prior.CreatedAt || now,
        UpdatedAt: now
      });
  });
  return { success: true, message: "Group / team display settings saved.", groups: realityTvGroupsForSeason_(season.SeasonId) };
}


function realityTvGroupHistoryForSeason_(seasonId) {
  realityTvEnsureSystem_();
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_GROUP_HISTORY_SHEET)
    .filter(function(row) { return realityTvKey_(row.SeasonId) === realityTvKey_(seasonId); })
    .sort(function(a, b) {
      const contestantDiff = realityTvString_(a.ContestantId).localeCompare(realityTvString_(b.ContestantId));
      if (contestantDiff) return contestantDiff;
      return realityTvNumber_(a.StartEpisode, 1) - realityTvNumber_(b.StartEpisode, 1);
    });
}

function realityTvGroupHistoryForContestant_(seasonId, contestantId) {
  return realityTvGroupHistoryForSeason_(seasonId).filter(function(row) {
    return realityTvKey_(row.ContestantId) === realityTvKey_(contestantId);
  });
}

function realityTvGroupAssignmentForEpisode_(seasonId, contestantId, episodeNumber) {
  const episode = Math.max(1, realityTvNumber_(episodeNumber, 1));
  const matches = realityTvGroupHistoryForContestant_(seasonId, contestantId).filter(function(row) {
    const start = Math.max(1, realityTvNumber_(row.StartEpisode, 1));
    const end = realityTvNumber_(row.EndEpisode, 0);
    return start <= episode && (!end || end >= episode);
  });
  return matches.length ? matches[matches.length - 1] : null;
}

function realityTvContestantGroupProfile_(seasonId, contestantId) {
  const history = realityTvGroupHistoryForContestant_(seasonId, contestantId);
  const named = history.filter(function(row) { return realityTvString_(row.GroupName); });
  const season = realityTvGetSeason_(seasonId) || {};
  const currentEpisode = Math.max(1, realityTvNumber_(season.CurrentEpisodeNumber, 1));
  const current = named.filter(function(row) {
    const start = Math.max(1, realityTvNumber_(row.StartEpisode, 1));
    const end = realityTvNumber_(row.EndEpisode, 0);
    return start <= currentEpisode && (!end || end >= currentEpisode);
  }).slice(-1)[0] || (named.length ? named[named.length - 1] : null);
  const starting = named.length ? named[0] : null;
  const finalAssignment = named.length ? named[named.length - 1] : null;
  return {
    startingGroup: starting ? realityTvString_(starting.GroupName) : "",
    currentGroup: current ? realityTvString_(current.GroupName) : "",
    finalGroup: finalAssignment ? realityTvString_(finalAssignment.GroupName) : "",
    history: named.map(function(row) {
      return {
        assignmentId: realityTvString_(row.AssignmentId),
        groupId: realityTvString_(row.GroupId),
        groupName: realityTvString_(row.GroupName),
        startEpisode: Math.max(1, realityTvNumber_(row.StartEpisode, 1)),
        endEpisode: realityTvNumber_(row.EndEpisode, 0),
        assignmentType: realityTvString_(row.AssignmentType || "ASSIGNED"),
        notes: realityTvString_(row.Notes),
        active: realityTvBool_(row.Active)
      };
    })
  };
}

function realityTvEnsureContestantGroupHistory_(season, contestants) {
  if (!season) return [];
  realityTvEnsureSystem_();
  const rows = Array.isArray(contestants) ? contestants : realityTvContestantsForSeason_(season.SeasonId);
  const existing = realityTvGroupHistoryForSeason_(season.SeasonId);
  const existingByContestant = {};
  existing.forEach(function(row) {
    existingByContestant[realityTvKey_(row.ContestantId)] = true;
  });
  const now = new Date();
  const additions = [];
  rows.forEach(function(contestant) {
    const contestantId = realityTvString_(contestant.ContestantId);
    const groupName = realityTvString_(contestant.TeamOrTribe || contestant.CurrentGroup || contestant.StartingGroup);
    if (!contestantId || !groupName || existingByContestant[realityTvKey_(contestantId)]) return;
    const groups = realityTvGroupsForSeason_(season.SeasonId);
    const group = groups.find(function(item) { return realityTvKey_(item.GroupName) === realityTvKey_(groupName); }) || {};
    additions.push({
      AssignmentId: season.SeasonId + "-" + contestantId + "-episode-1-" + realityTvSlug_(groupName),
      SeasonId: season.SeasonId,
      GameId: season.GameId,
      ContestantId: contestantId,
      GroupId: realityTvString_(group.GroupId || ("group-" + realityTvSlug_(groupName))),
      GroupName: groupName,
      StartEpisode: 1,
      EndEpisode: "",
      AssignmentType: "STARTING",
      Notes: "Imported from the initial roster.",
      Active: true,
      CreatedAt: now,
      UpdatedAt: now
    });
  });
  if (additions.length) {
    realityTvBulkUpsertObjects_(SpreadsheetApp.getActive(), REALITY_TV_GROUP_HISTORY_SHEET,
      REALITY_TV_GROUP_HISTORY_HEADERS, ["AssignmentId"], additions);
  }
  return realityTvGroupHistoryForSeason_(season.SeasonId);
}

function realityTvContestantsEligibleForEpisode_(seasonId, episodeNumber) {
  const episode = Math.max(1, realityTvNumber_(episodeNumber, 1));
  return realityTvContestantsForSeason_(seasonId).filter(function(row) {
    const eliminated = realityTvNumber_(row.EliminatedEpisode, 0);
    const status = realityTvKey_(row.Status || "active");
    if (eliminated && eliminated < episode) return false;
    if (["withdrawn", "quit", "disqualified"].indexOf(status) !== -1 && (!eliminated || eliminated < episode)) return false;
    return true;
  });
}

function realityTvGroupAssignmentsForEpisode_(seasonId, episodeNumber) {
  const season = realityTvGetSeason_(seasonId);
  if (!season) return {};
  realityTvEnsureContestantGroupHistory_(season);
  const assignments = {};
  realityTvContestantsEligibleForEpisode_(seasonId, episodeNumber).forEach(function(contestant) {
    const assignment = realityTvGroupAssignmentForEpisode_(seasonId, contestant.ContestantId, episodeNumber);
    const fallbackName = realityTvString_(contestant.TeamOrTribe || contestant.CurrentGroup || contestant.StartingGroup);
    assignments[realityTvKey_(contestant.ContestantId)] = assignment || {
      ContestantId: contestant.ContestantId,
      GroupId: fallbackName ? "group-" + realityTvSlug_(fallbackName) : "",
      GroupName: fallbackName,
      StartEpisode: 1,
      EndEpisode: "",
      Active: true
    };
  });
  return assignments;
}

function apiAdminUpdateRealityTvContestantGroup(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");
  const contestantId = realityTvString_(payload.contestantId);
  const groupName = realityTvString_(payload.groupName);
  const effectiveEpisode = Math.max(1, realityTvNumber_(payload.effectiveEpisode, realityTvNumber_(season.CurrentEpisodeNumber, 1)));
  if (!contestantId) throw new Error("Contestant is required.");
  if (!groupName) throw new Error("New group / tribe is required.");
  const contestant = realityTvContestantsForSeason_(season.SeasonId).find(function(row) {
    return realityTvKey_(row.ContestantId) === realityTvKey_(contestantId);
  });
  if (!contestant) throw new Error("Contestant was not found.");

  let groups = realityTvGroupsForSeason_(season.SeasonId);
  let group = groups.find(function(row) { return realityTvKey_(row.GroupName) === realityTvKey_(groupName); });
  if (!group) {
    const now = new Date();
    group = {
      SeasonId: season.SeasonId,
      GameId: season.GameId,
      GroupId: (realityTvKey_(season.ShowFormat) === "survivor-tribal" ? "tribe-" : "group-") + realityTvSlug_(groupName),
      GroupName: groupName,
      GroupType: realityTvString_(season.GroupLabel || "Group"),
      ImageUrl: "",
      Color: "#64748B",
      Active: true,
      DisplayOrder: groups.length + 1,
      CreatedAt: now,
      UpdatedAt: now
    };
    realityTvUpsertObject_(SpreadsheetApp.getActive(), REALITY_TV_GROUPS_SHEET, REALITY_TV_GROUP_HEADERS,
      ["SeasonId", "GroupId"], group);
  }

  realityTvEnsureContestantGroupHistory_(season, [contestant]);
  const historySheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_GROUP_HISTORY_SHEET);
  const history = realityTvGroupHistoryForContestant_(season.SeasonId, contestantId);
  const now = new Date();
  history.forEach(function(row) {
    const start = Math.max(1, realityTvNumber_(row.StartEpisode, 1));
    const end = realityTvNumber_(row.EndEpisode, 0);
    if (start < effectiveEpisode && (!end || end >= effectiveEpisode)) {
      realityTvUpdateObjectRow_(historySheet, row.__rowNumber, {
        EndEpisode: effectiveEpisode - 1,
        Active: false,
        UpdatedAt: now
      });
    }
  });
  const refreshedHistory = realityTvGroupHistoryForContestant_(season.SeasonId, contestantId);
  const sameStart = refreshedHistory.find(function(row) {
    return realityTvNumber_(row.StartEpisode, 0) === effectiveEpisode;
  });
  const nextFuture = refreshedHistory.filter(function(row) {
    return realityTvNumber_(row.StartEpisode, 0) > effectiveEpisode;
  }).sort(function(a, b) { return realityTvNumber_(a.StartEpisode, 0) - realityTvNumber_(b.StartEpisode, 0); })[0] || null;
  const assignmentEnd = nextFuture
    ? Math.max(effectiveEpisode, realityTvNumber_(nextFuture.StartEpisode, effectiveEpisode + 1) - 1)
    : "";
  if (sameStart) {
    realityTvUpdateObjectRow_(historySheet, sameStart.__rowNumber, {
      GroupId: group.GroupId,
      GroupName: groupName,
      AssignmentType: realityTvString_(payload.assignmentType || (effectiveEpisode === 1 ? "STARTING" : "SWAP")),
      Notes: realityTvString_(payload.notes),
      EndEpisode: assignmentEnd,
      Active: !nextFuture,
      UpdatedAt: now
    });
  } else {
    realityTvAppendObject_(historySheet, {
      AssignmentId: season.SeasonId + "-" + contestantId + "-episode-" + effectiveEpisode + "-" + realityTvSlug_(groupName),
      SeasonId: season.SeasonId,
      GameId: season.GameId,
      ContestantId: contestantId,
      GroupId: group.GroupId,
      GroupName: groupName,
      StartEpisode: effectiveEpisode,
      EndEpisode: assignmentEnd,
      AssignmentType: realityTvString_(payload.assignmentType || (effectiveEpisode === 1 ? "STARTING" : "SWAP")),
      Notes: realityTvString_(payload.notes),
      Active: !nextFuture,
      CreatedAt: now,
      UpdatedAt: now
    });
  }
  const profile = realityTvContestantGroupProfile_(season.SeasonId, contestantId);
  realityTvUpdateObjectRow_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_CONTESTANTS_SHEET), contestant.__rowNumber, {
    TeamOrTribe: profile.currentGroup || groupName,
    StartingGroup: profile.startingGroup,
    CurrentGroup: profile.currentGroup || groupName,
    FinalGroup: profile.finalGroup || groupName,
    UpdatedAt: now
  });
  return {
    success: true,
    message: contestant.Name + " will be shown with " + groupName + " beginning in " + realityTvString_(season.PeriodLabel || "Episode") + " " + effectiveEpisode + ". Historical questions were not changed.",
    contestantId: contestantId,
    groupProfile: realityTvContestantGroupProfile_(season.SeasonId, contestantId)
  };
}


function realityTvEpisodeStatsCategoryMap_(season, episodes, episodeQuestions) {
  const map = {};
  (episodes || []).forEach(function(episode) {
    const number = realityTvNumber_(episode.EpisodeNumber !== undefined ? episode.EpisodeNumber : episode.episodeNumber, 0);
    const categoryId = realityTvKey_(episode.CategoryId !== undefined ? episode.CategoryId : episode.categoryId);
    if (!number || !categoryId) return;
    if (!map[number]) map[number] = [];
    if (map[number].indexOf(categoryId) === -1) map[number].push(categoryId);
  });
  (episodeQuestions || []).forEach(function(question) {
    const number = realityTvNumber_(question.EpisodeNumber !== undefined ? question.EpisodeNumber : question.episodeNumber, 0);
    const categoryId = realityTvKey_(question.CategoryId !== undefined ? question.CategoryId : question.categoryId);
    if (!number || !categoryId) return;
    if (!map[number]) map[number] = [];
    if (map[number].indexOf(categoryId) === -1) map[number].push(categoryId);
  });
  return map;
}

function realityTvRankScoreRows_(rows, field) {
  rows.sort(function(a, b) {
    const difference = realityTvNumber_(b[field], 0) - realityTvNumber_(a[field], 0);
    if (difference) return difference;
    return realityTvString_(a.username).localeCompare(realityTvString_(b.username));
  });
  let lastScore = null;
  let rank = 0;
  rows.forEach(function(row, index) {
    const score = realityTvNumber_(row[field], 0);
    if (lastScore === null || score !== lastScore) rank = index + 1;
    row.rank = rank;
    lastScore = score;
  });
  return rows;
}

function realityTvScoreEpisodeQuestionForUser_(game, config, resolution, pick) {
  if (!resolution || !resolution.resolved || resolution.result !== "winner") {
    return { points: 0, correct: 0, settled: 0 };
  }
  const scoreMode = typeof normalizeCategoryScoreMode_ === "function"
    ? normalizeCategoryScoreMode_(config.scoreMode)
    : realityTvKey_(config.scoreMode || "correct-pick");
  if (["wager", "ranking", "staked-points"].indexOf(scoreMode) !== -1) {
    return { points: 0, correct: 0, settled: 0 };
  }
  const settled = 1;
  if (!pick) return { points: 0, correct: 0, settled: settled };
  const winnerNomineeIds = Array.isArray(resolution.winnerNomineeIds) && resolution.winnerNomineeIds.length
    ? resolution.winnerNomineeIds.map(realityTvKey_).filter(Boolean)
    : [realityTvKey_(resolution.winnerNomineeId)].filter(Boolean);
  const correct = winnerNomineeIds.indexOf(realityTvKey_(pick.nomineeId)) !== -1;
  const usesConfidence = scoreMode === "confidence-points" || (
    scoreMode === "correct-pick" && game && game.confidenceEnabled === true
  );
  const base = usesConfidence
    ? realityTvNumber_(pick.confidencePoints, 0)
    : realityTvNumber_(config.points, 0);
  const adjusted = Math.max(0, base - (
    realityTvNumber_(config.changePenalty, 0) * realityTvNumber_(pick.changeCount, 0)
  ));
  if (correct) return { points: adjusted, correct: 1, settled: settled };
  if (usesConfidence && realityTvKey_(game && game.confidenceScoringMode) === "risk-penalty") {
    return { points: -adjusted, correct: 0, settled: settled };
  }
  return { points: 0, correct: 0, settled: settled };
}

function realityTvPlayerStatsPayload_(season, episodes, episodeQuestions, username) {
  const gameId = realityTvString_(season && season.GameId);
  const requestedUsername = realityTvString_(username);
  if (!gameId || !requestedUsername || typeof buildUserPicksMap_ !== "function" || typeof getCategorySettings !== "function") {
    return { overall: null, episodes: {}, compactLeaderboard: [] };
  }

  const game = typeof getGameRuntimeConfig === "function"
    ? getGameRuntimeConfig(gameId)
    : (typeof getGame === "function" ? getGame(gameId) : {});
  const allPicks = buildUserPicksMap_(gameId) || {};
  const settings = typeof getCategorySettingsCached === "function"
    ? (getCategorySettingsCached(gameId) || {})
    : (getCategorySettings(gameId) || {});
  const resolutions = typeof getCategoryResultsResolutionMap === "function"
    ? (getCategoryResultsResolutionMap(gameId) || {})
    : {};
  const categoryMap = realityTvEpisodeStatsCategoryMap_(season, episodes, episodeQuestions);
  const usernameByKey = {};
  Object.keys(allPicks).forEach(function(name) { usernameByKey[realityTvKey_(name)] = name; });
  usernameByKey[realityTvKey_(requestedUsername)] = requestedUsername;

  const anchorByEpisodeUser = {};
  if (typeof seasonAnchorReadObjects_ === "function" && typeof SEASON_ANCHOR_HISTORY_SHEET !== "undefined") {
    seasonAnchorReadObjects_(SEASON_ANCHOR_HISTORY_SHEET).forEach(function(row) {
      if (realityTvKey_(row.GameId) !== realityTvKey_(gameId)) return;
      const episodeNumber = realityTvNumber_(row.EpisodeNumber, 0);
      const userKey = realityTvKey_(row.Username);
      if (!episodeNumber || !userKey) return;
      usernameByKey[userKey] = realityTvString_(row.Username);
      if (!anchorByEpisodeUser[episodeNumber]) anchorByEpisodeUser[episodeNumber] = {};
      anchorByEpisodeUser[episodeNumber][userKey] = realityTvNumber_(anchorByEpisodeUser[episodeNumber][userKey], 0) + realityTvNumber_(row.NetAdjustment, 0);
    });
  }

  const userKeys = Object.keys(usernameByKey);
  const cumulative = {};
  const previousRank = {};
  const perEpisode = {};
  let cumulativeHasActivity = false;
  const sortedEpisodes = (episodes || []).slice().sort(function(a, b) {
    return realityTvNumber_(a.EpisodeNumber !== undefined ? a.EpisodeNumber : a.episodeNumber, 0) -
      realityTvNumber_(b.EpisodeNumber !== undefined ? b.EpisodeNumber : b.episodeNumber, 0);
  });

  sortedEpisodes.forEach(function(episode) {
    const episodeNumber = realityTvNumber_(episode.EpisodeNumber !== undefined ? episode.EpisodeNumber : episode.episodeNumber, 0);
    const categoryIds = categoryMap[episodeNumber] || [];
    const rows = userKeys.map(function(userKey) {
      const actualUsername = usernameByKey[userKey];
      const picks = allPicks[actualUsername] || allPicks[userKey] || {};
      let fixedPoints = 0;
      let correct = 0;
      let settled = 0;
      categoryIds.forEach(function(categoryId) {
        const config = settings[categoryId] || {};
        const resolution = resolutions[categoryId] || (
          config.winnerNomineeId
            ? { resolved: true, result: "winner", winnerNomineeId: config.winnerNomineeId }
            : null
        );
        const result = realityTvScoreEpisodeQuestionForUser_(game || {}, config, resolution, picks[categoryId]);
        fixedPoints += realityTvNumber_(result.points, 0);
        correct += realityTvNumber_(result.correct, 0);
        settled += realityTvNumber_(result.settled, 0);
      });
      const anchorAdjustment = realityTvNumber_((anchorByEpisodeUser[episodeNumber] || {})[userKey], 0);
      const points = Math.round((fixedPoints + anchorAdjustment + Number.EPSILON) * 100) / 100;
      cumulative[userKey] = Math.round((realityTvNumber_(cumulative[userKey], 0) + points + Number.EPSILON) * 100) / 100;
      if (settled > 0 || points !== 0) cumulativeHasActivity = true;
      return {
        username: actualUsername,
        userKey: userKey,
        points: points,
        fixedPoints: Math.round((fixedPoints + Number.EPSILON) * 100) / 100,
        anchorAdjustment: Math.round((anchorAdjustment + Number.EPSILON) * 100) / 100,
        correct: correct,
        settled: settled,
        cumulative: cumulative[userKey]
      };
    });

    const ranked = cumulativeHasActivity ? realityTvRankScoreRows_(rows.slice(), "cumulative") : rows.map(function(row) {
      row.rank = 0;
      return row;
    });
    const rankByKey = {};
    ranked.forEach(function(row) { rankByKey[row.userKey] = row.rank; });
    rows.forEach(function(row) {
      row.place = rankByKey[row.userKey] || 0;
      row.positionChange = previousRank[row.userKey] && row.place
        ? previousRank[row.userKey] - row.place
        : 0;
    });
    if (cumulativeHasActivity) {
      Object.keys(rankByKey).forEach(function(userKey) { previousRank[userKey] = rankByKey[userKey]; });
    }
    const requestedKey = realityTvKey_(requestedUsername);
    const requested = rows.find(function(row) { return row.userKey === requestedKey; }) || {
      points: 0, fixedPoints: 0, anchorAdjustment: 0, correct: 0, settled: 0, place: 0, positionChange: 0, cumulative: 0
    };
    perEpisode[String(episodeNumber)] = requested;
  });

  let leaderboard = [];
  try {
    const result = typeof getLeaderboardCached === "function"
      ? getLeaderboardCached(gameId, false)
      : (typeof getLeaderboardData === "function" ? getLeaderboardData(gameId) : []);
    leaderboard = Array.isArray(result) ? result : (result && (result.leaderboard || result.rows)) || [];
  } catch (err) {
    leaderboard = [];
  }
  leaderboard = leaderboard.slice().sort(function(a, b) {
    const difference = realityTvNumber_(b.total, 0) - realityTvNumber_(a.total, 0);
    if (difference) return difference;
    return realityTvString_(a.username || a.user).localeCompare(realityTvString_(b.username || b.user));
  });
  let leaderboardRank = 0;
  let lastLeaderboardScore = null;
  leaderboard.forEach(function(row, index) {
    const score = realityTvNumber_(row.total, 0);
    if (lastLeaderboardScore === null || score !== lastLeaderboardScore) leaderboardRank = index + 1;
    row.__rank = leaderboardRank;
    lastLeaderboardScore = score;
  });
  const requestedKey = realityTvKey_(requestedUsername);
  const currentRow = leaderboard.find(function(row) {
    return realityTvKey_(row.username || row.user) === requestedKey;
  }) || null;
  const compact = leaderboard.slice(0, 5).map(function(row) {
    return {
      rank: row.__rank,
      username: realityTvString_(row.username || row.user),
      displayName: realityTvString_(row.displayName || row.username || row.user),
      avatar: realityTvString_(row.avatar || "👤"),
      total: realityTvNumber_(row.total, 0),
      isCurrent: realityTvKey_(row.username || row.user) === requestedKey
    };
  });
  if (currentRow && !compact.some(function(row) { return row.isCurrent; })) {
    compact.push({
      rank: currentRow.__rank,
      username: realityTvString_(currentRow.username || currentRow.user),
      displayName: realityTvString_(currentRow.displayName || currentRow.username || currentRow.user),
      avatar: realityTvString_(currentRow.avatar || "👤"),
      total: realityTvNumber_(currentRow.total, 0),
      isCurrent: true,
      separated: true
    });
  }

  const totals = Object.keys(perEpisode).reduce(function(acc, key) {
    acc.correct += realityTvNumber_(perEpisode[key].correct, 0);
    acc.settled += realityTvNumber_(perEpisode[key].settled, 0);
    return acc;
  }, { correct: 0, settled: 0 });
  const allAnchorAdjustments = typeof seasonAnchorAdjustmentsForGame_ === "function"
    ? (seasonAnchorAdjustmentsForGame_(gameId) || {})
    : {};
  const anchorAdjustments = allAnchorAdjustments[requestedUsername] || allAnchorAdjustments[requestedKey] || {};
  const latestEpisodeNumber = sortedEpisodes.length
    ? realityTvNumber_(sortedEpisodes[sortedEpisodes.length - 1].EpisodeNumber !== undefined ? sortedEpisodes[sortedEpisodes.length - 1].EpisodeNumber : sortedEpisodes[sortedEpisodes.length - 1].episodeNumber, 0)
    : 0;
  const latestStats = perEpisode[String(latestEpisodeNumber)] || {};
  return {
    overall: {
      totalPoints: currentRow ? realityTvNumber_(currentRow.total, 0) : realityTvNumber_(latestStats.cumulative, 0),
      rank: currentRow ? currentRow.__rank : realityTvNumber_(latestStats.place, 0),
      totalPlayers: leaderboard.length || userKeys.length,
      correct: totals.correct,
      settled: totals.settled,
      seasonAnchorNet: realityTvNumber_(currentRow && currentRow.seasonAnchorNet, realityTvNumber_(anchorAdjustments.net, 0))
    },
    episodes: perEpisode,
    compactLeaderboard: compact
  };
}

function realityTvGroupNameForEpisodeFromProfile_(profile, episodeNumber, fallback) {
  const episode = Math.max(1, realityTvNumber_(episodeNumber, 1));
  const history = profile && Array.isArray(profile.history) ? profile.history : [];
  const match = history.filter(function(entry) {
    const start = Math.max(1, realityTvNumber_(entry.startEpisode, 1));
    const end = realityTvNumber_(entry.endEpisode, 0);
    return start <= episode && (!end || end >= episode);
  }).slice(-1)[0] || null;
  return realityTvString_((match && match.groupName) || fallback || "");
}

function realityTvUserGameViewPayload_(gameId, username, options) {
  options = options || {};
  const includePlayerStats = options.includePlayerStats === true;
  const coreCacheKey = "rtv_user_core_" + realityTvSlug_(gameId);
  let corePayload = null;

  if (typeof CacheService !== "undefined") {
    try {
      const cached = CacheService.getScriptCache().get(coreCacheKey);
      if (cached) corePayload = JSON.parse(cached);
    } catch (cacheReadError) {
      Logger.log("Reality TV user core cache read skipped: " + cacheReadError);
    }
  }

  if (!corePayload) {
    const ss = SpreadsheetApp.getActive();
    const seasons = realityTvReadObjects_(ss, REALITY_TV_SEASONS_SHEET);
    const season = seasons.find(function(row) {
      return realityTvKey_(row.GameId) === realityTvKey_(gameId);
    });
    if (!season) return { enabled: false };

    const allContestants = realityTvReadObjects_(ss, REALITY_TV_CONTESTANTS_SHEET);
    const allGroups = realityTvReadObjects_(ss, REALITY_TV_GROUPS_SHEET);
    const allHistory = realityTvReadObjects_(ss, REALITY_TV_GROUP_HISTORY_SHEET);
    const allEpisodes = realityTvReadObjects_(ss, REALITY_TV_EPISODES_SHEET);
    const allEpisodeVotes = realityTvReadObjects_(ss, REALITY_TV_EPISODE_VOTES_SHEET);
    const allEpisodeQuestions = typeof REALITY_TV_EPISODE_QUESTIONS_SHEET !== "undefined"
      ? realityTvReadObjects_(ss, REALITY_TV_EPISODE_QUESTIONS_SHEET)
      : [];

    const contestantsRaw = realityTvRowsForSeasonReadOnly_(allContestants, season.SeasonId).sort(function(a, b) {
      return realityTvNumber_(a.DisplayOrder, 999) - realityTvNumber_(b.DisplayOrder, 999) ||
        realityTvString_(a.Name).localeCompare(realityTvString_(b.Name));
    });
    const storedGroups = realityTvRowsForSeasonReadOnly_(allGroups, season.SeasonId);
    const storedHistory = realityTvRowsForSeasonReadOnly_(allHistory, season.SeasonId);
    const groups = realityTvReadOnlyGroupBundle_(season, contestantsRaw, storedGroups, storedHistory);
    const groupHistory = realityTvReadOnlyGroupHistory_(season, contestantsRaw, storedHistory, groups);
    const profileByContestant = realityTvReadOnlyGroupProfiles_(season, contestantsRaw, groupHistory);
    const groupByName = {};
    groups.forEach(function(group) {
      groupByName[realityTvKey_(group.GroupName)] = group;
    });

    const participants = contestantsRaw.map(function(row) {
      const profile = profileByContestant[realityTvKey_(row.ContestantId)] || { history: [] };
      const currentGroupName = realityTvString_(profile.currentGroup || row.CurrentGroup || row.TeamOrTribe);
      const group = groupByName[realityTvKey_(currentGroupName)] || {};
      return {
        id: realityTvString_(row.ContestantId),
        name: realityTvString_(row.Name),
        fullName: realityTvString_(row.FullName),
        imageUrl: realityTvString_(row.ImageUrl),
        teamOrTribe: currentGroupName,
        startingGroup: realityTvString_(profile.startingGroup || row.StartingGroup),
        currentGroup: currentGroupName,
        finalGroup: realityTvString_(profile.finalGroup || row.FinalGroup),
        groupHistory: profile.history || [],
        teamColor: realityTvNormalizeColor_(row.TeamColor || group.Color, "#64748B"),
        groupImageUrl: realityTvString_(group.ImageUrl),
        age: realityTvString_(row.Age),
        hometown: realityTvString_(row.Hometown),
        occupation: realityTvString_(row.Occupation),
        biography: realityTvString_(row.Biography),
        member1: realityTvString_(row.Member1),
        member2: realityTvString_(row.Member2),
        relationship: realityTvString_(row.Relationship),
        member1ImageUrl: realityTvString_(row.Member1ImageUrl),
        member2ImageUrl: realityTvString_(row.Member2ImageUrl),
        status: realityTvString_(row.Status || "ACTIVE").toUpperCase(),
        active: realityTvBool_(row.Active),
        eliminatedEpisode: realityTvNumber_(row.EliminatedEpisode, 0),
        displayOrder: realityTvNumber_(row.DisplayOrder, 999)
      };
    });

    const votesForSeason = realityTvRowsForSeasonReadOnly_(allEpisodeVotes, season.SeasonId);
    const participantNameById = {};
    participants.forEach(function(participant) {
      participantNameById[realityTvKey_(participant.id)] = participant.name;
    });

    const episodes = realityTvRowsForSeasonReadOnly_(allEpisodes, season.SeasonId).map(function(row) {
      const episodeNumber = realityTvNumber_(row.EpisodeNumber, 0);
      const isFinal = realityTvKey_(row.Status || "open") === "final";
      const voteRows = isFinal ? votesForSeason.filter(function(vote) {
        return realityTvKey_(vote.EpisodeId) === realityTvKey_(row.EpisodeId);
      }).map(function(vote) {
        return {
          voteId: realityTvString_(vote.VoteId),
          round: realityTvString_(vote.VoteRoundLabel || "Round 1 — Initial Vote"),
          voterId: realityTvString_(vote.VoterContestantId),
          voterName: realityTvString_(participantNameById[realityTvKey_(vote.VoterContestantId)] || "Unknown"),
          targetId: realityTvString_(vote.TargetContestantId),
          targetName: realityTvString_(participantNameById[realityTvKey_(vote.TargetContestantId)] || ""),
          status: realityTvString_(vote.VoteStatus || "VALID").toUpperCase(),
          value: Math.max(0, realityTvNumber_(vote.VoteValue, 0)),
          notes: realityTvString_(vote.Notes)
        };
      }) : [];
      const voteTallies = {};
      voteRows.forEach(function(vote) {
        if (!vote.targetId) return;
        const key = realityTvKey_(vote.targetId);
        if (!voteTallies[key]) voteTallies[key] = {
          contestantId: vote.targetId,
          contestantName: vote.targetName || vote.targetId,
          valid: 0,
          cast: 0,
          nullified: 0,
          notRead: 0
        };
        if (["VALID", "NULLIFIED", "NOT-READ"].indexOf(vote.status) !== -1) voteTallies[key].cast += vote.value;
        if (vote.status === "VALID") voteTallies[key].valid += vote.value;
        if (vote.status === "NULLIFIED") voteTallies[key].nullified += vote.value;
        if (vote.status === "NOT-READ") voteTallies[key].notRead += vote.value;
      });
      return {
        episodeId: realityTvString_(row.EpisodeId),
        episodeNumber: episodeNumber,
        episodeName: realityTvString_(row.EpisodeName),
        airDateTime: row.AirDateTime || "",
        lockDateTime: row.LockDateTime || "",
        scheduleStatus: realityTvString_(row.ScheduleStatus || "SCHEDULED").toUpperCase(),
        originalAirDateTime: row.OriginalAirDateTime || "",
        scheduleNotes: realityTvString_(row.ScheduleNotes),
        categoryId: realityTvString_(row.CategoryId),
        status: realityTvString_(row.Status || "OPEN").toUpperCase(),
        voteDetails: isFinal && voteRows.length ? {
          rows: voteRows,
          tallies: Object.keys(voteTallies).map(function(key) { return voteTallies[key]; }).sort(function(a, b) {
            return b.valid - a.valid || realityTvString_(a.contestantName).localeCompare(realityTvString_(b.contestantName));
          })
        } : null,
        eliminated: participants.filter(function(participant) {
          return realityTvNumber_(participant.eliminatedEpisode, 0) === episodeNumber;
        }).map(function(participant) {
          return {
            id: participant.id,
            name: participant.name,
            imageUrl: participant.imageUrl,
            teamOrTribe: realityTvGroupNameForEpisodeFromProfile_(
              { history: participant.groupHistory },
              episodeNumber,
              participant.teamOrTribe
            )
          };
        })
      };
    }).sort(function(a, b) {
      return b.episodeNumber - a.episodeNumber;
    });

    const episodeQuestions = realityTvRowsForSeasonReadOnly_(allEpisodeQuestions, season.SeasonId).map(function(row) {
      return {
        episodeId: realityTvString_(row.EpisodeId),
        episodeNumber: realityTvNumber_(row.EpisodeNumber, 0),
        categoryId: realityTvString_(row.CategoryId),
        questionType: realityTvString_(row.QuestionType),
        layoutType: realityTvString_(row.LayoutType || "auto"),
        imageSource: realityTvString_(row.ImageSource || "auto"),
        status: realityTvString_(row.Status || "OPEN").toUpperCase()
      };
    });

    corePayload = {
      enabled: true,
      optimized: true,
      playerStatsDeferred: true,
      season: {
        seasonId: season.SeasonId,
        gameId: season.GameId,
        showName: season.ShowName,
        seasonName: season.SeasonName,
        showFormat: season.ShowFormat,
        participantType: season.ParticipantType,
        participantLabel: season.ParticipantLabel,
        groupLabel: season.GroupLabel,
        periodLabel: season.PeriodLabel,
        eliminationLayoutType: season.EliminationLayoutType || "auto",
        eliminationImageSource: season.EliminationImageSource || "roster",
        individualPlayStartsEpisode: realityTvNumber_(season.IndividualPlayStartsEpisode, 0),
        currentEpisodeNumber: realityTvNumber_(season.CurrentEpisodeNumber, 0)
      },
      participants: participants,
      groups: groups.map(function(row) {
        return {
          id: realityTvString_(row.GroupId),
          name: realityTvString_(row.GroupName),
          type: realityTvString_(row.GroupType),
          imageUrl: realityTvString_(row.ImageUrl),
          color: realityTvNormalizeColor_(row.Color, "#64748B"),
          active: realityTvBool_(row.Active),
          displayOrder: realityTvNumber_(row.DisplayOrder, 999)
        };
      }),
      episodes: episodes,
      episodeQuestions: episodeQuestions,
      playerStats: null
    };

    if (typeof CacheService !== "undefined") {
      try {
        const serialized = JSON.stringify(corePayload);
        if (serialized.length < 95000) {
          CacheService.getScriptCache().put(coreCacheKey, serialized, 120);
        }
      } catch (cacheWriteError) {
        Logger.log("Reality TV user core cache write skipped: " + cacheWriteError);
      }
    }
  }

  const payload = JSON.parse(JSON.stringify(corePayload));
  if (includePlayerStats && payload.enabled === true) {
    payload.playerStats = realityTvPlayerStatsPayload_(
      { GameId: payload.season.gameId, SeasonId: payload.season.seasonId },
      payload.episodes,
      payload.episodeQuestions,
      username
    );
    payload.playerStatsDeferred = false;
  }
  return payload;
}

function apiGetRealityTvPlayerStats(payload) {
  payload = payload || {};
  const username = realityTvString_(payload.username);
  const token = realityTvString_(payload.token);
  const gameId = realityTvString_(payload.gameId);
  if (!username || !gameId) throw new Error("Username and Game ID are required.");
  if (!token) throw new Error("Session expired. Please log in again.");
  if (typeof validateUserSession_ === "function") validateUserSession_(username, token);

  const cacheKey = "rtv_player_stats_" + realityTvSlug_(gameId) + "_" + realityTvSlug_(username);
  if (typeof CacheService !== "undefined") {
    try {
      const cached = CacheService.getScriptCache().get(cacheKey);
      if (cached) return { success: true, playerStats: JSON.parse(cached), cached: true };
    } catch (cacheReadError) {
      Logger.log("Reality TV player stats cache read skipped: " + cacheReadError);
    }
  }

  const core = realityTvUserGameViewPayload_(gameId, username, { includePlayerStats: false });
  if (!core || core.enabled !== true) {
    return { success: true, playerStats: null, enabled: false };
  }
  const stats = realityTvPlayerStatsPayload_(
    { GameId: core.season.gameId, SeasonId: core.season.seasonId },
    core.episodes,
    core.episodeQuestions,
    username
  );
  if (typeof CacheService !== "undefined") {
    try {
      const serialized = JSON.stringify(stats || {});
      if (serialized.length < 95000) CacheService.getScriptCache().put(cacheKey, serialized, 60);
    } catch (cacheWriteError) {
      Logger.log("Reality TV player stats cache write skipped: " + cacheWriteError);
    }
  }
  return { success: true, enabled: true, playerStats: stats };
}


function realityTvEpisodeLockedForComparison_(episode) {
  if (!episode) return false;
  if (realityTvKey_(episode.status || episode.Status || "open") !== "open") return true;
  const value = episode.lockDateTime || episode.LockDateTime || "";
  if (!value) return false;
  const lockDate = new Date(value);
  return !isNaN(lockDate.getTime()) && new Date().getTime() >= lockDate.getTime();
}

function realityTvLockedEpisodeComparisonPayload_(gameId, username) {
  const core = realityTvUserGameViewPayload_(gameId, username, { includePlayerStats: false });
  if (!core || core.enabled !== true || !core.season) {
    return { enabled: false, available: false, message: "Reality TV season was not found." };
  }

  const lockedEpisodes = (core.episodes || []).filter(realityTvEpisodeLockedForComparison_).sort(function(a, b) {
    return realityTvNumber_(b.episodeNumber, 0) - realityTvNumber_(a.episodeNumber, 0);
  });
  const episode = lockedEpisodes[0] || null;
  if (!episode) {
    return {
      enabled: true,
      available: false,
      message: "Group picks become visible after an episode locks."
    };
  }

  const cacheKey = "rtv_episode_compare_" + realityTvSlug_(gameId) + "_" + realityTvNumber_(episode.episodeNumber, 0);
  if (typeof CacheService !== "undefined") {
    try {
      const cached = CacheService.getScriptCache().get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (cacheReadError) {
      Logger.log("Reality TV episode comparison cache read skipped: " + cacheReadError);
    }
  }

  const categoryMap = realityTvEpisodeStatsCategoryMap_(
    { GameId: gameId, SeasonId: core.season.seasonId },
    core.episodes || [],
    core.episodeQuestions || []
  );
  const categoryIds = categoryMap[realityTvNumber_(episode.episodeNumber, 0)] || [];
  const categories = typeof getCategoriesCached === "function"
    ? (getCategoriesCached(gameId) || [])
    : (typeof getCategories === "function" ? (getCategories(gameId) || []) : []);
  const categoryById = {};
  categories.forEach(function(category) {
    categoryById[realityTvKey_(category.id)] = category;
  });

  const columns = categoryIds.map(function(categoryId) {
    const category = categoryById[realityTvKey_(categoryId)] || {};
    return {
      id: realityTvKey_(categoryId),
      label: realityTvString_(category.shortName || category.name || categoryId),
      fullLabel: realityTvString_(category.name || category.shortName || categoryId)
    };
  });

  const allPicks = typeof buildUserPicksMap_ === "function" ? (buildUserPicksMap_(gameId) || {}) : {};
  const anchorByUser = {};
  const usernames = {};
  if (typeof seasonAnchorReadObjects_ === "function" && typeof SEASON_ANCHOR_HISTORY_SHEET !== "undefined") {
    seasonAnchorReadObjects_(SEASON_ANCHOR_HISTORY_SHEET, true).forEach(function(row) {
      if (realityTvKey_(row.GameId) !== realityTvKey_(gameId)) return;
      if (realityTvNumber_(row.EpisodeNumber, 0) !== realityTvNumber_(episode.episodeNumber, 0)) return;
      const userKey = realityTvKey_(row.Username);
      if (!userKey) return;
      usernames[userKey] = realityTvString_(row.Username);
      anchorByUser[userKey] = realityTvString_(row.EntityName || row.EntityId);
    });
  }

  if (typeof seasonAnchorReadObjects_ === "function" && typeof SEASON_ANCHOR_USERS_SHEET !== "undefined") {
    seasonAnchorReadObjects_(SEASON_ANCHOR_USERS_SHEET, true).forEach(function(row) {
      if (realityTvKey_(row.GameId) !== realityTvKey_(gameId)) return;
      const userKey = realityTvKey_(row.Username);
      if (!userKey) return;
      usernames[userKey] = realityTvString_(row.Username);
      if (!anchorByUser[userKey] && realityTvNumber_(episode.episodeNumber, 0) === realityTvNumber_(core.season.currentEpisodeNumber, 0)) {
        anchorByUser[userKey] = realityTvString_(row.CurrentEntityName || row.CurrentEntityId);
      }
    });
  }

  Object.keys(allPicks).forEach(function(name) {
    usernames[realityTvKey_(name)] = realityTvString_(name);
  });

  const rows = Object.keys(usernames).map(function(userKey) {
    const actualUsername = usernames[userKey];
    const picks = allPicks[actualUsername] || allPicks[userKey] || {};
    const answers = {};
    let hasEpisodePick = false;
    columns.forEach(function(column) {
      const pick = picks[column.id] || picks[realityTvKey_(column.id)] || null;
      const nomineeId = realityTvKey_(pick && pick.nomineeId);
      const category = categoryById[column.id] || {};
      const nominee = (category.nominees || []).find(function(item) {
        return realityTvKey_(item.id) === nomineeId;
      });
      answers[column.id] = nominee ? realityTvString_(nominee.name || nominee.shortAnswer) : "";
      if (nomineeId) hasEpisodePick = true;
    });
    return {
      username: actualUsername,
      displayName: actualUsername,
      survivorPick: anchorByUser[userKey] || "",
      answers: answers,
      hasActivity: hasEpisodePick || !!anchorByUser[userKey]
    };
  }).filter(function(row) {
    return row.hasActivity;
  }).sort(function(a, b) {
    return realityTvString_(a.displayName).localeCompare(realityTvString_(b.displayName));
  });

  const payload = {
    enabled: true,
    available: true,
    episode: {
      episodeId: realityTvString_(episode.episodeId),
      episodeNumber: realityTvNumber_(episode.episodeNumber, 0),
      episodeName: realityTvString_(episode.episodeName || (core.season.periodLabel + " " + episode.episodeNumber)),
      lockDateTime: episode.lockDateTime || ""
    },
    columns: columns,
    rows: rows,
    playerCount: rows.length,
    message: rows.length
      ? "Locked episode picks are visible to the group."
      : "No group picks were submitted for this locked episode."
  };

  if (typeof CacheService !== "undefined") {
    try {
      const serialized = JSON.stringify(payload);
      if (serialized.length < 95000) CacheService.getScriptCache().put(cacheKey, serialized, 60);
    } catch (cacheWriteError) {
      Logger.log("Reality TV episode comparison cache write skipped: " + cacheWriteError);
    }
  }
  return payload;
}

function apiGetRealityTvEpisodeComparison(payload) {
  payload = payload || {};
  const username = realityTvString_(payload.username);
  const token = realityTvString_(payload.token);
  const gameId = realityTvString_(payload.gameId);
  if (!username || !gameId) throw new Error("Username and Game ID are required.");
  if (!token) throw new Error("Session expired. Please log in again.");
  if (typeof validateUserSession_ === "function") validateUserSession_(username, token);
  return {
    success: true,
    comparison: realityTvLockedEpisodeComparisonPayload_(gameId, username)
  };
}

function setupRealityTvSeasonManager() {
  realityTvEnsureSystem_();
  if (typeof realityTvEnsureQuestionPackSystem_ === "function") realityTvEnsureQuestionPackSystem_();
  if (typeof seasonAnchorEnsureSystem_ === "function") seasonAnchorEnsureSystem_();
  const sheets = [REALITY_TV_SEASONS_SHEET, REALITY_TV_CONTESTANTS_SHEET, REALITY_TV_EPISODES_SHEET, REALITY_TV_GROUPS_SHEET, REALITY_TV_GROUP_HISTORY_SHEET, REALITY_TV_RESULTS_QUEUE_SHEET, REALITY_TV_EPISODE_VOTES_SHEET];
  if (typeof REALITY_TV_QUESTION_TEMPLATES_SHEET !== "undefined") {
    sheets.push(REALITY_TV_QUESTION_TEMPLATES_SHEET, REALITY_TV_EPISODE_QUESTIONS_SHEET, REALITY_TV_QUESTION_QUEUE_SHEET);
    if (typeof REALITY_TV_QUESTION_BUILD_JOBS_SHEET !== "undefined") sheets.push(REALITY_TV_QUESTION_BUILD_JOBS_SHEET);
  }
  if (typeof SEASON_ANCHOR_SETTINGS_SHEET !== "undefined") {
    sheets.push(SEASON_ANCHOR_SETTINGS_SHEET, SEASON_ANCHOR_USERS_SHEET, SEASON_ANCHOR_HISTORY_SHEET);
  }
  return {
    success: true,
    message: "Reality TV Season Manager is ready.",
    sheets: sheets
  };
}

function apiAdminSetupRealityTvSystem(payload) {
  requireAdmin_(payload || {});
  return setupRealityTvSeasonManager();
}

function apiAdminConfigureRealityTvHub(payload) {
  requireAdmin_(payload || {});
  const id = realityTvExtractSpreadsheetId_(payload.spreadsheetId || payload.spreadsheetUrl || "");
  if (!id) throw new Error("External Results Hub spreadsheet URL or ID is required.");
  const hub = SpreadsheetApp.openById(id);
  Object.keys(REALITY_TV_HUB_HEADERS).forEach(function(name) {
    realityTvGetOrCreateSheet_(hub, name, REALITY_TV_HUB_HEADERS[name]);
  });
  PropertiesService.getScriptProperties().setProperty(REALITY_TV_HUB_PROPERTY, id);
  return { success: true, message: "External Results Hub connected.", spreadsheetId: id, spreadsheetName: hub.getName() };
}


function realityTvRowsForSeasonReadOnly_(rows, seasonId) {
  const key = realityTvKey_(seasonId);
  return (rows || []).filter(function(row) {
    return realityTvKey_(row.SeasonId) === key;
  });
}

function realityTvReadOnlyGroupBundle_(season, contestants, storedGroups, storedHistory) {
  const groupByName = {};
  const output = [];
  const prefix = realityTvKey_(season.ShowFormat) === "survivor-tribal" ? "tribe" : "group";

  function remember(name, source, color) {
    const cleanName = realityTvString_(name);
    if (!cleanName) return;
    const key = realityTvKey_(cleanName);
    if (groupByName[key]) {
      if (!groupByName[key].Color && color) groupByName[key].Color = realityTvNormalizeColor_(color, "#64748B");
      return;
    }
    const row = Object.assign({
      SeasonId: season.SeasonId,
      GameId: season.GameId,
      GroupId: prefix + "-" + realityTvSlug_(cleanName),
      GroupName: cleanName,
      GroupType: realityTvString_(season.GroupLabel || "Group"),
      ImageUrl: "",
      Color: realityTvNormalizeColor_(color, "#64748B"),
      Active: true,
      DisplayOrder: output.length + 1,
      ReadOnlyDerived: true
    }, source || {});
    groupByName[key] = row;
    output.push(row);
  }

  (storedGroups || []).forEach(function(row) {
    remember(row.GroupName, row, row.Color);
  });
  (contestants || []).forEach(function(row) {
    remember(row.TeamOrTribe, null, row.TeamColor);
    remember(row.StartingGroup, null, row.TeamColor);
    remember(row.CurrentGroup, null, row.TeamColor);
    remember(row.FinalGroup, null, row.TeamColor);
  });
  (storedHistory || []).forEach(function(row) {
    remember(row.GroupName, null, "");
  });

  return output.sort(function(a, b) {
    return realityTvNumber_(a.DisplayOrder, 999) - realityTvNumber_(b.DisplayOrder, 999) ||
      realityTvString_(a.GroupName).localeCompare(realityTvString_(b.GroupName));
  });
}

function realityTvReadOnlyGroupHistory_(season, contestants, storedHistory, groups) {
  const history = (storedHistory || []).slice();
  const hasHistory = {};
  const groupByName = {};
  (groups || []).forEach(function(row) {
    groupByName[realityTvKey_(row.GroupName)] = row;
  });
  history.forEach(function(row) {
    hasHistory[realityTvKey_(row.ContestantId)] = true;
  });

  (contestants || []).forEach(function(contestant) {
    const contestantId = realityTvString_(contestant.ContestantId);
    const groupName = realityTvString_(contestant.TeamOrTribe || contestant.CurrentGroup || contestant.StartingGroup);
    if (!contestantId || !groupName || hasHistory[realityTvKey_(contestantId)]) return;
    const group = groupByName[realityTvKey_(groupName)] || {};
    history.push({
      AssignmentId: season.SeasonId + "-" + contestantId + "-episode-1-" + realityTvSlug_(groupName),
      SeasonId: season.SeasonId,
      GameId: season.GameId,
      ContestantId: contestantId,
      GroupId: realityTvString_(group.GroupId || ("group-" + realityTvSlug_(groupName))),
      GroupName: groupName,
      StartEpisode: 1,
      EndEpisode: "",
      AssignmentType: "STARTING",
      Notes: "Derived from the initial roster. Save a group assignment to persist it.",
      Active: true,
      ReadOnlyDerived: true
    });
  });

  return history.sort(function(a, b) {
    const contestantDiff = realityTvString_(a.ContestantId).localeCompare(realityTvString_(b.ContestantId));
    if (contestantDiff) return contestantDiff;
    return realityTvNumber_(a.StartEpisode, 1) - realityTvNumber_(b.StartEpisode, 1);
  });
}

function realityTvReadOnlyGroupProfiles_(season, contestants, history) {
  const byContestant = {};
  (history || []).forEach(function(row) {
    const key = realityTvKey_(row.ContestantId);
    if (!byContestant[key]) byContestant[key] = [];
    byContestant[key].push(row);
  });
  Object.keys(byContestant).forEach(function(key) {
    byContestant[key].sort(function(a, b) {
      return realityTvNumber_(a.StartEpisode, 1) - realityTvNumber_(b.StartEpisode, 1);
    });
  });

  const currentEpisode = Math.max(1, realityTvNumber_(season.CurrentEpisodeNumber, 1));
  const profiles = {};
  (contestants || []).forEach(function(contestant) {
    const key = realityTvKey_(contestant.ContestantId);
    const named = (byContestant[key] || []).filter(function(row) {
      return realityTvString_(row.GroupName);
    });
    const current = named.filter(function(row) {
      const start = Math.max(1, realityTvNumber_(row.StartEpisode, 1));
      const end = realityTvNumber_(row.EndEpisode, 0);
      return start <= currentEpisode && (!end || end >= currentEpisode);
    }).slice(-1)[0] || (named.length ? named[named.length - 1] : null);
    const starting = named.length ? named[0] : null;
    const finalAssignment = named.length ? named[named.length - 1] : null;
    profiles[key] = {
      startingGroup: starting ? realityTvString_(starting.GroupName) : realityTvString_(contestant.StartingGroup || contestant.TeamOrTribe),
      currentGroup: current ? realityTvString_(current.GroupName) : realityTvString_(contestant.CurrentGroup || contestant.TeamOrTribe),
      finalGroup: finalAssignment ? realityTvString_(finalAssignment.GroupName) : realityTvString_(contestant.FinalGroup || contestant.TeamOrTribe),
      history: named.map(function(row) {
        return {
          assignmentId: realityTvString_(row.AssignmentId),
          groupId: realityTvString_(row.GroupId),
          groupName: realityTvString_(row.GroupName),
          startEpisode: Math.max(1, realityTvNumber_(row.StartEpisode, 1)),
          endEpisode: realityTvNumber_(row.EndEpisode, 0),
          assignmentType: realityTvString_(row.AssignmentType || "ASSIGNED"),
          notes: realityTvString_(row.Notes),
          active: realityTvBool_(row.Active),
          readOnlyDerived: realityTvBool_(row.ReadOnlyDerived)
        };
      })
    };
  });
  return profiles;
}

function apiAdminGetRealityTvDashboardSummary(payload) {
  requireAdmin_(payload || {});
  const startedAt = Date.now();
  const ss = SpreadsheetApp.getActive();
  const seasons = realityTvReadObjects_(ss, REALITY_TV_SEASONS_SHEET);
  const contestants = realityTvReadObjects_(ss, REALITY_TV_CONTESTANTS_SHEET);
  const groups = realityTvReadObjects_(ss, REALITY_TV_GROUPS_SHEET);
  const episodes = realityTvReadObjects_(ss, REALITY_TV_EPISODES_SHEET);
  const queue = realityTvReadObjects_(ss, REALITY_TV_RESULTS_QUEUE_SHEET);
  const episodeQuestions = typeof REALITY_TV_EPISODE_QUESTIONS_SHEET !== "undefined"
    ? realityTvReadObjects_(ss, REALITY_TV_EPISODE_QUESTIONS_SHEET)
    : [];
  const questionQueue = typeof REALITY_TV_QUESTION_QUEUE_SHEET !== "undefined"
    ? realityTvReadObjects_(ss, REALITY_TV_QUESTION_QUEUE_SHEET)
    : [];

  const index = {};
  function bucket(seasonId) {
    const key = realityTvKey_(seasonId);
    if (!index[key]) index[key] = {
      contestants: 0, groups: 0, episodes: [], episodeQuestions: 0, pendingReviews: 0
    };
    return index[key];
  }
  contestants.forEach(function(row) { bucket(row.SeasonId).contestants += 1; });
  groups.forEach(function(row) { bucket(row.SeasonId).groups += 1; });
  episodes.forEach(function(row) { bucket(row.SeasonId).episodes.push(row); });
  episodeQuestions.forEach(function(row) { bucket(row.SeasonId).episodeQuestions += 1; });
  queue.concat(questionQueue).forEach(function(row) {
    const status = realityTvString_(row.ReviewStatus || row.Status || row.PushStatus).toUpperCase();
    if (["PENDING", "APPROVING", "SETTLING", "BUILDING_NEXT_EPISODE", "SYNCING_HUB"].indexOf(status) !== -1) {
      bucket(row.SeasonId).pendingReviews += 1;
    }
  });

  const summaries = seasons.map(function(season) {
    const data = bucket(season.SeasonId);
    data.episodes.sort(function(a, b) {
      return realityTvNumber_(a.EpisodeNumber, 0) - realityTvNumber_(b.EpisodeNumber, 0);
    });
    return {
      season: season,
      currentEpisode: data.episodes.length ? data.episodes[data.episodes.length - 1] : null,
      summary: {
        contestants: data.contestants,
        groups: data.groups,
        episodes: data.episodes.length,
        episodeQuestions: data.episodeQuestions,
        pendingReviews: data.pendingReviews
      },
      detailsLoaded: false
    };
  }).sort(function(a, b) {
    return new Date(b.season.UpdatedAt || b.season.CreatedAt || 0).getTime() -
      new Date(a.season.UpdatedAt || a.season.CreatedAt || 0).getTime();
  });

  const hubId = realityTvGetHubId_();
  return {
    success: true,
    lightweight: true,
    hubConfigured: !!hubId,
    hubSpreadsheetId: hubId,
    hubSpreadsheetName: "",
    hubError: "",
    showFormats: typeof realityTvShowFormatDefinitions_ === "function"
      ? realityTvShowFormatDefinitions_()
      : [],
    seasons: summaries,
    performance: { durationMs: Date.now() - startedAt, seasonCount: seasons.length }
  };
}

function apiAdminGetRealityTvSeasonDetails(payload) {
  requireAdmin_(payload || {});
  const startedAt = Date.now();
  const seasonId = realityTvString_(payload.seasonId || payload.SeasonId);
  if (!seasonId) throw new Error("Season ID is required.");

  const ss = SpreadsheetApp.getActive();
  const season = realityTvReadObjects_(ss, REALITY_TV_SEASONS_SHEET).find(function(row) {
    return realityTvKey_(row.SeasonId) === realityTvKey_(seasonId);
  }) || null;
  if (!season) throw new Error("Reality TV season not found.");

  // Loading a season must be read-only. Missing legacy defaults are supplied in memory
  // and are persisted only when the administrator explicitly saves or repairs the season.
  let displaySeason = Object.assign({}, season);
  if (!displaySeason.ShowFormat) {
    const fallback = typeof realityTvShowFormatDefinition_ === "function"
      ? realityTvShowFormatDefinition_("survivor-tribal")
      : null;
    displaySeason.ShowFormat = fallback ? fallback.id : "survivor-tribal";
    displaySeason.ParticipantType = fallback ? fallback.participantType : "individual";
    displaySeason.ParticipantLabel = fallback ? fallback.participantLabel : "Contestant";
    displaySeason.GroupLabel = fallback ? fallback.groupLabel : "Tribe";
    displaySeason.PeriodLabel = fallback ? fallback.periodLabel : "Episode";
    displaySeason.ReadOnlyDefaultsApplied = true;
  }

  const allContestants = realityTvReadObjects_(ss, REALITY_TV_CONTESTANTS_SHEET);
  const allGroups = realityTvReadObjects_(ss, REALITY_TV_GROUPS_SHEET);
  const allHistory = realityTvReadObjects_(ss, REALITY_TV_GROUP_HISTORY_SHEET);
  const allEpisodes = realityTvReadObjects_(ss, REALITY_TV_EPISODES_SHEET);
  const allQueue = realityTvReadObjects_(ss, REALITY_TV_RESULTS_QUEUE_SHEET);
  const allEpisodeVotes = realityTvReadObjects_(ss, REALITY_TV_EPISODE_VOTES_SHEET);
  const allTemplates = typeof REALITY_TV_QUESTION_TEMPLATES_SHEET !== "undefined"
    ? realityTvReadObjects_(ss, REALITY_TV_QUESTION_TEMPLATES_SHEET)
    : [];
  const allEpisodeQuestions = typeof REALITY_TV_EPISODE_QUESTIONS_SHEET !== "undefined"
    ? realityTvReadObjects_(ss, REALITY_TV_EPISODE_QUESTIONS_SHEET)
    : [];
  const allQuestionQueue = typeof REALITY_TV_QUESTION_QUEUE_SHEET !== "undefined"
    ? realityTvReadObjects_(ss, REALITY_TV_QUESTION_QUEUE_SHEET)
    : [];
  const allBuildJobs = typeof REALITY_TV_QUESTION_BUILD_JOBS_SHEET !== "undefined"
    ? realityTvReadObjects_(ss, REALITY_TV_QUESTION_BUILD_JOBS_SHEET)
    : [];

  const contestantsRaw = realityTvRowsForSeasonReadOnly_(allContestants, seasonId)
    .sort(function(a, b) {
      return realityTvNumber_(a.DisplayOrder, 999) - realityTvNumber_(b.DisplayOrder, 999) ||
        realityTvString_(a.Name).localeCompare(realityTvString_(b.Name));
    });
  const storedGroups = realityTvRowsForSeasonReadOnly_(allGroups, seasonId);
  const storedHistory = realityTvRowsForSeasonReadOnly_(allHistory, seasonId);
  const groups = realityTvReadOnlyGroupBundle_(displaySeason, contestantsRaw, storedGroups, storedHistory);
  const groupHistory = realityTvReadOnlyGroupHistory_(displaySeason, contestantsRaw, storedHistory, groups);
  const profileByContestant = realityTvReadOnlyGroupProfiles_(displaySeason, contestantsRaw, groupHistory);
  const contestants = contestantsRaw.map(function(row) {
    const profile = profileByContestant[realityTvKey_(row.ContestantId)] || { history: [] };
    return Object.assign({}, row, {
      StartingGroup: profile.startingGroup || row.StartingGroup || row.TeamOrTribe || "",
      CurrentGroup: profile.currentGroup || row.CurrentGroup || row.TeamOrTribe || "",
      FinalGroup: profile.finalGroup || row.FinalGroup || row.TeamOrTribe || "",
      GroupHistory: profile.history || []
    });
  });
  const episodes = realityTvRowsForSeasonReadOnly_(allEpisodes, seasonId).sort(function(a, b) {
    return realityTvNumber_(a.EpisodeNumber, 0) - realityTvNumber_(b.EpisodeNumber, 0);
  });
  const queue = realityTvRowsForSeasonReadOnly_(allQueue, seasonId).sort(function(a, b) {
    return new Date(b.SubmittedAt || 0).getTime() - new Date(a.SubmittedAt || 0).getTime();
  });
  const episodeVotes = realityTvRowsForSeasonReadOnly_(allEpisodeVotes, seasonId).sort(function(a, b) {
    const episodeDiff = realityTvNumber_(a.EpisodeNumber, 0) - realityTvNumber_(b.EpisodeNumber, 0);
    if (episodeDiff) return episodeDiff;
    const roundDiff = realityTvString_(a.VoteRoundLabel).localeCompare(realityTvString_(b.VoteRoundLabel));
    if (roundDiff) return roundDiff;
    return new Date(a.RecordedAt || 0).getTime() - new Date(b.RecordedAt || 0).getTime();
  });
  const questionTemplates = realityTvRowsForSeasonReadOnly_(allTemplates, seasonId).filter(function(row) {
    return typeof realityTvQuestionTemplateMatchesFormat_ !== "function" ||
      realityTvQuestionTemplateMatchesFormat_(row, displaySeason.ShowFormat || "survivor-tribal");
  }).sort(function(a, b) {
    return realityTvNumber_(a.DisplayOrder, 999) - realityTvNumber_(b.DisplayOrder, 999);
  });
  const episodeQuestions = realityTvRowsForSeasonReadOnly_(allEpisodeQuestions, seasonId).sort(function(a, b) {
    const episodeDiff = realityTvNumber_(a.EpisodeNumber, 0) - realityTvNumber_(b.EpisodeNumber, 0);
    if (episodeDiff) return episodeDiff;
    return realityTvString_(a.QuestionType).localeCompare(realityTvString_(b.QuestionType));
  });
  const questionQueue = realityTvRowsForSeasonReadOnly_(allQuestionQueue, seasonId).sort(function(a, b) {
    return new Date(b.SubmittedAt || 0).getTime() - new Date(a.SubmittedAt || 0).getTime();
  });
  const buildJobs = realityTvRowsForSeasonReadOnly_(allBuildJobs, seasonId).sort(function(a, b) {
    return new Date(b.UpdatedAt || b.StartedAt || 0).getTime() - new Date(a.UpdatedAt || a.StartedAt || 0).getTime();
  });
  const currentEpisodeNumber = Math.max(1, realityTvNumber_(displaySeason.CurrentEpisodeNumber, 1));
  const currentEpisode = episodes.find(function(row) {
    return realityTvNumber_(row.EpisodeNumber, 0) === currentEpisodeNumber;
  }) || (episodes.length ? episodes[episodes.length - 1] : null);
  const activeBuild = buildJobs.find(function(row) {
    const status = realityTvString_(row.Status).toUpperCase();
    const episodeMatches = !currentEpisode || realityTvKey_(row.EpisodeId) === realityTvKey_(currentEpisode.EpisodeId);
    return episodeMatches && status !== "COMPLETE" && status !== "CANCELLED";
  }) || null;
  const completedBuild = buildJobs.find(function(row) {
    const episodeMatches = !currentEpisode || realityTvKey_(row.EpisodeId) === realityTvKey_(currentEpisode.EpisodeId);
    return episodeMatches && realityTvString_(row.Status).toUpperCase() === "COMPLETE";
  }) || null;
  let currentGameSetupCategories = null;
  if (typeof adminGetGameSetup === "function") {
    try {
      const setup = adminGetGameSetup({ gameId: displaySeason.GameId });
      currentGameSetupCategories = setup && Array.isArray(setup.categories) ? setup.categories : [];
    } catch (err) {
      currentGameSetupCategories = null;
    }
  }

  const bundle = {
    season: displaySeason,
    contestants: contestants,
    groupHistory: groupHistory,
    groups: groups,
    episodes: episodes,
    queue: queue,
    episodeVotes: episodeVotes,
    questionTemplates: questionTemplates,
    episodeQuestions: episodeQuestions,
    questionQueue: questionQueue,
    questionBuild: typeof realityTvQuestionBuildState_ === "function" ? realityTvQuestionBuildState_(activeBuild) : null,
    questionBuildSummary: typeof realityTvQuestionBuildState_ === "function" ? realityTvQuestionBuildState_(completedBuild) : null,
    questionReadiness: typeof realityTvQuestionPackReadiness_ === "function"
      ? realityTvQuestionPackReadiness_(
          displaySeason,
          currentEpisode,
          questionTemplates,
          episodeQuestions,
          typeof realityTvQuestionBuildState_ === "function" ? realityTvQuestionBuildState_(activeBuild) : null,
          typeof realityTvQuestionBuildState_ === "function" ? realityTvQuestionBuildState_(completedBuild) : null,
          currentGameSetupCategories
        )
      : null,
    seasonAnchorSettings: typeof seasonAnchorGetSettings_ === "function"
      ? (seasonAnchorGetSettings_(displaySeason.GameId) || seasonAnchorDefaultSettings_(displaySeason.GameId, displaySeason.SeasonId))
      : null,
    detailsLoaded: true,
    readOnlyLoad: true
  };

  const performance = {
    durationMs: Date.now() - startedAt,
    contestants: contestants.length,
    groups: groups.length,
    groupHistoryRows: groupHistory.length,
    episodes: episodes.length,
    episodeQuestions: episodeQuestions.length,
    questionTemplates: questionTemplates.length,
    pendingRows: queue.length + questionQueue.length,
    episodeVotes: episodeVotes.length
  };
  if (performance.durationMs > 5000 && typeof Logger !== "undefined") {
    Logger.log("Slow Reality TV season detail load: " + JSON.stringify(performance));
  }
  return { success: true, bundle: bundle, performance: performance };
}

function apiAdminGetRealityTvDashboard(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const ss = SpreadsheetApp.getActive();
  const seasons = realityTvReadObjects_(ss, REALITY_TV_SEASONS_SHEET).map(function(season) {
    if (!season.ShowFormat) {
      const fallback = typeof realityTvShowFormatDefinition_ === "function" ? realityTvShowFormatDefinition_("survivor-tribal") : null;
      realityTvUpdateObjectRow_(ss.getSheetByName(REALITY_TV_SEASONS_SHEET), season.__rowNumber, {
        ShowFormat: fallback ? fallback.id : "survivor-tribal",
        ParticipantType: fallback ? fallback.participantType : "individual",
        ParticipantLabel: fallback ? fallback.participantLabel : "Contestant",
        GroupLabel: fallback ? fallback.groupLabel : "Tribe",
        PeriodLabel: fallback ? fallback.periodLabel : "Episode",
        UpdatedAt: new Date()
      });
      season = realityTvGetSeason_(season.SeasonId);
    }
    if (typeof realityTvEnsureQuestionTemplateCatalogForSeason_ === "function") realityTvEnsureQuestionTemplateCatalogForSeason_(season);
    const groups = realityTvSyncGroupsFromContestants_(season);
    return {
      season: season,
      contestants: realityTvContestantsForSeason_(season.SeasonId),
      groups: groups,
      episodes: realityTvEpisodesForSeason_(season.SeasonId),
      queue: realityTvQueueForSeason_(season.SeasonId),
      questionTemplates: typeof realityTvQuestionTemplatesForSeason_ === "function"
        ? realityTvQuestionTemplatesForSeason_(season.SeasonId)
        : [],
      episodeQuestions: typeof realityTvEpisodeQuestionsForSeason_ === "function"
        ? realityTvEpisodeQuestionsForSeason_(season.SeasonId)
        : [],
      questionQueue: typeof realityTvQuestionQueueForSeason_ === "function"
        ? realityTvQuestionQueueForSeason_(season.SeasonId)
        : [],
      questionBuild: typeof realityTvLatestQuestionBuildStateForSeason_ === "function"
        ? realityTvLatestQuestionBuildStateForSeason_(season.SeasonId)
        : null,
      questionBuildSummary: typeof realityTvLatestCompletedQuestionBuildStateForSeason_ === "function"
        ? realityTvLatestCompletedQuestionBuildStateForSeason_(
          season.SeasonId,
          (realityTvEpisodesForSeason_(season.SeasonId).slice(-1)[0] || {}).EpisodeId
        )
        : null,
      seasonAnchorSettings: typeof seasonAnchorGetSettings_ === "function"
        ? (seasonAnchorGetSettings_(season.GameId) || seasonAnchorDefaultSettings_(season.GameId, season.SeasonId))
        : null
    };
  }).sort(function(a, b) {
    return new Date(b.season.UpdatedAt || b.season.CreatedAt || 0).getTime() - new Date(a.season.UpdatedAt || a.season.CreatedAt || 0).getTime();
  });

  let hubName = "";
  let hubError = "";
  const hubId = realityTvGetHubId_();
  if (hubId) {
    try { hubName = SpreadsheetApp.openById(hubId).getName(); }
    catch (err) { hubError = err.message; }
  }
  return {
    success: true,
    hubConfigured: !!hubId && !hubError,
    hubSpreadsheetId: hubId,
    hubSpreadsheetName: hubName,
    hubError: hubError,
    showFormats: typeof realityTvShowFormatDefinitions_ === "function" ? realityTvShowFormatDefinitions_() : [],
    seasons: seasons
  };
}

function apiAdminCreateRealityTvSeason(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();

  const showName = realityTvString_(payload.showName);
  const seasonName = realityTvString_(payload.seasonName) || "Season " + realityTvString_(payload.seasonNumber || "1");
  const seasonNumber = realityTvString_(payload.seasonNumber || "1");
  const year = realityTvNumber_(payload.year, new Date().getFullYear());
  const gameId = realityTvSlug_(payload.gameId || (showName + "-" + seasonName + "-" + year));
  const firstEpisodeDateTime = realityTvDate_(payload.firstEpisodeDateTime, "First episode date/time");
  const contestants = realityTvParseJson_(payload.contestantsJSON || payload.contestants, []);
  const format = typeof realityTvShowFormatDefinition_ === "function"
    ? realityTvShowFormatDefinition_(payload.showFormat || "survivor-tribal")
    : { id: "survivor-tribal", participantType: "individual", participantLabel: "Contestant", groupLabel: "Tribe", periodLabel: "Episode", eliminationTemplate: "Who will be eliminated in Episode {episode}?", defaultQuestionTypes: [] };

  if (!showName) throw new Error("Show name is required.");
  if (!firstEpisodeDateTime) throw new Error("First episode date/time is required.");
  if (!Array.isArray(contestants) || contestants.length < 2) throw new Error("Add at least two contestants.");

  const existingSeason = realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_SEASONS_SHEET).find(function(row) {
    return realityTvKey_(row.GameId) === realityTvKey_(gameId);
  });
  const existingEpisodes = existingSeason ? realityTvEpisodesForSeason_(existingSeason.SeasonId) : [];
  if (existingSeason && existingEpisodes.length) {
    const repair = apiAdminRepairRealityTvSetup({
      seasonId: existingSeason.SeasonId,
      gameId: existingSeason.GameId,
      episodeNumber: realityTvNumber_(existingSeason.CurrentEpisodeNumber, existingEpisodes[0].EpisodeNumber || 1)
    });
    return Object.assign({}, repair, {
      success: true,
      duplicate: true,
      message: "This Reality TV season already existed. Its current episode setup was checked and any missing questions or answers can resume safely.",
      gameId: gameId,
      seasonId: existingSeason.SeasonId,
      episode: existingEpisodes.find(function(row) {
        return realityTvNumber_(row.EpisodeNumber, 0) === realityTvNumber_(existingSeason.CurrentEpisodeNumber, 1);
      }) || existingEpisodes[0]
    });
  }

  const gameResult = adminCreateGame({
    gameId: gameId,
    name: showName + " — " + seasonName,
    year: year,
    type: "prediction",
    active: realityTvBool_(payload.publishGame),
    archived: false,
    defaultGame: false,
    predictionEnabled: true,
    rankingEnabled: false,
    confidenceEnabled: false,
    wagerEnabled: false,
    fixedPointsEnabled: true,
    stakedPointsEnabled: false,
    scoringMode: "fixed-points",
    scoringEngine: "manual",
    gameRole: "standalone",
    hubMode: "playable"
  });

  const now = new Date();
  const seasonId = gameId;
  const season = {
    SeasonId: seasonId,
    GameId: gameId,
    ShowName: showName,
    SeasonName: seasonName,
    SeasonNumber: seasonNumber,
    Year: year,
    ShowFormat: format.id,
    ParticipantType: realityTvString_(payload.participantType || format.participantType),
    ParticipantLabel: realityTvString_(payload.participantLabel || format.participantLabel),
    GroupLabel: realityTvString_(payload.groupLabel || format.groupLabel),
    PeriodLabel: realityTvString_(payload.periodLabel || format.periodLabel),
    Provider: "manual-reality-tv",
    FirstEpisodeDateTime: firstEpisodeDateTime,
    WeeklyIntervalDays: Math.max(1, realityTvNumber_(payload.weeklyIntervalDays, 7)),
    LockOffsetMinutes: Math.max(0, realityTvNumber_(payload.lockOffsetMinutes, 5)),
    Points: Math.max(0, realityTvNumber_(payload.points, 1)),
    QuestionTemplate: realityTvString_(payload.questionTemplate) || format.eliminationTemplate,
    EliminationLayoutType: typeof realityTvNormalizeLayoutType_ === "function" ? realityTvNormalizeLayoutType_(payload.eliminationLayoutType || "auto") : realityTvString_(payload.eliminationLayoutType || "auto"),
    EliminationImageSource: typeof realityTvNormalizeImageSource_ === "function" ? realityTvNormalizeImageSource_(payload.eliminationImageSource || "roster") : realityTvString_(payload.eliminationImageSource || "roster"),
    IndividualPlayStartsEpisode: Math.max(0, realityTvNumber_(payload.individualPlayStartsEpisode, 0)),
    PickChangesAllowed: payload.pickChangesAllowed === undefined ? true : realityTvBool_(payload.pickChangesAllowed),
    MaxPickChanges: realityTvPickRules_(payload).maxChanges,
    PickChangePenalty: realityTvPickRules_(payload).changePenalty,
    CurrentEpisodeNumber: 1,
    Status: "ACTIVE",
    AutoCreateNextEpisode: payload.autoCreateNextEpisode === undefined ? true : realityTvBool_(payload.autoCreateNextEpisode),
    CreatedAt: existingSeason && existingSeason.CreatedAt ? existingSeason.CreatedAt : now,
    UpdatedAt: now
  };
  realityTvUpsertObject_(SpreadsheetApp.getActive(), REALITY_TV_SEASONS_SHEET, REALITY_TV_SEASON_HEADERS, ["SeasonId"], season);

  if (typeof seasonAnchorSaveSettings_ === "function") {
    seasonAnchorSaveSettings_({
      gameId: gameId,
      seasonId: seasonId,
      enabled: payload.seasonAnchorEnabled,
      displayLabel: payload.seasonAnchorDisplayLabel || (format.participantType === "team" ? "Season Team Pick" : "Season Survivor Pick"),
      entityType: format.participantType === "team" ? "team" : "contestant",
      survivalMode: "active",
      startMultiplier: payload.seasonAnchorStartMultiplier,
      growthPerSuccess: payload.seasonAnchorGrowthPerSuccess,
      maxMultiplier: payload.seasonAnchorMaxMultiplier,
      eligiblePointsCap: payload.seasonAnchorEligiblePointsCap,
      lossPenalty: payload.seasonAnchorLossPenalty,
      noResultBehavior: "preserve",
      withdrawalBehavior: payload.seasonAnchorWithdrawalBehavior,
      manualSwitchAllowed: payload.seasonAnchorManualSwitchAllowed,
      sourceType: "reality-tv"
    });
  }

  const usedIds = {};
  const contestantRows = [];
  contestants.forEach(function(item, index) {
    const name = realityTvString_(item.name || item.Name);
    if (!name) return;
    let contestantId = realityTvSlug_(item.contestantId || item.ContestantId || name);
    let suffix = 2;
    const baseId = contestantId;
    while (usedIds[contestantId]) contestantId = baseId + "-" + suffix++;
    usedIds[contestantId] = true;
    contestantRows.push({
      SeasonId: seasonId,
      GameId: gameId,
      ContestantId: contestantId,
      Name: name,
      FullName: realityTvString_(item.fullName || item.FullName || name),
      ImageUrl: realityTvString_(item.imageUrl || item.ImageUrl),
      TeamOrTribe: realityTvString_(item.teamOrTribe || item.TeamOrTribe),
      StartingGroup: realityTvString_(item.teamOrTribe || item.TeamOrTribe),
      CurrentGroup: realityTvString_(item.teamOrTribe || item.TeamOrTribe),
      FinalGroup: realityTvString_(item.teamOrTribe || item.TeamOrTribe),
      Member1: realityTvString_(item.member1 || item.Member1),
      Member2: realityTvString_(item.member2 || item.Member2),
      Relationship: realityTvString_(item.relationship || item.Relationship),
      Member1ImageUrl: realityTvString_(item.member1ImageUrl || item.Member1ImageUrl),
      Member2ImageUrl: realityTvString_(item.member2ImageUrl || item.Member2ImageUrl),
      TeamColor: realityTvString_(item.teamColor || item.TeamColor),
      Age: realityTvString_(item.age || item.Age),
      Hometown: realityTvString_(item.hometown || item.Hometown),
      Occupation: realityTvString_(item.occupation || item.Occupation),
      Biography: realityTvString_(item.biography || item.Biography),
      ExternalSubjectId: realityTvString_(item.externalSubjectId || item.ExternalSubjectId || contestantId),
      Status: "ACTIVE",
      EliminatedEpisode: "",
      EliminatedAt: "",
      DisplayOrder: index + 1,
      Active: true,
      CreatedAt: now,
      UpdatedAt: now
    });
  });
  realityTvBulkUpsertObjects_(SpreadsheetApp.getActive(), REALITY_TV_CONTESTANTS_SHEET,
    REALITY_TV_CONTESTANT_HEADERS, ["SeasonId", "ContestantId"], contestantRows);

  const createdSeason = realityTvGetSeason_(seasonId);
  realityTvSyncGroupsFromContestants_(createdSeason);
  realityTvEnsureContestantGroupHistory_(createdSeason, contestantRows);
  if (typeof realityTvSaveStandardQuestionPack_ === "function") {
    realityTvSaveStandardQuestionPack_(
      createdSeason,
      payload.enabledQuestionTypesJSON || payload.enabledQuestionTypes || format.defaultQuestionTypes || [],
      payload.points,
      payload.questionPointsJSON || payload.questionPoints || {},
      payload.questionDisplayJSON || payload.questionDisplay || {}
    );
  }
  const episode = realityTvCreateEpisode_(createdSeason, 1, { skipQuestionPack: true });
  const enabledTypes = typeof realityTvQuestionTemplatesForSeason_ === "function"
    ? realityTvQuestionTemplatesForSeason_(createdSeason.SeasonId)
        .filter(function(row) { return realityTvBool_(row.Enabled); })
        .map(function(row) { return row.TemplateId; })
    : [];
  let questionBuild = enabledTypes.length && typeof realityTvStartQuestionPackBuild_ === "function"
    ? realityTvStartQuestionPackBuild_(createdSeason, episode, enabledTypes)
    : null;
  if (questionBuild && !questionBuild.complete && typeof realityTvAdvanceQuestionPackBuild_ === "function") {
    questionBuild = realityTvAdvanceQuestionPackBuild_(questionBuild, Math.max(4, enabledTypes.length + 1), 22000);
  }
  return {
    success: true,
    message: existingSeason
      ? "The interrupted Reality TV season setup was repaired. Episode 1 is ready and the extra-question build can resume safely."
      : "Reality TV season, contestant roster, and Episode 1 were created. Extra questions are being built in short stages.",
    gameId: gameId,
    seasonId: seasonId,
    episode: episode,
    questionBuild: questionBuild,
    game: gameResult
  };
}


function apiAdminRepairRealityTvSetup(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const seasonId = realityTvString_(payload.seasonId);
  const gameId = realityTvString_(payload.gameId);
  let season = seasonId ? realityTvGetSeason_(seasonId) : null;
  if (!season && gameId) {
    season = realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_SEASONS_SHEET).find(function(row) {
      return realityTvKey_(row.GameId) === realityTvKey_(gameId);
    }) || null;
  }
  if (!season) throw new Error("This game is not connected to a Reality TV season.");

  realityTvEnsureContestantGroupHistory_(season);
  if (typeof realityTvEnsureQuestionTemplateCatalogForSeason_ === "function") {
    realityTvEnsureQuestionTemplateCatalogForSeason_(season);
  }
  const episodes = realityTvEpisodesForSeason_(season.SeasonId);
  const episodeNumber = Math.max(1, realityTvNumber_(payload.episodeNumber,
    realityTvNumber_(season.CurrentEpisodeNumber, episodes.length ? episodes[episodes.length - 1].EpisodeNumber : 1)));
  const episode = realityTvCreateEpisode_(season, episodeNumber, {
    repair: true,
    skipHubSync: true,
    skipQuestionPack: true
  });
  const enabledTypes = typeof realityTvQuestionTemplatesForSeason_ === "function"
    ? realityTvQuestionTemplatesForSeason_(season.SeasonId)
        .filter(function(row) { return realityTvBool_(row.Enabled); })
        .map(function(row) { return row.TemplateId; })
    : [];
  let questionBuild = enabledTypes.length && typeof realityTvStartQuestionPackBuild_ === "function"
    ? realityTvStartQuestionPackBuild_(season, episode, enabledTypes)
    : null;
  if (questionBuild && !questionBuild.complete && typeof realityTvAdvanceQuestionPackBuild_ === "function") {
    questionBuild = realityTvAdvanceQuestionPackBuild_(questionBuild, Math.max(4, enabledTypes.length + 1), 22000);
  }
  return {
    success: true,
    seasonId: season.SeasonId,
    gameId: season.GameId,
    episodeId: episode.EpisodeId,
    mainAnswerCount: episode.answerCount || 0,
    questionBuild: questionBuild,
    complete: !questionBuild || questionBuild.complete,
    message: "The main exit question and its answers were repaired. Enabled extra questions are ready to be verified in short stages."
  };
}

function apiAdminAddRealityTvContestant(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");
  const name = realityTvString_(payload.name);
  if (!name) throw new Error("Contestant name is required.");
  const contestantId = realityTvSlug_(payload.contestantId || name);
  const existing = realityTvContestantsForSeason_(season.SeasonId).find(function(row) {
    return realityTvKey_(row.ContestantId) === realityTvKey_(contestantId);
  });
  if (existing) throw new Error("Contestant already exists: " + contestantId);
  const now = new Date();
  realityTvUpsertObject_(SpreadsheetApp.getActive(), REALITY_TV_CONTESTANTS_SHEET, REALITY_TV_CONTESTANT_HEADERS,
    ["SeasonId", "ContestantId"], {
      SeasonId: season.SeasonId,
      GameId: season.GameId,
      ContestantId: contestantId,
      Name: name,
      FullName: realityTvString_(payload.fullName || name),
      ImageUrl: realityTvString_(payload.imageUrl),
      TeamOrTribe: realityTvString_(payload.teamOrTribe),
      StartingGroup: realityTvString_(payload.teamOrTribe),
      CurrentGroup: realityTvString_(payload.teamOrTribe),
      FinalGroup: realityTvString_(payload.teamOrTribe),
      Member1: realityTvString_(payload.member1),
      Member2: realityTvString_(payload.member2),
      Relationship: realityTvString_(payload.relationship),
      Member1ImageUrl: realityTvString_(payload.member1ImageUrl),
      Member2ImageUrl: realityTvString_(payload.member2ImageUrl),
      TeamColor: realityTvString_(payload.teamColor),
      Age: realityTvString_(payload.age),
      Hometown: realityTvString_(payload.hometown),
      Occupation: realityTvString_(payload.occupation),
      Biography: realityTvString_(payload.biography),
      ExternalSubjectId: realityTvString_(payload.externalSubjectId || contestantId),
      Status: "ACTIVE",
      EliminatedEpisode: "",
      EliminatedAt: "",
      DisplayOrder: realityTvContestantsForSeason_(season.SeasonId).length + 1,
      Active: true,
      CreatedAt: now,
      UpdatedAt: now
    });
  const addedContestant = realityTvContestantsForSeason_(season.SeasonId).find(function(row) {
    return realityTvKey_(row.ContestantId) === realityTvKey_(contestantId);
  });
  realityTvSyncGroupsFromContestants_(season);
  realityTvEnsureContestantGroupHistory_(season, addedContestant ? [addedContestant] : []);
  return { success: true, message: "Contestant added. Existing episode questions were not changed." };
}


function apiAdminBulkAddRealityTvContestants(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");

  const items = realityTvParseJson_(payload.contestantsJSON || payload.contestants, []);
  if (!Array.isArray(items) || !items.length) throw new Error("Add at least one contestant.");
  if (items.length > 250) throw new Error("A maximum of 250 contestants can be added at once.");

  const existing = realityTvContestantsForSeason_(season.SeasonId);
  const usedIds = {};
  const usedNames = {};
  existing.forEach(function(row) {
    usedIds[realityTvKey_(row.ContestantId)] = true;
    usedNames[realityTvKey_(row.Name)] = true;
  });

  const existingOrders = existing.map(function(row) { return realityTvNumber_(row.DisplayOrder, 0); });
  let nextOrder = (existingOrders.length ? Math.max.apply(null, existingOrders) : 0) + 1;
  const now = new Date();
  const created = [];
  const skipped = [];
  const ss = SpreadsheetApp.getActive();

  items.forEach(function(item, index) {
    item = item || {};
    const name = realityTvString_(item.name || item.Name);
    if (!name) {
      skipped.push({ row: index + 1, reason: "Missing name" });
      return;
    }
    if (usedNames[realityTvKey_(name)]) {
      skipped.push({ name: name, reason: "Name already exists" });
      return;
    }

    const explicitId = realityTvString_(item.contestantId || item.ContestantId);
    let contestantId = realityTvSlug_(explicitId || name);
    if (usedIds[realityTvKey_(contestantId)]) {
      if (explicitId) {
        skipped.push({ name: name, reason: "Contestant ID already exists: " + contestantId });
        return;
      }
      const baseId = contestantId;
      let suffix = 2;
      while (usedIds[realityTvKey_(contestantId)]) contestantId = baseId + "-" + suffix++;
    }

    const contestant = {
      SeasonId: season.SeasonId,
      GameId: season.GameId,
      ContestantId: contestantId,
      Name: name,
      FullName: realityTvString_(item.fullName || item.FullName || name),
      ImageUrl: realityTvString_(item.imageUrl || item.ImageUrl),
      TeamOrTribe: realityTvString_(item.teamOrTribe || item.TeamOrTribe),
      StartingGroup: realityTvString_(item.teamOrTribe || item.TeamOrTribe),
      CurrentGroup: realityTvString_(item.teamOrTribe || item.TeamOrTribe),
      FinalGroup: realityTvString_(item.teamOrTribe || item.TeamOrTribe),
      Member1: realityTvString_(item.member1 || item.Member1),
      Member2: realityTvString_(item.member2 || item.Member2),
      Relationship: realityTvString_(item.relationship || item.Relationship),
      Member1ImageUrl: realityTvString_(item.member1ImageUrl || item.Member1ImageUrl),
      Member2ImageUrl: realityTvString_(item.member2ImageUrl || item.Member2ImageUrl),
      TeamColor: realityTvString_(item.teamColor || item.TeamColor),
      Age: realityTvString_(item.age || item.Age),
      Hometown: realityTvString_(item.hometown || item.Hometown),
      Occupation: realityTvString_(item.occupation || item.Occupation),
      Biography: realityTvString_(item.biography || item.Biography),
      ExternalSubjectId: realityTvString_(item.externalSubjectId || item.ExternalSubjectId || contestantId),
      Status: "ACTIVE",
      EliminatedEpisode: "",
      EliminatedAt: "",
      DisplayOrder: nextOrder++,
      Active: true,
      CreatedAt: now,
      UpdatedAt: now
    };

    realityTvUpsertObject_(ss, REALITY_TV_CONTESTANTS_SHEET, REALITY_TV_CONTESTANT_HEADERS,
      ["SeasonId", "ContestantId"], contestant);
    usedIds[realityTvKey_(contestantId)] = true;
    usedNames[realityTvKey_(name)] = true;
    created.push({ contestantId: contestantId, name: name });
  });

  if (!created.length) {
    throw new Error("No contestants were added. " + (skipped.length ? "All pasted rows were duplicates or invalid." : ""));
  }

  const createdIds = {};
  created.forEach(function(item) { createdIds[realityTvKey_(item.contestantId)] = true; });
  const createdRows = realityTvContestantsForSeason_(season.SeasonId).filter(function(row) {
    return !!createdIds[realityTvKey_(row.ContestantId)];
  });
  realityTvSyncGroupsFromContestants_(season);
  realityTvEnsureContestantGroupHistory_(season, createdRows);

  return {
    success: true,
    createdCount: created.length,
    skippedCount: skipped.length,
    created: created,
    skipped: skipped,
    message: created.length + " contestant" + (created.length === 1 ? "" : "s") + " added" +
      (skipped.length ? "; " + skipped.length + " duplicate or invalid row" + (skipped.length === 1 ? " was" : "s were") + " skipped." : ".") +
      " Existing episode questions were not changed."
  };
}

function apiAdminSubmitRealityTvResult(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  const episode = realityTvGetEpisode_(payload.episodeId);
  if (!season || !episode) throw new Error("Season or episode not found.");
  if (["FINAL", "CLOSED"].indexOf(realityTvString_(episode.Status).toUpperCase()) !== -1) {
    throw new Error("This episode is already finalized.");
  }

  const outcomeType = realityTvKey_(payload.outcomeType || "elimination");
  const selectedIds = realityTvParseJson_(payload.selectedContestantIdsJSON || payload.selectedContestantIds, [])
    .map(realityTvKey_).filter(Boolean);
  const validTypes = ["elimination", "double-elimination", "multiple-elimination", "no-elimination", "medical-withdrawal", "quit"];
  if (validTypes.indexOf(outcomeType) === -1) throw new Error("Unsupported outcome type.");
  if (outcomeType === "no-elimination" && selectedIds.length) throw new Error("No Elimination cannot include a contestant.");
  if (["elimination", "medical-withdrawal", "quit"].indexOf(outcomeType) !== -1 && selectedIds.length !== 1) {
    throw new Error("Select exactly one contestant for this result type.");
  }
  if (outcomeType === "double-elimination" && selectedIds.length !== 2) {
    throw new Error("Select exactly two contestants for a double elimination.");
  }
  if (outcomeType === "multiple-elimination" && selectedIds.length < 2) {
    throw new Error("Select at least two contestants for a multiple elimination.");
  }

  const contestants = realityTvContestantsForSeason_(season.SeasonId);
  const selected = selectedIds.map(function(id) {
    return contestants.find(function(row) { return realityTvKey_(row.ContestantId) === id; });
  });
  if (selected.some(function(row) { return !row; })) throw new Error("One or more selected contestants were not found.");

  const existingPending = realityTvQueueForSeason_(season.SeasonId).find(function(row) {
    return realityTvKey_(row.EpisodeId) === realityTvKey_(episode.EpisodeId) && realityTvKey_(row.ReviewStatus) === "pending";
  });
  if (existingPending) throw new Error("This episode already has a pending result awaiting review.");

  const now = new Date();
  const hubResult = realityTvCreateHubPendingResult_(season, episode, selected, outcomeType,
    realityTvString_(payload.evidenceUrl), realityTvString_(payload.notes));
  const queue = {
    QueueId: realityTvId_("rt-queue"),
    SeasonId: season.SeasonId,
    GameId: season.GameId,
    EpisodeId: episode.EpisodeId,
    EpisodeNumber: episode.EpisodeNumber,
    CategoryId: episode.CategoryId,
    OutcomeType: outcomeType,
    SelectedContestantIds: JSON.stringify(selectedIds),
    ReviewStatus: "PENDING",
    EvidenceUrl: realityTvString_(payload.evidenceUrl),
    Notes: realityTvString_(payload.notes),
    SubmittedBy: realityTvString_(payload.username),
    SubmittedAt: now,
    ReviewedBy: "",
    ReviewedAt: "",
    PushStatus: "NOT PUSHED",
    PushedAt: "",
    NextEpisodeId: "",
    HubImportedResultId: hubResult.importedResultId || "",
    HubReviewId: hubResult.reviewId || "",
    ErrorMessage: "",
    UpdatedAt: now
  };
  realityTvAppendObject_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_RESULTS_QUEUE_SHEET), queue);
  const episodeSheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODES_SHEET);
  realityTvUpdateObjectRow_(episodeSheet, episode.__rowNumber, {
    ResultQueueId: queue.QueueId,
    OutcomeType: outcomeType,
    Status: "REVIEW",
    UpdatedAt: now
  });
  return { success: true, message: "Result submitted for administrator review.", queueId: queue.QueueId };
}

function realityTvSettleEpisodeOnly_(season, episode, queue, reviewer) {
  const selectedIds = realityTvParseJson_(queue.SelectedContestantIds, []).map(realityTvKey_);
  const outcomeType = realityTvKey_(queue.OutcomeType);
  const contestants = realityTvContestantsForSeason_(season.SeasonId);
  const selected = contestants.filter(function(row) {
    return selectedIds.indexOf(realityTvKey_(row.ContestantId)) !== -1;
  });
  const setup = adminGetGameSetup({ gameId: season.GameId });
  const category = (setup.categories || []).find(function(item) {
    return realityTvKey_(item.categoryId) === realityTvKey_(episode.CategoryId);
  });
  if (!category) throw new Error("Episode question not found in Game Setup.");

  const isPush = outcomeType === "no-elimination" || outcomeType === "double-elimination" || outcomeType === "multiple-elimination";
  const winnerId = !isPush && selected.length === 1 ? selected[0].ContestantId : "";
  const resultPayloads = (category.nominees || []).map(function(nominee) {
    return {
      gameId: season.GameId,
      categoryId: episode.CategoryId,
      nomineeId: nominee.nomineeId,
      resultStatus: isPush ? "push" : "settled",
      isWinner: !isPush && realityTvKey_(nominee.nomineeId) === realityTvKey_(winnerId),
      resultValue: outcomeType,
      resultSource: "manual-reality-tv",
      notes: "Approved in Reality TV Season Manager by " + (reviewer || "administrator")
    };
  });

  if (typeof upsertCategoryResultsBulk_ === "function") {
    upsertCategoryResultsBulk_(resultPayloads);
  } else {
    resultPayloads.forEach(function(payload) { upsertCategoryResult_(payload); });
  }

  adminUpdateCategory({
    gameId: season.GameId,
    categoryId: episode.CategoryId,
    locked: true,
    winnerNomineeId: winnerId,
    settlementStatus: isPush ? "push" : "settled",
    resultSource: "manual-reality-tv",
    resultSourceType: "reality-tv",
    resultProvider: "manual-reality-tv",
    externalEventId: episode.ExternalEventId,
    externalMarketId: episode.ExternalMarketId,
    statKey: "eliminated",
    autoSettle: false,
    requireAdminReview: true,
    username: reviewer || "",
    notes: "Approved Reality TV result"
  });

  const now = new Date();
  const contestantSheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_CONTESTANTS_SHEET);
  const groupHistorySheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_GROUP_HISTORY_SHEET);
  selected.forEach(function(contestant) {
    const profile = realityTvContestantGroupProfile_(season.SeasonId, contestant.ContestantId);
    realityTvUpdateObjectRow_(contestantSheet, contestant.__rowNumber, {
      Status: outcomeType === "quit" ? "QUIT" : outcomeType === "medical-withdrawal" ? "WITHDRAWN" : "ELIMINATED",
      EliminatedEpisode: episode.EpisodeNumber,
      EliminatedAt: now,
      FinalGroup: profile.finalGroup || contestant.TeamOrTribe || "",
      Active: false,
      UpdatedAt: now
    });
    realityTvGroupHistoryForContestant_(season.SeasonId, contestant.ContestantId).forEach(function(assignment) {
      const start = realityTvNumber_(assignment.StartEpisode, 1);
      const end = realityTvNumber_(assignment.EndEpisode, 0);
      if (start <= realityTvNumber_(episode.EpisodeNumber, 0) && (!end || end >= realityTvNumber_(episode.EpisodeNumber, 0))) {
        realityTvUpdateObjectRow_(groupHistorySheet, assignment.__rowNumber, {
          EndEpisode: episode.EpisodeNumber,
          Active: false,
          UpdatedAt: now
        });
      }
    });
  });

  const episodeSheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODES_SHEET);
  realityTvUpdateObjectRow_(episodeSheet, episode.__rowNumber, {
    Status: "FINAL",
    OutcomeType: outcomeType,
    EliminatedContestantIds: JSON.stringify(selectedIds),
    UpdatedAt: now
  });

  if (typeof seasonAnchorSettleRealityEpisode_ === "function") {
    seasonAnchorSettleRealityEpisode_(season, episode, selectedIds, outcomeType, reviewer);
  }

  const remaining = realityTvContestantsForSeason_(season.SeasonId).filter(function(row) {
    return realityTvBool_(row.Active) && realityTvKey_(row.Status) === "active";
  });
  if (remaining.length <= 1) {
    const seasonSheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_SEASONS_SHEET);
    const freshSeason = realityTvGetSeason_(season.SeasonId);
    realityTvUpdateObjectRow_(seasonSheet, freshSeason.__rowNumber, { Status: "COMPLETE", UpdatedAt: now });
  }

  return {
    remainingCount: remaining.length,
    selectedIds: selectedIds,
    winnerId: winnerId,
    isPush: isPush
  };
}

function realityTvBuildNextEpisodeAfterApproval_(season, episode) {
  const freshSeason = realityTvGetSeason_(season.SeasonId);
  const freshEpisode = realityTvGetEpisode_(episode.EpisodeId);
  const remaining = realityTvContestantsForSeason_(season.SeasonId).filter(function(row) {
    return realityTvBool_(row.Active) && realityTvKey_(row.Status) === "active";
  });
  let nextEpisode = null;

  if (realityTvBool_(freshSeason.AutoCreateNextEpisode) && remaining.length > 1) {
    const nextNumber = realityTvNumber_(freshEpisode.EpisodeNumber, 0) + 1;
    nextEpisode = realityTvCreateEpisode_(freshSeason, nextNumber, { skipHubSync: true, skipQuestionPack: true });
    realityTvUpdateObjectRow_(
      SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODES_SHEET),
      freshEpisode.__rowNumber,
      { NextEpisodeCreated: true, UpdatedAt: new Date() }
    );
  }

  return { nextEpisode: nextEpisode, remainingCount: remaining.length };
}

function realityTvSyncApprovalHub_(season, episode, queue, reviewer, nextEpisode) {
  const warnings = [];
  let questionBuild = null;
  if (nextEpisode) {
    try {
      const contestants = realityTvContestantsForSeason_(season.SeasonId).filter(function(row) {
        return realityTvBool_(row.Active) && realityTvKey_(row.Status) === "active";
      });
      const question = realityTvFormatQuestion_(season.QuestionTemplate, nextEpisode.EpisodeNumber);
      const sync = realityTvSyncEpisodeToHub_(season, nextEpisode, contestants, question);
      if (sync && sync.error) warnings.push(sync.error);
      if (typeof realityTvStartQuestionPackBuild_ === "function" && typeof realityTvQuestionTemplatesForSeason_ === "function") {
        const enabledTypes = realityTvQuestionTemplatesForSeason_(season.SeasonId)
          .filter(function(row) { return realityTvBool_(row.Enabled); })
          .map(function(row) { return row.TemplateId; });
        if (enabledTypes.length) {
          questionBuild = realityTvStartQuestionPackBuild_(season, nextEpisode, enabledTypes);
          if (questionBuild && !questionBuild.complete && typeof realityTvAdvanceQuestionPackBuild_ === "function") {
            questionBuild = realityTvAdvanceQuestionPackBuild_(questionBuild, Math.max(4, enabledTypes.length + 1), 22000);
          }
        }
      }
    } catch (err) {
      warnings.push(err.message || String(err));
    }
  }

  try {
    realityTvUpdateHubReview_(
      queue,
      "APPROVED",
      reviewer,
      nextEpisode
        ? "Pushed to CategoryResults and created " + nextEpisode.EpisodeName + "."
        : "Pushed to CategoryResults."
    );
  } catch (err) {
    warnings.push(err.message || String(err));
  }

  return { warning: warnings.join(" | "), questionBuild: questionBuild };
}

function realityTvApprovalState_(queue) {
  const status = realityTvString_(queue.ReviewStatus).toUpperCase();
  const stage = realityTvString_(queue.ApprovalStage || (status === "APPROVED" ? "COMPLETE" : "SETTLE")).toUpperCase();
  return {
    success: true,
    queueId: queue.QueueId,
    reviewStatus: status,
    stage: stage,
    pushStatus: realityTvString_(queue.PushStatus),
    nextEpisodeId: realityTvString_(queue.NextEpisodeId),
    complete: status === "APPROVED" || stage === "COMPLETE",
    error: realityTvString_(queue.ErrorMessage)
  };
}

function apiAdminApproveRealityTvResult(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const queue = realityTvGetQueue_(payload.queueId);
  if (!queue) throw new Error("Review queue item not found.");

  const status = realityTvString_(queue.ReviewStatus).toUpperCase();
  if (status === "REJECTED") throw new Error("This result was rejected. Submit a corrected result.");
  if (status === "APPROVED") return realityTvApprovalState_(queue);
  if (status !== "PENDING" && status !== "APPROVING") {
    throw new Error("This result cannot be approved from its current status: " + status + ".");
  }

  if (status === "PENDING") {
    const now = new Date();
    const reviewer = realityTvString_(payload.username || "administrator");
    realityTvSpreadsheetRetry_("Queue Reality TV episode approval", function() {
      realityTvUpdateObjectRow_(
        SpreadsheetApp.getActive().getSheetByName(REALITY_TV_RESULTS_QUEUE_SHEET),
        queue.__rowNumber,
        {
          ReviewStatus: "APPROVING",
          ReviewedBy: reviewer,
          ReviewedAt: now,
          PushStatus: "QUEUED",
          ApprovalStage: "SETTLE",
          ApprovalStartedAt: now,
          ApprovalCompletedAt: "",
          ApprovalAttemptCount: realityTvNumber_(queue.ApprovalAttemptCount, 0),
          ErrorMessage: "",
          UpdatedAt: now
        }
      );
    }, 4);
  }

  return realityTvApprovalState_(realityTvGetQueue_(payload.queueId));
}

function apiAdminContinueRealityTvApproval(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();

  let queue = realityTvSpreadsheetRetry_("Read Reality TV approval", function() {
    return realityTvGetQueue_(payload.queueId);
  }, 4);
  if (!queue) throw new Error("Review queue item not found.");
  if (realityTvString_(queue.ReviewStatus).toUpperCase() === "PENDING") {
    apiAdminApproveRealityTvResult(payload);
    queue = realityTvSpreadsheetRetry_("Reload queued Reality TV approval", function() {
      return realityTvGetQueue_(payload.queueId);
    }, 4);
  }
  if (realityTvString_(queue.ReviewStatus).toUpperCase() === "APPROVED") return realityTvApprovalState_(queue);
  if (realityTvString_(queue.ReviewStatus).toUpperCase() !== "APPROVING") {
    throw new Error("This result is not awaiting approval processing.");
  }

  const stage = realityTvString_(queue.ApprovalStage || "SETTLE").toUpperCase();
  if (stage === "COMPLETE") return realityTvApprovalState_(queue);
  const processingStatus = stage === "SETTLE"
    ? "SETTLING EPISODE"
    : (stage === "BUILD_NEXT" ? "BUILDING NEXT EPISODE" : "SYNCING APPROVAL");
  const claim = realityTvClaimApprovalStage_({
    queueId: payload.queueId,
    stage: stage,
    processingStatus: processingStatus,
    sheetName: REALITY_TV_RESULTS_QUEUE_SHEET,
    getQueue: realityTvGetQueue_,
    notFoundMessage: "Review queue item not found.",
    busyMessage: "This episode approval stage is already running."
  });
  if (claim.busy) return claim;
  if (claim.changed) return apiAdminContinueRealityTvApproval(payload);
  queue = claim.queue;
  const attempts = claim.attempts;

  const season = realityTvSpreadsheetRetry_("Read Reality TV season for approval", function() {
    return realityTvGetSeason_(queue.SeasonId);
  }, 4);
  const episode = realityTvSpreadsheetRetry_("Read Reality TV episode for approval", function() {
    return realityTvGetEpisode_(queue.EpisodeId);
  }, 4);
  if (!season || !episode) throw new Error("Season or episode not found.");

  const queueSheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_RESULTS_QUEUE_SHEET);
  const reviewer = realityTvString_(queue.ReviewedBy || payload.username || "administrator");
  try {
    if (stage === "SETTLE") {
      const settlement = realityTvSpreadsheetRetry_("Settle Reality TV episode", function() {
        return realityTvSettleEpisodeOnly_(season, episode, queue, reviewer);
      }, 5);
      realityTvSpreadsheetRetry_("Advance Reality TV episode approval", function() {
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          PushStatus: "EPISODE SETTLED",
          ApprovalStage: "BUILD_NEXT",
          ErrorMessage: "",
          UpdatedAt: new Date()
        });
      }, 4);
      const state = realityTvApprovalState_(realityTvGetQueue_(queue.QueueId));
      state.remainingCount = settlement.remainingCount;
      state.message = "Episode settled. Preparing the next episode.";
      return state;
    }

    if (stage === "BUILD_NEXT") {
      const build = realityTvSpreadsheetRetry_("Build next Reality TV episode", function() {
        return realityTvBuildNextEpisodeAfterApproval_(season, episode);
      }, 5);
      realityTvSpreadsheetRetry_("Advance Reality TV next-episode approval", function() {
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          PushStatus: build.nextEpisode ? "NEXT EPISODE READY" : "EPISODE COMPLETE",
          ApprovalStage: "SYNC_HUB",
          NextEpisodeId: build.nextEpisode ? build.nextEpisode.EpisodeId : "",
          ErrorMessage: "",
          UpdatedAt: new Date()
        });
      }, 4);
      const state = realityTvApprovalState_(realityTvGetQueue_(queue.QueueId));
      state.nextEpisode = build.nextEpisode;
      state.remainingCount = build.remainingCount;
      state.message = build.nextEpisode
        ? build.nextEpisode.EpisodeName + " created. Finishing approval records."
        : "Episode settled. Finishing approval records.";
      return state;
    }

    if (stage === "SYNC_HUB") {
      const nextEpisode = queue.NextEpisodeId ? realityTvGetEpisode_(queue.NextEpisodeId) : null;
      const hub = realityTvSpreadsheetRetry_("Finish Reality TV approval", function() {
        return realityTvSyncApprovalHub_(season, episode, queue, reviewer, nextEpisode);
      }, 5);
      const completedAt = new Date();
      realityTvSpreadsheetRetry_("Complete Reality TV approval", function() {
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          ReviewStatus: "APPROVED",
          PushStatus: "PUSHED",
          PushedAt: completedAt,
          ApprovalStage: "COMPLETE",
          ApprovalCompletedAt: completedAt,
          ErrorMessage: hub.warning || "",
          UpdatedAt: completedAt
        });
      }, 4);
      const state = realityTvApprovalState_(realityTvGetQueue_(queue.QueueId));
      state.nextEpisode = nextEpisode;
      state.warning = hub.warning || "";
      state.questionBuild = hub.questionBuild || null;
      state.message = nextEpisode
        ? "Result approved, episode settled, and " + nextEpisode.EpisodeName + " created."
        : "Result approved and episode settled.";
      return state;
    }

    throw new Error("Unknown approval stage: " + stage + ".");
  } catch (err) {
    try {
      realityTvSpreadsheetRetry_("Record Reality TV approval error", function() {
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          PushStatus: "ERROR",
          ApprovalAttemptCount: attempts,
          ErrorMessage: err.message || String(err),
          UpdatedAt: new Date()
        });
      }, 3);
    } catch (recordError) {
      if (typeof Logger !== "undefined") Logger.log("Could not record Reality TV approval error: " + recordError);
    }
    throw err;
  }
}


function apiAdminRejectRealityTvResult(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const queue = realityTvGetQueue_(payload.queueId);
  if (!queue) throw new Error("Review queue item not found.");
  if (realityTvKey_(queue.ReviewStatus) !== "pending") throw new Error("This result is no longer pending.");
  const now = new Date();
  const reviewer = realityTvString_(payload.username || "administrator");
  realityTvUpdateObjectRow_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_RESULTS_QUEUE_SHEET), queue.__rowNumber, {
    ReviewStatus: "REJECTED",
    ReviewedBy: reviewer,
    ReviewedAt: now,
    PushStatus: "NOT PUSHED",
    ErrorMessage: realityTvString_(payload.notes),
    UpdatedAt: now
  });
  const episode = realityTvGetEpisode_(queue.EpisodeId);
  if (episode) {
    realityTvUpdateObjectRow_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODES_SHEET), episode.__rowNumber, {
      ResultQueueId: "",
      Status: "OPEN",
      UpdatedAt: now
    });
  }
  realityTvUpdateHubReview_(queue, "REJECTED", reviewer, realityTvString_(payload.notes || "Rejected in Reality TV Season Manager."));
  return { success: true, message: "Result rejected. The episode is open for a corrected result." };
}

function apiAdminCreateNextRealityTvEpisode(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");
  const episodes = realityTvEpisodesForSeason_(season.SeasonId);
  const nextNumber = episodes.length ? Math.max.apply(null, episodes.map(function(row) { return realityTvNumber_(row.EpisodeNumber, 0); })) + 1 : 1;
  const episode = realityTvCreateEpisode_(season, nextNumber);
  return { success: true, message: episode.EpisodeName + " created.", episode: episode };
}
