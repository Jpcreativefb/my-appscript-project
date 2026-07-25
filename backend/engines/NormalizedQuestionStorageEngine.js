/* =====================================================
   NORMALIZED QUESTION STORAGE / PERFORMANCE FOUNDATION

   Canonical admin storage:
   - Questions: one row per question.
   - QuestionOptions: one row per answer/nominee.

   Compatibility:
   - Categories remains an active projection for legacy engines.
   - New questions no longer need a blank Categories anchor row.
   - Player/admin reads prefer normalized storage and fall back safely.

   Performance:
   - Game-scoped reads use the GameId column + TextFinder instead of
     reading an entire large sheet.
   - DataIndex stores row locations and content fingerprints.
===================================================== */

const QUESTIONS_SHEET = "Questions";
const QUESTION_OPTIONS_SHEET = "QuestionOptions";
const DATA_INDEX_SHEET = "DataIndex";
const ARCHIVE_MANIFEST_SHEET = "ArchiveManifest";
const STORAGE_MIGRATION_LOG_SHEET = "StorageMigrationLog";
const NORMALIZED_STORAGE_VERSION = 2;

const QUESTIONS_HEADERS = [
  "GameId",
  "QuestionId",
  "Question",
  "Section",
  "CategoryImage",
  "Active",
  "PredictionGame",
  "CommunityRank",
  "QuestionType",
  "ScoringEngine",
  "SelectionMode",
  "EntryType",
  "OddsMode",
  "ResultSource",
  "RoundNumber",
  "SportsProvider",
  "SportsLeague",
  "SportsGameId",
  "ESPNEventId",
  "HomeTeam",
  "AwayTeam",
  "HomeRecord",
  "AwayRecord",
  "HomeScore",
  "AwayScore",
  "SportsStatus",
  "SportsClock",
  "SportsPeriod",
  "SportsState",
  "SportsMarket",
  "SportsSelection",
  "SportsLine",
  "BettingOdds",
  "OddsSource",
  "OddsLastUpdated",
  "PayloadJSON",
  "SourceSystem",
  "CreatedAt",
  "UpdatedAt",
  "StorageVersion"
];

const QUESTION_OPTIONS_HEADERS = [
  "GameId",
  "QuestionId",
  "OptionId",
  "Option",
  "ShortAnswer",
  "FileID",
  "LogoUrl",
  "MovieId",
  "Movie",
  "Person",
  "Active",
  "DisplayOrder",
  "PayloadJSON",
  "SourceSystem",
  "CreatedAt",
  "UpdatedAt",
  "StorageVersion"
];

const DATA_INDEX_HEADERS = [
  "EntityType",
  "GameId",
  "SheetName",
  "FirstRow",
  "LastRow",
  "RowCount",
  "RowNumbersJSON",
  "ContentHash",
  "DataVersion",
  "UpdatedAt"
];

const ARCHIVE_MANIFEST_HEADERS = [
  "ArchiveId",
  "GameId",
  "GameName",
  "Year",
  "ArchiveSpreadsheetId",
  "ArchiveSpreadsheetUrl",
  "Status",
  "Mode",
  "EntityCountsJSON",
  "SourceSpreadsheetId",
  "ArchivedAt",
  "VerifiedAt",
  "VerificationErrorsJSON",
  "ReadinessJSON",
  "Notes"
];

const STORAGE_MIGRATION_LOG_HEADERS = [
  "Timestamp",
  "Action",
  "GameId",
  "Questions",
  "Options",
  "LegacyRows",
  "Status",
  "Message"
];

var NORMALIZED_STORAGE_RUNTIME_CACHE =
  NORMALIZED_STORAGE_RUNTIME_CACHE || {};

function normalizedStorageString_(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function normalizedStorageKey_(value) {
  return normalizedStorageString_(value).toLowerCase();
}

function normalizedStorageBool_(value, defaultValue) {
  if (value === undefined || value === null || value === "") {
    return defaultValue === true;
  }

  const text = normalizedStorageKey_(value);

  return (
    value === true ||
    text === "true" ||
    text === "yes" ||
    text === "1"
  );
}

function normalizedStorageSafeJsonParse_(value, fallback) {
  if (value && typeof value === "object") {
    return value;
  }

  const text = normalizedStorageString_(value);

  if (!text) {
    return fallback;
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    return fallback;
  }
}

function normalizedStorageHash_(value) {
  const text = typeof value === "string"
    ? value
    : JSON.stringify(value || "");

  let hash = 2166136261;

  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return (hash >>> 0).toString(16);
}

function normalizedStorageHeaderMap_(headers) {
  const map = {};

  (headers || []).forEach(function(header, index) {
    const key = normalizedStorageString_(header);
    if (key && map[key] === undefined) {
      map[key] = index;
    }
  });

  return map;
}

function normalizedStorageEnsureSheet_(sheetName, headers) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(sheetName);

  if (!sh) {
    sh = ss.insertSheet(sheetName);
  }

  const lastColumn = Math.max(sh.getLastColumn(), 1);
  let existing = sh.getLastRow() >= 1
    ? sh.getRange(1, 1, 1, lastColumn).getValues()[0]
      .map(normalizedStorageString_)
    : [];

  const hasContent = existing.some(function(value) {
    return value !== "";
  });

  if (!hasContent) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    existing = headers.slice();
  }

  const missing = headers.filter(function(header) {
    return existing.indexOf(header) === -1;
  });

  if (missing.length) {
    sh.getRange(1, existing.length + 1, 1, missing.length)
      .setValues([missing]);
  }

  return sh;
}

function normalizedStorageEnsureExistingSheetColumns_(sheetName, headers) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(sheetName);

  if (!sh) {
    return null;
  }

  const lastColumn = Math.max(sh.getLastColumn(), 1);
  let existing = sh.getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(normalizedStorageString_);

  const missing = (headers || []).filter(function(header) {
    return existing.indexOf(header) === -1;
  });

  if (missing.length) {
    sh.getRange(1, existing.length + 1, 1, missing.length)
      .setValues([missing]);
  }

  return sh;
}

function normalizedStorageBuildQuestionGameMap_() {
  const map = {};
  const ss = SpreadsheetApp.getActive();

  function addFromSheet(sheetName, questionHeader) {
    const sh = ss.getSheetByName(sheetName);

    if (!sh || sh.getLastRow() <= 1) {
      return;
    }

    const headers = normalizedStorageGetHeaders_(sh);
    const col = normalizedStorageHeaderMap_(headers);

    if (col.GameId === undefined || col[questionHeader] === undefined) {
      return;
    }

    const values = sh.getRange(
      2,
      1,
      sh.getLastRow() - 1,
      headers.length
    ).getValues();

    values.forEach(function(row) {
      const gameId = normalizedStorageString_(row[col.GameId]);
      const questionId = normalizedStorageKey_(row[col[questionHeader]]);

      if (!gameId || !questionId) {
        return;
      }

      if (!map[questionId]) {
        map[questionId] = {};
      }

      map[questionId][gameId] = true;
    });
  }

  addFromSheet(QUESTIONS_SHEET, "QuestionId");
  addFromSheet(CATEGORIES_SHEET, "CategoryId");

  return map;
}

function normalizedStorageBackfillCategorySettingsGameIds_() {
  const sh = normalizedStorageEnsureExistingSheetColumns_(
    CATEGORY_SETTINGS_SHEET,
    ["GameId"]
  );

  if (!sh || sh.getLastRow() <= 1) {
    return {
      success: true,
      filled: 0,
      ambiguous: 0,
      unresolved: 0,
      message: "No CategorySettings rows required backfill."
    };
  }

  const headers = normalizedStorageGetHeaders_(sh);
  const col = normalizedStorageHeaderMap_(headers);

  if (col.GameId === undefined || col.CategoryId === undefined) {
    return {
      success: false,
      filled: 0,
      ambiguous: 0,
      unresolved: 0,
      message: "CategorySettings requires GameId and CategoryId columns."
    };
  }

  const rowCount = sh.getLastRow() - 1;
  const categoryValues = sh.getRange(
    2,
    col.CategoryId + 1,
    rowCount,
    1
  ).getValues();
  const gameValues = sh.getRange(
    2,
    col.GameId + 1,
    rowCount,
    1
  ).getValues();
  const questionGameMap = normalizedStorageBuildQuestionGameMap_();

  let filled = 0;
  let ambiguous = 0;
  let unresolved = 0;

  for (let i = 0; i < rowCount; i++) {
    if (normalizedStorageString_(gameValues[i][0])) {
      continue;
    }

    const questionId = normalizedStorageKey_(categoryValues[i][0]);
    const gameMap = questionGameMap[questionId] || {};
    const gameIds = Object.keys(gameMap);

    if (gameIds.length === 1) {
      gameValues[i][0] = gameIds[0];
      filled += 1;
    } else if (gameIds.length > 1) {
      ambiguous += 1;
    } else {
      unresolved += 1;
    }
  }

  if (filled) {
    sh.getRange(2, col.GameId + 1, rowCount, 1)
      .setValues(gameValues);
  }

  return {
    success: ambiguous === 0 && unresolved === 0,
    partial: ambiguous > 0 || unresolved > 0,
    filled: filled,
    ambiguous: ambiguous,
    unresolved: unresolved,
    message: ambiguous || unresolved
      ? "CategorySettings GameId backfill completed with rows needing review."
      : "CategorySettings GameId backfill completed."
  };
}

function setupNormalizedQuestionStorage(payload) {
  payload = payload || {};

  const questions = normalizedStorageEnsureSheet_(
    QUESTIONS_SHEET,
    QUESTIONS_HEADERS
  );

  const options = normalizedStorageEnsureSheet_(
    QUESTION_OPTIONS_SHEET,
    QUESTION_OPTIONS_HEADERS
  );

  normalizedStorageEnsureSheet_(
    DATA_INDEX_SHEET,
    DATA_INDEX_HEADERS
  );

  normalizedStorageEnsureSheet_(
    ARCHIVE_MANIFEST_SHEET,
    ARCHIVE_MANIFEST_HEADERS
  );

  normalizedStorageEnsureSheet_(
    STORAGE_MIGRATION_LOG_SHEET,
    STORAGE_MIGRATION_LOG_HEADERS
  );

  const shouldMigrate =
    payload.migrateExisting !== false;

  let migration = {
    success: true,
    skipped: true,
    message: "Existing data migration skipped."
  };

  if (shouldMigrate) {
    migration = normalizedStorageMigrateAllLegacyCategories_({
      force: payload.force === true
    });
  }

  const categorySettingsBackfill =
    normalizedStorageBackfillCategorySettingsGameIds_();

  if (payload.rebuildIndexes !== false) {
    normalizedStorageRebuildIndexForSheet_(
      QUESTIONS_SHEET,
      "Questions"
    );

    normalizedStorageRebuildIndexForSheet_(
      QUESTION_OPTIONS_SHEET,
      "QuestionOptions"
    );

    normalizedStorageRebuildIndexForSheet_(
      CATEGORIES_SHEET,
      "LegacyCategories"
    );
  }

  normalizedStorageClearCaches_();

  return {
    success: migration.success !== false &&
      categorySettingsBackfill.success !== false,
    partial: migration.partial === true ||
      categorySettingsBackfill.partial === true,
    message: "Normalized question storage is ready.",
    questionsSheet: questions.getName(),
    optionsSheet: options.getName(),
    storageVersion: NORMALIZED_STORAGE_VERSION,
    migration: migration,
    categorySettingsBackfill: categorySettingsBackfill
  };
}

function apiAdminSetupNormalizedQuestionStorage(payload) {
  payload = payload || {};
  requireAdmin_(payload);
  return setupNormalizedQuestionStorage(payload);
}

function normalizedStorageGetHeaders_(sh) {
  const lastColumn = Math.max(sh.getLastColumn(), 1);

  return sh.getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(normalizedStorageString_);
}

function normalizedStorageReadDataIndex_() {
  const sh = normalizedStorageEnsureSheet_(
    DATA_INDEX_SHEET,
    DATA_INDEX_HEADERS
  );

  const data = sh.getDataRange().getValues();
  const headers = data[0].map(normalizedStorageString_);
  const col = normalizedStorageHeaderMap_(headers);
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    rows.push({
      rowNumber: i + 1,
      entityType: normalizedStorageString_(data[i][col.EntityType]),
      gameId: normalizedStorageString_(data[i][col.GameId]),
      sheetName: normalizedStorageString_(data[i][col.SheetName]),
      firstRow: Number(data[i][col.FirstRow] || 0),
      lastRow: Number(data[i][col.LastRow] || 0),
      rowCount: Number(data[i][col.RowCount] || 0),
      rowNumbers: normalizedStorageSafeJsonParse_(
        data[i][col.RowNumbersJSON],
        []
      ),
      contentHash: normalizedStorageString_(data[i][col.ContentHash]),
      dataVersion: Number(data[i][col.DataVersion] || 0),
      updatedAt: data[i][col.UpdatedAt] || ""
    });
  }

  return {
    sheet: sh,
    headers: headers,
    col: col,
    rows: rows
  };
}

function normalizedStorageGetIndexEntry_(entityType, gameId) {
  const cacheKey =
    "index:" + normalizedStorageKey_(entityType) + ":" + gameId;

  if (NORMALIZED_STORAGE_RUNTIME_CACHE[cacheKey]) {
    return NORMALIZED_STORAGE_RUNTIME_CACHE[cacheKey];
  }

  const index = normalizedStorageReadDataIndex_();
  const targetEntity = normalizedStorageKey_(entityType);
  const targetGame = normalizedStorageString_(gameId);

  const entry = index.rows.find(function(row) {
    return (
      normalizedStorageKey_(row.entityType) === targetEntity &&
      row.gameId === targetGame
    );
  }) || null;

  NORMALIZED_STORAGE_RUNTIME_CACHE[cacheKey] = entry;

  return entry;
}

function normalizedStorageUpsertIndexEntry_(payload) {
  payload = payload || {};

  const entityType = normalizedStorageString_(payload.entityType);
  const gameId = normalizedStorageString_(payload.gameId);

  if (!entityType || !gameId) {
    return false;
  }

  const index = normalizedStorageReadDataIndex_();
  const existing = index.rows.find(function(row) {
    return (
      normalizedStorageKey_(row.entityType) ===
        normalizedStorageKey_(entityType) &&
      row.gameId === gameId
    );
  });

  const rowNumbers = (payload.rowNumbers || [])
    .map(Number)
    .filter(function(rowNumber) {
      return rowNumber > 1;
    })
    .sort(function(a, b) {
      return a - b;
    });

  const values = new Array(index.headers.length).fill("");

  function set(header, value) {
    if (index.col[header] !== undefined) {
      values[index.col[header]] = value;
    }
  }

  set("EntityType", entityType);
  set("GameId", gameId);
  set("SheetName", payload.sheetName || "");
  set("FirstRow", rowNumbers.length ? rowNumbers[0] : 0);
  set("LastRow", rowNumbers.length ? rowNumbers[rowNumbers.length - 1] : 0);
  set("RowCount", rowNumbers.length);
  set("RowNumbersJSON", JSON.stringify(rowNumbers));
  set("ContentHash", payload.contentHash || "");
  set("DataVersion", Number(payload.dataVersion || NORMALIZED_STORAGE_VERSION));
  set("UpdatedAt", new Date());

  if (existing) {
    index.sheet.getRange(existing.rowNumber, 1, 1, values.length)
      .setValues([values]);
  } else {
    index.sheet.appendRow(values);
  }

  delete NORMALIZED_STORAGE_RUNTIME_CACHE[
    "index:" + normalizedStorageKey_(entityType) + ":" + gameId
  ];

  return true;
}

function normalizedStorageRebuildIndexForSheet_(sheetName, entityType) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(sheetName);

  if (!sh || sh.getLastRow() <= 1) {
    return {
      success: true,
      sheetName: sheetName,
      games: 0,
      rows: 0
    };
  }

  const headers = normalizedStorageGetHeaders_(sh);
  const col = normalizedStorageHeaderMap_(headers);
  const gameIdCol = col.GameId;

  if (gameIdCol === undefined) {
    return {
      success: false,
      sheetName: sheetName,
      error: "GameId header is missing"
    };
  }

  const gameValues = sh
    .getRange(2, gameIdCol + 1, sh.getLastRow() - 1, 1)
    .getValues();

  const grouped = {};

  gameValues.forEach(function(row, index) {
    const gameId = normalizedStorageString_(row[0]);
    if (!gameId) {
      return;
    }

    if (!grouped[gameId]) {
      grouped[gameId] = [];
    }

    grouped[gameId].push(index + 2);
  });

  const indexData = normalizedStorageReadDataIndex_();
  const staleIndexRows = indexData.rows
    .filter(function(row) {
      return (
        normalizedStorageKey_(row.entityType) === normalizedStorageKey_(entityType) &&
        normalizedStorageString_(row.sheetName) === normalizedStorageString_(sheetName) &&
        !grouped[row.gameId]
      );
    })
    .map(function(row) {
      return row.rowNumber;
    })
    .sort(function(a, b) {
      return b - a;
    });

  staleIndexRows.forEach(function(rowNumber) {
    indexData.sheet.deleteRow(rowNumber);
  });

  NORMALIZED_STORAGE_RUNTIME_CACHE = {};

  Object.keys(grouped).forEach(function(gameId) {
    normalizedStorageUpsertIndexEntry_({
      entityType: entityType,
      gameId: gameId,
      sheetName: sheetName,
      rowNumbers: grouped[gameId],
      dataVersion: NORMALIZED_STORAGE_VERSION
    });
  });

  return {
    success: true,
    sheetName: sheetName,
    games: Object.keys(grouped).length,
    rows: gameValues.length
  };
}

function normalizedStorageConsolidateRows_(rowNumbers) {
  const rows = (rowNumbers || [])
    .map(Number)
    .filter(function(value) {
      return value > 1;
    })
    .sort(function(a, b) {
      return a - b;
    });

  const ranges = [];

  rows.forEach(function(rowNumber) {
    const last = ranges.length
      ? ranges[ranges.length - 1]
      : null;

    if (last && rowNumber === last.end + 1) {
      last.end = rowNumber;
      return;
    }

    ranges.push({
      start: rowNumber,
      end: rowNumber
    });
  });

  return ranges;
}

function normalizedStorageFindRowsByGame_(sh, gameId) {
  const headers = normalizedStorageGetHeaders_(sh);
  const col = normalizedStorageHeaderMap_(headers);

  if (col.GameId === undefined || sh.getLastRow() <= 1) {
    return [];
  }

  const matches = sh
    .getRange(2, col.GameId + 1, sh.getLastRow() - 1, 1)
    .createTextFinder(normalizedStorageString_(gameId))
    .matchEntireCell(true)
    .findAll();

  return matches.map(function(range) {
    return range.getRow();
  }).sort(function(a, b) {
    return a - b;
  });
}

function normalizedStorageReadRowsByGame_(
  sheetName,
  gameId,
  entityType,
  options
) {
  options = options || {};

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(sheetName);

  if (!sh) {
    return [];
  }

  gameId = normalizedStorageString_(gameId);

  const headers = normalizedStorageGetHeaders_(sh);
  const headerMap = normalizedStorageHeaderMap_(headers);
  const gameIdCol = headerMap.GameId;
  const cacheKey =
    "rows:" + sheetName + ":" + gameId;

  if (
    options.bypassRuntimeCache !== true &&
    NORMALIZED_STORAGE_RUNTIME_CACHE[cacheKey]
  ) {
    return NORMALIZED_STORAGE_RUNTIME_CACHE[cacheKey];
  }

  function readRows(rowNumbers) {
    const output = [headers];
    const ranges = normalizedStorageConsolidateRows_(rowNumbers);

    ranges.forEach(function(range) {
      const values = sh.getRange(
        range.start,
        1,
        range.end - range.start + 1,
        headers.length
      ).getValues();

      values.forEach(function(row) {
        if (
          gameIdCol === undefined ||
          normalizedStorageString_(row[gameIdCol]) === gameId
        ) {
          output.push(row);
        }
      });
    });

    return output;
  }

  let rowNumbers = [];
  const index = options.trustIndex === false
    ? null
    : normalizedStorageGetIndexEntry_(entityType, gameId);

  if (index && Array.isArray(index.rowNumbers)) {
    rowNumbers = index.rowNumbers.slice();
  }

  let output = rowNumbers.length
    ? readRows(rowNumbers)
    : [headers];

  const indexWasStale =
    rowNumbers.length &&
    output.length - 1 !== rowNumbers.length;

  if (
    !rowNumbers.length ||
    options.trustIndex === false ||
    indexWasStale
  ) {
    rowNumbers = normalizedStorageFindRowsByGame_(sh, gameId);
    output = readRows(rowNumbers);

    const priorIndex = normalizedStorageGetIndexEntry_(entityType, gameId);

    normalizedStorageUpsertIndexEntry_({
      entityType: entityType,
      gameId: gameId,
      sheetName: sheetName,
      rowNumbers: rowNumbers,
      contentHash: priorIndex ? priorIndex.contentHash : "",
      dataVersion: NORMALIZED_STORAGE_VERSION
    });
  }

  NORMALIZED_STORAGE_RUNTIME_CACHE[cacheKey] = output;

  return output;
}

function normalizedStorageReadLegacyCategoriesByGame_(gameId, options) {
  return normalizedStorageReadRowsByGame_(
    CATEGORIES_SHEET,
    gameId,
    "LegacyCategories",
    Object.assign({
      trustIndex: false
    }, options || {})
  );
}

function normalizedStorageReadQuestionsByGame_(gameId, options) {
  normalizedStorageEnsureSheet_(QUESTIONS_SHEET, QUESTIONS_HEADERS);

  return normalizedStorageReadRowsByGame_(
    QUESTIONS_SHEET,
    gameId,
    "Questions",
    options || {}
  );
}

function normalizedStorageReadOptionsByGame_(gameId, options) {
  normalizedStorageEnsureSheet_(
    QUESTION_OPTIONS_SHEET,
    QUESTION_OPTIONS_HEADERS
  );

  return normalizedStorageReadRowsByGame_(
    QUESTION_OPTIONS_SHEET,
    gameId,
    "QuestionOptions",
    options || {}
  );
}

function normalizedStorageLegacyRowObject_(headers, row) {
  const obj = {};

  headers.forEach(function(header, index) {
    const key = normalizedStorageString_(header);
    if (key) {
      obj[key] = row[index];
    }
  });

  return obj;
}

function normalizedStorageStripOptionFields_(obj) {
  const copy = Object.assign({}, obj || {});

  [
    "Nominee",
    "NomineeId",
    "ShortAnswer",
    "FileID",
    "LogoUrl",
    "MovieId",
    "Movie",
    "Person"
  ].forEach(function(key) {
    delete copy[key];
  });

  return copy;
}

function normalizedStorageQuestionFromLegacy_(
  legacyObj,
  existingQuestion
) {
  const now = new Date();
  const existing = existingQuestion || {};
  const legacy = {
    GameId: normalizedStorageString_(legacyObj.GameId),
    QuestionId: normalizedStorageKey_(legacyObj.CategoryId),
    Question: normalizedStorageString_(legacyObj.Category),
    Section: normalizedStorageString_(legacyObj.Section || "Other"),
    CategoryImage: normalizedStorageString_(legacyObj.CategoryImage),
    Active: normalizedStorageBool_(legacyObj.Active, true),
    PredictionGame: normalizedStorageBool_(legacyObj.PredictionGame, true),
    CommunityRank: normalizedStorageBool_(legacyObj.CommunityRank, false),
    QuestionType: normalizedStorageString_(legacyObj.QuestionType),
    ScoringEngine: normalizedStorageString_(legacyObj.ScoringEngine),
    SelectionMode: normalizedStorageString_(legacyObj.SelectionMode),
    EntryType: normalizedStorageString_(legacyObj.EntryType),
    OddsMode: normalizedStorageString_(legacyObj.OddsMode),
    ResultSource: normalizedStorageString_(legacyObj.ResultSource),
    RoundNumber: legacyObj.RoundNumber || "",
    SportsProvider: normalizedStorageString_(legacyObj.SportsProvider),
    SportsLeague: normalizedStorageString_(legacyObj.SportsLeague),
    SportsGameId: normalizedStorageString_(legacyObj.SportsGameId),
    ESPNEventId: normalizedStorageString_(legacyObj.ESPNEventId),
    HomeTeam: normalizedStorageString_(legacyObj.HomeTeam),
    AwayTeam: normalizedStorageString_(legacyObj.AwayTeam),
    HomeRecord: normalizedStorageString_(legacyObj.HomeRecord),
    AwayRecord: normalizedStorageString_(legacyObj.AwayRecord),
    HomeScore: legacyObj.HomeScore || "",
    AwayScore: legacyObj.AwayScore || "",
    SportsStatus: normalizedStorageString_(legacyObj.SportsStatus),
    SportsClock: normalizedStorageString_(legacyObj.SportsClock),
    SportsPeriod: legacyObj.SportsPeriod || "",
    SportsState: normalizedStorageString_(legacyObj.SportsState),
    SportsMarket: normalizedStorageString_(legacyObj.SportsMarket),
    SportsSelection: normalizedStorageString_(legacyObj.SportsSelection),
    SportsLine: legacyObj.SportsLine || "",
    BettingOdds: legacyObj.BettingOdds || "",
    OddsSource: normalizedStorageString_(legacyObj.OddsSource),
    OddsLastUpdated: legacyObj.OddsLastUpdated || "",
    PayloadJSON: JSON.stringify(
      normalizedStorageStripOptionFields_(legacyObj)
    ),
    SourceSystem: "legacy-sync",
    CreatedAt: now,
    UpdatedAt: now,
    StorageVersion: NORMALIZED_STORAGE_VERSION
  };

  /*
    Migration is one-way after normalized rows exist. Existing canonical
    values win so a later compatibility-sheet sync cannot overwrite edits
    made through the normalized admin flow.
  */
  if (existing && normalizedStorageString_(existing.QuestionId)) {
    return Object.assign({}, legacy, existing, {
      GameId: normalizedStorageString_(existing.GameId || legacy.GameId),
      QuestionId: normalizedStorageKey_(
        existing.QuestionId || legacy.QuestionId
      ),
      CreatedAt: existing.CreatedAt || legacy.CreatedAt,
      UpdatedAt: existing.UpdatedAt || now,
      StorageVersion: NORMALIZED_STORAGE_VERSION
    });
  }

  return legacy;
}

function normalizedStorageOptionFromLegacy_(
  legacyObj,
  displayOrder,
  existingOption
) {
  const now = new Date();
  const existing = existingOption || {};
  const legacy = {
    GameId: normalizedStorageString_(legacyObj.GameId),
    QuestionId: normalizedStorageKey_(legacyObj.CategoryId),
    OptionId: normalizedStorageKey_(
      legacyObj.NomineeId ||
      (typeof slugify_ === "function"
        ? slugify_(legacyObj.Nominee)
        : normalizedStorageKey_(legacyObj.Nominee).replace(/[^a-z0-9]+/g, "-"))
    ),
    Option: normalizedStorageString_(legacyObj.Nominee),
    ShortAnswer: normalizedStorageString_(
      legacyObj.ShortAnswer || legacyObj.Nominee
    ),
    FileID: normalizedStorageString_(legacyObj.FileID),
    LogoUrl: normalizedStorageString_(legacyObj.LogoUrl),
    MovieId: normalizedStorageString_(legacyObj.MovieId),
    Movie: normalizedStorageString_(legacyObj.Movie),
    Person: normalizedStorageString_(legacyObj.Person),
    Active: normalizedStorageBool_(legacyObj.Active, true),
    DisplayOrder: Number(displayOrder || 0),
    PayloadJSON: JSON.stringify(legacyObj),
    SourceSystem: "legacy-sync",
    CreatedAt: now,
    UpdatedAt: now,
    StorageVersion: NORMALIZED_STORAGE_VERSION
  };

  if (existing && normalizedStorageString_(existing.OptionId)) {
    return Object.assign({}, legacy, existing, {
      GameId: normalizedStorageString_(existing.GameId || legacy.GameId),
      QuestionId: normalizedStorageKey_(
        existing.QuestionId || legacy.QuestionId
      ),
      OptionId: normalizedStorageKey_(existing.OptionId || legacy.OptionId),
      CreatedAt: existing.CreatedAt || legacy.CreatedAt,
      UpdatedAt: existing.UpdatedAt || now,
      StorageVersion: NORMALIZED_STORAGE_VERSION
    });
  }

  return legacy;
}

function normalizedStorageObjectRow_(headers, object) {
  return headers.map(function(header) {
    return object && object[header] !== undefined
      ? object[header]
      : "";
  });
}

function normalizedStorageRowsToObjects_(data) {
  if (!data || data.length <= 1) {
    return [];
  }

  const headers = data[0].map(normalizedStorageString_);

  return data.slice(1).map(function(row) {
    const object = {};

    headers.forEach(function(header, index) {
      object[header] = row[index];
    });

    return object;
  });
}

function normalizedStorageDeleteRows_(sh, rowNumbers) {
  const rows = (rowNumbers || [])
    .map(Number)
    .filter(function(rowNumber) {
      return rowNumber > 1;
    })
    .sort(function(a, b) {
      return b - a;
    });

  const groups = [];

  rows.forEach(function(rowNumber) {
    const last = groups.length ? groups[groups.length - 1] : null;

    if (last && rowNumber === last.start - 1) {
      last.start = rowNumber;
      last.count += 1;
      return;
    }

    groups.push({
      start: rowNumber,
      count: 1
    });
  });

  groups.forEach(function(group) {
    sh.deleteRows(group.start, group.count);
  });
}

function normalizedStorageReplaceGameRows_(
  sheetName,
  headers,
  entityType,
  gameId,
  objects
) {
  const sh = normalizedStorageEnsureSheet_(sheetName, headers);
  const existingRows = normalizedStorageFindRowsByGame_(sh, gameId);

  if (existingRows.length) {
    normalizedStorageDeleteRows_(sh, existingRows);
  }

  if (objects && objects.length) {
    const rows = objects.map(function(object) {
      return normalizedStorageObjectRow_(headers, object);
    });

    sh.getRange(
      sh.getLastRow() + 1,
      1,
      rows.length,
      headers.length
    ).setValues(rows);
  }

  normalizedStorageRebuildIndexForSheet_(sheetName, entityType);

  return objects ? objects.length : 0;
}

function normalizedStorageSyncGameFromLegacy_(gameId, options) {
  options = options || {};
  gameId = normalizedStorageString_(gameId);

  if (!gameId) {
    throw new Error("GameId is required");
  }

  const syncCacheKey = "normalized_sync_" + gameId;

  if (options.force !== true) {
    try {
      const cachedSync = CacheService.getScriptCache().get(syncCacheKey);
      if (cachedSync) {
        return {
          success: true,
          skipped: true,
          gameId: gameId,
          message: "Normalized game storage is current in cache."
        };
      }
    } catch (cacheErr) {
      Logger.log("Normalized sync cache warning: " + cacheErr);
    }
  }

  normalizedStorageEnsureSheet_(QUESTIONS_SHEET, QUESTIONS_HEADERS);
  normalizedStorageEnsureSheet_(
    QUESTION_OPTIONS_SHEET,
    QUESTION_OPTIONS_HEADERS
  );

  const legacyData = normalizedStorageReadLegacyCategoriesByGame_(
    gameId,
    {
      bypassRuntimeCache: true,
      trustIndex: false
    }
  );

  const legacyHeaders = legacyData.length
    ? legacyData[0].map(normalizedStorageString_)
    : [];

  const legacyRows = legacyData.length > 1
    ? legacyData.slice(1)
    : [];

  const legacyHash = normalizedStorageHash_(legacyRows);
  const legacyIndex = normalizedStorageGetIndexEntry_(
    "LegacyCategories",
    gameId
  );

  const existingQuestionData = normalizedStorageReadQuestionsByGame_(
    gameId,
    {
      bypassRuntimeCache: true
    }
  );
  const existingQuestions = normalizedStorageRowsToObjects_(
    existingQuestionData
  );
  const existingOptionData = normalizedStorageReadOptionsByGame_(
    gameId,
    {
      bypassRuntimeCache: true
    }
  );
  const existingOptions = normalizedStorageRowsToObjects_(
    existingOptionData
  );

  if (
    options.force !== true &&
    legacyIndex &&
    legacyIndex.contentHash === legacyHash &&
    existingQuestions.length
  ) {
    try {
      CacheService.getScriptCache().put(syncCacheKey, legacyHash || "current", (typeof CACHE_TTL !== "undefined" ? CACHE_TTL : 120));
    } catch (cacheErr) {
      Logger.log("Normalized sync cache put warning: " + cacheErr);
    }

    return {
      success: true,
      skipped: true,
      gameId: gameId,
      questions: existingQuestions.length,
      message: "Normalized game storage is already current."
    };
  }

  const existingQuestionMap = {};
  existingQuestions.forEach(function(question) {
    existingQuestionMap[normalizedStorageKey_(question.QuestionId)] = question;
  });

  const existingOptionMap = {};
  existingOptions.forEach(function(option) {
    const key = normalizedStorageKey_(option.QuestionId) + "::" +
      normalizedStorageKey_(option.OptionId);
    existingOptionMap[key] = option;
  });

  const questionMap = {};
  const optionsByQuestion = {};

  legacyRows.forEach(function(row) {
    const legacyObj = normalizedStorageLegacyRowObject_(legacyHeaders, row);
    const questionId = normalizedStorageKey_(legacyObj.CategoryId);
    const questionName = normalizedStorageString_(legacyObj.Category);

    if (!questionId || !questionName) {
      return;
    }

    if (!questionMap[questionId]) {
      questionMap[questionId] = normalizedStorageQuestionFromLegacy_(
        legacyObj,
        existingQuestionMap[questionId]
      );
    }

    const optionName = normalizedStorageString_(legacyObj.Nominee);

    if (!optionName) {
      return;
    }

    if (!optionsByQuestion[questionId]) {
      optionsByQuestion[questionId] = [];
    }

    const optionId = normalizedStorageKey_(
      legacyObj.NomineeId ||
      (typeof slugify_ === "function"
        ? slugify_(legacyObj.Nominee)
        : normalizedStorageKey_(legacyObj.Nominee).replace(/[^a-z0-9]+/g, "-"))
    );

    optionsByQuestion[questionId].push(
      normalizedStorageOptionFromLegacy_(
        legacyObj,
        optionsByQuestion[questionId].length + 1,
        existingOptionMap[questionId + "::" + optionId]
      )
    );
  });

  /* Preserve canonical questions that do not yet have legacy option rows. */
  existingQuestions.forEach(function(question) {
    const questionId = normalizedStorageKey_(question.QuestionId);

    if (!questionMap[questionId]) {
      questionMap[questionId] = question;
    }
  });

  /* Preserve canonical options that do not have a legacy projection row. */
  existingOptions.forEach(function(option) {
    const questionId = normalizedStorageKey_(option.QuestionId);
    const optionId = normalizedStorageKey_(option.OptionId);

    if (!questionId || !optionId) {
      return;
    }

    if (!optionsByQuestion[questionId]) {
      optionsByQuestion[questionId] = [];
    }

    const exists = optionsByQuestion[questionId].some(function(candidate) {
      return normalizedStorageKey_(candidate.OptionId) === optionId;
    });

    if (!exists) {
      optionsByQuestion[questionId].push(option);
    }
  });

  const questionObjects = Object.keys(questionMap)
    .sort()
    .map(function(questionId) {
      return questionMap[questionId];
    });

  const optionObjects = [];
  Object.keys(optionsByQuestion).sort().forEach(function(questionId) {
    optionsByQuestion[questionId].forEach(function(option) {
      optionObjects.push(option);
    });
  });

  normalizedStorageReplaceGameRows_(
    QUESTIONS_SHEET,
    QUESTIONS_HEADERS,
    "Questions",
    gameId,
    questionObjects
  );

  normalizedStorageReplaceGameRows_(
    QUESTION_OPTIONS_SHEET,
    QUESTION_OPTIONS_HEADERS,
    "QuestionOptions",
    gameId,
    optionObjects
  );

  normalizedStorageUpsertIndexEntry_({
    entityType: "LegacyCategories",
    gameId: gameId,
    sheetName: CATEGORIES_SHEET,
    rowNumbers: normalizedStorageFindRowsByGame_(
      SpreadsheetApp.getActive().getSheetByName(CATEGORIES_SHEET),
      gameId
    ),
    contentHash: legacyHash,
    dataVersion: NORMALIZED_STORAGE_VERSION
  });

  normalizedStorageLogMigration_({
    action: "sync-game-from-legacy",
    gameId: gameId,
    questions: questionObjects.length,
    options: optionObjects.length,
    legacyRows: legacyRows.length,
    status: "success",
    message: "Game normalized successfully."
  });

  normalizedStorageClearCaches_();

  try {
    CacheService.getScriptCache().put(syncCacheKey, legacyHash || "current", (typeof CACHE_TTL !== "undefined" ? CACHE_TTL : 120));
  } catch (cacheErr) {
    Logger.log("Normalized sync cache put warning: " + cacheErr);
  }

  return {
    success: true,
    gameId: gameId,
    questions: questionObjects.length,
    options: optionObjects.length,
    legacyRows: legacyRows.length,
    contentHash: legacyHash
  };
}

function normalizedStorageMigrateAllLegacyCategories_(options) {
  options = options || {};

  const sh = SpreadsheetApp.getActive().getSheetByName(CATEGORIES_SHEET);

  if (!sh || sh.getLastRow() <= 1) {
    return {
      success: true,
      migratedGames: 0,
      questions: 0,
      options: 0,
      message: "No legacy Categories rows found."
    };
  }

  const headers = normalizedStorageGetHeaders_(sh);
  const col = normalizedStorageHeaderMap_(headers);

  if (col.GameId === undefined) {
    throw new Error("Categories.GameId header is required for migration");
  }

  const gameValues = sh
    .getRange(2, col.GameId + 1, sh.getLastRow() - 1, 1)
    .getValues();

  const gameIds = {};

  gameValues.forEach(function(row) {
    const gameId = normalizedStorageString_(row[0]);
    if (gameId) {
      gameIds[gameId] = true;
    }
  });

  let questions = 0;
  let optionsCount = 0;
  const errors = [];

  Object.keys(gameIds).sort().forEach(function(gameId) {
    try {
      const result = normalizedStorageSyncGameFromLegacy_(gameId, {
        force: options.force === true
      });

      questions += Number(result.questions || 0);
      optionsCount += Number(result.options || 0);
    } catch (err) {
      errors.push({
        gameId: gameId,
        error: err && err.message ? err.message : String(err)
      });
    }
  });

  return {
    success: errors.length === 0,
    partial: errors.length > 0,
    migratedGames: Object.keys(gameIds).length - errors.length,
    questions: questions,
    options: optionsCount,
    errors: errors,
    message: errors.length
      ? "Migration completed with errors."
      : "All legacy questions and options were normalized."
  };
}

function normalizedStorageLogMigration_(payload) {
  try {
    const sh = normalizedStorageEnsureSheet_(
      STORAGE_MIGRATION_LOG_SHEET,
      STORAGE_MIGRATION_LOG_HEADERS
    );

    sh.appendRow([
      new Date(),
      payload.action || "",
      payload.gameId || "",
      Number(payload.questions || 0),
      Number(payload.options || 0),
      Number(payload.legacyRows || 0),
      payload.status || "",
      payload.message || ""
    ]);
  } catch (err) {
    Logger.log("Storage migration log failed: " + err);
  }
}

function normalizedStorageQuestionObject_(payload, existing) {
  payload = payload || {};
  existing = existing || {};
  const now = new Date();

  function value(key, fallback) {
    return Object.prototype.hasOwnProperty.call(payload, key)
      ? payload[key]
      : (existing[key] !== undefined ? existing[key] : fallback);
  }

  return {
    GameId: normalizedStorageString_(value("GameId", payload.gameId)),
    QuestionId: normalizedStorageKey_(value("QuestionId", payload.questionId || payload.categoryId)),
    Question: normalizedStorageString_(value("Question", payload.question || payload.category || payload.name)),
    Section: normalizedStorageString_(value("Section", payload.section || "Other")),
    CategoryImage: normalizedStorageString_(value("CategoryImage", payload.categoryImage || "")),
    Active: normalizedStorageBool_(value("Active", payload.active), true),
    PredictionGame: normalizedStorageBool_(value("PredictionGame", payload.predictionGame), true),
    CommunityRank: normalizedStorageBool_(value("CommunityRank", payload.communityRank), false),
    QuestionType: normalizedStorageString_(value("QuestionType", payload.questionType || "")),
    ScoringEngine: normalizedStorageString_(value("ScoringEngine", payload.scoringEngine || "")),
    SelectionMode: normalizedStorageString_(value("SelectionMode", payload.selectionMode || "")),
    EntryType: normalizedStorageString_(value("EntryType", payload.entryType || "")),
    OddsMode: normalizedStorageString_(value("OddsMode", payload.oddsMode || "")),
    ResultSource: normalizedStorageString_(value("ResultSource", payload.resultSource || "")),
    RoundNumber: value("RoundNumber", payload.roundNumber || ""),
    SportsProvider: normalizedStorageString_(value("SportsProvider", payload.sportsProvider || "")),
    SportsLeague: normalizedStorageString_(value("SportsLeague", payload.sportsLeague || "")),
    SportsGameId: normalizedStorageString_(value("SportsGameId", payload.sportsGameId || "")),
    ESPNEventId: normalizedStorageString_(value("ESPNEventId", payload.espnEventId || "")),
    HomeTeam: normalizedStorageString_(value("HomeTeam", payload.homeTeam || "")),
    AwayTeam: normalizedStorageString_(value("AwayTeam", payload.awayTeam || "")),
    HomeRecord: normalizedStorageString_(value("HomeRecord", payload.homeRecord || "")),
    AwayRecord: normalizedStorageString_(value("AwayRecord", payload.awayRecord || "")),
    HomeScore: value("HomeScore", payload.homeScore || ""),
    AwayScore: value("AwayScore", payload.awayScore || ""),
    SportsStatus: normalizedStorageString_(value("SportsStatus", payload.sportsStatus || "")),
    SportsClock: normalizedStorageString_(value("SportsClock", payload.sportsClock || "")),
    SportsPeriod: value("SportsPeriod", payload.sportsPeriod || ""),
    SportsState: normalizedStorageString_(value("SportsState", payload.sportsState || "")),
    SportsMarket: normalizedStorageString_(value("SportsMarket", payload.sportsMarket || "")),
    SportsSelection: normalizedStorageString_(value("SportsSelection", payload.sportsSelection || "")),
    SportsLine: value("SportsLine", payload.sportsLine || ""),
    BettingOdds: value("BettingOdds", payload.bettingOdds || ""),
    OddsSource: normalizedStorageString_(value("OddsSource", payload.oddsSource || "")),
    OddsLastUpdated: value("OddsLastUpdated", payload.oddsLastUpdated || ""),
    PayloadJSON: normalizedStorageString_(value("PayloadJSON", payload.payloadJSON || existing.PayloadJSON || "{}")),
    SourceSystem: normalizedStorageString_(value("SourceSystem", payload.sourceSystem || "admin-normalized")),
    CreatedAt: existing.CreatedAt || payload.createdAt || now,
    UpdatedAt: now,
    StorageVersion: NORMALIZED_STORAGE_VERSION
  };
}

function normalizedStorageOptionObject_(payload, existing) {
  payload = payload || {};
  existing = existing || {};
  const now = new Date();

  function value(key, fallback) {
    return Object.prototype.hasOwnProperty.call(payload, key)
      ? payload[key]
      : (existing[key] !== undefined ? existing[key] : fallback);
  }

  return {
    GameId: normalizedStorageString_(value("GameId", payload.gameId)),
    QuestionId: normalizedStorageKey_(value("QuestionId", payload.questionId || payload.categoryId)),
    OptionId: normalizedStorageKey_(value("OptionId", payload.optionId || payload.nomineeId)),
    Option: normalizedStorageString_(value("Option", payload.option || payload.nominee || payload.answer || payload.name)),
    ShortAnswer: normalizedStorageString_(value("ShortAnswer", payload.shortAnswer || payload.option || payload.nominee || payload.answer || payload.name)),
    FileID: normalizedStorageString_(value("FileID", payload.fileId || "")),
    LogoUrl: normalizedStorageString_(value("LogoUrl", payload.logoUrl || "")),
    MovieId: normalizedStorageString_(value("MovieId", payload.movieId || "")),
    Movie: normalizedStorageString_(value("Movie", payload.movie || "")),
    Person: normalizedStorageString_(value("Person", payload.person || "")),
    Active: normalizedStorageBool_(value("Active", payload.active), true),
    DisplayOrder: Number(value("DisplayOrder", payload.displayOrder || 0)),
    PayloadJSON: normalizedStorageString_(value("PayloadJSON", payload.payloadJSON || existing.PayloadJSON || "{}")),
    SourceSystem: normalizedStorageString_(value("SourceSystem", payload.sourceSystem || "admin-normalized")),
    CreatedAt: existing.CreatedAt || payload.createdAt || now,
    UpdatedAt: now,
    StorageVersion: NORMALIZED_STORAGE_VERSION
  };
}

function normalizedStorageUpsertQuestion_(payload) {
  const gameId = normalizedStorageString_(payload && (payload.gameId || payload.GameId));
  const questionId = normalizedStorageKey_(payload && (payload.questionId || payload.categoryId || payload.QuestionId));

  if (!gameId || !questionId) {
    throw new Error("GameId and QuestionId are required");
  }

  const sh = normalizedStorageEnsureSheet_(QUESTIONS_SHEET, QUESTIONS_HEADERS);
  const data = normalizedStorageReadQuestionsByGame_(gameId, {
    bypassRuntimeCache: true,
    trustIndex: false
  });
  const objects = normalizedStorageRowsToObjects_(data);
  const existing = objects.find(function(question) {
    return normalizedStorageKey_(question.QuestionId) === questionId;
  }) || null;

  const object = normalizedStorageQuestionObject_(
    Object.assign({}, payload, {
      GameId: gameId,
      QuestionId: questionId
    }),
    existing
  );

  if (existing) {
    const rowNumbers = normalizedStorageFindRowsByGame_(sh, gameId);
    const headers = normalizedStorageGetHeaders_(sh);
    const col = normalizedStorageHeaderMap_(headers);

    for (let i = 0; i < rowNumbers.length; i++) {
      const rowNumber = rowNumbers[i];
      const rowQuestionId = normalizedStorageKey_(
        sh.getRange(rowNumber, col.QuestionId + 1).getValue()
      );

      if (rowQuestionId === questionId) {
        sh.getRange(rowNumber, 1, 1, headers.length)
          .setValues([normalizedStorageObjectRow_(headers, object)]);
        normalizedStorageRebuildIndexForSheet_(QUESTIONS_SHEET, "Questions");
        normalizedStorageClearCaches_();
        return object;
      }
    }
  }

  sh.appendRow(normalizedStorageObjectRow_(QUESTIONS_HEADERS, object));
  normalizedStorageRebuildIndexForSheet_(QUESTIONS_SHEET, "Questions");
  normalizedStorageClearCaches_();

  return object;
}

function normalizedStorageUpsertOption_(payload) {
  const gameId = normalizedStorageString_(payload && (payload.gameId || payload.GameId));
  const questionId = normalizedStorageKey_(payload && (payload.questionId || payload.categoryId || payload.QuestionId));
  const optionId = normalizedStorageKey_(payload && (payload.optionId || payload.nomineeId || payload.OptionId));

  if (!gameId || !questionId || !optionId) {
    throw new Error("GameId, QuestionId, and OptionId are required");
  }

  const sh = normalizedStorageEnsureSheet_(
    QUESTION_OPTIONS_SHEET,
    QUESTION_OPTIONS_HEADERS
  );
  const data = normalizedStorageReadOptionsByGame_(gameId, {
    bypassRuntimeCache: true,
    trustIndex: false
  });
  const objects = normalizedStorageRowsToObjects_(data);
  const existing = objects.find(function(option) {
    return (
      normalizedStorageKey_(option.QuestionId) === questionId &&
      normalizedStorageKey_(option.OptionId) === optionId
    );
  }) || null;

  const object = normalizedStorageOptionObject_(
    Object.assign({}, payload, {
      GameId: gameId,
      QuestionId: questionId,
      OptionId: optionId
    }),
    existing
  );

  if (existing) {
    const rowNumbers = normalizedStorageFindRowsByGame_(sh, gameId);
    const headers = normalizedStorageGetHeaders_(sh);
    const col = normalizedStorageHeaderMap_(headers);

    for (let i = 0; i < rowNumbers.length; i++) {
      const rowNumber = rowNumbers[i];
      const rowQuestionId = normalizedStorageKey_(
        sh.getRange(rowNumber, col.QuestionId + 1).getValue()
      );
      const rowOptionId = normalizedStorageKey_(
        sh.getRange(rowNumber, col.OptionId + 1).getValue()
      );

      if (rowQuestionId === questionId && rowOptionId === optionId) {
        sh.getRange(rowNumber, 1, 1, headers.length)
          .setValues([normalizedStorageObjectRow_(headers, object)]);
        normalizedStorageRebuildIndexForSheet_(
          QUESTION_OPTIONS_SHEET,
          "QuestionOptions"
        );
        normalizedStorageClearCaches_();
        return object;
      }
    }
  }

  sh.appendRow(normalizedStorageObjectRow_(QUESTION_OPTIONS_HEADERS, object));
  normalizedStorageRebuildIndexForSheet_(
    QUESTION_OPTIONS_SHEET,
    "QuestionOptions"
  );
  normalizedStorageClearCaches_();

  return object;
}

function normalizedStorageUpsertOptionsBulk_(payloads) {
  payloads = Array.isArray(payloads) ? payloads : [];

  if (!payloads.length) {
    return [];
  }

  const gameId = normalizedStorageString_(
    payloads[0].gameId || payloads[0].GameId
  );

  if (!gameId) {
    throw new Error("GameId is required for bulk option upsert");
  }

  payloads.forEach(function(payload) {
    const payloadGameId = normalizedStorageString_(
      payload.gameId || payload.GameId
    );

    if (payloadGameId !== gameId) {
      throw new Error("Bulk option upsert requires one GameId per request");
    }
  });

  const existingData = normalizedStorageReadOptionsByGame_(gameId, {
    bypassRuntimeCache: true,
    trustIndex: false
  });
  const existingObjects = normalizedStorageRowsToObjects_(existingData);
  const objectMap = {};

  existingObjects.forEach(function(option) {
    const key = normalizedStorageKey_(option.QuestionId) + "::" +
      normalizedStorageKey_(option.OptionId);
    objectMap[key] = option;
  });

  const updated = [];

  payloads.forEach(function(payload) {
    const questionId = normalizedStorageKey_(
      payload.questionId || payload.categoryId || payload.QuestionId
    );
    const optionId = normalizedStorageKey_(
      payload.optionId || payload.nomineeId || payload.OptionId
    );

    if (!questionId || !optionId) {
      throw new Error("QuestionId and OptionId are required");
    }

    const key = questionId + "::" + optionId;
    const object = normalizedStorageOptionObject_(
      Object.assign({}, payload, {
        GameId: gameId,
        QuestionId: questionId,
        OptionId: optionId
      }),
      objectMap[key] || null
    );

    objectMap[key] = object;
    updated.push(object);
  });

  const allObjects = Object.keys(objectMap)
    .map(function(key) {
      return objectMap[key];
    })
    .sort(function(a, b) {
      const questionCompare = normalizedStorageKey_(a.QuestionId)
        .localeCompare(normalizedStorageKey_(b.QuestionId));

      if (questionCompare !== 0) {
        return questionCompare;
      }

      const orderCompare = Number(a.DisplayOrder || 0) -
        Number(b.DisplayOrder || 0);

      if (orderCompare !== 0) {
        return orderCompare;
      }

      return normalizedStorageKey_(a.OptionId)
        .localeCompare(normalizedStorageKey_(b.OptionId));
    });

  normalizedStorageReplaceGameRows_(
    QUESTION_OPTIONS_SHEET,
    QUESTION_OPTIONS_HEADERS,
    "QuestionOptions",
    gameId,
    allObjects
  );

  normalizedStorageClearCaches_();

  return updated;
}

function normalizedStorageGetQuestionSetup_(gameId) {
  normalizedStorageSyncGameFromLegacy_(gameId, {});

  const questions = normalizedStorageRowsToObjects_(
    normalizedStorageReadQuestionsByGame_(gameId, {})
  );
  const options = normalizedStorageRowsToObjects_(
    normalizedStorageReadOptionsByGame_(gameId, {})
  );

  return {
    questions: questions,
    options: options
  };
}

function normalizedStorageBuildLegacyProjection_(gameId) {
  const categoriesSheet = SpreadsheetApp.getActive()
    .getSheetByName(CATEGORIES_SHEET);

  if (!categoriesSheet) {
    return [];
  }

  const legacyHeaders = normalizedStorageGetHeaders_(categoriesSheet);
  const normalized = normalizedStorageGetQuestionSetup_(gameId);
  const questionMap = {};

  normalized.questions.forEach(function(question) {
    questionMap[normalizedStorageKey_(question.QuestionId)] = question;
  });

  const rows = [legacyHeaders];

  normalized.options.forEach(function(option) {
    const questionId = normalizedStorageKey_(option.QuestionId);
    const question = questionMap[questionId];

    if (!question) {
      return;
    }

    const questionPayload = normalizedStorageSafeJsonParse_(
      question.PayloadJSON,
      {}
    );
    const optionPayload = normalizedStorageSafeJsonParse_(
      option.PayloadJSON,
      {}
    );
    const merged = Object.assign({}, questionPayload, optionPayload, {
      GameId: gameId,
      CategoryId: questionId,
      Category: question.Question,
      Section: question.Section,
      CategoryImage: question.CategoryImage,
      Active: option.Active !== false && question.Active !== false,
      PredictionGame: question.PredictionGame,
      CommunityRank: question.CommunityRank,
      QuestionType: question.QuestionType,
      ScoringEngine: question.ScoringEngine,
      SelectionMode: question.SelectionMode,
      EntryType: question.EntryType,
      OddsMode: question.OddsMode,
      ResultSource: question.ResultSource,
      RoundNumber: question.RoundNumber,
      SportsProvider: question.SportsProvider,
      SportsLeague: question.SportsLeague,
      SportsGameId: question.SportsGameId,
      ESPNEventId: question.ESPNEventId,
      HomeTeam: question.HomeTeam,
      AwayTeam: question.AwayTeam,
      HomeRecord: question.HomeRecord,
      AwayRecord: question.AwayRecord,
      HomeScore: question.HomeScore,
      AwayScore: question.AwayScore,
      SportsStatus: question.SportsStatus,
      SportsClock: question.SportsClock,
      SportsPeriod: question.SportsPeriod,
      SportsState: question.SportsState,
      SportsMarket: question.SportsMarket,
      SportsSelection: question.SportsSelection,
      SportsLine: question.SportsLine,
      BettingOdds: question.BettingOdds,
      OddsSource: question.OddsSource,
      OddsLastUpdated: question.OddsLastUpdated,
      NomineeId: option.OptionId,
      Nominee: option.Option,
      ShortAnswer: option.ShortAnswer,
      FileID: option.FileID,
      LogoUrl: option.LogoUrl,
      MovieId: option.MovieId,
      Movie: option.Movie,
      Person: option.Person
    });

    rows.push(legacyHeaders.map(function(header) {
      return merged[header] !== undefined ? merged[header] : "";
    }));
  });

  return rows;
}


function getAdminCategoriesDataForGameScoped_(gameId) {
  gameId = normalizedStorageString_(gameId);

  if (!gameId) {
    throw new Error("GameId is required");
  }

  const categoriesSheet = SpreadsheetApp.getActive()
    .getSheetByName(CATEGORIES_SHEET);

  if (!categoriesSheet) {
    return [];
  }

  const legacyHeaders = normalizedStorageGetHeaders_(categoriesSheet);
  const normalized = normalizedStorageGetQuestionSetup_(gameId);
  const questionMap = {};
  const optionsByQuestion = {};

  normalized.questions.forEach(function(question) {
    const questionId = normalizedStorageKey_(question.QuestionId);
    questionMap[questionId] = question;
    optionsByQuestion[questionId] = [];
  });

  normalized.options.forEach(function(option) {
    const questionId = normalizedStorageKey_(option.QuestionId);
    if (!optionsByQuestion[questionId]) {
      optionsByQuestion[questionId] = [];
    }
    optionsByQuestion[questionId].push(option);
  });

  const rows = [legacyHeaders];

  Object.keys(questionMap).sort().forEach(function(questionId) {
    const question = questionMap[questionId];
    const questionPayload = normalizedStorageSafeJsonParse_(
      question.PayloadJSON,
      {}
    );
    const base = Object.assign({}, questionPayload, {
      GameId: gameId,
      CategoryId: questionId,
      Category: question.Question,
      Section: question.Section,
      CategoryImage: question.CategoryImage,
      Active: question.Active,
      PredictionGame: question.PredictionGame,
      CommunityRank: question.CommunityRank,
      QuestionType: question.QuestionType,
      ScoringEngine: question.ScoringEngine,
      SelectionMode: question.SelectionMode,
      EntryType: question.EntryType,
      OddsMode: question.OddsMode,
      ResultSource: question.ResultSource,
      RoundNumber: question.RoundNumber,
      SportsProvider: question.SportsProvider,
      SportsLeague: question.SportsLeague,
      SportsGameId: question.SportsGameId,
      ESPNEventId: question.ESPNEventId,
      HomeTeam: question.HomeTeam,
      AwayTeam: question.AwayTeam,
      HomeRecord: question.HomeRecord,
      AwayRecord: question.AwayRecord,
      HomeScore: question.HomeScore,
      AwayScore: question.AwayScore,
      SportsStatus: question.SportsStatus,
      SportsClock: question.SportsClock,
      SportsPeriod: question.SportsPeriod,
      SportsState: question.SportsState,
      SportsMarket: question.SportsMarket,
      SportsSelection: question.SportsSelection,
      SportsLine: question.SportsLine,
      BettingOdds: question.BettingOdds,
      OddsSource: question.OddsSource,
      OddsLastUpdated: question.OddsLastUpdated,
      Nominee: "",
      NomineeId: "",
      ShortAnswer: "",
      FileID: "",
      LogoUrl: "",
      MovieId: "",
      Movie: "",
      Person: ""
    });

    /* Synthetic anchor exists only in memory for the admin UI. */
    rows.push(legacyHeaders.map(function(header) {
      return base[header] !== undefined ? base[header] : "";
    }));

    (optionsByQuestion[questionId] || []).forEach(function(option) {
      const optionPayload = normalizedStorageSafeJsonParse_(
        option.PayloadJSON,
        {}
      );
      const merged = Object.assign({}, base, optionPayload, {
        NomineeId: option.OptionId,
        Nominee: option.Option,
        ShortAnswer: option.ShortAnswer,
        FileID: option.FileID,
        LogoUrl: option.LogoUrl,
        MovieId: option.MovieId,
        Movie: option.Movie,
        Person: option.Person,
        Active: option.Active !== false && question.Active !== false
      });

      rows.push(legacyHeaders.map(function(header) {
        return merged[header] !== undefined ? merged[header] : "";
      }));
    });
  });

  return rows;
}

function getCategoriesDataForGameScoped_(gameId) {
  gameId = normalizedStorageString_(gameId);

  if (!gameId) {
    throw new Error("GameId is required");
  }

  try {
    const projection = normalizedStorageBuildLegacyProjection_(gameId);

    if (projection.length > 1) {
      return projection;
    }
  } catch (err) {
    Logger.log(
      "Normalized category projection failed; using legacy rows: " + err
    );
  }

  return normalizedStorageReadLegacyCategoriesByGame_(gameId, {});
}

function normalizedStorageClearCaches_() {
  NORMALIZED_STORAGE_RUNTIME_CACHE = {};

  try {
    const cache = CacheService.getScriptCache();
    [
      "sheet_" + QUESTIONS_SHEET,
      "sheet_" + QUESTION_OPTIONS_SHEET,
      "sheet_" + DATA_INDEX_SHEET
    ].forEach(function(key) {
      cache.remove(key);
    });
  } catch (err) {
    Logger.log("Normalized cache clear warning: " + err);
  }

  if (typeof clearAppCaches === "function") {
    clearAppCaches();
  }
}

function normalizedStorageGetSheetStats_(sheetName) {
  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);

  if (!sh) {
    return {
      sheetName: sheetName,
      exists: false,
      rows: 0,
      columns: 0,
      cells: 0
    };
  }

  const rows = sh.getLastRow();
  const columns = sh.getLastColumn();

  return {
    sheetName: sheetName,
    exists: true,
    rows: rows,
    columns: columns,
    cells: rows * columns
  };
}

function getNormalizedStorageHealth(payload) {
  payload = payload || {};
  const gameId = normalizedStorageString_(payload.gameId || "");

  const trackedSheets = [
    GAMES_SHEET,
    QUESTIONS_SHEET,
    QUESTION_OPTIONS_SHEET,
    CATEGORIES_SHEET,
    CATEGORY_SETTINGS_SHEET,
    CATEGORY_RESULTS_SHEET,
    PICKS_SHEET,
    typeof BETS_SHEET !== "undefined" ? BETS_SHEET : "Bets",
    DATA_INDEX_SHEET,
    ARCHIVE_MANIFEST_SHEET
  ];

  const sheets = trackedSheets.map(normalizedStorageGetSheetStats_);
  const totalCells = sheets.reduce(function(total, sheet) {
    return total + Number(sheet.cells || 0);
  }, 0);

  let game = null;

  if (gameId) {
    const normalized = normalizedStorageGetQuestionSetup_(gameId);
    const legacy = normalizedStorageReadLegacyCategoriesByGame_(gameId, {});

    game = {
      gameId: gameId,
      questions: normalized.questions.length,
      options: normalized.options.length,
      legacyCategoryRows: Math.max(legacy.length - 1, 0),
      duplicateCellsAvoidedEstimate:
        Math.max(normalized.options.length - normalized.questions.length, 0) * 8
    };
  }

  return {
    success: true,
    storageVersion: NORMALIZED_STORAGE_VERSION,
    sheets: sheets,
    totalCells: totalCells,
    totalCellLimit: 10000000,
    estimatedPercentUsed: Math.round((totalCells / 10000000) * 10000) / 100,
    game: game,
    recommendations: [
      "Keep only active/recent games in the primary spreadsheet.",
      "Archive completed game transactions by year.",
      "Use game-scoped reads and normalized Questions/QuestionOptions.",
      "Avoid manual full-sheet formulas on Picks, Bets, and Results."
    ]
  };
}

function apiAdminGetStorageHealth(payload) {
  payload = payload || {};
  requireAdmin_(payload);
  return getNormalizedStorageHealth(payload);
}

function normalizedStorageEnsureArchiveHeaders_(targetSheet, sourceHeaders) {
  const lastColumn = Math.max(targetSheet.getLastColumn(), 1);
  let targetHeaders = targetSheet.getLastRow() >= 1
    ? targetSheet.getRange(1, 1, 1, lastColumn)
      .getValues()[0]
      .map(normalizedStorageString_)
    : [];

  const hasHeaders = targetHeaders.some(function(value) {
    return value !== "";
  });

  if (!hasHeaders) {
    targetSheet.getRange(1, 1, 1, sourceHeaders.length)
      .setValues([sourceHeaders]);
    return sourceHeaders.slice();
  }

  const missing = sourceHeaders.filter(function(header) {
    return targetHeaders.indexOf(header) === -1;
  });

  if (missing.length) {
    targetSheet.getRange(1, targetHeaders.length + 1, 1, missing.length)
      .setValues([missing]);
    targetHeaders = targetHeaders.concat(missing);
  }

  return targetHeaders;
}

function normalizedStorageCanonicalArchiveRows_(
  sourceHeaders,
  dataHeaders,
  rows
) {
  const dataCol = normalizedStorageHeaderMap_(dataHeaders);

  return (rows || []).map(function(row) {
    return sourceHeaders.map(function(header) {
      return dataCol[header] !== undefined
        ? row[dataCol[header]]
        : "";
    });
  });
}

function normalizedStorageArchiveHash_(headers, rows) {
  const normalizedRows = (rows || []).map(function(row) {
    return (headers || []).map(function(header, index) {
      const value = row[index];

      if (
        Object.prototype.toString.call(value) === "[object Date]" &&
        !isNaN(value.getTime())
      ) {
        return value.toISOString();
      }

      return value === undefined || value === null ? "" : value;
    });
  });

  return normalizedStorageHash_({
    headers: headers || [],
    rows: normalizedRows
  });
}

function normalizedStorageReadRowsFromSheetByGame_(sheet, gameId) {
  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }

  const headers = normalizedStorageGetHeaders_(sheet);
  const col = normalizedStorageHeaderMap_(headers);

  if (col.GameId === undefined) {
    return [];
  }

  const rowNumbers = normalizedStorageFindRowsByGame_(sheet, gameId);
  const rows = [];

  normalizedStorageConsolidateRows_(rowNumbers).forEach(function(range) {
    const values = sheet.getRange(
      range.start,
      1,
      range.end - range.start + 1,
      headers.length
    ).getValues();

    values.forEach(function(row) {
      if (normalizedStorageString_(row[col.GameId]) === gameId) {
        rows.push(row);
      }
    });
  });

  return {
    headers: headers,
    rows: rows
  };
}

function normalizedStorageCopyRowsForGame_(
  sourceSheet,
  targetSpreadsheet,
  gameId,
  entityType
) {
  if (!sourceSheet || sourceSheet.getLastRow() < 1) {
    return {
      count: 0,
      sourceHash: normalizedStorageArchiveHash_([], []),
      targetHash: normalizedStorageArchiveHash_([], []),
      verified: true
    };
  }

  const sourceHeaders = normalizedStorageGetHeaders_(sourceSheet);
  const sourceCol = normalizedStorageHeaderMap_(sourceHeaders);

  if (sourceCol.GameId === undefined) {
    return {
      count: 0,
      sourceHash: "",
      targetHash: "",
      verified: false,
      error: sourceSheet.getName() + ".GameId is missing"
    };
  }

  const sourceData = normalizedStorageReadRowsByGame_(
    sourceSheet.getName(),
    gameId,
    entityType,
    {
      trustIndex: false,
      bypassRuntimeCache: true
    }
  );
  const sourceRows = sourceData.length > 1
    ? sourceData.slice(1)
    : [];
  const sourceHash = normalizedStorageArchiveHash_(
    sourceHeaders,
    sourceRows
  );

  let targetSheet = targetSpreadsheet.getSheetByName(sourceSheet.getName());

  if (!targetSheet) {
    targetSheet = targetSpreadsheet.insertSheet(sourceSheet.getName());
  }

  const targetHeaders = normalizedStorageEnsureArchiveHeaders_(
    targetSheet,
    sourceHeaders
  );
  const existingGameRows = normalizedStorageFindRowsByGame_(
    targetSheet,
    gameId
  );

  if (existingGameRows.length) {
    normalizedStorageDeleteRows_(targetSheet, existingGameRows);
  }

  if (sourceRows.length) {
    const sourceObjects = sourceRows.map(function(row) {
      return normalizedStorageLegacyRowObject_(sourceHeaders, row);
    });
    const targetRows = sourceObjects.map(function(object) {
      return normalizedStorageObjectRow_(targetHeaders, object);
    });

    targetSheet.getRange(
      targetSheet.getLastRow() + 1,
      1,
      targetRows.length,
      targetHeaders.length
    ).setValues(targetRows);
  }

  SpreadsheetApp.flush();

  const targetData = normalizedStorageReadRowsFromSheetByGame_(
    targetSheet,
    gameId
  );
  const targetCanonicalRows = targetData && targetData.rows
    ? normalizedStorageCanonicalArchiveRows_(
        sourceHeaders,
        targetData.headers,
        targetData.rows
      )
    : [];
  const targetHash = normalizedStorageArchiveHash_(
    sourceHeaders,
    targetCanonicalRows
  );

  return {
    count: sourceRows.length,
    targetCount: targetCanonicalRows.length,
    sourceHash: sourceHash,
    targetHash: targetHash,
    verified:
      sourceRows.length === targetCanonicalRows.length &&
      sourceHash === targetHash
  };
}

function normalizedStorageGetArchiveReadiness_(gameId) {
  const normalized = normalizedStorageGetQuestionSetup_(gameId);
  const settings = typeof getCategorySettings === "function"
    ? (getCategorySettings(gameId) || {})
    : {};
  const unresolved = [];
  const resolvedStatuses = {
    settled: true,
    final: true,
    complete: true,
    completed: true,
    push: true,
    pushed: true,
    void: true,
    refund: true,
    refunded: true,
    cancelled: true,
    canceled: true,
    "no-contest": true,
    no_contest: true
  };

  (normalized.questions || []).forEach(function(question) {
    const questionId = normalizedStorageKey_(question.QuestionId);
    const config = settings[questionId] || {};
    const active = normalizedStorageBool_(question.Active, true);
    const status = normalizedStorageKey_(config.settlementStatus || "");
    const winner = normalizedStorageString_(config.winnerNomineeId || "");

    if (!active || winner || resolvedStatuses[status]) {
      return;
    }

    unresolved.push({
      questionId: questionId,
      question: normalizedStorageString_(question.Question),
      settlementStatus: status || "pending"
    });
  });

  return {
    ready: unresolved.length === 0,
    questionCount: (normalized.questions || []).length,
    unresolvedCount: unresolved.length,
    unresolved: unresolved
  };
}

function archiveGameData(payload) {
  payload = payload || {};
  const gameId = normalizedStorageString_(payload.gameId);
  const mode = normalizedStorageKey_(payload.mode) === "move"
    ? "MOVE"
    : "COPY";

  if (!gameId) {
    throw new Error("GameId is required");
  }

  validateGameId(gameId);

  if (mode === "MOVE" && payload.confirmMove !== true) {
    return {
      success: false,
      gameId: gameId,
      mode: mode,
      verified: false,
      error: "MOVE archive requires confirmMove=true. Create a COPY first."
    };
  }

  const lock = LockService.getScriptLock();
  const gotLock = lock.tryLock(30000);

  if (!gotLock) {
    return {
      success: false,
      gameId: gameId,
      mode: mode,
      verified: false,
      error: "Another storage or archive operation is running. Try again."
    };
  }

  try {
    setupNormalizedQuestionStorage({
      migrateExisting: true
    });

    const readiness = normalizedStorageGetArchiveReadiness_(gameId);

    if (mode === "MOVE" && !readiness.ready) {
      return {
        success: false,
        gameId: gameId,
        mode: mode,
        verified: false,
        readiness: readiness,
        error: "Game cannot be moved while questions remain unresolved."
      };
    }

    const game = typeof getGame === "function"
      ? getGame(gameId)
      : null;
    const gameName = game && game.name ? game.name : gameId;
    const year = Number(game && game.year) || new Date().getFullYear();
    const archiveName = "AwardsAppArchive_" + year;

    const properties = PropertiesService.getScriptProperties();
    const propertyKey = "AWARDS_ARCHIVE_SPREADSHEET_" + year;
    let archiveId = normalizedStorageString_(
      properties.getProperty(propertyKey)
    );
    let archiveSpreadsheet = null;

    if (archiveId) {
      try {
        archiveSpreadsheet = SpreadsheetApp.openById(archiveId);
      } catch (err) {
        archiveSpreadsheet = null;
      }
    }

    if (!archiveSpreadsheet) {
      archiveSpreadsheet = SpreadsheetApp.create(archiveName);
      archiveId = archiveSpreadsheet.getId();
      properties.setProperty(propertyKey, archiveId);
    }

    const source = SpreadsheetApp.getActive();
    const entitySheets = [
      { name: GAMES_SHEET, entityType: "Games" },
      { name: QUESTIONS_SHEET, entityType: "Questions" },
      { name: QUESTION_OPTIONS_SHEET, entityType: "QuestionOptions" },
      { name: CATEGORIES_SHEET, entityType: "LegacyCategories" },
      { name: CATEGORY_RESULTS_SHEET, entityType: "CategoryResults" },
      { name: PICKS_SHEET, entityType: "Picks" },
      {
        name: typeof BETS_SHEET !== "undefined" ? BETS_SHEET : "Bets",
        entityType: "Bets"
      }
    ];
    const counts = {};

    entitySheets.forEach(function(item) {
      const sh = source.getSheetByName(item.name);
      counts[item.name] = normalizedStorageCopyRowsForGame_(
        sh,
        archiveSpreadsheet,
        gameId,
        item.entityType
      );
    });

    const questionIds = normalizedStorageGetQuestionSetup_(gameId)
      .questions
      .map(function(question) {
        return normalizedStorageKey_(question.QuestionId);
      });

    counts[CATEGORY_SETTINGS_SHEET] =
      normalizedStorageCopySettingsByQuestionIds_(
        source,
        archiveSpreadsheet,
        gameId,
        questionIds
      );

    const verificationErrors = Object.keys(counts)
      .filter(function(sheetName) {
        return !counts[sheetName] || counts[sheetName].verified !== true;
      })
      .map(function(sheetName) {
        const item = counts[sheetName] || {};
        return {
          sheetName: sheetName,
          error: item.error || "Archive verification failed",
          sourceCount: Number(item.count || 0),
          targetCount: Number(item.targetCount || 0),
          sourceHash: item.sourceHash || "",
          targetHash: item.targetHash || ""
        };
      });
    const verified = verificationErrors.length === 0;
    const now = new Date();
    const archiveRecordId = gameId + "-" + Utilities.formatDate(
      now,
      Session.getScriptTimeZone(),
      "yyyyMMdd-HHmmss"
    );
    const manifestSheet = normalizedStorageEnsureSheet_(
      ARCHIVE_MANIFEST_SHEET,
      ARCHIVE_MANIFEST_HEADERS
    );
    const manifestHeaders = normalizedStorageGetHeaders_(manifestSheet);
    const manifestObject = {
      ArchiveId: archiveRecordId,
      GameId: gameId,
      GameName: gameName,
      Year: year,
      ArchiveSpreadsheetId: archiveId,
      ArchiveSpreadsheetUrl: archiveSpreadsheet.getUrl(),
      Status: verified ? "VERIFIED_COPY" : "FAILED_VERIFICATION",
      Mode: mode,
      EntityCountsJSON: JSON.stringify(counts),
      SourceSpreadsheetId: source.getId(),
      ArchivedAt: now,
      VerifiedAt: verified ? now : "",
      VerificationErrorsJSON: JSON.stringify(verificationErrors),
      ReadinessJSON: JSON.stringify(readiness),
      Notes: payload.notes || (
        verified
          ? "Archive copy verified by row counts and content hashes."
          : "Archive copy failed verification; source data was not removed."
      )
    };

    manifestSheet.appendRow(
      normalizedStorageObjectRow_(manifestHeaders, manifestObject)
    );

    if (verified && mode === "MOVE") {
      normalizedStorageDeleteGameRowsAfterArchive_(gameId, questionIds);
    }

    normalizedStorageClearCaches_();

    return {
      success: verified,
      gameId: gameId,
      archiveSpreadsheetId: archiveId,
      archiveSpreadsheetUrl: archiveSpreadsheet.getUrl(),
      mode: mode,
      counts: counts,
      verified: verified,
      readiness: readiness,
      verificationErrors: verificationErrors,
      message: verified
        ? "Archive copy verified."
        : "Archive copy failed verification; no source rows were removed."
    };
  } finally {
    lock.releaseLock();
  }
}

function normalizedStorageSettingsAllowedMap_(questionIds) {
  const allowed = {};

  (questionIds || []).forEach(function(questionId) {
    const key = normalizedStorageKey_(questionId);
    if (key) {
      allowed[key] = true;
    }
  });

  return allowed;
}

function normalizedStorageSettingsRowMatchesGame_(
  row,
  col,
  gameId,
  allowed,
  questionGameMap
) {
  const questionId = col.CategoryId === undefined
    ? ""
    : normalizedStorageKey_(row[col.CategoryId]);
  const rowGameId = col.GameId === undefined
    ? ""
    : normalizedStorageString_(row[col.GameId]);

  if (rowGameId) {
    return rowGameId === gameId;
  }

  if (!questionId || !allowed[questionId]) {
    return false;
  }

  const gameMap = questionGameMap[questionId] || {};
  const gameIds = Object.keys(gameMap);

  return gameIds.length === 1 && gameIds[0] === gameId;
}

function normalizedStorageReadSettingsRowsForGame_(
  sheet,
  gameId,
  questionIds,
  questionGameMap
) {
  if (!sheet || sheet.getLastRow() <= 1) {
    return {
      headers: sheet ? normalizedStorageGetHeaders_(sheet) : [],
      rows: [],
      ambiguousCount: 0
    };
  }

  const headers = normalizedStorageGetHeaders_(sheet);
  const col = normalizedStorageHeaderMap_(headers);
  const allowed = normalizedStorageSettingsAllowedMap_(questionIds);
  const rows = [];
  const rowNumbers = [];
  let ambiguousCount = 0;

  if (col.CategoryId === undefined) {
    return {
      headers: headers,
      rows: [],
      ambiguousCount: 0,
      error: "CategorySettings.CategoryId is missing"
    };
  }

  const rowCount = sheet.getLastRow() - 1;
  const questionValues = sheet.getRange(
    2,
    col.CategoryId + 1,
    rowCount,
    1
  ).getValues();
  const gameValues = col.GameId === undefined
    ? new Array(rowCount).fill([""])
    : sheet.getRange(2, col.GameId + 1, rowCount, 1).getValues();

  for (let i = 0; i < rowCount; i++) {
    const questionId = normalizedStorageKey_(questionValues[i][0]);
    const rowGameId = normalizedStorageString_(gameValues[i][0]);

    if (rowGameId) {
      if (rowGameId === gameId) {
        rowNumbers.push(i + 2);
      }
      continue;
    }

    if (!questionId || !allowed[questionId]) {
      continue;
    }

    const gameMap = (questionGameMap || {})[questionId] || {};
    const gameIds = Object.keys(gameMap);

    if (gameIds.length > 1) {
      ambiguousCount += 1;
      continue;
    }

    if (gameIds.length === 1 && gameIds[0] === gameId) {
      rowNumbers.push(i + 2);
    }
  }

  normalizedStorageConsolidateRows_(rowNumbers).forEach(function(range) {
    const values = sheet.getRange(
      range.start,
      1,
      range.end - range.start + 1,
      headers.length
    ).getValues();

    values.forEach(function(row) {
      rows.push(row);
    });
  });

  return {
    headers: headers,
    rows: rows,
    rowNumbers: rowNumbers,
    ambiguousCount: ambiguousCount
  };
}

function normalizedStorageCopySettingsByQuestionIds_(
  sourceSpreadsheet,
  targetSpreadsheet,
  gameId,
  questionIds
) {
  const sourceSheet = sourceSpreadsheet.getSheetByName(
    CATEGORY_SETTINGS_SHEET
  );

  if (!sourceSheet || sourceSheet.getLastRow() <= 1) {
    return {
      count: 0,
      targetCount: 0,
      sourceHash: normalizedStorageArchiveHash_([], []),
      targetHash: normalizedStorageArchiveHash_([], []),
      verified: true
    };
  }

  const questionGameMap = normalizedStorageBuildQuestionGameMap_();
  const sourceData = normalizedStorageReadSettingsRowsForGame_(
    sourceSheet,
    gameId,
    questionIds,
    questionGameMap
  );

  if (sourceData.error || sourceData.ambiguousCount > 0) {
    return {
      count: 0,
      targetCount: 0,
      sourceHash: "",
      targetHash: "",
      verified: false,
      error: sourceData.error || (
        sourceData.ambiguousCount +
        " CategorySettings row(s) have blank GameId and an ambiguous QuestionId"
      )
    };
  }

  const sourceHeaders = sourceData.headers;
  const sourceRows = sourceData.rows;
  const sourceHash = normalizedStorageArchiveHash_(
    sourceHeaders,
    sourceRows
  );
  let targetSheet = targetSpreadsheet.getSheetByName(
    CATEGORY_SETTINGS_SHEET
  );

  if (!targetSheet) {
    targetSheet = targetSpreadsheet.insertSheet(CATEGORY_SETTINGS_SHEET);
  }

  const targetHeaders = normalizedStorageEnsureArchiveHeaders_(
    targetSheet,
    sourceHeaders
  );
  const existingTarget = normalizedStorageReadSettingsRowsForGame_(
    targetSheet,
    gameId,
    questionIds,
    questionGameMap
  );

  if (existingTarget.error) {
    return {
      count: sourceRows.length,
      targetCount: 0,
      sourceHash: sourceHash,
      targetHash: "",
      verified: false,
      error: existingTarget.error
    };
  }

  if (existingTarget.rows.length) {
    const allTargetData = targetSheet.getDataRange().getValues();
    const targetCol = normalizedStorageHeaderMap_(
      allTargetData[0].map(normalizedStorageString_)
    );
    const allowed = normalizedStorageSettingsAllowedMap_(questionIds);
    const rowsToDelete = [];

    for (let i = 1; i < allTargetData.length; i++) {
      if (normalizedStorageSettingsRowMatchesGame_(
        allTargetData[i],
        targetCol,
        gameId,
        allowed,
        questionGameMap
      )) {
        rowsToDelete.push(i + 1);
      }
    }

    normalizedStorageDeleteRows_(targetSheet, rowsToDelete);
  }

  if (sourceRows.length) {
    const sourceObjects = sourceRows.map(function(row) {
      return normalizedStorageLegacyRowObject_(sourceHeaders, row);
    });
    const targetRows = sourceObjects.map(function(object) {
      return normalizedStorageObjectRow_(targetHeaders, object);
    });

    targetSheet.getRange(
      targetSheet.getLastRow() + 1,
      1,
      targetRows.length,
      targetHeaders.length
    ).setValues(targetRows);
  }

  SpreadsheetApp.flush();

  const targetData = normalizedStorageReadSettingsRowsForGame_(
    targetSheet,
    gameId,
    questionIds,
    questionGameMap
  );
  const targetCanonicalRows = targetData && targetData.rows
    ? normalizedStorageCanonicalArchiveRows_(
        sourceHeaders,
        targetData.headers,
        targetData.rows
      )
    : [];
  const targetHash = normalizedStorageArchiveHash_(
    sourceHeaders,
    targetCanonicalRows
  );

  return {
    count: sourceRows.length,
    targetCount: targetCanonicalRows.length,
    sourceHash: sourceHash,
    targetHash: targetHash,
    verified:
      sourceRows.length === targetCanonicalRows.length &&
      sourceHash === targetHash
  };
}

function normalizedStorageDeleteGameRowsAfterArchive_(gameId, questionIds) {
  const source = SpreadsheetApp.getActive();
  const questionGameMap = normalizedStorageBuildQuestionGameMap_();
  const deletable = [
    QUESTIONS_SHEET,
    QUESTION_OPTIONS_SHEET,
    CATEGORIES_SHEET,
    CATEGORY_RESULTS_SHEET,
    PICKS_SHEET,
    typeof BETS_SHEET !== "undefined" ? BETS_SHEET : "Bets"
  ];

  deletable.forEach(function(sheetName) {
    const sh = source.getSheetByName(sheetName);
    if (!sh) {
      return;
    }

    const rows = normalizedStorageFindRowsByGame_(sh, gameId);
    normalizedStorageDeleteRows_(sh, rows);
  });

  const settingsSheet = source.getSheetByName(CATEGORY_SETTINGS_SHEET);

  if (settingsSheet && settingsSheet.getLastRow() > 1) {
    const data = settingsSheet.getDataRange().getValues();
    const headers = data[0].map(normalizedStorageString_);
    const col = normalizedStorageHeaderMap_(headers);
    const allowed = normalizedStorageSettingsAllowedMap_(questionIds);
    const rows = [];

    for (let i = 1; i < data.length; i++) {
      if (normalizedStorageSettingsRowMatchesGame_(
        data[i],
        col,
        gameId,
        allowed,
        questionGameMap
      )) {
        rows.push(i + 1);
      }
    }

    normalizedStorageDeleteRows_(settingsSheet, rows);
  }

  normalizedStorageRebuildIndexForSheet_(QUESTIONS_SHEET, "Questions");
  normalizedStorageRebuildIndexForSheet_(
    QUESTION_OPTIONS_SHEET,
    "QuestionOptions"
  );
  normalizedStorageRebuildIndexForSheet_(
    CATEGORIES_SHEET,
    "LegacyCategories"
  );
}

function apiAdminArchiveGameData(payload) {
  payload = payload || {};
  requireAdmin_(payload);
  return archiveGameData(payload);
}
