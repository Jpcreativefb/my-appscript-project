/* =====================================================
   PHASE 2 — EXTERNAL RESULTS HUB
   Core normalized storage, setup, menu, and manual import.

   Safety rule: every imported result requires administrator
   approval. No provider can settle the Awards App directly.
===================================================== */

const ERH_SCHEMA_VERSION = "2.2.0";
const ERH_MAIN_APP_SPREADSHEET_ID_PROPERTY = "ERH_MAIN_APP_SPREADSHEET_ID";
const ERH_REVIEW_REQUIRED_FOR_ALL_IMPORTS = true;

const ERH_SHEETS = {
  PROVIDERS: "ProviderSettings",
  EVENTS: "ExternalEvents",
  MARKETS: "ExternalMarkets",
  SUBJECTS: "ExternalSubjects",
  MAPPINGS: "AppMappings",
  RESULTS: "ImportedResults",
  REVIEW: "ReviewQueue",
  SYNC_LOG: "SyncLog",
  MANUAL: "ManualEntry"
};

const ERH_HEADERS = {};

ERH_HEADERS[ERH_SHEETS.PROVIDERS] = [
  "ProviderId",
  "ProviderType",
  "DisplayName",
  "Enabled",
  "ReadOnly",
  "PollingIntervalMinutes",
  "BaseUrl",
  "DiscoveryConfigJSON",
  "LastSuccessfulSync",
  "LastError",
  "AutoSettlementAllowed",
  "RequireAdminReview",
  "LastSyncStartedAt",
  "LastSyncFinishedAt",
  "Notes",
  "UpdatedAt"
];

ERH_HEADERS[ERH_SHEETS.EVENTS] = [
  "Provider",
  "ExternalEventId",
  "EventName",
  "EventType",
  "StartDate",
  "EndDate",
  "Status",
  "SourceUrl",
  "LastUpdated",
  "RawJSON",
  "CreatedAt"
];

ERH_HEADERS[ERH_SHEETS.MARKETS] = [
  "Provider",
  "ExternalMarketId",
  "ExternalEventId",
  "MarketQuestion",
  "OutcomesJSON",
  "PricesJSON",
  "ClosingTime",
  "ResolutionStatus",
  "WinningOutcome",
  "ResolutionSource",
  "SourceUrl",
  "LastUpdated",
  "RawJSON",
  "CreatedAt"
];

ERH_HEADERS[ERH_SHEETS.SUBJECTS] = [
  "Provider",
  "ExternalSubjectId",
  "Name",
  "SubjectType",
  "ImageUrl",
  "MetadataJSON",
  "SourceUrl",
  "LastUpdated",
  "CreatedAt"
];

ERH_HEADERS[ERH_SHEETS.MAPPINGS] = [
  "MappingId",
  "AppGameId",
  "CategoryId",
  "NomineeId",
  "Provider",
  "ExternalEventId",
  "ExternalMarketId",
  "ExternalSubjectId",
  "ResultKey",
  "ComparisonOperator",
  "Threshold",
  "ExpectedOutcome",
  "AutoSettle",
  "RequireAdminReview",
  "SourceUrl",
  "SourceConfigJSON",
  "Active",
  "CreatedAt",
  "UpdatedAt"
];

ERH_HEADERS[ERH_SHEETS.RESULTS] = [
  "ImportedResultId",
  "Provider",
  "ExternalEventId",
  "ExternalMarketId",
  "ResultKey",
  "ResultValue",
  "Finality",
  "WinningOutcome",
  "ProviderTimestamp",
  "ImportedAt",
  "EvidenceUrl",
  "SourceUrl",
  "RawJSON",
  "ReviewStatus",
  "ReviewRequired",
  "SourceFingerprint",
  "CreatedAt",
  "UpdatedAt"
];

ERH_HEADERS[ERH_SHEETS.REVIEW] = [
  "ReviewId",
  "ImportedResultId",
  "Provider",
  "ExternalEventId",
  "ExternalMarketId",
  "ResultKey",
  "ResultValue",
  "Finality",
  "WinningOutcome",
  "EvidenceUrl",
  "ReviewStatus",
  "ReviewedBy",
  "ReviewedAt",
  "ReviewNotes",
  "PushStatus",
  "PushedAt",
  "PushMessage",
  "CreatedAt",
  "UpdatedAt"
];

ERH_HEADERS[ERH_SHEETS.SYNC_LOG] = [
  "SyncId",
  "Provider",
  "StartedAt",
  "FinishedAt",
  "Status",
  "EventsUpserted",
  "MarketsUpserted",
  "SubjectsUpserted",
  "ResultsImported",
  "QueueRowsCreated",
  "ApiCalls",
  "ErrorMessage",
  "DetailsJSON"
];

ERH_HEADERS[ERH_SHEETS.MANUAL] = [
  "EntryId",
  "Provider",
  "ExternalEventId",
  "EventName",
  "EventType",
  "EventStartDate",
  "EventEndDate",
  "EventStatus",
  "ExternalMarketId",
  "MarketQuestion",
  "OutcomesJSON",
  "ResultKey",
  "ResultValue",
  "Finality",
  "WinningOutcome",
  "ProviderTimestamp",
  "EvidenceUrl",
  "SourceUrl",
  "Notes",
  "ImportStatus",
  "ImportedResultId",
  "ImportedAt"
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("External Results Hub")
    .addItem("1. Setup / Repair Hub", "setupExternalResultsHub")
    .addSeparator()
    .addItem("Import Manual Entries", "importManualResultsNow")
    .addItem("Sync Kalshi Discovery", "syncKalshiNow")
    .addItem("Sync Polymarket Discovery", "syncPolymarketNow")
    .addItem("Sync All Enabled Providers", "syncAllExternalProvidersNow")
    .addSeparator()
    .addItem("Sync Mapped Kalshi Results", "syncMappedKalshiNow")
    .addItem("Sync Mapped Polymarket Results", "syncMappedPolymarketNow")
    .addItem("Sync All Mapped Results", "syncMappedExternalProvidersNow")
    .addItem("Install Hourly Mapped Result Watch", "installExternalResultsProviderWatch")
    .addItem("Remove Mapped Result Watch", "removeExternalResultsProviderWatch")
    .addSeparator()
    .addItem("Rebuild Review Queue", "rebuildExternalReviewQueueNow")
    .addItem("Approve Selected Review Rows", "approveSelectedExternalResults")
    .addItem("Reject Selected Review Rows", "rejectSelectedExternalResults")
    .addItem("Deliver Approved Results to App Inbox", "pushApprovedExternalResultsNow")
    .addSeparator()
    .addItem("Configure Main App Spreadsheet", "configureExternalResultsHubMainApp")
    .addItem("Run Health Check", "checkExternalResultsHubHealth")
    .addToUi();
}

function setupExternalResultsHub() {
  const ss = SpreadsheetApp.getActive();

  Object.keys(ERH_HEADERS).forEach(function(sheetName) {
    erhEnsureSheet_(ss, sheetName, ERH_HEADERS[sheetName]);
  });

  erhSeedProviders_();
  erhApplySheetFormatting_();
  PropertiesService.getScriptProperties().setProperty(
    "ERH_SCHEMA_VERSION",
    ERH_SCHEMA_VERSION
  );

  ss.toast(
    "External Results Hub ready. All imported results require administrator approval.",
    "Phase 2",
    8
  );

  return checkExternalResultsHubHealth();
}

function erhEnsureHubReady_() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(ERH_HEADERS).forEach(function(sheetName) {
    erhEnsureSheet_(ss, sheetName, ERH_HEADERS[sheetName]);
  });

  const providers = erhReadObjects_(ERH_SHEETS.PROVIDERS);
  const required = ["manual-awards", "manual-reality-tv", "kalshi", "polymarket"];
  const existing = {};
  providers.forEach(function(provider) {
    existing[erhKey_(provider.ProviderId)] = true;
  });
  if (required.some(function(providerId) { return !existing[providerId]; })) {
    erhSeedProviders_();
  }
}

function configureExternalResultsHubMainApp() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Main Awards App Spreadsheet",
    "Paste the spreadsheet ID or full Google Sheets URL for the main Awards App database.",
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;

  const spreadsheetId = erhExtractSpreadsheetId_(response.getResponseText());
  if (!spreadsheetId) {
    ui.alert("A valid spreadsheet ID or Google Sheets URL is required.");
    return;
  }

  setExternalResultsHubMainAppSpreadsheetId(spreadsheetId);
  ui.alert("Main Awards App spreadsheet connected.");
}

function setExternalResultsHubMainAppSpreadsheetId(spreadsheetIdOrUrl) {
  const spreadsheetId = erhExtractSpreadsheetId_(spreadsheetIdOrUrl);
  if (!spreadsheetId) throw new Error("A valid main spreadsheet ID is required.");

  const target = SpreadsheetApp.openById(spreadsheetId);
  if (!target) throw new Error("The main spreadsheet could not be opened.");

  PropertiesService.getScriptProperties().setProperty(
    ERH_MAIN_APP_SPREADSHEET_ID_PROPERTY,
    spreadsheetId
  );

  return {
    success: true,
    spreadsheetId: spreadsheetId,
    spreadsheetName: target.getName()
  };
}

function erhSeedProviders_() {
  const now = new Date();
  const defaults = [
    {
      ProviderId: "manual-awards",
      ProviderType: "manual-awards",
      DisplayName: "Manual Awards",
      Enabled: true,
      ReadOnly: false,
      PollingIntervalMinutes: 0,
      BaseUrl: "",
      DiscoveryConfigJSON: "{}",
      LastSuccessfulSync: "",
      LastError: "",
      AutoSettlementAllowed: false,
      RequireAdminReview: true,
      LastSyncStartedAt: "",
      LastSyncFinishedAt: "",
      Notes: "Manual awards result entry. Administrator approval is mandatory.",
      UpdatedAt: now
    },
    {
      ProviderId: "manual-reality-tv",
      ProviderType: "manual-reality-tv",
      DisplayName: "Manual Reality TV",
      Enabled: true,
      ReadOnly: false,
      PollingIntervalMinutes: 0,
      BaseUrl: "",
      DiscoveryConfigJSON: "{}",
      LastSuccessfulSync: "",
      LastError: "",
      AutoSettlementAllowed: false,
      RequireAdminReview: true,
      LastSyncStartedAt: "",
      LastSyncFinishedAt: "",
      Notes: "Manual reality TV result entry. Administrator approval is mandatory.",
      UpdatedAt: now
    },
    {
      ProviderId: "kalshi",
      ProviderType: "prediction-market",
      DisplayName: "Kalshi",
      Enabled: true,
      ReadOnly: true,
      PollingIntervalMinutes: 60,
      BaseUrl: "https://external-api.kalshi.com/trade-api/v2",
      DiscoveryConfigJSON: JSON.stringify({
        eventStatus: "open",
        marketStatus: "open",
        limit: 5,
        includeNestedMarkets: false,
        includeSettled: true,
        settledLimit: 2,
        eventTickers: [],
        marketTickers: []
      }),
      LastSuccessfulSync: "",
      LastError: "",
      AutoSettlementAllowed: false,
      RequireAdminReview: true,
      LastSyncStartedAt: "",
      LastSyncFinishedAt: "",
      Notes: "Read-only public market discovery. Hourly watch polls only active mapped markets; no trading or automatic settlement.",
      UpdatedAt: now
    },
    {
      ProviderId: "polymarket",
      ProviderType: "prediction-market",
      DisplayName: "Polymarket",
      Enabled: true,
      ReadOnly: true,
      PollingIntervalMinutes: 60,
      BaseUrl: "https://gamma-api.polymarket.com",
      DiscoveryConfigJSON: JSON.stringify({
        limit: 5,
        offset: 0,
        active: true,
        closed: false,
        includeClosed: true,
        closedLimit: 2,
        eventIds: [],
        eventSlugs: [],
        marketIds: [],
        marketSlugs: []
      }),
      LastSuccessfulSync: "",
      LastError: "",
      AutoSettlementAllowed: false,
      RequireAdminReview: true,
      LastSyncStartedAt: "",
      LastSyncFinishedAt: "",
      Notes: "Read-only Gamma API discovery. Hourly watch polls only active mapped markets; no CLOB trading actions are used.",
      UpdatedAt: now
    }
  ];

  defaults.forEach(function(provider) {
    erhUpsertObject_(
      ERH_SHEETS.PROVIDERS,
      ERH_HEADERS[ERH_SHEETS.PROVIDERS],
      ["ProviderId"],
      provider,
      { preserveExisting: true }
    );
  });

  // Enforce Phase 2 safety even if someone edits provider defaults later.
  const sh = SpreadsheetApp.getActive().getSheetByName(ERH_SHEETS.PROVIDERS);
  const data = erhReadObjectsFromSheet_(sh);
  data.forEach(function(row) {
    row.AutoSettlementAllowed = false;
    row.RequireAdminReview = true;
    row.UpdatedAt = now;
    erhUpsertObject_(
      ERH_SHEETS.PROVIDERS,
      ERH_HEADERS[ERH_SHEETS.PROVIDERS],
      ["ProviderId"],
      row
    );
  });
}

function importManualResultsNow() {
  erhEnsureHubReady_();

  const sh = SpreadsheetApp.getActive().getSheetByName(ERH_SHEETS.MANUAL);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) {
    SpreadsheetApp.getActive().toast("No ManualEntry rows found.", "Manual Import", 5);
    return { success: true, imported: 0, skipped: 0, errors: 0 };
  }

  const headers = values[0].map(erhString_);
  const col = erhHeaderMap_(headers);
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (let r = 1; r < values.length; r += 1) {
    const row = values[r];
    const status = erhKey_(row[col.importstatus]);

    if (status && ["ready", "retry", "error"].indexOf(status) === -1) {
      skipped += 1;
      continue;
    }

    const provider = erhKey_(row[col.provider]);
    if (["manual-awards", "manual-reality-tv"].indexOf(provider) === -1) {
      if (erhRowIsBlank_(row)) {
        skipped += 1;
        continue;
      }
      erhSetManualRowStatus_(sh, r + 1, col, "ERROR: Provider must be manual-awards or manual-reality-tv", "", "");
      errors += 1;
      continue;
    }

    try {
      const externalEventId = erhString_(row[col.externaleventid]);
      const externalMarketId = erhString_(row[col.externalmarketid]);
      const resultKey = erhString_(row[col.resultkey] || "winning-outcome");
      const resultValue = row[col.resultvalue];
      const winningOutcome = erhString_(row[col.winningoutcome]);

      if (!externalEventId || !externalMarketId) {
        throw new Error("ExternalEventId and ExternalMarketId are required.");
      }
      if (!winningOutcome && erhString_(resultValue) === "") {
        throw new Error("WinningOutcome or ResultValue is required.");
      }

      const now = new Date();
      const entryId = erhString_(row[col.entryid]) || Utilities.getUuid();
      const eventSourceUrl = erhString_(row[col.sourceurl]);
      const outcomes = erhParseArray_(row[col.outcomesjson]);

      sh.getRange(r + 1, col.entryid + 1).setValue(entryId);

      erhUpsertExternalEvent_({
        Provider: provider,
        ExternalEventId: externalEventId,
        EventName: erhString_(row[col.eventname]) || externalEventId,
        EventType: erhString_(row[col.eventtype]) || provider,
        StartDate: row[col.eventstartdate] || "",
        EndDate: row[col.eventenddate] || "",
        Status: erhString_(row[col.eventstatus]) || "manual",
        SourceUrl: eventSourceUrl,
        LastUpdated: now,
        RawJSON: JSON.stringify({ manualEntryId: entryId, notes: erhString_(row[col.notes]) }),
        CreatedAt: now
      });

      erhUpsertExternalMarket_({
        Provider: provider,
        ExternalMarketId: externalMarketId,
        ExternalEventId: externalEventId,
        MarketQuestion: erhString_(row[col.marketquestion]) || externalMarketId,
        OutcomesJSON: JSON.stringify(outcomes),
        PricesJSON: "{}",
        ClosingTime: row[col.eventenddate] || "",
        ResolutionStatus: erhString_(row[col.finality]) || "FINAL",
        WinningOutcome: winningOutcome,
        ResolutionSource: "administrator-manual-entry",
        SourceUrl: eventSourceUrl,
        LastUpdated: now,
        RawJSON: JSON.stringify({ manualEntryId: entryId, notes: erhString_(row[col.notes]) }),
        CreatedAt: now
      });

      erhUpsertOutcomeSubjects_(
        provider,
        externalEventId,
        externalMarketId,
        outcomes,
        "",
        eventSourceUrl,
        { manualEntryId: entryId }
      );

      const result = erhImportNormalizedResult_({
        Provider: provider,
        ExternalEventId: externalEventId,
        ExternalMarketId: externalMarketId,
        ResultKey: resultKey,
        ResultValue: resultValue,
        Finality: erhNormalizeFinality_(row[col.finality] || "FINAL"),
        WinningOutcome: winningOutcome,
        ProviderTimestamp: row[col.providertimestamp] || now,
        ImportedAt: now,
        EvidenceUrl: erhString_(row[col.evidenceurl]),
        SourceUrl: eventSourceUrl,
        RawJSON: JSON.stringify({
          manualEntryId: entryId,
          notes: erhString_(row[col.notes]),
          rowNumber: r + 1
        })
      });

      erhSetManualRowStatus_(
        sh,
        r + 1,
        col,
        result.duplicate ? "DUPLICATE" : "IMPORTED — REVIEW REQUIRED",
        result.importedResultId,
        now
      );
      imported += result.duplicate ? 0 : 1;
      skipped += result.duplicate ? 1 : 0;
    } catch (error) {
      erhSetManualRowStatus_(
        sh,
        r + 1,
        col,
        "ERROR: " + error.message,
        "",
        ""
      );
      errors += 1;
    }
  }

  SpreadsheetApp.getActive().toast(
    "Imported: " + imported + " • Skipped: " + skipped + " • Errors: " + errors,
    "Manual Import",
    8
  );

  return {
    success: errors === 0,
    imported: imported,
    skipped: skipped,
    errors: errors
  };
}

function erhSetManualRowStatus_(sheet, rowNumber, col, status, importedResultId, importedAt) {
  if (col.importstatus !== undefined) {
    sheet.getRange(rowNumber, col.importstatus + 1).setValue(status);
  }
  if (col.importedresultid !== undefined) {
    sheet.getRange(rowNumber, col.importedresultid + 1).setValue(importedResultId || "");
  }
  if (col.importedat !== undefined) {
    sheet.getRange(rowNumber, col.importedat + 1).setValue(importedAt || "");
  }
}

function erhImportNormalizedResult_(input) {
  const now = new Date();
  const finality = erhNormalizeFinality_(input.Finality || "PROVISIONAL");
  const fingerprintSource = [
    input.Provider,
    input.ExternalEventId,
    input.ExternalMarketId,
    input.ResultKey,
    erhString_(input.ResultValue),
    input.WinningOutcome,
    finality
  ].map(erhString_).join("|");
  const sourceFingerprint = erhSha256_(fingerprintSource);

  const existing = erhFindObject_(
    ERH_SHEETS.RESULTS,
    function(row) {
      if (erhKey_(row.SourceFingerprint) === erhKey_(sourceFingerprint)) return true;
      return erhKey_(row.Provider) === erhKey_(input.Provider) &&
        erhKey_(row.ExternalEventId) === erhKey_(input.ExternalEventId) &&
        erhKey_(row.ExternalMarketId) === erhKey_(input.ExternalMarketId) &&
        erhKey_(row.ResultKey) === erhKey_(input.ResultKey || "winning-outcome") &&
        erhString_(row.ResultValue) === erhString_(input.ResultValue) &&
        erhKey_(row.WinningOutcome) === erhKey_(input.WinningOutcome) &&
        erhNormalizeFinality_(row.Finality) === finality;
    }
  );

  if (existing) {
    erhEnsureReviewQueueForResult_(existing);
    return {
      success: true,
      duplicate: true,
      importedResultId: existing.ImportedResultId,
      queueCreated: false
    };
  }

  const importedResultId = Utilities.getUuid();
  const result = {
    ImportedResultId: importedResultId,
    Provider: erhKey_(input.Provider),
    ExternalEventId: erhString_(input.ExternalEventId),
    ExternalMarketId: erhString_(input.ExternalMarketId),
    ResultKey: erhString_(input.ResultKey || "winning-outcome"),
    ResultValue: input.ResultValue === undefined ? "" : input.ResultValue,
    Finality: finality,
    WinningOutcome: erhString_(input.WinningOutcome),
    ProviderTimestamp: input.ProviderTimestamp || now,
    ImportedAt: input.ImportedAt || now,
    EvidenceUrl: erhString_(input.EvidenceUrl),
    SourceUrl: erhString_(input.SourceUrl),
    RawJSON: erhStringifyJson_(input.RawJSON),
    ReviewStatus: "PENDING",
    ReviewRequired: ERH_REVIEW_REQUIRED_FOR_ALL_IMPORTS,
    SourceFingerprint: sourceFingerprint,
    CreatedAt: now,
    UpdatedAt: now
  };

  erhUpsertObject_(
    ERH_SHEETS.RESULTS,
    ERH_HEADERS[ERH_SHEETS.RESULTS],
    ["ImportedResultId"],
    result
  );

  const queue = erhEnsureReviewQueueForResult_(result);

  return {
    success: true,
    duplicate: false,
    importedResultId: importedResultId,
    queueCreated: queue.created === true
  };
}

function erhEnsureReviewQueueForResult_(result) {
  const existing = erhFindObject_(
    ERH_SHEETS.REVIEW,
    function(row) {
      return erhKey_(row.ImportedResultId) === erhKey_(result.ImportedResultId);
    }
  );

  if (existing) return { created: false, reviewId: existing.ReviewId };

  const now = new Date();
  const review = {
    ReviewId: Utilities.getUuid(),
    ImportedResultId: result.ImportedResultId,
    Provider: result.Provider,
    ExternalEventId: result.ExternalEventId,
    ExternalMarketId: result.ExternalMarketId,
    ResultKey: result.ResultKey,
    ResultValue: result.ResultValue,
    Finality: result.Finality,
    WinningOutcome: result.WinningOutcome,
    EvidenceUrl: result.EvidenceUrl,
    ReviewStatus: "PENDING",
    ReviewedBy: "",
    ReviewedAt: "",
    ReviewNotes: "",
    PushStatus: "NOT APPROVED",
    PushedAt: "",
    PushMessage: "",
    CreatedAt: now,
    UpdatedAt: now
  };

  erhUpsertObject_(
    ERH_SHEETS.REVIEW,
    ERH_HEADERS[ERH_SHEETS.REVIEW],
    ["ReviewId"],
    review
  );

  return { created: true, reviewId: review.ReviewId };
}

function rebuildExternalReviewQueueNow() {
  erhEnsureHubReady_();
  const results = erhReadObjects_(ERH_SHEETS.RESULTS);
  let created = 0;

  results.forEach(function(result) {
    const queue = erhEnsureReviewQueueForResult_(result);
    if (queue.created) created += 1;
  });

  SpreadsheetApp.getActive().toast(
    created + " missing review queue row(s) created.",
    "Review Queue",
    6
  );

  return { success: true, created: created };
}

function erhUpsertExternalEvent_(event) {
  return erhUpsertObject_(
    ERH_SHEETS.EVENTS,
    ERH_HEADERS[ERH_SHEETS.EVENTS],
    ["Provider", "ExternalEventId"],
    event
  );
}

function erhUpsertExternalMarket_(market) {
  return erhUpsertObject_(
    ERH_SHEETS.MARKETS,
    ERH_HEADERS[ERH_SHEETS.MARKETS],
    ["Provider", "ExternalMarketId"],
    market
  );
}

function erhUpsertOutcomeSubjects_(provider, eventId, marketId, outcomes, imageUrl, sourceUrl, metadata) {
  const list = Array.isArray(outcomes) ? outcomes : [];
  let count = 0;

  list.forEach(function(outcome) {
    const name = erhString_(outcome);
    if (!name) return;

    const subjectId = marketId + ":" + erhSlug_(name);
    const now = new Date();
    const result = erhUpsertObject_(
      ERH_SHEETS.SUBJECTS,
      ERH_HEADERS[ERH_SHEETS.SUBJECTS],
      ["Provider", "ExternalSubjectId"],
      {
        Provider: provider,
        ExternalSubjectId: subjectId,
        Name: name,
        SubjectType: "market-outcome",
        ImageUrl: imageUrl || "",
        MetadataJSON: JSON.stringify(Object.assign({
          externalEventId: eventId,
          externalMarketId: marketId
        }, metadata || {})),
        SourceUrl: sourceUrl || "",
        LastUpdated: now,
        CreatedAt: now
      }
    );
    if (result.created || result.updated) count += 1;
  });

  return count;
}

function erhEnsureSheet_(ss, sheetName, requiredHeaders) {
  let sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);

  let headers = [];
  if (sh.getLastRow() >= 1 && sh.getLastColumn() >= 1) {
    headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(erhString_);
  }

  if (!headers.some(function(value) { return value !== ""; })) {
    sh.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    headers = requiredHeaders.slice();
  }

  const missing = requiredHeaders.filter(function(header) {
    return headers.indexOf(header) === -1;
  });

  if (missing.length) {
    sh.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    headers = headers.concat(missing);
  }

  sh.setFrozenRows(1);
  return sh;
}

function erhApplySheetFormatting_() {
  const ss = SpreadsheetApp.getActive();
  const colors = {};
  colors[ERH_SHEETS.PROVIDERS] = "#1f4e78";
  colors[ERH_SHEETS.EVENTS] = "#2f75b5";
  colors[ERH_SHEETS.MARKETS] = "#5b9bd5";
  colors[ERH_SHEETS.SUBJECTS] = "#70ad47";
  colors[ERH_SHEETS.MAPPINGS] = "#ed7d31";
  colors[ERH_SHEETS.RESULTS] = "#8064a2";
  colors[ERH_SHEETS.REVIEW] = "#c00000";
  colors[ERH_SHEETS.SYNC_LOG] = "#7f6000";
  colors[ERH_SHEETS.MANUAL] = "#008c95";

  Object.keys(ERH_HEADERS).forEach(function(sheetName) {
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return;

    const lastCol = Math.max(sh.getLastColumn(), ERH_HEADERS[sheetName].length);
    const header = sh.getRange(1, 1, 1, lastCol);
    header
      .setBackground(colors[sheetName] || "#333333")
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setWrap(true);

    sh.setFrozenRows(1);
    sh.setTabColor(colors[sheetName] || null);
    sh.autoResizeColumns(1, lastCol);

    for (let c = 1; c <= lastCol; c += 1) {
      const width = sh.getColumnWidth(c);
      if (width > 340) sh.setColumnWidth(c, 340);
      if (width < 95) sh.setColumnWidth(c, 95);
    }
  });

  erhApplyDataValidation_();
}

function erhApplyDataValidation_() {
  const ss = SpreadsheetApp.getActive();
  const boolRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["TRUE", "FALSE"], true)
    .setAllowInvalid(false)
    .build();

  const providerSheet = ss.getSheetByName(ERH_SHEETS.PROVIDERS);
  if (providerSheet) {
    const headers = providerSheet.getRange(1, 1, 1, providerSheet.getLastColumn()).getValues()[0];
    const col = erhHeaderMap_(headers);
    ["enabled", "readonly", "autosettlementallowed", "requireadminreview"].forEach(function(key) {
      if (col[key] !== undefined) {
        providerSheet.getRange(2, col[key] + 1, Math.max(providerSheet.getMaxRows() - 1, 1), 1)
          .setDataValidation(boolRule);
      }
    });
  }

  const mappingSheet = ss.getSheetByName(ERH_SHEETS.MAPPINGS);
  if (mappingSheet) {
    const headers = mappingSheet.getRange(1, 1, 1, mappingSheet.getLastColumn()).getValues()[0];
    const col = erhHeaderMap_(headers);
    ["autosettle", "requireadminreview", "active"].forEach(function(key) {
      if (col[key] !== undefined) {
        mappingSheet.getRange(2, col[key] + 1, Math.max(mappingSheet.getMaxRows() - 1, 1), 1)
          .setDataValidation(boolRule);
      }
    });

    if (col.provider !== undefined) {
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["manual-awards", "manual-reality-tv", "kalshi", "polymarket"], true)
        .setAllowInvalid(true)
        .build();
      mappingSheet.getRange(2, col.provider + 1, Math.max(mappingSheet.getMaxRows() - 1, 1), 1)
        .setDataValidation(rule);
    }

    if (col.comparisonoperator !== undefined) {
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["eq", "neq", "gt", "gte", "lt", "lte", "contains"], true)
        .setAllowInvalid(true)
        .build();
      mappingSheet.getRange(2, col.comparisonoperator + 1, Math.max(mappingSheet.getMaxRows() - 1, 1), 1)
        .setDataValidation(rule);
    }
  }

  const manualSheet = ss.getSheetByName(ERH_SHEETS.MANUAL);
  if (manualSheet) {
    const headers = manualSheet.getRange(1, 1, 1, manualSheet.getLastColumn()).getValues()[0];
    const col = erhHeaderMap_(headers);

    if (col.provider !== undefined) {
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["manual-awards", "manual-reality-tv"], true)
        .setAllowInvalid(false)
        .build();
      manualSheet.getRange(2, col.provider + 1, Math.max(manualSheet.getMaxRows() - 1, 1), 1)
        .setDataValidation(rule);
    }

    if (col.finality !== undefined) {
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["PROVISIONAL", "FINAL"], true)
        .setAllowInvalid(false)
        .build();
      manualSheet.getRange(2, col.finality + 1, Math.max(manualSheet.getMaxRows() - 1, 1), 1)
        .setDataValidation(rule);
    }
  }
}

function erhUpsertObject_(sheetName, requiredHeaders, keyFields, object, options) {
  const ss = SpreadsheetApp.getActive();
  const sh = erhEnsureSheet_(ss, sheetName, requiredHeaders);
  const values = sh.getDataRange().getValues();
  const headers = values.length ? values[0].map(erhString_) : requiredHeaders.slice();
  const col = erhHeaderMap_(headers);
  const opts = options || {};
  let matchRow = -1;

  for (let r = 1; r < values.length; r += 1) {
    const matches = keyFields.every(function(field) {
      const index = col[erhKey_(field)];
      return index !== undefined &&
        erhKey_(values[r][index]) === erhKey_(object[field]);
    });
    if (matches) {
      matchRow = r;
      break;
    }
  }

  const existing = matchRow >= 1 ? values[matchRow] : new Array(headers.length).fill("");
  const next = existing.slice();

  headers.forEach(function(header, index) {
    if (!Object.prototype.hasOwnProperty.call(object, header)) return;
    if (opts.preserveExisting && erhString_(existing[index]) !== "") return;
    next[index] = object[header];
  });

  if (matchRow >= 1) {
    sh.getRange(matchRow + 1, 1, 1, headers.length).setValues([next]);
    return { created: false, updated: true, rowNumber: matchRow + 1 };
  }

  sh.appendRow(next);
  return { created: true, updated: false, rowNumber: sh.getLastRow() };
}

function erhReadObjects_(sheetName) {
  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  return sh ? erhReadObjectsFromSheet_(sh) : [];
}

function erhReadObjectsFromSheet_(sh) {
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(erhString_);

  return values.slice(1)
    .filter(function(row) { return !erhRowIsBlank_(row); })
    .map(function(row) {
      const object = {};
      headers.forEach(function(header, index) {
        object[header] = row[index];
      });
      object.__rowNumber = row.__rowNumber || 0;
      return object;
    });
}

function erhFindObject_(sheetName, predicate) {
  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sh) return null;
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return null;
  const headers = values[0].map(erhString_);

  for (let r = 1; r < values.length; r += 1) {
    if (erhRowIsBlank_(values[r])) continue;
    const object = {};
    headers.forEach(function(header, index) {
      object[header] = values[r][index];
    });
    object.__rowNumber = r + 1;
    if (predicate(object)) return object;
  }

  return null;
}

function erhGetProviderSetting_(providerId) {
  return erhFindObject_(ERH_SHEETS.PROVIDERS, function(row) {
    return erhKey_(row.ProviderId) === erhKey_(providerId);
  });
}

function erhUpdateProviderState_(providerId, patch) {
  const provider = erhGetProviderSetting_(providerId);
  if (!provider) throw new Error("Provider not found: " + providerId);

  const next = Object.assign({}, provider, patch || {}, {
    ProviderId: provider.ProviderId,
    AutoSettlementAllowed: false,
    RequireAdminReview: true,
    UpdatedAt: new Date()
  });
  delete next.__rowNumber;

  return erhUpsertObject_(
    ERH_SHEETS.PROVIDERS,
    ERH_HEADERS[ERH_SHEETS.PROVIDERS],
    ["ProviderId"],
    next
  );
}

function erhHeaderMap_(headers) {
  const map = {};
  (headers || []).forEach(function(header, index) {
    const key = erhKey_(header);
    if (key && map[key] === undefined) map[key] = index;
  });
  return map;
}

function erhString_(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function erhKey_(value) {
  return erhString_(value).toLowerCase();
}

function erhSlug_(value) {
  return erhKey_(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "outcome";
}

function erhBoolean_(value, fallback) {
  if (value === true || value === false) return value;
  const key = erhKey_(value);
  if (["true", "yes", "1", "on", "enabled"].indexOf(key) !== -1) return true;
  if (["false", "no", "0", "off", "disabled"].indexOf(key) !== -1) return false;
  return fallback === true;
}

function erhNormalizeFinality_(value) {
  const key = erhKey_(value);
  return ["final", "settled", "resolved", "complete", "completed"].indexOf(key) !== -1
    ? "FINAL"
    : "PROVISIONAL";
}

function erhParseJson_(value, fallback) {
  if (value && typeof value === "object") return value;
  const text = erhString_(value);
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

function erhParseArray_(value) {
  if (Array.isArray(value)) return value;
  const parsed = erhParseJson_(value, null);
  if (Array.isArray(parsed)) return parsed;
  const text = erhString_(value);
  if (!text) return [];
  return text.split("|").map(erhString_).filter(Boolean);
}

function erhStringifyJson_(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch (error) {
    return erhString_(value);
  }
}

function erhSha256_(value) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    erhString_(value),
    Utilities.Charset.UTF_8
  );
  return digest.map(function(byte) {
    const normalized = byte < 0 ? byte + 256 : byte;
    return ("0" + normalized.toString(16)).slice(-2);
  }).join("");
}

function erhRowIsBlank_(row) {
  return !(row || []).some(function(value) { return erhString_(value) !== ""; });
}

function erhExtractSpreadsheetId_(value) {
  const text = erhString_(value);
  if (!text) return "";
  const match = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return /^[a-zA-Z0-9-_]{20,}$/.test(text) ? text : "";
}