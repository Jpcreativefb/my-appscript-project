/* =====================================================
   QUESTION MODE STORAGE

   One small, dedicated table stores the scoring mode for each question.
   This keeps ScoreMode out of the normalized Questions sheet and prevents
   question/answer saves from shifting or rewriting unrelated columns.
===================================================== */

const QUESTION_MODES_SHEET = "QuestionModes";
const QUESTION_MODES_HEADERS = [
  "GameId",
  "QuestionId",
  "ScoreMode",
  "UpdatedAt",
  "Source"
];

function questionModeString_(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function questionModeKey_(value) {
  return questionModeString_(value).toLowerCase();
}

function questionModeNormalize_(value) {
  const mode = questionModeKey_(value || "fixed-points").replace(/_/g, "-");

  if (mode === "correct-pick") return "fixed-points";
  if (
    mode === "bet" ||
    mode === "betting" ||
    mode === "sports-wager" ||
    mode === "wager-odds"
  ) {
    return "wager";
  }

  return mode || "fixed-points";
}

function questionModeIsRecognized_(value) {
  const mode = questionModeNormalize_(value);
  return [
    "fixed-points",
    "confidence-points",
    "staked-points",
    "wager",
    "ranking"
  ].indexOf(mode) !== -1;
}

function questionModeHeaderMap_(headers) {
  const map = {};
  (headers || []).forEach(function(header, index) {
    const key = questionModeKey_(header);
    if (key && map[key] === undefined) map[key] = index;
  });
  return map;
}

function questionModeRowLooksV115Shifted_(headers, row) {
  const col = questionModeHeaderMap_(headers || []);
  if (
    col.gameid === undefined ||
    col.entrytype === undefined ||
    col.storageversion === undefined ||
    col.scoremode === undefined
  ) {
    return false;
  }

  const gameId = questionModeString_(row[col.gameid]);
  const entryCell = row[col.entrytype];
  const storageCell = row[col.storageversion];
  const scoreCell = row[col.scoremode];
  const storageNumber = Number(storageCell);
  const scoreNumber = Number(scoreCell);
  const scoreText = questionModeString_(scoreCell);

  return Boolean(
    gameId &&
    (
      (scoreText !== "" && Number.isFinite(scoreNumber) && scoreNumber > 0) ||
      (questionModeIsRecognized_(entryCell) && !Number.isFinite(storageNumber))
    )
  );
}

function questionModeEnsureSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(QUESTION_MODES_SHEET);

  if (!sh) sh = ss.insertSheet(QUESTION_MODES_SHEET);

  const lastColumn = Math.max(sh.getLastColumn(), 1);
  let headers = sh.getLastRow() >= 1
    ? sh.getRange(1, 1, 1, lastColumn).getValues()[0].map(questionModeString_)
    : [];

  if (!headers.some(function(value) { return value !== ""; })) {
    sh.getRange(1, 1, 1, QUESTION_MODES_HEADERS.length)
      .setValues([QUESTION_MODES_HEADERS]);
    headers = QUESTION_MODES_HEADERS.slice();
  }

  const missing = QUESTION_MODES_HEADERS.filter(function(header) {
    return headers.indexOf(header) === -1;
  });

  if (missing.length) {
    sh.getRange(1, headers.length + 1, 1, missing.length)
      .setValues([missing]);
  }

  return sh;
}

function questionModeReadMapForGame_(gameId) {
  gameId = questionModeString_(gameId);
  const map = {};
  if (!gameId) return map;

  const sh = questionModeEnsureSheet_();
  if (sh.getLastRow() <= 1) return map;

  const headers = sh.getRange(1, 1, 1, sh.getLastColumn())
    .getValues()[0]
    .map(questionModeString_);
  const col = questionModeHeaderMap_(headers);
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length)
    .getValues();

  rows.forEach(function(row) {
    if (questionModeString_(row[col.gameid]) !== gameId) return;
    const questionId = questionModeKey_(row[col.questionid]);
    const scoreMode = questionModeNormalize_(row[col.scoremode]);
    if (questionId && questionModeIsRecognized_(scoreMode)) {
      map[questionId] = scoreMode;
    }
  });

  return map;
}

function questionModeGet_(gameId, questionId, fallback) {
  const map = questionModeReadMapForGame_(gameId);
  const key = questionModeKey_(questionId);
  return map[key] || questionModeNormalize_(fallback || "fixed-points");
}

function questionModeUpsert_(gameId, questionId, scoreMode, source) {
  gameId = questionModeString_(gameId);
  questionId = questionModeKey_(questionId);
  scoreMode = questionModeNormalize_(scoreMode);

  if (!gameId || !questionId) {
    throw new Error("GameId and QuestionId are required for Question Mode.");
  }
  if (!questionModeIsRecognized_(scoreMode)) {
    throw new Error("Unsupported Score Mode: " + scoreMode);
  }

  const sh = questionModeEnsureSheet_();
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn())
    .getValues()[0]
    .map(questionModeString_);
  const col = questionModeHeaderMap_(headers);
  const now = new Date();
  const values = new Array(headers.length).fill("");

  values[col.gameid] = gameId;
  values[col.questionid] = questionId;
  values[col.scoremode] = scoreMode;
  values[col.updatedat] = now;
  values[col.source] = questionModeString_(source || "admin-game-setup");

  let matched = 0;
  if (sh.getLastRow() > 1) {
    const rows = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length)
      .getValues();

    rows.forEach(function(row, index) {
      if (
        questionModeString_(row[col.gameid]) === gameId &&
        questionModeKey_(row[col.questionid]) === questionId
      ) {
        sh.getRange(index + 2, 1, 1, headers.length).setValues([values]);
        matched++;
      }
    });
  }

  if (!matched) sh.appendRow(values);

  try {
    if (typeof clearAppCaches === "function") clearAppCaches();
    if (typeof normalizedStorageClearCaches_ === "function") {
      normalizedStorageClearCaches_();
    }
  } catch (err) {
    Logger.log("Question Mode cache clear warning: " + err);
  }

  return {
    success: true,
    gameId: gameId,
    questionId: questionId,
    scoreMode: scoreMode,
    rowsUpdated: matched || 1
  };
}

function questionModeBackfillFromCategorySettings_(onlyMissing) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(
    typeof CATEGORY_SETTINGS_SHEET !== "undefined"
      ? CATEGORY_SETTINGS_SHEET
      : "CategorySettings"
  );

  if (!sh || sh.getLastRow() <= 1) {
    return { scanned: 0, saved: 0 };
  }

  const headers = sh.getRange(1, 1, 1, sh.getLastColumn())
    .getValues()[0]
    .map(questionModeString_);
  const col = questionModeHeaderMap_(headers);

  if (
    col.gameid === undefined ||
    col.categoryid === undefined ||
    col.scoremode === undefined
  ) {
    return { scanned: 0, saved: 0 };
  }

  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length)
    .getValues();
  const existingByGame = {};
  let saved = 0;

  rows.forEach(function(row) {
    const gameId = questionModeString_(row[col.gameid]);
    const questionId = questionModeKey_(row[col.categoryid]);
    const scoreMode = questionModeNormalize_(row[col.scoremode]);

    if (!gameId || !questionId || !questionModeIsRecognized_(scoreMode)) return;

    if (onlyMissing) {
      if (!existingByGame[gameId]) {
        existingByGame[gameId] = questionModeReadMapForGame_(gameId);
      }
      if (existingByGame[gameId][questionId]) return;
    }

    questionModeUpsert_(gameId, questionId, scoreMode, "category-settings-backfill");
    if (!existingByGame[gameId]) existingByGame[gameId] = {};
    existingByGame[gameId][questionId] = scoreMode;
    saved++;
  });

  return { scanned: rows.length, saved: saved };
}

function questionModeBackupName_(baseName) {
  const stamp = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || "GMT",
    "yyyyMMdd_HHmmss"
  );
  return baseName + "_Backup_" + stamp;
}

/*
  ONE-TIME REPAIR FOR v1.0.15

  v1.0.15 inserted ScoreMode into the in-code Questions header array, while
  existing spreadsheets appended the new column at the far right. New rows
  could therefore shift every field after SelectionMode into the wrong
  column. This repair backs up Questions, removes affected game rows,
  restores them from the legacy Categories projection, and removes the
  appended ScoreMode column. Score modes remain in CategorySettings and the
  dedicated QuestionModes sheet.
*/
function repairQuestionsSheetAfterV115Now() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Questions");

  if (!sh) {
    throw new Error("Questions sheet was not found.");
  }

  const backup = sh.copyTo(ss);
  const backupName = questionModeBackupName_("Questions");
  backup.setName(backupName);

  const headers = sh.getRange(1, 1, 1, sh.getLastColumn())
    .getValues()[0]
    .map(questionModeString_);
  const col = questionModeHeaderMap_(headers);
  const scoreModeCol = col.scoremode;
  const storageVersionCol = col.storageversion;
  const entryTypeCol = col.entrytype;
  const gameIdCol = col.gameid;
  const questionIdCol = col.questionid;

  questionModeEnsureSheet_();
  const categoryBackfill = questionModeBackfillFromCategorySettings_(false);

  if (scoreModeCol === undefined) {
    return {
      success: true,
      message: "Questions already uses the original schema.",
      backupSheet: backupName,
      affectedGames: [],
      categoryModesSaved: categoryBackfill.saved
    };
  }

  const rows = sh.getLastRow() > 1
    ? sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues()
    : [];
  const affectedGames = {};
  const safeModes = [];

  rows.forEach(function(row) {
    const gameId = questionModeString_(row[gameIdCol]);
    const questionId = questionModeKey_(row[questionIdCol]);
    const scoreCell = row[scoreModeCol];
    const storageCell = storageVersionCol !== undefined
      ? row[storageVersionCol]
      : "";
    const entryCell = entryTypeCol !== undefined ? row[entryTypeCol] : "";
    const malformed = questionModeRowLooksV115Shifted_(headers, row);

    if (malformed) {
      affectedGames[gameId] = true;
      return;
    }

    if (
      gameId &&
      questionId &&
      questionModeIsRecognized_(scoreCell)
    ) {
      safeModes.push({
        gameId: gameId,
        questionId: questionId,
        scoreMode: questionModeNormalize_(scoreCell)
      });
    }
  });

  safeModes.forEach(function(item) {
    const existing = questionModeReadMapForGame_(item.gameId);
    if (!existing[item.questionId]) {
      questionModeUpsert_(
        item.gameId,
        item.questionId,
        item.scoreMode,
        "questions-v115-recovery"
      );
    }
  });

  const affectedGameIds = Object.keys(affectedGames);

  if (affectedGameIds.length && sh.getLastRow() > 1) {
    const rowsToDelete = [];
    rows.forEach(function(row, index) {
      if (affectedGames[questionModeString_(row[gameIdCol])]) {
        rowsToDelete.push(index + 2);
      }
    });

    rowsToDelete.sort(function(a, b) { return b - a; }).forEach(function(rowNumber) {
      sh.deleteRow(rowNumber);
    });
  }

  /* Restore the original Questions schema exactly. */
  sh.deleteColumn(scoreModeCol + 1);

  affectedGameIds.forEach(function(gameId) {
    if (typeof normalizedStorageSyncGameFromLegacy_ === "function") {
      normalizedStorageSyncGameFromLegacy_(gameId, { force: true });
    }
  });

  if (typeof normalizedStorageRebuildIndexForSheet_ === "function") {
    normalizedStorageRebuildIndexForSheet_("Questions", "Questions");
  }
  if (typeof normalizedStorageClearCaches_ === "function") {
    normalizedStorageClearCaches_();
  }

  SpreadsheetApp.flush();

  return {
    success: true,
    message: "Questions schema restored. Reopen Game Setup and set each Hybrid question mode once.",
    backupSheet: backupName,
    affectedGames: affectedGameIds,
    safeQuestionModesSaved: safeModes.length,
    categoryModesSaved: categoryBackfill.saved
  };
}
