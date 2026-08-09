/* =====================================================
   ADMINISTRATOR REVIEW + MAIN APP BRIDGE

   Only approved FINAL results can be delivered. The bridge
   writes to the main app's ExternalResultsInbox. The Awards
   App remains responsible for settlement and scoring.
===================================================== */

function approveSelectedExternalResults() {
  return erhSetSelectedReviewStatus_("APPROVED");
}

function rejectSelectedExternalResults() {
  return erhSetSelectedReviewStatus_("REJECTED");
}

function erhSetSelectedReviewStatus_(status) {
  erhEnsureHubReady_();
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getActiveSheet();

  if (!sh || sh.getName() !== ERH_SHEETS.REVIEW) {
    SpreadsheetApp.getUi().alert("Open ReviewQueue and select the result rows first.");
    return { success: false, error: "ReviewQueue is not active." };
  }

  const range = sh.getActiveRange();
  if (!range || range.getRow() < 2) {
    SpreadsheetApp.getUi().alert("Select one or more ReviewQueue data rows.");
    return { success: false, error: "No review rows selected." };
  }

  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(erhString_);
  const col = erhHeaderMap_(headers);
  const reviewer = erhCurrentReviewer_();
  const now = new Date();
  let updated = 0;

  for (let rowNumber = range.getRow(); rowNumber < range.getRow() + range.getNumRows(); rowNumber += 1) {
    const reviewId = erhString_(sh.getRange(rowNumber, col.reviewid + 1).getValue());
    if (!reviewId) continue;

    sh.getRange(rowNumber, col.reviewstatus + 1).setValue(status);
    sh.getRange(rowNumber, col.reviewedby + 1).setValue(reviewer);
    sh.getRange(rowNumber, col.reviewedat + 1).setValue(now);
    sh.getRange(rowNumber, col.pushstatus + 1).setValue(
      status === "APPROVED" ? "READY" : "NOT APPROVED"
    );
    sh.getRange(rowNumber, col.updatedat + 1).setValue(now);

    const importedResultId = erhString_(sh.getRange(rowNumber, col.importedresultid + 1).getValue());
    if (importedResultId) {
      erhUpdateImportedResultReviewStatus_(importedResultId, status);
    }
    updated += 1;
  }

  ss.toast(updated + " review row(s) marked " + status + ".", "Review Queue", 6);
  return { success: true, updated: updated, status: status };
}

function erhUpdateImportedResultReviewStatus_(importedResultId, status) {
  const result = erhFindObject_(ERH_SHEETS.RESULTS, function(row) {
    return erhKey_(row.ImportedResultId) === erhKey_(importedResultId);
  });
  if (!result) return;

  result.ReviewStatus = status;
  result.ReviewRequired = true;
  result.UpdatedAt = new Date();
  delete result.__rowNumber;

  erhUpsertObject_(
    ERH_SHEETS.RESULTS,
    ERH_HEADERS[ERH_SHEETS.RESULTS],
    ["ImportedResultId"],
    result
  );
}

function erhMappingDeliveryKey_(mapping) {
  const explicit = erhString_(mapping && mapping.MappingId);
  if (explicit) return explicit;
  const source = [
    mapping && mapping.Provider, mapping && mapping.AppGameId, mapping && mapping.CategoryId,
    mapping && mapping.NomineeId, mapping && mapping.ExternalEventId, mapping && mapping.ExternalMarketId,
    mapping && mapping.ExternalSubjectId, mapping && mapping.ResultKey, mapping && mapping.ExpectedOutcome,
    mapping && mapping.ComparisonOperator, mapping && mapping.Threshold
  ].map(erhString_).join("|");
  return "map-" + erhSha256_(source).slice(0, 20);
}

function pushApprovedExternalResultsNow() {
  erhEnsureHubReady_();
  const mainSpreadsheetId = PropertiesService.getScriptProperties()
    .getProperty(ERH_MAIN_APP_SPREADSHEET_ID_PROPERTY);

  if (!mainSpreadsheetId) {
    SpreadsheetApp.getUi().alert(
      "Configure the Main Awards App spreadsheet before delivering approved results."
    );
    return { success: false, error: "Main spreadsheet is not configured." };
  }

  const mainSs = SpreadsheetApp.openById(mainSpreadsheetId);
  let inboxSheet = mainSs.getSheetByName("ExternalResultsInbox");
  if (!inboxSheet) inboxSheet = mainSs.insertSheet("ExternalResultsInbox");

  const inboxHeaders = [
    "DeliveryId", "DeliveryBatchId", "ReviewId", "ImportedResultId", "Provider",
    "AppGameId", "CategoryId", "NomineeId", "ExternalEventId", "ExternalMarketId",
    "ExternalSubjectId", "ResultKey", "ResultValue", "WinningOutcome", "WinnersJSON",
    "IsWinner", "Finality", "EvidenceUrl", "SourceConfigJSON", "Status",
    "AttemptCount", "LastAttemptAt", "AppliedAt", "NativeRoute", "NativeQueueId",
    "NativeStatus", "NativeUpdatedAt", "ErrorMessage", "CreatedAt", "UpdatedAt"
  ];
  const headers = erhEnsureTargetHeaders_(inboxSheet, inboxHeaders);
  const existingDeliveryIds = {};
  const inboxRows = inboxSheet.getDataRange().getValues();
  const inboxCol = erhHeaderMap_(headers);
  inboxRows.slice(1).forEach(function(row) {
    const deliveryId = erhKey_(row[inboxCol.deliveryid]);
    if (deliveryId) existingDeliveryIds[deliveryId] = true;
  });

  const reviews = erhReadObjects_(ERH_SHEETS.REVIEW);
  const importedResults = erhReadObjects_(ERH_SHEETS.RESULTS);
  const mappings = erhReadObjects_(ERH_SHEETS.MAPPINGS).filter(function(mapping) {
    return erhBoolean_(mapping.Active, true);
  });
  const resultById = {};
  importedResults.forEach(function(result) {
    resultById[erhKey_(result.ImportedResultId)] = result;
  });

  let deliveredReviews = 0;
  let deliveredRows = 0;
  let waitingFinal = 0;
  let errors = 0;

  reviews.forEach(function(review) {
    if (erhKey_(review.ReviewStatus) !== "approved") return;
    if (["delivered", "pushed"].indexOf(erhKey_(review.PushStatus)) !== -1) return;

    const result = resultById[erhKey_(review.ImportedResultId)];
    if (!result) {
      erhSetReviewPushState_(review.ReviewId, "ERROR", "ImportedResults row not found.", "");
      errors += 1;
      return;
    }
    if (erhNormalizeFinality_(result.Finality) !== "FINAL") {
      erhSetReviewPushState_(
        review.ReviewId,
        "WAITING FINAL",
        "Approved, but provider result is still provisional.",
        ""
      );
      waitingFinal += 1;
      return;
    }

    const matchingMappings = mappings.filter(function(mapping) {
      return erhMappingMatchesResult_(mapping, result);
    });
    if (!matchingMappings.length) {
      erhSetReviewPushState_(
        review.ReviewId,
        "ERROR",
        "No active AppMappings row matches this result.",
        ""
      );
      errors += 1;
      return;
    }

    const batchId = "hub-delivery-" + review.ReviewId;
    const winners = erhWinningOutcomeList_(result);
    const rowsToAppend = [];
    const mappingErrors = [];

    matchingMappings.forEach(function(mapping) {
      const evaluation = erhEvaluateMappingWinner_(mapping, result);
      if (!evaluation.ok) {
        mappingErrors.push(erhMappingDeliveryKey_(mapping) + ": " + evaluation.error);
        return;
      }

      const deliveryId = batchId + "-" + erhMappingDeliveryKey_(mapping);
      if (existingDeliveryIds[erhKey_(deliveryId)]) return;
      const now = new Date();
      const rowObject = {
        DeliveryId: deliveryId,
        DeliveryBatchId: batchId,
        ReviewId: review.ReviewId,
        ImportedResultId: result.ImportedResultId,
        Provider: result.Provider,
        AppGameId: mapping.AppGameId,
        CategoryId: mapping.CategoryId,
        NomineeId: mapping.NomineeId,
        ExternalEventId: result.ExternalEventId,
        ExternalMarketId: result.ExternalMarketId,
        ExternalSubjectId: mapping.ExternalSubjectId,
        ResultKey: result.ResultKey,
        ResultValue: result.ResultValue,
        WinningOutcome: result.WinningOutcome,
        WinnersJSON: JSON.stringify(winners),
        IsWinner: evaluation.isWinner,
        Finality: "FINAL",
        EvidenceUrl: result.EvidenceUrl || review.EvidenceUrl || "",
        SourceConfigJSON: mapping.SourceConfigJSON || "{}",
        Status: "READY",
        AttemptCount: 0,
        LastAttemptAt: "",
        AppliedAt: "",
        ErrorMessage: "",
        CreatedAt: now,
        UpdatedAt: now
      };
      rowsToAppend.push(headers.map(function(header) {
        return Object.prototype.hasOwnProperty.call(rowObject, header) ? rowObject[header] : "";
      }));
      existingDeliveryIds[erhKey_(deliveryId)] = true;
    });

    if (mappingErrors.length) {
      erhSetReviewPushState_(review.ReviewId, "ERROR", mappingErrors.join(" | "), "");
      errors += 1;
      return;
    }

    if (rowsToAppend.length) {
      inboxSheet.getRange(inboxSheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length)
        .setValues(rowsToAppend);
      deliveredRows += rowsToAppend.length;
    }

    erhSetReviewPushState_(
      review.ReviewId,
      "DELIVERED",
      rowsToAppend.length
        ? rowsToAppend.length + " result mapping row(s) delivered to ExternalResultsInbox."
        : "Already delivered; no duplicate inbox rows added.",
      new Date()
    );
    deliveredReviews += 1;
  });

  SpreadsheetApp.getActive().toast(
    "Reviews delivered: " + deliveredReviews +
      " • Inbox rows: " + deliveredRows +
      " • Waiting final: " + waitingFinal +
      " • Errors: " + errors,
    "Awards App Inbox",
    10
  );

  return {
    success: errors === 0,
    deliveredReviews: deliveredReviews,
    deliveredRows: deliveredRows,
    waitingFinal: waitingFinal,
    errors: errors,
    mainSpreadsheetName: mainSs.getName()
  };
}

function erhMappingMatchesResult_(mapping, result) {
  if (erhKey_(mapping.Provider) !== erhKey_(result.Provider)) return false;
  if (erhString_(mapping.ExternalEventId) &&
      erhKey_(mapping.ExternalEventId) !== erhKey_(result.ExternalEventId)) return false;
  if (erhString_(mapping.ExternalMarketId) &&
      erhKey_(mapping.ExternalMarketId) !== erhKey_(result.ExternalMarketId)) return false;
  if (erhString_(mapping.ResultKey) &&
      erhKey_(mapping.ResultKey) !== erhKey_(result.ResultKey)) return false;
  return Boolean(
    erhString_(mapping.AppGameId) &&
    erhString_(mapping.CategoryId) &&
    erhString_(mapping.NomineeId)
  );
}

function erhWinningOutcomeList_(result) {
  const raw = result && (result.WinningOutcome !== undefined && result.WinningOutcome !== ""
    ? result.WinningOutcome
    : result.ResultValue);
  if (Array.isArray(raw)) return raw.map(erhString_).filter(Boolean);
  const text = erhString_(raw);
  if (!text) return [];
  if (text.charAt(0) === "[") {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(erhString_).filter(Boolean);
    } catch (err) {}
  }
  return text.split(/\s*,\s*|\s*\|\s*/).map(erhString_).filter(Boolean);
}

function erhEvaluateMappingWinner_(mapping, result) {
  const expectedOutcome = erhString_(mapping.ExpectedOutcome);
  const externalSubjectId = erhString_(mapping.ExternalSubjectId);
  const winners = erhWinningOutcomeList_(result).map(erhKey_).filter(Boolean);
  const resultValue = result.ResultValue;
  const operator = erhKey_(mapping.ComparisonOperator);
  const threshold = mapping.Threshold;

  if (expectedOutcome) {
    return {
      ok: true,
      isWinner: winners.indexOf(erhKey_(expectedOutcome)) !== -1
    };
  }

  if (externalSubjectId) {
    const subjectName = erhResolveExternalSubjectName_(result.Provider, externalSubjectId);
    const candidates = [externalSubjectId, subjectName].map(erhKey_).filter(Boolean);
    return {
      ok: true,
      isWinner: candidates.some(function(candidate) { return winners.indexOf(candidate) !== -1; })
    };
  }

  if (operator) {
    return erhCompareResult_(resultValue, operator, threshold);
  }

  return {
    ok: false,
    isWinner: false,
    error: "Set ExpectedOutcome, ExternalSubjectId, or ComparisonOperator/Threshold."
  };
}

function erhCompareResult_(actual, operator, expected) {
  const op = erhKey_(operator);
  const actualNumber = Number(actual);
  const expectedNumber = Number(expected);

  if (["gt", "gte", "lt", "lte"].indexOf(op) !== -1) {
    if (!Number.isFinite(actualNumber) || !Number.isFinite(expectedNumber)) {
      return { ok: false, isWinner: false, error: "Numeric comparison requires numeric ResultValue and Threshold." };
    }
    if (op === "gt") return { ok: true, isWinner: actualNumber > expectedNumber };
    if (op === "gte") return { ok: true, isWinner: actualNumber >= expectedNumber };
    if (op === "lt") return { ok: true, isWinner: actualNumber < expectedNumber };
    return { ok: true, isWinner: actualNumber <= expectedNumber };
  }

  if (op === "eq") return { ok: true, isWinner: erhKey_(actual) === erhKey_(expected) };
  if (op === "neq") return { ok: true, isWinner: erhKey_(actual) !== erhKey_(expected) };
  if (op === "contains") {
    return { ok: true, isWinner: erhKey_(actual).indexOf(erhKey_(expected)) !== -1 };
  }

  return { ok: false, isWinner: false, error: "Unsupported ComparisonOperator: " + operator };
}

function erhResolveExternalSubjectName_(provider, externalSubjectId) {
  const subject = erhFindObject_(ERH_SHEETS.SUBJECTS, function(row) {
    return erhKey_(row.Provider) === erhKey_(provider) &&
      erhKey_(row.ExternalSubjectId) === erhKey_(externalSubjectId);
  });
  return subject ? erhString_(subject.Name) : "";
}

function erhSetReviewPushState_(reviewId, pushStatus, message, pushedAt) {
  const review = erhFindObject_(ERH_SHEETS.REVIEW, function(row) {
    return erhKey_(row.ReviewId) === erhKey_(reviewId);
  });
  if (!review) return;

  review.PushStatus = pushStatus;
  review.PushMessage = message || "";
  review.PushedAt = pushedAt || "";
  review.UpdatedAt = new Date();
  delete review.__rowNumber;

  erhUpsertObject_(
    ERH_SHEETS.REVIEW,
    ERH_HEADERS[ERH_SHEETS.REVIEW],
    ["ReviewId"],
    review
  );
}

function erhEnsureTargetHeaders_(sheet, requiredHeaders) {
  let headers = sheet.getLastRow() >= 1 && sheet.getLastColumn() >= 1
    ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(erhString_)
    : [];

  if (!headers.some(Boolean)) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    headers = requiredHeaders.slice();
  }

  const missing = requiredHeaders.filter(function(header) {
    return headers.indexOf(header) === -1;
  });
  if (missing.length) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    headers = headers.concat(missing);
  }
  return headers;
}

function erhReadExistingCategoryResultKeys_(sheet, headers) {
  const keys = {};
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return keys;
  const col = erhHeaderMap_(headers);

  values.slice(1).forEach(function(row) {
    const notes = erhString_(row[col.notes]);
    const match = notes.match(/ImportedResultId=([^;]+)/i);
    if (!match) return;
    const importedResultId = erhString_(match[1]);
    const provider = erhString_(row[col.resultsource]).replace(/^external-results-hub:/i, "");
    const key = [
      row[col.gameid],
      row[col.categoryid],
      row[col.nomineeid],
      provider,
      importedResultId
    ].map(erhKey_).join("|");
    keys[key] = true;
  });

  return keys;
}

function erhCurrentReviewer_() {
  try {
    return Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || "administrator";
  } catch (error) {
    return "administrator";
  }
}