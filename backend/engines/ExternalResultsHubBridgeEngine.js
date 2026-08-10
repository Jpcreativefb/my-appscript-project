/* =====================================================
   EXTERNAL RESULTS HUB BRIDGE — OUTBOUND + SAFE INBOUND
   Production v1.2.8

   The Awards App remains authoritative. Local game actions
   only enqueue Hub work. A separate trigger performs the
   cross-spreadsheet writes with retries after the user-facing
   action has completed.
===================================================== */

const EXTERNAL_RESULTS_BRIDGE_OUTBOX_SHEET = "ExternalResultsHubOutbox";
const EXTERNAL_RESULTS_BRIDGE_INBOX_SHEET = "ExternalResultsInbox";
const EXTERNAL_RESULTS_BRIDGE_HUB_PROPERTY = "EXTERNAL_RESULTS_HUB_SPREADSHEET_ID";
const EXTERNAL_RESULTS_BRIDGE_TRIGGER = "externalResultsProcessHubOutbox";
const EXTERNAL_RESULTS_BRIDGE_MAX_ATTEMPTS = 5;

const EXTERNAL_RESULTS_BRIDGE_OUTBOX_HEADERS = [
  "JobId", "JobType", "EntityKey", "Provider", "PayloadJSON", "Status",
  "AttemptCount", "NextAttemptAt", "LastAttemptAt", "CompletedAt",
  "ErrorMessage", "CreatedAt", "UpdatedAt",
  "TargetSpreadsheetId", "TargetSpreadsheetName", "WriteReceiptJSON", "VerifiedAt"
];

const EXTERNAL_RESULTS_BRIDGE_INBOX_HEADERS = [
  "DeliveryId", "DeliveryBatchId", "ReviewId", "ImportedResultId", "Provider",
  "AppGameId", "CategoryId", "NomineeId", "ExternalEventId", "ExternalMarketId",
  "ExternalSubjectId", "ResultKey", "ResultValue", "WinningOutcome", "WinnersJSON",
  "IsWinner", "Finality", "EvidenceUrl", "SourceConfigJSON", "Status",
  "AttemptCount", "LastAttemptAt", "AppliedAt", "NativeRoute", "NativeQueueId",
  "NativeStatus", "NativeUpdatedAt", "ErrorMessage", "CreatedAt", "UpdatedAt"
];

const EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS = {
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

function externalResultsBridgeString_(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function externalResultsBridgeKey_(value) {
  return externalResultsBridgeString_(value).toLowerCase();
}

function externalResultsBridgeParseJson_(value, fallback) {
  if (value && typeof value === "object") return value;
  const text = externalResultsBridgeString_(value);
  if (!text) return fallback;
  try { return JSON.parse(text); }
  catch (err) { return fallback; }
}

function externalResultsBridgeGetHubId_() {
  return externalResultsBridgeString_(
    PropertiesService.getScriptProperties().getProperty(EXTERNAL_RESULTS_BRIDGE_HUB_PROPERTY)
  );
}

function externalResultsBridgeEnsureSheet_(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  const width = Math.max(sheet.getLastColumn(), 1);
  const existing = sheet.getRange(1, 1, 1, width).getValues()[0]
    .map(externalResultsBridgeString_);
  const missing = headers.filter(function(header) { return existing.indexOf(header) === -1; });
  if (sheet.getLastRow() === 0 || !existing.some(Boolean)) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else if (missing.length) {
    sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }
  if (sheet.getFrozenRows() < 1) sheet.setFrozenRows(1);
  return sheet;
}

function externalResultsBridgeEnsureSystem_() {
  const ss = SpreadsheetApp.getActive();
  externalResultsBridgeEnsureSheet_(ss, EXTERNAL_RESULTS_BRIDGE_OUTBOX_SHEET, EXTERNAL_RESULTS_BRIDGE_OUTBOX_HEADERS);
  externalResultsBridgeEnsureSheet_(ss, EXTERNAL_RESULTS_BRIDGE_INBOX_SHEET, EXTERNAL_RESULTS_BRIDGE_INBOX_HEADERS);
  return {
    success: true,
    sheets: [EXTERNAL_RESULTS_BRIDGE_OUTBOX_SHEET, EXTERNAL_RESULTS_BRIDGE_INBOX_SHEET]
  };
}

function externalResultsBridgeReadObjects_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(externalResultsBridgeString_);
  return values.slice(1).map(function(row, index) {
    const object = { __rowNumber: index + 2 };
    headers.forEach(function(header, col) { if (header) object[header] = row[col]; });
    return object;
  }).filter(function(row) {
    return headers.some(function(header) { return header && externalResultsBridgeString_(row[header]); });
  });
}

function externalResultsBridgeUpdateRow_(sheet, rowNumber, patch) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(externalResultsBridgeString_);
  Object.keys(patch || {}).forEach(function(key) {
    const index = headers.indexOf(key);
    if (index !== -1) sheet.getRange(rowNumber, index + 1).setValue(patch[key]);
  });
}

function externalResultsBridgeAppend_(sheet, headers, object) {
  sheet.appendRow(headers.map(function(header) {
    return Object.prototype.hasOwnProperty.call(object, header) ? object[header] : "";
  }));
}

function externalResultsBridgeUpsertRows_(ss, sheetName, headers, keyFields, objects) {
  objects = (objects || []).filter(Boolean);
  if (!objects.length) return { inserted: 0, updated: 0 };
  const sheet = externalResultsBridgeEnsureSheet_(ss, sheetName, headers);
  const rows = externalResultsBridgeReadObjects_(sheet);
  const byKey = {};
  rows.forEach(function(row) {
    const key = keyFields.map(function(field) { return externalResultsBridgeKey_(row[field]); }).join("|");
    if (key) byKey[key] = row;
  });
  let inserted = 0;
  let updated = 0;
  const appends = [];
  objects.forEach(function(object) {
    const key = keyFields.map(function(field) { return externalResultsBridgeKey_(object[field]); }).join("|");
    const prior = byKey[key];
    if (prior) {
      externalResultsBridgeUpdateRow_(sheet, prior.__rowNumber, object);
      updated += 1;
    } else {
      appends.push(headers.map(function(header) {
        return Object.prototype.hasOwnProperty.call(object, header) ? object[header] : "";
      }));
      inserted += 1;
    }
  });
  if (appends.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, appends.length, headers.length).setValues(appends);
  }
  return { inserted: inserted, updated: updated };
}

function externalResultsBridgeRequireKey_(object, fields, label) {
  (fields || []).forEach(function(field) {
    if (!externalResultsBridgeString_((object || {})[field])) {
      throw new Error((label || "Hub row") + " is missing required key " + field + ".");
    }
  });
}

function externalResultsBridgeVerifiedUpsert_(ss, sheetName, headers, keyFields, objects) {
  const usable = (objects || []).filter(Boolean);
  if (!usable.length) {
    return { sheetName: sheetName, expected: 0, verified: 0, inserted: 0, updated: 0, keys: [] };
  }
  usable.forEach(function(object) {
    externalResultsBridgeRequireKey_(object, keyFields, sheetName);
  });
  const write = externalResultsBridgeUpsertRows_(ss, sheetName, headers, keyFields, usable);
  SpreadsheetApp.flush();
  const sheet = ss.getSheetByName(sheetName);
  const rows = externalResultsBridgeReadObjects_(sheet);
  const keys = usable.map(function(object) {
    return keyFields.map(function(field) { return externalResultsBridgeKey_(object[field]); }).join("|");
  });
  const existing = {};
  rows.forEach(function(row) {
    const key = keyFields.map(function(field) { return externalResultsBridgeKey_(row[field]); }).join("|");
    if (key) existing[key] = true;
  });
  const missing = keys.filter(function(key) { return !existing[key]; });
  if (missing.length) {
    throw new Error("Hub write verification failed for " + sheetName + ": " + missing.length + " expected row(s) were not found after write.");
  }
  return {
    sheetName: sheetName,
    expected: usable.length,
    verified: usable.length,
    inserted: Number(write.inserted || 0),
    updated: Number(write.updated || 0),
    keys: keys
  };
}

function externalResultsBridgeReceipt_(hub, type, writes) {
  const verifiedRows = (writes || []).reduce(function(total, item) {
    return total + Number((item || {}).verified || 0);
  }, 0);
  if (!verifiedRows) {
    throw new Error("Hub job produced zero verified rows. The payload was incomplete or no Hub write occurred.");
  }
  return {
    jobType: type,
    targetSpreadsheetId: hub.getId(),
    targetSpreadsheetName: hub.getName(),
    verifiedRows: verifiedRows,
    writes: writes || [],
    verifiedAt: new Date()
  };
}

function externalResultsBridgeJobId_() {
  return "hub-job-" + Utilities.getUuid().replace(/-/g, "").slice(0, 18);
}

function externalResultsBridgeEnqueue_(jobType, entityKey, provider, payload) {
  externalResultsBridgeEnsureSystem_();
  if (!externalResultsBridgeGetHubId_()) {
    return { success: false, skipped: true, message: "External Results Hub is not configured." };
  }
  const sheet = SpreadsheetApp.getActive().getSheetByName(EXTERNAL_RESULTS_BRIDGE_OUTBOX_SHEET);
  const rows = externalResultsBridgeReadObjects_(sheet);
  const normalizedType = externalResultsBridgeString_(jobType).toUpperCase();
  const normalizedEntity = externalResultsBridgeString_(entityKey);
  const existing = rows.find(function(row) {
    return externalResultsBridgeKey_(row.JobType) === externalResultsBridgeKey_(normalizedType) &&
      externalResultsBridgeKey_(row.EntityKey) === externalResultsBridgeKey_(normalizedEntity);
  });
  const now = new Date();
  const record = {
    JobId: existing ? existing.JobId : externalResultsBridgeJobId_(),
    JobType: normalizedType,
    EntityKey: normalizedEntity,
    Provider: provider || "",
    PayloadJSON: JSON.stringify(payload || {}),
    Status: "QUEUED",
    AttemptCount: existing ? Number(existing.AttemptCount || 0) : 0,
    NextAttemptAt: "",
    LastAttemptAt: existing ? existing.LastAttemptAt || "" : "",
    CompletedAt: "",
    ErrorMessage: "",
    CreatedAt: existing ? existing.CreatedAt || now : now,
    UpdatedAt: now
  };
  if (existing) externalResultsBridgeUpdateRow_(sheet, existing.__rowNumber, record);
  else externalResultsBridgeAppend_(sheet, EXTERNAL_RESULTS_BRIDGE_OUTBOX_HEADERS, record);
  externalResultsBridgeSchedule_();
  return { success: true, queued: true, jobId: record.JobId, status: record.Status };
}

function externalResultsBridgeHasTrigger_() {
  if (typeof ScriptApp === "undefined" || typeof ScriptApp.getProjectTriggers !== "function") return false;
  return ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction && trigger.getHandlerFunction() === EXTERNAL_RESULTS_BRIDGE_TRIGGER;
  });
}

function externalResultsBridgeSchedule_() {
  try {
    if (typeof ScriptApp === "undefined" || externalResultsBridgeHasTrigger_()) return false;
    ScriptApp.newTrigger(EXTERNAL_RESULTS_BRIDGE_TRIGGER).timeBased().after(15000).create();
    return true;
  } catch (err) {
    if (typeof Logger !== "undefined") Logger.log("External Results Hub trigger warning: " + (err.message || err));
    return false;
  }
}

function externalResultsBridgeDeleteTriggers_() {
  if (typeof ScriptApp === "undefined" || typeof ScriptApp.getProjectTriggers !== "function") return;
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction && trigger.getHandlerFunction() === EXTERNAL_RESULTS_BRIDGE_TRIGGER) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function externalResultsBridgeRetryable_(err) {
  const message = err && err.message ? String(err.message) : String(err || "");
  return /service spreadsheets|internal error|timed out|please try again|lock timeout|holding the lock|dependency not ready/i.test(message);
}


function externalResultsBridgeBool_(value) {
  return value === true || ["true", "yes", "1", "on"].indexOf(externalResultsBridgeKey_(value)) !== -1;
}

function externalResultsBridgeJobPriority_(job) {
  const type = externalResultsBridgeString_((job || {}).JobType).toUpperCase();
  if (type === "UPSERT_EPISODE_BUNDLE") return 10;
  if (type === "UPSERT_REALITY_QUESTION_PACK") return 20;
  if (type === "UPSERT_EXTERNAL_MARKET_MAPPING") return 25;
  if (type === "UPSERT_EXTERNAL_MARKET_GROUP") return 25;
  if (type === "UPSERT_EPISODE_SCHEDULE") return 30;
  if (type === "UPSERT_MARKET_RESOLUTION") return 35;
  if (type === "CREATE_RESULT_REVIEW") return 40;
  if (type === "UPDATE_REVIEW") return 50;
  return 100;
}

function externalResultsBridgeFindCreateDependency_(jobs, updateJob) {
  const payload = externalResultsBridgeParseJson_((updateJob || {}).PayloadJSON, {});
  const reviewId = externalResultsBridgeKey_((payload.review || {}).ReviewId);
  const importedResultId = externalResultsBridgeKey_((payload.importedResult || {}).ImportedResultId || (payload.review || {}).ImportedResultId);
  return (jobs || []).find(function(candidate) {
    if (externalResultsBridgeString_(candidate.JobType).toUpperCase() !== "CREATE_RESULT_REVIEW") return false;
    const createPayload = externalResultsBridgeParseJson_(candidate.PayloadJSON, {});
    const candidateReview = externalResultsBridgeKey_((createPayload.review || {}).ReviewId);
    const candidateResult = externalResultsBridgeKey_((createPayload.importedResult || {}).ImportedResultId);
    return (!!reviewId && candidateReview === reviewId) || (!!importedResultId && candidateResult === importedResultId);
  }) || null;
}

function externalResultsBridgeHubHasReviewDependency_(hub, payload) {
  const review = payload && payload.review || null;
  const importedResult = payload && payload.importedResult || null;
  let reviewReady = !review;
  let resultReady = !importedResult;
  if (review) {
    const sheet = externalResultsBridgeEnsureSheet_(hub, "ReviewQueue", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ReviewQueue);
    reviewReady = externalResultsBridgeReadObjects_(sheet).some(function(row) {
      return externalResultsBridgeKey_(row.ReviewId) === externalResultsBridgeKey_(review.ReviewId);
    });
  }
  if (importedResult) {
    const sheet = externalResultsBridgeEnsureSheet_(hub, "ImportedResults", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ImportedResults);
    resultReady = externalResultsBridgeReadObjects_(sheet).some(function(row) {
      return externalResultsBridgeKey_(row.ImportedResultId) === externalResultsBridgeKey_(importedResult.ImportedResultId);
    });
  }
  return reviewReady && resultReady;
}

function externalResultsBridgeDependencyState_(hub, allJobs, job) {
  if (externalResultsBridgeString_(job.JobType).toUpperCase() !== "UPDATE_REVIEW") {
    return { ready: true };
  }
  const payload = externalResultsBridgeParseJson_(job.PayloadJSON, {});
  if (externalResultsBridgeHubHasReviewDependency_(hub, payload)) return { ready: true, alreadyInHub: true };
  const createJob = externalResultsBridgeFindCreateDependency_(allJobs, job);
  if (!createJob) {
    return {
      ready: false,
      orphan: true,
      message: "Legacy Hub dependency missing: no matching CREATE_RESULT_REVIEW job or Hub review row exists."
    };
  }
  const createStatus = externalResultsBridgeString_(createJob.Status).toUpperCase();
  if (createStatus === "COMPLETE") {
    return { ready: true, createJob: createJob };
  }
  return {
    ready: false,
    createJob: createJob,
    dependencyStatus: createStatus,
    message: "Waiting for CREATE_RESULT_REVIEW " + createJob.JobId + " before applying this review update."
  };
}

function externalResultsBridgeDeactivateStaleRealityQuestionPack_(hub, payload) {
  if (!payload || !payload.replaceQuestionPack) return { markets: 0, mappings: 0 };
  const provider = externalResultsBridgeKey_((payload.event || {}).Provider || "manual-reality-tv");
  const eventId = externalResultsBridgeKey_((payload.event || {}).ExternalEventId || payload.externalEventId);
  if (!eventId) return { markets: 0, mappings: 0 };
  const activeMarkets = {};
  (payload.markets || []).forEach(function(row) {
    activeMarkets[externalResultsBridgeKey_(row.ExternalMarketId)] = true;
  });
  const activeMappings = {};
  (payload.mappings || []).forEach(function(row) {
    activeMappings[externalResultsBridgeKey_(row.MappingId)] = true;
  });
  const mainMarketId = externalResultsBridgeKey_(payload.mainExternalMarketId);
  let deactivatedMarkets = 0;
  let deactivatedMappings = 0;

  const marketSheet = externalResultsBridgeEnsureSheet_(hub, "ExternalMarkets", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ExternalMarkets);
  externalResultsBridgeReadObjects_(marketSheet).forEach(function(row) {
    if (externalResultsBridgeKey_(row.Provider) !== provider || externalResultsBridgeKey_(row.ExternalEventId) !== eventId) return;
    const marketId = externalResultsBridgeKey_(row.ExternalMarketId);
    if (!marketId || marketId === mainMarketId || activeMarkets[marketId]) return;
    const raw = externalResultsBridgeParseJson_(row.RawJSON, {});
    if (!raw || !raw.episodeQuestionId) return;
    externalResultsBridgeUpdateRow_(marketSheet, row.__rowNumber, {
      ResolutionStatus: "inactive",
      LastUpdated: new Date()
    });
    deactivatedMarkets += 1;
  });

  const mappingSheet = externalResultsBridgeEnsureSheet_(hub, "AppMappings", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.AppMappings);
  externalResultsBridgeReadObjects_(mappingSheet).forEach(function(row) {
    if (externalResultsBridgeKey_(row.Provider) !== provider || externalResultsBridgeKey_(row.ExternalEventId) !== eventId) return;
    const source = externalResultsBridgeParseJson_(row.SourceConfigJSON, {});
    if (!source || !source.episodeQuestionId) return;
    const mappingId = externalResultsBridgeKey_(row.MappingId);
    if (activeMappings[mappingId]) return;
    externalResultsBridgeUpdateRow_(mappingSheet, row.__rowNumber, {
      Active: false,
      UpdatedAt: new Date()
    });
    deactivatedMappings += 1;
  });
  if (deactivatedMarkets || deactivatedMappings) SpreadsheetApp.flush();
  return { markets: deactivatedMarkets, mappings: deactivatedMappings };
}

function externalResultsBridgeRealityTvHealth_(main, hub) {
  const seasonSheet = main.getSheetByName("RealitySeasons");
  const episodeSheet = main.getSheetByName("RealityEpisodes");
  if (!seasonSheet || !episodeSheet || !hub) return [];
  const seasons = externalResultsBridgeReadObjects_(seasonSheet);
  const episodes = externalResultsBridgeReadObjects_(episodeSheet);
  const questionSheet = main.getSheetByName("RealityEpisodeQuestions");
  const contestantSheet = main.getSheetByName("RealityContestants");
  const questions = questionSheet ? externalResultsBridgeReadObjects_(questionSheet) : [];
  const contestants = contestantSheet ? externalResultsBridgeReadObjects_(contestantSheet) : [];
  const hubEvents = externalResultsBridgeReadObjects_(hub.getSheetByName("ExternalEvents"));
  const hubMarkets = externalResultsBridgeReadObjects_(hub.getSheetByName("ExternalMarkets"));
  const hubMappings = externalResultsBridgeReadObjects_(hub.getSheetByName("AppMappings"));
  const hubSubjects = externalResultsBridgeReadObjects_(hub.getSheetByName("ExternalSubjects"));

  return seasons.filter(function(season) {
    return externalResultsBridgeKey_(season.Status || "active") !== "archived";
  }).map(function(season) {
    const seasonEpisodes = episodes.filter(function(ep) {
      return externalResultsBridgeKey_(ep.SeasonId) === externalResultsBridgeKey_(season.SeasonId);
    }).sort(function(a, b) { return Number(a.EpisodeNumber || 0) - Number(b.EpisodeNumber || 0); });
    if (!seasonEpisodes.length) return null;
    const requested = Number(season.CurrentEpisodeNumber || 0);
    const episode = seasonEpisodes.find(function(ep) { return Number(ep.EpisodeNumber || 0) === requested; }) || seasonEpisodes[seasonEpisodes.length - 1];
    const eventId = externalResultsBridgeKey_(episode.ExternalEventId || episode.EpisodeId);
    const localQuestions = questions.filter(function(row) {
      return externalResultsBridgeKey_(row.EpisodeId) === externalResultsBridgeKey_(episode.EpisodeId);
    });
    const activeContestants = contestants.filter(function(row) {
      return externalResultsBridgeKey_(row.SeasonId) === externalResultsBridgeKey_(season.SeasonId) &&
        externalResultsBridgeBool_(row.Active === "" ? true : row.Active) &&
        externalResultsBridgeKey_(row.Status || "active") !== "eliminated";
    });
    const expectedMarkets = 1 + localQuestions.length;
    const expectedMappings = activeContestants.length + localQuestions.reduce(function(total, question) {
      const options = externalResultsBridgeParseJson_(question.AnswerOptionsJSON || "[]", []);
      return total + (Array.isArray(options) ? options.length : 0);
    }, 0);
    const eventFound = hubEvents.some(function(row) {
      return externalResultsBridgeKey_(row.Provider) === "manual-reality-tv" && externalResultsBridgeKey_(row.ExternalEventId) === eventId;
    });
    const actualMarkets = hubMarkets.filter(function(row) {
      return externalResultsBridgeKey_(row.Provider) === "manual-reality-tv" &&
        externalResultsBridgeKey_(row.ExternalEventId) === eventId &&
        externalResultsBridgeKey_(row.ResolutionStatus) !== "inactive";
    }).length;
    const actualMappings = hubMappings.filter(function(row) {
      return externalResultsBridgeKey_(row.Provider) === "manual-reality-tv" &&
        externalResultsBridgeKey_(row.ExternalEventId) === eventId &&
        (row.Active === "" || externalResultsBridgeBool_(row.Active));
    }).length;
    const subjectLookup = {};
    hubSubjects.filter(function(row) {
      return externalResultsBridgeKey_(row.Provider) === "manual-reality-tv";
    }).forEach(function(row) {
      subjectLookup[externalResultsBridgeKey_(row.ExternalSubjectId)] = true;
    });
    const contestantSubjects = activeContestants.filter(function(row) {
      return !!subjectLookup[externalResultsBridgeKey_(row.ExternalSubjectId || row.ContestantId)];
    }).length;
    return {
      seasonId: season.SeasonId,
      gameId: season.GameId,
      showName: season.ShowName,
      episodeId: episode.EpisodeId,
      episodeNumber: Number(episode.EpisodeNumber || 0),
      episodeName: episode.EpisodeName || ("Episode " + episode.EpisodeNumber),
      eventFound: eventFound,
      marketsExpected: expectedMarkets,
      marketsFound: actualMarkets,
      contestantsExpected: activeContestants.length,
      contestantSubjectsFound: contestantSubjects,
      mappingsExpected: expectedMappings,
      mappingsFound: actualMappings,
      ready: eventFound && actualMarkets >= expectedMarkets && contestantSubjects >= activeContestants.length && actualMappings >= expectedMappings
    };
  }).filter(Boolean);
}

function externalResultsBridgeApplyJob_(hub, job) {
  const payload = externalResultsBridgeParseJson_(job.PayloadJSON, {});
  const type = externalResultsBridgeString_(job.JobType).toUpperCase();
  const writes = [];
  if (type === "UPSERT_EXTERNAL_MARKET_MAPPING") {
    externalResultsBridgeRequireKey_(payload.event, ["Provider", "ExternalEventId"], "External market event");
    externalResultsBridgeRequireKey_(payload.market, ["Provider", "ExternalMarketId"], "External market");
    writes.push(externalResultsBridgeVerifiedUpsert_(
      hub,
      "ExternalEvents",
      EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ExternalEvents,
      ["Provider", "ExternalEventId"],
      [payload.event]
    ));
    writes.push(externalResultsBridgeVerifiedUpsert_(
      hub,
      "ExternalMarkets",
      EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ExternalMarkets,
      ["Provider", "ExternalMarketId"],
      [payload.market]
    ));
    writes.push(externalResultsBridgeVerifiedUpsert_(
      hub,
      "AppMappings",
      EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.AppMappings,
      ["MappingId"],
      payload.mappings || []
    ));
    return externalResultsBridgeReceipt_(hub, type, writes);
  }

  if (type === "UPSERT_EXTERNAL_MARKET_GROUP") {
    externalResultsBridgeRequireKey_(
      payload.event,
      ["Provider", "ExternalEventId"],
      "External market event"
    );

    const markets = payload.markets || [];

    markets.forEach(function(row) {
      externalResultsBridgeRequireKey_(
        row,
        ["Provider", "ExternalMarketId"],
        "External market"
      );
    });

    writes.push(externalResultsBridgeVerifiedUpsert_(
      hub,
      "ExternalEvents",
      EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ExternalEvents,
      ["Provider", "ExternalEventId"],
      [payload.event]
    ));

    writes.push(externalResultsBridgeVerifiedUpsert_(
      hub,
      "ExternalMarkets",
      EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ExternalMarkets,
      ["Provider", "ExternalMarketId"],
      markets
    ));

    writes.push(externalResultsBridgeVerifiedUpsert_(
      hub,
      "AppMappings",
      EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.AppMappings,
      ["MappingId"],
      payload.mappings || []
    ));

    return externalResultsBridgeReceipt_(hub, type, writes);
  }

  if (type === "UPSERT_EPISODE_BUNDLE") {
    externalResultsBridgeRequireKey_(payload.event, ["Provider", "ExternalEventId"], "Episode event");
    externalResultsBridgeRequireKey_(payload.market, ["Provider", "ExternalMarketId"], "Episode market");
    writes.push(externalResultsBridgeVerifiedUpsert_(hub, "ExternalEvents", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ExternalEvents,
      ["Provider", "ExternalEventId"], [payload.event]));
    writes.push(externalResultsBridgeVerifiedUpsert_(hub, "ExternalMarkets", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ExternalMarkets,
      ["Provider", "ExternalMarketId"], [payload.market]));
    writes.push(externalResultsBridgeVerifiedUpsert_(hub, "ExternalSubjects", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ExternalSubjects,
      ["Provider", "ExternalSubjectId"], payload.subjects || []));
    writes.push(externalResultsBridgeVerifiedUpsert_(hub, "AppMappings", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.AppMappings,
      ["MappingId"], payload.mappings || []));
    return externalResultsBridgeReceipt_(hub, type, writes);
  }
  if (type === "UPSERT_REALITY_QUESTION_PACK") {
    externalResultsBridgeRequireKey_(payload.event, ["Provider", "ExternalEventId"], "Reality TV episode event");
    writes.push(externalResultsBridgeVerifiedUpsert_(hub, "ExternalEvents", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ExternalEvents,
      ["Provider", "ExternalEventId"], [payload.event]));
    writes.push(externalResultsBridgeVerifiedUpsert_(hub, "ExternalMarkets", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ExternalMarkets,
      ["Provider", "ExternalMarketId"], payload.markets || []));
    writes.push(externalResultsBridgeVerifiedUpsert_(hub, "ExternalSubjects", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ExternalSubjects,
      ["Provider", "ExternalSubjectId"], payload.subjects || []));
    writes.push(externalResultsBridgeVerifiedUpsert_(hub, "AppMappings", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.AppMappings,
      ["MappingId"], payload.mappings || []));
    const stale = externalResultsBridgeDeactivateStaleRealityQuestionPack_(hub, payload);
    writes.push({ sheetName: "RealityQuestionPackCleanup", expected: 0, verified: 0, inserted: 0, updated: 0, deactivatedMarkets: stale.markets, deactivatedMappings: stale.mappings, keys: [] });
    return externalResultsBridgeReceipt_(hub, type, writes);
  }
  if (type === "UPSERT_EPISODE_SCHEDULE") {
    externalResultsBridgeRequireKey_(payload.event, ["Provider", "ExternalEventId"], "Episode event");
    const markets = [];
    if (payload.market) markets.push(payload.market);
    (payload.markets || []).forEach(function(row) { if (row) markets.push(row); });
    markets.forEach(function(row) { externalResultsBridgeRequireKey_(row, ["Provider", "ExternalMarketId"], "Episode market"); });
    writes.push(externalResultsBridgeVerifiedUpsert_(hub, "ExternalEvents", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ExternalEvents,
      ["Provider", "ExternalEventId"], [payload.event]));
    writes.push(externalResultsBridgeVerifiedUpsert_(hub, "ExternalMarkets", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ExternalMarkets,
      ["Provider", "ExternalMarketId"], markets));
    return externalResultsBridgeReceipt_(hub, type, writes);
  }
  if (type === "UPSERT_MARKET_RESOLUTION") {
    externalResultsBridgeRequireKey_(payload.market, ["Provider", "ExternalMarketId"], "Market resolution");
    writes.push(externalResultsBridgeVerifiedUpsert_(hub, "ExternalMarkets", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ExternalMarkets,
      ["Provider", "ExternalMarketId"], [payload.market]));
    return externalResultsBridgeReceipt_(hub, type, writes);
  }
  if (type === "CREATE_RESULT_REVIEW") {
    externalResultsBridgeRequireKey_(payload.importedResult, ["ImportedResultId"], "Imported result");
    externalResultsBridgeRequireKey_(payload.review, ["ReviewId"], "Review row");
    writes.push(externalResultsBridgeVerifiedUpsert_(hub, "ImportedResults", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ImportedResults,
      ["ImportedResultId"], [payload.importedResult]));
    writes.push(externalResultsBridgeVerifiedUpsert_(hub, "ReviewQueue", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ReviewQueue,
      ["ReviewId"], [payload.review]));
    return externalResultsBridgeReceipt_(hub, type, writes);
  }
  if (type === "UPDATE_REVIEW") {
    if (payload.review) {
      externalResultsBridgeRequireKey_(payload.review, ["ReviewId"], "Review update");
      const reviewSheet = externalResultsBridgeEnsureSheet_(hub, "ReviewQueue", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ReviewQueue);
      const reviewExists = externalResultsBridgeReadObjects_(reviewSheet).some(function(row) {
        return externalResultsBridgeKey_(row.ReviewId) === externalResultsBridgeKey_(payload.review.ReviewId);
      });
      if (!reviewExists) throw new Error("Hub dependency not ready: ReviewQueue row has not been created yet.");
      writes.push(externalResultsBridgeVerifiedUpsert_(hub, "ReviewQueue", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ReviewQueue,
        ["ReviewId"], [payload.review]));
    }
    if (payload.importedResult) {
      externalResultsBridgeRequireKey_(payload.importedResult, ["ImportedResultId"], "Imported result update");
      const resultSheet = externalResultsBridgeEnsureSheet_(hub, "ImportedResults", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ImportedResults);
      const resultExists = externalResultsBridgeReadObjects_(resultSheet).some(function(row) {
        return externalResultsBridgeKey_(row.ImportedResultId) === externalResultsBridgeKey_(payload.importedResult.ImportedResultId);
      });
      if (!resultExists) throw new Error("Hub dependency not ready: ImportedResults row has not been created yet.");
      writes.push(externalResultsBridgeVerifiedUpsert_(hub, "ImportedResults", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ImportedResults,
        ["ImportedResultId"], [payload.importedResult]));
    }
    return externalResultsBridgeReceipt_(hub, type, writes);
  }
  throw new Error("Unsupported External Results Hub job type: " + type);
}

function externalResultsProcessHubOutbox() {
  externalResultsBridgeEnsureSystem_();
  externalResultsBridgeDeleteTriggers_();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    externalResultsBridgeSchedule_();
    return { success: true, busy: true, message: "Another Hub bridge worker is running." };
  }
  try {
    const hubId = externalResultsBridgeGetHubId_();
    if (!hubId) return { success: true, skipped: true, message: "External Results Hub is not configured." };
    const hub = SpreadsheetApp.openById(hubId);
    const sheet = SpreadsheetApp.getActive().getSheetByName(EXTERNAL_RESULTS_BRIDGE_OUTBOX_SHEET);
    const now = new Date();
    const allJobs = externalResultsBridgeReadObjects_(sheet);
    const jobs = allJobs.filter(function(job) {
      const status = externalResultsBridgeString_(job.Status).toUpperCase();
      if (["QUEUED", "RETRY"].indexOf(status) === -1) return false;
      const next = job.NextAttemptAt ? new Date(job.NextAttemptAt).getTime() : 0;
      return !next || next <= now.getTime();
    }).sort(function(a, b) {
      return externalResultsBridgeJobPriority_(a) - externalResultsBridgeJobPriority_(b) || a.__rowNumber - b.__rowNumber;
    }).slice(0, 30);
    let completed = 0;
    let failed = 0;
    let waiting = 0;
    jobs.forEach(function(job) {
      const dependency = externalResultsBridgeDependencyState_(hub, allJobs, job);
      if (!dependency.ready) {
        if (dependency.orphan) {
          externalResultsBridgeUpdateRow_(sheet, job.__rowNumber, {
            Status: "ERROR", NextAttemptAt: "", ErrorMessage: dependency.message, UpdatedAt: new Date()
          });
          job.Status = "ERROR";
          failed += 1;
          return;
        }
        if (dependency.createJob && externalResultsBridgeString_(dependency.createJob.Status).toUpperCase() === "ERROR") {
          externalResultsBridgeUpdateRow_(sheet, dependency.createJob.__rowNumber, {
            Status: "QUEUED", NextAttemptAt: "", ErrorMessage: "", UpdatedAt: new Date()
          });
          dependency.createJob.Status = "QUEUED";
        }
        externalResultsBridgeUpdateRow_(sheet, job.__rowNumber, {
          Status: "RETRY", NextAttemptAt: new Date(Date.now() + 60000), ErrorMessage: dependency.message, UpdatedAt: new Date()
        });
        job.Status = "RETRY";
        waiting += 1;
        return;
      }

      const attempts = Number(job.AttemptCount || 0) + 1;
      externalResultsBridgeUpdateRow_(sheet, job.__rowNumber, {
        Status: "PROCESSING", AttemptCount: attempts, LastAttemptAt: new Date(),
        ErrorMessage: "", UpdatedAt: new Date()
      });
      job.Status = "PROCESSING";
      job.AttemptCount = attempts;
      try {
        const receipt = externalResultsBridgeApplyJob_(hub, job);
        if (!receipt || !Number(receipt.verifiedRows || 0)) {
          throw new Error("Hub write verification did not return a valid receipt.");
        }
        externalResultsBridgeUpdateRow_(sheet, job.__rowNumber, {
          Status: "COMPLETE", CompletedAt: new Date(), NextAttemptAt: "",
          ErrorMessage: "", UpdatedAt: new Date(),
          TargetSpreadsheetId: receipt.targetSpreadsheetId || hubId,
          TargetSpreadsheetName: receipt.targetSpreadsheetName || hub.getName(),
          WriteReceiptJSON: JSON.stringify(receipt),
          VerifiedAt: receipt.verifiedAt || new Date()
        });
        job.Status = "COMPLETE";
        completed += 1;
      } catch (err) {
        const retry = externalResultsBridgeRetryable_(err) && attempts < EXTERNAL_RESULTS_BRIDGE_MAX_ATTEMPTS;
        const delayMinutes = Math.min(30, Math.pow(2, attempts - 1));
        externalResultsBridgeUpdateRow_(sheet, job.__rowNumber, {
          Status: retry ? "RETRY" : "ERROR",
          NextAttemptAt: retry ? new Date(Date.now() + delayMinutes * 60000) : "",
          ErrorMessage: err && err.message ? err.message : String(err),
          UpdatedAt: new Date()
        });
        job.Status = retry ? "RETRY" : "ERROR";
        failed += 1;
      }
    });
    const remaining = externalResultsBridgeReadObjects_(sheet).filter(function(job) {
      return ["QUEUED", "RETRY"].indexOf(externalResultsBridgeString_(job.Status).toUpperCase()) !== -1;
    }).length;
    if (remaining) externalResultsBridgeSchedule_();
    return { success: true, processed: jobs.length, completed: completed, failed: failed, waitingOnDependencies: waiting, remaining: remaining };
  } finally {
    lock.releaseLock();
  }
}

function externalResultsBridgeHealth_() {
  externalResultsBridgeEnsureSystem_();
  const ss = SpreadsheetApp.getActive();
  const outbox = externalResultsBridgeReadObjects_(ss.getSheetByName(EXTERNAL_RESULTS_BRIDGE_OUTBOX_SHEET));
  const inbox = externalResultsBridgeReadObjects_(ss.getSheetByName(EXTERNAL_RESULTS_BRIDGE_INBOX_SHEET));
  const countStatuses = function(rows) {
    const counts = {};
    rows.forEach(function(row) {
      const status = externalResultsBridgeString_(row.Status || "UNKNOWN").toUpperCase();
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  };
  const hubId = externalResultsBridgeGetHubId_();
  const issues = [];
  let hubName = "";
  let hubRowCounts = {};
  let realityTv = [];
  if (hubId) {
    try {
      const hub = SpreadsheetApp.openById(hubId);
      hubName = hub.getName();
      Object.keys(EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS).forEach(function(sheetName) {
        const sheet = hub.getSheetByName(sheetName);
        if (!sheet) {
          issues.push("Missing Hub sheet: " + sheetName);
          return;
        }
        hubRowCounts[sheetName] = Math.max(0, sheet.getLastRow() - 1);
        const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0]
          .map(externalResultsBridgeString_);
        EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS[sheetName].forEach(function(header) {
          if (headers.indexOf(header) === -1) issues.push(sheetName + " missing header " + header);
        });
      });
      if (!issues.length) realityTv = externalResultsBridgeRealityTvHealth_(ss, hub);
    } catch (err) {
      issues.push(err && err.message ? err.message : String(err));
    }
  }
  return {
    success: issues.length === 0,
    configured: !!hubId,
    connected: !!hubId && !issues.length,
    spreadsheetId: hubId,
    spreadsheetName: hubName,
    outbox: countStatuses(outbox),
    inbox: countStatuses(inbox),
    pendingOutbox: outbox.filter(function(row) {
      return ["QUEUED", "RETRY", "PROCESSING"].indexOf(externalResultsBridgeString_(row.Status).toUpperCase()) !== -1;
    }).length,
    failedOutbox: outbox.filter(function(row) {
      return externalResultsBridgeString_(row.Status).toUpperCase() === "ERROR";
    }).length,
    readyInbox: inbox.filter(function(row) {
      return externalResultsBridgeString_(row.Status).toUpperCase() === "READY";
    }).length,
    unverifiedComplete: outbox.filter(function(row) {
      return externalResultsBridgeString_(row.Status).toUpperCase() === "COMPLETE" &&
        (!row.VerifiedAt || !externalResultsBridgeString_(row.WriteReceiptJSON));
    }).length,
    hubRowCounts: hubRowCounts,
    realityTv: realityTv,
    realityTvReady: realityTv.filter(function(item) { return item.ready; }).length,
    archivedOutbox: outbox.filter(function(row) {
      return externalResultsBridgeString_(row.Status).toUpperCase() === "ARCHIVED";
    }).length,
    lastVerifiedJob: outbox.filter(function(row) {
      return externalResultsBridgeString_(row.Status).toUpperCase() === "COMPLETE" && !!row.VerifiedAt;
    }).sort(function(a, b) {
      return new Date(b.VerifiedAt || 0).getTime() - new Date(a.VerifiedAt || 0).getTime();
    })[0] || null,
    issues: issues,
    checkedAt: new Date()
  };
}

function apiAdminRequeueUnverifiedExternalResultsBridgeJobs(payload) {
  requireAdmin_(payload || {});
  externalResultsBridgeEnsureSystem_();
  const hubId = externalResultsBridgeGetHubId_();
  if (!hubId) throw new Error("External Results Hub is not configured.");
  const sheet = SpreadsheetApp.getActive().getSheetByName(EXTERNAL_RESULTS_BRIDGE_OUTBOX_SHEET);
  let reset = 0;
  externalResultsBridgeReadObjects_(sheet).forEach(function(row) {
    const complete = externalResultsBridgeString_(row.Status).toUpperCase() === "COMPLETE";
    const verified = !!row.VerifiedAt && !!externalResultsBridgeString_(row.WriteReceiptJSON) &&
      externalResultsBridgeKey_(row.TargetSpreadsheetId) === externalResultsBridgeKey_(hubId);
    if (!complete || verified) return;
    externalResultsBridgeUpdateRow_(sheet, row.__rowNumber, {
      Status: "QUEUED", NextAttemptAt: "", CompletedAt: "", ErrorMessage: "",
      TargetSpreadsheetId: "", TargetSpreadsheetName: "", WriteReceiptJSON: "", VerifiedAt: "",
      UpdatedAt: new Date()
    });
    reset += 1;
  });
  if (reset) externalResultsBridgeSchedule_();
  return { success: true, reset: reset, message: reset + " unverified completed Hub job(s) requeued." };
}

function apiAdminSetupExternalResultsBridge(payload) {
  requireAdmin_(payload || {});
  return externalResultsBridgeEnsureSystem_();
}

function apiAdminGetExternalResultsBridgeHealth(payload) {
  requireAdmin_(payload || {});
  return externalResultsBridgeHealth_();
}

function apiAdminRunExternalResultsBridgeNow(payload) {
  requireAdmin_(payload || {});
  return externalResultsProcessHubOutbox();
}

function apiAdminRetryExternalResultsBridgeFailures(payload) {
  requireAdmin_(payload || {});
  externalResultsBridgeEnsureSystem_();
  const sheet = SpreadsheetApp.getActive().getSheetByName(EXTERNAL_RESULTS_BRIDGE_OUTBOX_SHEET);
  const rows = externalResultsBridgeReadObjects_(sheet);
  const hubId = externalResultsBridgeGetHubId_();
  const hub = hubId ? SpreadsheetApp.openById(hubId) : null;
  let reset = 0;
  let archived = 0;
  rows.forEach(function(row) {
    if (externalResultsBridgeString_(row.Status).toUpperCase() !== "ERROR") return;
    const isUpdate = externalResultsBridgeString_(row.JobType).toUpperCase() === "UPDATE_REVIEW";
    const isDependencyError = /dependency|CREATE_RESULT_REVIEW|ReviewQueue row|ImportedResults row/i.test(externalResultsBridgeString_(row.ErrorMessage));
    if (isUpdate && isDependencyError && hub) {
      const dependency = externalResultsBridgeDependencyState_(hub, rows, row);
      if (dependency.orphan) {
        externalResultsBridgeUpdateRow_(sheet, row.__rowNumber, {
          Status: "ARCHIVED",
          NextAttemptAt: "",
          ErrorMessage: "Archived legacy Hub dependency error. The local result remains authoritative; no matching CREATE_RESULT_REVIEW job or Hub review row exists.",
          UpdatedAt: new Date()
        });
        archived += 1;
        return;
      }
      if (dependency.createJob && externalResultsBridgeString_(dependency.createJob.Status).toUpperCase() === "ERROR") {
        externalResultsBridgeUpdateRow_(sheet, dependency.createJob.__rowNumber, {
          Status: "QUEUED", NextAttemptAt: "", ErrorMessage: "", UpdatedAt: new Date()
        });
      }
    }
    externalResultsBridgeUpdateRow_(sheet, row.__rowNumber, {
      Status: "QUEUED", NextAttemptAt: "", ErrorMessage: "", UpdatedAt: new Date()
    });
    reset += 1;
  });
  if (reset) externalResultsBridgeSchedule_();
  return {
    success: true,
    reset: reset,
    archived: archived,
    message: reset + " failed Hub job(s) queued for retry" + (archived ? "; " + archived + " obsolete legacy dependency error(s) archived." : ".")
  };
}

/* =====================================================
   EXTERNAL RESULTS INBOX — VALIDATE / APPLY
   Production v1.2.8

   Approved Hub deliveries land in ExternalResultsInbox.
   This layer validates complete mapped batches before any
   local game state is changed. Sports/racing are intentionally
   excluded. Reality TV is staged into its native durable queues;
   Awards/prediction categories can be applied manually.
===================================================== */

const EXTERNAL_RESULTS_INBOX_ALLOWED_PROVIDERS = [
  "manual-awards", "manual-reality-tv", "kalshi", "polymarket"
];

function externalResultsInboxProviderAllowed_(provider) {
  return EXTERNAL_RESULTS_INBOX_ALLOWED_PROVIDERS.indexOf(externalResultsBridgeKey_(provider)) !== -1;
}

function externalResultsInboxNormalizeStatus_(status) {
  return externalResultsBridgeString_(status || "READY").toUpperCase();
}

function externalResultsInboxGroupKey_(row) {
  return [
    externalResultsBridgeString_(row.DeliveryBatchId || row.ReviewId || row.ImportedResultId),
    externalResultsBridgeString_(row.AppGameId),
    externalResultsBridgeString_(row.CategoryId)
  ].join("||");
}

function externalResultsInboxRows_() {
  externalResultsBridgeEnsureSystem_();
  return externalResultsBridgeReadObjects_(SpreadsheetApp.getActive().getSheetByName(EXTERNAL_RESULTS_BRIDGE_INBOX_SHEET));
}

function externalResultsInboxGroups_(statuses) {
  const allowed = {};
  (statuses || ["READY", "VALIDATED"]).forEach(function(status) {
    allowed[externalResultsInboxNormalizeStatus_(status)] = true;
  });
  const groups = {};
  externalResultsInboxRows_().forEach(function(row) {
    if (!allowed[externalResultsInboxNormalizeStatus_(row.Status)]) return;
    const key = externalResultsInboxGroupKey_(row);
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });
  return groups;
}

function externalResultsInboxSortedUnique_(values) {
  return (values || []).map(externalResultsBridgeKey_).filter(Boolean).filter(function(value, index, all) {
    return all.indexOf(value) === index;
  }).sort();
}

function externalResultsInboxSameIds_(a, b) {
  const left = externalResultsInboxSortedUnique_(a);
  const right = externalResultsInboxSortedUnique_(b);
  return left.length === right.length && left.every(function(value, index) { return value === right[index]; });
}

function externalResultsInboxWinnerIds_(rows) {
  return externalResultsInboxSortedUnique_((rows || []).filter(function(row) {
    return externalResultsBridgeBool_(row.IsWinner);
  }).map(function(row) { return row.NomineeId; }));
}

function externalResultsInboxLooksLikePush_(rows) {
  const row = (rows || [])[0] || {};
  const text = [row.ResultValue, row.WinningOutcome, row.ResultKey]
    .map(externalResultsBridgeString_).join(" ").toLowerCase();
  const winners = externalResultsBridgeParseJson_(row.WinnersJSON, []);
  return (!Array.isArray(winners) || winners.length === 0) &&
    /(push|void|cancel|no[ -]?result|no[ -]?elimination|no official result)/i.test(text);
}

function externalResultsInboxRealityMain_(gameId, categoryId) {
  if (typeof REALITY_TV_EPISODES_SHEET === "undefined") return null;
  const sheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODES_SHEET);
  if (!sheet) return null;
  return externalResultsBridgeReadObjects_(sheet).find(function(row) {
    return externalResultsBridgeKey_(row.GameId) === externalResultsBridgeKey_(gameId) &&
      externalResultsBridgeKey_(row.CategoryId) === externalResultsBridgeKey_(categoryId);
  }) || null;
}

function externalResultsInboxRealityQuestion_(gameId, categoryId) {
  if (typeof REALITY_TV_EPISODE_QUESTIONS_SHEET === "undefined") return null;
  const sheet = SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODE_QUESTIONS_SHEET);
  if (!sheet) return null;
  return externalResultsBridgeReadObjects_(sheet).find(function(row) {
    return externalResultsBridgeKey_(row.GameId) === externalResultsBridgeKey_(gameId) &&
      externalResultsBridgeKey_(row.CategoryId) === externalResultsBridgeKey_(categoryId);
  }) || null;
}

function externalResultsInboxExistingResolution_(gameId, categoryId) {
  if (typeof getCategoryResultsResolutionMap !== "function") return null;
  const map = getCategoryResultsResolutionMap(gameId) || {};
  return map[externalResultsBridgeKey_(categoryId)] || map[externalResultsBridgeString_(categoryId)] || null;
}


function externalResultsInboxRealityQueueSelectedIds_(native) {
  if (!native || !native.queue) return [];
  if (native.route === "REALITY_QUESTION") {
    if (typeof realityTvQuestionSelectedIds_ === "function") {
      return externalResultsInboxSortedUnique_(realityTvQuestionSelectedIds_(native.queue));
    }
    return externalResultsInboxSortedUnique_(externalResultsBridgeParseJson_(native.queue.SelectedOutcomeIdsJSON, []));
  }
  return externalResultsInboxSortedUnique_(externalResultsBridgeParseJson_(native.queue.SelectedContestantIds, []));
}

function externalResultsInboxExistingRealityDelivery_(rows) {
  const first = (rows || [])[0] || {};
  const reviewId = externalResultsBridgeKey_(first.ReviewId);
  const importedResultId = externalResultsBridgeKey_(first.ImportedResultId);
  const nativeQueueId = externalResultsBridgeKey_(first.NativeQueueId);
  if (!reviewId && !importedResultId && !nativeQueueId) return null;

  const ss = SpreadsheetApp.getActive();
  const candidates = [];
  if (typeof REALITY_TV_QUESTION_QUEUE_SHEET !== "undefined") {
    candidates.push({ route: "REALITY_QUESTION", sheetName: REALITY_TV_QUESTION_QUEUE_SHEET });
  }
  if (typeof REALITY_TV_RESULTS_QUEUE_SHEET !== "undefined") {
    candidates.push({ route: "REALITY_MAIN", sheetName: REALITY_TV_RESULTS_QUEUE_SHEET });
  }

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const sheet = ss.getSheetByName(candidate.sheetName);
    if (!sheet) continue;
    const queue = externalResultsBridgeReadObjects_(sheet).find(function(row) {
      if (nativeQueueId && externalResultsBridgeKey_(row.QueueId) === nativeQueueId) return true;
      if (reviewId && externalResultsBridgeKey_(row.HubReviewId) === reviewId) return true;
      return importedResultId && externalResultsBridgeKey_(row.HubImportedResultId) === importedResultId;
    });
    if (!queue) continue;
    return {
      route: candidate.route,
      queue: queue,
      queueId: externalResultsBridgeString_(queue.QueueId),
      reviewStatus: externalResultsInboxNormalizeStatus_(queue.ReviewStatus || "PENDING"),
      pushStatus: externalResultsInboxNormalizeStatus_(queue.PushStatus || ""),
      error: externalResultsBridgeString_(queue.ErrorMessage),
      completedAt: queue.ApprovalCompletedAt || queue.ReviewedAt || queue.PushedAt || queue.UpdatedAt || ""
    };
  }
  return null;
}

function externalResultsInboxRealityDeliveryMatches_(native, winnerIds, isPush) {
  if (!native) return false;
  const selectedIds = externalResultsInboxRealityQueueSelectedIds_(native);
  return isPush ? selectedIds.length === 0 : externalResultsInboxSameIds_(selectedIds, winnerIds);
}

function externalResultsInboxReconcileReality_() {
  const groups = externalResultsInboxGroups_(["STAGED_REALITY"]);
  let applied = 0;
  let rejected = 0;
  let pending = 0;
  let missing = 0;
  let nativeErrors = 0;

  Object.keys(groups).forEach(function(key) {
    const rows = groups[key];
    const native = externalResultsInboxExistingRealityDelivery_(rows);
    if (!native) {
      externalResultsInboxPatchRows_(rows, {
        NativeStatus: "MISSING",
        NativeUpdatedAt: new Date(),
        ErrorMessage: "Staged Reality TV queue could not be found. The Inbox was not reapplied.",
        UpdatedAt: new Date()
      });
      missing += 1;
      return;
    }

    const nativeStatus = native.reviewStatus === "APPROVED"
      ? "APPROVED"
      : (native.reviewStatus === "REJECTED" ? "REJECTED" : (native.pushStatus || native.reviewStatus || "PENDING"));
    const basePatch = {
      NativeRoute: native.route,
      NativeQueueId: native.queueId,
      NativeStatus: nativeStatus,
      NativeUpdatedAt: new Date(),
      UpdatedAt: new Date()
    };

    if (native.reviewStatus === "APPROVED") {
      externalResultsInboxPatchRows_(rows, Object.assign({}, basePatch, {
        Status: "APPLIED",
        AppliedAt: native.completedAt || new Date(),
        ErrorMessage: "Reality TV result finalized by native queue " + native.queueId + "."
      }));
      applied += 1;
      return;
    }
    if (native.reviewStatus === "REJECTED") {
      externalResultsInboxPatchRows_(rows, Object.assign({}, basePatch, {
        Status: "REJECTED",
        AppliedAt: "",
        ErrorMessage: native.error || ("Reality TV result was rejected in native queue " + native.queueId + ".")
      }));
      rejected += 1;
      return;
    }
    if (native.pushStatus === "ERROR") {
      externalResultsInboxPatchRows_(rows, Object.assign({}, basePatch, {
        ErrorMessage: native.error || ("Reality TV native queue " + native.queueId + " needs recovery.")
      }));
      nativeErrors += 1;
      return;
    }
    externalResultsInboxPatchRows_(rows, Object.assign({}, basePatch, {
      ErrorMessage: "Staged in Reality TV native queue " + native.queueId + "; waiting for finalization."
    }));
    pending += 1;
  });

  return { success: missing === 0, applied: applied, rejected: rejected, pending: pending, missing: missing, nativeErrors: nativeErrors };
}

function externalResultsInboxValidateGroup_(rows) {
  rows = rows || [];
  if (!rows.length) return { ok: false, error: "Inbox batch has no rows." };
  const first = rows[0];
  const provider = externalResultsBridgeKey_(first.Provider);
  const gameId = externalResultsBridgeString_(first.AppGameId);
  const categoryId = externalResultsBridgeString_(first.CategoryId);
  if (!externalResultsInboxProviderAllowed_(provider)) {
    return { ok: false, error: "Provider is not allowed through External Results Hub: " + provider + ". Sports and racing must use their native engines." };
  }
  if (!gameId || !categoryId) return { ok: false, error: "Inbox delivery is missing AppGameId or CategoryId." };
  if (rows.some(function(row) { return externalResultsBridgeKey_(row.Provider) !== provider; })) {
    return { ok: false, error: "Inbox batch mixes providers." };
  }
  if (rows.some(function(row) { return externalResultsBridgeKey_(row.Finality) !== "final"; })) {
    return { ok: false, error: "Only FINAL Hub results may be applied." };
  }

  let setup;
  try {
    setup = adminGetGameSetup({ gameId: gameId });
  } catch (err) {
    return { ok: false, error: "Game Setup could not be loaded: " + (err.message || err) };
  }
  const category = (setup.categories || []).find(function(item) {
    return externalResultsBridgeKey_(item.categoryId) === externalResultsBridgeKey_(categoryId);
  });
  if (!category) return { ok: false, error: "Mapped category was not found in the Awards App." };

  const gameType = externalResultsBridgeKey_((setup.game || {}).type || (setup.game || {}).gameType);
  if (["wager", "racing-wager"].indexOf(gameType) !== -1) {
    return { ok: false, error: "Wager and racing games are not settled through External Results Hub." };
  }

  const nomineeIds = externalResultsInboxSortedUnique_((category.nominees || []).map(function(item) { return item.nomineeId; }));
  const deliveredIds = externalResultsInboxSortedUnique_(rows.map(function(row) { return row.NomineeId; }));
  const invalid = deliveredIds.filter(function(id) { return nomineeIds.indexOf(id) === -1; });
  if (invalid.length) return { ok: false, error: "Inbox contains nominee IDs that do not exist in this category: " + invalid.join(", ") };
  const missing = nomineeIds.filter(function(id) { return deliveredIds.indexOf(id) === -1; });
  if (missing.length) {
    return { ok: false, error: "Hub mapping coverage is incomplete for this category (" + deliveredIds.length + "/" + nomineeIds.length + "). Missing: " + missing.join(", ") };
  }

  const winnerIds = externalResultsInboxWinnerIds_(rows);
  const isPush = externalResultsInboxLooksLikePush_(rows);
  if (!winnerIds.length && !isPush) {
    return { ok: false, error: "The FINAL result has no winning nominee. Correct the Hub mapping/result before applying." };
  }

  const nativeReality = externalResultsInboxExistingRealityDelivery_(rows);
  if (nativeReality) {
    if (!externalResultsInboxRealityDeliveryMatches_(nativeReality, winnerIds, isPush)) {
      return { ok: false, conflict: true, error: "This Hub delivery already has a Reality TV native queue with a different result. It was not duplicated." };
    }
    if (nativeReality.reviewStatus === "APPROVED") {
      return {
        ok: true, alreadyApplied: true, route: "NOOP", provider: provider, gameId: gameId,
        categoryId: categoryId, category: category, setup: setup, winnerIds: winnerIds, isPush: isPush,
        nativeReality: nativeReality
      };
    }
  }

  const existing = externalResultsInboxExistingResolution_(gameId, categoryId);
  if (existing && ["winner", "push", "void", "cancelled", "canceled"].indexOf(externalResultsBridgeKey_(existing.result)) !== -1) {
    const existingWinners = Array.isArray(existing.winnerNomineeIds) && existing.winnerNomineeIds.length
      ? existing.winnerNomineeIds
      : (existing.winnerNomineeId ? [existing.winnerNomineeId] : []);
    const existingPush = ["push", "void", "cancelled", "canceled"].indexOf(externalResultsBridgeKey_(existing.result)) !== -1;
    if ((isPush && existingPush) || (!isPush && externalResultsInboxSameIds_(existingWinners, winnerIds))) {
      return {
        ok: true, alreadyApplied: true, route: "NOOP", provider: provider, gameId: gameId,
        categoryId: categoryId, category: category, setup: setup, winnerIds: winnerIds, isPush: isPush
      };
    }
    return { ok: false, conflict: true, error: "This category is already settled with a different result. It was not overwritten." };
  }

  const realityMain = externalResultsInboxRealityMain_(gameId, categoryId);
  const realityQuestion = realityMain ? null : externalResultsInboxRealityQuestion_(gameId, categoryId);
  if ((realityMain || realityQuestion) && provider !== "manual-reality-tv") {
    return { ok: false, error: "Reality TV native settlement only accepts the manual-reality-tv provider. Prediction-market providers must map to prediction questions instead." };
  }
  if (provider === "manual-reality-tv" && !realityMain && !realityQuestion) {
    return { ok: false, error: "manual-reality-tv mapping does not point to a registered Reality TV episode or Extra Question." };
  }
  return {
    ok: true,
    alreadyApplied: false,
    route: realityMain ? "REALITY_MAIN" : (realityQuestion ? "REALITY_QUESTION" : "GENERIC"),
    provider: provider,
    gameId: gameId,
    categoryId: categoryId,
    category: category,
    setup: setup,
    winnerIds: winnerIds,
    isPush: isPush,
    realityMain: realityMain,
    realityQuestion: realityQuestion,
    nativeReality: nativeReality
  };
}

function externalResultsInboxPatchRows_(rows, patch) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(EXTERNAL_RESULTS_BRIDGE_INBOX_SHEET);
  (rows || []).forEach(function(row) {
    externalResultsBridgeUpdateRow_(sheet, row.__rowNumber, patch);
  });
}

function externalResultsInboxStageRealityQuestion_(validation, rows, username) {
  if (validation && validation.nativeReality && validation.nativeReality.route === "REALITY_QUESTION") {
    return { staged: true, queueId: validation.nativeReality.queueId, existing: true, nativeStatus: validation.nativeReality.reviewStatus };
  }
  if (typeof realityTvEnsureQuestionPackSystem_ !== "function") throw new Error("Reality TV question system is not installed.");
  realityTvEnsureQuestionPackSystem_();
  const question = validation.realityQuestion;
  if (!question) throw new Error("Reality TV episode question was not found.");
  const existing = realityTvQuestionQueueForSeason_(question.SeasonId).find(function(row) {
    return realityTvKey_(row.EpisodeQuestionId) === realityTvKey_(question.EpisodeQuestionId) &&
      ["pending", "approving"].indexOf(realityTvKey_(row.ReviewStatus)) !== -1;
  });
  if (existing) {
    const existingIds = realityTvQuestionSelectedIds_(existing);
    if (!externalResultsInboxSameIds_(existingIds, validation.winnerIds) && !(validation.isPush && !existingIds.length)) {
      throw new Error("Reality TV question already has a different pending local result.");
    }
    return { staged: true, queueId: existing.QueueId, existing: true };
  }

  const options = realityTvParseJson_(question.AnswerOptionsJSON, []);
  const winnerMap = {};
  validation.winnerIds.forEach(function(id) { winnerMap[realityTvKey_(id)] = true; });
  const selected = options.filter(function(item) { return !!winnerMap[realityTvKey_(item.id)]; });
  if (!validation.isPush && selected.length !== validation.winnerIds.length) {
    throw new Error("One or more Hub winners are not valid answer options for the Reality TV question.");
  }
  const labels = selected.map(function(item) { return realityTvString_(item.label); }).filter(Boolean);
  const first = rows[0] || {};
  const now = new Date();
  const queue = {
    QueueId: realityTvId_("rtq-queue"), SeasonId: question.SeasonId, GameId: question.GameId,
    EpisodeId: question.EpisodeId, EpisodeNumber: question.EpisodeNumber,
    EpisodeQuestionId: question.EpisodeQuestionId, CategoryId: question.CategoryId,
    QuestionType: question.QuestionType, ResultKey: question.ResultKey,
    ResultMode: validation.isPush ? "push" : (validation.winnerIds.length > 1 ? "multiple-winners" : "winner"),
    SelectedOutcomeIdsJSON: JSON.stringify(validation.isPush ? [] : validation.winnerIds),
    SelectedOutcomeLabelsJSON: JSON.stringify(labels), SelectedOutcomeId: validation.winnerIds[0] || "",
    SelectedOutcomeLabel: validation.isPush ? "Push / no official result" : labels.join(", "),
    ReviewStatus: "PENDING", EvidenceUrl: externalResultsBridgeString_(first.EvidenceUrl),
    Notes: "Staged from approved External Results Hub result " + externalResultsBridgeString_(first.ImportedResultId),
    SubmittedBy: username || "external-results-hub", SubmittedAt: now, ReviewedBy: "", ReviewedAt: "",
    PushStatus: "NOT PUSHED", ApprovalStage: "", ApprovalStartedAt: "", ApprovalCompletedAt: "",
    ApprovalAttemptCount: 0, ApprovalStageStartedAt: "", ApprovalHeartbeatAt: "", PushedAt: "",
    HubImportedResultId: externalResultsBridgeString_(first.ImportedResultId), HubReviewId: externalResultsBridgeString_(first.ReviewId),
    ErrorMessage: "", UpdatedAt: now
  };
  realityTvAppendObject_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_QUESTION_QUEUE_SHEET), queue);
  realityTvUpdateObjectRow_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODE_QUESTIONS_SHEET), question.__rowNumber, {
    ResultQueueId: queue.QueueId, Status: "REVIEW", UpdatedAt: now
  });
  return { staged: true, queueId: queue.QueueId, existing: false };
}

function externalResultsInboxStageRealityMain_(validation, rows, username) {
  if (validation && validation.nativeReality && validation.nativeReality.route === "REALITY_MAIN") {
    return { staged: true, queueId: validation.nativeReality.queueId, existing: true, nativeStatus: validation.nativeReality.reviewStatus };
  }
  if (typeof realityTvEnsureSystem_ !== "function") throw new Error("Reality TV system is not installed.");
  realityTvEnsureSystem_();
  const episode = validation.realityMain;
  const season = realityTvGetSeason_(episode.SeasonId);
  if (!season) throw new Error("Reality TV season was not found.");
  const existing = realityTvQueueForSeason_(season.SeasonId).find(function(row) {
    return realityTvKey_(row.EpisodeId) === realityTvKey_(episode.EpisodeId) &&
      ["pending", "approving"].indexOf(realityTvKey_(row.ReviewStatus)) !== -1;
  });
  if (existing) {
    const existingIds = realityTvParseJson_(existing.SelectedContestantIds, []).map(realityTvKey_).filter(Boolean);
    if (!externalResultsInboxSameIds_(existingIds, validation.winnerIds) && !(validation.isPush && !existingIds.length)) {
      throw new Error("Reality TV episode already has a different pending local elimination result.");
    }
    return { staged: true, queueId: existing.QueueId, existing: true };
  }

  const contestantIds = externalResultsInboxSortedUnique_(realityTvContestantsForSeason_(season.SeasonId).map(function(row) { return row.ContestantId; }));
  const invalid = validation.winnerIds.filter(function(id) { return contestantIds.indexOf(realityTvKey_(id)) === -1; });
  if (invalid.length) throw new Error("Hub elimination winner is not a Reality TV contestant: " + invalid.join(", "));
  const outcomeType = validation.isPush ? "no-elimination" :
    (validation.winnerIds.length === 1 ? "elimination" : (validation.winnerIds.length === 2 ? "double-elimination" : "multiple-elimination"));
  const first = rows[0] || {};
  const now = new Date();
  const queue = {
    QueueId: realityTvId_("rt-queue"), SeasonId: season.SeasonId, GameId: season.GameId,
    EpisodeId: episode.EpisodeId, EpisodeNumber: episode.EpisodeNumber, CategoryId: episode.CategoryId,
    OutcomeType: outcomeType, SelectedContestantIds: JSON.stringify(validation.isPush ? [] : validation.winnerIds),
    ReviewStatus: "PENDING", EvidenceUrl: externalResultsBridgeString_(first.EvidenceUrl),
    Notes: "Staged from approved External Results Hub result " + externalResultsBridgeString_(first.ImportedResultId),
    SubmittedBy: username || "external-results-hub", SubmittedAt: now, ReviewedBy: "", ReviewedAt: "",
    PushStatus: "NOT PUSHED", ApprovalStage: "", ApprovalStartedAt: "", ApprovalCompletedAt: "",
    ApprovalAttemptCount: 0, ApprovalStageStartedAt: "", ApprovalHeartbeatAt: "", ApprovalQuestionBuildId: "",
    PushedAt: "", NextEpisodeId: "", HubImportedResultId: externalResultsBridgeString_(first.ImportedResultId),
    HubReviewId: externalResultsBridgeString_(first.ReviewId), EpisodeFinalizeMode: "", ApprovalQuestionQueueIdsJSON: "[]",
    ApprovalQuestionCompletedCount: 0, ApprovalQuestionTotalCount: 0, ApprovalCurrentQuestionQueueId: "",
    ApprovalCurrentQuestionLabel: "", ApprovalQuestionScoresRecalculated: false, NextEpisodeJobId: "",
    ErrorMessage: "", UpdatedAt: now
  };
  realityTvAppendObject_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_RESULTS_QUEUE_SHEET), queue);
  realityTvUpdateObjectRow_(SpreadsheetApp.getActive().getSheetByName(REALITY_TV_EPISODES_SHEET), episode.__rowNumber, {
    ResultQueueId: queue.QueueId, OutcomeType: outcomeType, Status: "REVIEW", UpdatedAt: now
  });
  return { staged: true, queueId: queue.QueueId, existing: false };
}

function externalResultsInboxQueueHubAck_(rows, message) {
  const first = (rows || [])[0] || {};
  if (!first.ReviewId || typeof externalResultsBridgeEnqueue_ !== "function") return { skipped: true };
  const now = new Date();
  return externalResultsBridgeEnqueue_("UPDATE_REVIEW", first.ReviewId, first.Provider, {
    review: {
      ReviewId: first.ReviewId, ImportedResultId: first.ImportedResultId, Provider: first.Provider,
      ReviewStatus: "APPROVED", ReviewedBy: "Awards App", ReviewedAt: now,
      PushStatus: "PUSHED", PushedAt: now, PushMessage: message || "Applied by Awards App from ExternalResultsInbox.", UpdatedAt: now
    },
    importedResult: {
      ImportedResultId: first.ImportedResultId, Provider: first.Provider,
      ReviewStatus: "APPROVED", ReviewRequired: true, UpdatedAt: now
    }
  });
}

function externalResultsInboxDedupeCategoryResults_(validation) {
  if (!validation || typeof dedupeCategoryResultsForCategory_ !== "function") {
    return { success: true, removed: 0 };
  }
  return dedupeCategoryResultsForCategory_(
    validation.gameId,
    validation.categoryId
  ) || { success: true, removed: 0 };
}

function externalResultsInboxApplyGeneric_(validation, rows, username) {
  const category = validation.category;
  const first = rows[0] || {};
  const winnerLookup = {};
  validation.winnerIds.forEach(function(id) { winnerLookup[externalResultsBridgeKey_(id)] = true; });
  const now = new Date();
  const resultPayloads = (category.nominees || []).map(function(nominee) {
    return {
      gameId: validation.gameId,
      categoryId: validation.categoryId,
      nomineeId: nominee.nomineeId,
      resultStatus: validation.isPush ? "push" : "settled",
      isWinner: !validation.isPush && !!winnerLookup[externalResultsBridgeKey_(nominee.nomineeId)],
      resultValue: externalResultsBridgeString_(first.ResultValue || first.WinningOutcome),
      resultSource: "external-results-hub:" + validation.provider,
      settledAt: now,
      timestamp: now,
      notes: "ImportedResultId=" + externalResultsBridgeString_(first.ImportedResultId) +
        "; ReviewId=" + externalResultsBridgeString_(first.ReviewId) +
        "; DeliveryBatchId=" + externalResultsBridgeString_(first.DeliveryBatchId)
    };
  });
  if (typeof upsertCategoryResultsBulk_ === "function") upsertCategoryResultsBulk_(resultPayloads);
  else resultPayloads.forEach(function(item) { upsertCategoryResult_(item); });

  adminUpdateCategory({
    gameId: validation.gameId,
    categoryId: validation.categoryId,
    locked: true,
    winnerNomineeId: validation.winnerIds.length === 1 ? validation.winnerIds[0] : "",
    settlementStatus: validation.isPush ? "push" : "settled",
    resultSource: "external-results-hub",
    resultSourceType: "external",
    resultProvider: validation.provider,
    externalEventId: externalResultsBridgeString_(first.ExternalEventId),
    externalMarketId: externalResultsBridgeString_(first.ExternalMarketId),
    statKey: externalResultsBridgeString_(first.ResultKey),
    autoSettle: false,
    requireAdminReview: true,
    skipCategoryResultWrite: true,
    username: username || "administrator",
    notes: "Applied from approved External Results Hub delivery " + externalResultsBridgeString_(first.DeliveryBatchId)
  });
  const dedupe =
    externalResultsInboxDedupeCategoryResults_(
      validation
    );

  if (typeof clearAppCaches === "function") clearAppCaches();
  externalResultsInboxQueueHubAck_(rows, "Applied to Awards App category " + validation.categoryId + ".");
  return {
    applied: true,
    route: "GENERIC",
    duplicateRowsRemoved: Number((dedupe || {}).removed || 0)
  };
}

function externalResultsInboxSummary_() {
  externalResultsBridgeEnsureSystem_();
  const reconciliation = externalResultsInboxReconcileReality_();
  const rows = externalResultsInboxRows_();
  const counts = {};
  rows.forEach(function(row) {
    const status = externalResultsInboxNormalizeStatus_(row.Status);
    counts[status] = (counts[status] || 0) + 1;
  });
  const groups = {};
  rows.forEach(function(row) {
    const key = externalResultsInboxGroupKey_(row);
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });
  const groupSummary = Object.keys(groups).map(function(key) {
    const batch = groups[key];
    const first = batch[0] || {};
    return {
      deliveryBatchId: externalResultsBridgeString_(first.DeliveryBatchId), reviewId: externalResultsBridgeString_(first.ReviewId),
      importedResultId: externalResultsBridgeString_(first.ImportedResultId), provider: externalResultsBridgeString_(first.Provider),
      gameId: externalResultsBridgeString_(first.AppGameId), categoryId: externalResultsBridgeString_(first.CategoryId),
      resultKey: externalResultsBridgeString_(first.ResultKey), resultValue: externalResultsBridgeString_(first.ResultValue),
      status: externalResultsInboxNormalizeStatus_(first.Status), rowCount: batch.length,
      winnerIds: externalResultsInboxWinnerIds_(batch), error: externalResultsBridgeString_(first.ErrorMessage),
      nativeRoute: externalResultsBridgeString_(first.NativeRoute), nativeQueueId: externalResultsBridgeString_(first.NativeQueueId),
      nativeStatus: externalResultsBridgeString_(first.NativeStatus)
    };
  }).sort(function(a, b) {
    return String(b.deliveryBatchId || "").localeCompare(String(a.deliveryBatchId || ""));
  });
  return { success: true, counts: counts, totalRows: rows.length, batches: groupSummary.slice(0, 25), autoApply: false, reconciliation: reconciliation };
}

function apiAdminGetExternalResultsInboxStatus(payload) {
  requireAdmin_(payload || {});
  return externalResultsInboxSummary_();
}

function apiAdminReconcileExternalResultsInbox(payload) {
  requireAdmin_(payload || {});
  const reconciliation = externalResultsInboxReconcileReality_();
  return { success: reconciliation.success, reconciliation: reconciliation, summary: externalResultsInboxSummary_() };
}

function apiAdminValidateExternalResultsInbox(payload) {
  requireAdmin_(payload || {});
  const groups = externalResultsInboxGroups_(["READY", "VALIDATED"]);
  let validated = 0;
  let alreadyApplied = 0;
  let errors = 0;
  Object.keys(groups).forEach(function(key) {
    const rows = groups[key];
    const result = externalResultsInboxValidateGroup_(rows);
    if (!result.ok) {
      externalResultsInboxPatchRows_(rows, { Status: "ERROR", ErrorMessage: result.error || "Inbox validation failed.", LastAttemptAt: new Date(), UpdatedAt: new Date() });
      errors += 1;
      return;
    }
    if (result.alreadyApplied) {
      const dedupe = externalResultsInboxDedupeCategoryResults_(result);
      const removed = Number((dedupe || {}).removed || 0);
      externalResultsInboxPatchRows_(rows, {
        Status: "APPLIED",
        AppliedAt: new Date(),
        ErrorMessage: "Already settled locally with the same result; no duplicate settlement was written." +
          (removed ? " Removed " + removed + " duplicate CategoryResults row(s)." : ""),
        UpdatedAt: new Date()
      });
      externalResultsInboxQueueHubAck_(rows, "Awards App already had the same settled result; delivery confirmed idempotently.");
      alreadyApplied += 1;
      return;
    }
    externalResultsInboxPatchRows_(rows, { Status: "VALIDATED", ErrorMessage: "", LastAttemptAt: new Date(), UpdatedAt: new Date() });
    validated += 1;
  });
  return { success: errors === 0, validated: validated, alreadyApplied: alreadyApplied, errors: errors, summary: externalResultsInboxSummary_() };
}

function apiAdminApplyExternalResultsInbox(payload) {
  requireAdmin_(payload || {});
  const username = externalResultsBridgeString_((payload || {}).username || "administrator");
  const groups = externalResultsInboxGroups_(["VALIDATED"]);
  let applied = 0;
  let stagedReality = 0;
  let errors = 0;
  Object.keys(groups).forEach(function(key) {
    const rows = groups[key];
    const validation = externalResultsInboxValidateGroup_(rows);
    if (!validation.ok) {
      externalResultsInboxPatchRows_(rows, { Status: "ERROR", ErrorMessage: validation.error || "Inbox apply validation failed.", LastAttemptAt: new Date(), UpdatedAt: new Date() });
      errors += 1;
      return;
    }
    try {
      if (validation.alreadyApplied) {
        const dedupe = externalResultsInboxDedupeCategoryResults_(validation);
        const removed = Number((dedupe || {}).removed || 0);
        externalResultsInboxPatchRows_(rows, {
          Status: "APPLIED",
          AppliedAt: new Date(),
          ErrorMessage: "Already settled locally with the same result." +
            (removed ? " Removed " + removed + " duplicate CategoryResults row(s)." : ""),
          UpdatedAt: new Date()
        });
        externalResultsInboxQueueHubAck_(rows, "Awards App already had the same settled result; delivery confirmed idempotently.");
        applied += 1;
      } else if (validation.route === "REALITY_QUESTION") {
        const staged = externalResultsInboxStageRealityQuestion_(validation, rows, username);
        externalResultsInboxPatchRows_(rows, { Status: "STAGED_REALITY", AppliedAt: "", NativeRoute: "REALITY_QUESTION", NativeQueueId: staged.queueId, NativeStatus: staged.nativeStatus || "PENDING", NativeUpdatedAt: new Date(), ErrorMessage: "Staged in Reality TV question review queue: " + staged.queueId, UpdatedAt: new Date() });
        stagedReality += 1;
      } else if (validation.route === "REALITY_MAIN") {
        const staged = externalResultsInboxStageRealityMain_(validation, rows, username);
        externalResultsInboxPatchRows_(rows, { Status: "STAGED_REALITY", AppliedAt: "", NativeRoute: "REALITY_MAIN", NativeQueueId: staged.queueId, NativeStatus: staged.nativeStatus || "PENDING", NativeUpdatedAt: new Date(), ErrorMessage: "Staged in Reality TV episode review queue: " + staged.queueId, UpdatedAt: new Date() });
        stagedReality += 1;
      } else {
        externalResultsInboxApplyGeneric_(validation, rows, username);
        externalResultsInboxPatchRows_(rows, { Status: "APPLIED", AppliedAt: new Date(), ErrorMessage: "", UpdatedAt: new Date() });
        applied += 1;
      }
    } catch (err) {
      externalResultsInboxPatchRows_(rows, { Status: "ERROR", AttemptCount: Number((rows[0] || {}).AttemptCount || 0) + 1, LastAttemptAt: new Date(), ErrorMessage: err.message || String(err), UpdatedAt: new Date() });
      errors += 1;
    }
  });
  return { success: errors === 0, applied: applied, stagedReality: stagedReality, errors: errors, summary: externalResultsInboxSummary_() };
}

function apiAdminRetryExternalResultsInboxErrors(payload) {
  requireAdmin_(payload || {});
  const sheet = SpreadsheetApp.getActive().getSheetByName(EXTERNAL_RESULTS_BRIDGE_INBOX_SHEET);
  let reset = 0;
  externalResultsInboxRows_().forEach(function(row) {
    if (externalResultsInboxNormalizeStatus_(row.Status) !== "ERROR") return;
    externalResultsBridgeUpdateRow_(sheet, row.__rowNumber, { Status: "READY", ErrorMessage: "", UpdatedAt: new Date() });
    reset += 1;
  });
  return { success: true, reset: reset, summary: externalResultsInboxSummary_() };
}
