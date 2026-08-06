/* =====================================================
   ADMINISTRATOR REVIEW + MAIN APP BRIDGE

   Only approved FINAL results can be pushed. The bridge
   writes to the main app's existing CategoryResults sheet.
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

function pushApprovedExternalResultsNow() {
  erhEnsureHubReady_();
  const mainSpreadsheetId = PropertiesService.getScriptProperties()
    .getProperty(ERH_MAIN_APP_SPREADSHEET_ID_PROPERTY);

  if (!mainSpreadsheetId) {
    SpreadsheetApp.getUi().alert(
      "Configure the Main Awards App spreadsheet before pushing approved results."
    );
    return { success: false, error: "Main spreadsheet is not configured." };
  }

  const mainSs = SpreadsheetApp.openById(mainSpreadsheetId);
  const resultSheet = mainSs.getSheetByName("CategoryResults");
  if (!resultSheet) {
    throw new Error("The main Awards App spreadsheet does not contain CategoryResults.");
  }

  const requiredHeaders = [
    "Timestamp",
    "GameId",
    "CategoryId",
    "NomineeId",
    "ResultStatus",
    "IsWinner",
    "FinalRank",
    "FinalPosition",
    "ResultValue",
    "ResultSource",
    "SettledAt",
    "Notes"
  ];
  const resultHeaders = erhEnsureTargetHeaders_(resultSheet, requiredHeaders);
  const existingKeys = erhReadExistingCategoryResultKeys_(resultSheet, resultHeaders);
  const reviews = erhReadObjects_(ERH_SHEETS.REVIEW);
  const importedResults = erhReadObjects_(ERH_SHEETS.RESULTS);
  const mappings = erhReadObjects_(ERH_SHEETS.MAPPINGS).filter(function(mapping) {
    return erhBoolean_(mapping.Active, true);
  });
  const resultById = {};

  importedResults.forEach(function(result) {
    resultById[erhKey_(result.ImportedResultId)] = result;
  });

  let pushedReviews = 0;
  let appendedRows = 0;
  let waitingFinal = 0;
  let errors = 0;

  reviews.forEach(function(review) {
    if (erhKey_(review.ReviewStatus) !== "approved") return;
    if (erhKey_(review.PushStatus) === "pushed") return;

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

    const rowsToAppend = [];
    const mappingErrors = [];

    matchingMappings.forEach(function(mapping) {
      const evaluation = erhEvaluateMappingWinner_(mapping, result);
      if (!evaluation.ok) {
        mappingErrors.push(mapping.MappingId + ": " + evaluation.error);
        return;
      }

      const uniqueKey = [
        mapping.AppGameId,
        mapping.CategoryId,
        mapping.NomineeId,
        result.Provider,
        result.ImportedResultId
      ].map(erhKey_).join("|");

      if (existingKeys[uniqueKey]) return;

      const now = new Date();
      const notes = [
        "External Results Hub",
        "ReviewId=" + review.ReviewId,
        "ImportedResultId=" + result.ImportedResultId,
        result.EvidenceUrl ? "Evidence=" + result.EvidenceUrl : ""
      ].filter(Boolean).join("; ");

      const rowObject = {
        Timestamp: now,
        GameId: mapping.AppGameId,
        CategoryId: mapping.CategoryId,
        NomineeId: mapping.NomineeId,
        ResultStatus: "FINAL",
        IsWinner: evaluation.isWinner,
        FinalRank: "",
        FinalPosition: "",
        ResultValue: result.ResultValue,
        ResultSource: "external-results-hub:" + result.Provider,
        SettledAt: now,
        Notes: notes
      };

      rowsToAppend.push(resultHeaders.map(function(header) {
        return Object.prototype.hasOwnProperty.call(rowObject, header)
          ? rowObject[header]
          : "";
      }));
      existingKeys[uniqueKey] = true;
    });

    if (mappingErrors.length) {
      erhSetReviewPushState_(
        review.ReviewId,
        "ERROR",
        mappingErrors.join(" | "),
        ""
      );
      errors += 1;
      return;
    }

    if (rowsToAppend.length) {
      resultSheet.getRange(
        resultSheet.getLastRow() + 1,
        1,
        rowsToAppend.length,
        resultHeaders.length
      ).setValues(rowsToAppend);
      appendedRows += rowsToAppend.length;
    }

    erhSetReviewPushState_(
      review.ReviewId,
      "PUSHED",
      rowsToAppend.length
        ? rowsToAppend.length + " CategoryResults row(s) added."
        : "Already present; no duplicate rows added.",
      new Date()
    );
    pushedReviews += 1;
  });

  SpreadsheetApp.getActive().toast(
    "Reviews pushed: " + pushedReviews +
      " • CategoryResults rows: " + appendedRows +
      " • Waiting final: " + waitingFinal +
      " • Errors: " + errors,
    "Main App Bridge",
    10
  );

  return {
    success: errors === 0,
    pushedReviews: pushedReviews,
    appendedRows: appendedRows,
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

function erhEvaluateMappingWinner_(mapping, result) {
  const expectedOutcome = erhString_(mapping.ExpectedOutcome);
  const externalSubjectId = erhString_(mapping.ExternalSubjectId);
  const winningOutcome = erhString_(result.WinningOutcome);
  const resultValue = result.ResultValue;
  const operator = erhKey_(mapping.ComparisonOperator);
  const threshold = mapping.Threshold;

  if (expectedOutcome) {
    return {
      ok: true,
      isWinner: erhKey_(expectedOutcome) === erhKey_(winningOutcome || resultValue)
    };
  }

  if (externalSubjectId) {
    const subjectName = erhResolveExternalSubjectName_(result.Provider, externalSubjectId);
    const candidates = [externalSubjectId, subjectName].map(erhKey_).filter(Boolean);
    return {
      ok: true,
      isWinner: candidates.indexOf(erhKey_(winningOutcome || resultValue)) !== -1
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