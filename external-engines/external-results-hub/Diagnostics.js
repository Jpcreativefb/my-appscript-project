/* =====================================================
   EXTERNAL RESULTS HUB DIAGNOSTICS
===================================================== */

function checkExternalResultsHubHealth() {
  const ss = SpreadsheetApp.getActive();
  const issues = [];
  const counts = {};

  Object.keys(ERH_HEADERS).forEach(function(sheetName) {
    const sh = ss.getSheetByName(sheetName);
    if (!sh) {
      issues.push("Missing sheet: " + sheetName);
      return;
    }

    const headers = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1))
      .getValues()[0]
      .map(erhString_);
    ERH_HEADERS[sheetName].forEach(function(header) {
      if (headers.indexOf(header) === -1) issues.push(sheetName + " missing header " + header);
    });
    counts[sheetName] = Math.max(sh.getLastRow() - 1, 0);
  });

  const providers = erhReadObjects_(ERH_SHEETS.PROVIDERS);
  ["manual-awards", "manual-reality-tv", "kalshi", "polymarket"].forEach(function(providerId) {
    const provider = providers.find(function(row) {
      return erhKey_(row.ProviderId) === providerId;
    });
    if (!provider) {
      issues.push("Missing provider: " + providerId);
      return;
    }
    if (erhBoolean_(provider.AutoSettlementAllowed, false)) {
      issues.push(providerId + " AutoSettlementAllowed must remain FALSE.");
    }
    if (!erhBoolean_(provider.RequireAdminReview, false)) {
      issues.push(providerId + " RequireAdminReview must remain TRUE.");
    }
    if (["kalshi", "polymarket"].indexOf(providerId) !== -1 && !erhBoolean_(provider.ReadOnly, false)) {
      issues.push(providerId + " must remain read-only.");
    }
  });

  const results = erhReadObjects_(ERH_SHEETS.RESULTS);
  results.forEach(function(result) {
    if (!erhBoolean_(result.ReviewRequired, false)) {
      issues.push("ImportedResultId " + result.ImportedResultId + " does not require review.");
    }
  });

  const mainAppId = PropertiesService.getScriptProperties()
    .getProperty(ERH_MAIN_APP_SPREADSHEET_ID_PROPERTY) || "";
  let mainAppInboxReady = false;
  let mainAppInboxRows = 0;
  let mainAppName = "";
  if (mainAppId) {
    try {
      const mainApp = SpreadsheetApp.openById(mainAppId);
      mainAppName = mainApp.getName();
      const inbox = mainApp.getSheetByName("ExternalResultsInbox");
      if (!inbox) {
        issues.push("Main Awards App is missing ExternalResultsInbox. Deploy the Awards App bridge setup first.");
      } else {
        mainAppInboxReady = true;
        mainAppInboxRows = Math.max(inbox.getLastRow() - 1, 0);
      }
    } catch (err) {
      issues.push("Main Awards App connection failed: " + (err.message || err));
    }
  }

  const report = {
    success: issues.length === 0,
    schemaVersion: ERH_SCHEMA_VERSION,
    spreadsheetName: ss.getName(),
    mainAppConfigured: Boolean(mainAppId),
    mainAppName: mainAppName,
    mainAppInboxReady: mainAppInboxReady,
    mainAppInboxRows: mainAppInboxRows,
    counts: counts,
    issues: issues,
    checkedAt: new Date()
  };

  ss.toast(
    report.success
      ? "Health check passed. All imports require administrator approval."
      : "Health check found " + issues.length + " issue(s).",
    "External Results Hub",
    8
  );

  Logger.log(JSON.stringify(report, null, 2));
  return report;
}

function testExternalResultsHubSetup() {
  setupExternalResultsHub();
  return checkExternalResultsHubHealth();
}
