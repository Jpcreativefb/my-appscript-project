/* =========================
   ADMIN CATEGORIES / QUESTIONS ENGINE
========================= */

/* =========================================================
   HELPERS
========================================================= */

function adminCatNormalizeValue_(value) {

  return String(value || "")
    .trim();

}

function adminCatNormalizeGameId_(value) {

  return String(value || "")
    .trim();

}

function adminCatNormalizeId_(value) {

  return String(value || "")
    .trim()
    .toLowerCase();

}

function adminCatNormalizeScoreMode_(value) {

  if (typeof normalizeCategoryScoreMode_ === "function") {
    return normalizeCategoryScoreMode_(value);
  }

  const mode = String(value || "fixed-points")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");

  if (mode === "correct-pick") {
    return "fixed-points";
  }

  return mode || "fixed-points";

}

function adminCatResolveScoreModeForGame_(gameId, requestedMode) {

  const hasRequestedMode =
    requestedMode !== undefined &&
    requestedMode !== null &&
    adminCatNormalizeValue_(requestedMode) !== "";

  const normalizedRequested =
    adminCatNormalizeScoreMode_(
      hasRequestedMode ? requestedMode : "fixed-points"
    );

  if (typeof getGame !== "function") {
    return normalizedRequested;
  }

  const game = getGame(gameId);

  if (!game) {
    return normalizedRequested;
  }

  const rawType =
    adminCatNormalizeValue_(game.type || game.gameType || "prediction")
      .toLowerCase();

  const type =
    typeof normalizeGameType_ === "function"
      ? normalizeGameType_(rawType)
      : rawType;

  const isHybrid =
    type === "mixed" ||
    rawType === "mixed" ||
    rawType === "hybrid" ||
    rawType === "combo" ||
    game.mixedGame === true ||
    adminCatNormalizeValue_(game.gameFormat).toLowerCase() === "hybrid" ||
    adminCatNormalizeValue_(game.scoringMode).toLowerCase() === "hybrid";

  /*
    One source of truth:
    Non-Hybrid game types own their question ScoreMode.
    Hybrid questions must preserve the mode selected on each question.
  */
  if (isHybrid) {
    return hasRequestedMode
      ? normalizedRequested
      : undefined;
  }

  if (type === "staked-prediction") {
    return "staked-points";
  }

  if (type === "confidence") {
    return "confidence-points";
  }

  if (type === "wager" || type === "racing-wager") {
    return "wager";
  }

  if (type === "ranking") {
    return "ranking";
  }

  return "fixed-points";

}

function adminCatSlugify_(value) {

  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

}

function adminCatToBoolean_(value) {

  return (
    value === true ||
    String(value || "")
      .trim()
      .toLowerCase() === "true" ||
    String(value || "")
      .trim()
      .toLowerCase() === "yes" ||
    String(value || "")
      .trim() === "1"
  );

}

function adminCatSetIfColumnExists_(
  row,
  col,
  key,
  value
) {

  if (
    col &&
    col[key] !== undefined &&
    col[key] !== -1
  ) {

    row[col[key]] =
      value;

  }

}

function adminCatClearCaches_() {

  /*
    Game Setup writes update normalized Questions / QuestionOptions as well
    as compatibility rows. Clear both cache layers so an immediate reopen
    cannot display the pre-save wording.
  */
  if (
    typeof normalizedStorageClearCaches_ ===
    "function"
  ) {

    normalizedStorageClearCaches_();
    return;

  }

  if (
    typeof clearAppCaches ===
    "function"
  ) {

    clearAppCaches();

  }

}

function adminCatEnsureHybridHeaders_() {

  if (
    typeof categoryResultsEnsureColumns_ !== "function"
  ) {
    return;
  }

  categoryResultsEnsureColumns_(
    CATEGORY_SETTINGS_SHEET,
    [
      "QuestionType",
      "ScoringEngine",
      "SelectionMode",
      "ScoreMode",
      "OddsMode",
      "ResultSource",
      "SettlementStatus",
      "MaxSelections",
      "MinSelections",
      "AllowDraw",
      "AllowPush",
      "SportsGameId",
      "ESPNEventId",
      "SportsMarket",
      "SportsLeague",
      "WagerResultType",
      "OddsReady",
      "OddsSource",
      "OddsLastUpdated",
      "MinStake",
      "MaxStake",
      "StakeIncrement",
      "StakeWinMultiplier",
      "StakeLossMultiplier",
      "ResultSourceType",
      "ResultProvider",
      "ExternalEventId",
      "ExternalMarketId",
      "ExternalSubjectId",
      "StatKey",
      "ComparisonOperator",
      "Threshold",
      "AutoSettle",
      "RequireAdminReview",
      "SourceUrl",
      "SourceConfigJSON"
    ]
  );

}

function adminCatValidateQuestionSettingsPayload_(payload) {

  payload = payload || {};

  if (
    Object.prototype.hasOwnProperty.call(payload, "scoreMode")
  ) {
    const allowedScoreModes = {
      "correct-pick": true,
      "fixed-points": true,
      "confidence-points": true,
      "staked-points": true,
      "wager": true,
      "ranking": true
    };

    const normalizedScoreMode =
      adminCatNormalizeScoreMode_(payload.scoreMode);

    if (!allowedScoreModes[normalizedScoreMode]) {
      throw new Error(
        "Score Mode must be Fixed Points, Confidence Points, Staked Points, Sports Wager, or Ranking."
      );
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      "sourceConfigJSON"
    ) &&
    adminCatNormalizeValue_(payload.sourceConfigJSON)
  ) {
    try {
      JSON.parse(payload.sourceConfigJSON);
    } catch (err) {
      throw new Error(
        "SourceConfigJSON must be valid JSON."
      );
    }
  }

  function optionalFiniteNumber_(key, label) {

    const raw = payload[key];

    if (
      raw === "" ||
      raw === null ||
      raw === undefined
    ) {
      return null;
    }

    const value = Number(raw);

    if (!isFinite(value)) {
      throw new Error(
        label + " must be a valid number."
      );
    }

    return value;

  }

  function optionalWholeNumber_(key, label) {

    const value =
      optionalFiniteNumber_(key, label);

    if (value === null) {
      return null;
    }

    if (Math.floor(value) !== value) {
      throw new Error(
        label + " must be a whole number."
      );
    }

    return value;

  }

  const minStake =
    optionalWholeNumber_(
      "minStake",
      "Category minimum stake"
    );

  const maxStake =
    optionalWholeNumber_(
      "maxStake",
      "Category maximum stake"
    );

  const stakeIncrement =
    optionalWholeNumber_(
      "stakeIncrement",
      "Category stake increment"
    );

  [
    [minStake, "Category minimum stake"],
    [maxStake, "Category maximum stake"],
    [stakeIncrement, "Category stake increment"]
  ].forEach(function(item) {

    if (item[0] !== null && item[0] < 0) {
      throw new Error(
        item[1] + " cannot be negative."
      );
    }

  });

  if (
    minStake !== null &&
    minStake > 0 &&
    maxStake !== null &&
    maxStake > 0 &&
    maxStake < minStake
  ) {
    throw new Error(
      "Category maximum stake must be at least the minimum stake."
    );
  }

  if (
    minStake !== null &&
    minStake > 0 &&
    maxStake !== null &&
    maxStake > 0 &&
    stakeIncrement !== null &&
    stakeIncrement > 0 &&
    (maxStake - minStake) % stakeIncrement !== 0
  ) {
    throw new Error(
      "Category maximum stake must align with its minimum stake and increment."
    );
  }

  [
    ["stakeWinMultiplier", "Stake win multiplier"],
    ["stakeLossMultiplier", "Stake loss multiplier"]
  ].forEach(function(item) {

    const value =
      optionalFiniteNumber_(item[0], item[1]);

    if (value !== null && value < 0) {
      throw new Error(
        item[1] + " cannot be negative."
      );
    }

  });

  optionalFiniteNumber_(
    "threshold",
    "Result threshold"
  );

}

/* =========================================================
   CATEGORY SETTINGS HELPERS
========================================================= */

function adminCatFindSettingsRows_(
  data,
  col,
  gameId,
  categoryId
) {

  const matches = [];

  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    const rowGameId =
      col.gameId !== -1
        ? adminCatNormalizeGameId_(
            data[i][col.gameId]
          )
        : "";

    const rowCategoryId =
      adminCatNormalizeId_(
        data[i][col.categoryId]
      );

    if (
      (
        col.gameId === -1 ||
        rowGameId === gameId
      ) &&
      rowCategoryId === categoryId
    ) {

      matches.push(i + 1);

    }

  }

  return matches;

}

function adminCatFindSettingsRow_(
  data,
  col,
  gameId,
  categoryId
) {

  const matches =
    adminCatFindSettingsRows_(
      data,
      col,
      gameId,
      categoryId
    );

  /*
    adminGetGameSetup() processes sheet rows from top to bottom, so the
    final matching row is the value the editor and preflight ultimately
    see when legacy duplicate CategorySettings rows exist. Return that same
    row here for callers that still expect one canonical row.
  */
  return matches.length
    ? matches[matches.length - 1]
    : -1;

}

function adminCatBuildSettingsRow_(
  headers,
  col,
  payload
) {

  const row =
    new Array(headers.length)
      .fill("");

  adminCatSetIfColumnExists_(
    row,
    col,
    "gameId",
    payload.gameId
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "categoryId",
    payload.categoryId
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "points",
    Number(payload.points) || 0
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "locked",
    adminCatToBoolean_(
      payload.locked
    )
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "winnerNomineeId",
    adminCatNormalizeId_(
      payload.winnerNomineeId
    )
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "changePenalty",
    Number(payload.changePenalty) || 0
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "maxChanges",
    Number(payload.maxChanges) || 0
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "lockDateTime",
    payload.lockDateTime || ""
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "displayOrder",
    Number(payload.displayOrder) || 999
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "groupId",
    adminCatNormalizeValue_(
      payload.groupId || "default"
    )
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "parentCategoryId",
    adminCatNormalizeId_(
      payload.parentCategoryId
    )
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "followUpCategoryId",
    adminCatNormalizeId_(
      payload.followUpCategoryId
    )
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "followUpMapJSON",
    adminCatNormalizeValue_(
      payload.followUpMapJSON
    )
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "layoutType",
    adminCatNormalizeValue_(
      payload.layoutType || "image"
    )
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "shortName",
    adminCatNormalizeValue_(
      payload.shortName
    )
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "countsAsStatue",
    adminCatToBoolean_(
      payload.countsAsStatue
    )
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "scoreVersion",
    adminCatNormalizeValue_(
      payload.scoreVersion
    )
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "favoriteNomineeId",
    adminCatNormalizeId_(
      payload.favoriteNomineeId
    )
  );

  [
    "questionType",
    "scoringEngine",
    "selectionMode",
    "oddsMode",
    "resultSource",
    "settlementStatus",
    "sportsGameId",
    "espnEventId",
    "sportsMarket",
    "sportsLeague",
    "wagerResultType",
    "resultSourceType",
    "resultProvider",
    "externalEventId",
    "externalMarketId",
    "externalSubjectId",
    "statKey",
    "comparisonOperator",
    "sourceUrl",
    "sourceConfigJSON"
  ].forEach(function(key) {
    adminCatSetIfColumnExists_(
      row,
      col,
      key,
      adminCatNormalizeValue_(
        payload[key]
      )
    );
  });

  adminCatSetIfColumnExists_(
    row,
    col,
    "scoreMode",
    adminCatNormalizeScoreMode_(
      payload.scoreMode
    )
  );

  [
    "maxSelections",
    "minSelections",
    "minStake",
    "maxStake",
    "stakeIncrement",
    "stakeWinMultiplier",
    "stakeLossMultiplier",
    "threshold"
  ].forEach(function(key) {
    adminCatSetIfColumnExists_(
      row,
      col,
      key,
      payload[key] === "" ||
      payload[key] === null ||
      payload[key] === undefined
        ? ""
        : Number(payload[key])
    );
  });

  [
    "allowDraw",
    "allowPush",
    "autoSettle"
  ].forEach(function(key) {
    adminCatSetIfColumnExists_(
      row,
      col,
      key,
      adminCatToBoolean_(
        payload[key]
      )
    );
  });

  adminCatSetIfColumnExists_(
    row,
    col,
    "requireAdminReview",
    payload.requireAdminReview === undefined
      ? true
      : adminCatToBoolean_(
          payload.requireAdminReview
        )
  );

  return row;

}

function adminCatUpsertCategorySettings_(
  payload
) {

  adminCatValidateQuestionSettingsPayload_(payload);

  adminCatEnsureHybridHeaders_();

  const sh =
    getCategorySettingsSheet_();

  const data =
    sh.getDataRange()
      .getValues();

  if (!data.length) {

    throw new Error(
      "CategorySettings sheet is empty"
    );

  }

  const headers =
    data[0].map(h =>
      String(h || "").trim()
    );

  const col =
    getCategorySettingsColumnMap_(
      headers
    );

  validateCategorySettingsColumns_(
    col
  );

  const rowIndexes =
    adminCatFindSettingsRows_(
      data,
      col,
      payload.gameId,
      payload.categoryId
    );

  if (!rowIndexes.length) {

    const row =
      adminCatBuildSettingsRow_(
        headers,
        col,
        payload
      );

    sh.appendRow(
      row
    );

    return;

  }

  const keys = [
    "points",
    "locked",
    "winnerNomineeId",
    "changePenalty",
    "maxChanges",
    "lockDateTime",
    "displayOrder",
    "groupId",
    "parentCategoryId",
    "followUpCategoryId",
    "followUpMapJSON",
    "layoutType",
    "shortName",
    "countsAsStatue",
    "scoreVersion",
    "favoriteNomineeId",
    "questionType",
    "scoringEngine",
    "selectionMode",
    "scoreMode",
    "oddsMode",
    "resultSource",
    "settlementStatus",
    "maxSelections",
    "minSelections",
    "allowDraw",
    "allowPush",
    "sportsGameId",
    "espnEventId",
    "sportsMarket",
    "sportsLeague",
    "wagerResultType",
    "minStake",
    "maxStake",
    "stakeIncrement",
    "stakeWinMultiplier",
    "stakeLossMultiplier",
    "resultSourceType",
    "resultProvider",
    "externalEventId",
    "externalMarketId",
    "externalSubjectId",
    "statKey",
    "comparisonOperator",
    "threshold",
    "autoSettle",
    "requireAdminReview",
    "sourceUrl",
    "sourceConfigJSON"
  ];

  rowIndexes.forEach(function(rowIndex) {

    const row =
      data[rowIndex - 1]
        .slice();

    keys.forEach(key => {

      /*
        Important:
        Only update fields that were intentionally sent.

        adminUpdateCategory() may pass keys with undefined values.
        Undefined should mean "do not touch this setting",
        not "clear this setting".
      */

      if (
        !(key in payload) ||
        payload[key] === undefined ||
        col[key] === -1
      ) {

        return;

      }

      if (
        key === "points" ||
        key === "changePenalty" ||
        key === "maxChanges" ||
        key === "displayOrder" ||
        key === "maxSelections" ||
        key === "minSelections" ||
        key === "minStake" ||
        key === "maxStake" ||
        key === "stakeIncrement" ||
        key === "stakeWinMultiplier" ||
        key === "stakeLossMultiplier" ||
        key === "threshold"
      ) {

        row[col[key]] =
          (
            key === "stakeWinMultiplier" ||
            key === "stakeLossMultiplier" ||
            key === "threshold"
          ) &&
          (
            payload[key] === "" ||
            payload[key] === null
          )
            ? ""
            : Number(payload[key]) || 0;

      } else if (
        key === "locked" ||
        key === "countsAsStatue" ||
        key === "allowDraw" ||
        key === "allowPush" ||
        key === "autoSettle" ||
        key === "requireAdminReview"
      ) {

        row[col[key]] =
          adminCatToBoolean_(
            payload[key]
          );

      } else if (key === "scoreMode") {

        row[col[key]] =
          adminCatNormalizeScoreMode_(
            payload[key]
          );

      } else if (
        key === "winnerNomineeId" ||
        key === "favoriteNomineeId" ||
        key === "parentCategoryId" ||
        key === "followUpCategoryId"
      ) {

        row[col[key]] =
          adminCatNormalizeId_(
            payload[key]
          );

      } else {

        row[col[key]] =
          adminCatNormalizeValue_(
            payload[key]
          );

      }

    });

    sh.getRange(
      rowIndex,
      1,
      1,
      headers.length
    ).setValues([
      row
    ]);

  });

}

/* =========================================================
   CATEGORY ROW HELPERS
========================================================= */

function adminCatAppendCategoryRow_(
  payload
) {

  const sh =
    getCategoriesSheet_();

  const data =
    sh.getDataRange()
      .getValues();

  if (!data.length) {

    throw new Error(
      "Categories sheet is empty"
    );

  }

  const headers =
    data[0].map(h =>
      String(h || "").trim()
    );

  const col =
    getCategoriesColumnMap_(
      headers
    );

  validateCategoriesColumns_(
    col
  );

  const row =
    new Array(headers.length)
      .fill("");

  adminCatSetIfColumnExists_(
    row,
    col,
    "gameId",
    payload.gameId
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "category",
    payload.category
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "categoryId",
    payload.categoryId
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "nominee",
    payload.nominee || ""
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "nomineeId",
    payload.nomineeId || ""
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "section",
    payload.section || "Main"
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "fileId",
    payload.fileId || ""
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "shortAnswer",
    payload.shortAnswer || ""
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "categoryImage",
    payload.categoryImage || ""
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "movieId",
    payload.movieId || ""
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "movie",
    payload.movie || ""
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "person",
    payload.person || ""
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "active",
    adminCatToBoolean_(
      "active" in payload
        ? payload.active
        : true
    )
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "predictionGame",
    adminCatToBoolean_(
      "predictionGame" in payload
        ? payload.predictionGame
        : true
    )
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "communityRank",
    adminCatToBoolean_(
      payload.communityRank
    )
  );

  sh.appendRow(
    row
  );

}

function adminCatFindCategoryRows_(
  data,
  col,
  gameId,
  categoryId
) {

  const rows = [];

  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    const rowGameId =
      adminCatNormalizeGameId_(
        data[i][col.gameId]
      );

    const rowCategoryId =
      adminCatNormalizeId_(
        data[i][col.categoryId]
      );

    if (
      rowGameId === gameId &&
      rowCategoryId === categoryId
    ) {

      rows.push(
        i + 1
      );

    }

  }

  return rows;

}

function adminCatFindNomineeRows_(
  data,
  col,
  gameId,
  categoryId,
  nomineeId
) {

  const rows = [];

  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    const rowGameId =
      adminCatNormalizeGameId_(
        data[i][col.gameId]
      );

    const rowCategoryId =
      adminCatNormalizeId_(
        data[i][col.categoryId]
      );

    const rowNomineeId =
      adminCatNormalizeId_(
        data[i][col.nomineeId]
      );

    if (
      rowGameId === gameId &&
      rowCategoryId === categoryId &&
      rowNomineeId === nomineeId
    ) {

      rows.push(i + 1);

    }

  }

  return rows;

}

function adminCatFindNomineeRow_(
  data,
  col,
  gameId,
  categoryId,
  nomineeId
) {

  const rows = adminCatFindNomineeRows_(
    data,
    col,
    gameId,
    categoryId,
    nomineeId
  );

  return rows.length ? rows[rows.length - 1] : -1;

}

function adminCatBuildNomineeRow_(
  headers,
  col,
  payload
) {

  const row =
    new Array(headers.length)
      .fill("");

  adminCatSetIfColumnExists_(
    row,
    col,
    "gameId",
    payload.gameId
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "category",
    payload.category
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "categoryId",
    payload.categoryId
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "nominee",
    payload.nominee
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "nomineeId",
    payload.nomineeId
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "section",
    payload.section || "Other"
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "fileId",
    payload.fileId || ""
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "shortAnswer",
    payload.shortAnswer || payload.nominee
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "categoryImage",
    payload.categoryImage || ""
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "movieId",
    payload.movieId || ""
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "movie",
    payload.movie || ""
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "person",
    payload.person || ""
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "active",
    adminCatToBoolean_(
      "active" in payload
        ? payload.active
        : true
    )
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "predictionGame",
    adminCatToBoolean_(
      "predictionGame" in payload
        ? payload.predictionGame
        : true
    )
  );

  adminCatSetIfColumnExists_(
    row,
    col,
    "communityRank",
    adminCatToBoolean_(
      payload.communityRank
    )
  );

  return row;

}

/* =========================================================
   GET FULL GAME SETUP
========================================================= */

function adminGetGameSetup(payload) {

  adminCatEnsureHybridHeaders_();

  const gameId =
    adminCatNormalizeGameId_(
      payload && payload.gameId
    );

  if (!gameId) {

    throw new Error(
      "GameId is required"
    );

  }

  validateGameId(
    gameId
  );

  const categoryData =
    typeof getAdminCategoriesDataForGameScoped_ === "function"
      ? getAdminCategoriesDataForGameScoped_(gameId)
      : (
          typeof getCategoriesDataForGameScoped_ === "function"
            ? getCategoriesDataForGameScoped_(gameId)
            : getAllCategoriesData_()
        );

  const categoryHeaders =
    categoryData[0].map(h =>
      String(h || "").trim()
    );

  const categoryCol =
    getCategoriesColumnMap_(
      categoryHeaders
    );

  validateCategoriesColumns_(
    categoryCol
  );

  /*
    Admin setup must always show the current sheet value.
    Player requests may use cached settings, but an admin editor
    cannot safely display a stale Locked or settlement state.
  */
  const settingsData =
    getCategorySettingsSheet_()
      .getDataRange()
      .getValues();

  const settingsHeaders =
    settingsData[0].map(h =>
      String(h || "").trim()
    );

  const settingsCol =
    getCategorySettingsColumnMap_(
      settingsHeaders
    );

  validateCategorySettingsColumns_(
    settingsCol
  );

  /*
    Clone provenance is stored in the normalized Questions PayloadJSON.
    Keep it out of the legacy Categories schema, but expose it to the
    Game Setup page so an administrator can always tell which questions
    were cloned and where they came from.
  */
  const cloneInfoByCategory = {};

  if (typeof normalizedStorageGetQuestionSetup_ === "function") {
    try {
      const normalizedSetup = normalizedStorageGetQuestionSetup_(gameId, {
        syncLegacy: false,
        bypassRuntimeCache: true,
        trustIndex: false
      });

      (normalizedSetup.questions || []).forEach(function(question) {
        const questionId = adminCatNormalizeId_(question.QuestionId);
        let metadata = {};

        try {
          metadata = JSON.parse(String(question.PayloadJSON || "{}"));
        } catch (ignore) {
          metadata = {};
        }

        const nestedClone = metadata.clone && typeof metadata.clone === "object"
          ? metadata.clone
          : {};
        const sourceCategoryId = adminCatNormalizeId_(
          metadata.CloneSourceCategoryId ||
          metadata.cloneSourceCategoryId ||
          nestedClone.sourceCategoryId
        );
        const sourceGameId = adminCatNormalizeGameId_(
          metadata.CloneSourceGameId ||
          metadata.cloneSourceGameId ||
          nestedClone.sourceGameId
        );
        const clonedAt = adminCatNormalizeValue_(
          metadata.ClonedAt ||
          metadata.clonedAt ||
          nestedClone.clonedAt
        );
        const sourceSystem = adminCatNormalizeValue_(question.SourceSystem);

        if (questionId && (sourceCategoryId || sourceSystem === "admin-clone")) {
          cloneInfoByCategory[questionId] = {
            sourceGameId: sourceGameId,
            sourceCategoryId: sourceCategoryId,
            clonedAt: clonedAt,
            sourceSystem: sourceSystem || "admin-clone"
          };
        }
      });
    } catch (ignore) {
      /* Clone labels are helpful UI metadata, never a load blocker. */
    }
  }

  const map = {};

  for (
    let i = 1;
    i < categoryData.length;
    i++
  ) {

    const row =
      categoryData[i];

    const rowGameId =
      adminCatNormalizeGameId_(
        row[categoryCol.gameId]
      );

    if (rowGameId !== gameId) {
      continue;
    }

    const categoryId =
      adminCatNormalizeId_(
        row[categoryCol.categoryId]
      );

    if (!categoryId) {
      continue;
    }

    const categoryName =
      adminCatNormalizeValue_(
        row[categoryCol.category]
      );

    if (!map[categoryId]) {

      map[categoryId] = {
        gameId:
          gameId,

        categoryId:
          categoryId,

        category:
          categoryName,

        section:
          categoryCol.section !== -1
            ? adminCatNormalizeValue_(
                row[categoryCol.section]
              )
            : "Other",

        categoryImage:
          categoryCol.categoryImage !== -1
            ? adminCatNormalizeValue_(
                row[categoryCol.categoryImage]
              )
            : "",

        active:
          categoryCol.active !== -1
            ? adminCatToBoolean_(
                row[categoryCol.active]
              )
            : true,

        predictionGame:
          categoryCol.predictionGame !== -1
            ? adminCatToBoolean_(
                row[categoryCol.predictionGame]
              )
            : true,

        communityRank:
          categoryCol.communityRank !== -1
            ? adminCatToBoolean_(
                row[categoryCol.communityRank]
              )
            : false,

        settings:
          {},

        nominees:
          []
      };

    } else if (
      categoryName &&
      !map[categoryId].category
    ) {

      map[categoryId].category =
        categoryName;

    }

    const nomineeName =
      adminCatNormalizeValue_(
        row[categoryCol.nominee]
      );

    if (!nomineeName) {
      continue;
    }

    const nomineeId =
      categoryCol.nomineeId !== -1
        ? adminCatNormalizeId_(
            row[categoryCol.nomineeId]
          )
        : adminCatSlugify_(
            nomineeName
          );

    map[categoryId].nominees.push({
      nomineeId:
        nomineeId,

      nominee:
        nomineeName,

      fileId:
        categoryCol.fileId !== -1
          ? adminCatNormalizeValue_(
              row[categoryCol.fileId]
            )
          : "",

      shortAnswer:
        categoryCol.shortAnswer !== -1
          ? adminCatNormalizeValue_(
              row[categoryCol.shortAnswer]
            )
          : nomineeName,

      movieId:
        categoryCol.movieId !== -1
          ? adminCatNormalizeValue_(
              row[categoryCol.movieId]
            )
          : "",

      movie:
        categoryCol.movie !== -1
          ? adminCatNormalizeValue_(
              row[categoryCol.movie]
            )
          : "",

      person:
        categoryCol.person !== -1
          ? adminCatNormalizeValue_(
              row[categoryCol.person]
            )
          : "",

      active:
        categoryCol.active !== -1
          ? adminCatToBoolean_(
              row[categoryCol.active]
            )
          : true
    });

  }

  for (
    let i = 1;
    i < settingsData.length;
    i++
  ) {

    const row =
      settingsData[i];

    const rowGameId =
      settingsCol.gameId !== -1
        ? adminCatNormalizeGameId_(
            row[settingsCol.gameId]
          )
        : "";

    const categoryId =
      adminCatNormalizeId_(
        row[settingsCol.categoryId]
      );

    if (
      settingsCol.gameId !== -1 &&
      rowGameId !== gameId
    ) {
      continue;
    }

    if (
      settingsCol.gameId === -1 &&
      !map[categoryId]
    ) {
      continue;
    }

    if (!categoryId) {
      continue;
    }

    if (!map[categoryId]) {

      map[categoryId] = {
        gameId:
          gameId,

        categoryId:
          categoryId,

        category:
          "",

        section:
          "Other",

        categoryImage:
          "",

        active:
          true,

        predictionGame:
          true,

        communityRank:
          false,

        settings:
          {},

        nominees:
          []
      };

    }

    map[categoryId].settings = {
      points:
        settingsCol.points !== -1
          ? Number(row[settingsCol.points]) || 0
          : 0,

      locked:
        settingsCol.locked !== -1
          ? adminCatToBoolean_(
              row[settingsCol.locked]
            )
          : false,

      winnerNomineeId:
        settingsCol.winnerNomineeId !== -1
          ? adminCatNormalizeId_(
              row[settingsCol.winnerNomineeId]
            )
          : "",

      changePenalty:
        settingsCol.changePenalty !== -1
          ? Number(row[settingsCol.changePenalty]) || 0
          : 0,

      maxChanges:
        settingsCol.maxChanges !== -1
          ? Number(row[settingsCol.maxChanges]) || 0
          : 0,

      lockDateTime:
        settingsCol.lockDateTime !== -1
          ? row[settingsCol.lockDateTime] || ""
          : "",

      displayOrder:
        settingsCol.displayOrder !== -1
          ? Number(row[settingsCol.displayOrder]) || 999
          : 999,

      groupId:
        settingsCol.groupId !== -1
          ? adminCatNormalizeValue_(
              row[settingsCol.groupId]
            )
          : "default",

      parentCategoryId:
        settingsCol.parentCategoryId !== -1
          ? adminCatNormalizeId_(
              row[settingsCol.parentCategoryId]
            )
          : "",

      followUpCategoryId:
        settingsCol.followUpCategoryId !== -1
          ? adminCatNormalizeId_(
              row[settingsCol.followUpCategoryId]
            )
          : "",

      followUpMapJSON:
        settingsCol.followUpMapJSON !== -1
          ? adminCatNormalizeValue_(
              row[settingsCol.followUpMapJSON]
            )
          : "",

      layoutType:
        settingsCol.layoutType !== -1
          ? adminCatNormalizeValue_(
              row[settingsCol.layoutType]
            )
          : "image",

      shortName:
        settingsCol.shortName !== -1
          ? adminCatNormalizeValue_(
              row[settingsCol.shortName]
            )
          : "",

      countsAsStatue:
        settingsCol.countsAsStatue !== -1
          ? adminCatToBoolean_(
              row[settingsCol.countsAsStatue]
            )
          : false,

      scoreVersion:
        settingsCol.scoreVersion !== -1
          ? adminCatNormalizeValue_(
              row[settingsCol.scoreVersion]
            )
          : "",

      favoriteNomineeId:
        settingsCol.favoriteNomineeId !== -1
          ? adminCatNormalizeId_(
              row[settingsCol.favoriteNomineeId]
            )
          : "",

      questionType:
        settingsCol.questionType !== -1
          ? adminCatNormalizeValue_(row[settingsCol.questionType])
          : "award-single-winner",

      scoringEngine:
        settingsCol.scoringEngine !== -1
          ? adminCatNormalizeValue_(row[settingsCol.scoringEngine])
          : "manual",

      selectionMode:
        settingsCol.selectionMode !== -1
          ? adminCatNormalizeValue_(row[settingsCol.selectionMode])
          : "single",

      scoreMode:
        settingsCol.scoreMode !== -1
          ? adminCatNormalizeValue_(row[settingsCol.scoreMode])
          : "correct-pick",

      oddsMode:
        settingsCol.oddsMode !== -1
          ? adminCatNormalizeValue_(row[settingsCol.oddsMode])
          : "none",

      resultSource:
        settingsCol.resultSource !== -1
          ? adminCatNormalizeValue_(row[settingsCol.resultSource])
          : "manual",

      settlementStatus:
        settingsCol.settlementStatus !== -1
          ? adminCatNormalizeValue_(row[settingsCol.settlementStatus])
          : "pending",

      minStake:
        settingsCol.minStake !== -1
          ? Number(row[settingsCol.minStake]) || 0
          : 0,

      maxStake:
        settingsCol.maxStake !== -1
          ? Number(row[settingsCol.maxStake]) || 0
          : 0,

      stakeIncrement:
        settingsCol.stakeIncrement !== -1
          ? Number(row[settingsCol.stakeIncrement]) || 0
          : 0,

      stakeWinMultiplier:
        settingsCol.stakeWinMultiplier !== -1 &&
        row[settingsCol.stakeWinMultiplier] !== "" &&
        row[settingsCol.stakeWinMultiplier] !== null &&
        row[settingsCol.stakeWinMultiplier] !== undefined
          ? Number(row[settingsCol.stakeWinMultiplier])
          : "",

      stakeLossMultiplier:
        settingsCol.stakeLossMultiplier !== -1 &&
        row[settingsCol.stakeLossMultiplier] !== "" &&
        row[settingsCol.stakeLossMultiplier] !== null &&
        row[settingsCol.stakeLossMultiplier] !== undefined
          ? Number(row[settingsCol.stakeLossMultiplier])
          : "",

      resultSourceType:
        settingsCol.resultSourceType !== -1
          ? adminCatNormalizeValue_(row[settingsCol.resultSourceType])
          : "",

      resultProvider:
        settingsCol.resultProvider !== -1
          ? adminCatNormalizeValue_(row[settingsCol.resultProvider])
          : "",

      externalEventId:
        settingsCol.externalEventId !== -1
          ? adminCatNormalizeValue_(row[settingsCol.externalEventId])
          : "",

      externalMarketId:
        settingsCol.externalMarketId !== -1
          ? adminCatNormalizeValue_(row[settingsCol.externalMarketId])
          : "",

      externalSubjectId:
        settingsCol.externalSubjectId !== -1
          ? adminCatNormalizeValue_(row[settingsCol.externalSubjectId])
          : "",

      statKey:
        settingsCol.statKey !== -1
          ? adminCatNormalizeValue_(row[settingsCol.statKey])
          : "",

      comparisonOperator:
        settingsCol.comparisonOperator !== -1
          ? adminCatNormalizeValue_(row[settingsCol.comparisonOperator])
          : "",

      threshold:
        settingsCol.threshold !== -1 &&
        row[settingsCol.threshold] !== "" &&
        row[settingsCol.threshold] !== null &&
        row[settingsCol.threshold] !== undefined
          ? Number(row[settingsCol.threshold])
          : "",

      autoSettle:
        settingsCol.autoSettle !== -1
          ? adminCatToBoolean_(row[settingsCol.autoSettle])
          : false,

      requireAdminReview:
        settingsCol.requireAdminReview !== -1
          ? adminCatToBoolean_(row[settingsCol.requireAdminReview])
          : true,

      sourceUrl:
        settingsCol.sourceUrl !== -1
          ? adminCatNormalizeValue_(row[settingsCol.sourceUrl])
          : "",

      sourceConfigJSON:
        settingsCol.sourceConfigJSON !== -1
          ? adminCatNormalizeValue_(row[settingsCol.sourceConfigJSON])
          : ""
    };

  }

  /*
    ScoreMode is stored separately from Questions so question/answer saves
    cannot shift the normalized Questions schema. CategorySettings remains a
    compatibility mirror for existing scoring engines.
  */
  if (typeof questionModeReadMapForGame_ === "function") {
    const questionModes = questionModeReadMapForGame_(gameId);

    Object.keys(map).forEach(function(categoryId) {
      const mode = questionModes[adminCatNormalizeId_(categoryId)];
      if (!mode) return;
      map[categoryId].settings = map[categoryId].settings || {};
      map[categoryId].settings.scoreMode = adminCatNormalizeScoreMode_(mode);
    });
  }

  Object.keys(map).forEach(function(categoryId) {
    map[categoryId].cloneInfo = cloneInfoByCategory[categoryId] || null;
  });

  const categories =
    Object
      .values(map)
      .sort((a, b) => {

        const aOrder =
          Number(
            a.settings.displayOrder
          ) || 999;

        const bOrder =
          Number(
            b.settings.displayOrder
          ) || 999;

        return aOrder - bOrder;

      });

  return {
    success:
      true,

    gameId:
      gameId,

    game:
      typeof getGame === "function"
        ? getGame(gameId)
        : null,

    categories:
      categories
  };

}

/* =========================================================
   CREATE CATEGORY / QUESTION
========================================================= */

function adminCreateCategory(payload) {

  if (!payload) {

    throw new Error(
      "Category payload missing"
    );

  }

  const gameId =
    adminCatNormalizeGameId_(
      payload.gameId
    );

  if (!gameId) {

    throw new Error(
      "GameId is required"
    );

  }

  validateGameId(
    gameId
  );

  const categoryName =
    adminCatNormalizeValue_(
      payload.category ||
      payload.question ||
      payload.name
    );

  if (!categoryName) {

    throw new Error(
      "Category/question name is required"
    );

  }

  const parentGame =
    typeof getGame === "function"
      ? getGame(gameId)
      : null;

  const resolvedScoreMode =
    adminCatResolveScoreModeForGame_(
      gameId,
      payload.scoreMode
    );

  if (
    parentGame &&
    parentGame.gameRole === "parent" &&
    parentGame.hubMode === "leaderboard-only"
  ) {
    throw new Error(
      "This Season / Series Hub is Leaderboard Only. Change Hub Mode to Playable + Aggregate before adding parent questions."
    );
  }

  const categoryId =
    adminCatNormalizeId_(
      payload.categoryId ||
      adminCatSlugify_(
        categoryName
      )
    );

  if (!categoryId) {

    throw new Error(
      "CategoryId is required"
    );

  }

  const section =
    adminCatNormalizeValue_(
      payload.section ||
      "Main"
    );

  const lock =
    LockService
      .getScriptLock();

  lock.waitLock(
    10000
  );

  try {

    const setup =
      adminGetGameSetup({
        gameId:
          gameId
      });

    const exists =
      setup.categories.some(c =>
        adminCatNormalizeId_(
          c.categoryId
        ) === categoryId
      );

    if (exists) {

      throw new Error(
        "Category already exists: " +
        categoryId
      );

    }

    /*
      Normalized storage owns the question row. Categories remains a
      compatibility projection and receives rows only when answers/options
      are created. This removes the confusing blank anchor row.
    */
    if (typeof normalizedStorageUpsertQuestion_ === "function") {
      normalizedStorageUpsertQuestion_({
        gameId: gameId,
        questionId: categoryId,
        question: categoryName,
        section: section,
        categoryImage: payload.categoryImage || "",
        active: true,
        predictionGame: true,
        communityRank: false,
        questionType: payload.questionType || "award-single-winner",
        scoringEngine: payload.scoringEngine || "manual",
        selectionMode: payload.selectionMode || "single",
        entryType: payload.entryType || "",
        oddsMode: payload.oddsMode || "none",
        resultSource: payload.resultSource || "manual",
        sportsProvider: payload.sportsProvider || "",
        sportsLeague: payload.sportsLeague || "",
        sportsGameId: payload.sportsGameId || "",
        espnEventId: payload.espnEventId || "",
        sportsMarket: payload.sportsMarket || "",
        sourceSystem: "admin-normalized"
      });
    } else {
      adminCatAppendCategoryRow_({
        gameId: gameId,
        category: categoryName,
        categoryId: categoryId,
        nominee: "",
        nomineeId: "",
        section: section,
        fileId: "",
        shortAnswer: "",
        categoryImage: payload.categoryImage || "",
        active: true,
        predictionGame: true,
        communityRank: ""
      });
    }

    adminCatUpsertCategorySettings_({
      gameId:
        gameId,

      categoryId:
        categoryId,

      points:
        payload.points || 1,

      locked:
        adminCatToBoolean_(
          payload.locked
        ),

      winnerNomineeId:
        "",

      changePenalty:
        payload.changePenalty || 0,

      maxChanges:
        payload.maxChanges || 0,

      lockDateTime:
        payload.lockDateTime || "",

      displayOrder:
        payload.displayOrder || 999,

      groupId:
        payload.groupId || "default",

      parentCategoryId:
        payload.parentCategoryId || "",

      followUpCategoryId:
        payload.followUpCategoryId || "",

      followUpMapJSON:
        payload.followUpMapJSON || "",

      layoutType:
        payload.layoutType || "image",

      shortName:
        payload.shortName || categoryName,

      countsAsStatue:
        adminCatToBoolean_(
          payload.countsAsStatue
        ),

      scoreVersion:
        payload.scoreVersion || "",

      favoriteNomineeId:
        "",

      questionType:
        payload.questionType || "award-single-winner",

      scoringEngine:
        payload.scoringEngine || "manual",

      selectionMode:
        payload.selectionMode || "single",

      scoreMode:
        resolvedScoreMode,

      oddsMode:
        payload.oddsMode || "none",

      resultSource:
        payload.resultSource || "manual",

      settlementStatus:
        payload.settlementStatus || "pending",

      maxSelections:
        payload.maxSelections || 1,

      minSelections:
        payload.minSelections || 1,

      allowDraw:
        adminCatToBoolean_(payload.allowDraw),

      allowPush:
        adminCatToBoolean_(payload.allowPush),

      sportsGameId:
        payload.sportsGameId || "",

      espnEventId:
        payload.espnEventId || "",

      sportsMarket:
        payload.sportsMarket || "",

      sportsLeague:
        payload.sportsLeague || "",

      wagerResultType:
        payload.wagerResultType || "",

      minStake:
        payload.minStake === undefined ? 0 : payload.minStake,

      maxStake:
        payload.maxStake === undefined ? 0 : payload.maxStake,

      stakeIncrement:
        payload.stakeIncrement === undefined ? 0 : payload.stakeIncrement,

      stakeWinMultiplier:
        payload.stakeWinMultiplier === undefined ? "" : payload.stakeWinMultiplier,

      stakeLossMultiplier:
        payload.stakeLossMultiplier === undefined ? "" : payload.stakeLossMultiplier,

      resultSourceType:
        payload.resultSourceType || "manual",

      resultProvider:
        payload.resultProvider || "",

      externalEventId:
        payload.externalEventId || "",

      externalMarketId:
        payload.externalMarketId || "",

      externalSubjectId:
        payload.externalSubjectId || "",

      statKey:
        payload.statKey || "",

      comparisonOperator:
        payload.comparisonOperator || "",

      threshold:
        payload.threshold === undefined ? "" : payload.threshold,

      autoSettle:
        adminCatToBoolean_(payload.autoSettle),

      requireAdminReview:
        payload.requireAdminReview === undefined
          ? true
          : adminCatToBoolean_(payload.requireAdminReview),

      sourceUrl:
        payload.sourceUrl || "",

      sourceConfigJSON:
        payload.sourceConfigJSON || ""
    });

    if (
      typeof questionModeUpsert_ === "function" &&
      resolvedScoreMode
    ) {
      questionModeUpsert_(
        gameId,
        categoryId,
        resolvedScoreMode,
        "admin-create-question"
      );
    }

    SpreadsheetApp.flush();

    adminCatClearCaches_();

    return {
      success:
        true,

      message:
        "Category created",

      gameId:
        gameId,

      category:
        categoryName,

      categoryId:
        categoryId
    };

  } finally {

    lock.releaseLock();

  }

}

/* =========================================================
   UPDATE CATEGORY / QUESTION
========================================================= */

function adminUpdateCategory(payload) {

  if (!payload) {

    throw new Error(
      "Category payload missing"
    );

  }

  const gameId =
    adminCatNormalizeGameId_(
      payload.gameId
    );

  const categoryId =
    adminCatNormalizeId_(
      payload.categoryId
    );

  if (!gameId) {

    throw new Error(
      "GameId is required"
    );

  }

  if (!categoryId) {

    throw new Error(
      "CategoryId is required"
    );

  }

  validateGameId(
    gameId
  );

  payload.scoreMode =
    adminCatResolveScoreModeForGame_(
      gameId,
      payload.scoreMode
    );

  /*
    Production safety rule:
    Any resolved result automatically locks the question.
    Clearing a result does not automatically unlock it; an admin
    must explicitly reopen the question from Settings.
  */
  const settlementStatusForLock =
    adminCatNormalizeValue_(
      payload.settlementStatus || ""
    ).toLowerCase();

  const winnerNomineeIdForLock =
    adminCatNormalizeId_(
      payload.winnerNomineeId
    );

  const resolvedSettlementStatuses = {
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

  if (
    winnerNomineeIdForLock ||
    resolvedSettlementStatuses[settlementStatusForLock]
  ) {
    payload.locked = true;
  }

  const oldWinnerNomineeId =
    (
      "winnerNomineeId" in payload &&
      typeof getLiveResultsCurrentWinnerId_ === "function"
    )
      ? getLiveResultsCurrentWinnerId_(
          gameId,
          categoryId
        )
      : "";

  const lock =
    LockService
      .getScriptLock();

  lock.waitLock(
    10000
  );

  try {

    const sh =
      getCategoriesSheet_();

    const data =
      sh.getDataRange()
        .getValues();

    const headers =
      data[0].map(h =>
        String(h || "").trim()
      );

    const col =
      getCategoriesColumnMap_(
        headers
      );

    validateCategoriesColumns_(
      col
    );

    const rows =
      adminCatFindCategoryRows_(
        data,
        col,
        gameId,
        categoryId
      );

    rows.forEach(rowIndex => {

      const row =
        data[rowIndex - 1]
          .slice();

      if (
        "category" in payload ||
        "question" in payload ||
        "name" in payload
      ) {

        adminCatSetIfColumnExists_(
          row,
          col,
          "category",
          adminCatNormalizeValue_(
            payload.category ||
            payload.question ||
            payload.name
          )
        );

      }

      if ("section" in payload) {

        adminCatSetIfColumnExists_(
          row,
          col,
          "section",
          adminCatNormalizeValue_(
            payload.section
          )
        );

      }

      if ("categoryImage" in payload) {

        adminCatSetIfColumnExists_(
          row,
          col,
          "categoryImage",
          adminCatNormalizeValue_(
            payload.categoryImage
          )
        );

      }

      if ("active" in payload) {

        adminCatSetIfColumnExists_(
          row,
          col,
          "active",
          adminCatToBoolean_(
            payload.active
          )
        );

      }

      if ("predictionGame" in payload) {

        adminCatSetIfColumnExists_(
          row,
          col,
          "predictionGame",
          adminCatToBoolean_(
            payload.predictionGame
          )
        );

      }

      if ("communityRank" in payload) {

        adminCatSetIfColumnExists_(
          row,
          col,
          "communityRank",
          adminCatToBoolean_(
            payload.communityRank
          )
        );

      }

      sh.getRange(
        rowIndex,
        1,
        1,
        headers.length
      ).setValues([
        row
      ]);

    });

    adminCatUpsertCategorySettings_({
      gameId:
        gameId,

      categoryId:
        categoryId,

      points:
        "points" in payload
          ? payload.points
          : undefined,

      locked:
        "locked" in payload
          ? payload.locked
          : undefined,

      winnerNomineeId:
        "winnerNomineeId" in payload
          ? payload.winnerNomineeId
          : undefined,

      changePenalty:
        "changePenalty" in payload
          ? payload.changePenalty
          : undefined,

      maxChanges:
        "maxChanges" in payload
          ? payload.maxChanges
          : undefined,

      lockDateTime:
        "lockDateTime" in payload
          ? payload.lockDateTime
          : undefined,

      displayOrder:
        "displayOrder" in payload
          ? payload.displayOrder
          : undefined,

      groupId:
        "groupId" in payload
          ? payload.groupId
          : undefined,

      parentCategoryId:
        "parentCategoryId" in payload
          ? payload.parentCategoryId
          : undefined,

      followUpCategoryId:
        "followUpCategoryId" in payload
          ? payload.followUpCategoryId
          : undefined,

      followUpMapJSON:
        "followUpMapJSON" in payload
          ? payload.followUpMapJSON
          : undefined,

      layoutType:
        "layoutType" in payload
          ? payload.layoutType
          : undefined,

      shortName:
        "shortName" in payload
          ? payload.shortName
          : undefined,

      countsAsStatue:
        "countsAsStatue" in payload
          ? payload.countsAsStatue
          : undefined,

      scoreVersion:
        "scoreVersion" in payload
          ? payload.scoreVersion
          : undefined,

      favoriteNomineeId:
        "favoriteNomineeId" in payload
          ? payload.favoriteNomineeId
          : undefined,

      questionType:
        "questionType" in payload
          ? payload.questionType
          : undefined,

      scoringEngine:
        "scoringEngine" in payload
          ? payload.scoringEngine
          : undefined,

      selectionMode:
        "selectionMode" in payload
          ? payload.selectionMode
          : undefined,

      scoreMode:
        "scoreMode" in payload
          ? adminCatNormalizeScoreMode_(payload.scoreMode)
          : undefined,

      oddsMode:
        "oddsMode" in payload
          ? payload.oddsMode
          : undefined,

      resultSource:
        "resultSource" in payload
          ? payload.resultSource
          : undefined,

      settlementStatus:
        "settlementStatus" in payload
          ? payload.settlementStatus
          : undefined,

      maxSelections:
        "maxSelections" in payload
          ? payload.maxSelections
          : undefined,

      minSelections:
        "minSelections" in payload
          ? payload.minSelections
          : undefined,

      allowDraw:
        "allowDraw" in payload
          ? payload.allowDraw
          : undefined,

      allowPush:
        "allowPush" in payload
          ? payload.allowPush
          : undefined,

      sportsGameId:
        "sportsGameId" in payload
          ? payload.sportsGameId
          : undefined,

      espnEventId:
        "espnEventId" in payload
          ? payload.espnEventId
          : undefined,

      sportsMarket:
        "sportsMarket" in payload
          ? payload.sportsMarket
          : undefined,

      sportsLeague:
        "sportsLeague" in payload
          ? payload.sportsLeague
          : undefined,

      wagerResultType:
        "wagerResultType" in payload
          ? payload.wagerResultType
          : undefined,

      minStake:
        "minStake" in payload
          ? payload.minStake
          : undefined,

      maxStake:
        "maxStake" in payload
          ? payload.maxStake
          : undefined,

      stakeIncrement:
        "stakeIncrement" in payload
          ? payload.stakeIncrement
          : undefined,

      stakeWinMultiplier:
        "stakeWinMultiplier" in payload
          ? payload.stakeWinMultiplier
          : undefined,

      stakeLossMultiplier:
        "stakeLossMultiplier" in payload
          ? payload.stakeLossMultiplier
          : undefined,

      resultSourceType:
        "resultSourceType" in payload
          ? payload.resultSourceType
          : undefined,

      resultProvider:
        "resultProvider" in payload
          ? payload.resultProvider
          : undefined,

      externalEventId:
        "externalEventId" in payload
          ? payload.externalEventId
          : undefined,

      externalMarketId:
        "externalMarketId" in payload
          ? payload.externalMarketId
          : undefined,

      externalSubjectId:
        "externalSubjectId" in payload
          ? payload.externalSubjectId
          : undefined,

      statKey:
        "statKey" in payload
          ? payload.statKey
          : undefined,

      comparisonOperator:
        "comparisonOperator" in payload
          ? payload.comparisonOperator
          : undefined,

      threshold:
        "threshold" in payload
          ? payload.threshold
          : undefined,

      autoSettle:
        "autoSettle" in payload
          ? payload.autoSettle
          : undefined,

      requireAdminReview:
        "requireAdminReview" in payload
          ? payload.requireAdminReview
          : undefined,

      sourceUrl:
        "sourceUrl" in payload
          ? payload.sourceUrl
          : undefined,

      sourceConfigJSON:
        "sourceConfigJSON" in payload
          ? payload.sourceConfigJSON
          : undefined
    });
    
    if (
      typeof questionModeUpsert_ === "function" &&
      "scoreMode" in payload &&
      payload.scoreMode !== undefined &&
      payload.scoreMode !== null &&
      adminCatNormalizeValue_(payload.scoreMode) !== ""
    ) {
      questionModeUpsert_(
        gameId,
        categoryId,
        adminCatNormalizeScoreMode_(payload.scoreMode),
        "admin-update-question"
      );
    }

    if (
      payload.skipCategoryResultWrite !== true &&
      (
        "settlementStatus" in payload ||
        "winnerNomineeId" in payload
      ) &&
      typeof upsertCategoryResult_ === "function"
    ) {

      const normalizedSettlementStatus =
        adminCatNormalizeValue_(
          payload.settlementStatus || ""
        ).toLowerCase();

      const normalizedWinnerNomineeId =
        adminCatNormalizeId_(
          payload.winnerNomineeId
        );

      let categoryResultStatus =
        normalizedSettlementStatus;

      if (!categoryResultStatus) {
        categoryResultStatus =
          normalizedWinnerNomineeId
            ? "settled"
            : "pending";
      }

      const isNonWinnerResolution =
        categoryResultStatus === "push" ||
        categoryResultStatus === "pushed" ||
        categoryResultStatus === "void" ||
        categoryResultStatus === "cancelled" ||
        categoryResultStatus === "canceled" ||
        categoryResultStatus === "pending" ||
        categoryResultStatus === "open" ||
        categoryResultStatus === "cleared" ||
        categoryResultStatus === "unsettled";

      if (
        normalizedWinnerNomineeId ||
        isNonWinnerResolution
      ) {
        upsertCategoryResult_({
          gameId:
            gameId,
          categoryId:
            categoryId,
          nomineeId:
            isNonWinnerResolution
              ? ""
              : normalizedWinnerNomineeId,
          resultStatus:
            categoryResultStatus,
          isWinner:
            !isNonWinnerResolution &&
            !!normalizedWinnerNomineeId,
          resultValue:
            categoryResultStatus,
          resultSource:
            payload.resultSource ||
            payload.resultProvider ||
            "manual-admin",
          notes:
            payload.notes ||
            "Result saved from Manage Games panel"
        });
      }

    }

        if (
      "winnerNomineeId" in payload &&
      payload.winnerNomineeId !== undefined &&
      typeof recordLiveWinnerChange_ === "function"
    ) {

      recordLiveWinnerChange_({
        gameId:
          gameId,

        categoryId:
          categoryId,

        oldWinnerNomineeId:
          oldWinnerNomineeId,

        newWinnerNomineeId:
          adminCatNormalizeId_(
            payload.winnerNomineeId
          ),

        source:
          "manage-games",

        updatedBy:
          payload.username || "",

        notes:
          payload.notes || "Winner updated from Manage Games panel"
      });

    }
    
    if (typeof normalizedStorageUpsertQuestion_ === "function") {
      const normalizedQuestionPayload = Object.assign({}, payload, {
        gameId: gameId,
        questionId: categoryId
      });

      /*
        ScoreMode intentionally does not belong in Questions. It is saved in
        QuestionModes above and mirrored in CategorySettings.
      */
      delete normalizedQuestionPayload.scoreMode;
      delete normalizedQuestionPayload.ScoreMode;

      normalizedStorageUpsertQuestion_(normalizedQuestionPayload);
    }

    SpreadsheetApp.flush();

    adminCatClearCaches_();

    return {
      success:
        true,

      message:
        "Category updated",

      gameId:
        gameId,

      categoryId:
        categoryId
    };

  } finally {

    lock.releaseLock();

  }

}

/* =========================================================
   BULK SAVE QUESTIONS / ANSWERS
========================================================= */

function adminCatParseJsonArray_(value, label) {

  if (Array.isArray(value)) {
    return value;
  }

  const text = adminCatNormalizeValue_(value);

  if (!text) {
    return [];
  }

  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error((label || "Items") + " JSON is invalid.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error((label || "Items") + " must be an array.");
  }

  return parsed;

}

function adminBulkUpdateGameSetup(payload) {

  payload = payload || {};

  const gameId = adminCatNormalizeGameId_(payload.gameId);

  if (!gameId) {
    throw new Error("GameId is required");
  }

  validateGameId(gameId);

  const questions = adminCatParseJsonArray_(
    payload.questionsJSON || payload.questions,
    "Questions"
  );

  const answers = adminCatParseJsonArray_(
    payload.answersJSON || payload.answers,
    "Answers"
  );

  const questionResults = [];
  const answerResults = [];
  const failures = [];

  questions.forEach(function(item) {
    try {
      const result = adminUpdateCategory(
        Object.assign({}, item || {}, {
          gameId: gameId,
          username: payload.username || ""
        })
      );

      questionResults.push(result);
    } catch (err) {
      failures.push({
        type: "question",
        categoryId: adminCatNormalizeId_(item && item.categoryId),
        error: String(err && err.message ? err.message : err)
      });
    }
  });

  answers.forEach(function(item) {
    try {
      const result = adminUpdateNominee(
        Object.assign({}, item || {}, {
          gameId: gameId
        })
      );

      answerResults.push(result);
    } catch (err) {
      failures.push({
        type: "answer",
        categoryId: adminCatNormalizeId_(item && item.categoryId),
        nomineeId: adminCatNormalizeId_(item && item.nomineeId),
        error: String(err && err.message ? err.message : err)
      });
    }
  });

  return {
    success: failures.length === 0,
    message: failures.length
      ? "Some Game Setup changes could not be saved."
      : "All Game Setup changes saved.",
    questionsSaved: questionResults.length,
    answersSaved: answerResults.length,
    failures: failures
  };

}

/* =========================================================
   PERMANENT QUESTION DELETE
========================================================= */

function adminCatQuestionRowsInSheet_(sheetName, gameId, categoryId, idHeaders) {

  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);

  if (!sh || sh.getLastRow() < 2 || sh.getLastColumn() < 1) {
    return [];
  }

  const data = sh.getDataRange().getValues();
  const headers = data[0].map(function(value) {
    return adminCatNormalizeValue_(value);
  });

  const gameCol = headers.indexOf("GameId");
  let idCol = -1;

  (idHeaders || ["CategoryId", "QuestionId"]).some(function(header) {
    const candidate = headers.indexOf(header);
    if (candidate !== -1) {
      idCol = candidate;
      return true;
    }
    return false;
  });

  if (gameCol === -1 || idCol === -1) {
    return [];
  }

  const normalizedGameId = adminCatNormalizeGameId_(gameId);
  const normalizedCategoryId = adminCatNormalizeId_(categoryId);
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    if (
      adminCatNormalizeGameId_(data[i][gameCol]) === normalizedGameId &&
      adminCatNormalizeId_(data[i][idCol]) === normalizedCategoryId
    ) {
      rows.push(i + 1);
    }
  }

  return rows;

}

function adminCatDeleteQuestionRows_(sheetName, gameId, categoryId, idHeaders) {

  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const rows = adminCatQuestionRowsInSheet_(
    sheetName,
    gameId,
    categoryId,
    idHeaders
  );

  if (!sh || !rows.length) {
    return 0;
  }

  rows.sort(function(a, b) { return b - a; }).forEach(function(rowNumber) {
    sh.deleteRow(rowNumber);
  });

  return rows.length;

}

function adminDeleteCategory(payload) {

  payload = payload || {};

  const gameId = adminCatNormalizeGameId_(payload.gameId);
  const categoryId = adminCatNormalizeId_(payload.categoryId);

  if (!gameId || !categoryId) {
    throw new Error("GameId and CategoryId are required");
  }

  validateGameId(gameId);

  const protectedSheets = [
    { name: typeof PICKS_SHEET !== "undefined" ? PICKS_SHEET : "Picks", idHeaders: ["CategoryId", "QuestionId"] },
    { name: typeof BETS_SHEET !== "undefined" ? BETS_SHEET : "Bets", idHeaders: ["CategoryId", "QuestionId"] },
    { name: typeof CATEGORY_RESULTS_SHEET !== "undefined" ? CATEGORY_RESULTS_SHEET : "CategoryResults", idHeaders: ["CategoryId", "QuestionId"] }
  ];

  const references = {};
  let referenceCount = 0;

  protectedSheets.forEach(function(config) {
    const count = adminCatQuestionRowsInSheet_(
      config.name,
      gameId,
      categoryId,
      config.idHeaders
    ).length;

    references[config.name] = count;
    referenceCount += count;
  });

  if (referenceCount > 0) {
    return {
      success: false,
      blocked: true,
      message:
        "This question has saved picks, wagers, or results and cannot be permanently deleted. Use Archive Question to preserve history.",
      references: references
    };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const deleted = {};

    [
      { name: typeof QUESTION_OPTIONS_SHEET !== "undefined" ? QUESTION_OPTIONS_SHEET : "QuestionOptions", idHeaders: ["QuestionId", "CategoryId"] },
      { name: typeof QUESTIONS_SHEET !== "undefined" ? QUESTIONS_SHEET : "Questions", idHeaders: ["QuestionId", "CategoryId"] },
      { name: typeof CATEGORIES_SHEET !== "undefined" ? CATEGORIES_SHEET : "Categories", idHeaders: ["CategoryId", "QuestionId"] },
      { name: typeof CATEGORY_SETTINGS_SHEET !== "undefined" ? CATEGORY_SETTINGS_SHEET : "CategorySettings", idHeaders: ["CategoryId", "QuestionId"] },
      { name: typeof CATEGORY_RESULTS_SHEET !== "undefined" ? CATEGORY_RESULTS_SHEET : "CategoryResults", idHeaders: ["CategoryId", "QuestionId"] },
      { name: "LiveResults", idHeaders: ["CategoryId", "QuestionId"] }
    ].forEach(function(config) {
      deleted[config.name] = adminCatDeleteQuestionRows_(
        config.name,
        gameId,
        categoryId,
        config.idHeaders
      );
    });

    if (typeof normalizedStorageRebuildIndexForSheet_ === "function") {
      normalizedStorageRebuildIndexForSheet_(
        typeof QUESTIONS_SHEET !== "undefined" ? QUESTIONS_SHEET : "Questions",
        "Questions"
      );
      normalizedStorageRebuildIndexForSheet_(
        typeof QUESTION_OPTIONS_SHEET !== "undefined" ? QUESTION_OPTIONS_SHEET : "QuestionOptions",
        "QuestionOptions"
      );
    }

    SpreadsheetApp.flush();
    adminCatClearCaches_();

    return {
      success: true,
      message: "Question permanently deleted.",
      gameId: gameId,
      categoryId: categoryId,
      deleted: deleted
    };
  } finally {
    lock.releaseLock();
  }

}

/* =========================================================
   PERMANENT NOMINEE / ANSWER DELETE
========================================================= */

function adminCatAnswerRowsInSheet_(
  sheetName,
  gameId,
  categoryId,
  nomineeId,
  categoryHeaders,
  nomineeHeaders
) {

  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);

  if (!sh || sh.getLastRow() < 2 || sh.getLastColumn() < 1) {
    return [];
  }

  const data = sh.getDataRange().getValues();
  const headers = data[0].map(function(value) {
    return adminCatNormalizeValue_(value);
  });

  function firstColumn_(candidates) {
    for (let i = 0; i < candidates.length; i++) {
      const index = headers.indexOf(candidates[i]);
      if (index !== -1) return index;
    }
    return -1;
  }

  const gameCol = firstColumn_(["GameId"]);
  const categoryCol = firstColumn_(
    categoryHeaders || ["CategoryId", "QuestionId"]
  );
  const nomineeCols = (nomineeHeaders || ["NomineeId", "OptionId"])
    .map(function(header) { return headers.indexOf(header); })
    .filter(function(index) { return index !== -1; });

  if (categoryCol === -1 || !nomineeCols.length) {
    return [];
  }

  const cleanGameId = adminCatNormalizeGameId_(gameId);
  const cleanCategoryId = adminCatNormalizeId_(categoryId);
  const cleanNomineeId = adminCatNormalizeId_(nomineeId);
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    if (
      gameCol !== -1 &&
      adminCatNormalizeGameId_(data[i][gameCol]) !== cleanGameId
    ) {
      continue;
    }

    if (
      adminCatNormalizeId_(data[i][categoryCol]) !== cleanCategoryId
    ) {
      continue;
    }

    const matchesNominee = nomineeCols.some(function(columnIndex) {
      return adminCatNormalizeId_(data[i][columnIndex]) === cleanNomineeId;
    });

    if (matchesNominee) {
      rows.push(i + 1);
    }
  }

  return rows;

}

function adminCatDeleteAnswerRows_(
  sheetName,
  gameId,
  categoryId,
  nomineeId,
  categoryHeaders,
  nomineeHeaders
) {

  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const rows = adminCatAnswerRowsInSheet_(
    sheetName,
    gameId,
    categoryId,
    nomineeId,
    categoryHeaders,
    nomineeHeaders
  );

  if (!sh || !rows.length) {
    return 0;
  }

  rows.sort(function(a, b) { return b - a; }).forEach(function(rowNumber) {
    sh.deleteRow(rowNumber);
  });

  return rows.length;

}

function adminDeleteNominee(payload) {

  payload = payload || {};

  const gameId = adminCatNormalizeGameId_(payload.gameId);
  const categoryId = adminCatNormalizeId_(payload.categoryId);
  const nomineeId = adminCatNormalizeId_(payload.nomineeId);

  if (!gameId || !categoryId || !nomineeId) {
    throw new Error("GameId, CategoryId, and NomineeId are required");
  }

  validateGameId(gameId);

  /*
    Permanent deletion is safe only before this answer is referenced by
    picks, wagers, votes, winners, or result history. Otherwise archiving
    preserves the historical IDs and keeps scoring/leaderboards intact.
  */
  const protectedSheets = [
    {
      name: typeof PICKS_SHEET !== "undefined" ? PICKS_SHEET : "Picks",
      nomineeHeaders: ["NomineeId", "OriginalNomineeId"]
    },
    {
      name: typeof BETS_SHEET !== "undefined" ? BETS_SHEET : "Bets",
      nomineeHeaders: ["NomineeId", "OriginalNomineeId"]
    },
    {
      name: "Votes",
      nomineeHeaders: ["NomineeId"]
    },
    {
      name: typeof CATEGORY_RESULTS_SHEET !== "undefined"
        ? CATEGORY_RESULTS_SHEET
        : "CategoryResults",
      nomineeHeaders: ["NomineeId"]
    },
    {
      name: typeof CATEGORY_SETTINGS_SHEET !== "undefined"
        ? CATEGORY_SETTINGS_SHEET
        : "CategorySettings",
      nomineeHeaders: ["WinnerNomineeId", "FavoriteNomineeId"]
    },
    {
      name: "LiveResults",
      nomineeHeaders: ["OldWinnerNomineeId", "NewWinnerNomineeId", "NomineeId"]
    }
  ];

  const references = {};
  let referenceCount = 0;

  protectedSheets.forEach(function(config) {
    const count = adminCatAnswerRowsInSheet_(
      config.name,
      gameId,
      categoryId,
      nomineeId,
      ["CategoryId", "QuestionId"],
      config.nomineeHeaders
    ).length;

    references[config.name] = count;
    referenceCount += count;
  });

  if (referenceCount > 0) {
    return {
      success: false,
      blocked: true,
      message:
        "This answer has saved picks, wagers, votes, or results and cannot be permanently deleted. Use Archive Answer to preserve history.",
      references: references
    };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const deleted = {};

    deleted.Categories = adminCatDeleteAnswerRows_(
      typeof CATEGORIES_SHEET !== "undefined" ? CATEGORIES_SHEET : "Categories",
      gameId,
      categoryId,
      nomineeId,
      ["CategoryId", "QuestionId"],
      ["NomineeId", "OptionId"]
    );

    deleted.QuestionOptions = adminCatDeleteAnswerRows_(
      typeof QUESTION_OPTIONS_SHEET !== "undefined"
        ? QUESTION_OPTIONS_SHEET
        : "QuestionOptions",
      gameId,
      categoryId,
      nomineeId,
      ["QuestionId", "CategoryId"],
      ["OptionId", "NomineeId"]
    );

    if (!deleted.Categories && !deleted.QuestionOptions) {
      return {
        success: false,
        message: "Answer was not found.",
        gameId: gameId,
        categoryId: categoryId,
        nomineeId: nomineeId
      };
    }

    if (
      typeof normalizedStorageUpsertIndexEntry_ === "function" &&
      typeof normalizedStorageFindRowsByGame_ === "function"
    ) {
      const optionSheetName =
        typeof QUESTION_OPTIONS_SHEET !== "undefined"
          ? QUESTION_OPTIONS_SHEET
          : "QuestionOptions";
      const optionSheet = SpreadsheetApp.getActive().getSheetByName(
        optionSheetName
      );

      normalizedStorageUpsertIndexEntry_({
        entityType: "QuestionOptions",
        gameId: gameId,
        sheetName: optionSheetName,
        rowNumbers: optionSheet
          ? normalizedStorageFindRowsByGame_(optionSheet, gameId)
          : [],
        dataVersion:
          typeof NORMALIZED_STORAGE_VERSION !== "undefined"
            ? NORMALIZED_STORAGE_VERSION
            : 1
      });
    } else if (typeof normalizedStorageRebuildIndexForSheet_ === "function") {
      normalizedStorageRebuildIndexForSheet_(
        typeof QUESTION_OPTIONS_SHEET !== "undefined"
          ? QUESTION_OPTIONS_SHEET
          : "QuestionOptions",
        "QuestionOptions"
      );
    }

    SpreadsheetApp.flush();
    adminCatClearCaches_();

    return {
      success: true,
      message: "Answer permanently deleted.",
      gameId: gameId,
      categoryId: categoryId,
      nomineeId: nomineeId,
      deleted: deleted
    };
  } finally {
    lock.releaseLock();
  }

}

/* =========================================================
   ARCHIVE CATEGORY / QUESTION
========================================================= */

function adminArchiveCategory(payload) {

  if (!payload) {

    throw new Error(
      "Category payload missing"
    );

  }

  payload.active =
    false;

  payload.locked =
    true;

  const result =
    adminUpdateCategory(
      payload
    );

  result.message =
    "Category archived";

  return result;

}

/* =========================================================
   ADD NOMINEE / ANSWER CHOICE
========================================================= */

function adminCreateNominee(payload) {

  if (!payload) {

    throw new Error(
      "Nominee payload missing"
    );

  }

  const gameId =
    adminCatNormalizeGameId_(
      payload.gameId
    );

  const categoryId =
    adminCatNormalizeId_(
      payload.categoryId
    );

  if (!gameId) {

    throw new Error(
      "GameId is required"
    );

  }

  if (!categoryId) {

    throw new Error(
      "CategoryId is required"
    );

  }

  validateGameId(
    gameId
  );

  const nomineeName =
    adminCatNormalizeValue_(
      payload.nominee ||
      payload.answer ||
      payload.name
    );

  if (!nomineeName) {

    throw new Error(
      "Nominee/answer name is required"
    );

  }

  const nomineeId =
    adminCatNormalizeId_(
      payload.nomineeId ||
      adminCatSlugify_(
        nomineeName
      )
    );

  if (!nomineeId) {

    throw new Error(
      "NomineeId is required"
    );

  }

  const lock =
    LockService
      .getScriptLock();

  lock.waitLock(
    10000
  );

  try {

    const setup =
      adminGetGameSetup({
        gameId:
          gameId
      });

    const category =
      setup.categories.find(c =>
        adminCatNormalizeId_(
          c.categoryId
        ) === categoryId
      );

    if (!category) {

      throw new Error(
        "Category not found: " +
        categoryId
      );

    }

    const duplicate =
      category.nominees.some(n =>
        adminCatNormalizeId_(
          n.nomineeId
        ) === nomineeId
      );

    if (duplicate) {

      throw new Error(
        "Nominee already exists: " +
        nomineeId
      );

    }

    const sh =
      getCategoriesSheet_();

    const data =
      sh.getDataRange()
        .getValues();

    const headers =
      data[0].map(h =>
        String(h || "").trim()
      );

    const col =
      getCategoriesColumnMap_(
        headers
      );

    validateCategoriesColumns_(
      col
    );

    const categoryName =
      adminCatNormalizeValue_(
        payload.category ||
        payload.question ||
        category.category
      );

    if (!categoryName) {

      throw new Error(
        "Category name is required before adding nominees"
      );

    }

    const row =
      adminCatBuildNomineeRow_(
        headers,
        col,
        {
          gameId:
            gameId,

          categoryId:
            categoryId,

          category:
            categoryName,

          nominee:
            nomineeName,

          nomineeId:
            nomineeId,

          section:
            payload.section ||
            category.section ||
            "Other",

          fileId:
            payload.fileId || "",

          shortAnswer:
            payload.shortAnswer ||
            nomineeName,

          categoryImage:
            payload.categoryImage ||
            category.categoryImage ||
            "",

          movieId:
            payload.movieId || "",

          movie:
            payload.movie || "",

          person:
            payload.person || "",

          active:
            "active" in payload
              ? payload.active
              : true,

          predictionGame:
            "predictionGame" in payload
              ? payload.predictionGame
              : category.predictionGame,

          communityRank:
            "communityRank" in payload
              ? payload.communityRank
              : category.communityRank
        }
      );

    sh.appendRow(
      row
    );

    if (typeof normalizedStorageUpsertOption_ === "function") {
      normalizedStorageUpsertOption_({
        gameId: gameId,
        questionId: categoryId,
        optionId: nomineeId,
        option: nomineeName,
        shortAnswer: payload.shortAnswer || nomineeName,
        fileId: payload.fileId || "",
        logoUrl: payload.logoUrl || "",
        movieId: payload.movieId || "",
        movie: payload.movie || "",
        person: payload.person || "",
        active: "active" in payload ? payload.active : true,
        sourceSystem: "admin-normalized"
      });
    }

    SpreadsheetApp.flush();

    adminCatClearCaches_();

    return {
      success:
        true,

      message:
        "Nominee created",

      gameId:
        gameId,

      categoryId:
        categoryId,

      nomineeId:
        nomineeId
    };

  } finally {

    lock.releaseLock();

  }

}

/* =========================================================
   UPDATE NOMINEE / ANSWER CHOICE
========================================================= */

function adminUpdateNominee(payload) {

  if (!payload) {

    throw new Error(
      "Nominee payload missing"
    );

  }

  const gameId =
    adminCatNormalizeGameId_(
      payload.gameId
    );

  const categoryId =
    adminCatNormalizeId_(
      payload.categoryId
    );

  const nomineeId =
    adminCatNormalizeId_(
      payload.nomineeId
    );

  if (!gameId) {

    throw new Error(
      "GameId is required"
    );

  }

  if (!categoryId) {

    throw new Error(
      "CategoryId is required"
    );

  }

  if (!nomineeId) {

    throw new Error(
      "NomineeId is required"
    );

  }

  validateGameId(
    gameId
  );

  const lock =
    LockService
      .getScriptLock();

  lock.waitLock(
    10000
  );

  try {

    const sh =
      getCategoriesSheet_();

    const data =
      sh.getDataRange()
        .getValues();

    const headers =
      data[0].map(h =>
        String(h || "").trim()
      );

    const col =
      getCategoriesColumnMap_(
        headers
      );

    validateCategoriesColumns_(
      col
    );

    const rowIndexes =
      adminCatFindNomineeRows_(
        data,
        col,
        gameId,
        categoryId,
        nomineeId
      );

    if (!rowIndexes.length) {

      throw new Error(
        "Nominee not found: " +
        nomineeId
      );

    }

    /* Keep every legacy duplicate row aligned with the canonical option. */
    rowIndexes.forEach(function(rowIndex) {
      const row = data[rowIndex - 1].slice();

      if (
        "nominee" in payload ||
        "answer" in payload ||
        "name" in payload
      ) {

        adminCatSetIfColumnExists_(
          row,
          col,
          "nominee",
          adminCatNormalizeValue_(
            payload.nominee ||
            payload.answer ||
            payload.name
          )
        );

      }

      if ("fileId" in payload) {

        adminCatSetIfColumnExists_(
          row,
          col,
          "fileId",
          adminCatNormalizeValue_(
            payload.fileId
          )
        );

      }

      if ("shortAnswer" in payload) {

        adminCatSetIfColumnExists_(
          row,
          col,
          "shortAnswer",
          adminCatNormalizeValue_(
            payload.shortAnswer
          )
        );

      }

      if ("movieId" in payload) {

        adminCatSetIfColumnExists_(
          row,
          col,
          "movieId",
          adminCatNormalizeValue_(
            payload.movieId
          )
        );

      }

      if ("movie" in payload) {

        adminCatSetIfColumnExists_(
          row,
          col,
          "movie",
          adminCatNormalizeValue_(
            payload.movie
          )
        );

      }

      if ("person" in payload) {

        adminCatSetIfColumnExists_(
          row,
          col,
          "person",
          adminCatNormalizeValue_(
            payload.person
          )
        );

      }

      if ("active" in payload) {

        adminCatSetIfColumnExists_(
          row,
          col,
          "active",
          adminCatToBoolean_(
            payload.active
          )
        );

      }

      sh.getRange(
        rowIndex,
        1,
        1,
        headers.length
      ).setValues([
        row
      ]);
    });

    if (typeof normalizedStorageUpsertOption_ === "function") {
      normalizedStorageUpsertOption_(
        Object.assign({}, payload, {
          gameId: gameId,
          questionId: categoryId,
          optionId: nomineeId
        })
      );
    }

    SpreadsheetApp.flush();

    adminCatClearCaches_();

    return {
      success:
        true,

      message:
        "Nominee updated",

      gameId:
        gameId,

      categoryId:
        categoryId,

      nomineeId:
        nomineeId
    };

  } finally {

    lock.releaseLock();

  }

}

/* =========================================================
   ARCHIVE NOMINEE / ANSWER CHOICE
========================================================= */

function adminArchiveNominee(payload) {

  if (!payload) {

    throw new Error(
      "Nominee payload missing"
    );

  }

  payload.active =
    false;

  const result =
    adminUpdateNominee(
      payload
    );

  result.message =
    "Nominee archived";

  return result;

}

/* =========================================================
   CLONE / BULK QUESTION SETUP HELPERS
========================================================= */

function adminCatParseItemsJson_(value) {

  if (Array.isArray(value)) {
    return value;
  }

  const text = String(value || "").trim();

  if (!text) {
    return [];
  }

  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error("Invalid items JSON");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Items JSON must be an array");
  }

  return parsed;

}

function adminCatUniqueId_(preferredId, existingIds) {

  const used = existingIds || {};
  const base = adminCatNormalizeId_(preferredId) || "item";

  if (!used[base]) {
    return base;
  }

  let number = 2;
  let candidate = base + "-" + number;

  while (used[candidate]) {
    number += 1;
    candidate = base + "-" + number;
  }

  return candidate;

}

function adminCatNextSequentialId_(sourceId, existingIds) {

  const used = existingIds || {};
  const normalized = adminCatNormalizeId_(sourceId) || "question";
  const match = normalized.match(/^(.*?)-(\d+)$/);
  const base = match && match[1] ? match[1] : normalized;
  let number = match ? Number(match[2]) + 1 : 2;
  let candidate = base + "-" + number;

  while (used[candidate]) {
    number += 1;
    candidate = base + "-" + number;
  }

  return candidate;

}

function adminCatNextDisplayOrder_(categories, section) {

  const targetSection = adminCatNormalizeValue_(section || "Main").toLowerCase();
  let highest = 0;

  (categories || []).forEach(function(category) {
    const categorySection = adminCatNormalizeValue_(category && category.section || "Main").toLowerCase();

    if (categorySection !== targetSection) {
      return;
    }

    const order = Number(category && category.settings && category.settings.displayOrder);

    if (isFinite(order) && order > highest) {
      highest = order;
    }
  });

  return highest + 1;

}

function adminCloneCategory(payload) {

  payload = payload || {};

  const sourceGameId = adminCatNormalizeGameId_(
    payload.sourceGameId || payload.gameId
  );

  const targetGameId = adminCatNormalizeGameId_(
    payload.targetGameId || payload.gameId || sourceGameId
  );

  const sourceCategoryId = adminCatNormalizeId_(
    payload.sourceCategoryId || payload.categoryId
  );

  if (!sourceGameId || !targetGameId || !sourceCategoryId) {
    throw new Error("Source game, target game, and source category are required");
  }

  validateGameId(sourceGameId);
  validateGameId(targetGameId);

  const sourceSetup = adminGetGameSetup({ gameId: sourceGameId });
  const targetSetup = sourceGameId === targetGameId
    ? sourceSetup
    : adminGetGameSetup({ gameId: targetGameId });

  const sourceCategory = sourceSetup.categories.find(function(category) {
    return adminCatNormalizeId_(category.categoryId) === sourceCategoryId;
  });

  if (!sourceCategory) {
    throw new Error("Source category not found: " + sourceCategoryId);
  }

  const settings = sourceCategory.settings || {};
  const requestedName = adminCatNormalizeValue_(
    payload.category || payload.question || payload.name
  );
  const categoryName = requestedName || (sourceCategory.category + " Copy");

  const usedCategoryIds = {};
  (targetSetup.categories || []).forEach(function(category) {
    usedCategoryIds[adminCatNormalizeId_(category.categoryId)] = true;
  });

  const has = function(key) {
    return Object.prototype.hasOwnProperty.call(payload, key);
  };

  const targetSection = has("section")
    ? adminCatNormalizeValue_(payload.section) || "Main"
    : sourceCategory.section || "Main";

  const preferredCategoryId = payload.newCategoryId || payload.categoryIdOverride ||
    adminCatNextSequentialId_(sourceCategoryId, usedCategoryIds);

  const categoryId = adminCatUniqueId_(
    preferredCategoryId,
    usedCategoryIds
  );

  const requestedDisplayOrder = has("displayOrder")
    ? adminCatNormalizeValue_(payload.displayOrder)
    : "";

  const targetDisplayOrder = requestedDisplayOrder !== ""
    ? payload.displayOrder
    : adminCatNextDisplayOrder_(targetSetup.categories, targetSection);

  const requestedLockDateTime = has("lockDateTime")
    ? adminCatNormalizeValue_(payload.lockDateTime)
    : "";

  const targetLockDateTime = requestedLockDateTime || settings.lockDateTime || "";

  const createResult = adminCreateCategory({
    gameId: targetGameId,
    category: categoryName,
    categoryId: categoryId,
    section: targetSection,
    categoryImage: adminCatToBoolean_(payload.copyCategoryImage)
      ? sourceCategory.categoryImage || ""
      : "",
    points: has("points") ? payload.points : settings.points,
    locked: has("locked") ? payload.locked : false,
    changePenalty: settings.changePenalty,
    maxChanges: settings.maxChanges,
    lockDateTime: targetLockDateTime,
    displayOrder: targetDisplayOrder,
    groupId: has("groupId") ? payload.groupId : settings.groupId,
    parentCategoryId: has("parentCategoryId") ? payload.parentCategoryId : settings.parentCategoryId,
    followUpCategoryId: has("followUpCategoryId") ? payload.followUpCategoryId : settings.followUpCategoryId,
    followUpMapJSON: has("followUpMapJSON") ? payload.followUpMapJSON : settings.followUpMapJSON,
    layoutType: has("layoutType") ? payload.layoutType : settings.layoutType,
    shortName: has("shortName") ? payload.shortName : categoryName,
    countsAsStatue: has("countsAsStatue") ? payload.countsAsStatue : settings.countsAsStatue,
    scoreVersion: settings.scoreVersion,
    questionType: has("questionType") ? payload.questionType : settings.questionType,
    scoringEngine: has("scoringEngine") ? payload.scoringEngine : settings.scoringEngine,
    selectionMode: has("selectionMode") ? payload.selectionMode : settings.selectionMode,
    scoreMode: has("scoreMode") ? payload.scoreMode : settings.scoreMode,
    oddsMode: settings.oddsMode,
    resultSource: settings.resultSource,
    settlementStatus: "pending",
    maxSelections: settings.maxSelections,
    minSelections: settings.minSelections,
    allowDraw: settings.allowDraw,
    allowPush: settings.allowPush,
    sportsGameId: has("sportsGameId") ? payload.sportsGameId : settings.sportsGameId,
    espnEventId: has("espnEventId") ? payload.espnEventId : settings.espnEventId,
    sportsMarket: has("sportsMarket") ? payload.sportsMarket : settings.sportsMarket,
    sportsLeague: has("sportsLeague") ? payload.sportsLeague : settings.sportsLeague,
    wagerResultType: has("wagerResultType") ? payload.wagerResultType : settings.wagerResultType,
    minStake: has("minStake") ? payload.minStake : settings.minStake,
    maxStake: has("maxStake") ? payload.maxStake : settings.maxStake,
    stakeIncrement: has("stakeIncrement") ? payload.stakeIncrement : settings.stakeIncrement,
    stakeWinMultiplier: has("stakeWinMultiplier") ? payload.stakeWinMultiplier : settings.stakeWinMultiplier,
    stakeLossMultiplier: has("stakeLossMultiplier") ? payload.stakeLossMultiplier : settings.stakeLossMultiplier,
    resultSourceType: has("resultSourceType") ? payload.resultSourceType : settings.resultSourceType,
    resultProvider: has("resultProvider") ? payload.resultProvider : settings.resultProvider,
    externalEventId: has("externalEventId") ? payload.externalEventId : settings.externalEventId,
    externalMarketId: has("externalMarketId") ? payload.externalMarketId : settings.externalMarketId,
    externalSubjectId: has("externalSubjectId") ? payload.externalSubjectId : settings.externalSubjectId,
    statKey: has("statKey") ? payload.statKey : settings.statKey,
    comparisonOperator: has("comparisonOperator") ? payload.comparisonOperator : settings.comparisonOperator,
    threshold: has("threshold") ? payload.threshold : settings.threshold,
    autoSettle: has("autoSettle") ? payload.autoSettle : settings.autoSettle,
    requireAdminReview: has("requireAdminReview") ? payload.requireAdminReview : settings.requireAdminReview,
    sourceUrl: has("sourceUrl") ? payload.sourceUrl : settings.sourceUrl,
    sourceConfigJSON: has("sourceConfigJSON") ? payload.sourceConfigJSON : settings.sourceConfigJSON
  });

  /*
    Persist the clone origin in normalized question metadata. This gives the
    admin UI a permanent "Clone of ..." label without adding columns to the
    legacy Categories or CategorySettings tables.
  */
  if (typeof normalizedStorageUpsertQuestion_ === "function") {
    normalizedStorageUpsertQuestion_({
      gameId: targetGameId,
      questionId: categoryId,
      payloadJSON: JSON.stringify({
        CloneSourceGameId: sourceGameId,
        CloneSourceCategoryId: sourceCategoryId,
        ClonedAt: new Date().toISOString()
      }),
      sourceSystem: "admin-clone"
    });
    adminCatClearCaches_();
  }

  const copyNominees = payload.copyNominees === undefined
    ? true
    : adminCatToBoolean_(payload.copyNominees);
  const copyImages = payload.copyImages === undefined
    ? true
    : adminCatToBoolean_(payload.copyImages);

  let nomineeResult = {
    success: true,
    createdCount: 0,
    created: [],
    errors: []
  };

  if (copyNominees && Array.isArray(sourceCategory.nominees) && sourceCategory.nominees.length) {
    nomineeResult = adminBulkCreateNominees({
      gameId: targetGameId,
      categoryId: categoryId,
      category: categoryName,
      section: targetSection,
      itemsJSON: JSON.stringify(sourceCategory.nominees.map(function(nominee) {
        return {
          nominee: nominee.nominee,
          nomineeId: nominee.nomineeId,
          shortAnswer: nominee.shortAnswer || nominee.nominee,
          fileId: copyImages ? nominee.fileId || "" : "",
          movieId: nominee.movieId || "",
          movie: nominee.movie || "",
          person: nominee.person || "",
          active: nominee.active !== false
        };
      }))
    });
  }

  return {
    success: true,
    message: "Question cloned",
    gameId: targetGameId,
    categoryId: categoryId,
    category: categoryName,
    categoryResult: createResult,
    nomineeResult: nomineeResult
  };

}

function adminBulkCreateNominees(payload) {

  payload = payload || {};

  const gameId = adminCatNormalizeGameId_(payload.gameId);
  const categoryId = adminCatNormalizeId_(payload.categoryId);
  const items = adminCatParseItemsJson_(payload.itemsJSON || payload.items);

  if (!gameId || !categoryId) {
    throw new Error("GameId and CategoryId are required");
  }

  if (!items.length) {
    throw new Error("At least one nominee/answer is required");
  }

  if (items.length > 250) {
    throw new Error("Bulk nominee limit is 250 answers per request");
  }

  validateGameId(gameId);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const setup = adminGetGameSetup({ gameId: gameId });
    const category = setup.categories.find(function(item) {
      return adminCatNormalizeId_(item.categoryId) === categoryId;
    });

    if (!category) {
      throw new Error("Category not found: " + categoryId);
    }

    const sh = getCategoriesSheet_();
    const data = sh.getDataRange().getValues();
    const headers = data[0].map(function(header) {
      return String(header || "").trim();
    });
    const col = getCategoriesColumnMap_(headers);
    validateCategoriesColumns_(col);

    const usedIds = {};
    (category.nominees || []).forEach(function(nominee) {
      usedIds[adminCatNormalizeId_(nominee.nomineeId)] = true;
    });

    const rows = [];
    const created = [];
    const errors = [];

    items.forEach(function(rawItem, index) {
      const item = rawItem || {};
      const nomineeName = adminCatNormalizeValue_(
        item.nominee || item.answer || item.name
      );

      if (!nomineeName) {
        errors.push({ index: index, message: "Answer name is required" });
        return;
      }

      const preferredId = adminCatNormalizeId_(
        item.nomineeId || item.answerId || adminCatSlugify_(nomineeName)
      );
      const nomineeId = adminCatUniqueId_(preferredId, usedIds);
      usedIds[nomineeId] = true;

      const row = adminCatBuildNomineeRow_(headers, col, {
        gameId: gameId,
        categoryId: categoryId,
        category: payload.category || category.category,
        nominee: nomineeName,
        nomineeId: nomineeId,
        section: item.section || payload.section || category.section || "Other",
        fileId: item.fileId || "",
        shortAnswer: item.shortAnswer || nomineeName,
        categoryImage: item.categoryImage || category.categoryImage || "",
        movieId: item.movieId || "",
        movie: item.movie || "",
        person: item.person || "",
        active: item.active === undefined ? true : adminCatToBoolean_(item.active),
        predictionGame: item.predictionGame === undefined
          ? category.predictionGame
          : adminCatToBoolean_(item.predictionGame),
        communityRank: item.communityRank === undefined
          ? category.communityRank
          : item.communityRank
      });

      rows.push(row);
      created.push({
        nomineeId: nomineeId,
        nominee: nomineeName,
        shortAnswer: item.shortAnswer || nomineeName,
        fileId: item.fileId || "",
        logoUrl: item.logoUrl || "",
        movieId: item.movieId || "",
        movie: item.movie || "",
        person: item.person || "",
        active: item.active === undefined ? true : adminCatToBoolean_(item.active)
      });
    });

    if (rows.length) {
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, headers.length)
        .setValues(rows);

      if (typeof normalizedStorageUpsertOptionsBulk_ === "function") {
        normalizedStorageUpsertOptionsBulk_(
          created.map(function(item, itemIndex) {
            return {
              gameId: gameId,
              questionId: categoryId,
              optionId: item.nomineeId,
              option: item.nominee,
              shortAnswer: item.shortAnswer || item.nominee,
              fileId: item.fileId || "",
              logoUrl: item.logoUrl || "",
              movieId: item.movieId || "",
              movie: item.movie || "",
              person: item.person || "",
              active: item.active,
              displayOrder: itemIndex + 1,
              sourceSystem: "admin-normalized"
            };
          })
        );
      } else if (typeof normalizedStorageUpsertOption_ === "function") {
        created.forEach(function(item, itemIndex) {
          normalizedStorageUpsertOption_({
            gameId: gameId,
            questionId: categoryId,
            optionId: item.nomineeId,
            option: item.nominee,
            shortAnswer: item.shortAnswer || item.nominee,
            fileId: item.fileId || "",
            logoUrl: item.logoUrl || "",
            movieId: item.movieId || "",
            movie: item.movie || "",
            person: item.person || "",
            active: item.active,
            displayOrder: itemIndex + 1,
            sourceSystem: "admin-normalized"
          });
        });
      }

      SpreadsheetApp.flush();
      adminCatClearCaches_();
    }

    return {
      success: errors.length === 0,
      partial: errors.length > 0 && created.length > 0,
      message: created.length + " answer(s) created" + (errors.length ? "; " + errors.length + " skipped" : ""),
      gameId: gameId,
      categoryId: categoryId,
      createdCount: created.length,
      created: created,
      errors: errors
    };

  } finally {
    lock.releaseLock();
  }

}

function adminCloneNominee(payload) {

  payload = payload || {};

  const gameId = adminCatNormalizeGameId_(payload.gameId);
  const sourceCategoryId = adminCatNormalizeId_(payload.sourceCategoryId || payload.categoryId);
  const sourceNomineeId = adminCatNormalizeId_(payload.sourceNomineeId || payload.nomineeId);
  const targetCategoryId = adminCatNormalizeId_(payload.targetCategoryId || sourceCategoryId);

  if (!gameId || !sourceCategoryId || !sourceNomineeId || !targetCategoryId) {
    throw new Error("Game, source answer, and target question are required");
  }

  const setup = adminGetGameSetup({ gameId: gameId });
  const sourceCategory = setup.categories.find(function(category) {
    return adminCatNormalizeId_(category.categoryId) === sourceCategoryId;
  });
  const targetCategory = setup.categories.find(function(category) {
    return adminCatNormalizeId_(category.categoryId) === targetCategoryId;
  });

  if (!sourceCategory || !targetCategory) {
    throw new Error("Source or target category not found");
  }

  const sourceNominee = (sourceCategory.nominees || []).find(function(nominee) {
    return adminCatNormalizeId_(nominee.nomineeId) === sourceNomineeId;
  });

  if (!sourceNominee) {
    throw new Error("Source nominee/answer not found");
  }

  const nomineeName = adminCatNormalizeValue_(
    payload.nominee || payload.answer || payload.name
  ) || (sourceNominee.nominee + " Copy");

  const copyImage = payload.copyImage === undefined
    ? true
    : adminCatToBoolean_(payload.copyImage);

  return adminBulkCreateNominees({
    gameId: gameId,
    categoryId: targetCategoryId,
    category: targetCategory.category,
    section: targetCategory.section,
    itemsJSON: JSON.stringify([{
      nominee: nomineeName,
      nomineeId: payload.newNomineeId || payload.nomineeIdOverride || adminCatSlugify_(nomineeName),
      shortAnswer: payload.shortAnswer || nomineeName,
      fileId: copyImage ? sourceNominee.fileId || "" : "",
      movieId: sourceNominee.movieId || "",
      movie: sourceNominee.movie || "",
      person: sourceNominee.person || "",
      active: true
    }])
  });

}
