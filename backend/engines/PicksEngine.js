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

    changesLeft:
      Math.max(
        maxChanges - safeChangeCount,
        0
      ),

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
      getCategorySettings(
        gameId
      );

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

function savePick(payload){

  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);

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
      getCategorySettings(
        gameId
      );

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
      gameConfig &&
      gameConfig.fixedPointsEnabled === false
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
      getCategories(
        gameId
      );

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

    const data =
      PicksRepo.getAllPicks();

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

    PicksRepo.flush();

    if (
      typeof AppCache !== "undefined" &&
      AppCache &&
      typeof AppCache.clearPicksCaches === "function"
    ) {

      AppCache.clearPicksCaches();

    } else if (
      typeof clearAppCaches === "function"
    ) {

      clearAppCaches();

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

    lock.releaseLock();

  }

}
