/* =========================
   REALITY TV SEASON MANAGER
   Phase 2B v1.0.23
========================= */

const REALITY_TV_SEASONS_SHEET = "RealitySeasons";
const REALITY_TV_CONTESTANTS_SHEET = "RealityContestants";
const REALITY_TV_EPISODES_SHEET = "RealityEpisodes";
const REALITY_TV_RESULTS_QUEUE_SHEET = "RealityResultQueue";
const REALITY_TV_HUB_PROPERTY = "EXTERNAL_RESULTS_HUB_SPREADSHEET_ID";

const REALITY_TV_SEASON_HEADERS = [
  "SeasonId", "GameId", "ShowName", "SeasonName", "SeasonNumber", "Year",
  "Provider", "FirstEpisodeDateTime", "WeeklyIntervalDays", "LockOffsetMinutes",
  "Points", "QuestionTemplate", "CurrentEpisodeNumber", "Status",
  "AutoCreateNextEpisode", "CreatedAt", "UpdatedAt"
];

const REALITY_TV_CONTESTANT_HEADERS = [
  "SeasonId", "GameId", "ContestantId", "Name", "FullName", "ImageUrl",
  "TeamOrTribe", "Age", "Hometown", "Occupation", "Biography",
  "ExternalSubjectId", "Status", "EliminatedEpisode", "EliminatedAt",
  "DisplayOrder", "Active", "CreatedAt", "UpdatedAt"
];

const REALITY_TV_EPISODE_HEADERS = [
  "SeasonId", "GameId", "EpisodeId", "EpisodeNumber", "EpisodeName",
  "AirDateTime", "LockDateTime", "CategoryId", "ExternalEventId",
  "ExternalMarketId", "OutcomeType", "Status", "EliminatedContestantIds",
  "ResultQueueId", "NextEpisodeCreated", "CreatedAt", "UpdatedAt"
];

const REALITY_TV_QUEUE_HEADERS = [
  "QueueId", "SeasonId", "GameId", "EpisodeId", "EpisodeNumber", "CategoryId",
  "OutcomeType", "SelectedContestantIds", "ReviewStatus", "EvidenceUrl", "Notes",
  "SubmittedBy", "SubmittedAt", "ReviewedBy", "ReviewedAt", "PushStatus",
  "ApprovalStage", "ApprovalStartedAt", "ApprovalCompletedAt", "ApprovalAttemptCount",
  "PushedAt", "NextEpisodeId", "HubImportedResultId", "HubReviewId",
  "ErrorMessage", "UpdatedAt"
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
  realityTvGetOrCreateSheet_(ss, REALITY_TV_RESULTS_QUEUE_SHEET, REALITY_TV_QUEUE_HEADERS);
  return { success: true };
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

function realityTvFormatQuestion_(template, episodeNumber) {
  const raw = realityTvString_(template) || "Who will be eliminated in Episode {episode}?";
  return raw.replace(/\{episode\}/gi, String(episodeNumber));
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
  if (existing) return existing;

  const activeContestants = realityTvContestantsForSeason_(season.SeasonId).filter(function(row) {
    return realityTvBool_(row.Active) && realityTvKey_(row.Status || "active") === "active";
  });
  if (activeContestants.length < 2) {
    throw new Error("At least two active contestants are required to create another elimination episode.");
  }

  const timing = realityTvEpisodeTiming_(season, episodeNumber);
  const categoryId = "episode-" + episodeNumber + "-eliminated";
  const externalEventId = season.GameId + "-episode-" + episodeNumber;
  const externalMarketId = "episode-" + episodeNumber + "-elimination";
  const question = realityTvFormatQuestion_(season.QuestionTemplate, episodeNumber);

  const setup = adminGetGameSetup({ gameId: season.GameId });
  let category = (setup.categories || []).find(function(item) {
    return realityTvKey_(item.categoryId) === realityTvKey_(categoryId);
  });

  if (!category) {
    adminCreateCategory({
      gameId: season.GameId,
      category: question,
      categoryId: categoryId,
      section: "Episode " + episodeNumber,
      points: realityTvNumber_(season.Points, 1),
      locked: false,
      lockDateTime: timing.lockDateTime,
      displayOrder: episodeNumber,
      groupId: "reality-tv-eliminations",
      layoutType: "image",
      shortName: "Episode " + episodeNumber,
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

  // Creation can be retried safely after a browser timeout. Re-read the
  // question and add only any answers that did not finish on the first run.
  const refreshedSetup = adminGetGameSetup({ gameId: season.GameId });
  category = (refreshedSetup.categories || []).find(function(item) {
    return realityTvKey_(item.categoryId) === realityTvKey_(categoryId);
  });
  if (!category) throw new Error("Episode question could not be created: " + categoryId + ".");

  const existingNomineeIds = {};
  (category.nominees || []).forEach(function(item) {
    existingNomineeIds[realityTvKey_(item.nomineeId)] = true;
  });
  const missingContestants = activeContestants.filter(function(contestant) {
    return !existingNomineeIds[realityTvKey_(contestant.ContestantId)];
  });

  if (missingContestants.length) {
    adminBulkCreateNominees({
      gameId: season.GameId,
      categoryId: categoryId,
      category: question,
      section: "Episode " + episodeNumber,
      itemsJSON: JSON.stringify(missingContestants.map(function(contestant) {
        return {
          nominee: contestant.Name,
          nomineeId: contestant.ContestantId,
          shortAnswer: contestant.Name,
          fileId: "",
          logoUrl: contestant.ImageUrl || "",
          person: contestant.FullName || contestant.Name,
          active: true
        };
      }))
    });
  }

  const now = new Date();
  const episode = {
    SeasonId: season.SeasonId,
    GameId: season.GameId,
    EpisodeId: season.SeasonId + "-episode-" + episodeNumber,
    EpisodeNumber: episodeNumber,
    EpisodeName: "Episode " + episodeNumber,
    AirDateTime: timing.airDateTime,
    LockDateTime: timing.lockDateTime,
    CategoryId: categoryId,
    ExternalEventId: externalEventId,
    ExternalMarketId: externalMarketId,
    OutcomeType: "elimination",
    Status: "OPEN",
    EliminatedContestantIds: "",
    ResultQueueId: "",
    NextEpisodeCreated: false,
    CreatedAt: now,
    UpdatedAt: now
  };
  realityTvUpsertObject_(ss, REALITY_TV_EPISODES_SHEET, REALITY_TV_EPISODE_HEADERS, ["EpisodeId"], episode);

  const seasonSheet = ss.getSheetByName(REALITY_TV_SEASONS_SHEET);
  realityTvUpdateObjectRow_(seasonSheet, season.__rowNumber || realityTvGetSeason_(season.SeasonId).__rowNumber, {
    CurrentEpisodeNumber: episodeNumber,
    UpdatedAt: now
  });

  if (!options.skipHubSync) {
    realityTvSyncEpisodeToHub_(season, episode, activeContestants, question);
  }
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
      return {
        Provider: "manual-reality-tv",
        ExternalSubjectId: contestant.ExternalSubjectId || contestant.ContestantId,
        Name: contestant.Name,
        SubjectType: "contestant",
        ImageUrl: contestant.ImageUrl || "",
        MetadataJSON: JSON.stringify({
          fullName: contestant.FullName || "",
          teamOrTribe: contestant.TeamOrTribe || "",
          age: contestant.Age || "",
          hometown: contestant.Hometown || "",
          occupation: contestant.Occupation || ""
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

function setupRealityTvSeasonManager() {
  realityTvEnsureSystem_();
  return {
    success: true,
    message: "Reality TV Season Manager is ready.",
    sheets: [REALITY_TV_SEASONS_SHEET, REALITY_TV_CONTESTANTS_SHEET, REALITY_TV_EPISODES_SHEET, REALITY_TV_RESULTS_QUEUE_SHEET]
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

function apiAdminGetRealityTvDashboard(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();
  const ss = SpreadsheetApp.getActive();
  const seasons = realityTvReadObjects_(ss, REALITY_TV_SEASONS_SHEET).map(function(season) {
    return {
      season: season,
      contestants: realityTvContestantsForSeason_(season.SeasonId),
      episodes: realityTvEpisodesForSeason_(season.SeasonId),
      queue: realityTvQueueForSeason_(season.SeasonId)
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

  if (!showName) throw new Error("Show name is required.");
  if (!firstEpisodeDateTime) throw new Error("First episode date/time is required.");
  if (!Array.isArray(contestants) || contestants.length < 2) throw new Error("Add at least two contestants.");

  const existingSeason = realityTvReadObjects_(SpreadsheetApp.getActive(), REALITY_TV_SEASONS_SHEET).find(function(row) {
    return realityTvKey_(row.GameId) === realityTvKey_(gameId);
  });
  const existingEpisodes = existingSeason ? realityTvEpisodesForSeason_(existingSeason.SeasonId) : [];
  if (existingSeason && existingEpisodes.length) {
    return {
      success: true,
      duplicate: true,
      message: "This Reality TV season already exists. The dashboard was refreshed.",
      gameId: gameId,
      seasonId: existingSeason.SeasonId,
      episode: existingEpisodes[0]
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
    Provider: "manual-reality-tv",
    FirstEpisodeDateTime: firstEpisodeDateTime,
    WeeklyIntervalDays: Math.max(1, realityTvNumber_(payload.weeklyIntervalDays, 7)),
    LockOffsetMinutes: Math.max(0, realityTvNumber_(payload.lockOffsetMinutes, 5)),
    Points: Math.max(0, realityTvNumber_(payload.points, 1)),
    QuestionTemplate: realityTvString_(payload.questionTemplate) || "Who will be eliminated in Episode {episode}?",
    CurrentEpisodeNumber: 1,
    Status: "ACTIVE",
    AutoCreateNextEpisode: payload.autoCreateNextEpisode === undefined ? true : realityTvBool_(payload.autoCreateNextEpisode),
    CreatedAt: existingSeason && existingSeason.CreatedAt ? existingSeason.CreatedAt : now,
    UpdatedAt: now
  };
  realityTvUpsertObject_(SpreadsheetApp.getActive(), REALITY_TV_SEASONS_SHEET, REALITY_TV_SEASON_HEADERS, ["SeasonId"], season);

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
  const episode = realityTvCreateEpisode_(createdSeason, 1);
  return {
    success: true,
    message: existingSeason
      ? "The interrupted Reality TV season setup was repaired and Episode 1 is ready."
      : "Reality TV season, contestant roster, and Episode 1 were created.",
    gameId: gameId,
    seasonId: seasonId,
    episode: episode,
    game: gameResult
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
  const validTypes = ["elimination", "double-elimination", "no-elimination", "medical-withdrawal", "quit"];
  if (validTypes.indexOf(outcomeType) === -1) throw new Error("Unsupported outcome type.");
  if (outcomeType === "no-elimination" && selectedIds.length) throw new Error("No Elimination cannot include a contestant.");
  if (["elimination", "medical-withdrawal", "quit"].indexOf(outcomeType) !== -1 && selectedIds.length !== 1) {
    throw new Error("Select exactly one contestant for this result type.");
  }
  if (outcomeType === "double-elimination" && selectedIds.length !== 2) {
    throw new Error("Select exactly two contestants for a double elimination.");
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

  const isPush = outcomeType === "no-elimination" || outcomeType === "double-elimination";
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
  selected.forEach(function(contestant) {
    realityTvUpdateObjectRow_(contestantSheet, contestant.__rowNumber, {
      Status: outcomeType === "quit" ? "QUIT" : outcomeType === "medical-withdrawal" ? "WITHDRAWN" : "ELIMINATED",
      EliminatedEpisode: episode.EpisodeNumber,
      EliminatedAt: now,
      Active: false,
      UpdatedAt: now
    });
  });

  const episodeSheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODES_SHEET);
  realityTvUpdateObjectRow_(episodeSheet, episode.__rowNumber, {
    Status: "FINAL",
    OutcomeType: outcomeType,
    EliminatedContestantIds: JSON.stringify(selectedIds),
    UpdatedAt: now
  });

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
    nextEpisode = realityTvCreateEpisode_(freshSeason, nextNumber, { skipHubSync: true });
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
  if (nextEpisode) {
    try {
      const contestants = realityTvContestantsForSeason_(season.SeasonId).filter(function(row) {
        return realityTvBool_(row.Active) && realityTvKey_(row.Status) === "active";
      });
      const question = realityTvFormatQuestion_(season.QuestionTemplate, nextEpisode.EpisodeNumber);
      const sync = realityTvSyncEpisodeToHub_(season, nextEpisode, contestants, question);
      if (sync && sync.error) warnings.push(sync.error);
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

  return { warning: warnings.join(" | ") };
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
  }

  return realityTvApprovalState_(realityTvGetQueue_(payload.queueId));
}

function apiAdminContinueRealityTvApproval(payload) {
  requireAdmin_(payload || {});
  realityTvEnsureSystem_();

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    return {
      success: true,
      busy: true,
      complete: false,
      message: "Another approval stage is still running."
    };
  }

  try {
    let queue = realityTvGetQueue_(payload.queueId);
    if (!queue) throw new Error("Review queue item not found.");
    if (realityTvString_(queue.ReviewStatus).toUpperCase() === "PENDING") {
      apiAdminApproveRealityTvResult(payload);
      queue = realityTvGetQueue_(payload.queueId);
    }
    if (realityTvString_(queue.ReviewStatus).toUpperCase() === "APPROVED") {
      return realityTvApprovalState_(queue);
    }
    if (realityTvString_(queue.ReviewStatus).toUpperCase() !== "APPROVING") {
      throw new Error("This result is not awaiting approval processing.");
    }

    const season = realityTvGetSeason_(queue.SeasonId);
    const episode = realityTvGetEpisode_(queue.EpisodeId);
    if (!season || !episode) throw new Error("Season or episode not found.");

    const queueSheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_RESULTS_QUEUE_SHEET);
    const reviewer = realityTvString_(queue.ReviewedBy || payload.username || "administrator");
    const stage = realityTvString_(queue.ApprovalStage || "SETTLE").toUpperCase();
    const now = new Date();
    const attempts = realityTvNumber_(queue.ApprovalAttemptCount, 0) + 1;

    try {
      if (stage === "SETTLE") {
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          PushStatus: "SETTLING EPISODE",
          ApprovalAttemptCount: attempts,
          ErrorMessage: "",
          UpdatedAt: now
        });
        const settlement = realityTvSettleEpisodeOnly_(season, episode, queue, reviewer);
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          PushStatus: "EPISODE SETTLED",
          ApprovalStage: "BUILD_NEXT",
          ErrorMessage: "",
          UpdatedAt: new Date()
        });
        const state = realityTvApprovalState_(realityTvGetQueue_(queue.QueueId));
        state.remainingCount = settlement.remainingCount;
        state.message = "Episode settled. Preparing the next episode.";
        return state;
      }

      if (stage === "BUILD_NEXT") {
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          PushStatus: "BUILDING NEXT EPISODE",
          ApprovalAttemptCount: attempts,
          ErrorMessage: "",
          UpdatedAt: now
        });
        const build = realityTvBuildNextEpisodeAfterApproval_(season, episode);
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          PushStatus: build.nextEpisode ? "NEXT EPISODE READY" : "EPISODE COMPLETE",
          ApprovalStage: "SYNC_HUB",
          NextEpisodeId: build.nextEpisode ? build.nextEpisode.EpisodeId : "",
          ErrorMessage: "",
          UpdatedAt: new Date()
        });
        const state = realityTvApprovalState_(realityTvGetQueue_(queue.QueueId));
        state.nextEpisode = build.nextEpisode;
        state.remainingCount = build.remainingCount;
        state.message = build.nextEpisode
          ? build.nextEpisode.EpisodeName + " created. Finishing approval records."
          : "Episode settled. Finishing approval records.";
        return state;
      }

      if (stage === "SYNC_HUB") {
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          PushStatus: "SYNCING APPROVAL",
          ApprovalAttemptCount: attempts,
          ErrorMessage: "",
          UpdatedAt: now
        });
        const nextEpisode = queue.NextEpisodeId ? realityTvGetEpisode_(queue.NextEpisodeId) : null;
        const hub = realityTvSyncApprovalHub_(season, episode, queue, reviewer, nextEpisode);
        const completedAt = new Date();
        realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
          ReviewStatus: "APPROVED",
          PushStatus: "PUSHED",
          PushedAt: completedAt,
          ApprovalStage: "COMPLETE",
          ApprovalCompletedAt: completedAt,
          ErrorMessage: hub.warning || "",
          UpdatedAt: completedAt
        });
        const state = realityTvApprovalState_(realityTvGetQueue_(queue.QueueId));
        state.nextEpisode = nextEpisode;
        state.warning = hub.warning || "";
        state.message = nextEpisode
          ? "Result approved, episode settled, and " + nextEpisode.EpisodeName + " created."
          : "Result approved and episode settled.";
        return state;
      }

      if (stage === "COMPLETE") {
        return realityTvApprovalState_(queue);
      }

      throw new Error("Unknown approval stage: " + stage + ".");
    } catch (err) {
      realityTvUpdateObjectRow_(queueSheet, queue.__rowNumber, {
        PushStatus: "ERROR",
        ApprovalAttemptCount: attempts,
        ErrorMessage: err.message || String(err),
        UpdatedAt: new Date()
      });
      throw err;
    }
  } finally {
    lock.releaseLock();
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
