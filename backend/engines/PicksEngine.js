/* =========================
   PICKS DATABASE
   Production Version
========================= */

/* =========================================================
   HELPERS
========================================================= */

function getPicksColumnMap_(headers){

  return {
    gameId: headers.indexOf("GameId"),
    timestamp: headers.indexOf("Timestamp"),
    username: headers.indexOf("Username"),
    category: headers.indexOf("CategoryId"),
    nominee: headers.indexOf("NomineeId"),
    points: headers.indexOf("Points"),
    original: headers.indexOf("OriginalNomineeId"),
    changes: headers.indexOf("ChangeCount"),
    lastUpdated: headers.indexOf("LastUpdated"),
    confidencePoints: headers.indexOf("ConfidencePoints"),
    stakePoints: headers.indexOf("StakePoints")
  };

}

function validatePickColumns_(col){

  const required = [
    "gameId",
    "timestamp",
    "username",
    "category",
    "nominee",
    "points",
    "original",
    "changes",
    "lastUpdated"
  ];

  const missing =
    required
      .filter(key =>
        col[key] === -1
      );

  if (missing.length) {

    throw new Error(
      "Missing Picks headers: " +
      missing.join(", ")
    );

  }

}

function normalizeString_(value){

  return String(value || "")
    .trim();

}

function normalizeLower_(value){

  return normalizeString_(value)
    .toLowerCase();

}

function normalizePickNumber_(
  value,
  fallback
) {

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {

    return fallback;

  }

  const num =
    Number(value);

  return isNaN(num)
    ? fallback
    : num;

}

function getPickConfidencePoints_(
  row,
  col
) {

  if (
    !col ||
    col.confidencePoints === -1
  ) {
    return 0;
  }

  return normalizePickNumber_(
    row[col.confidencePoints],
    0
  );

}

function getPickStakePoints_(
  row,
  col
) {

  if (
    !col ||
    col.stakePoints === -1
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      normalizePickNumber_(
        row[col.stakePoints],
        0
      )
    )
  );

}

function normalizeStakePoints_(value) {

  return Math.max(
    0,
    Math.floor(
      normalizePickNumber_(
        value,
        0
      )
    )
  );

}

function normalizeConfidencePoints_(
  value
) {

  const points =
    normalizePickNumber_(
      value,
      0
    );

  if (points < 0) {
    return 0;
  }

  return Math.floor(
    points
  );

}

function hasDuplicateConfidencePoints_(
  gameId,
  username,
  categoryId,
  confidencePoints,
  settings,
  isConfidenceGame
) {

  confidencePoints =
    normalizeConfidencePoints_(
      confidencePoints
    );

  if (confidencePoints <= 0) {
    return false;
  }

  const data =
    typeof PicksRepo.getPicksForGame === "function"
      ? PicksRepo.getPicksForGame(gameId)
      : PicksRepo.getAllPicks();

  if (!data || data.length <= 1) {
    return false;
  }

  const headers =
    data[0];

  const col =
    getPicksColumnMap_(
      headers
    );

  if (
    !col ||
    col.confidencePoints === -1
  ) {
    return false;
  }

  const targetGameId =
    normalizeString_(
      gameId
    );

  const targetUsername =
    normalizeLower_(
      username
    );

  const targetCategoryId =
    normalizeLower_(
      categoryId
    );

  settings =
    settings ||
    getCategorySettings(targetGameId);

  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    const row =
      data[i];

    const rowGameId =
      normalizeString_(
        row[col.gameId]
      );

    if (rowGameId !== targetGameId) {
      continue;
    }

    const rowUsername =
      normalizeLower_(
        row[col.username]
      );

    if (rowUsername !== targetUsername) {
      continue;
    }

    const rowCategoryId =
      normalizeLower_(
        row[col.category]
      );

    if (rowCategoryId === targetCategoryId) {
      continue;
    }

    const rowCategoryConfig =
      settings[rowCategoryId] || {};

    const rowScoreMode =
      typeof normalizeCategoryScoreMode_ === "function"
        ? normalizeCategoryScoreMode_(
            rowCategoryConfig.scoreMode
          )
        : normalizeLower_(
            rowCategoryConfig.scoreMode || "correct-pick"
          );

    const rowUsesConfidencePoints =
      rowScoreMode === "confidence-points" ||
      (
        isConfidenceGame === true &&
        rowScoreMode === "correct-pick"
      );

    if (!rowUsesConfidencePoints) {
      continue;
    }

    const rowConfidencePoints =
      normalizeConfidencePoints_(
        row[col.confidencePoints]
      );

    if (
      rowConfidencePoints === confidencePoints
    ) {

      return true;

    }

  }

  return false;

}

/* =========================================================
   PICK META HELPERS
========================================================= */

function isCategoryConfigLocked_(config) {

  if (!config) {
    return false;
  }

  const manualLocked =
    config.locked === true ||
    String(config.locked)
      .toLowerCase() === "true";

  if (manualLocked) {
    return true;
  }

  if (!config.lockDateTime) {
    return false;
  }

  const lockDate =
    new Date(config.lockDateTime);

  if (isNaN(lockDate.getTime())) {
    return false;
  }

  return new Date().getTime() >= lockDate.getTime();

}

function getMaxChanges_(config) {

  const raw =
    Number(config.maxChanges);

  return isNaN(raw)
    ? 3
    : raw;

}

function getAdjustedPickPoints_(
  config,
  changeCount
) {

  const basePoints =
    Number(config.points) || 0;

  const penalty =
    Number(config.changePenalty) || 0;

  return Math.max(
    basePoints -
    (
      Number(changeCount || 0) *
      penalty
    ),
    0
  );

}

function getPickResultStatus_(
  config,
  nomineeId
) {

  const winner =
    normalizeLower_(
      config.winnerNomineeId || ""
    );

  const pick =
    normalizeLower_(
      nomineeId || ""
    );

  if (!winner || !pick) {
    return "pending";
  }

  return winner === pick
    ? "correct"
    : "wrong";

}

function buildPickMeta_(
  categoryId,
  nomineeId,
  config,
  changeCount,
  originalNomineeId
) {

  config =
    config || {};

  const maxChanges =
    getMaxChanges_(config);

  const safeChangeCount =
    Number(changeCount) || 0;

  const basePoints =
    Number(config.points) || 0;

  const penalty =
    Number(config.changePenalty) || 0;

  const adjustedPoints =
    getAdjustedPickPoints_(
      config,
      safeChangeCount
    );

  return {
    categoryId:
      categoryId,

    nomineeId:
      nomineeId || "",

    originalNomineeId:
      originalNomineeId || "",

    changeCount:
      safeChangeCount,

    maxChanges:
      maxChanges,

    unlimitedChanges:
      maxChanges < 0,

    changesLeft:
      maxChanges < 0
        ? null
        : Math.max(maxChanges - safeChangeCount, 0),

    basePoints:
      basePoints,

    adjustedPoints:
      adjustedPoints,

    changePenalty:
      penalty,

    locked:
      isCategoryConfigLocked_(config),

    winnerNomineeId:
      config.winnerNomineeId || "",

    status:
      getPickResultStatus_(
        config,
        nomineeId
      )
  };

}


/* =========================================================
   GET USER PICKS
========================================================= */

function getUserPicks(username, gameId){

  if (!username) return [];

  gameId =
    gameId ||
    getDefaultGameId();

  const data =
    typeof PicksRepo.getPicksForGame === "function"
      ? PicksRepo.getPicksForGame(gameId)
      : PicksRepo.getAllPicks();

  if (data.length <= 1) {
    return [];
  }

  const headers = data[0];
  const col = getPicksColumnMap_(headers);

  validatePickColumns_(col);

  const userSearch =
    normalizeLower_(username);

  const latest = {};

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const rowGameId =
      normalizeString_(row[col.gameId]);

    if (rowGameId !== gameId) continue;

    const rowUser =
      normalizeLower_(row[col.username]);

    if (rowUser !== userSearch) continue;

    const categoryId =
      normalizeString_(row[col.category]);

    if (!categoryId) continue;

    const ts =
      new Date(row[col.lastUpdated] || row[col.timestamp]);

    if (
      !latest[categoryId] ||
      latest[categoryId].timestamp < ts
    ) {

      latest[categoryId] = {
        categoryId:
          categoryId,
      
        nomineeId:
          normalizeString_(
            row[col.nominee]
          ),
      
        points:
          Number(
            row[col.points]
          ) || 0,
      
        confidencePoints:
          getPickConfidencePoints_(
            row,
            col
          ),

        stakePoints:
          getPickStakePoints_(
            row,
            col
          ),
      
        originalNomineeId:
          normalizeString_(
            row[col.original]
          ),
      
        changeCount:
          Number(
            row[col.changes]
          ) || 0,
      
        timestamp:
          ts
      };

    }

  }

  return Object.values(latest);

}

/* =========================================================
   API GET PICKS
========================================================= */

function apiGetMyPicks(username, gameId) {

  try {

    if (!username) {

      return {
        success: false,
        message: "Missing username",
        picks: {},
        changeCounts: {},
        originalPicks: {},
        confidencePoints: {},
        stakePoints: {},
        stakeSummary: {},
        pickMeta: {}
      };

    }

    gameId =
      gameId ||
      getDefaultGameId();

    const picksData =
      getUserPicks(
        username,
        gameId
      );

    const settings =
      typeof getCategorySettingsCached === "function"
        ? getCategorySettingsCached(gameId)
        : getCategorySettings(gameId);

    const gameConfig =
      typeof getGameRuntimeConfig === "function"
        ? getGameRuntimeConfig(gameId)
        : getGame(gameId);

    const picks = {};
    const changeCounts = {};
    const originalPicks = {};
    const confidencePoints = {};
    const stakePoints = {};
    const pickMeta = {};

    picksData.forEach(p => {

      const config =
        settings[p.categoryId] || {};

      picks[p.categoryId] =
        p.nomineeId;

      changeCounts[p.categoryId] =
        p.changeCount || 0;

      originalPicks[p.categoryId] =
        p.originalNomineeId || "";

      confidencePoints[p.categoryId] =
        p.confidencePoints || 0;

      stakePoints[p.categoryId] =
        p.stakePoints || 0;

      pickMeta[p.categoryId] =
        buildPickMeta_(
          p.categoryId,
          p.nomineeId,
          config,
          p.changeCount,
          p.originalNomineeId
        );

    });

    return {
      success: true,
      gameId: gameId,
      username: username,
      picks: picks,
      changeCounts: changeCounts,
      originalPicks: originalPicks,
      confidencePoints: confidencePoints,
      stakePoints: stakePoints,
      stakeSummary:
        gameConfig &&
        gameConfig.stakedPointsEnabled === true &&
        typeof getStakedPredictionSummary_ === "function"
          ? getStakedPredictionSummary_(
              username,
              gameId,
              {
                picks: picksData,
                settings: settings
              }
            )
          : {},
      pickMeta: pickMeta
    };

  } catch (err) {

    Logger.log(
      "🚨 apiGetMyPicks ERROR: " +
      err.message
    );

    return {
      success: false,
      error: true,
      message: err.message,
      picks: {},
      changeCounts: {},
      originalPicks: {},
      confidencePoints: {},
      stakePoints: {},
      stakeSummary: {},
      pickMeta: {}
    };

  }

}

/* =========================================================
   USER BREAKDOWN
========================================================= */

function getUserBreakdown(username, gameId){

  if (!username) {
    return [];
  }

  gameId =
    gameId ||
    getDefaultGameId();

  const picks =
    getUserPicks(username, gameId);

  const settings =
    getCategorySettings(gameId);

  return picks.map(p => {

    const config =
      settings[p.categoryId] || {};

    const meta =
      buildPickMeta_(
        p.categoryId,
        p.nomineeId,
        config,
        p.changeCount,
        p.originalNomineeId
      );

    return {
      category:
        p.categoryId,

      pick:
        p.nomineeId,

      winner:
        config.winnerNomineeId || "",

      status:
        meta.status,

      points:
        meta.basePoints,

      adjustedPoints:
        meta.adjustedPoints,

      changePenalty:
        meta.changePenalty,

      maxChanges:
        meta.maxChanges,

      changesLeft:
        meta.changesLeft,

      originalNomineeId:
        p.originalNomineeId || "",

      changeCount:
        p.changeCount || 0,

      locked:
        meta.locked,

      scoreMode:
        typeof normalizeCategoryScoreMode_ === "function"
          ? normalizeCategoryScoreMode_(config.scoreMode)
          : normalizeLower_(config.scoreMode || "correct-pick"),

      confidencePoints:
        p.confidencePoints || 0,

      stakePoints:
        p.stakePoints || 0
    };

  });

}

/* =========================================================
   SAVE PICK
========================================================= */

function isFixedPointPredictionEnabledForGame_(gameConfig) {

  if (!gameConfig) {
    return true;
  }

  const type =
    normalizeLower_(gameConfig.type || "");

  const format =
    normalizeLower_(gameConfig.gameFormat || "");

  const isHybrid =
    type === "mixed" ||
    type === "hybrid" ||
    type === "combo" ||
    format === "hybrid" ||
    gameConfig.mixedGame === true;

  /*
    Standard Predictions in a Hybrid game historically used two flags:
    PredictionEnabled and FixedPointsEnabled. Treat either enabled flag as
    authorizing fixed-point picks so older Hybrid rows remain playable.
  */
  return (
    gameConfig.fixedPointsEnabled !== false ||
    (
      isHybrid &&
      gameConfig.predictionEnabled === true
    )
  );

}


/* =========================================================
   CONFIDENCE BATCH SAVE — v1.2.17a
   Saves an entire Confidence card in one request so players
   can rank the slate locally before committing it.
========================================================= */

function confidenceBatchUsesPoints_(categoryConfig, isConfidenceGame) {

  categoryConfig = categoryConfig || {};

  const scoreMode =
    typeof normalizeCategoryScoreMode_ === "function"
      ? normalizeCategoryScoreMode_(categoryConfig.scoreMode)
      : normalizeLower_(categoryConfig.scoreMode || "correct-pick");

  return (
    scoreMode === "confidence-points" ||
    (
      isConfidenceGame === true &&
      scoreMode === "correct-pick"
    )
  );

}

function confidenceBatchWriteExistingRows_(sheet, updates, columnCount) {

  updates = Array.isArray(updates) ? updates.slice() : [];
  if (!updates.length) return 0;

  updates.sort(function(a, b) {
    return Number(a.rowNumber || 0) - Number(b.rowNumber || 0);
  });

  let written = 0;
  let index = 0;

  while (index < updates.length) {

    const first = updates[index];
    const startRow = Number(first.rowNumber || 0);
    const rows = [first.row];
    let expectedRow = startRow + 1;
    index++;

    while (
      index < updates.length &&
      Number(updates[index].rowNumber || 0) === expectedRow
    ) {
      rows.push(updates[index].row);
      expectedRow++;
      index++;
    }

    sheet
      .getRange(startRow, 1, rows.length, columnCount)
      .setValues(rows);

    written += rows.length;

  }

  return written;

}

function saveConfidencePicksBatch(payload) {

  let lock = null;
  let lockAcquired = false;

  try {

    payload = payload || {};

    const username = normalizeString_(payload.username);
    const gameId = normalizeString_(payload.gameId || getDefaultGameId());
    const requested = Array.isArray(payload.picks) ? payload.picks : [];

    if (!username || !gameId) {
      return {
        success: false,
        message: "Username and gameId are required"
      };
    }

    if (!requested.length) {
      return {
        success: false,
        message: "No Confidence picks were supplied"
      };
    }

    validateGameId(gameId);

    const gameConfig =
      typeof getGameRuntimeConfig === "function"
        ? getGameRuntimeConfig(gameId)
        : getGame(gameId);

    const isConfidenceGame = !!(
      gameConfig &&
      (
        normalizeLower_(gameConfig.type) === "confidence" ||
        gameConfig.confidenceEnabled === true
      )
    );

    if (!isConfidenceGame) {
      return {
        success: false,
        message: "Confidence gameplay is not enabled for this game"
      };
    }

    const settings =
      typeof getCategorySettingsCached === "function"
        ? getCategorySettingsCached(gameId)
        : getCategorySettings(gameId);

    const categories =
      typeof getCategoriesCached === "function"
        ? getCategoriesCached(gameId)
        : getCategories(gameId);

    const categoryMap = {};
    (categories || []).forEach(function(category) {
      categoryMap[normalizeLower_(category && category.id)] = category;
    });

    const resolutionMap =
      typeof getCategoryResultsResolutionMap === "function"
        ? getCategoryResultsResolutionMap(gameId)
        : (
            typeof getCategoryResultsWinnerMap === "function"
              ? getCategoryResultsWinnerMap(gameId)
              : {}
          );

    const normalizedItems = [];
    const seenCategories = {};

    requested.forEach(function(item) {

      item = item || {};

      const categoryId = normalizeLower_(item.categoryId);
      const nomineeId = normalizeLower_(item.nomineeId);
      const confidencePoints = normalizeConfidencePoints_(item.confidencePoints);

      if (!categoryId || !nomineeId || confidencePoints <= 0) {
        throw new Error(
          "Every Confidence row must include categoryId, nomineeId, and confidencePoints"
        );
      }

      if (seenCategories[categoryId]) {
        throw new Error("Duplicate Confidence category in batch: " + categoryId);
      }

      seenCategories[categoryId] = true;
      normalizedItems.push({
        categoryId: categoryId,
        nomineeId: nomineeId,
        confidencePoints: confidencePoints
      });

    });

    lock = ((typeof LockService.getDocumentLock === "function" ? LockService.getDocumentLock() : null) || LockService.getScriptLock());
    lock.waitLock(3500);
    lockAcquired = true;

    const sheet = getPicksSheet_();
    const data = sheet.getDataRange().getValues();

    if (!data || !data.length) {
      throw new Error("Picks sheet empty");
    }

    const headers = data[0];
    const col = getPicksColumnMap_(headers);
    validatePickColumns_(col);

    if (col.confidencePoints === -1) {
      throw new Error("Picks sheet is missing ConfidencePoints");
    }

    const userSearch = normalizeLower_(username);
    const existingByCategory = {};

    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {

      const row = data[rowIndex];

      if (normalizeString_(row[col.gameId]) !== gameId) continue;
      if (normalizeLower_(row[col.username]) !== userSearch) continue;

      const rowCategoryId = normalizeLower_(row[col.category]);
      if (!rowCategoryId) continue;

      existingByCategory[rowCategoryId] = {
        rowNumber: rowIndex + 1,
        row: row.slice()
      };

    }

    /*
      Build the final Confidence assignment before validating duplicates.
      This is what allows a player to swap 16 and 15 in one Save All request;
      sequential savePick() calls cannot safely perform that swap.
    */
    const finalConfidenceByCategory = {};

    Object.keys(existingByCategory).forEach(function(categoryId) {

      const categoryConfig = settings[categoryId] || {};
      if (!confidenceBatchUsesPoints_(categoryConfig, true)) return;

      const row = existingByCategory[categoryId].row;
      const nomineeId = normalizeLower_(row[col.nominee]);
      const confidencePoints = normalizeConfidencePoints_(row[col.confidencePoints]);

      if (nomineeId && confidencePoints > 0) {
        finalConfidenceByCategory[categoryId] = confidencePoints;
      }

    });

    const validationMeta = {};

    normalizedItems.forEach(function(item) {

      const categoryId = item.categoryId;
      const categoryConfig = settings[categoryId] || null;
      const category = categoryMap[categoryId] || null;

      if (!categoryConfig || !category) {
        throw new Error("Invalid Confidence category: " + categoryId);
      }

      if (!confidenceBatchUsesPoints_(categoryConfig, true)) {
        throw new Error("This question does not use Confidence points: " + categoryId);
      }

      const currentResolution =
        typeof getHybridCategoryResolution_ === "function"
          ? getHybridCategoryResolution_(categoryId, categoryConfig, resolutionMap)
          : {
              resolved: Boolean(categoryConfig.winnerNomineeId)
            };

      if (currentResolution.resolved) {
        throw new Error("This question has already been settled: " + categoryId);
      }

      if (isCategoryConfigLocked_(categoryConfig)) {
        throw new Error("This game has already started and is locked: " + categoryId);
      }

      const nomineeExists = (category.nominees || []).some(function(nominee) {
        return normalizeLower_(nominee && nominee.id) === item.nomineeId;
      });

      if (!nomineeExists) {
        throw new Error("Invalid nominee for Confidence category: " + categoryId);
      }

      const existing = existingByCategory[categoryId] || null;
      const previousNominee = existing
        ? normalizeLower_(existing.row[col.nominee])
        : "";
      const previousConfidencePoints = existing
        ? normalizeConfidencePoints_(existing.row[col.confidencePoints])
        : 0;
      const originalNominee = existing
        ? (
            normalizeLower_(existing.row[col.original]) ||
            previousNominee ||
            item.nomineeId
          )
        : item.nomineeId;
      const changeCount = existing
        ? Number(existing.row[col.changes]) || 0
        : 0;
      const isChange = !!(
        previousNominee &&
        previousNominee !== item.nomineeId
      );

      // Confidence cards stay editable until the individual game's lock time.
      // The kickoff lock, not MaxChanges, is the governing rule.

      validationMeta[categoryId] = {
        categoryConfig: categoryConfig,
        existing: existing,
        previousNominee: previousNominee,
        previousConfidencePoints: previousConfidencePoints,
        originalNominee: originalNominee,
        changeCount: changeCount,
        isChange: isChange
      };

      finalConfidenceByCategory[categoryId] = item.confidencePoints;

    });

    const confidenceOwner = {};

    Object.keys(finalConfidenceByCategory).forEach(function(categoryId) {

      const points = normalizeConfidencePoints_(finalConfidenceByCategory[categoryId]);
      if (points <= 0) return;

      if (
        confidenceOwner[points] &&
        confidenceOwner[points] !== categoryId
      ) {
        throw new Error(
          "Confidence " + points + " is assigned more than once. Each number can only be used once."
        );
      }

      confidenceOwner[points] = categoryId;

    });

    const now = new Date();
    const existingUpdates = [];
    const newRows = [];
    const results = [];
    let savedCount = 0;

    normalizedItems.forEach(function(item) {

      const meta = validationMeta[item.categoryId];
      const existing = meta.existing;
      const isSamePick = meta.previousNominee === item.nomineeId;
      const isConfidenceChange =
        meta.previousConfidencePoints !== item.confidencePoints;
      const changed = !existing || !isSamePick || isConfidenceChange;
      const finalChangeCount = meta.isChange
        ? meta.changeCount + 1
        : meta.changeCount;

      if (existing && changed) {

        const row = existing.row.slice();
        row[col.nominee] = item.nomineeId;
        row[col.lastUpdated] = now;
        row[col.confidencePoints] = item.confidencePoints;

        if (meta.isChange) {
          row[col.changes] = finalChangeCount;
        }

        if (!normalizeLower_(row[col.original])) {
          row[col.original] = meta.originalNominee;
        }

        existingUpdates.push({
          rowNumber: existing.rowNumber,
          row: row
        });

        savedCount++;

      } else if (!existing) {

        const row = new Array(headers.length).fill("");
        row[col.gameId] = gameId;
        row[col.timestamp] = now;
        row[col.username] = username;
        row[col.category] = item.categoryId;
        row[col.nominee] = item.nomineeId;
        row[col.points] = 0;
        row[col.original] = item.nomineeId;
        row[col.changes] = 0;
        row[col.lastUpdated] = now;
        row[col.confidencePoints] = item.confidencePoints;

        if (col.stakePoints !== -1) row[col.stakePoints] = 0;

        newRows.push(row);
        savedCount++;

      }

      results.push({
        success: true,
        categoryId: item.categoryId,
        nomineeId: item.nomineeId,
        confidencePoints: item.confidencePoints,
        originalNomineeId: meta.originalNominee,
        changeCount: finalChangeCount,
        pickMeta: buildPickMeta_(
          item.categoryId,
          item.nomineeId,
          meta.categoryConfig,
          finalChangeCount,
          meta.originalNominee
        )
      });

    });

    confidenceBatchWriteExistingRows_(
      sheet,
      existingUpdates,
      headers.length
    );

    let newStartRow = 0;

    if (newRows.length) {

      newStartRow = sheet.getLastRow() + 1;
      sheet
        .getRange(newStartRow, 1, newRows.length, headers.length)
        .setValues(newRows);

      if (
        typeof normalizedStorageGetIndexEntry_ === "function" &&
        typeof normalizedStorageUpsertIndexEntry_ === "function"
      ) {
        try {
          const prior = normalizedStorageGetIndexEntry_("Picks", gameId);
          const rowNumbers = prior && Array.isArray(prior.rowNumbers)
            ? prior.rowNumbers.slice()
            : [];

          for (let index = 0; index < newRows.length; index++) {
            const rowNumber = newStartRow + index;
            if (rowNumbers.indexOf(rowNumber) === -1) rowNumbers.push(rowNumber);
          }

          normalizedStorageUpsertIndexEntry_({
            entityType: "Picks",
            gameId: gameId,
            sheetName: PICKS_SHEET,
            rowNumbers: rowNumbers
          });
        } catch (indexError) {
          Logger.log("Confidence batch index update skipped: " + indexError);
        }
      }

    }

    SpreadsheetApp.flush();

    if (lockAcquired) {
      lock.releaseLock();
      lockAcquired = false;
    }

    if (
      typeof AppCache !== "undefined" &&
      AppCache &&
      typeof AppCache.clearPicksCaches === "function"
    ) {
      AppCache.clearPicksCaches(gameId, username);
    } else if (typeof clearPicksCaches === "function") {
      clearPicksCaches(gameId, username);
    }

    return {
      success: true,
      gameId: gameId,
      savedCount: savedCount,
      processedCount: results.length,
      results: results
    };

  } catch (err) {

    Logger.log(
      "🚨 saveConfidencePicksBatch ERROR | " +
      err.message
    );

    return {
      success: false,
      message: err.message
    };

  } finally {

    if (lockAcquired && lock) lock.releaseLock();

  }

}

function savePick(payload){

  let lock = null;
  let lockAcquired = false;

  try {

    /* =========================
       VALIDATION
    ========================= */

    if (!payload) {

      return {
        success:false,
        message:"Missing payload"
      };

    }

    const username =
      normalizeString_(
        payload.username
      );

    const categoryId =
      normalizeLower_(
        payload.categoryId
      );

    const nomineeId =
      normalizeLower_(
        payload.nomineeId
      );

    const confidencePoints =
      normalizeConfidencePoints_(
        payload.confidencePoints
      );

    const stakePoints =
      normalizeStakePoints_(
        payload.stakePoints
      );

    const gameId =
      normalizeString_(
        payload.gameId ||
        getDefaultGameId()
      );

    validateGameId(
      gameId
    );

    const gameConfig =
      typeof getGameRuntimeConfig === "function"
        ? getGameRuntimeConfig(
            gameId
          )
        : getGame(
            gameId
          );

    const isConfidenceGame =
      !!(
        gameConfig &&
        (
          gameConfig.type === "confidence" ||
          gameConfig.confidenceEnabled === true
        )
      );

    if (
      !username ||
      !categoryId ||
      !nomineeId ||
      !gameId
    ) {

      return {
        success:false,
        message:"Missing required fields"
      };

    }

    /* =========================
       CATEGORY SETTINGS
    ========================= */

    const settings =
      typeof getCategorySettingsCached === "function"
        ? getCategorySettingsCached(gameId)
        : getCategorySettings(gameId);

    if (!settings[categoryId]) {

      return {
        success:false,
        message:"Invalid categoryId"
      };

    }

    const categoryConfig =
      settings[categoryId] ||
      settings[
        normalizeLower_(
          categoryId
        )
      ] ||
      {};

    const normalizedScoreMode =
      typeof normalizeCategoryScoreMode_ === "function"
        ? normalizeCategoryScoreMode_(
            categoryConfig.scoreMode
          )
        : normalizeLower_(
            categoryConfig.scoreMode || "correct-pick"
          );

    const isStakedPointsCategory =
      normalizedScoreMode === "staked-points";

    const currentResolutionMap =
      typeof getCategoryResultsResolutionMap === "function"
        ? getCategoryResultsResolutionMap(gameId)
        : (
            typeof getCategoryResultsWinnerMap === "function"
              ? getCategoryResultsWinnerMap(gameId)
              : {}
          );

    const currentResolution =
      typeof getHybridCategoryResolution_ === "function"
        ? getHybridCategoryResolution_(
            categoryId,
            categoryConfig,
            currentResolutionMap
          )
        : {
            resolved: Boolean(
              categoryConfig.winnerNomineeId
            )
          };

    if (currentResolution.resolved) {
      return {
        success: false,
        message: "This question has already been settled"
      };
    }

    const usesConfidencePoints =
      normalizedScoreMode === "confidence-points" ||
      (
        isConfidenceGame &&
        normalizedScoreMode === "correct-pick"
      );

    if (
      normalizedScoreMode === "confidence-points" &&
      (
        !gameConfig ||
        gameConfig.confidenceEnabled !== true
      )
    ) {

      return {
        success:false,
        message:"Confidence-point predictions are not enabled for this game"
      };

    }

    if (
      usesConfidencePoints &&
      confidencePoints <= 0
    ) {

      return {
        success:false,
        message:"Confidence points are required for this question"
      };

    }

    if (
      usesConfidencePoints &&
      hasDuplicateConfidencePoints_(
        gameId,
        username,
        categoryId,
        confidencePoints,
        settings,
        isConfidenceGame
      )
    ) {

      return {
        success:false,
        message:
          "You already used " +
          confidencePoints +
          " confidence point" +
          (confidencePoints === 1 ? "" : "s") +
          ". Each confidence number can only be used once."
      };

    }

    if (
      normalizedScoreMode === "wager" ||
      normalizedScoreMode === "ranking"
    ) {
      return {
        success: false,
        message:
          normalizedScoreMode === "wager"
            ? "This question must be played from the wager page"
            : "This question must be played from the ranking page"
      };
    }

    const usesFixedPoints =
      normalizedScoreMode === "fixed-points" ||
      (
        normalizedScoreMode === "correct-pick" &&
        !usesConfidencePoints
      );

    if (
      usesFixedPoints &&
      !isFixedPointPredictionEnabledForGame_(gameConfig)
    ) {
      return {
        success: false,
        message: "Fixed-point predictions are not enabled for this game"
      };
    }

    let stakeRules = null;

    if (isStakedPointsCategory) {

      if (
        !gameConfig ||
        gameConfig.stakedPointsEnabled !== true
      ) {
        return {
          success: false,
          message:
            "Staked predictions are not enabled for this game"
        };
      }

      stakeRules =
        getStakedPredictionRules_(
          gameId,
          categoryConfig
        );

      const stakeValidation =
        validateStakePoints_(
          stakePoints,
          stakeRules
        );

      if (!stakeValidation.valid) {
        return {
          success: false,
          message: stakeValidation.message
        };
      }

      const stakeSummary =
        getStakedPredictionSummary_(
          username,
          gameId,
          {
            settings: settings,
            excludeCategoryId: categoryId
          }
        );

      if (
        stakePoints >
        stakeSummary.availablePoints
      ) {
        return {
          success: false,
          message:
            "Only " +
            stakeSummary.availablePoints +
            " points are available to stake",
          stakeSummary: stakeSummary
        };
      }

    }

    /* =========================
       CATEGORY VALIDATION
    ========================= */

    const categories =
      typeof getCategoriesCached === "function"
        ? getCategoriesCached(gameId)
        : getCategories(gameId);

    const category =
      categories.find(c =>
        normalizeLower_(
          c.id
        ) === categoryId
      );

    if (!category) {

      return {
        success:false,
        message:"Category not found"
      };

    }

    const nomineeExists =
      category.nominees.some(n =>
        normalizeLower_(
          n.id
        ) === nomineeId
      );

    if (!nomineeExists) {

      return {
        success:false,
        message:"Invalid nomineeId"
      };

    }

    /* =========================
       LOCK CHECK
    ========================= */

    const isLocked =
      isCategoryConfigLocked_(
        categoryConfig
      );

    if (isLocked) {

      return {
        success:false,
        message:"Category is locked"
      };

    }

    const MAX_CHANGES =
      getMaxChanges_(
        categoryConfig
      );

    /* =========================
       PICKS SHEET
    ========================= */

    if (
      isStakedPointsCategory &&
      typeof categoryResultsEnsureColumns_ === "function"
    ) {
      const addedStakeColumns =
        categoryResultsEnsureColumns_(
          PICKS_SHEET,
          ["StakePoints"]
        );

      if (
        addedStakeColumns &&
        Number(addedStakeColumns.added) > 0 &&
        typeof clearPicksCaches === "function"
      ) {
        clearPicksCaches();
      }
    }

    lock = ((typeof LockService.getDocumentLock === "function" ? LockService.getDocumentLock() : null) || LockService.getScriptLock());
    lock.waitLock(3000);
    lockAcquired = true;

    const directPick =
      PicksRepo && typeof PicksRepo.findPick === "function"
        ? PicksRepo.findPick(gameId, username, categoryId)
        : null;

    const data =
      directPick
        ? [directPick.headers, directPick.row]
        : PicksRepo && typeof PicksRepo.getPicksForGame === "function"
          ? PicksRepo.getPicksForGame(gameId)
          : PicksRepo.getAllPicks();

    if (data.length === 0) {

      throw new Error(
        "Picks sheet empty"
      );

    }

    const headers =
      data[0];

    const col =
      getPicksColumnMap_(
        headers
      );

    validatePickColumns_(
      col
    );

    const now =
      new Date();

    let existingRow = -1;
    let previousNominee = "";
    let originalNominee = nomineeId;
    let changeCount = 0;
    let previousConfidencePoints = 0;
    let previousStakePoints = 0;

    const userSearch =
      normalizeLower_(
        username
      );

    /* =========================
       FIND EXISTING PICK
    ========================= */

    if (directPick) {

      const row = directPick.row;

      existingRow = directPick.rowNumber;

      previousNominee =
        normalizeLower_(
          row[col.nominee]
        );

      originalNominee =
        normalizeLower_(
          row[col.original]
        ) ||
        previousNominee ||
        nomineeId;

      changeCount =
        Number(
          row[col.changes]
        ) || 0;

      previousConfidencePoints =
        col.confidencePoints !== -1
          ? normalizeConfidencePoints_(
              row[col.confidencePoints]
            )
          : 0;

      previousStakePoints =
        col.stakePoints !== -1
          ? normalizeStakePoints_(
              row[col.stakePoints]
            )
          : 0;

    } else for (
      let i = 1;
      i < data.length;
      i++
    ) {

      const row =
        data[i];

      const rowGameId =
        normalizeString_(
          row[col.gameId]
        );

      if (rowGameId !== gameId) {
        continue;
      }

      const rowUser =
        normalizeLower_(
          row[col.username]
        );

      const rowCategory =
        normalizeLower_(
          row[col.category]
        );

      if (
        rowUser === userSearch &&
        rowCategory === categoryId
      ) {

        existingRow =
          i + 1;

        previousNominee =
          normalizeLower_(
            row[col.nominee]
          );

        originalNominee =
          normalizeLower_(
            row[col.original]
          ) ||
          previousNominee ||
          nomineeId;

        changeCount =
          Number(
            row[col.changes]
          ) || 0;

        previousConfidencePoints =
          col.confidencePoints !== -1
            ? normalizeConfidencePoints_(
                row[col.confidencePoints]
              )
            : 0;

        previousStakePoints =
          col.stakePoints !== -1
            ? normalizeStakePoints_(
                row[col.stakePoints]
              )
            : 0;

        break;

      }

    }

    /* =========================
       CHANGE VALIDATION
    ========================= */

    const isChange =
      previousNominee &&
      previousNominee !== nomineeId;

    const isSamePick =
      previousNominee === nomineeId;

    const isConfidenceChange =
      usesConfidencePoints &&
      previousConfidencePoints !== confidencePoints;

    const isStakeChange =
      isStakedPointsCategory &&
      previousStakePoints !== stakePoints;

    if (
      isSamePick &&
      !isConfidenceChange &&
      !isStakeChange
    ) {

      const meta =
        buildPickMeta_(
          categoryId,
          nomineeId,
          categoryConfig,
          changeCount,
          originalNominee
        );

      return {
        success:true,
        message:"Pick already saved",
        gameId:gameId,
        categoryId:categoryId,
        nomineeId:nomineeId,
        confidencePoints:
          usesConfidencePoints
            ? confidencePoints
            : 0,
        stakePoints:
          isStakedPointsCategory
            ? stakePoints
            : 0,
        stakeSummary:
          isStakedPointsCategory
            ? getStakedPredictionSummary_(
                username,
                gameId,
                {
                  settings: settings
                }
              )
            : {},
        originalNomineeId:originalNominee,
        changeCount:changeCount,
        pickMeta:meta
      };

    }

    if (
      isChange &&
      MAX_CHANGES >= 0 &&
      changeCount >= MAX_CHANGES
    ) {

      return {
        success:false,
        message:"Change limit reached",
        changeCount:changeCount,
        maxChanges:MAX_CHANGES
      };

    }

    /* =========================
       UPDATE EXISTING ROW
    ========================= */

    if (existingRow > -1) {

      const patch = {
        [col.nominee + 1]:
          nomineeId,

        [col.lastUpdated + 1]:
          now,

        ...(isChange && {
          [col.changes + 1]:
            changeCount + 1
        })
      };

      if (col.confidencePoints !== -1) {

        patch[col.confidencePoints + 1] =
          usesConfidencePoints
            ? confidencePoints
            : 0;

      }

      if (col.stakePoints !== -1) {

        patch[col.stakePoints + 1] =
          isStakedPointsCategory
            ? stakePoints
            : 0;

      }

      PicksRepo.updatePick(
        existingRow,
        patch
      );

    }

    /* =========================
       INSERT NEW ROW
    ========================= */

    else {

      const row =
        new Array(
          headers.length
        ).fill("");

      row[col.gameId] = gameId;
      row[col.timestamp] = now;
      row[col.username] = username;
      row[col.category] = categoryId;
      row[col.nominee] = nomineeId;
      row[col.points] = 0;
      row[col.original] = nomineeId;
      row[col.changes] = 0;
      row[col.lastUpdated] = now;

      if (col.confidencePoints !== -1) {

        row[col.confidencePoints] =
          usesConfidencePoints
            ? confidencePoints
            : 0;

      }

      if (col.stakePoints !== -1) {

        row[col.stakePoints] =
          isStakedPointsCategory
            ? stakePoints
            : 0;

      }

      PicksRepo.insertPick(
        row
      );

    }

    if (lockAcquired) {
      lock.releaseLock();
      lockAcquired = false;
    }

    if (
      typeof AppCache !== "undefined" &&
      AppCache &&
      typeof AppCache.clearPicksCaches === "function"
    ) {

      AppCache.clearPicksCaches(gameId, username);

    } else if (
      typeof clearPicksCaches === "function"
    ) {

      clearPicksCaches(gameId, username);

    }

    const finalChangeCount =
      isChange
        ? changeCount + 1
        : changeCount;

    const meta =
      buildPickMeta_(
        categoryId,
        nomineeId,
        categoryConfig,
        finalChangeCount,
        originalNominee
      );

    return {
      success:true,
      gameId:gameId,
      categoryId:categoryId,
      nomineeId:nomineeId,
      confidencePoints:
        usesConfidencePoints
          ? confidencePoints
          : 0,
      stakePoints:
        isStakedPointsCategory
          ? stakePoints
          : 0,
      stakeSummary:
        isStakedPointsCategory
          ? getStakedPredictionSummary_(
              username,
              gameId,
              {
                settings: settings
              }
            )
          : {},
      originalNomineeId:originalNominee,
      changeCount:
        finalChangeCount,
      pickMeta:
        meta
    };

  } catch (err) {

    Logger.log(
      "🚨 savePick ERROR | " +
      err.message
    );

    return {
      success:false,
      message:err.message
    };

  } finally {

    if (lockAcquired && lock) lock.releaseLock();

  }

}
