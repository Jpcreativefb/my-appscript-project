/* =====================================================
   INTERNET RESULTS ENGINE
   Phase 1: source setup + raw import logging only

   This does NOT apply winners.
   This does NOT update scoring.
===================================================== */

const INTERNET_SOURCES_SHEET =
  "InternetSources";

const INTERNET_IMPORTS_SHEET =
  "InternetImports";

const INTERNET_SOURCES_HEADERS = [
  "SourceId",
  "GameId",
  "Name",
  "SourceType",
  "Url",
  "ParserType",
  "MatchMode",
  "Active",
  "AutoApply",
  "TrustLevel",
  "Notes",
  "LastPulledAt",
  "LastStatus"
];

const INTERNET_IMPORTS_HEADERS = [
  "Timestamp",
  "ImportId",
  "GameId",
  "SourceId",
  "SourceName",
  "SourceType",
  "ParserType",
  "Url",
  "Status",
  "HttpCode",
  "ContentLength",
  "RawPayload",
  "RawTextPreview",
  "RawJsonPreview",
  "Error"
];

const RESULT_SUGGESTIONS_SHEET =
  "ResultSuggestions";

const RESULT_SUGGESTIONS_HEADERS = [
  "Timestamp",
  "SuggestionId",
  "GameId",
  "SourceId",
  "ImportId",
  "CategoryId",
  "CategoryName",
  "SuggestedNomineeId",
  "SuggestedNomineeName",
  "Confidence",
  "MatchedText",
  "Status",
  "AppliedAt",
  "AppliedBy",
  "Notes"
];

/* =====================================================
   NORMALIZERS
===================================================== */

function normalizeInternetValue_(value) {

  return String(value || "")
    .trim();

}

function normalizeInternetId_(value) {

  return normalizeInternetValue_(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

}

function internetNowIso_() {

  return new Date().toISOString();

}

function internetPreview_(value, maxLength) {

  const text =
    normalizeInternetValue_(value);

  const limit =
    Number(maxLength) || 5000;

  if (text.length <= limit) {
    return text;
  }

  return text.substring(0, limit) +
    "\n\n...[truncated]";

}

/* =====================================================
   SETUP
===================================================== */

function setupInternetResultsSystem() {

  ensureInternetSourcesSheet_();
  ensureInternetImportsSheet_();
  ensureResultSuggestionsSheet_();

  return {
    success: true,
    message: "Internet results system ready",
    sheets: [
      INTERNET_SOURCES_SHEET,
      INTERNET_IMPORTS_SHEET,
      RESULT_SUGGESTIONS_SHEET
    ]
  };

}

function apiAdminSetupInternetResultsSystem(payload) {

  requireAdmin_(payload);

  return setupInternetResultsSystem();

}

function ensureInternetSourcesSheet_() {

  return ensureInternetSheet_(
    INTERNET_SOURCES_SHEET,
    INTERNET_SOURCES_HEADERS
  );

}

function ensureInternetImportsSheet_() {

  return ensureInternetSheet_(
    INTERNET_IMPORTS_SHEET,
    INTERNET_IMPORTS_HEADERS
  );

}

function ensureInternetSheet_(
  sheetName,
  headers
) {

  const ss =
    SpreadsheetApp.getActive();

  let sheet =
    ss.getSheetByName(sheetName);

  if (!sheet) {

    sheet =
      ss.insertSheet(sheetName);

  }

  if (sheet.getLastRow() === 0) {

    sheet.getRange(
      1,
      1,
      1,
      headers.length
    ).setValues([
      headers
    ]);

    sheet.setFrozenRows(1);

    return sheet;

  }

  const existingHeaders =
    sheet.getRange(
      1,
      1,
      1,
      Math.max(sheet.getLastColumn(), 1)
    )
    .getValues()[0]
    .map(header =>
      normalizeInternetValue_(header)
    );

  if (existingHeaders.join("") === "") {

    sheet.getRange(
      1,
      1,
      1,
      headers.length
    ).setValues([
      headers
    ]);

    sheet.setFrozenRows(1);

    return sheet;

  }

  headers.forEach(header => {

    if (existingHeaders.indexOf(header) === -1) {

      sheet.getRange(
        1,
        sheet.getLastColumn() + 1
      ).setValue(header);

    }

  });

  sheet.setFrozenRows(1);

  return sheet;

}

/* =====================================================
   COLUMN MAPS
===================================================== */

function getInternetSourcesColumnMap_(headers) {

  return {
    sourceId:
      headers.indexOf("SourceId"),

    gameId:
      headers.indexOf("GameId"),

    name:
      headers.indexOf("Name"),

    sourceType:
      headers.indexOf("SourceType"),

    url:
      headers.indexOf("Url"),

    parserType:
      headers.indexOf("ParserType"),

    matchMode:
      headers.indexOf("MatchMode"),

    active:
      headers.indexOf("Active"),

    autoApply:
      headers.indexOf("AutoApply"),

    trustLevel:
      headers.indexOf("TrustLevel"),

    notes:
      headers.indexOf("Notes"),

    lastPulledAt:
      headers.indexOf("LastPulledAt"),

    lastStatus:
      headers.indexOf("LastStatus")
  };

}

function getInternetImportsColumnMap_(headers) {

  return {
    timestamp:
      headers.indexOf("Timestamp"),

    importId:
      headers.indexOf("ImportId"),

    gameId:
      headers.indexOf("GameId"),

    sourceId:
      headers.indexOf("SourceId"),

    sourceName:
      headers.indexOf("SourceName"),

    sourceType:
      headers.indexOf("SourceType"),

    parserType:
      headers.indexOf("ParserType"),

    url:
      headers.indexOf("Url"),

    status:
      headers.indexOf("Status"),

    httpCode:
      headers.indexOf("HttpCode"),

    contentLength:
      headers.indexOf("ContentLength"),

    rawPayload:
      headers.indexOf("RawPayload"),

    rawTextPreview:
      headers.indexOf("RawTextPreview"),

    rawJsonPreview:
      headers.indexOf("RawJsonPreview"),

    error:
      headers.indexOf("Error")
  };

}

/* =====================================================
   SOURCE UPSERT
===================================================== */

function upsertInternetSource_(payload) {

  payload =
    payload || {};

  const sheet =
    ensureInternetSourcesSheet_();

  const data =
    sheet.getDataRange()
      .getValues();

  const headers =
    data[0].map(header =>
      normalizeInternetValue_(header)
    );

  const col =
    getInternetSourcesColumnMap_(
      headers
    );

  const sourceId =
    normalizeInternetId_(
      payload.sourceId ||
      payload.name ||
      "internet-source"
    );

  const gameId =
    normalizeInternetValue_(
      payload.gameId || getDefaultGameId()
    );

  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    const rowSourceId =
      normalizeInternetId_(
        row[col.sourceId]
      );

    const rowGameId =
      normalizeInternetValue_(
        row[col.gameId]
      );

    if (
      rowSourceId === sourceId &&
      rowGameId === gameId
    ) {

      rowIndex =
        i + 1;

      break;

    }

  }

  const row =
    rowIndex > -1
      ? sheet.getRange(
          rowIndex,
          1,
          1,
          headers.length
        ).getValues()[0]
      : new Array(headers.length)
          .fill("");

  row[col.sourceId] =
    sourceId;

  row[col.gameId] =
    gameId;

  row[col.name] =
    normalizeInternetValue_(
      payload.name || sourceId
    );

  row[col.sourceType] =
    normalizeInternetValue_(
      payload.sourceType || "webpage"
    );

  row[col.url] =
    normalizeInternetValue_(
      payload.url || ""
    );

  row[col.parserType] =
    normalizeInternetValue_(
      payload.parserType || "webpage-text"
    );

  row[col.matchMode] =
    normalizeInternetValue_(
      payload.matchMode || "nominee-name"
    );

  row[col.active] =
    payload.active === undefined
      ? true
      : payload.active === true ||
        String(payload.active).toLowerCase() === "true";

  row[col.autoApply] =
    payload.autoApply === true ||
    String(payload.autoApply).toLowerCase() === "true";

  row[col.trustLevel] =
    normalizeInternetValue_(
      payload.trustLevel || "medium"
    );

  row[col.notes] =
    normalizeInternetValue_(
      payload.notes || ""
    );

  row[col.lastPulledAt] =
    payload.lastPulledAt || row[col.lastPulledAt] || "";

  row[col.lastStatus] =
    payload.lastStatus || row[col.lastStatus] || "";

  if (rowIndex > -1) {

    sheet.getRange(
      rowIndex,
      1,
      1,
      headers.length
    ).setValues([
      row
    ]);

  } else {

    sheet.appendRow(row);

  }

  return {
    sourceId:
      sourceId,
    gameId:
      gameId
  };

}

function updateInternetSourcePullStatus_(
  gameId,
  sourceId,
  status
) {

  const sheet =
    ensureInternetSourcesSheet_();

  const data =
    sheet.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return;
  }

  const headers =
    data[0].map(header =>
      normalizeInternetValue_(header)
    );

  const col =
    getInternetSourcesColumnMap_(
      headers
    );

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    if (
      normalizeInternetValue_(row[col.gameId]) === gameId &&
      normalizeInternetId_(row[col.sourceId]) === sourceId
    ) {

      if (col.lastPulledAt > -1) {
        sheet.getRange(
          i + 1,
          col.lastPulledAt + 1
        ).setValue(new Date());
      }

      if (col.lastStatus > -1) {
        sheet.getRange(
          i + 1,
          col.lastStatus + 1
        ).setValue(status || "");
      }

      return;

    }

  }

}

/* =====================================================
   FETCH HELPERS
===================================================== */

function stripHtmlToText_(html) {

  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<\/(p|div|section|article|li|tr|h1|h2|h3|h4|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

}

function fetchInternetUrl_(url, sourceType) {

  url =
    normalizeInternetValue_(url);

  if (!url) {

    throw new Error(
      "URL is required for this source type."
    );

  }

  if (
    url.indexOf("http://") !== 0 &&
    url.indexOf("https://") !== 0
  ) {

    throw new Error(
      "URL must start with http:// or https://"
    );

  }

  const response =
    UrlFetchApp.fetch(
      url,
      {
        muteHttpExceptions:
          true,

        followRedirects:
          true,

        headers:
          {
            "User-Agent":
              "Mozilla/5.0 AwardsAppResultsBot/1.0"
          }
      }
    );

  const httpCode =
    response.getResponseCode();

  const body =
    response.getContentText();

  let rawText =
    body;

  let rawJson =
    "";

  const normalizedType =
    normalizeInternetValue_(
      sourceType
    ).toLowerCase();

  if (
    normalizedType === "webpage" ||
    normalizedType === "html"
  ) {

    rawText =
      stripHtmlToText_(body);

  } else if (
    normalizedType === "json" ||
    normalizedType === "api"
  ) {

    try {

      const parsed =
        JSON.parse(body);

      rawJson =
        JSON.stringify(
          parsed,
          null,
          2
        );

      rawText =
        rawJson;

    } catch (err) {

      rawJson =
        "";

      rawText =
        body;

    }

  } else {

    rawText =
      body;

  }

  return {
    httpCode:
      httpCode,

    contentLength:
      body.length,

    rawText:
      rawText,

    rawJson:
      rawJson
  };

}

/* =====================================================
   IMPORT LOG
===================================================== */

function appendInternetImport_(payload) {

  const sheet =
    ensureInternetImportsSheet_();

  const headers =
    sheet.getRange(
      1,
      1,
      1,
      sheet.getLastColumn()
    )
    .getValues()[0]
    .map(header =>
      normalizeInternetValue_(header)
    );

  const col =
    getInternetImportsColumnMap_(
      headers
    );

  const row =
    new Array(headers.length)
      .fill("");

  row[col.timestamp] =
    new Date();

  row[col.importId] =
    payload.importId || "";

  row[col.gameId] =
    payload.gameId || "";

  row[col.sourceId] =
    payload.sourceId || "";

  row[col.sourceName] =
    payload.sourceName || "";

  row[col.sourceType] =
    payload.sourceType || "";

  row[col.parserType] =
    payload.parserType || "";

  row[col.url] =
    payload.url || "";

  row[col.status] =
    payload.status || "";

  row[col.httpCode] =
    payload.httpCode || "";

    row[col.contentLength] =
    payload.contentLength || 0;

  if (col.rawPayload > -1) {

    row[col.rawPayload] =
      internetPreview_(
        payload.rawPayload ||
        payload.rawJsonPreview ||
        payload.rawTextPreview ||
        "",
        45000
      );

  }

  row[col.rawTextPreview] =
    internetPreview_(
      payload.rawTextPreview || "",
      5000
    );

  row[col.rawJsonPreview] =
    internetPreview_(
      payload.rawJsonPreview || "",
      5000
    );

  row[col.error] =
    payload.error || "";

  sheet.appendRow(row);

}

/* =====================================================
   PULL INTERNET RESULTS
===================================================== */

function pullInternetResults(payload) {

  payload =
    payload || {};

  setupInternetResultsSystem();

  const gameId =
    normalizeInternetValue_(
      payload.gameId || getDefaultGameId()
    );

  validateGameId(gameId);

  const sourceName =
    normalizeInternetValue_(
      payload.name || "Internet Results"
    );

  const sourceId =
    normalizeInternetId_(
      payload.sourceId || sourceName
    );

  const sourceType =
    normalizeInternetValue_(
      payload.sourceType || "webpage"
    ).toLowerCase();

  const parserType =
    normalizeInternetValue_(
      payload.parserType || sourceType || "webpage-text"
    );

  const url =
    normalizeInternetValue_(
      payload.url || ""
    );

  const manualText =
    normalizeInternetValue_(
      payload.manualText || ""
    );

  const importId =
    sourceId +
    "-" +
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "yyyyMMdd-HHmmss"
    );

  upsertInternetSource_({
    sourceId:
      sourceId,

    gameId:
      gameId,

    name:
      sourceName,

    sourceType:
      sourceType,

    url:
      url,

    parserType:
      parserType,

    matchMode:
      payload.matchMode || "nominee-name",

    active:
      true,

    autoApply:
      false,

    trustLevel:
      payload.trustLevel || "medium",

    notes:
      payload.notes || ""
  });

  try {

    let result = {
      httpCode:
        "",

      contentLength:
        0,

      rawText:
        "",

      rawJson:
        ""
    };

    if (
      sourceType === "manual" ||
      parserType === "manual-text"
    ) {

      if (!manualText) {

        throw new Error(
          "Manual text is required for manual imports."
        );

      }

      result = {
        httpCode:
          "manual",

        contentLength:
          manualText.length,

        rawText:
          manualText,

        rawJson:
          ""
      };

    } else {

      result =
        fetchInternetUrl_(
          url,
          sourceType
        );

    }

    const okStatus =
      (
        result.httpCode === "manual" ||
        (
          Number(result.httpCode) >= 200 &&
          Number(result.httpCode) < 400
        )
      )
        ? "success"
        : "http_error";

    appendInternetImport_({
      importId:
        importId,

      gameId:
        gameId,

      sourceId:
        sourceId,

      sourceName:
        sourceName,

      sourceType:
        sourceType,

      parserType:
        parserType,

      url:
        url,

      status:
        okStatus,

      httpCode:
        result.httpCode,

      contentLength:
        result.contentLength,

      rawPayload:
        result.rawJson || result.rawText,

      rawTextPreview:
        result.rawText,

      rawJsonPreview:
        result.rawJson,

      error:
        okStatus === "success"
          ? ""
          : "HTTP status " + result.httpCode
    });

    updateInternetSourcePullStatus_(
      gameId,
      sourceId,
      okStatus
    );

    return {
      success:
        okStatus === "success",

      message:
        okStatus === "success"
          ? "Internet results imported"
          : "Internet source returned HTTP status " + result.httpCode,

      importId:
        importId,

      gameId:
        gameId,

      sourceId:
        sourceId,

      sourceName:
        sourceName,

      sourceType:
        sourceType,

      parserType:
        parserType,

      url:
        url,

      httpCode:
        result.httpCode,

      contentLength:
        result.contentLength,

      rawTextPreview:
        internetPreview_(
          result.rawText,
          2500
        ),

      rawJsonPreview:
        internetPreview_(
          result.rawJson,
          2500
        )
    };

  } catch (err) {

    const errorMessage =
      err && err.message
        ? err.message
        : String(err);

    appendInternetImport_({
      importId:
        importId,

      gameId:
        gameId,

      sourceId:
        sourceId,

      sourceName:
        sourceName,

      sourceType:
        sourceType,

      parserType:
        parserType,

      url:
        url,

      status:
        "error",

      httpCode:
        "",

      contentLength:
        0,

      rawTextPreview:
        "",

      rawJsonPreview:
        "",

      error:
        errorMessage
    });

    updateInternetSourcePullStatus_(
      gameId,
      sourceId,
      "error"
    );

    return {
      success:
        false,

      message:
        errorMessage,

      error:
        errorMessage,

      importId:
        importId,

      gameId:
        gameId,

      sourceId:
        sourceId
    };

  }

}

function apiAdminPullInternetResults(payload) {

  requireAdmin_(payload);

  return pullInternetResults(payload);

}

/* =====================================================
   LAST IMPORT
===================================================== */

function getLastInternetImport(gameId) {

  gameId =
    normalizeInternetValue_(
      gameId || getDefaultGameId()
    );

  validateGameId(gameId);

  setupInternetResultsSystem();

  const sheet =
    ensureInternetImportsSheet_();

  const data =
    sheet.getDataRange()
      .getValues();

  if (data.length <= 1) {

    return {
      success: true,
      gameId: gameId,
      import: null
    };

  }

  const headers =
    data[0].map(header =>
      normalizeInternetValue_(header)
    );

  const col =
    getInternetImportsColumnMap_(
      headers
    );

  const rows =
    data
      .slice(1)
      .filter(row =>
        normalizeInternetValue_(
          row[col.gameId]
        ) === gameId
      );

  if (!rows.length) {

    return {
      success: true,
      gameId: gameId,
      import: null
    };

  }

  const row =
    rows[rows.length - 1];

  return {
    success:
      true,

    gameId:
      gameId,

    import:
      {
        timestamp:
          row[col.timestamp],

        importId:
          row[col.importId],

        sourceId:
          row[col.sourceId],

        sourceName:
          row[col.sourceName],

        sourceType:
          row[col.sourceType],

        parserType:
          row[col.parserType],

        url:
          row[col.url],

        status:
          row[col.status],

        httpCode:
          row[col.httpCode],

        contentLength:
          row[col.contentLength],

        rawTextPreview:
          row[col.rawTextPreview],

        rawJsonPreview:
          row[col.rawJsonPreview],

        error:
          row[col.error]
      }
  };

}

function apiAdminGetLastInternetImport(payload) {

  requireAdmin_(payload);

  payload =
    payload || {};

  return getLastInternetImport(
    payload.gameId || getDefaultGameId()
  );

}

/* =====================================================
   RESULT SUGGESTIONS
   Phase 2: match raw import text to categories/nominees
===================================================== */

function ensureResultSuggestionsSheet_() {

  return ensureInternetSheet_(
    RESULT_SUGGESTIONS_SHEET,
    RESULT_SUGGESTIONS_HEADERS
  );

}

function getResultSuggestionsColumnMap_(headers) {

  return {
    timestamp:
      headers.indexOf("Timestamp"),

    suggestionId:
      headers.indexOf("SuggestionId"),

    gameId:
      headers.indexOf("GameId"),

    sourceId:
      headers.indexOf("SourceId"),

    importId:
      headers.indexOf("ImportId"),

    categoryId:
      headers.indexOf("CategoryId"),

    categoryName:
      headers.indexOf("CategoryName"),

    suggestedNomineeId:
      headers.indexOf("SuggestedNomineeId"),

    suggestedNomineeName:
      headers.indexOf("SuggestedNomineeName"),

    confidence:
      headers.indexOf("Confidence"),

    matchedText:
      headers.indexOf("MatchedText"),

    status:
      headers.indexOf("Status"),

    appliedAt:
      headers.indexOf("AppliedAt"),

    appliedBy:
      headers.indexOf("AppliedBy"),

    notes:
      headers.indexOf("Notes")
  };

}

function normalizeSuggestionText_(value) {

  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

}

function splitImportTextIntoLines_(value) {

  return String(value || "")
    .split(/\r?\n/)
    .map(line =>
      line.trim()
    )
    .filter(Boolean);

}

function getLastInternetImportRow_(gameId) {

  gameId =
    normalizeInternetValue_(
      gameId || getDefaultGameId()
    );

  const sheet =
    ensureInternetImportsSheet_();

  const data =
    sheet.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return null;
  }

  const headers =
    data[0].map(header =>
      normalizeInternetValue_(header)
    );

  const col =
    getInternetImportsColumnMap_(
      headers
    );

  const rows =
    data
      .slice(1)
      .filter(row =>
        normalizeInternetValue_(
          row[col.gameId]
        ) === gameId
      );

  if (!rows.length) {
    return null;
  }

  const row =
    rows[rows.length - 1];

  return {
    timestamp:
      row[col.timestamp],

    importId:
      row[col.importId],

    gameId:
      row[col.gameId],

    sourceId:
      row[col.sourceId],

    sourceName:
      row[col.sourceName],

    sourceType:
      row[col.sourceType],

    parserType:
      row[col.parserType],

    url:
      row[col.url],

    status:
      row[col.status],

    httpCode:
      row[col.httpCode],

    contentLength:
      row[col.contentLength],

    rawPayload:
      col.rawPayload > -1
        ? row[col.rawPayload]
        : "",

    rawTextPreview:
      row[col.rawTextPreview],

    rawJsonPreview:
      row[col.rawJsonPreview],

    error:
      row[col.error]
  };

}

function getCategorySuggestionData_(gameId) {

  const categories =
    getCategories(gameId);

  return categories.map(category => {

    const categoryId =
      normalizeInternetId_(
        category.categoryId ||
        category.id
      );

    const categoryName =
      normalizeInternetValue_(
        category.category ||
        category.name ||
        categoryId
      );

    const nominees =
      Array.isArray(category.nominees)
        ? category.nominees
        : [];

    return {
      categoryId:
        categoryId,

      categoryName:
        categoryName,

      categorySearch:
        normalizeSuggestionText_(
          categoryName + " " + categoryId
        ),

      nominees:
        nominees
          .filter(nominee =>
            nominee.active !== false
          )
          .map(nominee => {

            const nomineeId =
              normalizeInternetId_(
                nominee.nomineeId ||
                nominee.id
              );

            const nomineeName =
              normalizeInternetValue_(
                nominee.nominee ||
                nominee.name ||
                nominee.shortAnswer ||
                nomineeId
              );

            const shortAnswer =
              normalizeInternetValue_(
                nominee.shortAnswer || ""
              );

            return {
              nomineeId:
                nomineeId,

              nomineeName:
                nomineeName,

              nomineeSearch:
                normalizeSuggestionText_(
                  nomineeName +
                  " " +
                  nomineeId +
                  " " +
                  shortAnswer
                )
            };

          })
    };

  });

}

function scoreSuggestionMatch_(
  category,
  nominee,
  rawText,
  lines
) {

  const normalizedText =
    normalizeSuggestionText_(
      rawText
    );

  const categoryTokens =
    category.categorySearch;

  const nomineeTokens =
    nominee.nomineeSearch;

  let best = {
    confidence:
      0,

    matchedText:
      ""
  };

  lines.forEach(line => {

    const normalizedLine =
      normalizeSuggestionText_(
        line
      );

    const hasCategory =
      normalizedLine.indexOf(
        categoryTokens
      ) !== -1 ||
      categoryTokens.indexOf(
        normalizedLine
      ) !== -1 ||
      normalizedLine.indexOf(
        normalizeSuggestionText_(
          category.categoryName
        )
      ) !== -1 ||
      normalizedLine.indexOf(
        category.categoryId
      ) !== -1;

    const hasNominee =
      normalizedLine.indexOf(
        nomineeTokens
      ) !== -1 ||
      nomineeTokens.indexOf(
        normalizedLine
      ) !== -1 ||
      normalizedLine.indexOf(
        normalizeSuggestionText_(
          nominee.nomineeName
        )
      ) !== -1 ||
      normalizedLine.indexOf(
        nominee.nomineeId
      ) !== -1;

    let confidence = 0;

    if (
      hasCategory &&
      hasNominee
    ) {

      confidence = 95;

    } else if (
      hasNominee &&
      normalizedText.indexOf(
        normalizeSuggestionText_(
          category.categoryName
        )
      ) !== -1
    ) {

      confidence = 75;

    } else if (hasNominee) {

      confidence = 55;

    }

    if (confidence > best.confidence) {

      best = {
        confidence:
          confidence,

        matchedText:
          line
      };

    }

  });

  return best;

}

function clearPendingSuggestionsForImport_(
  gameId,
  importId
) {

  const sheet =
    ensureResultSuggestionsSheet_();

  const data =
    sheet.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return;
  }

  const headers =
    data[0].map(header =>
      normalizeInternetValue_(header)
    );

  const col =
    getResultSuggestionsColumnMap_(
      headers
    );

  for (let i = data.length - 1; i >= 1; i--) {

    const row =
      data[i];

    const rowGameId =
      normalizeInternetValue_(
        row[col.gameId]
      );

    const rowImportId =
      normalizeInternetValue_(
        row[col.importId]
      );

    const rowStatus =
      normalizeInternetValue_(
        row[col.status]
      ).toLowerCase();

    if (
      rowGameId === gameId &&
      rowImportId === importId &&
      rowStatus === "pending"
    ) {

      sheet.deleteRow(i + 1);

    }

  }

}

function appendResultSuggestion_(payload) {

  const sheet =
    ensureResultSuggestionsSheet_();

  const headers =
    sheet.getRange(
      1,
      1,
      1,
      sheet.getLastColumn()
    )
    .getValues()[0]
    .map(header =>
      normalizeInternetValue_(header)
    );

  const col =
    getResultSuggestionsColumnMap_(
      headers
    );

  const row =
    new Array(headers.length)
      .fill("");

  row[col.timestamp] =
    new Date();

  row[col.suggestionId] =
    payload.suggestionId || "";

  row[col.gameId] =
    payload.gameId || "";

  row[col.sourceId] =
    payload.sourceId || "";

  row[col.importId] =
    payload.importId || "";

  row[col.categoryId] =
    payload.categoryId || "";

  row[col.categoryName] =
    payload.categoryName || "";

  row[col.suggestedNomineeId] =
    payload.suggestedNomineeId || "";

  row[col.suggestedNomineeName] =
    payload.suggestedNomineeName || "";

  row[col.confidence] =
    payload.confidence || 0;

  row[col.matchedText] =
    payload.matchedText || "";

  row[col.status] =
    payload.status || "pending";

  row[col.appliedAt] =
    payload.appliedAt || "";

  row[col.appliedBy] =
    payload.appliedBy || "";

  row[col.notes] =
    payload.notes || "";

  sheet.appendRow(row);

}

function generateResultSuggestions(gameId) {

  gameId =
    normalizeInternetValue_(
      gameId || getDefaultGameId()
    );

  validateGameId(gameId);

  setupInternetResultsSystem();

  const lastImport =
    getLastInternetImportRow_(
      gameId
    );

  if (!lastImport) {

    return {
      success: false,
      message: "No internet import found for this game.",
      suggestions: []
    };

  }

  const rawText =
    normalizeInternetValue_(
      lastImport.rawTextPreview ||
      lastImport.rawJsonPreview
    );

  if (!rawText) {

    return {
      success: false,
      message: "Last import has no readable text preview.",
      importId: lastImport.importId,
      suggestions: []
    };

  }

  const lines =
    splitImportTextIntoLines_(
      rawText
    );

  const categories =
    getCategorySuggestionData_(
      gameId
    );

  clearPendingSuggestionsForImport_(
    gameId,
    lastImport.importId
  );

  const suggestions = [];

  categories.forEach(category => {

    let bestSuggestion = null;

    category.nominees.forEach(nominee => {

      const score =
        scoreSuggestionMatch_(
          category,
          nominee,
          rawText,
          lines
        );

      if (
        score.confidence >= 55 &&
        (
          !bestSuggestion ||
          score.confidence >
            bestSuggestion.confidence
        )
      ) {

        bestSuggestion = {
          gameId:
            gameId,

          sourceId:
            lastImport.sourceId,

          importId:
            lastImport.importId,

          categoryId:
            category.categoryId,

          categoryName:
            category.categoryName,

          suggestedNomineeId:
            nominee.nomineeId,

          suggestedNomineeName:
            nominee.nomineeName,

          confidence:
            score.confidence,

          matchedText:
            score.matchedText,

          status:
            "pending",

          notes:
            "Generated from internet import"
        };

      }

    });

    if (bestSuggestion) {

      bestSuggestion.suggestionId =
        [
          gameId,
          lastImport.importId,
          bestSuggestion.categoryId,
          bestSuggestion.suggestedNomineeId
        ]
          .map(normalizeInternetId_)
          .join("__");

      appendResultSuggestion_(
        bestSuggestion
      );

      suggestions.push(
        bestSuggestion
      );

    }

  });

  return {
    success: true,
    message:
      "Result suggestions generated",
    gameId:
      gameId,
    importId:
      lastImport.importId,
    sourceId:
      lastImport.sourceId,
    count:
      suggestions.length,
    suggestions:
      suggestions
  };

}

function apiAdminGenerateResultSuggestions(payload) {

  requireAdmin_(payload);

  payload =
    payload || {};

  return generateResultSuggestions(
    payload.gameId || getDefaultGameId()
  );

}

function getResultSuggestions(gameId) {

  gameId =
    normalizeInternetValue_(
      gameId || getDefaultGameId()
    );

  validateGameId(gameId);

  setupInternetResultsSystem();

  const sheet =
    ensureResultSuggestionsSheet_();

  const data =
    sheet.getDataRange()
      .getValues();

  if (data.length <= 1) {

    return {
      success: true,
      gameId: gameId,
      suggestions: []
    };

  }

  const headers =
    data[0].map(header =>
      normalizeInternetValue_(header)
    );

  const col =
    getResultSuggestionsColumnMap_(
      headers
    );

  const suggestions =
    data
      .slice(1)
      .filter(row =>
        normalizeInternetValue_(
          row[col.gameId]
        ) === gameId
      )
      .map(row => ({
        timestamp:
          row[col.timestamp],

        suggestionId:
          row[col.suggestionId],

        sourceId:
          row[col.sourceId],

        importId:
          row[col.importId],

        categoryId:
          row[col.categoryId],

        categoryName:
          row[col.categoryName],

        suggestedNomineeId:
          row[col.suggestedNomineeId],

        suggestedNomineeName:
          row[col.suggestedNomineeName],

        confidence:
          Number(row[col.confidence]) || 0,

        matchedText:
          row[col.matchedText],

        status:
          row[col.status],

        appliedAt:
          row[col.appliedAt],

        appliedBy:
          row[col.appliedBy],

        notes:
          row[col.notes]
      }))
      .reverse();

  return {
    success: true,
    gameId: gameId,
    suggestions: suggestions
  };

}

function apiAdminGetResultSuggestions(payload) {

  requireAdmin_(payload);

  payload =
    payload || {};

  return getResultSuggestions(
    payload.gameId || getDefaultGameId()
  );

}

function updateResultSuggestionStatus_(
  gameId,
  suggestionId,
  status,
  username,
  notes
) {

  const sheet =
    ensureResultSuggestionsSheet_();

  const data =
    sheet.getDataRange()
      .getValues();

  if (data.length <= 1) {

    throw new Error(
      "No result suggestions found."
    );

  }

  const headers =
    data[0].map(header =>
      normalizeInternetValue_(header)
    );

  const col =
    getResultSuggestionsColumnMap_(
      headers
    );

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    if (
      normalizeInternetValue_(
        row[col.gameId]
      ) === gameId &&
      normalizeInternetValue_(
        row[col.suggestionId]
      ) === suggestionId
    ) {

      if (col.status > -1) {
        sheet.getRange(
          i + 1,
          col.status + 1
        ).setValue(status);
      }

      if (
        status === "applied" &&
        col.appliedAt > -1
      ) {

        sheet.getRange(
          i + 1,
          col.appliedAt + 1
        ).setValue(new Date());

      }

      if (col.appliedBy > -1) {

        sheet.getRange(
          i + 1,
          col.appliedBy + 1
        ).setValue(username || "");

      }

      if (col.notes > -1) {

        sheet.getRange(
          i + 1,
          col.notes + 1
        ).setValue(notes || "");

      }

      return {
        suggestionId:
          suggestionId,

        gameId:
          gameId,

        categoryId:
          row[col.categoryId],

        suggestedNomineeId:
          row[col.suggestedNomineeId],

        status:
          status
      };

    }

  }

  throw new Error(
    "Suggestion not found: " + suggestionId
  );

}

function findResultSuggestion_(
  gameId,
  suggestionId
) {

  const all =
    getResultSuggestions(gameId)
      .suggestions;

  const found =
    all.find(item =>
      String(item.suggestionId || "") ===
      String(suggestionId || "")
    );

  if (!found) {

    throw new Error(
      "Suggestion not found: " + suggestionId
    );

  }

  return found;

}

function apiAdminApplyResultSuggestion(payload) {

  requireAdmin_(payload);

  payload =
    payload || {};

  const gameId =
    normalizeInternetValue_(
      payload.gameId || getDefaultGameId()
    );

  validateGameId(gameId);

  const suggestionId =
    normalizeInternetValue_(
      payload.suggestionId
    );

  if (!suggestionId) {
    throw new Error("Missing suggestionId");
  }

  const suggestion =
    findResultSuggestion_(
      gameId,
      suggestionId
    );

  if (
    normalizeInternetValue_(
      suggestion.status
    ).toLowerCase() === "applied"
  ) {

    return {
      success: true,
      noChange: true,
      message: "Suggestion already applied.",
      suggestion: suggestion
    };

  }

  const updateRes =
    adminUpdateCategory({
      username:
        payload.username,

      token:
        payload.token,

      gameId:
        gameId,

      categoryId:
        suggestion.categoryId,

      winnerNomineeId:
        suggestion.suggestedNomineeId,

      notes:
        "Applied internet suggestion: " +
        suggestion.suggestedNomineeName
    });

  if (
    !updateRes ||
    updateRes.success === false
  ) {

    throw new Error(
      updateRes && (updateRes.message || updateRes.error)
        ? updateRes.message || updateRes.error
        : "Could not apply suggestion."
    );

  }

  updateResultSuggestionStatus_(
    gameId,
    suggestionId,
    "applied",
    payload.username || "",
    "Applied winner suggestion"
  );

  if (
    typeof runScoringAutomation === "function"
  ) {

    runScoringAutomation({
      gameId:
        gameId,
      source:
        "internet-suggestion",
      updatedBy:
        payload.username || ""
    });

  }

  return {
    success: true,
    message: "Suggestion applied and scoring updated.",
    gameId: gameId,
    suggestionId: suggestionId,
    categoryId: suggestion.categoryId,
    winnerNomineeId: suggestion.suggestedNomineeId,
    winnerName: suggestion.suggestedNomineeName
  };

}

function apiAdminRejectResultSuggestion(payload) {

  requireAdmin_(payload);

  payload =
    payload || {};

  const gameId =
    normalizeInternetValue_(
      payload.gameId || getDefaultGameId()
    );

  const suggestionId =
    normalizeInternetValue_(
      payload.suggestionId
    );

  if (!suggestionId) {
    throw new Error("Missing suggestionId");
  }

  updateResultSuggestionStatus_(
    gameId,
    suggestionId,
    "rejected",
    payload.username || "",
    payload.notes || "Rejected by admin"
  );

  return {
    success: true,
    message: "Suggestion rejected.",
    gameId: gameId,
    suggestionId: suggestionId
  };

}

/* =====================================================
   BULK APPLY HIGH-CONFIDENCE SUGGESTIONS
===================================================== */

function apiAdminApplyHighConfidenceSuggestions(payload) {

  requireAdmin_(payload);

  payload =
    payload || {};

  const gameId =
    normalizeInternetValue_(
      payload.gameId || getDefaultGameId()
    );

  validateGameId(gameId);

  const minConfidence =
    Number(payload.minConfidence || 90);

  const latestOnly =
    payload.latestOnly === undefined
      ? true
      : payload.latestOnly === true ||
        String(payload.latestOnly).toLowerCase() === "true";

  const lastImport =
    latestOnly
      ? getLastInternetImportRow_(gameId)
      : null;

  const suggestions =
    getResultSuggestions(gameId)
      .suggestions
      .filter(item => {

        const status =
          normalizeInternetValue_(
            item.status
          ).toLowerCase();

        const confidence =
          Number(item.confidence) || 0;

        if (status !== "pending") {
          return false;
        }

        if (confidence < minConfidence) {
          return false;
        }

        if (
          latestOnly &&
          lastImport &&
          normalizeInternetValue_(item.importId) !==
          normalizeInternetValue_(lastImport.importId)
        ) {
          return false;
        }

        return true;

      });

  const bestByCategory = {};

  suggestions.forEach(item => {

    const categoryId =
      normalizeInternetId_(
        item.categoryId
      );

    if (
      !bestByCategory[categoryId] ||
      Number(item.confidence || 0) >
      Number(bestByCategory[categoryId].confidence || 0)
    ) {

      bestByCategory[categoryId] =
        item;

    }

  });

  const selected =
    Object.keys(bestByCategory)
      .map(key =>
        bestByCategory[key]
      );

  const applied = [];
  const failed = [];

  selected.forEach(item => {

    try {

      const updateRes =
        adminUpdateCategory({
          username:
            payload.username,

          token:
            payload.token,

          gameId:
            gameId,

          categoryId:
            item.categoryId,

          winnerNomineeId:
            item.suggestedNomineeId,

          notes:
            "Bulk applied internet suggestion: " +
            item.suggestedNomineeName
        });

      if (
        !updateRes ||
        updateRes.success === false
      ) {

        throw new Error(
          updateRes && (updateRes.message || updateRes.error)
            ? updateRes.message || updateRes.error
            : "Could not apply suggestion."
        );

      }

      updateResultSuggestionStatus_(
        gameId,
        item.suggestionId,
        "applied",
        payload.username || "",
        "Bulk applied high-confidence suggestion"
      );

      applied.push({
        suggestionId:
          item.suggestionId,

        categoryId:
          item.categoryId,

        categoryName:
          item.categoryName,

        winnerNomineeId:
          item.suggestedNomineeId,

        winnerName:
          item.suggestedNomineeName,

        confidence:
          item.confidence
      });

    } catch (err) {

      failed.push({
        suggestionId:
          item.suggestionId,

        categoryId:
          item.categoryId,

        categoryName:
          item.categoryName,

        winnerNomineeId:
          item.suggestedNomineeId,

        winnerName:
          item.suggestedNomineeName,

        confidence:
          item.confidence,

        error:
          err && err.message
            ? err.message
            : String(err)
      });

    }

  });

  if (
    applied.length &&
    typeof runScoringAutomation === "function"
  ) {

    runScoringAutomation({
      gameId:
        gameId,

      source:
        "bulk-internet-suggestions",

      updatedBy:
        payload.username || ""
    });

  }

  return {
    success:
      failed.length === 0,

    message:
      applied.length
        ? "High-confidence suggestions applied."
        : "No pending suggestions met the confidence threshold.",

    gameId:
      gameId,

    minConfidence:
      minConfidence,

    latestOnly:
      latestOnly,

    appliedCount:
      applied.length,

    failedCount:
      failed.length,

    applied:
      applied,

    failed:
      failed
  };

}

/* =====================================================
   SAVED INTERNET SOURCES
===================================================== */

function getInternetSources(gameId) {

  gameId =
    normalizeInternetValue_(
      gameId || getDefaultGameId()
    );

  validateGameId(gameId);

  setupInternetResultsSystem();

  const sheet =
    ensureInternetSourcesSheet_();

  const data =
    sheet.getDataRange()
      .getValues();

  if (data.length <= 1) {

    return {
      success: true,
      gameId: gameId,
      sources: []
    };

  }

  const headers =
    data[0].map(header =>
      normalizeInternetValue_(header)
    );

  const col =
    getInternetSourcesColumnMap_(
      headers
    );

  const sources =
    data
      .slice(1)
      .filter(row =>
        normalizeInternetValue_(
          row[col.gameId]
        ) === gameId
      )
      .map(row => ({
        sourceId:
          row[col.sourceId],

        gameId:
          row[col.gameId],

        name:
          row[col.name],

        sourceType:
          row[col.sourceType],

        url:
          row[col.url],

        parserType:
          row[col.parserType],

        matchMode:
          row[col.matchMode],

        active:
          row[col.active] === true ||
          String(row[col.active]).toLowerCase() === "true",

        autoApply:
          row[col.autoApply] === true ||
          String(row[col.autoApply]).toLowerCase() === "true",

        trustLevel:
          row[col.trustLevel],

        notes:
          row[col.notes],

        lastPulledAt:
          row[col.lastPulledAt],

        lastStatus:
          row[col.lastStatus]
      }))
      .filter(source =>
        source.active !== false
      );

  return {
    success: true,
    gameId: gameId,
    sources: sources
  };

}

function apiAdminGetInternetSources(payload) {

  requireAdmin_(payload);

  payload =
    payload || {};

  return getInternetSources(
    payload.gameId || getDefaultGameId()
  );

}

function apiAdminSaveInternetSource(payload) {

  requireAdmin_(payload);

  payload =
    payload || {};

  const gameId =
    normalizeInternetValue_(
      payload.gameId || getDefaultGameId()
    );

  validateGameId(gameId);

  const name =
    normalizeInternetValue_(
      payload.name || payload.sourceId || "Internet Source"
    );

  const sourceId =
    normalizeInternetId_(
      payload.sourceId || name
    );

  if (!sourceId) {
    throw new Error("Source ID required");
  }

  const sourceType =
    normalizeInternetValue_(
      payload.sourceType || "webpage"
    );

  const parserType =
    normalizeInternetValue_(
      payload.parserType || "webpage-text"
    );

  const url =
    normalizeInternetValue_(
      payload.url || ""
    );

  if (
    sourceType !== "manual" &&
    !url
  ) {

    throw new Error(
      "URL is required unless Source Type is manual."
    );

  }

  const saved =
    upsertInternetSource_({
      sourceId:
        sourceId,

      gameId:
        gameId,

      name:
        name,

      sourceType:
        sourceType,

      url:
        url,

      parserType:
        parserType,

      matchMode:
        payload.matchMode || "nominee-name",

      active:
        payload.active === undefined
          ? true
          : payload.active,

      autoApply:
        false,

      trustLevel:
        payload.trustLevel || "medium",

      notes:
        payload.notes || ""
    });

  return {
    success: true,
    message: "Internet source saved",
    gameId: gameId,
    sourceId: saved.sourceId
  };

}