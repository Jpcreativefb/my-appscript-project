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

function adminCatFindSettingsRow_(
  data,
  col,
  gameId,
  categoryId
) {

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

      return i + 1;

    }

  }

  return -1;

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

  const rowIndex =
    adminCatFindSettingsRow_(
      data,
      col,
      payload.gameId,
      payload.categoryId
    );

  if (rowIndex === -1) {

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

  const row =
    data[rowIndex - 1]
      .slice();

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

function adminCatFindNomineeRow_(
  data,
  col,
  gameId,
  categoryId,
  nomineeId
) {

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

      return i + 1;

    }

  }

  return -1;

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

  const settingsData =
    getAllCategorySettingsData_();

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
        adminCatNormalizeScoreMode_(
          payload.scoreMode || "fixed-points"
        ),

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
      normalizedStorageUpsertQuestion_(
        Object.assign({}, payload, {
          gameId: gameId,
          questionId: categoryId
        })
      );
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

    const rowIndex =
      adminCatFindNomineeRow_(
        data,
        col,
        gameId,
        categoryId,
        nomineeId
      );

    if (rowIndex === -1) {

      throw new Error(
        "Nominee not found: " +
        nomineeId
      );

    }

    const row =
      data[rowIndex - 1]
        .slice();

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
