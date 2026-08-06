/* =====================================================
   EXTERNAL RESULTS HUB BRIDGE — PHASE 1
   Production v1.2.0

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
  "ErrorMessage", "CreatedAt", "UpdatedAt"
];

const EXTERNAL_RESULTS_BRIDGE_INBOX_HEADERS = [
  "DeliveryId", "DeliveryBatchId", "ReviewId", "ImportedResultId", "Provider",
  "AppGameId", "CategoryId", "NomineeId", "ExternalEventId", "ExternalMarketId",
  "ExternalSubjectId", "ResultKey", "ResultValue", "WinningOutcome", "WinnersJSON",
  "IsWinner", "Finality", "EvidenceUrl", "SourceConfigJSON", "Status",
  "AttemptCount", "LastAttemptAt", "AppliedAt", "ErrorMessage", "CreatedAt", "UpdatedAt"
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

function externalResultsBridgeApplyJob_(hub, job) {
  const payload = externalResultsBridgeParseJson_(job.PayloadJSON, {});
  const type = externalResultsBridgeString_(job.JobType).toUpperCase();
  if (type === "UPSERT_EPISODE_BUNDLE") {
    externalResultsBridgeUpsertRows_(hub, "ExternalEvents", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ExternalEvents,
      ["Provider", "ExternalEventId"], [payload.event]);
    externalResultsBridgeUpsertRows_(hub, "ExternalMarkets", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ExternalMarkets,
      ["Provider", "ExternalMarketId"], [payload.market]);
    externalResultsBridgeUpsertRows_(hub, "ExternalSubjects", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ExternalSubjects,
      ["Provider", "ExternalSubjectId"], payload.subjects || []);
    externalResultsBridgeUpsertRows_(hub, "AppMappings", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.AppMappings,
      ["MappingId"], payload.mappings || []);
    return;
  }
  if (type === "UPSERT_EPISODE_SCHEDULE") {
    externalResultsBridgeUpsertRows_(hub, "ExternalEvents", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ExternalEvents,
      ["Provider", "ExternalEventId"], [payload.event]);
    externalResultsBridgeUpsertRows_(hub, "ExternalMarkets", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ExternalMarkets,
      ["Provider", "ExternalMarketId"], [payload.market]);
    return;
  }
  if (type === "CREATE_RESULT_REVIEW") {
    externalResultsBridgeUpsertRows_(hub, "ImportedResults", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ImportedResults,
      ["ImportedResultId"], [payload.importedResult]);
    externalResultsBridgeUpsertRows_(hub, "ReviewQueue", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ReviewQueue,
      ["ReviewId"], [payload.review]);
    return;
  }
  if (type === "UPDATE_REVIEW") {
    if (payload.review) {
      const reviewSheet = externalResultsBridgeEnsureSheet_(
        hub, "ReviewQueue", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ReviewQueue
      );
      const reviewExists = externalResultsBridgeReadObjects_(reviewSheet).some(function(row) {
        return externalResultsBridgeKey_(row.ReviewId) === externalResultsBridgeKey_(payload.review.ReviewId);
      });
      if (!reviewExists) throw new Error("Hub dependency not ready: ReviewQueue row has not been created yet.");
      externalResultsBridgeUpsertRows_(hub, "ReviewQueue", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ReviewQueue,
        ["ReviewId"], [payload.review]);
    }
    if (payload.importedResult) {
      const resultSheet = externalResultsBridgeEnsureSheet_(
        hub, "ImportedResults", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ImportedResults
      );
      const resultExists = externalResultsBridgeReadObjects_(resultSheet).some(function(row) {
        return externalResultsBridgeKey_(row.ImportedResultId) === externalResultsBridgeKey_(payload.importedResult.ImportedResultId);
      });
      if (!resultExists) throw new Error("Hub dependency not ready: ImportedResults row has not been created yet.");
      externalResultsBridgeUpsertRows_(hub, "ImportedResults", EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS.ImportedResults,
        ["ImportedResultId"], [payload.importedResult]);
    }
    return;
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
    const jobs = externalResultsBridgeReadObjects_(sheet).filter(function(job) {
      const status = externalResultsBridgeString_(job.Status).toUpperCase();
      if (["QUEUED", "RETRY"].indexOf(status) === -1) return false;
      const next = job.NextAttemptAt ? new Date(job.NextAttemptAt).getTime() : 0;
      return !next || next <= now.getTime();
    }).slice(0, 20);
    let completed = 0;
    let failed = 0;
    jobs.forEach(function(job) {
      const attempts = Number(job.AttemptCount || 0) + 1;
      externalResultsBridgeUpdateRow_(sheet, job.__rowNumber, {
        Status: "PROCESSING", AttemptCount: attempts, LastAttemptAt: new Date(),
        ErrorMessage: "", UpdatedAt: new Date()
      });
      try {
        externalResultsBridgeApplyJob_(hub, job);
        externalResultsBridgeUpdateRow_(sheet, job.__rowNumber, {
          Status: "COMPLETE", CompletedAt: new Date(), NextAttemptAt: "",
          ErrorMessage: "", UpdatedAt: new Date()
        });
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
        failed += 1;
      }
    });
    const remaining = externalResultsBridgeReadObjects_(sheet).filter(function(job) {
      return ["QUEUED", "RETRY"].indexOf(externalResultsBridgeString_(job.Status).toUpperCase()) !== -1;
    }).length;
    if (remaining) externalResultsBridgeSchedule_();
    return { success: true, processed: jobs.length, completed: completed, failed: failed, remaining: remaining };
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
        const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0]
          .map(externalResultsBridgeString_);
        EXTERNAL_RESULTS_BRIDGE_HUB_HEADERS[sheetName].forEach(function(header) {
          if (headers.indexOf(header) === -1) issues.push(sheetName + " missing header " + header);
        });
      });
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
    issues: issues,
    checkedAt: new Date()
  };
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
  let reset = 0;
  externalResultsBridgeReadObjects_(sheet).forEach(function(row) {
    if (externalResultsBridgeString_(row.Status).toUpperCase() !== "ERROR") return;
    externalResultsBridgeUpdateRow_(sheet, row.__rowNumber, {
      Status: "QUEUED", NextAttemptAt: "", ErrorMessage: "", UpdatedAt: new Date()
    });
    reset += 1;
  });
  if (reset) externalResultsBridgeSchedule_();
  return { success: true, reset: reset, message: reset + " failed Hub job(s) queued for retry." };
}
