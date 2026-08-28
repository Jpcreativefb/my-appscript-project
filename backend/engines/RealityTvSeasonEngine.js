/* =========================
   REALITY TV SEASON MANAGER
   Production v1.2.4
========================= */

const REALITY_TV_SEASONS_SHEET = "RealitySeasons";
const REALITY_TV_CONTESTANTS_SHEET = "RealityContestants";
const REALITY_TV_EPISODES_SHEET = "RealityEpisodes";
const REALITY_TV_GROUPS_SHEET = "RealityGroups";
const REALITY_TV_GROUP_HISTORY_SHEET = "RealityContestantGroupHistory";
const REALITY_TV_RESULTS_QUEUE_SHEET = "RealityResultQueue";
const REALITY_TV_EPISODE_VOTES_SHEET = "RealityEpisodeVotes";
const REALITY_TV_NEXT_EPISODE_JOBS_SHEET = "RealityNextEpisodeJobs";
const REALITY_TV_INITIAL_SETUP_SOURCE_ID = "__season_setup__";
const REALITY_TV_HUB_PROPERTY = "EXTERNAL_RESULTS_HUB_SPREADSHEET_ID";
const REALITY_TV_CAST_IMPORT_SHEET = "RealityCastImport";
const REALITY_TV_SPOILER_SHEET = "RealitySpoilerShield";

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
  "ExternalSubjectId", "KnownFor", "OriginalShowOrSport", "RecruitNumber", "SourceUrl", "ImageSourceUrl", "ExitReason", "Status", "EliminatedEpisode", "EliminatedAt",
  "DisplayOrder", "Active", "CreatedAt", "UpdatedAt"
];

const REALITY_TV_CAST_IMPORT_HEADERS = [
  "Import", "ImportStatus", "SeasonId", "GameId", "ShowProfile", "ShowFormat", "ShowName", "SeasonName",
  "Name", "FullName", "ImageUrl", "TeamOrTribe", "TeamColor", "Member1", "Member1ImageUrl", "Member2", "Member2ImageUrl",
  "Relationship", "Age", "Hometown", "Occupation", "KnownFor", "OriginalShowOrSport", "RecruitNumber", "Biography",
  "ExternalSubjectId", "SourceUrl", "ImageSourceUrl", "AdminNotes", "ImportedAt", "LastError"
];

const REALITY_TV_EPISODE_HEADERS = [
  "SeasonId", "GameId", "EpisodeId", "EpisodeNumber", "EpisodeName",
  "AirDateTime", "LockDateTime", "CategoryId", "ExternalEventId",
  "ExternalMarketId", "OutcomeType", "Status", "EliminatedContestantIds", "ExitReasonsJSON",
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
  "OutcomeType", "SelectedContestantIds", "ExitReasonsJSON", "ReviewStatus", "EvidenceUrl", "Notes",
  "SubmittedBy", "SubmittedAt", "ReviewedBy", "ReviewedAt", "PushStatus",
  "ApprovalStage", "ApprovalStartedAt", "ApprovalCompletedAt", "ApprovalAttemptCount",
  "ApprovalStageStartedAt", "ApprovalHeartbeatAt", "ApprovalQuestionBuildId",
  "PushedAt", "NextEpisodeId", "HubImportedResultId", "HubReviewId",
  "EpisodeFinalizeMode", "ApprovalQuestionQueueIdsJSON", "ApprovalQuestionCompletedCount",
  "ApprovalQuestionTotalCount", "ApprovalCurrentQuestionQueueId", "ApprovalCurrentQuestionLabel",
  "ApprovalQuestionScoresRecalculated", "NextEpisodeJobId", "ErrorMessage", "UpdatedAt"
];

const REALITY_TV_NEXT_EPISODE_JOB_HEADERS = [
  "JobId", "SeasonId", "GameId", "SourceEpisodeId", "SourceEpisodeNumber",
  "TargetEpisodeNumber", "NextEpisodeId", "Status", "Stage", "ProgressLabel",
  "ProgressDetail", "AttemptCount", "HeartbeatAt", "NextAttemptAt", "QuestionBuildId",
  "ErrorMessage", "CreatedAt", "StartedAt", "CompletedAt", "UpdatedAt"
];

const REALITY_TV_SPOILER_HEADERS = [
  "Username", "GameId", "SeasonId", "EpisodeId", "EpisodeNumber",
  "RecordType", "ShieldEnabled", "Revealed", "RevealedAt", "CreatedAt", "UpdatedAt"
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
  const actual = realityTvString_(queue && queue.PushStatus).toUpperCase();
  const expected = realityTvString_(processingStatus).toUpperCase();
  const compatible = actual === expected || (
    expected === "BUILDING NEXT EPISODE" && [
      "PREPARING NEXT EPISODE",
      "CREATING MAIN QUESTION",
      "ADDING MAIN ANSWERS",
      "SAVING NEXT EPISODE"
    ].indexOf(actual) !== -1
  ) || (
    expected === "BUILDING EXTRA QUESTIONS" && [
      "COMPILING QUESTION PACK",
      "WRITING QUESTION PACK",
      "VERIFYING QUESTION PACK"
    ].indexOf(actual) !== -1
  );
  if (!compatible) return false;
  const heartbeatAt = new Date(queue && (queue.ApprovalHeartbeatAt || queue.UpdatedAt || queue.ApprovalStartedAt) || 0).getTime();
  // A full Apps Script stage can legitimately run for several minutes. Keep the
  // lease longer than the old two-minute window so the watchdog cannot start a
  // second worker while the first worker is still alive.
  const processingLeaseMs = 420000;
  return Number.isFinite(heartbeatAt) && heartbeatAt > 0 && (Date.now() - heartbeatAt) < processingLeaseMs;
}

function realityTvApprovalIsProcessingStatus_(value) {
  const status = realityTvString_(value).toUpperCase();
  return [
    "SETTLING EXTRA RESULTS",
    "SCORING EXTRA RESULTS",
    "SETTLING EPISODE",
    "BUILDING NEXT EPISODE",
    "PREPARING NEXT EPISODE",
    "CREATING MAIN QUESTION",
    "ADDING MAIN ANSWERS",
    "SAVING NEXT EPISODE",
    "BUILDING EXTRA QUESTIONS",
    "COMPILING QUESTION PACK",
    "WRITING QUESTION PACK",
    "VERIFYING QUESTION PACK",
    "FINALIZING EPISODE",
    "FINALIZING APPROVAL",
    "SYNCING APPROVAL"
  ].indexOf(status) !== -1 || status.indexOf("BUILDING QUESTIONS ") === 0;
}

function realityTvApprovalQueueOwner_() {
  const now = Date.now();
  const rows = realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_RESULTS_QUEUE_SHEET)
    .filter(function(row) {
      if (realityTvString_(row.ReviewStatus).toUpperCase() !== "APPROVING") return false;
      const pushStatus = realityTvString_(row.PushStatus).toUpperCase();
      // Any non-error APPROVING row is recoverable. Transitional checkpoints such as
      // EPISODE SETTLED must remain eligible for the next watchdog pass.
      return pushStatus !== "ERROR";
    })
    .sort(function(a, b) {
      const priority = function(row) {
        const pushStatus = realityTvString_(row.PushStatus).toUpperCase();
        if (realityTvApprovalIsProcessingStatus_(pushStatus)) {
          const heartbeat = new Date(row.ApprovalHeartbeatAt || row.UpdatedAt || row.ApprovalStartedAt || 0).getTime();
          return heartbeat && (now - heartbeat) < 180000 ? 0 : 2;
        }
        return 1; // queued/waiting work comes before stale abandoned processing
      };
      const diff = priority(a) - priority(b);
      if (diff) return diff;
      const aStarted = new Date(a.ApprovalStartedAt || a.ReviewedAt || a.UpdatedAt || 0).getTime() || 0;
      const bStarted = new Date(b.ApprovalStartedAt || b.ReviewedAt || b.UpdatedAt || 0).getTime() || 0;
      return aStarted - bStarted || realityTvNumber_(a.__rowNumber, 0) - realityTvNumber_(b.__rowNumber, 0);
    });
  return rows[0] || null;
}

function realityTvApprovalWaitingFor_(queue) {
  const owner = realityTvApprovalQueueOwner_();
  if (!owner || realityTvKey_(owner.QueueId) === realityTvKey_(queue && queue.QueueId)) return null;
  return owner;
}

function realityTvApprovalWaitingState_(queue, owner) {
  const state = realityTvApprovalState_(queue);
  state.busy = true;
  state.waiting = true;
  state.waitingForQueueId = realityTvString_(owner && owner.QueueId);
  state.waitingForSeasonId = realityTvString_(owner && owner.SeasonId);
  state.waitingForEpisodeNumber = realityTvNumber_(owner && owner.EpisodeNumber, 0);
  state.progressLabel = "Waiting for another approval";
  state.progressDetail = "Another Reality TV approval is using the shared game sheets. This approval will continue automatically when that one finishes.";
  state.estimatedRemainingSeconds = 0;
  state.stalled = false;
  state.message = state.progressDetail;
  return state;
}

function realityTvHasApprovalTrigger_() {
  if (typeof ScriptApp === "undefined" || typeof ScriptApp.getProjectTriggers !== "function") return false;
  return ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction && trigger.getHandlerFunction() === "realityTvContinuePendingApprovals";
  });
}

function realityTvHasApprovalKickTrigger_() {
  if (typeof ScriptApp === "undefined" || typeof ScriptApp.getProjectTriggers !== "function") return false;
  return ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction && trigger.getHandlerFunction() === "realityTvContinuePendingApprovalKick";
  });
}

function realityTvScheduleApprovalKick_() {
  try {
    if (typeof ScriptApp === "undefined" || realityTvHasApprovalKickTrigger_()) return false;
    ScriptApp.newTrigger("realityTvContinuePendingApprovalKick").timeBased().after(10000).create();
    return true;
  } catch (err) {
    if (typeof Logger !== "undefined") Logger.log("Reality TV approval fast-continuation warning: " + (err.message || err));
    return false;
  }
}

function realityTvScheduleApprovalContinuation_() {
  try {
    if (typeof ScriptApp === "undefined") return false;
    // Fast path: continue the next durable unit in about 10 seconds.
    realityTvScheduleApprovalKick_();
    // Safety net: a recurring watchdog survives a killed one-shot execution.
    if (realityTvHasApprovalTrigger_()) return false;
    const clock = ScriptApp.newTrigger("realityTvContinuePendingApprovals").timeBased();
    if (clock && typeof clock.everyMinutes === "function") clock.everyMinutes(1).create();
    else clock.after(60000).create();
    return true;
  } catch (err) {
    if (typeof Logger !== "undefined") Logger.log("Reality TV approval watchdog warning: " + (err.message || err));
    return false;
  }
}

function realityTvDeleteApprovalKickTriggers_() {
  if (typeof ScriptApp === "undefined" || typeof ScriptApp.getProjectTriggers !== "function") return;
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction && trigger.getHandlerFunction() === "realityTvContinuePendingApprovalKick") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function realityTvDeleteApprovalTriggers_() {
  if (typeof ScriptApp === "undefined" || typeof ScriptApp.getProjectTriggers !== "function") return;
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    const handler = trigger.getHandlerFunction ? trigger.getHandlerFunction() : "";
    if (handler === "realityTvContinuePendingApprovals" || handler === "realityTvContinuePendingApprovalKick") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
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
    const reviewStatus = realityTvString_(queue.ReviewStatus).toUpperCase();
    const currentStage = realityTvString_(queue.ApprovalStage || "SETTLE").toUpperCase();
    // Re-read under the lock before claiming. A stale worker must never reclaim
    // a queue that another worker has already approved or advanced.
    if (reviewStatus === "APPROVED" || currentStage === "COMPLETE") {
      return { success: true, changed: true, queue: queue };
    }
    if (reviewStatus !== "APPROVING") {
      return { success: true, changed: true, queue: queue };
    }
    if (currentStage !== realityTvString_(options.stage).toUpperCase()) {
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
        ApprovalHeartbeatAt: new Date(),
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
  realityTvGetOrCreateSheet_(ss, REALITY_TV_CAST_IMPORT_SHEET, REALITY_TV_CAST_IMPORT_HEADERS);
  realityTvGetOrCreateSheet_(ss, REALITY_TV_EPISODES_SHEET, REALITY_TV_EPISODE_HEADERS);
  realityTvGetOrCreateSheet_(ss, REALITY_TV_GROUPS_SHEET, REALITY_TV_GROUP_HEADERS);
  realityTvGetOrCreateSheet_(ss, REALITY_TV_GROUP_HISTORY_SHEET, REALITY_TV_GROUP_HISTORY_HEADERS);
  realityTvGetOrCreateSheet_(ss, REALITY_TV_RESULTS_QUEUE_SHEET, REALITY_TV_QUEUE_HEADERS);
  realityTvGetOrCreateSheet_(ss, REALITY_TV_EPISODE_VOTES_SHEET, REALITY_TV_EPISODE_VOTE_HEADERS);
  realityTvGetOrCreateSheet_(ss, REALITY_TV_NEXT_EPISODE_JOBS_SHEET, REALITY_TV_NEXT_EPISODE_JOB_HEADERS);
  realityTvGetOrCreateSheet_(ss, REALITY_TV_SPOILER_SHEET, REALITY_TV_SPOILER_HEADERS);
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
  if (typeof externalResultsBridgeEnqueue_ !== "function") {
    return { success: false, skipped: true, message: "External Results Hub bridge is not installed." };
  }
  const now = new Date();
  const status = realityTvKey_(episode.ScheduleStatus || episode.Status || "scheduled") === "tba"
    ? "delayed"
    : realityTvString_(episode.ScheduleStatus || episode.Status || "scheduled").toLowerCase();
  const supplementalMarkets = typeof realityTvEpisodeQuestionsForSeason_ === "function"
    ? realityTvEpisodeQuestionsForSeason_(season.SeasonId).filter(function(row) {
        return realityTvKey_(row.EpisodeId) === realityTvKey_(episode.EpisodeId);
      }).map(function(row) {
        return {
          Provider: "manual-reality-tv",
          ExternalMarketId: row.ExternalMarketId,
          ExternalEventId: episode.ExternalEventId,
          ClosingTime: episode.LockDateTime || "",
          LastUpdated: now,
          RawJSON: JSON.stringify({
            seasonId: season.SeasonId,
            episodeId: episode.EpisodeId,
            episodeQuestionId: row.EpisodeQuestionId,
            questionType: row.QuestionType,
            scheduleStatus: episode.ScheduleStatus || "SCHEDULED"
          })
        };
      })
    : [];
  return externalResultsBridgeEnqueue_(
    "UPSERT_EPISODE_SCHEDULE",
    episode.ExternalEventId || episode.EpisodeId,
    "manual-reality-tv",
    {
      event: {
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
      },
      market: {
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
      },
      markets: supplementalMarkets
    }
  );
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
  const scheduleDelta = oldAir && !Number.isNaN(oldAir.getTime()) && newAir && !Number.isNaN(newAir.getTime())
    ? realityTvScheduleDelta_(oldAir, newAir)
    : { dayOffset: 0, minuteOffset: 0 };
  const hasScheduleShift = !!(scheduleDelta.dayOffset || scheduleDelta.minuteOffset);

  const updated = [];
  updated.push(realityTvApplyEpisodeSchedule_(season, episode, {
    AirDateTime: airDateTime,
    LockDateTime: lockDateTime,
    ScheduleStatus: scheduleStatus,
    ScheduleNotes: payload.scheduleNotes || payload.ScheduleNotes || ""
  }));

  if (shiftFuture && hasScheduleShift && scheduleStatus !== "TBA") {
    const seasonAnchor = season.FirstEpisodeDateTime ? new Date(season.FirstEpisodeDateTime) : null;
    if (seasonAnchor && !Number.isNaN(seasonAnchor.getTime())) {
      const seasonSheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_SEASONS_SHEET);
      realityTvUpdateObjectRow_(seasonSheet, season.__rowNumber, {
        FirstEpisodeDateTime: realityTvShiftLocalSchedule_(seasonAnchor, scheduleDelta.dayOffset, scheduleDelta.minuteOffset),
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
        const shiftedFutureAir = realityTvShiftLocalSchedule_(futureAir, scheduleDelta.dayOffset, scheduleDelta.minuteOffset);
        updated.push(realityTvApplyEpisodeSchedule_(season, row, {
          AirDateTime: shiftedFutureAir,
          LockDateTime: futureLock && !Number.isNaN(futureLock.getTime())
            ? realityTvShiftLocalSchedule_(futureLock, scheduleDelta.dayOffset, scheduleDelta.minuteOffset)
            : new Date(shiftedFutureAir.getTime() - (realityTvNumber_(season.LockOffsetMinutes, 5) * 60000)),
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

  const refreshed = realityTvGetEpisode_(episode.EpisodeId) || episode;
  const active = realityTvContestantsForSeason_(season.SeasonId).filter(function(row) {
    return realityTvBool_(row.Active) && realityTvKey_(row.Status || "active") === "active";
  });
  realityTvSyncEpisodeToHub_(season, refreshed, active, question);
  return refreshed;
}

function realityTvShiftLocalSchedule_(value, dayOffset, minuteOffset) {
  const source = realityTvDate_(value, "Schedule date/time");
  if (!source) return null;
  const shifted = new Date(source.getTime());
  if (dayOffset) shifted.setDate(shifted.getDate() + Number(dayOffset || 0));
  if (minuteOffset) shifted.setMinutes(shifted.getMinutes() + Number(minuteOffset || 0));
  return shifted;
}

function realityTvScheduleDelta_(oldValue, newValue) {
  const oldDate = realityTvDate_(oldValue, "Original schedule date/time");
  const newDate = realityTvDate_(newValue, "New schedule date/time");
  if (!oldDate || !newDate) return { dayOffset: 0, minuteOffset: 0 };
  const oldDay = Date.UTC(oldDate.getFullYear(), oldDate.getMonth(), oldDate.getDate());
  const newDay = Date.UTC(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
  const dayOffset = Math.round((newDay - oldDay) / 86400000);
  const oldMinutes = (oldDate.getHours() * 60) + oldDate.getMinutes() + (oldDate.getSeconds() / 60) + (oldDate.getMilliseconds() / 60000);
  const newMinutes = (newDate.getHours() * 60) + newDate.getMinutes() + (newDate.getSeconds() / 60) + (newDate.getMilliseconds() / 60000);
  return { dayOffset: dayOffset, minuteOffset: newMinutes - oldMinutes };
}

function realityTvEpisodeTiming_(season, episodeNumber) {
  const first = realityTvDate_(season.FirstEpisodeDateTime, "First episode date/time");
  if (!first) throw new Error("First episode date/time is required.");
  const intervalDays = realityTvNumber_(season.WeeklyIntervalDays, 7);
  const air = realityTvShiftLocalSchedule_(first, (episodeNumber - 1) * intervalDays, 0);
  const lock = new Date(air.getTime() - (realityTvNumber_(season.LockOffsetMinutes, 5) * 60000));
  return { airDateTime: air, lockDateTime: lock };
}

function realityTvCreateEpisodeCheckpoint_(options, status) {
  if (options && typeof options.onCheckpoint === "function") {
    options.onCheckpoint(status);
  }
}

function realityTvEnsureMainEpisodeQuestion_(context, options) {
  options = options || {};
  const season = context.season;
  const episodeNumber = context.episodeNumber;
  const categoryId = context.categoryId;
  const question = context.question;
  const timing = context.timing;
  const periodLabel = context.periodLabel;
  const externalEventId = context.externalEventId;
  const externalMarketId = context.externalMarketId;
  const eliminationLayout = context.eliminationLayout;
  const eliminationAnswers = context.eliminationAnswers || [];
  const eligibleContestants = context.eligibleContestants || [];
  const profileByContestant = context.profileByContestant || {};
  let category = context.existingCategory || null;
  let createdCategory = false;

  realityTvCreateEpisodeCheckpoint_(options, "CREATING MAIN QUESTION");
  if (!category) {
    try {
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
        // Keep the main elimination/exit question last by default. Admins can
        // override the per-episode order without changing the season template.
        displayOrder: (episodeNumber * 100) + 990,
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
      category = { categoryId: categoryId, nominees: [] };
      createdCategory = true;
    } catch (err) {
      if (!/already exists/i.test(err && err.message ? err.message : String(err))) throw err;
      const setup = adminGetGameSetup({ gameId: season.GameId });
      category = (setup.categories || []).find(function(item) {
        return realityTvKey_(item.categoryId || item.id) === realityTvKey_(categoryId);
      }) || null;
      if (!category) throw err;
    }
  }

  if (!createdCategory) {
    const existingDisplayOrder = realityTvNumber_(category && category.displayOrder, 0);
    adminUpdateCategory({
      gameId: season.GameId,
      categoryId: categoryId,
      category: question,
      points: realityTvNumber_(season.Points, 1),
      maxChanges: realityTvPickRules_(season).maxChanges,
      changePenalty: realityTvPickRules_(season).changePenalty,
      lockDateTime: timing.lockDateTime,
      // Preserve an administrator's episode-specific reorder during recovery.
      displayOrder: existingDisplayOrder || ((episodeNumber * 100) + 990),
      layoutType: eliminationLayout
    });
  }

  realityTvCreateEpisodeCheckpoint_(options, "ADDING MAIN ANSWERS");
  const existingNomineeIds = {};
  (category.nominees || []).forEach(function(item) {
    existingNomineeIds[realityTvKey_(item.nomineeId || item.id)] = true;
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
        const answer = eliminationAnswers.find(function(item) {
          return realityTvKey_(item.contestant.ContestantId) === realityTvKey_(contestant.ContestantId);
        }) || {};
        const profile = profileByContestant[realityTvKey_(contestant.ContestantId)] ||
          realityTvContestantGroupProfile_(season.SeasonId, contestant.ContestantId);
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

  return {
    categoryId: categoryId,
    nomineeCount: eligibleContestants.length,
    nomineesCreated: missingContestants.length
  };
}

function realityTvCreateEpisode_(season, episodeNumber, options) {
  options = options || {};
  const ss = SpreadsheetApp.getActive();
  const existing = realityTvEpisodesForSeason_(season.SeasonId).find(function(row) {
    return realityTvNumber_(row.EpisodeNumber, 0) === episodeNumber;
  });
  if (existing && !options.repair) return existing;

  realityTvCreateEpisodeCheckpoint_(options, "PREPARING NEXT EPISODE");
  realityTvEnsureContestantGroupHistory_(season);
  const eligibleContestants = realityTvContestantsEligibleForEpisode_(season.SeasonId, episodeNumber);
  if (eligibleContestants.length < 2) {
    throw new Error("At least two eligible " + realityTvString_(season.ParticipantLabel || "participants").toLowerCase() + "s are required to create or repair " + realityTvString_(season.PeriodLabel || "period").toLowerCase() + " " + episodeNumber + ".");
  }

  const categoryId = existing && existing.CategoryId ? existing.CategoryId : "episode-" + episodeNumber + "-eliminated";
  let existingCategory = null;
  if (existing || options.repair) {
    const setup = adminGetGameSetup({ gameId: season.GameId });
    existingCategory = (setup.categories || []).find(function(item) {
      return realityTvKey_(item.categoryId || item.id) === realityTvKey_(categoryId);
    }) || null;
  }
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
  const eliminationImageSource = typeof realityTvNormalizeImageSource_ === "function"
    ? realityTvNormalizeImageSource_(season.EliminationImageSource || "roster")
    : realityTvKey_(season.EliminationImageSource || "roster");
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

  realityTvEnsureMainEpisodeQuestion_({
    season: season,
    episodeNumber: episodeNumber,
    categoryId: categoryId,
    question: question,
    timing: timing,
    periodLabel: periodLabel,
    externalEventId: externalEventId,
    externalMarketId: externalMarketId,
    eliminationLayout: eliminationLayout,
    eliminationAnswers: eliminationAnswers,
    eligibleContestants: eligibleContestants,
    existingCategory: existingCategory
  }, options);

  realityTvCreateEpisodeCheckpoint_(options, "SAVING NEXT EPISODE");
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
  if (typeof externalResultsBridgeEnqueue_ !== "function") {
    return { success: false, skipped: true, message: "External Results Hub bridge is not installed." };
  }
  const now = new Date();
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

  return externalResultsBridgeEnqueue_(
    "UPSERT_EPISODE_BUNDLE",
    episode.ExternalEventId || episode.EpisodeId,
    "manual-reality-tv",
    {
      event: {
        Provider: "manual-reality-tv",
        ExternalEventId: episode.ExternalEventId,
        EventName: season.ShowName + " " + episode.EpisodeName,
        EventType: "reality-tv",
        StartDate: episode.AirDateTime,
        EndDate: episode.AirDateTime,
        Status: realityTvString_(episode.Status || "scheduled").toLowerCase(),
        SourceUrl: "",
        LastUpdated: now,
        RawJSON: JSON.stringify({ seasonId: season.SeasonId, episodeId: episode.EpisodeId }),
        CreatedAt: now
      },
      market: {
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
      },
      subjects: subjectRows,
      mappings: mappingRows
    }
  );
}

function realityTvCreateHubPendingResult_(season, episode, selectedContestants, outcomeType, evidenceUrl, notes) {
  if (!realityTvGetHubId_() || typeof externalResultsBridgeEnqueue_ !== "function") {
    return { importedResultId: "", reviewId: "", skipped: true };
  }
  const now = new Date();
  const names = selectedContestants.map(function(item) { return item.Name; });
  const resultValue = outcomeType === "no-elimination" ? "NO ELIMINATION" : names.join(", ");
  const importedResultId = realityTvId_("rt-result");
  const reviewId = realityTvId_("rt-review");
  const fingerprint = ["manual-reality-tv", episode.ExternalEventId, episode.ExternalMarketId, resultValue]
    .join("|").toLowerCase();
  const queued = externalResultsBridgeEnqueue_(
    "CREATE_RESULT_REVIEW",
    importedResultId,
    "manual-reality-tv",
    {
      importedResult: {
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
        RawJSON: JSON.stringify({
          seasonId: season.SeasonId,
          episodeId: episode.EpisodeId,
          outcomeType: outcomeType,
          winnerContestantIds: selectedContestants.map(function(item) { return item.ContestantId; })
        }),
        ReviewStatus: "PENDING",
        ReviewRequired: true,
        SourceFingerprint: fingerprint,
        CreatedAt: now,
        UpdatedAt: now
      },
      review: {
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
      }
    }
  );
  return {
    importedResultId: importedResultId,
    reviewId: reviewId,
    queued: !!(queued && queued.success),
    skipped: !!(queued && queued.skipped),
    error: queued && queued.error ? queued.error : ""
  };
}

function realityTvUpdateHubReview_(queue, reviewStatus, reviewer, message) {
  if (!realityTvGetHubId_() || !queue.HubReviewId || typeof externalResultsBridgeEnqueue_ !== "function") {
    return { success: false, skipped: true };
  }
  const now = new Date();
  return externalResultsBridgeEnqueue_(
    "UPDATE_REVIEW",
    queue.HubReviewId,
    "manual-reality-tv",
    {
      review: {
        ReviewId: queue.HubReviewId,
        ImportedResultId: queue.HubImportedResultId || "",
        Provider: "manual-reality-tv",
        ReviewStatus: reviewStatus,
        ReviewedBy: reviewer || "",
        ReviewedAt: now,
        PushStatus: reviewStatus === "APPROVED" ? "PUSHED" : "NOT PUSHED",
        PushedAt: reviewStatus === "APPROVED" ? now : "",
        PushMessage: message || "",
        UpdatedAt: now
      },
      importedResult: queue.HubImportedResultId ? {
        ImportedResultId: queue.HubImportedResultId,
        Provider: "manual-reality-tv",
        ReviewStatus: reviewStatus,
        ReviewRequired: true,
        UpdatedAt: now
      } : null
    }
  );
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

function realityTvGroupHistoryByContestant_(history) {
  const byContestant = {};
  (history || []).forEach(function(row) {
    const key = realityTvKey_(row.ContestantId);
    if (!key) return;
    if (!byContestant[key]) byContestant[key] = [];
    byContestant[key].push(row);
  });
  return byContestant;
}

function realityTvContestantGroupProfileFromRows_(season, history) {
  const named = (history || []).filter(function(row) { return realityTvString_(row.GroupName); });
  const currentEpisode = Math.max(1, realityTvNumber_(season && season.CurrentEpisodeNumber, 1));
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

function realityTvContestantGroupProfilesFromHistory_(season, history) {
  const byContestant = realityTvGroupHistoryByContestant_(history);
  const profiles = {};
  Object.keys(byContestant).forEach(function(key) {
    profiles[key] = realityTvContestantGroupProfileFromRows_(season, byContestant[key]);
  });
  return profiles;
}

function realityTvContestantGroupProfile_(seasonId, contestantId) {
  const season = realityTvGetSeason_(seasonId) || {};
  return realityTvContestantGroupProfileFromRows_(season, realityTvGroupHistoryForContestant_(seasonId, contestantId));
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
  const groups = realityTvGroupsForSeason_(season.SeasonId);
  const groupByName = {};
  groups.forEach(function(group) {
    groupByName[realityTvKey_(group.GroupName)] = group;
  });
  rows.forEach(function(contestant) {
    const contestantId = realityTvString_(contestant.ContestantId);
    const groupName = realityTvString_(contestant.TeamOrTribe || contestant.CurrentGroup || contestant.StartingGroup);
    if (!contestantId || !groupName || existingByContestant[realityTvKey_(contestantId)]) return;
    const group = groupByName[realityTvKey_(groupName)] || {};
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

function realityTvContestantsEligibleFromRows_(rows, episodeNumber) {
  const episode = Math.max(1, realityTvNumber_(episodeNumber, 1));
  return (rows || []).filter(function(row) {
    const eliminated = realityTvNumber_(row.EliminatedEpisode, 0);
    const status = realityTvKey_(row.Status || "active");
    const hasActiveFlag = row.Active !== undefined && row.Active !== null && realityTvString_(row.Active) !== "";
    const active = hasActiveFlag ? realityTvBool_(row.Active) : status === "active";
    const exitedThisEpisode = eliminated === episode;
    if (eliminated && eliminated < episode) return false;
    if (!active && !exitedThisEpisode) return false;
    if (["withdrawn", "quit", "disqualified"].indexOf(status) !== -1 && !exitedThisEpisode) return false;
    return true;
  });
}

function realityTvContestantsEligibleForEpisode_(seasonId, episodeNumber) {
  return realityTvContestantsEligibleFromRows_(realityTvContestantsForSeason_(seasonId), episodeNumber);
}

function realityTvGroupAssignmentsForEpisode_(seasonId, episodeNumber) {
  const season = realityTvGetSeason_(seasonId);
  if (!season) return {};
  const contestants = realityTvContestantsEligibleForEpisode_(seasonId, episodeNumber);
  const history = realityTvEnsureContestantGroupHistory_(season, contestants);
  const historyByContestant = realityTvGroupHistoryByContestant_(history);
  const episode = Math.max(1, realityTvNumber_(episodeNumber, 1));
  const assignments = {};
  contestants.forEach(function(contestant) {
    const matches = (historyByContestant[realityTvKey_(contestant.ContestantId)] || []).filter(function(row) {
      const start = Math.max(1, realityTvNumber_(row.StartEpisode, 1));
      const end = realityTvNumber_(row.EndEpisode, 0);
      return start <= episode && (!end || end >= episode);
    });
    const assignment = matches.length ? matches[matches.length - 1] : null;
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

function realityTvHasSeasonForGameCached_(gameId) {
  const gameKey = realityTvKey_(gameId);
  if (!gameKey) return false;

  const cacheKey = "rtv_season_game_ids_v1";
  let lookup = null;

  if (typeof CacheService !== "undefined") {
    try {
      const cached = CacheService.getScriptCache().get(cacheKey);
      if (cached) lookup = JSON.parse(cached);
    } catch (ignore) {
      lookup = null;
    }
  }

  if (!lookup || typeof lookup !== "object") {
    lookup = {};
    try {
      const ss = SpreadsheetApp.getActive();
      const sheet = ss.getSheetByName(REALITY_TV_SEASONS_SHEET);
      if (sheet && sheet.getLastRow() > 1 && sheet.getLastColumn() > 0) {
        const values = sheet.getDataRange().getValues();
        const headers = values[0].map(function(value) { return realityTvString_(value); });
        const gameIdCol = headers.indexOf("GameId");
        if (gameIdCol !== -1) {
          for (let index = 1; index < values.length; index += 1) {
            const rowGameKey = realityTvKey_(values[index][gameIdCol]);
            if (rowGameKey) lookup[rowGameKey] = true;
          }
        }
      }
    } catch (readError) {
      // If the quick lookup fails, fall through to the normal Reality TV read
      // rather than incorrectly hiding a real season.
      return true;
    }

    if (typeof CacheService !== "undefined") {
      try {
        CacheService.getScriptCache().put(cacheKey, JSON.stringify(lookup), 1800);
      } catch (ignoreCacheWrite) {}
    }
  }

  return lookup[gameKey] === true;
}

function realityTvSpoilerRowsForUser_(username, gameId) {
  if (!username || !gameId) return [];
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(REALITY_TV_SPOILER_SHEET);
  if (!sheet) return [];
  return realityTvReadObjects_(ss, REALITY_TV_SPOILER_SHEET).filter(function(row) {
    return realityTvKey_(row.Username) === realityTvKey_(username) &&
      realityTvKey_(row.GameId) === realityTvKey_(gameId);
  });
}

function realityTvSpoilerPreference_(username, gameId) {
  const row = realityTvSpoilerRowsForUser_(username, gameId).find(function(item) {
    return realityTvKey_(item.RecordType) === "preference";
  });
  // Reality Spoiler Shield is protective by default for a new player/game.
  // An existing explicit preference row remains authoritative, including an
  // explicit opt-out (ShieldEnabled=false).
  return row ? realityTvBool_(row.ShieldEnabled) : true;
}

function realityTvSpoilerPreferenceMap_(usernames, gameId) {
  const wanted = {};
  (usernames || []).forEach(function(username) {
    const key = realityTvKey_(username);
    if (key) wanted[key] = true;
  });
  if (!Object.keys(wanted).length || !gameId) return wanted;
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(REALITY_TV_SPOILER_SHEET);
  if (!sheet) return wanted;
  realityTvReadObjects_(ss, REALITY_TV_SPOILER_SHEET).forEach(function(row) {
    const username = realityTvKey_(row.Username);
    if (!Object.prototype.hasOwnProperty.call(wanted, username)) return;
    if (realityTvKey_(row.GameId) !== realityTvKey_(gameId) || realityTvKey_(row.RecordType) !== "preference") return;
    wanted[username] = realityTvBool_(row.ShieldEnabled);
  });
  return wanted;
}

function realityTvSpoilerStateFromRows_(username, gameId, seasonId, episodes, rows) {
  const userRows = (rows || []).filter(function(row) {
    return realityTvKey_(row.Username) === realityTvKey_(username) && realityTvKey_(row.GameId) === realityTvKey_(gameId);
  });
  const preference = userRows.find(function(row) { return realityTvKey_(row.RecordType) === "preference"; });
  const enabled = preference ? realityTvBool_(preference.ShieldEnabled) : true;
  // EpisodeNumber on an explicit preference row is the latest already-final
  // episode when the shield was enabled. A player with no preference row is
  // a new/default-on player and therefore protects every unrevealed final
  // episode for this game (hideAfter=0). Explicit opt-out remains authoritative.
  const hideAfterEpisodeNumber = enabled && preference
    ? Math.max(0, realityTvNumber_(preference.EpisodeNumber, 0))
    : 0;
  const revealed = {};
  userRows.forEach(function(row) {
    if (realityTvKey_(row.RecordType) !== "reveal" || !realityTvBool_(row.Revealed)) return;
    revealed[realityTvKey_(row.EpisodeId)] = true;
  });
  const hiddenEpisodeIds = [];
  (episodes || []).forEach(function(episode) {
    if (!enabled || realityTvKey_(episode.status || episode.Status) !== "final") return;
    const episodeNumber = realityTvNumber_(episode.episodeNumber !== undefined ? episode.episodeNumber : episode.EpisodeNumber, 0);
    if (episodeNumber && episodeNumber <= hideAfterEpisodeNumber) return;
    const id = realityTvKey_(episode.episodeId || episode.EpisodeId);
    if (id && !revealed[id]) hiddenEpisodeIds.push(id);
  });
  const hiddenEpisodeNumbers = (episodes || []).filter(function(episode) {
    return hiddenEpisodeIds.indexOf(realityTvKey_(episode.episodeId || episode.EpisodeId)) !== -1;
  }).map(function(episode) {
    return realityTvNumber_(episode.episodeNumber !== undefined ? episode.episodeNumber : episode.EpisodeNumber, 0);
  }).filter(function(number) { return number > 0; }).sort(function(a, b) { return a - b; });
  return {
    enabled: enabled,
    explicitPreference: !!preference,
    seasonId: realityTvString_(seasonId),
    hideAfterEpisodeNumber: hideAfterEpisodeNumber,
    hiddenEpisodeIds: hiddenEpisodeIds,
    hiddenEpisodeNumbers: hiddenEpisodeNumbers,
    blockingEpisodeNumber: hiddenEpisodeNumbers.length ? hiddenEpisodeNumbers[0] : 0,
    hasHiddenResults: hiddenEpisodeIds.length > 0
  };
}

function realityTvSpoilerState_(username, gameId, seasonId, episodes) {
  return realityTvSpoilerStateFromRows_(username, gameId, seasonId, episodes, realityTvSpoilerRowsForUser_(username, gameId));
}

function realityTvSpoilerStateForGame_(username, gameId) {
  if (!username || !gameId) return { enabled: false, hiddenEpisodeIds: [], hasHiddenResults: false };
  const seasons = realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_SEASONS_SHEET).filter(function(row) {
    return realityTvKey_(row.GameId) === realityTvKey_(gameId);
  });
  const season = seasons.length ? seasons[seasons.length - 1] : null;
  if (!season) return { enabled: false, hiddenEpisodeIds: [], hasHiddenResults: false };
  const episodes = realityTvEpisodesForSeason_(season.SeasonId);
  return realityTvSpoilerState_(username, gameId, season.SeasonId, episodes);
}

function realityTvSpoilerHiddenCategoryIds_(view) {
  const hidden = {};
  const state = view && view.spoilerShield || {};
  (state.hiddenEpisodeIds || []).forEach(function(id) { hidden[realityTvKey_(id)] = true; });
  const categoryIds = {};
  (view && view.episodes || []).forEach(function(episode) {
    if (hidden[realityTvKey_(episode.episodeId)] && episode.categoryId) categoryIds[realityTvKey_(episode.categoryId)] = true;
  });
  (view && view.episodeQuestions || []).forEach(function(question) {
    if (hidden[realityTvKey_(question.episodeId)] && question.categoryId) categoryIds[realityTvKey_(question.categoryId)] = true;
  });
  return categoryIds;
}

function realityTvApplySpoilerShield_(payload, spoilerState) {
  payload.spoilerShield = spoilerState || { enabled: true, hiddenEpisodeIds: [], hasHiddenResults: false };
  const hidden = {};
  (payload.spoilerShield.hiddenEpisodeIds || []).forEach(function(id) { hidden[realityTvKey_(id)] = true; });
  (payload.episodes || []).forEach(function(episode) {
    if (!hidden[realityTvKey_(episode.episodeId)]) return;
    episode.resultsHidden = true;
    episode.voteDetails = null;
    episode.eliminated = [];
  });
  (payload.episodeQuestions || []).forEach(function(question) {
    if (hidden[realityTvKey_(question.episodeId)]) {
      question.resultsHidden = true;
      question.status = "HIDDEN";
    }
  });
  if (payload.spoilerShield.hasHiddenResults === true) {
    // The core participant list reflects the newest authoritative roster. Do
    // not send that changed roster while an earlier elimination is hidden;
    // doing so would reveal the result before the player chooses to reveal it.
    payload.participants = [];
    payload.rosterHiddenBySpoiler = true;
  }
  return payload;
}

function realityTvSpoilerBlockedCategoryIds_(view) {
  const state = view && view.spoilerShield || {};
  const blockingEpisodeNumber = realityTvNumber_(state.blockingEpisodeNumber, 0);
  const blocked = {};
  if (!blockingEpisodeNumber || state.hasHiddenResults !== true) return blocked;
  (view.episodes || []).forEach(function(episode) {
    if (realityTvNumber_(episode.episodeNumber, 0) > blockingEpisodeNumber && episode.categoryId) {
      blocked[realityTvKey_(episode.categoryId)] = realityTvNumber_(episode.episodeNumber, 0);
    }
  });
  (view.episodeQuestions || []).forEach(function(question) {
    if (realityTvNumber_(question.episodeNumber, 0) > blockingEpisodeNumber && question.categoryId) {
      blocked[realityTvKey_(question.categoryId)] = realityTvNumber_(question.episodeNumber, 0);
    }
  });
  return blocked;
}

function realityTvSpoilerBlocksCategory_(username, gameId, categoryId) {
  if (!username || !gameId || !categoryId) return null;
  const view = realityTvUserGameViewPayload_(gameId, username, { includePlayerStats: false });
  if (!view || view.enabled !== true || !(view.spoilerShield && view.spoilerShield.hasHiddenResults === true)) return null;
  const blocked = realityTvSpoilerBlockedCategoryIds_(view);
  const episodeNumber = blocked[realityTvKey_(categoryId)] || 0;
  if (!episodeNumber) return null;
  return {
    blocked: true,
    episodeNumber: episodeNumber,
    blockingEpisodeNumber: realityTvNumber_(view.spoilerShield.blockingEpisodeNumber, 0),
    spoilerShield: view.spoilerShield
  };
}

function realityTvClearSpoilerUserCaches_(username, gameId) {
  if (typeof CacheService === "undefined") return;
  try {
    const cache = CacheService.getScriptCache();
    if (typeof appStartupPayloadCacheKey_ === "function") cache.remove(appStartupPayloadCacheKey_(username, gameId));
    if (typeof appDashboardCacheKey_ === "function") cache.remove(appDashboardCacheKey_(username));
    cache.remove("rtv_player_stats_" + realityTvSlug_(gameId) + "_" + realityTvSlug_(username));
  } catch (ignoreCache) {}
}

function apiSaveRealityTvSpoilerPreference(payload) {
  payload = payload || {};
  const username = realityTvString_(payload.username);
  const gameId = realityTvString_(payload.gameId);
  const token = realityTvString_(payload.token);
  if (!username || !gameId) throw new Error("Username and Game ID are required.");
  if (!token) throw new Error("Session expired. Please log in again.");
  if (typeof validateUserSession_ === "function") validateUserSession_(username, token);
  realityTvEnsureSystem_();
  const season = realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_SEASONS_SHEET).find(function(row) {
    return realityTvKey_(row.GameId) === realityTvKey_(gameId);
  });
  if (!season) throw new Error("Reality TV season not found.");
  const prior = realityTvSpoilerRowsForUser_(username, gameId).find(function(row) { return realityTvKey_(row.RecordType) === "preference"; });
  const enabled = realityTvBool_(payload.enabled);
  const episodes = realityTvEpisodesForSeason_(season.SeasonId);
  const latestFinalEpisodeNumber = episodes.reduce(function(maxValue, episode) {
    return realityTvKey_(episode.Status) === "final"
      ? Math.max(maxValue, realityTvNumber_(episode.EpisodeNumber, 0))
      : maxValue;
  }, 0);
  // No preference row means the player is already protected by the new
  // default-on contract. Saving On for the first time must not silently mark
  // already-hidden episodes as watched/revealed.
  const priorEnabled = prior ? realityTvBool_(prior.ShieldEnabled) : true;
  const priorHideAfterEpisodeNumber = prior
    ? Math.max(0, realityTvNumber_(prior.EpisodeNumber, latestFinalEpisodeNumber))
    : 0;
  const hideAfterEpisodeNumber = enabled && priorEnabled
    ? priorHideAfterEpisodeNumber
    : latestFinalEpisodeNumber;
  const now = new Date();
  realityTvUpsertObject_(SpreadsheetApp.getActive(), REALITY_TV_SPOILER_SHEET, REALITY_TV_SPOILER_HEADERS,
    ["Username", "GameId", "EpisodeId"], {
      Username: username, GameId: gameId, SeasonId: season.SeasonId, EpisodeId: "__preference__", EpisodeNumber: hideAfterEpisodeNumber,
      RecordType: "PREFERENCE", ShieldEnabled: enabled, Revealed: "", RevealedAt: "",
      CreatedAt: prior && prior.CreatedAt ? prior.CreatedAt : now, UpdatedAt: now
    });
  realityTvClearSpoilerUserCaches_(username, gameId);
  return { success: true, enabled: realityTvBool_(payload.enabled) };
}

function apiRevealRealityTvEpisode(payload) {
  payload = payload || {};
  const username = realityTvString_(payload.username);
  const gameId = realityTvString_(payload.gameId);
  const episodeId = realityTvString_(payload.episodeId);
  const token = realityTvString_(payload.token);
  if (!username || !gameId || !episodeId) throw new Error("Username, Game ID, and Episode ID are required.");
  if (!token) throw new Error("Session expired. Please log in again.");
  if (typeof validateUserSession_ === "function") validateUserSession_(username, token);
  realityTvEnsureSystem_();
  const episode = realityTvGetEpisode_(episodeId);
  if (!episode || realityTvKey_(episode.GameId) !== realityTvKey_(gameId)) throw new Error("Reality TV episode not found.");
  const prior = realityTvSpoilerRowsForUser_(username, gameId).find(function(row) {
    return realityTvKey_(row.RecordType) === "reveal" && realityTvKey_(row.EpisodeId) === realityTvKey_(episodeId);
  });
  const now = new Date();
  realityTvUpsertObject_(SpreadsheetApp.getActive(), REALITY_TV_SPOILER_SHEET, REALITY_TV_SPOILER_HEADERS,
    ["Username", "GameId", "EpisodeId"], {
      Username: username, GameId: gameId, SeasonId: episode.SeasonId, EpisodeId: episodeId, EpisodeNumber: episode.EpisodeNumber,
      RecordType: "REVEAL", ShieldEnabled: "", Revealed: true, RevealedAt: now,
      CreatedAt: prior && prior.CreatedAt ? prior.CreatedAt : now, UpdatedAt: now
    });
  realityTvClearRuntimeCaches_(gameId, episode.SeasonId);
  realityTvClearSpoilerUserCaches_(username, gameId);
  return { success: true, episodeId: episodeId, revealed: true };
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
    // Most Awards/Sports/standard games have no Reality TV season. Avoid
    // opening every Reality TV support sheet just to discover that fact.
    if (!realityTvHasSeasonForGameCached_(gameId)) {
      return { enabled: false };
    }

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
        finalizedAt: isFinal ? (row.UpdatedAt || row.AirDateTime || "") : "",
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

    const episodeQuestions = realityTvRowsForSeasonReadOnly_(allEpisodeQuestions, season.SeasonId).filter(function(row) {
      return row.Enabled === "" || row.Enabled === undefined || realityTvBool_(row.Enabled);
    }).map(function(row) {
      return {
        episodeId: realityTvString_(row.EpisodeId),
        episodeNumber: realityTvNumber_(row.EpisodeNumber, 0),
        categoryId: realityTvString_(row.CategoryId),
        questionType: realityTvString_(row.QuestionType),
        layoutType: realityTvString_(row.LayoutType || "auto"),
        imageSource: realityTvString_(row.ImageSource || "auto"),
        enabled: true,
        displayOrder: realityTvNumber_(row.DisplayOrder, 999),
        status: realityTvString_(row.Status || "OPEN").toUpperCase()
      };
    }).sort(function(a, b) {
      return a.episodeNumber - b.episodeNumber || a.displayOrder - b.displayOrder;
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
          CacheService.getScriptCache().put(coreCacheKey, serialized, 1800);
        }
      } catch (cacheWriteError) {
        Logger.log("Reality TV user core cache write skipped: " + cacheWriteError);
      }
    }
  }

  const payload = JSON.parse(JSON.stringify(corePayload));
  if (payload.enabled === true) {
    realityTvApplySpoilerShield_(payload, realityTvSpoilerState_(username, gameId, payload.season.seasonId, payload.episodes));
  }
  if (includePlayerStats && payload.enabled === true && !(payload.spoilerShield && payload.spoilerShield.hasHiddenResults)) {
    payload.playerStats = realityTvPlayerStatsPayload_(
      { GameId: payload.season.gameId, SeasonId: payload.season.seasonId },
      payload.episodes,
      payload.episodeQuestions,
      username
    );
    payload.playerStatsDeferred = false;
  } else if (includePlayerStats && payload.spoilerShield && payload.spoilerShield.hasHiddenResults) {
    payload.playerStats = null;
    payload.playerStatsDeferred = false;
    payload.playerStatsHiddenBySpoiler = true;
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
  if (core.spoilerShield && core.spoilerShield.hasHiddenResults) {
    return { success: true, enabled: true, hiddenBySpoiler: true, playerStats: null, spoilerShield: core.spoilerShield };
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
      if (serialized.length < 95000) CacheService.getScriptCache().put(cacheKey, serialized, 1800);
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
  if (episode && episode.resultsHidden) {
    return { enabled: true, available: false, hiddenBySpoiler: true, episodeId: episode.episodeId, message: "Episode results are hidden by Spoiler Shield until you mark it watched." };
  }
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
  if (typeof externalResultsBridgeEnsureSystem_ === "function") externalResultsBridgeEnsureSystem_();
  const sheets = [REALITY_TV_SEASONS_SHEET, REALITY_TV_CONTESTANTS_SHEET, REALITY_TV_EPISODES_SHEET, REALITY_TV_GROUPS_SHEET, REALITY_TV_GROUP_HISTORY_SHEET, REALITY_TV_RESULTS_QUEUE_SHEET, REALITY_TV_EPISODE_VOTES_SHEET];
  if (typeof REALITY_TV_QUESTION_TEMPLATES_SHEET !== "undefined") {
    sheets.push(REALITY_TV_QUESTION_TEMPLATES_SHEET, REALITY_TV_EPISODE_QUESTIONS_SHEET, REALITY_TV_QUESTION_QUEUE_SHEET);
    if (typeof REALITY_TV_QUESTION_BUILD_JOBS_SHEET !== "undefined") sheets.push(REALITY_TV_QUESTION_BUILD_JOBS_SHEET);
  }
  if (typeof SEASON_ANCHOR_SETTINGS_SHEET !== "undefined") {
    sheets.push(SEASON_ANCHOR_SETTINGS_SHEET, SEASON_ANCHOR_USERS_SHEET, SEASON_ANCHOR_HISTORY_SHEET);
  }
  if (typeof EXTERNAL_RESULTS_BRIDGE_OUTBOX_SHEET !== "undefined") {
    sheets.push(EXTERNAL_RESULTS_BRIDGE_OUTBOX_SHEET, EXTERNAL_RESULTS_BRIDGE_INBOX_SHEET);
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
  if (typeof externalResultsBridgeEnsureSystem_ === "function") externalResultsBridgeEnsureSystem_();
  const health = typeof externalResultsBridgeHealth_ === "function"
    ? externalResultsBridgeHealth_()
    : null;
  return {
    success: true,
    message: "External Results Hub connected. New Hub writes will use the background bridge.",
    spreadsheetId: id,
    spreadsheetName: hub.getName(),
    bridgeHealth: health
  };
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
  const nextEpisodeJobs = realityTvReadObjects_(ss, REALITY_TV_NEXT_EPISODE_JOBS_SHEET);

  const index = {};
  function bucket(seasonId) {
    const key = realityTvKey_(seasonId);
    if (!index[key]) index[key] = {
      contestants: 0, groups: 0, episodes: [], episodeQuestions: 0, pendingReviews: 0, setupJob: null
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
  nextEpisodeJobs.forEach(function(row) {
    if (realityTvKey_(row.SourceEpisodeId) !== realityTvKey_(REALITY_TV_INITIAL_SETUP_SOURCE_ID)) return;
    const data = bucket(row.SeasonId);
    const prior = data.setupJob;
    if (!prior || new Date(row.UpdatedAt || row.CreatedAt || 0).getTime() >= new Date(prior.UpdatedAt || prior.CreatedAt || 0).getTime()) {
      data.setupJob = row;
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
      setupJob: data.setupJob ? realityTvNextEpisodeJobState_(data.setupJob) : null,
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
  const allNextEpisodeJobs = realityTvReadObjects_(ss, REALITY_TV_NEXT_EPISODE_JOBS_SHEET);
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
  const queue = realityTvRowsForSeasonReadOnly_(allQueue, seasonId).map(function(row) {
    if (realityTvString_(row.ReviewStatus).toUpperCase() !== "APPROVING") return row;
    const progress = realityTvApprovalProgress_(row);
    return Object.assign({}, row, {
      ApprovalProgressPercent: progress.percent,
      ApprovalProgressLabel: progress.label,
      ApprovalProgressDetail: progress.detail,
      ApprovalElapsedSeconds: progress.elapsedSeconds,
      ApprovalEstimatedRemainingSeconds: progress.estimatedRemainingSeconds,
      ApprovalStalled: progress.stalled,
      ApprovalQuestionDone: progress.questionDone,
      ApprovalQuestionTotal: progress.questionTotal
    });
  }).sort(function(a, b) {
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
  const nextEpisodeJobs = realityTvRowsForSeasonReadOnly_(allNextEpisodeJobs, seasonId).sort(function(a, b) {
    return new Date(b.UpdatedAt || b.CreatedAt || 0).getTime() - new Date(a.UpdatedAt || a.CreatedAt || 0).getTime();
  }).map(function(row) {
    return Object.assign({}, row, { state: realityTvNextEpisodeJobState_(row) });
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

  const currentMainCategory = currentEpisode && Array.isArray(currentGameSetupCategories)
    ? currentGameSetupCategories.find(function(row) {
        return realityTvKey_(row.categoryId || row.id) === realityTvKey_(currentEpisode.CategoryId);
      }) || null
    : null;
  const currentEpisodeBaseOrder = currentEpisode ? realityTvNumber_(currentEpisode.EpisodeNumber, 0) * 100 : 0;
  const currentMainFullOrder = currentMainCategory ? realityTvNumber_(currentMainCategory.displayOrder, 0) : 0;
  const currentEpisodeEliminationDisplayOrder = currentMainFullOrder
    ? Math.max(1, currentMainFullOrder - currentEpisodeBaseOrder)
    : 990;

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
    nextEpisodeJobs: nextEpisodeJobs,
    setupJob: (nextEpisodeJobs.find(function(job) { return realityTvKey_(job.SourceEpisodeId) === realityTvKey_(REALITY_TV_INITIAL_SETUP_SOURCE_ID); }) || {}).state || null,
    currentEpisodeEliminationDisplayOrder: currentEpisodeEliminationDisplayOrder,
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
    episodeVotes: episodeVotes.length,
    nextEpisodeJobs: nextEpisodeJobs.length
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

  const hubId = realityTvGetHubId_();
  return {
    success: true,
    hubConfigured: !!hubId,
    hubSpreadsheetId: hubId,
    hubSpreadsheetName: "",
    hubError: "",
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
  if (existingSeason) {
    const currentEpisode = existingEpisodes.find(function(row) {
      return realityTvNumber_(row.EpisodeNumber, 0) === realityTvNumber_(existingSeason.CurrentEpisodeNumber, 1);
    }) || existingEpisodes[0] || null;
    if (currentEpisode) {
      return {
        success: true,
        accepted: true,
        queued: false,
        duplicate: true,
        message: "This Reality TV season already exists. Open Manage Cast / Participants or Season Settings to continue managing it; use Repair / Build Current Episode only if its question setup is incomplete.",
        gameId: existingSeason.GameId,
        seasonId: existingSeason.SeasonId,
        episode: currentEpisode,
        setupJob: realityTvNextEpisodeJobState_(realityTvLatestInitialSetupJob_(existingSeason.SeasonId)),
        questionBuild: typeof realityTvLatestQuestionBuildStateForSeason_ === "function" ? realityTvLatestQuestionBuildStateForSeason_(existingSeason.SeasonId, currentEpisode.EpisodeId) : null
      };
    }
    const existingSetup = realityTvQueueInitialEpisodePreparation_(existingSeason);
    return {
      success: true,
      accepted: true,
      queued: true,
      duplicate: true,
      message: "The interrupted Reality TV season setup was repaired and re-queued. Episode 1 setup will resume in the background.",
      gameId: existingSeason.GameId,
      seasonId: existingSeason.SeasonId,
      episode: null,
      setupJob: existingSetup.state,
      questionBuild: null
    };
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
      KnownFor: realityTvString_(item.knownFor || item.KnownFor),
      OriginalShowOrSport: realityTvString_(item.originalShowOrSport || item.OriginalShowOrSport),
      RecruitNumber: realityTvString_(item.recruitNumber || item.RecruitNumber),
      SourceUrl: realityTvString_(item.sourceUrl || item.SourceUrl),
      ImageSourceUrl: realityTvString_(item.imageSourceUrl || item.ImageSourceUrl),
      ExitReason: "",
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
  if (payload.castDraftSeasonId) realityTvFinalizeCastDraftForSeason_(payload.castDraftSeasonId, createdSeason);
  const setup = realityTvQueueInitialEpisodePreparation_(createdSeason);
  // Node/local regression harnesses do not provide Apps Script triggers. Complete the
  // durable setup job inline only in that non-production environment so legacy runtime
  // tests still exercise the fully materialized season. Production always returns the
  // accepted/queued response below and lets the trigger own the long work.
  if (typeof ScriptApp === "undefined") {
    let setupState = setup.state;
    let guard = 0;
    while (setupState && !setupState.complete && !setupState.needsAttention && guard < 4) {
      setupState = realityTvContinueNextEpisodeJob_(setupState.jobId);
      guard += 1;
    }
    const episode = realityTvEpisodesForSeason_(createdSeason.SeasonId).find(function(row) {
      return realityTvNumber_(row.EpisodeNumber, 0) === 1;
    }) || null;
    const localQuestionBuild = episode && typeof realityTvLatestQuestionBuildStateForSeason_ === "function"
      ? realityTvLatestQuestionBuildStateForSeason_(seasonId, episode.EpisodeId)
      : null;
    return {
      success: true, accepted: true, queued: false,
      message: "Reality TV season and Episode 1 were created in the local test harness.",
      gameId: gameId, seasonId: seasonId, episode: episode, setupJob: setupState,
      // The production worker uses the bulk materializer and therefore may not create
      // a legacy staged-build row. Keep old Node/runtime fixtures compatible by
      // reporting the already-complete durable setup as a completed question build.
      questionBuild: localQuestionBuild || (setupState && setupState.complete ? {
        buildId: realityTvString_(setupState.questionBuildId),
        complete: true,
        currentIndex: 0,
        totalCount: 0,
        results: []
      } : null),
      game: gameResult
    };
  }
  return {
    success: true,
    accepted: true,
    queued: true,
    message: "Season and cast saved. Episode 1 and its question pack are queued in the background; you can leave this page and follow progress from the season card.",
    gameId: gameId,
    seasonId: seasonId,
    episode: null,
    setupJob: setup.state,
    questionBuild: null,
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
      KnownFor: realityTvString_(item.knownFor || item.KnownFor),
      OriginalShowOrSport: realityTvString_(item.originalShowOrSport || item.OriginalShowOrSport),
      RecruitNumber: realityTvString_(item.recruitNumber || item.RecruitNumber),
      SourceUrl: realityTvString_(item.sourceUrl || item.SourceUrl),
      ImageSourceUrl: realityTvString_(item.imageSourceUrl || item.ImageSourceUrl),
      ExitReason: "",
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



function apiAdminUpdateRealityTvContestant(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");
  const contestantId = realityTvString_(payload.contestantId);
  if (!contestantId) throw new Error("Participant ID is required.");
  const contestants = realityTvContestantsForSeason_(season.SeasonId);
  const existing = contestants.find(function(row) { return realityTvKey_(row.ContestantId) === realityTvKey_(contestantId); });
  if (!existing) throw new Error("Participant not found.");
  const name = realityTvString_(payload.name);
  if (!name) throw new Error("Participant / team name is required.");
  const externalSubjectId = realityTvString_(payload.externalSubjectId || existing.ExternalSubjectId || existing.ContestantId);
  const duplicateExternal = contestants.find(function(row) {
    return realityTvKey_(row.ContestantId) !== realityTvKey_(contestantId) &&
      externalSubjectId && realityTvKey_(row.ExternalSubjectId) === realityTvKey_(externalSubjectId);
  });
  if (duplicateExternal) throw new Error("External Subject ID is already used by " + realityTvString_(duplicateExternal.Name || duplicateExternal.ContestantId) + ".");
  const duplicateName = contestants.find(function(row) {
    return realityTvKey_(row.ContestantId) !== realityTvKey_(contestantId) && realityTvKey_(row.Name) === realityTvKey_(name);
  });
  if (duplicateName) throw new Error("Another participant already uses the name " + name + ".");
  const updates = {
    Name: name,
    FullName: realityTvString_(payload.fullName || name),
    ImageUrl: realityTvString_(payload.imageUrl),
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
    KnownFor: realityTvString_(payload.knownFor),
    OriginalShowOrSport: realityTvString_(payload.originalShowOrSport),
    RecruitNumber: realityTvString_(payload.recruitNumber),
    SourceUrl: realityTvString_(payload.sourceUrl),
    ImageSourceUrl: realityTvString_(payload.imageSourceUrl),
    ExternalSubjectId: externalSubjectId,
    UpdatedAt: new Date()
  };
  realityTvUpdateObjectRow_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_CONTESTANTS_SHEET), existing.__rowNumber, updates);
  realityTvClearRuntimeCaches_(season.GameId, season.SeasonId);
  return { success: true, seasonId: season.SeasonId, contestantId: contestantId, message: "Participant details updated. Existing episode results and historical group assignments were not changed." };
}

function apiAdminSaveRealityTvSeasonSettings(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");
  const currentEpisode = Math.max(1, realityTvNumber_(season.CurrentEpisodeNumber, 1));
  const individualStart = Math.max(0, realityTvNumber_(payload.individualPlayStartsEpisode, season.IndividualPlayStartsEpisode || 0));
  if (individualStart && individualStart < currentEpisode) {
    throw new Error("Individual play start cannot be moved before the current episode. Historical episode format is frozen.");
  }
  const updates = {
    ParticipantLabel: realityTvString_(payload.participantLabel || season.ParticipantLabel),
    GroupLabel: realityTvString_(payload.groupLabel || season.GroupLabel),
    PeriodLabel: realityTvString_(payload.periodLabel || season.PeriodLabel),
    WeeklyIntervalDays: Math.max(1, realityTvNumber_(payload.weeklyIntervalDays, season.WeeklyIntervalDays || 7)),
    LockOffsetMinutes: Math.max(0, realityTvNumber_(payload.lockOffsetMinutes, season.LockOffsetMinutes || 5)),
    Points: Math.max(0, realityTvNumber_(payload.points, season.Points || 0)),
    QuestionTemplate: realityTvString_(payload.questionTemplate || season.QuestionTemplate),
    EliminationLayoutType: typeof realityTvNormalizeLayoutType_ === "function" ? realityTvNormalizeLayoutType_(payload.eliminationLayoutType || season.EliminationLayoutType || "auto") : realityTvString_(payload.eliminationLayoutType || season.EliminationLayoutType || "auto"),
    EliminationImageSource: typeof realityTvNormalizeImageSource_ === "function" ? realityTvNormalizeImageSource_(payload.eliminationImageSource || season.EliminationImageSource || "roster") : realityTvString_(payload.eliminationImageSource || season.EliminationImageSource || "roster"),
    IndividualPlayStartsEpisode: individualStart,
    AutoCreateNextEpisode: payload.autoCreateNextEpisode === undefined ? realityTvBool_(season.AutoCreateNextEpisode) : realityTvBool_(payload.autoCreateNextEpisode),
    UpdatedAt: new Date()
  };
  realityTvUpdateObjectRow_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_SEASONS_SHEET), season.__rowNumber, updates);
  realityTvClearRuntimeCaches_(season.GameId, season.SeasonId);
  return {
    success: true,
    seasonId: season.SeasonId,
    message: "Season settings saved. Show format, participant type, Game ID, and existing episode timing/results remain frozen; schedule/scoring changes apply to newly created episodes unless separately edited."
  };
}

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

/* REALITY CAST DRAFT SWITCH v1.2.18v4 */
function realityTvCastImportSheetUrl_(spreadsheet, sheet, rangeA1) {
  const rangePart = realityTvString_(rangeA1);
  return spreadsheet.getUrl() + "#gid=" + sheet.getSheetId() + (rangePart ? "&range=" + encodeURIComponent(rangePart) : "");
}

/* REALITY CAST STAGING FORWARD FIX v1.2.18v2 */
function realityTvCastImportIdentityPresent_(row) {
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

  const firstPreparedRow = seasonRows.length
    ? seasonRows.reduce(function(first, row) { return Math.min(first, realityTvNumber_(row.__rowNumber, first)); }, realityTvNumber_(seasonRows[0].__rowNumber, 2))
    : 2;
  try { sheet.setActiveRange(sheet.getRange(firstPreparedRow, 1)); } catch (ignore) { /* deep link below is enough */ }

  return {
    sheet: sheet,
    sheetUrl: realityTvCastImportSheetUrl_(ss, sheet, "A" + firstPreparedRow),
    profile: profile,
    adoptedCount: adoptedCount,
    preparedRowCount: seasonRows.length,
    firstPreparedRow: firstPreparedRow
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

function realityTvCastImportMergedValue_(incoming, existing) {
  const value = realityTvString_(incoming);
  return value ? value : realityTvString_(existing);
}

function realityTvCastImportTargetKey_(existingMatch, item) {
  if (existingMatch && realityTvString_(existingMatch.ContestantId)) {
    return "contestant:" + realityTvKey_(existingMatch.ContestantId);
  }
  const identity = realityTvKey_(item && (item.externalSubjectId || item.name));
  return identity ? "new:" + identity : "";
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
    const match = item.name ? realityTvCastImportExisting_(existing, item) : null;
    const key = realityTvCastImportTargetKey_(match, item);
    if (key && seen[key]) validation.errors.push("Duplicate staging row targeting " + item.name + ".");
    if (key) seen[key] = true;
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

  // v1.2.18v4: a new show/season must never inherit the prior create-form draft id.
  // Reuse a staging block only when its server-owned routing metadata matches
  // the current Game + Show + Season + Format; otherwise create a deterministic
  // show-aware draft id. This also lets an admin switch back to a prior draft.
  const generatedDraftSeasonId = "draft-" + realityTvSlug_([gameId, showName, seasonName, year, format.id].join("-"));
  let draftSeasonId = generatedDraftSeasonId;
  try {
    const rows = realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_CAST_IMPORT_SHEET);
    const existingDraft = rows.find(function(row) {
      const rowSeasonId = realityTvString_(row.SeasonId);
      if (realityTvKey_(rowSeasonId).indexOf("draft-") !== 0) return false;
      return realityTvKey_(row.GameId) === realityTvKey_(gameId) &&
        realityTvKey_(row.ShowName) === realityTvKey_(showName) &&
        realityTvKey_(row.SeasonName) === realityTvKey_(seasonName) &&
        realityTvKey_(row.ShowFormat) === realityTvKey_(format.id);
    });
    if (existingDraft) draftSeasonId = realityTvString_(existingDraft.SeasonId) || generatedDraftSeasonId;
  } catch (ignore) {
    draftSeasonId = generatedDraftSeasonId;
  }
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
    const match = realityTvCastImportExisting_(existing, item);
    const duplicateKey = realityTvCastImportTargetKey_(match, item);
    if (duplicateKey && seen[duplicateKey]) validation.errors.push("Duplicate selected staging row targeting the same cast entry.");
    if (duplicateKey) seen[duplicateKey] = true;
    if (validation.errors.length) {
      errorCount += 1;
      resultsByRow[row.__rowNumber] = { status: "ERROR", error: validation.errors.join(" ") };
      return;
    }

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
      ImageUrl: realityTvCastImportMergedValue_(item.imageUrl, base.ImageUrl),
      Member1: realityTvCastImportMergedValue_(item.member1, base.Member1),
      Member2: realityTvCastImportMergedValue_(item.member2, base.Member2),
      Relationship: realityTvCastImportMergedValue_(item.relationship, base.Relationship),
      Member1ImageUrl: realityTvCastImportMergedValue_(item.member1ImageUrl, base.Member1ImageUrl),
      Member2ImageUrl: realityTvCastImportMergedValue_(item.member2ImageUrl, base.Member2ImageUrl),
      TeamColor: realityTvCastImportMergedValue_(item.teamColor, base.TeamColor),
      Age: realityTvCastImportMergedValue_(item.age, base.Age),
      Hometown: realityTvCastImportMergedValue_(item.hometown, base.Hometown),
      Occupation: realityTvCastImportMergedValue_(item.occupation, base.Occupation),
      Biography: realityTvCastImportMergedValue_(item.biography, base.Biography),
      KnownFor: realityTvCastImportMergedValue_(item.knownFor, base.KnownFor),
      OriginalShowOrSport: realityTvCastImportMergedValue_(item.originalShowOrSport, base.OriginalShowOrSport),
      RecruitNumber: realityTvCastImportMergedValue_(item.recruitNumber, base.RecruitNumber),
      SourceUrl: realityTvCastImportMergedValue_(item.sourceUrl, base.SourceUrl),
      ImageSourceUrl: realityTvCastImportMergedValue_(item.imageSourceUrl, base.ImageSourceUrl),
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

function realityTvValidateEpisodeResultSelection_(season, episode, outcomeType, selectedIds, contestants) {
  const type = realityTvKey_(outcomeType || "elimination");
  const ids = (Array.isArray(selectedIds) ? selectedIds : []).map(realityTvKey_).filter(Boolean);
  const uniqueIds = ids.filter(function(id, index, all) { return all.indexOf(id) === index; });
  if (uniqueIds.length !== ids.length) {
    throw new Error("The same contestant cannot be selected more than once in an episode result.");
  }

  const validTypes = ["elimination", "double-elimination", "multiple-elimination", "no-elimination", "medical-withdrawal", "quit"];
  if (validTypes.indexOf(type) === -1) throw new Error("Unsupported outcome type.");
  if (type === "no-elimination" && uniqueIds.length) throw new Error("No Elimination cannot include a contestant.");
  if (["elimination", "medical-withdrawal", "quit"].indexOf(type) !== -1 && uniqueIds.length !== 1) {
    throw new Error("Select exactly one contestant for this result type.");
  }
  if (type === "double-elimination" && uniqueIds.length !== 2) {
    throw new Error("Select exactly two contestants for a double elimination.");
  }
  if (type === "multiple-elimination" && uniqueIds.length < 2) {
    throw new Error("Select at least two contestants for a multiple elimination.");
  }

  const rows = Array.isArray(contestants) ? contestants : realityTvContestantsForSeason_(season.SeasonId);
  const byId = {};
  rows.forEach(function(row) { byId[realityTvKey_(row.ContestantId)] = row; });
  const selected = uniqueIds.map(function(id) { return byId[id] || null; });
  if (selected.some(function(row) { return !row; })) throw new Error("One or more selected contestants were not found.");

  const eligibleRows = realityTvContestantsEligibleFromRows_(rows, realityTvNumber_(episode && episode.EpisodeNumber, 1));
  const eligibleLookup = {};
  eligibleRows.forEach(function(row) {
    eligibleLookup[realityTvKey_(row.ContestantId)] = true;
  });
  const ineligible = selected.filter(function(row) { return !eligibleLookup[realityTvKey_(row.ContestantId)]; });
  if (ineligible.length) {
    throw new Error("One or more selected contestants are not eligible for this episode result.");
  }
  return { outcomeType: type, selectedIds: uniqueIds, selected: selected, eligibleCount: eligibleRows.length };
}

function realityTvValidateRemainingContestantsAfterResult_(selection, episode, contestants, options) {
  options = options || {};
  selection = selection || {};
  if (selection.outcomeType === "no-elimination" || !selection.selectedIds || !selection.selectedIds.length) return selection;
  const selectedLookup = {};
  selection.selectedIds.forEach(function(id) { selectedLookup[realityTvKey_(id)] = true; });
  const activeRows = (Array.isArray(contestants) ? contestants : []).filter(function(row) {
    const status = realityTvKey_(row.Status || "active");
    const hasActiveFlag = row.Active !== undefined && row.Active !== null && realityTvString_(row.Active) !== "";
    const active = hasActiveFlag ? realityTvBool_(row.Active) : status === "active";
    return active && status === "active";
  });
  const selectedActiveCount = activeRows.filter(function(row) {
    return !!selectedLookup[realityTvKey_(row.ContestantId)];
  }).length;
  if (!options.allowAllRemaining && activeRows.length && selectedActiveCount >= activeRows.length) {
    throw new Error("This result would remove every remaining contestant. Leave at least one active contestant; an all-exit finale requires an explicit finale workflow.");
  }
  return selection;
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

  const requestedOutcomeType = realityTvKey_(payload.outcomeType || "elimination");
  const requestedIds = realityTvParseJson_(payload.selectedContestantIdsJSON || payload.selectedContestantIds, []);
  const contestants = realityTvContestantsForSeason_(season.SeasonId);
  const selection = realityTvValidateRemainingContestantsAfterResult_(
    realityTvValidateEpisodeResultSelection_(season, episode, requestedOutcomeType, requestedIds, contestants),
    episode,
    contestants
  );
  const outcomeType = selection.outcomeType;
  const selectedIds = selection.selectedIds;
  const selected = selection.selected;
  const exitReasonsInput = realityTvParseJson_(payload.exitReasonsJSON || payload.exitReasons, {});
  const exitReasons = {};
  selectedIds.forEach(function(id) {
    exitReasons[id] = realityTvNormalizeExitReason_(exitReasonsInput && exitReasonsInput[id], outcomeType);
  });

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
    ExitReasonsJSON: JSON.stringify(exitReasons),
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
  const outcomeType = realityTvKey_(queue.OutcomeType);
  const exitReasons = realityTvParseJson_(queue.ExitReasonsJSON, {});
  const contestants = realityTvContestantsForSeason_(season.SeasonId);
  const selection = realityTvValidateRemainingContestantsAfterResult_(
    realityTvValidateEpisodeResultSelection_(
      season,
      episode,
      outcomeType,
      realityTvParseJson_(queue.SelectedContestantIds, []),
      contestants
    ),
    episode,
    contestants
  );
  const selectedIds = selection.selectedIds;
  const selected = selection.selected;
  const setup = adminGetGameSetup({ gameId: season.GameId });
  const category = (setup.categories || []).find(function(item) {
    return realityTvKey_(item.categoryId) === realityTvKey_(episode.CategoryId);
  });
  if (!category) throw new Error("Episode question not found in Game Setup.");

  // A no-elimination episode pushes the prediction because there is no correct
  // eliminated contestant. Double or larger eliminations are different: every
  // contestant who leaves is a valid winning answer and receives normal points.
  const isPush = outcomeType === "no-elimination";
  const winnerIds = isPush ? [] : selected.map(function(row) { return row.ContestantId; });
  const winnerLookup = {};
  winnerIds.forEach(function(id) { winnerLookup[realityTvKey_(id)] = true; });
  const winnerId = winnerIds.length === 1 ? winnerIds[0] : "";
  const resultPayloads = (category.nominees || []).map(function(nominee) {
    return {
      gameId: season.GameId,
      categoryId: episode.CategoryId,
      nomineeId: nominee.nomineeId,
      resultStatus: isPush ? "push" : "settled",
      isWinner: !isPush && winnerLookup[realityTvKey_(nominee.nomineeId)] === true,
      resultValue: outcomeType,
      resultSource: "manual-reality-tv",
      notes: winnerIds.length > 1
        ? "Approved as one of multiple eliminated winners in Reality TV Season Manager by " + (reviewer || "administrator")
        : "Approved in Reality TV Season Manager by " + (reviewer || "administrator")
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
    notes: winnerIds.length > 1
      ? "Approved Reality TV result with multiple eliminated winners"
      : "Approved Reality TV result"
  });

  const now = new Date();
  const contestantSheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_CONTESTANTS_SHEET);
  const groupHistorySheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_GROUP_HISTORY_SHEET);
  selected.forEach(function(contestant) {
    const profile = realityTvContestantGroupProfile_(season.SeasonId, contestant.ContestantId);
    realityTvUpdateObjectRow_(contestantSheet, contestant.__rowNumber, {
      ExitReason: realityTvNormalizeExitReason_(exitReasons[realityTvKey_(contestant.ContestantId)] || exitReasons[contestant.ContestantId], outcomeType),
      Status: realityTvStatusForExitReason_(exitReasons[realityTvKey_(contestant.ContestantId)] || exitReasons[contestant.ContestantId], outcomeType),
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
    ExitReasonsJSON: JSON.stringify(exitReasons),
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
    winnerIds: winnerIds,
    isPush: isPush
  };
}

function realityTvBuildNextEpisodeAfterApproval_(season, episode, onCheckpoint) {
  const freshSeason = realityTvGetSeason_(season.SeasonId);
  const freshEpisode = realityTvGetEpisode_(episode.EpisodeId);
  const remaining = realityTvContestantsForSeason_(season.SeasonId).filter(function(row) {
    return realityTvBool_(row.Active) && realityTvKey_(row.Status) === "active";
  });
  let nextEpisode = null;

  if (realityTvBool_(freshSeason.AutoCreateNextEpisode) && remaining.length > 1) {
    const nextNumber = realityTvNumber_(freshEpisode.EpisodeNumber, 0) + 1;
    nextEpisode = realityTvCreateEpisode_(freshSeason, nextNumber, {
      skipHubSync: true,
      skipQuestionPack: true,
      onCheckpoint: onCheckpoint
    });
    realityTvUpdateObjectRow_(
      SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODES_SHEET),
      freshEpisode.__rowNumber,
      { NextEpisodeCreated: true, UpdatedAt: new Date() }
    );
  }

  return { nextEpisode: nextEpisode, remainingCount: remaining.length };
}

function realityTvQueueMainMarketResolution_(season, episode, queue) {
  if (!realityTvGetHubId_() || typeof externalResultsBridgeEnqueue_ !== "function") {
    return { success: false, skipped: true };
  }
  const selectedIds = realityTvParseJson_(queue.SelectedContestantIds || "[]", []).map(realityTvKey_);
  const contestants = realityTvContestantsForSeason_(season.SeasonId);
  const selectedNames = contestants.filter(function(row) {
    return selectedIds.indexOf(realityTvKey_(row.ContestantId)) !== -1;
  }).map(function(row) { return row.Name; });
  const outcomeType = realityTvKey_(queue.OutcomeType);
  const winningOutcome = outcomeType === "no-elimination" ? "NO ELIMINATION" : selectedNames.join(", ");
  const now = new Date();
  return externalResultsBridgeEnqueue_(
    "UPSERT_MARKET_RESOLUTION",
    episode.ExternalMarketId,
    "manual-reality-tv",
    {
      market: {
        Provider: "manual-reality-tv",
        ExternalMarketId: episode.ExternalMarketId,
        ExternalEventId: episode.ExternalEventId,
        ResolutionStatus: "resolved",
        WinningOutcome: winningOutcome,
        ResolutionSource: "manual-reality-tv",
        LastUpdated: now,
        RawJSON: JSON.stringify({
          seasonId: season.SeasonId,
          episodeId: episode.EpisodeId,
          outcomeType: queue.OutcomeType || "elimination",
          winnerContestantIds: selectedIds
        })
      }
    }
  );
}

function realityTvSyncApprovalHub_(season, episode, queue, reviewer, nextEpisode) {
  const warnings = [];
  if (realityTvGetHubId_()) {
    // Continue below. The Hub work is queued locally and never blocks approval.
  } else {
    return { warning: "" };
  }

  const resolutionSync = realityTvQueueMainMarketResolution_(season, episode, queue);
  if (resolutionSync && resolutionSync.error) warnings.push(resolutionSync.error);

  if (nextEpisode) {
    const contestants = realityTvContestantsForSeason_(season.SeasonId).filter(function(row) {
      return realityTvBool_(row.Active) && realityTvKey_(row.Status) === "active";
    });
    const question = realityTvFormatQuestion_(season.QuestionTemplate, nextEpisode.EpisodeNumber, season);
    const sync = realityTvSyncEpisodeToHub_(season, nextEpisode, contestants, question);
    if (sync && sync.error) warnings.push(sync.error);
  }

  const reviewSync = realityTvUpdateHubReview_(
    queue,
    "APPROVED",
    reviewer,
    nextEpisode
      ? "Local approval completed and " + nextEpisode.EpisodeName + " was created."
      : "Local approval completed."
  );
  if (reviewSync && reviewSync.error) warnings.push(reviewSync.error);

  return { warning: warnings.join(" | "), queued: true };
}

function realityTvApprovalQuestionBuildState_(queue) {
  if (!queue || !queue.NextEpisodeId) return null;
  if (queue.ApprovalQuestionBuildId && typeof realityTvGetQuestionBuildJob_ === "function" && typeof realityTvQuestionBuildState_ === "function") {
    const linkedJob = realityTvGetQuestionBuildJob_(queue.ApprovalQuestionBuildId);
    if (linkedJob) return realityTvQuestionBuildState_(linkedJob);
  }
  if (typeof realityTvLatestQuestionBuildStateForSeason_ !== "function") return null;
  return realityTvLatestQuestionBuildStateForSeason_(queue.SeasonId, queue.NextEpisodeId) ||
    (typeof realityTvLatestCompletedQuestionBuildStateForSeason_ === "function"
      ? realityTvLatestCompletedQuestionBuildStateForSeason_(queue.SeasonId, queue.NextEpisodeId)
      : null);
}

function realityTvApprovalProgress_(queue) {
  queue = queue || {};
  const reviewStatus = realityTvString_(queue.ReviewStatus).toUpperCase();
  const stage = realityTvString_(queue.ApprovalStage || (reviewStatus === "APPROVED" ? "COMPLETE" : "SETTLE")).toUpperCase();
  const pushStatus = realityTvString_(queue.PushStatus).toUpperCase();
  const nowMs = Date.now();
  const startedMs = new Date(queue.ApprovalStartedAt || queue.ReviewedAt || queue.UpdatedAt || 0).getTime();
  const stageStartedMs = new Date(queue.ApprovalStageStartedAt || queue.ApprovalStartedAt || queue.UpdatedAt || 0).getTime();
  const heartbeatMs = new Date(queue.ApprovalHeartbeatAt || queue.UpdatedAt || queue.ApprovalStartedAt || 0).getTime();
  const elapsedSeconds = startedMs > 0 ? Math.max(0, Math.floor((nowMs - startedMs) / 1000)) : 0;
  const stageElapsedSeconds = stageStartedMs > 0 ? Math.max(0, Math.floor((nowMs - stageStartedMs) / 1000)) : 0;
  const heartbeatAgeSeconds = heartbeatMs > 0 ? Math.max(0, Math.floor((nowMs - heartbeatMs) / 1000)) : 0;
  const questionBuild = realityTvApprovalQuestionBuildState_(queue);
  let questionTotal = questionBuild ? Math.max(0, realityTvNumber_(questionBuild.totalCount, 0)) : 0;
  if (!questionTotal && queue.SeasonId && typeof realityTvQuestionTemplatesForSeason_ === "function") {
    questionTotal = realityTvQuestionTemplatesForSeason_(queue.SeasonId).filter(function(row) { return realityTvBool_(row.Enabled); }).length;
  }
  const questionDone = questionBuild ? Math.max(0, Math.min(questionTotal, realityTvNumber_(questionBuild.currentIndex, 0))) : 0;
  const questionRemaining = Math.max(0, questionTotal - questionDone);

  let requestedIds = realityTvParseJson_(queue.ApprovalQuestionQueueIdsJSON || "[]", []);
  requestedIds = Array.isArray(requestedIds) ? requestedIds : [];
  const settleTotal = Math.max(0, realityTvNumber_(queue.ApprovalQuestionTotalCount, requestedIds.length));
  const settleDone = Math.max(0, Math.min(settleTotal, realityTvNumber_(queue.ApprovalQuestionCompletedCount, 0)));
  const settleRemaining = Math.max(0, settleTotal - settleDone);
  const currentQuestion = realityTvString_(queue.ApprovalCurrentQuestionLabel);

  let percent = 5;
  let label = "Queued for approval";
  let detail = "Waiting to begin episode settlement.";
  let estimatedRemainingSeconds = 0;

  if (reviewStatus === "APPROVED" || stage === "COMPLETE") {
    percent = 100;
    label = "Episode finalization complete";
    detail = "The current episode results, scoring, and roster are final. Next-episode preparation runs separately.";
  } else if (stage === "SETTLE_QUESTIONS") {
    const ratio = settleTotal > 0 ? settleDone / settleTotal : 1;
    percent = settleTotal > 0 ? Math.min(42, 10 + Math.round(ratio * 32)) : 42;
    label = settleTotal > 0 ? "Settling Extra Questions " + settleDone + " of " + settleTotal : "Extra Questions ready";
    detail = currentQuestion
      ? "Last completed: " + currentQuestion + ". A checkpoint is saved after every question."
      : "The server settles one Extra Question per durable pass and saves a checkpoint after each one.";
  } else if (stage === "SCORE_QUESTIONS") {
    percent = 46;
    label = "Recalculating episode scores";
    detail = "All Extra Questions are settled. Recalculating the episode score once before elimination settlement.";
  } else if (stage === "SETTLE") {
    percent = pushStatus === "SETTLING EPISODE" ? 62 : 55;
    label = "Settling elimination result";
    detail = "Scoring the elimination, updating the roster, and marking the current episode final.";
  } else if (stage === "FINALIZE_CURRENT") {
    percent = 88;
    label = "Finalizing current episode";
    detail = "Saving the final approval record and queuing next-episode preparation separately.";
  } else if (stage === "BUILD_NEXT") {
    if (pushStatus === "CREATING MAIN QUESTION") {
      percent = 47;
      label = "Creating the main elimination question";
      detail = "Saving the next episode's main question and inherited scoring settings.";
    } else if (pushStatus === "ADDING MAIN ANSWERS") {
      percent = 52;
      label = "Adding next-episode contestants";
      detail = "Adding the active contestants or teams as answers to the main elimination question.";
    } else if (pushStatus === "SAVING NEXT EPISODE") {
      percent = 55;
      label = "Saving the next episode";
      detail = "Linking the episode, main question, schedule, and season state.";
    } else {
      percent = pushStatus === "BUILDING NEXT EPISODE" || pushStatus === "PREPARING NEXT EPISODE" ? 43 : 42;
      label = "Preparing the next episode";
      detail = "Reading the active roster and inherited episode settings.";
    }
  } else if (stage === "BUILD_QUESTIONS") {
    const ratio = questionTotal > 0 ? questionDone / questionTotal : 0;
    percent = Math.min(88, 57 + Math.round(ratio * 31));
    label = questionTotal > 0 ? "Building Extra Questions " + questionDone + " of " + questionTotal : "Preparing Extra Questions";
    detail = questionBuild && questionBuild.lastMessage ? questionBuild.lastMessage : "Preparing the next episode's enabled Extra Questions.";
    estimatedRemainingSeconds = Math.max(10, (questionRemaining * 8) + 10);
  } else if (stage === "FINALIZE" || stage === "SYNC_HUB") {
    percent = 92;
    label = "Finalizing approval";
    detail = "Saving the final local approval record. Hub synchronization is queued separately.";
  }

  const complete = percent >= 100 || reviewStatus === "APPROVED";
  const queuedOrWaiting = pushStatus === "QUEUED" || pushStatus === "WAITING";
  const stalled = !complete && !queuedOrWaiting && reviewStatus === "APPROVING" && heartbeatAgeSeconds >= 420;
  return {
    stage: stage, label: label, detail: detail, percent: Math.max(0, Math.min(100, percent)),
    elapsedSeconds: elapsedSeconds, stageElapsedSeconds: stageElapsedSeconds, heartbeatAgeSeconds: heartbeatAgeSeconds,
    estimatedRemainingSeconds: estimatedRemainingSeconds, stalled: stalled, stalledAfterSeconds: 420,
    questionBuild: questionBuild, questionDone: questionDone, questionTotal: questionTotal,
    settledQuestionDone: settleDone, settledQuestionTotal: settleTotal, settledQuestionRemaining: settleRemaining
  };
}

function realityTvApprovalState_(queue) {
  const status = realityTvString_(queue.ReviewStatus).toUpperCase();
  const stage = realityTvString_(queue.ApprovalStage || (status === "APPROVED" ? "COMPLETE" : "SETTLE")).toUpperCase();
  const progress = realityTvApprovalProgress_(queue);
  return {
    success: true,
    queueId: queue.QueueId,
    seasonId: realityTvString_(queue.SeasonId),
    episodeId: realityTvString_(queue.EpisodeId),
    episodeFinalizeMode: realityTvString_(queue.EpisodeFinalizeMode),
    nextEpisodeJobId: realityTvString_(queue.NextEpisodeJobId),
    reviewStatus: status,
    stage: stage,
    pushStatus: realityTvString_(queue.PushStatus),
    nextEpisodeId: realityTvString_(queue.NextEpisodeId),
    complete: status === "APPROVED" || stage === "COMPLETE",
    error: realityTvString_(queue.ErrorMessage),
    progressPercent: progress.percent,
    progressLabel: progress.label,
    progressDetail: progress.detail,
    elapsedSeconds: progress.elapsedSeconds,
    stageElapsedSeconds: progress.stageElapsedSeconds,
    heartbeatAgeSeconds: progress.heartbeatAgeSeconds,
    lastCheckpointAt: queue.ApprovalHeartbeatAt || queue.UpdatedAt || "",
    estimatedRemainingSeconds: progress.estimatedRemainingSeconds,
    stalled: progress.stalled,
    approvalProgress: progress,
    questionBuild: progress.questionBuild,
    settledQuestionDone: progress.settledQuestionDone,
    settledQuestionTotal: progress.settledQuestionTotal,
    approvalWatchdog: realityTvString_(queue.ReviewStatus).toUpperCase() === "APPROVING"
  };
}


function realityTvEpisodeFinalizeReadiness_(seasonId, episodeId) {
  const questions = typeof REALITY_TV_EPISODE_QUESTIONS_SHEET !== "undefined"
    ? realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_EPISODE_QUESTIONS_SHEET).filter(function(row) {
        return realityTvKey_(row.SeasonId) === realityTvKey_(seasonId) &&
          realityTvKey_(row.EpisodeId) === realityTvKey_(episodeId) &&
          (row.Enabled === "" || row.Enabled === undefined || realityTvBool_(row.Enabled));
      })
    : [];
  const questionQueue = typeof REALITY_TV_QUESTION_QUEUE_SHEET !== "undefined"
    ? realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_QUESTION_QUEUE_SHEET).filter(function(row) {
        return realityTvKey_(row.SeasonId) === realityTvKey_(seasonId) && realityTvKey_(row.EpisodeId) === realityTvKey_(episodeId);
      })
    : [];
  const queueByQuestion = {};
  questionQueue.slice().sort(function(a, b) {
    return new Date(b.SubmittedAt || b.UpdatedAt || 0).getTime() - new Date(a.SubmittedAt || a.UpdatedAt || 0).getTime();
  }).forEach(function(row) {
    const key = realityTvKey_(row.EpisodeQuestionId);
    if (key && !queueByQuestion[key]) queueByQuestion[key] = row;
  });
  const missing = [];
  const readyQueues = [];
  let finalCount = 0;
  questions.forEach(function(question) {
    const status = realityTvString_(question.Status).toUpperCase();
    if (status === "FINAL" || status === "CLOSED") {
      finalCount += 1;
      return;
    }
    const queue = queueByQuestion[realityTvKey_(question.EpisodeQuestionId)];
    const reviewStatus = queue ? realityTvString_(queue.ReviewStatus).toUpperCase() : "";
    if (queue && ["PENDING", "APPROVING", "APPROVED"].indexOf(reviewStatus) !== -1) {
      readyQueues.push(queue);
      return;
    }
    missing.push({
      episodeQuestionId: question.EpisodeQuestionId,
      questionText: question.QuestionText,
      categoryId: question.CategoryId,
      status: status || "OPEN"
    });
  });
  return {
    ready: missing.length === 0,
    questionCount: questions.length,
    finalCount: finalCount,
    pendingCount: readyQueues.filter(function(row) { return realityTvString_(row.ReviewStatus).toUpperCase() !== "APPROVED"; }).length,
    questionQueueIds: readyQueues.map(function(row) { return row.QueueId; }),
    missing: missing
  };
}

function realityTvEpisodeQuestionQueueProgress_(season, episode, mainQueue) {
  if (typeof REALITY_TV_QUESTION_QUEUE_SHEET === "undefined") {
    return { rows: [], pending: [], totalCount: 0, completedCount: 0, remainingCount: 0 };
  }
  let requested = realityTvParseJson_(mainQueue.ApprovalQuestionQueueIdsJSON || "[]", []);
  requested = Array.isArray(requested) ? requested.map(realityTvKey_).filter(Boolean) : [];
  const requestedMap = {};
  requested.forEach(function(id) { requestedMap[id] = true; });
  const rows = realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_QUESTION_QUEUE_SHEET).filter(function(row) {
    if (realityTvKey_(row.SeasonId) !== realityTvKey_(season.SeasonId) || realityTvKey_(row.EpisodeId) !== realityTvKey_(episode.EpisodeId)) return false;
    if (requested.length && !requestedMap[realityTvKey_(row.QueueId)]) return false;
    return ["PENDING", "APPROVING", "APPROVED"].indexOf(realityTvString_(row.ReviewStatus).toUpperCase()) !== -1;
  }).sort(function(a, b) {
    return realityTvNumber_(a.__rowNumber, 0) - realityTvNumber_(b.__rowNumber, 0);
  });
  const pending = rows.filter(function(row) {
    return realityTvString_(row.ReviewStatus).toUpperCase() !== "APPROVED";
  });
  return {
    rows: rows,
    pending: pending,
    totalCount: rows.length,
    completedCount: rows.length - pending.length,
    remainingCount: pending.length
  };
}

function realityTvSettleNextEpisodeQuestionQueue_(season, episode, mainQueue, reviewer) {
  if (typeof REALITY_TV_QUESTION_QUEUE_SHEET === "undefined" || typeof realityTvSettleSupplementalQuestion_ !== "function") {
    return { settled: false, done: true, totalCount: 0, completedCount: 0, remainingCount: 0, queueId: "", questionLabel: "" };
  }
  const before = realityTvEpisodeQuestionQueueProgress_(season, episode, mainQueue);
  if (!before.pending.length) {
    return { settled: false, done: true, totalCount: before.totalCount, completedCount: before.completedCount, remainingCount: 0, queueId: "", questionLabel: "" };
  }

  const queue = before.pending[0];
  const question = realityTvGetEpisodeQuestion_(queue.EpisodeQuestionId);
  if (!question) throw new Error("Episode question not found for queued result: " + queue.EpisodeQuestionId);
  const questionLabel = realityTvString_(question.QuestionText || question.CategoryId || queue.EpisodeQuestionId);
  const queueSheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_QUESTION_QUEUE_SHEET);
  const now = new Date();

  // FINAL/CLOSED is durable proof that a killed prior execution already wrote this result.
  if (["FINAL", "CLOSED"].indexOf(realityTvString_(question.Status).toUpperCase()) === -1) {
    const setup = typeof adminGetGameSetup === "function" ? adminGetGameSetup({ gameId: season.GameId }) : null;
    realityTvSettleSupplementalQuestion_(question, queue, reviewer, { setup: setup, skipScoreRecalc: true });
  }

  let hubWarning = "";
  try {
    const hub = realityTvUpdateHubReview_(queue, "APPROVED", reviewer, "Approved with episode finalization.");
    hubWarning = hub && hub.error ? realityTvString_(hub.error) : "";
  } catch (hubErr) {
    hubWarning = hubErr && hubErr.message ? hubErr.message : String(hubErr);
  }

  realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
    ReviewStatus: "APPROVED",
    ReviewedBy: reviewer,
    ReviewedAt: queue.ReviewedAt || now,
    PushStatus: "PUSHED",
    ApprovalStage: "COMPLETE",
    ApprovalCompletedAt: now,
    ApprovalHeartbeatAt: now,
    PushedAt: now,
    ErrorMessage: hubWarning,
    UpdatedAt: now
  });

  const completedCount = before.completedCount + 1;
  return {
    settled: true,
    done: completedCount >= before.totalCount,
    totalCount: before.totalCount,
    completedCount: completedCount,
    remainingCount: Math.max(0, before.totalCount - completedCount),
    queueId: realityTvString_(queue.QueueId),
    questionLabel: questionLabel,
    hubWarning: hubWarning
  };
}

// Backward-compatible helper name. It intentionally settles at most one question.
function realityTvSettleEpisodeQuestionQueues_(season, episode, mainQueue, reviewer) {
  const unit = realityTvSettleNextEpisodeQuestionQueue_(season, episode, mainQueue, reviewer);
  return {
    settledCount: unit.settled ? 1 : 0,
    queueIds: unit.queueId ? [unit.queueId] : [],
    done: unit.done,
    totalCount: unit.totalCount,
    completedCount: unit.completedCount,
    remainingCount: unit.remainingCount,
    questionLabel: unit.questionLabel
  };
}

function realityTvNextEpisodeJobState_(job) {
  if (!job) return null;
  const status = realityTvString_(job.Status || "QUEUED").toUpperCase();
  const stage = realityTvString_(job.Stage || "CREATE_EPISODE").toUpperCase();
  const initialSetup = realityTvKey_(job.SourceEpisodeId) === realityTvKey_(REALITY_TV_INITIAL_SETUP_SOURCE_ID);
  let percent = 5;
  let label = realityTvString_(job.ProgressLabel || (initialSetup ? "Season accepted — Episode 1 queued" : "Queued to prepare next episode"));
  let detail = realityTvString_(job.ProgressDetail || (initialSetup ? "The server will create Episode 1 and its questions in the background." : "The server will prepare the next episode automatically."));
  if (status === "COMPLETE") {
    percent = 100;
    label = initialSetup ? "Season setup ready" : "Next episode ready";
    detail = initialSetup ? "Episode 1 and all enabled questions are ready for review." : "The next episode and all enabled questions are ready for picks.";
  } else if (status === "NEEDS_ATTENTION") {
    percent = stage === "BUILD_QUESTIONS" ? 70 : 25;
    label = initialSetup ? "Season setup needs attention" : "Next episode needs attention";
  } else if (stage === "CREATE_EPISODE") {
    percent = 25;
    if (!job.ProgressLabel) label = initialSetup ? "Creating Episode 1" : "Creating next episode";
  } else if (stage === "BUILD_QUESTIONS") {
    const progressKey = realityTvString_(job.ProgressLabel).toUpperCase();
    percent = progressKey.indexOf("VERIFY") !== -1 ? 92 : (progressKey.indexOf("WRIT") !== -1 ? 78 : 60);
    if (!job.ProgressLabel) label = initialSetup ? "Building Episode 1 questions" : "Building Extra Questions";
  }
  return {
    jobId: job.JobId,
    seasonId: job.SeasonId,
    initialSetup: initialSetup,
    sourceEpisodeId: job.SourceEpisodeId,
    targetEpisodeNumber: realityTvNumber_(job.TargetEpisodeNumber, 0),
    nextEpisodeId: realityTvString_(job.NextEpisodeId),
    status: status,
    stage: stage,
    percent: percent,
    label: label,
    detail: detail,
    attemptCount: realityTvNumber_(job.AttemptCount, 0),
    error: realityTvString_(job.ErrorMessage),
    complete: status === "COMPLETE",
    needsAttention: status === "NEEDS_ATTENTION",
    updatedAt: job.UpdatedAt || ""
  };
}

function realityTvGetNextEpisodeJob_(jobId) {
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_NEXT_EPISODE_JOBS_SHEET).find(function(row) {
    return realityTvKey_(row.JobId) === realityTvKey_(jobId);
  }) || null;
}

function realityTvLatestNextEpisodeJobForSource_(seasonId, sourceEpisodeId) {
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_NEXT_EPISODE_JOBS_SHEET).filter(function(row) {
    return realityTvKey_(row.SeasonId) === realityTvKey_(seasonId) && realityTvKey_(row.SourceEpisodeId) === realityTvKey_(sourceEpisodeId);
  }).sort(function(a, b) {
    return new Date(b.UpdatedAt || b.CreatedAt || 0).getTime() - new Date(a.UpdatedAt || a.CreatedAt || 0).getTime();
  })[0] || null;
}

function realityTvHasNextEpisodeTrigger_() {
  if (typeof ScriptApp === "undefined" || typeof ScriptApp.getProjectTriggers !== "function") return false;
  return ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction && trigger.getHandlerFunction() === "realityTvContinueNextEpisodeJobs";
  });
}

function realityTvScheduleNextEpisodeContinuation_() {
  try {
    if (typeof ScriptApp === "undefined" || realityTvHasNextEpisodeTrigger_()) return false;
    const clock = ScriptApp.newTrigger("realityTvContinueNextEpisodeJobs").timeBased();
    if (clock && typeof clock.everyMinutes === "function") clock.everyMinutes(1).create();
    else clock.after(10000).create();
    return true;
  } catch (err) {
    if (typeof Logger !== "undefined") Logger.log("Reality TV next-episode watchdog warning: " + (err.message || err));
    return false;
  }
}

function realityTvDeleteNextEpisodeTriggers_() {
  if (typeof ScriptApp === "undefined" || typeof ScriptApp.getProjectTriggers !== "function") return;
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction && trigger.getHandlerFunction() === "realityTvContinueNextEpisodeJobs") ScriptApp.deleteTrigger(trigger);
  });
}

function realityTvLatestInitialSetupJob_(seasonId) {
  return realityTvLatestNextEpisodeJobForSource_(seasonId, REALITY_TV_INITIAL_SETUP_SOURCE_ID);
}

function realityTvQueueInitialEpisodePreparation_(season) {
  if (!season) throw new Error("Reality TV season not found.");
  const prior = realityTvLatestInitialSetupJob_(season.SeasonId);
  if (prior) {
    const status = realityTvString_(prior.Status).toUpperCase();
    if (status !== "COMPLETE") realityTvScheduleNextEpisodeContinuation_();
    return { queued: status !== "COMPLETE", job: prior, state: realityTvNextEpisodeJobState_(prior) };
  }
  const now = new Date();
  const existingEpisode = realityTvEpisodesForSeason_(season.SeasonId).find(function(row) {
    return realityTvNumber_(row.EpisodeNumber, 0) === 1;
  }) || null;
  const job = {
    JobId: realityTvId_("rt-setup"),
    SeasonId: season.SeasonId,
    GameId: season.GameId,
    SourceEpisodeId: REALITY_TV_INITIAL_SETUP_SOURCE_ID,
    SourceEpisodeNumber: 0,
    TargetEpisodeNumber: 1,
    NextEpisodeId: existingEpisode ? existingEpisode.EpisodeId : "",
    Status: existingEpisode ? "QUEUED" : "QUEUED",
    Stage: existingEpisode ? "BUILD_QUESTIONS" : "CREATE_EPISODE",
    ProgressLabel: existingEpisode ? "Episode 1 exists — finishing setup" : "Season accepted — Episode 1 queued",
    ProgressDetail: existingEpisode ? "The server will verify questions and Hub mappings in the background." : "The season and cast are saved. Episode 1 will be created in the background; this page does not need to stay open.",
    AttemptCount: 0,
    HeartbeatAt: now,
    NextAttemptAt: now,
    QuestionBuildId: "",
    ErrorMessage: "",
    CreatedAt: now,
    StartedAt: "",
    CompletedAt: "",
    UpdatedAt: now
  };
  realityTvAppendObject_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_NEXT_EPISODE_JOBS_SHEET), job);
  realityTvScheduleNextEpisodeContinuation_();
  const saved = realityTvGetNextEpisodeJob_(job.JobId);
  return { queued: true, job: saved, state: realityTvNextEpisodeJobState_(saved) };
}

function apiAdminResumeRealityTvSeasonSetup(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const season = realityTvGetSeason_(payload.seasonId);
  if (!season) throw new Error("Reality TV season not found.");
  let job = realityTvLatestInitialSetupJob_(season.SeasonId);
  if (!job) return realityTvQueueInitialEpisodePreparation_(season);
  if (realityTvString_(job.Status).toUpperCase() === "COMPLETE") {
    return { success: true, queued: false, state: realityTvNextEpisodeJobState_(job), message: "Season setup is already complete." };
  }
  const sheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_NEXT_EPISODE_JOBS_SHEET);
  realityTvUpdateObjectRow_(sheet, job.__rowNumber, {
    Status: "QUEUED",
    NextAttemptAt: new Date(),
    ErrorMessage: "",
    ProgressLabel: "Season setup re-queued",
    ProgressDetail: "The server will resume Episode 1 setup in the background.",
    UpdatedAt: new Date()
  });
  realityTvScheduleNextEpisodeContinuation_();
  job = realityTvGetNextEpisodeJob_(job.JobId);
  return { success: true, queued: true, state: realityTvNextEpisodeJobState_(job), message: "Season setup was re-queued. You can leave this page while it continues." };
}

function realityTvQueueNextEpisodePreparation_(season, episode, reviewer) {
  const remaining = realityTvContestantsForSeason_(season.SeasonId).filter(function(row) {
    return realityTvBool_(row.Active) && realityTvKey_(row.Status) === "active";
  });
  if (!realityTvBool_(season.AutoCreateNextEpisode) || remaining.length <= 1) {
    return { queued: false, skipped: true, reason: "Automatic next episode is disabled or the season is complete." };
  }
  const prior = realityTvLatestNextEpisodeJobForSource_(season.SeasonId, episode.EpisodeId);
  if (prior && ["QUEUED", "RUNNING", "RETRY", "COMPLETE", "NEEDS_ATTENTION"].indexOf(realityTvString_(prior.Status).toUpperCase()) !== -1) {
    if (realityTvString_(prior.Status).toUpperCase() !== "COMPLETE") realityTvScheduleNextEpisodeContinuation_();
    return { queued: realityTvString_(prior.Status).toUpperCase() !== "COMPLETE", job: prior, state: realityTvNextEpisodeJobState_(prior) };
  }
  const now = new Date();
  const targetNumber = realityTvNumber_(episode.EpisodeNumber, 0) + 1;
  const existingNext = realityTvEpisodesForSeason_(season.SeasonId).find(function(row) {
    return realityTvNumber_(row.EpisodeNumber, 0) === targetNumber;
  }) || null;
  const job = {
    JobId: realityTvId_("rt-next"),
    SeasonId: season.SeasonId,
    GameId: season.GameId,
    SourceEpisodeId: episode.EpisodeId,
    SourceEpisodeNumber: episode.EpisodeNumber,
    TargetEpisodeNumber: targetNumber,
    NextEpisodeId: existingNext ? existingNext.EpisodeId : "",
    Status: "QUEUED",
    Stage: existingNext ? "BUILD_QUESTIONS" : "CREATE_EPISODE",
    ProgressLabel: existingNext ? "Building Extra Questions" : "Queued to create next episode",
    ProgressDetail: "Runs automatically after the current episode is finalized.",
    AttemptCount: 0,
    HeartbeatAt: now,
    NextAttemptAt: now,
    QuestionBuildId: "",
    ErrorMessage: "",
    CreatedAt: now,
    StartedAt: "",
    CompletedAt: "",
    UpdatedAt: now
  };
  realityTvAppendObject_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_NEXT_EPISODE_JOBS_SHEET), job);
  realityTvScheduleNextEpisodeContinuation_();
  const saved = realityTvGetNextEpisodeJob_(job.JobId);
  return { queued: true, job: saved, state: realityTvNextEpisodeJobState_(saved) };
}

function realityTvNextEpisodeJobOwner_() {
  const now = Date.now();
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_NEXT_EPISODE_JOBS_SHEET).filter(function(row) {
    const status = realityTvString_(row.Status).toUpperCase();
    if (["QUEUED", "RUNNING", "RETRY"].indexOf(status) === -1) return false;
    const nextAttempt = new Date(row.NextAttemptAt || 0).getTime();
    if (nextAttempt && nextAttempt > now) return false;
    if (status === "RUNNING") {
      const heartbeat = new Date(row.HeartbeatAt || row.UpdatedAt || row.StartedAt || 0).getTime();
      if (heartbeat && (now - heartbeat) < 180000) return false;
    }
    return true;
  }).sort(function(a, b) {
    return new Date(a.CreatedAt || a.UpdatedAt || 0).getTime() - new Date(b.CreatedAt || b.UpdatedAt || 0).getTime();
  })[0] || null;
}

function realityTvHasPendingNextEpisodeJobs_() {
  return realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_NEXT_EPISODE_JOBS_SHEET).some(function(row) {
    return ["QUEUED", "RUNNING", "RETRY"].indexOf(realityTvString_(row.Status).toUpperCase()) !== -1;
  });
}

function realityTvContinueNextEpisodeJob_(jobId) {
  realityTvEnsureSystem_();
  const job = realityTvGetNextEpisodeJob_(jobId);
  if (!job) throw new Error("Next-episode job not found.");
  if (realityTvString_(job.Status).toUpperCase() === "COMPLETE") return realityTvNextEpisodeJobState_(job);
  const sheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_NEXT_EPISODE_JOBS_SHEET);
  const season = realityTvGetSeason_(job.SeasonId);
  const initialSetup = realityTvKey_(job.SourceEpisodeId) === realityTvKey_(REALITY_TV_INITIAL_SETUP_SOURCE_ID);
  const sourceEpisode = initialSetup ? null : realityTvGetEpisode_(job.SourceEpisodeId);
  if (!season || (!initialSetup && !sourceEpisode)) throw new Error("Season or source episode not found for Reality TV preparation job.");
  const attempt = realityTvNumber_(job.AttemptCount, 0) + 1;
  const startedAt = job.StartedAt || new Date();
  realityTvUpdateObjectRow_(sheet, job.__rowNumber, {
    Status: "RUNNING",
    AttemptCount: attempt,
    StartedAt: startedAt,
    HeartbeatAt: new Date(),
    ErrorMessage: "",
    UpdatedAt: new Date()
  });
  const checkpoint = function(label, detail) {
    realityTvUpdateObjectRow_(sheet, job.__rowNumber, {
      ProgressLabel: label,
      ProgressDetail: detail || label,
      HeartbeatAt: new Date(),
      UpdatedAt: new Date()
    });
  };
  try {
    const stage = realityTvString_(job.Stage || "CREATE_EPISODE").toUpperCase();
    if (stage === "CREATE_EPISODE") {
      checkpoint(initialSetup ? "Creating Episode 1" : "Creating next episode", "Creating the episode, main elimination question, and active answer roster.");
      let nextEpisode = realityTvEpisodesForSeason_(season.SeasonId).find(function(row) {
        return realityTvNumber_(row.EpisodeNumber, 0) === realityTvNumber_(job.TargetEpisodeNumber, 0);
      }) || null;
      if (!nextEpisode) {
        if (initialSetup) {
          nextEpisode = realityTvCreateEpisode_(season, 1, { skipHubSync: true, skipQuestionPack: true });
        } else {
          const built = realityTvBuildNextEpisodeAfterApproval_(season, sourceEpisode, function(status) {
            checkpoint(realityTvString_(status).replace(/_/g, " ") || "Creating next episode", "Saving the next episode locally.");
          });
          nextEpisode = built.nextEpisode;
        }
      }
      if (!nextEpisode) {
        realityTvUpdateObjectRow_(sheet, job.__rowNumber, {
          Status: "COMPLETE", Stage: "COMPLETE", ProgressLabel: initialSetup ? "Season setup needs attention" : "No next episode needed",
          ProgressDetail: initialSetup ? "Episode 1 could not be created. Use Resume Season Setup after correcting the season/cast." : "The season is complete or automatic next-episode creation is disabled.",
          CompletedAt: new Date(), HeartbeatAt: new Date(), UpdatedAt: new Date()
        });
        return realityTvNextEpisodeJobState_(realityTvGetNextEpisodeJob_(job.JobId));
      }
      realityTvUpdateObjectRow_(sheet, job.__rowNumber, {
        Status: "QUEUED",
        NextAttemptAt: new Date(),
        NextEpisodeId: nextEpisode.EpisodeId,
        Stage: "BUILD_QUESTIONS",
        ProgressLabel: initialSetup ? "Episode 1 created" : "Episode created",
        ProgressDetail: initialSetup ? "The main question is ready. Preparing Episode 1 Extra Questions in the background." : "The main question is ready. Preparing Extra Questions in the background.",
        HeartbeatAt: new Date(), UpdatedAt: new Date()
      });
      realityTvScheduleNextEpisodeContinuation_();
      return realityTvNextEpisodeJobState_(realityTvGetNextEpisodeJob_(job.JobId));
    }
    if (stage === "BUILD_QUESTIONS") {
      const nextEpisode = realityTvGetEpisode_(job.NextEpisodeId) || realityTvEpisodesForSeason_(season.SeasonId).find(function(row) {
        return realityTvNumber_(row.EpisodeNumber, 0) === realityTvNumber_(job.TargetEpisodeNumber, 0);
      });
      if (!nextEpisode) throw new Error("Next episode was not found after creation.");
      const enabledTypes = typeof realityTvQuestionTemplatesForSeason_ === "function"
        ? realityTvQuestionTemplatesForSeason_(season.SeasonId).filter(function(row) { return realityTvBool_(row.Enabled); }).map(function(row) { return realityTvKey_(row.TemplateId); })
        : [];
      checkpoint(initialSetup ? "Compiling Episode 1 questions" : "Compiling Extra Questions", "Reading the roster once and compiling the complete question pack.");
      const build = enabledTypes.length && typeof realityTvMaterializeEpisodeQuestionPackBulk_ === "function"
        ? realityTvMaterializeEpisodeQuestionPackBulk_(season, nextEpisode, {
            enabledTypes: enabledTypes,
            buildId: realityTvString_(job.QuestionBuildId),
            managedBy: "NEXT_EPISODE_JOB",
            checkpoint: function(status) {
              const key = realityTvString_(status).toUpperCase();
              const label = key.indexOf("WRITING") !== -1 ? "Writing Extra Questions" : (key.indexOf("VERIFY") !== -1 ? "Verifying Extra Questions" : "Compiling Extra Questions");
              checkpoint(label, label + " for " + nextEpisode.EpisodeName + ".");
            }
          })
        : { buildId: "", complete: true };
      realityTvSyncEpisodeToHub_(season, nextEpisode, realityTvContestantsForSeason_(season.SeasonId).filter(function(row) {
        return realityTvBool_(row.Active) && realityTvKey_(row.Status) === "active";
      }), realityTvFormatQuestion_(season.QuestionTemplate, nextEpisode.EpisodeNumber, season));
      const completedAt = new Date();
      realityTvUpdateObjectRow_(sheet, job.__rowNumber, {
        Status: "COMPLETE", Stage: "COMPLETE", QuestionBuildId: build && build.buildId ? build.buildId : "",
        ProgressLabel: initialSetup ? "Season setup ready" : "Next episode ready", ProgressDetail: nextEpisode.EpisodeName + " and all enabled questions are ready for picks.",
        CompletedAt: completedAt, HeartbeatAt: completedAt, ErrorMessage: "", UpdatedAt: completedAt
      });
      return realityTvNextEpisodeJobState_(realityTvGetNextEpisodeJob_(job.JobId));
    }
    throw new Error("Unknown next-episode job stage: " + stage + ".");
  } catch (err) {
    const retryable = realityTvIsRetryableSpreadsheetError_(err) && attempt < 5;
    const nextAt = new Date(Date.now() + Math.min(120000, 10000 * attempt));
    realityTvUpdateObjectRow_(sheet, job.__rowNumber, {
      Status: retryable ? "RETRY" : "NEEDS_ATTENTION",
      NextAttemptAt: retryable ? nextAt : "",
      HeartbeatAt: new Date(),
      ErrorMessage: err.message || String(err),
      ProgressLabel: retryable ? "Retry scheduled" : (initialSetup ? "Season setup needs attention" : "Next episode needs attention"),
      ProgressDetail: retryable ? "A temporary spreadsheet error occurred. The server will retry automatically." : (initialSetup ? "Automatic retries were exhausted. Use Resume Season Setup after correcting the issue." : "Automatic retries were exhausted. Use Repair / Build Current Episode if needed."),
      UpdatedAt: new Date()
    });
    if (retryable) realityTvScheduleNextEpisodeContinuation_();
    return realityTvNextEpisodeJobState_(realityTvGetNextEpisodeJob_(job.JobId));
  }
}

function realityTvContinueNextEpisodeJobs() {
  realityTvEnsureSystem_();
  if (realityTvApprovalQueueOwner_()) {
    if (realityTvHasPendingNextEpisodeJobs_()) realityTvScheduleNextEpisodeContinuation_();
    return;
  }
  const job = realityTvNextEpisodeJobOwner_();
  if (!job) {
    if (!realityTvHasPendingNextEpisodeJobs_()) realityTvDeleteNextEpisodeTriggers_();
    return;
  }
  try {
    // One durable next-episode stage per watchdog invocation.
    realityTvContinueNextEpisodeJob_(job.JobId);
  } catch (err) {
    if (typeof Logger !== "undefined") Logger.log("Reality TV next-episode watchdog warning: " + (err.message || err));
  }
  if (realityTvHasPendingNextEpisodeJobs_()) realityTvScheduleNextEpisodeContinuation_();
  else realityTvDeleteNextEpisodeTriggers_();
}

function apiAdminFinalizeRealityTvEpisode(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  let queue = payload.queueId ? realityTvGetQueue_(payload.queueId) : null;
  if (!queue && payload.episodeId) {
    queue = realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_RESULTS_QUEUE_SHEET).filter(function(row) {
      return realityTvKey_(row.EpisodeId) === realityTvKey_(payload.episodeId) && ["PENDING", "APPROVING"].indexOf(realityTvString_(row.ReviewStatus).toUpperCase()) !== -1;
    }).sort(function(a, b) { return new Date(b.SubmittedAt || 0).getTime() - new Date(a.SubmittedAt || 0).getTime(); })[0] || null;
  }
  if (!queue) throw new Error("Submit the main elimination result before finalizing the episode.");
  const status = realityTvString_(queue.ReviewStatus).toUpperCase();
  if (status === "APPROVED") return realityTvApprovalState_(queue);
  if (["PENDING", "APPROVING"].indexOf(status) === -1) throw new Error("This episode cannot be finalized from status " + status + ".");
  const season = realityTvGetSeason_(queue.SeasonId);
  const episode = realityTvGetEpisode_(queue.EpisodeId);
  if (!season || !episode) throw new Error("Season or episode not found.");
  const readiness = realityTvEpisodeFinalizeReadiness_(season.SeasonId, episode.EpisodeId);
  if (!readiness.ready) {
    return {
      success: false,
      code: "MISSING_EPISODE_RESULTS",
      message: "Enter a result or Push for every Extra Question before finalizing the episode.",
      missingResults: readiness.missing,
      readiness: readiness
    };
  }
  if (status === "PENDING") {
    const now = new Date();
    const reviewer = realityTvString_(payload.username || "administrator");
    const questionIds = readiness.questionQueueIds || [];
    const questionIdMap = {};
    questionIds.forEach(function(id) { questionIdMap[realityTvKey_(id)] = true; });
    if (typeof REALITY_TV_QUESTION_QUEUE_SHEET !== "undefined" && questionIds.length) {
      const qSheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_QUESTION_QUEUE_SHEET);
      realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_QUESTION_QUEUE_SHEET).forEach(function(row) {
        if (!questionIdMap[realityTvKey_(row.QueueId)] || realityTvString_(row.ReviewStatus).toUpperCase() === "APPROVED") return;
        realityTvUpdateObjectRow_(qSheet, row.__rowNumber, {
          ReviewStatus: "APPROVING", ReviewedBy: reviewer, ReviewedAt: now,
          PushStatus: "QUEUED BY EPISODE", ApprovalStage: "EPISODE_BATCH",
          ApprovalStartedAt: row.ApprovalStartedAt || now, ApprovalStageStartedAt: now,
          ApprovalHeartbeatAt: now, ErrorMessage: "", UpdatedAt: now
        });
      });
    }
    realityTvUpdateObjectRow_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_RESULTS_QUEUE_SHEET), queue.__rowNumber, {
      ReviewStatus: "APPROVING",
      ReviewedBy: reviewer,
      ReviewedAt: now,
      PushStatus: "QUEUED",
      ApprovalStage: "SETTLE_QUESTIONS",
      ApprovalStartedAt: now,
      ApprovalCompletedAt: "",
      ApprovalStageStartedAt: now,
      ApprovalHeartbeatAt: now,
      EpisodeFinalizeMode: "ALL_RESULTS",
      ApprovalQuestionQueueIdsJSON: JSON.stringify(questionIds),
      ApprovalQuestionCompletedCount: Math.max(0, questionIds.length - readiness.pendingCount),
      ApprovalQuestionTotalCount: questionIds.length,
      ApprovalCurrentQuestionQueueId: "",
      ApprovalCurrentQuestionLabel: "",
      ApprovalQuestionScoresRecalculated: questionIds.length ? false : true,
      ErrorMessage: "",
      UpdatedAt: now
    });
  }
  realityTvScheduleApprovalContinuation_();
  const refreshed = realityTvGetQueue_(queue.QueueId);
  const state = realityTvApprovalState_(refreshed);
  state.setAndForget = true;
  state.readiness = readiness;
  state.message = "Episode finalization queued. You may leave this page; the server will continue automatically.";
  return state;
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
          ApprovalStageStartedAt: now,
          ApprovalHeartbeatAt: now,
          ApprovalQuestionBuildId: "",
          ErrorMessage: "",
          UpdatedAt: now
        }
      );
    }, 4);
  }
  realityTvScheduleApprovalContinuation_();
  const refreshed = realityTvGetQueue_(payload.queueId);
  const waitingFor = realityTvApprovalWaitingFor_(refreshed);
  return waitingFor ? realityTvApprovalWaitingState_(refreshed, waitingFor) : realityTvApprovalState_(refreshed);
}

function apiAdminGetRealityTvApprovalState(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  let queue = realityTvSpreadsheetRetry_("Read Reality TV approval status", function() { return realityTvGetQueue_(payload.queueId); }, 3);
  if (!queue) throw new Error("Review queue item not found.");

  // A killed/overlapping legacy worker could leave an already-approved row with
  // an older ApprovalStage/PushStatus. Approved is authoritative; normalize the
  // durable checkpoint so the UI and Hub status cannot remain stuck below 100%.
  if (realityTvString_(queue.ReviewStatus).toUpperCase() === "APPROVED" &&
      (realityTvString_(queue.ApprovalStage).toUpperCase() !== "COMPLETE" ||
       realityTvString_(queue.PushStatus).toUpperCase() !== "PUSHED")) {
    const approvedEpisode = realityTvGetEpisode_(queue.EpisodeId);
    if (approvedEpisode && realityTvString_(approvedEpisode.Status).toUpperCase() === "FINAL") {
      const completedAt = queue.ApprovalCompletedAt || queue.PushedAt || new Date();
      realityTvUpdateObjectRow_(
        SpreadsheetApp.getActive().getSheetByName(REALITY_TV_RESULTS_QUEUE_SHEET),
        queue.__rowNumber,
        {
          PushStatus: "PUSHED",
          PushedAt: queue.PushedAt || completedAt,
          ApprovalStage: "COMPLETE",
          ApprovalCompletedAt: completedAt,
          ApprovalHeartbeatAt: new Date(),
          ErrorMessage: realityTvString_(queue.ErrorMessage),
          UpdatedAt: new Date()
        }
      );
      queue = realityTvGetQueue_(payload.queueId);
    }
  }

  if (realityTvString_(queue.ReviewStatus).toUpperCase() === "APPROVING") {
    const stage = realityTvString_(queue.ApprovalStage).toUpperCase();
    const durableFieldsMissing = realityTvString_(queue.ApprovalQuestionTotalCount) === "";
    const heartbeatMs = new Date(queue.ApprovalHeartbeatAt || queue.UpdatedAt || queue.ApprovalStartedAt || 0).getTime();
    const staleLegacyStage = stage === "SETTLE_QUESTIONS" && durableFieldsMissing &&
      (!heartbeatMs || (Date.now() - heartbeatMs) >= 150000);

    if (staleLegacyStage) {
      // Upgrade an already-stuck v1.2.2/v1.2.3 approval in place. No Reset button required.
      const season = realityTvGetSeason_(queue.SeasonId);
      const episode = realityTvGetEpisode_(queue.EpisodeId);
      if (season && episode) {
        const qProgress = realityTvEpisodeQuestionQueueProgress_(season, episode, queue);
        const now = new Date();
        realityTvUpdateObjectRow_(
          SpreadsheetApp.getActive().getSheetByName(REALITY_TV_RESULTS_QUEUE_SHEET),
          queue.__rowNumber,
          {
            PushStatus: "QUEUED",
            ApprovalQuestionCompletedCount: qProgress.completedCount,
            ApprovalQuestionTotalCount: qProgress.totalCount,
            ApprovalCurrentQuestionQueueId: "",
            ApprovalCurrentQuestionLabel: "Recovered stalled approval",
            ApprovalQuestionScoresRecalculated: qProgress.totalCount ? false : true,
            ApprovalStageStartedAt: now,
            ApprovalHeartbeatAt: now,
            ErrorMessage: "",
            UpdatedAt: now
          }
        );
        queue = realityTvGetQueue_(payload.queueId);
      }
    }
    // Reopening/polling an approval repairs both the fast continuation and watchdog.
    realityTvScheduleApprovalContinuation_();
  }

  const waitingFor = realityTvApprovalWaitingFor_(queue);
  return waitingFor ? realityTvApprovalWaitingState_(queue, waitingFor) : realityTvApprovalState_(queue);
}

function apiAdminContinueRealityTvApproval(payload) {
  requireAdmin_(payload || {});
  return realityTvContinueRealityTvApprovalInternal_(payload || {});
}

function realityTvContinueRealityTvApprovalInternal_(payload) {
  realityTvEnsureSystem_();

  let queue = realityTvSpreadsheetRetry_("Read Reality TV approval", function() {
    return realityTvGetQueue_(payload.queueId);
  }, 4);
  if (!queue) throw new Error("Review queue item not found.");
  if (realityTvString_(queue.ReviewStatus).toUpperCase() === "PENDING") {
    throw new Error("This approval has not been queued yet.");
  }
  if (realityTvString_(queue.ReviewStatus).toUpperCase() === "APPROVED") return realityTvApprovalState_(queue);
  if (realityTvString_(queue.ReviewStatus).toUpperCase() !== "APPROVING") {
    throw new Error("This result is not awaiting approval processing.");
  }

  const waitingFor = realityTvApprovalWaitingFor_(queue);
  if (waitingFor) {
    realityTvScheduleApprovalContinuation_();
    return realityTvApprovalWaitingState_(queue, waitingFor);
  }

  const stage = realityTvString_(queue.ApprovalStage || "SETTLE").toUpperCase();
  if (stage === "COMPLETE") return realityTvApprovalState_(queue);
  const processingStatus = stage === "SETTLE_QUESTIONS"
    ? "SETTLING EXTRA RESULTS"
    : (stage === "SCORE_QUESTIONS"
        ? "SCORING EXTRA RESULTS"
        : (stage === "SETTLE"
            ? "SETTLING EPISODE"
            : (stage === "BUILD_NEXT"
                ? "BUILDING NEXT EPISODE"
                : (stage === "BUILD_QUESTIONS"
                    ? "BUILDING EXTRA QUESTIONS"
                    : (stage === "FINALIZE_CURRENT" ? "FINALIZING EPISODE" : "FINALIZING APPROVAL")))));
  const claim = realityTvClaimApprovalStage_({
    queueId: payload.queueId,
    stage: stage,
    processingStatus: processingStatus,
    sheetName: REALITY_TV_RESULTS_QUEUE_SHEET,
    getQueue: realityTvGetQueue_,
    notFoundMessage: "Review queue item not found.",
    busyMessage: "This episode approval stage is already running."
  });
  if (claim.busy) {
    realityTvScheduleApprovalContinuation_();
    return claim;
  }
  if (claim.changed) return realityTvContinueRealityTvApprovalInternal_(payload);
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
  const checkpoint = function(pushStatus) {
    realityTvSpreadsheetRetry_("Save Reality TV approval checkpoint", function() {
      const now = new Date();
      realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
        PushStatus: pushStatus,
        ApprovalHeartbeatAt: now,
        ErrorMessage: "",
        UpdatedAt: now
      });
    }, 3);
  };

  try {
    if (stage === "SETTLE_QUESTIONS") {
      const unit = realityTvSpreadsheetRetry_("Settle next Reality TV Extra Question result", function() {
        return realityTvSettleNextEpisodeQuestionQueue_(season, episode, queue, reviewer);
      }, 3);
      const now = new Date();
      const finished = unit.done === true;
      const nextStage = finished
        ? (unit.totalCount > 0 && !realityTvBool_(queue.ApprovalQuestionScoresRecalculated) ? "SCORE_QUESTIONS" : "SETTLE")
        : "SETTLE_QUESTIONS";
      realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
        PushStatus: "QUEUED",
        ApprovalStage: nextStage,
        ApprovalStageStartedAt: finished ? now : (queue.ApprovalStageStartedAt || now),
        ApprovalHeartbeatAt: now,
        ApprovalQuestionCompletedCount: unit.completedCount,
        ApprovalQuestionTotalCount: unit.totalCount,
        ApprovalCurrentQuestionQueueId: unit.queueId || "",
        ApprovalCurrentQuestionLabel: unit.questionLabel || "",
        ErrorMessage: unit.hubWarning || "",
        UpdatedAt: now
      });
      realityTvScheduleApprovalContinuation_();
      const state = realityTvApprovalState_(realityTvGetQueue_(queue.QueueId));
      state.settledQuestionCount = unit.completedCount;
      state.message = finished
        ? (unit.totalCount ? "All " + unit.totalCount + " Extra Question results are settled. Recalculating the episode score next." : "No Extra Question results need settlement. Finalizing the elimination next.")
        : "Settled Extra Question " + unit.completedCount + " of " + unit.totalCount + ". The next result will continue automatically.";
      return state;
    }

    if (stage === "SCORE_QUESTIONS") {
      if (typeof seasonAnchorRecalculateEpisodeScores_ === "function") {
        realityTvSpreadsheetRetry_("Recalculate Reality TV episode scores after Extra Questions", function() {
          return seasonAnchorRecalculateEpisodeScores_(season.GameId, season.SeasonId, episode.EpisodeId);
        }, 3);
      }
      const now = new Date();
      realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
        PushStatus: "QUEUED",
        ApprovalStage: "SETTLE",
        ApprovalStageStartedAt: now,
        ApprovalHeartbeatAt: now,
        ApprovalQuestionScoresRecalculated: true,
        ErrorMessage: "",
        UpdatedAt: now
      });
      realityTvScheduleApprovalContinuation_();
      const state = realityTvApprovalState_(realityTvGetQueue_(queue.QueueId));
      state.message = "Extra Question scoring is complete. Finalizing the elimination next.";
      return state;
    }

    if (stage === "SETTLE") {
      const settlement = realityTvSpreadsheetRetry_("Settle Reality TV episode", function() {
        return realityTvSettleEpisodeOnly_(season, episode, queue, reviewer);
      }, 5);

      // The settlement work can be long. If another worker legitimately advanced
      // or completed this queue while this execution was running, never write the
      // old SETTLE checkpoint back over the newer state.
      const currentAfterSettlement = realityTvSpreadsheetRetry_("Verify Reality TV settlement claim", function() {
        return realityTvGetQueue_(queue.QueueId);
      }, 4);
      if (!currentAfterSettlement) throw new Error("Review queue item disappeared during settlement.");
      if (realityTvString_(currentAfterSettlement.ReviewStatus).toUpperCase() !== "APPROVING" ||
          realityTvString_(currentAfterSettlement.ApprovalStage).toUpperCase() !== "SETTLE" ||
          realityTvNumber_(currentAfterSettlement.ApprovalAttemptCount, 0) !== realityTvNumber_(attempts, 0)) {
        return realityTvApprovalState_(currentAfterSettlement);
      }

      realityTvSpreadsheetRetry_("Advance Reality TV episode approval", function() {
        const now = new Date();
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          PushStatus: "EPISODE SETTLED",
          // Episode N settlement is the browser-facing durability boundary.
          // Next-episode construction always runs through the separate durable
          // RealityNextEpisodeJobs queue instead of holding this approval open.
          ApprovalStage: "FINALIZE_CURRENT",
          ApprovalStageStartedAt: now,
          ApprovalHeartbeatAt: now,
          ErrorMessage: "",
          UpdatedAt: now
        });
      }, 4);
      realityTvScheduleApprovalContinuation_();
      const state = realityTvApprovalState_(realityTvGetQueue_(queue.QueueId));
      state.remainingCount = settlement.remainingCount;
      state.message = "Episode finalized — next episode is being prepared…";
      return state;
    }

    if (stage === "FINALIZE_CURRENT") {
      const hub = realityTvSpreadsheetRetry_("Queue final Reality TV Hub review", function() {
        return realityTvUpdateHubReview_(queue, "APPROVED", reviewer, "Local episode finalization completed. Next episode preparation is queued separately.");
      }, 3);
      const nextJob = realityTvQueueNextEpisodePreparation_(season, episode, reviewer);
      const completedAt = new Date();
      realityTvSpreadsheetRetry_("Complete current Reality TV episode finalization", function() {
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          ReviewStatus: "APPROVED",
          PushStatus: "PUSHED",
          PushedAt: completedAt,
          ApprovalStage: "COMPLETE",
          ApprovalCompletedAt: completedAt,
          ApprovalHeartbeatAt: completedAt,
          NextEpisodeJobId: nextJob && nextJob.job ? nextJob.job.JobId : "",
          ErrorMessage: hub && hub.error ? hub.error : "",
          UpdatedAt: completedAt
        });
      }, 4);
      const state = realityTvApprovalState_(realityTvGetQueue_(queue.QueueId));
      state.nextEpisodeJob = nextJob && nextJob.state ? nextJob.state : null;
      state.message = nextJob && nextJob.queued
        ? "Episode finalized and scored. You are done; the server is preparing the next episode automatically."
        : "Episode finalized and scored.";
      return state;
    }

    if (stage === "BUILD_NEXT") {
      const build = realityTvSpreadsheetRetry_("Build next Reality TV episode", function() {
        return realityTvBuildNextEpisodeAfterApproval_(season, episode, checkpoint);
      }, 3);
      const enabledTypes = build.nextEpisode && typeof realityTvQuestionTemplatesForSeason_ === "function"
        ? realityTvQuestionTemplatesForSeason_(season.SeasonId)
            .filter(function(row) { return realityTvBool_(row.Enabled); })
            .map(function(row) { return row.TemplateId; })
        : [];
      const nextStage = build.nextEpisode && enabledTypes.length ? "BUILD_QUESTIONS" : "FINALIZE";
      realityTvSpreadsheetRetry_("Advance Reality TV next-episode approval", function() {
        const now = new Date();
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          PushStatus: build.nextEpisode ? "NEXT EPISODE READY" : "EPISODE COMPLETE",
          ApprovalStage: nextStage,
          NextEpisodeId: build.nextEpisode ? build.nextEpisode.EpisodeId : "",
          ApprovalStageStartedAt: now,
          ApprovalHeartbeatAt: now,
          ErrorMessage: "",
          UpdatedAt: now
        });
      }, 4);
      realityTvScheduleApprovalContinuation_();
      const state = realityTvApprovalState_(realityTvGetQueue_(queue.QueueId));
      state.nextEpisode = build.nextEpisode;
      state.remainingCount = build.remainingCount;
      state.message = build.nextEpisode
        ? build.nextEpisode.EpisodeName + " created. " + (enabledTypes.length ? "Building its Extra Questions next." : "No Extra Questions are enabled; finalizing approval.")
        : "Episode settled. Finalizing approval records.";
      return state;
    }

    if (stage === "BUILD_QUESTIONS") {
      const nextEpisode = queue.NextEpisodeId ? realityTvGetEpisode_(queue.NextEpisodeId) : null;
      if (!nextEpisode || typeof realityTvMaterializeEpisodeQuestionPackBulk_ !== "function") {
        const now = new Date();
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          PushStatus: "QUESTIONS COMPLETE",
          ApprovalStage: "FINALIZE",
          ApprovalStageStartedAt: now,
          ApprovalHeartbeatAt: now,
          ErrorMessage: "",
          UpdatedAt: now
        });
        realityTvScheduleApprovalContinuation_();
        return realityTvApprovalState_(realityTvGetQueue_(queue.QueueId));
      }

      const enabledTypes = realityTvQuestionTemplatesForSeason_(season.SeasonId)
        .filter(function(row) { return realityTvBool_(row.Enabled); })
        .map(function(row) { return realityTvKey_(row.TemplateId); });
      const questionBuild = realityTvSpreadsheetRetry_("Materialize Reality TV Extra Questions in bulk", function() {
        return realityTvMaterializeEpisodeQuestionPackBulk_(season, nextEpisode, {
          enabledTypes: enabledTypes,
          buildId: realityTvString_(queue.ApprovalQuestionBuildId),
          managedBy: "APPROVAL",
          checkpoint: checkpoint
        });
      }, 3);
      const now = new Date();
      realityTvSpreadsheetRetry_("Complete Reality TV bulk question build", function() {
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          PushStatus: "QUESTIONS COMPLETE",
          ApprovalStage: "FINALIZE",
          ApprovalQuestionBuildId: questionBuild ? questionBuild.buildId : "",
          ApprovalStageStartedAt: now,
          ApprovalHeartbeatAt: now,
          ErrorMessage: "",
          UpdatedAt: now
        });
      }, 4);
      realityTvScheduleApprovalContinuation_();
      const state = realityTvApprovalState_(realityTvGetQueue_(queue.QueueId));
      state.nextEpisode = nextEpisode;
      state.questionBuild = questionBuild;
      state.message = enabledTypes.length
        ? "Extra Questions and answers were written in one bulk pass. Finalizing approval."
        : "No Extra Questions are enabled. Finalizing approval.";
      return state;
    }

    if (stage === "FINALIZE" || stage === "SYNC_HUB") {
      const nextEpisode = queue.NextEpisodeId ? realityTvGetEpisode_(queue.NextEpisodeId) : null;
      const hub = realityTvSpreadsheetRetry_("Finish Reality TV approval", function() {
        return realityTvSyncApprovalHub_(season, episode, queue, reviewer, nextEpisode);
      }, 3);
      const completedAt = new Date();
      realityTvSpreadsheetRetry_("Complete Reality TV approval", function() {
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          ReviewStatus: "APPROVED",
          PushStatus: "PUSHED",
          PushedAt: completedAt,
          ApprovalStage: "COMPLETE",
          ApprovalCompletedAt: completedAt,
          ApprovalHeartbeatAt: completedAt,
          ErrorMessage: hub.warning || "",
          UpdatedAt: completedAt
        });
      }, 4);
      const state = realityTvApprovalState_(realityTvGetQueue_(queue.QueueId));
      state.nextEpisode = nextEpisode;
      state.warning = hub.warning || "";
      state.message = nextEpisode
        ? "Result approved, episode settled, and " + nextEpisode.EpisodeName + " created with its enabled questions."
        : "Result approved and episode settled.";
      return state;
    }

    throw new Error("Unknown approval stage: " + stage + ".");
  } catch (err) {
    const retryable = realityTvIsRetryableSpreadsheetError_(err) && attempts < 5;
    try {
      realityTvSpreadsheetRetry_("Record Reality TV approval error", function() {
        const now = new Date();
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          PushStatus: retryable ? "QUEUED" : "ERROR",
          ApprovalAttemptCount: attempts,
          ApprovalHeartbeatAt: now,
          ErrorMessage: retryable ? "Temporary spreadsheet error; automatic retry scheduled: " + (err.message || String(err)) : (err.message || String(err)),
          UpdatedAt: now
        });
      }, 3);
    } catch (recordError) {
      if (typeof Logger !== "undefined") Logger.log("Could not record Reality TV approval error: " + recordError);
    }
    if (retryable) {
      realityTvScheduleApprovalContinuation_();
      const state = realityTvApprovalState_(realityTvGetQueue_(queue.QueueId));
      state.retryScheduled = true;
      state.message = "A temporary spreadsheet error occurred. The server will retry this stage automatically.";
      return state;
    }
    throw err;
  }
}

function realityTvContinuePendingApprovalKick() {
  // Remove the current one-shot trigger first so this pass can schedule the next fast kick.
  realityTvDeleteApprovalKickTriggers_();
  realityTvContinuePendingApprovals();
}

function realityTvContinuePendingApprovals() {
  realityTvEnsureSystem_();
  const owner = realityTvApprovalQueueOwner_();
  if (!owner) {
    realityTvDeleteApprovalTriggers_();
    return;
  }
  try {
    // Exactly one durable approval unit per watchdog invocation.
    realityTvContinueRealityTvApprovalInternal_({ queueId: owner.QueueId, username: owner.ReviewedBy || "approval-worker" });
  } catch (err) {
    if (typeof Logger !== "undefined") Logger.log("Reality TV approval watchdog warning: " + (err.message || err));
  }
  if (realityTvApprovalQueueOwner_()) realityTvScheduleApprovalContinuation_();
  else realityTvDeleteApprovalTriggers_();
}


function apiAdminResetRealityTvApproval(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const queue = realityTvGetQueue_(payload.queueId);
  if (!queue) throw new Error("Review queue item not found.");

  const status = realityTvString_(queue.ReviewStatus).toUpperCase();
  if (status === "APPROVED") {
    const completeState = realityTvApprovalState_(queue);
    completeState.message = "This approval is already complete. No reset was needed.";
    return completeState;
  }
  if (status !== "APPROVING") {
    throw new Error("Only an approval currently marked APPROVING can be reset.");
  }

  const season = realityTvGetSeason_(queue.SeasonId);
  const episode = realityTvGetEpisode_(queue.EpisodeId);
  if (!season || !episode) throw new Error("Season or episode not found for this approval.");

  const episodeFinal = realityTvString_(episode.Status).toUpperCase() === "FINAL";
  const remaining = realityTvContestantsForSeason_(season.SeasonId).filter(function(row) {
    return realityTvBool_(row.Active) && realityTvKey_(row.Status) === "active";
  });
  const nextNumber = realityTvNumber_(episode.EpisodeNumber, 0) + 1;
  const existingNext = realityTvEpisodesForSeason_(season.SeasonId).find(function(row) {
    return realityTvNumber_(row.EpisodeNumber, 0) === nextNumber;
  }) || null;

  let stage = realityTvString_(queue.ApprovalStage || "SETTLE").toUpperCase();
  const allResultsMode = realityTvString_(queue.EpisodeFinalizeMode).toUpperCase() === "ALL_RESULTS";
  if (allResultsMode) {
    const readiness = realityTvEpisodeFinalizeReadiness_(season.SeasonId, episode.EpisodeId);
    if (!episodeFinal) {
      if (readiness.pendingCount > 0) stage = "SETTLE_QUESTIONS";
      else if (realityTvNumber_(queue.ApprovalQuestionTotalCount, 0) > 0 && !realityTvBool_(queue.ApprovalQuestionScoresRecalculated)) stage = "SCORE_QUESTIONS";
      else stage = "SETTLE";
    } else stage = "FINALIZE_CURRENT";
  } else if (!episodeFinal) {
    stage = "SETTLE";
  } else if (existingNext || realityTvString_(queue.NextEpisodeId)) {
    const resolvedNextId = existingNext ? existingNext.EpisodeId : realityTvString_(queue.NextEpisodeId);
    const nextBuild = typeof realityTvLatestQuestionBuildStateForSeason_ === "function"
      ? (realityTvLatestQuestionBuildStateForSeason_(season.SeasonId, resolvedNextId) ||
          (typeof realityTvLatestCompletedQuestionBuildStateForSeason_ === "function"
            ? realityTvLatestCompletedQuestionBuildStateForSeason_(season.SeasonId, resolvedNextId)
            : null))
      : null;
    const enabledQuestionCount = typeof realityTvQuestionTemplatesForSeason_ === "function"
      ? realityTvQuestionTemplatesForSeason_(season.SeasonId).filter(function(row) { return realityTvBool_(row.Enabled); }).length
      : 0;
    stage = enabledQuestionCount && (!nextBuild || !nextBuild.complete) ? "BUILD_QUESTIONS" : "FINALIZE";
  } else if (realityTvBool_(season.AutoCreateNextEpisode) && remaining.length > 1) {
    stage = "FINALIZE_CURRENT";
  } else {
    stage = "FINALIZE";
  }

  const now = new Date();
  realityTvSpreadsheetRetry_("Reset stuck Reality TV approval", function() {
    realityTvUpdateObjectRow_(
      SpreadsheetApp.getActive().getSheetByName(REALITY_TV_RESULTS_QUEUE_SHEET),
      queue.__rowNumber,
      {
        PushStatus: "QUEUED",
        ApprovalStage: stage,
        NextEpisodeId: existingNext ? existingNext.EpisodeId : realityTvString_(queue.NextEpisodeId),
        ApprovalStageStartedAt: now,
        ApprovalHeartbeatAt: now,
        ErrorMessage: "",
        UpdatedAt: now
      }
    );
  }, 4);

  realityTvScheduleApprovalContinuation_();
  const refreshed = realityTvGetQueue_(queue.QueueId);
  const waitingFor = realityTvApprovalWaitingFor_(refreshed);
  const state = waitingFor ? realityTvApprovalWaitingState_(refreshed, waitingFor) : realityTvApprovalState_(refreshed);
  state.reset = true;
  state.message = stage === "SETTLE_QUESTIONS"
    ? "Approval reset. Extra Question settlement will resume automatically."
    : (stage === "SCORE_QUESTIONS"
        ? "Approval reset. Extra Questions are settled; score recalculation will resume automatically."
        : (stage === "SETTLE"
            ? "Approval reset. Elimination settlement will resume automatically."
        : (stage === "FINALIZE_CURRENT"
            ? "Approval reset. The episode is already settled; final episode records will resume automatically."
            : (stage === "FINALIZE_CURRENT"
                ? "Approval reset. The episode is already settled; final approval will queue next-episode preparation separately."
                : (stage === "BUILD_QUESTIONS"
                    ? "Approval reset. The episode and next episode already exist; Extra Question building will resume."
                    : "Approval reset. Final approval records will resume.")))));
  return state;
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
