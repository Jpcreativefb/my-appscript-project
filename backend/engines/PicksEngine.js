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
    lastUpdated: headers.indexOf("LastUpdated")
  };

}

function validatePickColumns_(col){

  const missing =
    Object.entries(col)
      .filter(([k,v]) => v === -1)
      .map(([k]) => k);

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
     PicksRepo.getAllPicks();

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
        categoryId: categoryId,
        nomineeId: normalizeString_(row[col.nominee]),
        points: Number(row[col.points]) || 0,
        originalNomineeId:
          normalizeString_(row[col.original]),
        changeCount:
          Number(row[col.changes]) || 0,
        timestamp: ts
      };

    }

  }

  return Object.values(latest);

}

/* =========================================================
   API GET PICKS
========================================================= */

function apiGetMyPicks(username, gameId){

  try {

    if (!username) {

      return {
        success: false,
        message: "Missing username",
        picks: {},
        changeCounts: {},
        originalPicks: {},
        pickMeta: {}
      };

    }

    gameId =
      gameId ||
      getDefaultGameId();

    const picksData =
      getUserPicks(username, gameId);

    const settings =
      getCategorySettings(gameId);

    const picks = {};
    const changeCounts = {};
    const originalPicks = {};
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
        meta.locked
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
      normalizeString_(payload.username);

    const categoryId =
      normalizeLower_(payload.categoryId);

    const nomineeId =
      normalizeLower_(payload.nomineeId);

    const gameId =
      normalizeString_(
        payload.gameId ||
        getDefaultGameId()
      );

    validateGameId(gameId);

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
      getCategorySettings(gameId);

    if (!settings[categoryId]) {

      return {
        success:false,
        message:"Invalid categoryId"
      };

    }

    const categoryConfig =
      settings[categoryId] ||
      settings[
        normalizeLower_(categoryId)
      ] ||
      {};

    /* =========================
       CATEGORY VALIDATION
    ========================= */

    const categories =
      getCategories(gameId);

    const category =
      categories.find(c =>
        normalizeLower_(c.id) ===
        categoryId
      );

    if (!category) {

      return {
        success:false,
        message:"Category not found"
      };

    }

    const nomineeExists =
      category.nominees.some(n =>
        normalizeLower_(n.id) ===
        nomineeId
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

    const data =
      PicksRepo.getAllPicks();

    if (data.length === 0) {
      throw new Error(
        "Picks sheet empty"
      );
    }

    const headers = data[0];

    const col =
      getPicksColumnMap_(headers);

    validatePickColumns_(col);

    const now = new Date();

    let existingRow = -1;
    let previousNominee = "";
    let originalNominee = nomineeId;
    let changeCount = 0;

    const userSearch =
      normalizeLower_(username);

    /* =========================
       FIND EXISTING PICK
    ========================= */

    for (let i = 1; i < data.length; i++) {

      const row = data[i];

      const rowGameId =
        normalizeString_(row[col.gameId]);

      if (rowGameId !== gameId) {
        continue;
      }

      const rowUser =
        normalizeLower_(row[col.username]);

      const rowCategory =
        normalizeLower_(row[col.category]);

      if (
        rowUser === userSearch &&
        rowCategory === categoryId
      ) {

        existingRow = i + 1;

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
          Number(row[col.changes]) || 0;

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

      if (isSamePick) {

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

      PicksRepo.updatePick(
        existingRow,
        {
          [col.nominee + 1]:
            nomineeId,
    
          [col.lastUpdated + 1]:
            now,
    
          ...(isChange && {
            [col.changes + 1]:
              changeCount + 1
          })
        }
      );
    
    }

    /* =========================
       INSERT NEW ROW
    ========================= */

    else {

      const row =
        new Array(headers.length)
          .fill("");

      row[col.gameId] = gameId;
      row[col.timestamp] = now;
      row[col.username] = username;
      row[col.category] = categoryId;
      row[col.nominee] = nomineeId;
      row[col.points] = 0;
      row[col.original] = nomineeId;
      row[col.changes] = 0;
      row[col.lastUpdated] = now;

      PicksRepo.insertPick(row);

    }

    PicksRepo.flush();

    AppCache.clearPicksCaches();
    

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
