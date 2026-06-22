/* =========================
   ADMIN GAMES ENGINE
========================= */

/* =========================================================
   HELPERS
========================================================= */

function adminNormalizeGameId_(value) {

    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  
  }
  
  function adminNormalizeValue_(value) {
  
    return String(value || "")
      .trim();
  
  }
  
  function adminToBoolean_(value) {

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

  function adminToNumber_(
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
  
  function adminGetGamesHeaders_() {
  
    const sh =
      getGamesSheet_();
  
    const data =
      sh.getDataRange().getValues();
  
    if (!data.length) {
  
      throw new Error(
        "Games sheet is empty"
      );
  
    }
  
    return data[0].map(h =>
      String(h).trim()
    );
  
  }

  function adminEnsureGameOptionalHeaders_() {

    const sh =
      getGamesSheet_();

    const lastColumn =
      sh.getLastColumn();

    if (lastColumn < 1) {
      return [];
    }

    const headers =
      sh
        .getRange(
          1,
          1,
          1,
          lastColumn
        )
        .getValues()[0]
        .map(function(header) {
          return String(header || "").trim();
        });

    const required = [
      "AllowBetRemoval",
      "WagerEditMode"
    ];

    const missing =
      required.filter(function(header) {
        return headers.indexOf(header) === -1;
      });

    if (missing.length) {
      sh
        .getRange(
          1,
          lastColumn + 1,
          1,
          missing.length
        )
        .setValues([
          missing
        ]);
    }

    return missing;

  }

  
  function adminSetIfColumnExists_(
    row,
    col,
    key,
    value
  ) {

    if (
      col &&
      typeof col[key] === "number" &&
      col[key] !== -1
    ) {
      row[col[key]] = value;
    }

  }
  
  function adminFindGameRow_(
    data,
    col,
    gameId
  ) {
  
    const normalizedGameId =
      adminNormalizeValue_(
        gameId
      );
  
    for (let i = 1; i < data.length; i++) {
  
      const rowGameId =
        adminNormalizeValue_(
          data[i][col.gameId]
        );
  
      if (rowGameId === normalizedGameId) {
        return i + 1;
      }
  
    }
  
    return -1;
  
  }
  
  function adminBuildGameRow_(
    headers,
    col,
    payload
  ) {
  
    const row =
      new Array(headers.length)
        .fill("");
  
    const gameId =
      adminNormalizeGameId_(
        payload.gameId
      );
  
    if (!gameId) {
  
      throw new Error(
        "GameId is required"
      );
  
    }
  
    const name =
      adminNormalizeValue_(
        payload.name || payload.gameName
      );
  
    if (!name) {
  
      throw new Error(
        "Game name is required"
      );
  
    }
  
    const type =
      typeof normalizeGameType_ === "function"
        ? normalizeGameType_(
            payload.type || "prediction"
          )
        : adminNormalizeValue_(
            payload.type || "prediction"
          );
  
    const typeConfig =
      typeof getGameTypeConfig === "function"
        ? getGameTypeConfig(type)
        : {
            predictionEnabled: true,
            rankingEnabled: false,
            confidenceEnabled: false,
            wagerEnabled: false
          };
  
    adminSetIfColumnExists_(
      row,
      col,
      "gameId",
      gameId
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "name",
      name
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "year",
      adminToNumber_(
        payload.year,
        ""
      )
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "type",
      type
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "active",
      adminToBoolean_(
        payload.active
      )
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "archived",
      adminToBoolean_(
        payload.archived
      )
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "defaultGame",
      adminToBoolean_(
        payload.defaultGame
      )
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "predictionEnabled",
      payload.predictionEnabled === undefined
        ? typeConfig.predictionEnabled
        : adminToBoolean_(
            payload.predictionEnabled
          )
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "rankingEnabled",
      payload.rankingEnabled === undefined
        ? typeConfig.rankingEnabled
        : adminToBoolean_(
            payload.rankingEnabled
          )
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "confidenceEnabled",
      payload.confidenceEnabled === undefined
        ? typeConfig.confidenceEnabled
        : adminToBoolean_(
            payload.confidenceEnabled
          )
    );

    adminSetIfColumnExists_(
      row,
      col,
      "confidenceScoringMode",
      typeof normalizeConfidenceScoringMode_ === "function"
        ? normalizeConfidenceScoringMode_(
            payload.confidenceScoringMode
          )
        : adminNormalizeValue_(
            payload.confidenceScoringMode || "win_only"
          )
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "wagerEnabled",
      payload.wagerEnabled === undefined
        ? typeConfig.wagerEnabled
        : adminToBoolean_(
            payload.wagerEnabled
          )
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "startingBankroll",
      adminToNumber_(
        payload.startingBankroll,
        100
      )
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "minWager",
      adminToNumber_(
        payload.minWager,
        1
      )
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "maxWager",
      adminToNumber_(
        payload.maxWager,
        100
      )
    );

    adminSetIfColumnExists_(
      row,
      col,
      "allowBetRemoval",
      adminToBoolean_(
        payload.allowBetRemoval ||
        payload.AllowBetRemoval
      )
    );

    adminSetIfColumnExists_(
      row,
      col,
      "wagerEditMode",
      adminNormalizeValue_(
        payload.wagerEditMode ||
        payload.WagerEditMode ||
        "editable_until_lock"
      )
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "themeColor",
      adminNormalizeValue_(
        payload.themeColor
      )
    );

    adminSetIfColumnExists_(
      row,
      col,
      "description",
      adminNormalizeValue_(
        payload.description
      )
    );

    adminSetIfColumnExists_(
      row,
      col,
      "lockLabel",
      adminNormalizeValue_(
        payload.lockLabel
      )
    );

    adminSetIfColumnExists_(
      row,
      col,
      "availableFrom",
      adminNormalizeValue_(
        payload.availableFrom
      )
    );

    adminSetIfColumnExists_(
      row,
      col,
      "availableUntil",
      adminNormalizeValue_(
        payload.availableUntil
      )
    );

    adminSetIfColumnExists_(
      row,
      col,
      "heroImageFileId",
      adminNormalizeValue_(
        payload.heroImageFileId || payload.heroImageFileID
      )
    );

    adminSetIfColumnExists_(
      row,
      col,
      "heroImagePosition",
      adminNormalizeValue_(
        payload.heroImagePosition || "center center"
      )
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "icon",
      adminNormalizeValue_(
        payload.icon
      )
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "sortOrder",
      adminToNumber_(
        payload.sortOrder,
        999
      )
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "status",
      adminNormalizeValue_(
        payload.status || "Draft"
      )
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "lockAllPicks",
      adminToBoolean_(
        payload.lockAllPicks
      )
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "showLeaderboard",
      payload.showLeaderboard === undefined
        ? true
        : adminToBoolean_(
            payload.showLeaderboard
          )
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "showResultsBeforeLock",
      adminToBoolean_(
        payload.showResultsBeforeLock
      )
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "resultsFinalized",
      adminToBoolean_(
        payload.resultsFinalized
      )
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "votingLocked",
      adminToBoolean_(
        payload.votingLocked
      )
    );
  
    return row;
  
  }
  
  function adminClearCaches_() {
  
    if (
      typeof clearAppCaches ===
      "function"
    ) {
      clearAppCaches();
      return;
    }
  
    if (
      typeof clearGamesCache ===
      "function"
    ) {
      clearGamesCache();
    }
  
  }
  
 /* =========================================================
   GET ADMIN GAMES
========================================================= */

function adminGetGames() {

  adminEnsureGameOptionalHeaders_();

  if (typeof clearGamesCache === "function") {
    clearGamesCache();
  }

  return {
    success: true,
    games: getGames(),
    gameTypes:
      typeof getSupportedGameTypes === "function"
        ? getSupportedGameTypes()
        : []
  };

}

/* =========================================================
   GET ADMIN GAME TYPES
========================================================= */

function adminGetGameTypes() {

  return {
    success: true,
    gameTypes:
      typeof getSupportedGameTypes === "function"
        ? getSupportedGameTypes()
        : []
  };

}
  
  /* =========================================================
     CREATE GAME
  ========================================================= */
  
  function adminCreateGame(payload) {
  
    if (!payload) {
  
      throw new Error(
        "Game payload missing"
      );
  
    }
  
    const lock =
      LockService.getScriptLock();
  
    lock.waitLock(10000);
  
    try {
  
      adminEnsureGameOptionalHeaders_();

      const sh =
        getGamesSheet_();
  
      const data =
        sh.getDataRange().getValues();
  
      const headers =
        adminGetGamesHeaders_();
  
      const col =
        getGamesColumnMap_(
          headers
        );
  
      validateGamesColumns_(
        col
      );
  
      const gameId =
        adminNormalizeGameId_(
          payload.gameId
        );
  
      if (!gameId) {
  
        throw new Error(
          "GameId is required"
        );
  
      }
  
      const existingRow =
        adminFindGameRow_(
          data,
          col,
          gameId
        );
  
      if (existingRow !== -1) {
  
        throw new Error(
          "Game already exists: " + gameId
        );
  
      }
  
      const safePayload =
        Object.assign(
          {},
          payload,
          {
            gameId: gameId,
  
            active:
              adminToBoolean_(
                payload.active
              ),
  
            archived:
              adminToBoolean_(
                payload.archived
              ),
  
            defaultGame:
              adminToBoolean_(
                payload.defaultGame
              ),
  
            predictionEnabled:
              adminToBoolean_(
                payload.predictionEnabled
              ),
  
            rankingEnabled:
              adminToBoolean_(
                payload.rankingEnabled
              )
          }
        );
  
      const row =
        adminBuildGameRow_(
          headers,
          col,
          safePayload
        );
  
      sh.appendRow(row);
  
      SpreadsheetApp.flush();
  
      adminClearCaches_();
  
      return {
        success: true,
        message: "Game created",
        gameId: gameId
      };
  
    } finally {
  
      lock.releaseLock();
  
    }
  
  }

  /* =========================================================
   SAVE GAME
   Creates if missing, updates if existing.
========================================================= */

function adminSaveGame(payload) {

  if (!payload) {

    return {
      success: false,
      error: "Game payload missing"
    };

  }

  const gameId =
    adminNormalizeGameId_(
      payload.gameId
    );

  if (!gameId) {

    return {
      success: false,
      error: "GameId is required"
    };

  }

  try {

    adminEnsureGameOptionalHeaders_();

    const sh =
      getGamesSheet_();

    const data =
      sh.getDataRange()
        .getValues();

    const headers =
      adminGetGamesHeaders_();

    const col =
      getGamesColumnMap_(
        headers
      );

    validateGamesColumns_(
      col
    );

    const rowIndex =
      adminFindGameRow_(
        data,
        col,
        gameId
      );

    const result =
      rowIndex === -1
        ? adminCreateGame(
            Object.assign(
              {},
              payload,
              {
                gameId: gameId
              }
            )
          )
        : adminUpdateGame(
            Object.assign(
              {},
              payload,
              {
                gameId: gameId
              }
            )
          );

    return {
      success: true,
      message:
        rowIndex === -1
          ? "Game created"
          : "Game updated",
      gameId: gameId,
      game:
        typeof getGame === "function"
          ? getGame(gameId)
          : null,
      result: result
    };

  } catch (err) {

    return {
      success: false,
      error: err.message
    };

  }

}
  
  /* =========================================================
     UPDATE GAME
  ========================================================= */
  
  function adminUpdateGame(payload) {
  
    if (!payload) {
  
      throw new Error(
        "Game payload missing"
      );
  
    }
  
    const gameId =
      adminNormalizeGameId_(
        payload.gameId
      );
  
    if (!gameId) {
  
      throw new Error(
        "GameId is required"
      );
  
    }
  
    const lock =
      LockService.getScriptLock();
  
    lock.waitLock(10000);
  
    try {
  
      adminEnsureGameOptionalHeaders_();

      const sh =
        getGamesSheet_();
  
      const data =
        sh.getDataRange().getValues();
  
      const headers =
        adminGetGamesHeaders_();
  
      const col =
        getGamesColumnMap_(
          headers
        );
  
      validateGamesColumns_(
        col
      );
  
      const rowIndex =
        adminFindGameRow_(
          data,
          col,
          gameId
        );
  
      if (rowIndex === -1) {
  
        throw new Error(
          "Game not found: " + gameId
        );
  
      }
  
      const row =
        data[rowIndex - 1].slice();
  
      if ("name" in payload || "gameName" in payload) {
  
        adminSetIfColumnExists_(
          row,
          col,
          "name",
          adminNormalizeValue_(
            payload.name || payload.gameName
          )
        );
  
      }
  
      if ("year" in payload) {
  
        adminSetIfColumnExists_(
          row,
          col,
          "year",
          payload.year
            ? Number(payload.year)
            : ""
        );
  
      }
  
      if ("type" in payload) {
  
        adminSetIfColumnExists_(
          row,
          col,
          "type",
          adminNormalizeValue_(
            payload.type
          )
        );
  
      }
  
      if ("active" in payload) {
  
        adminSetIfColumnExists_(
          row,
          col,
          "active",
          adminToBoolean_(
            payload.active
          )
        );
  
      }
  
      if ("archived" in payload) {
  
        adminSetIfColumnExists_(
          row,
          col,
          "archived",
          adminToBoolean_(
            payload.archived
          )
        );
  
      }
  
      if ("predictionEnabled" in payload) {
  
        adminSetIfColumnExists_(
          row,
          col,
          "predictionEnabled",
          adminToBoolean_(
            payload.predictionEnabled
          )
        );
  
      }
  
      if ("rankingEnabled" in payload) {
  
        adminSetIfColumnExists_(
          row,
          col,
          "rankingEnabled",
          adminToBoolean_(
            payload.rankingEnabled
          )
        );
  
      }

      if ("confidenceEnabled" in payload) {

        adminSetIfColumnExists_(
          row,
          col,
          "confidenceEnabled",
          adminToBoolean_(
            payload.confidenceEnabled
          )
        );
      
      }

      if ("confidenceScoringMode" in payload) {

        adminSetIfColumnExists_(
          row,
          col,
          "confidenceScoringMode",
          typeof normalizeConfidenceScoringMode_ === "function"
            ? normalizeConfidenceScoringMode_(
                payload.confidenceScoringMode
              )
            : adminNormalizeValue_(
                payload.confidenceScoringMode || "win_only"
              )
        );
      
      }
      
      if ("wagerEnabled" in payload) {
      
        adminSetIfColumnExists_(
          row,
          col,
          "wagerEnabled",
          adminToBoolean_(
            payload.wagerEnabled
          )
        );
      
      }
      
      if ("startingBankroll" in payload) {
      
        adminSetIfColumnExists_(
          row,
          col,
          "startingBankroll",
          adminToNumber_(
            payload.startingBankroll,
            100
          )
        );
      
      }
      
      if ("minWager" in payload) {
      
        adminSetIfColumnExists_(
          row,
          col,
          "minWager",
          adminToNumber_(
            payload.minWager,
            1
          )
        );
      
      }
      
      if ("maxWager" in payload) {
      
        adminSetIfColumnExists_(
          row,
          col,
          "maxWager",
          adminToNumber_(
            payload.maxWager,
            100
          )
        );
      
      }

      if (
         "allowBetRemoval" in payload ||
         "AllowBetRemoval" in payload
      ) {

         adminSetIfColumnExists_(
          row,
          col,
          "allowBetRemoval",
          adminToBoolean_(
            payload.allowBetRemoval ||
            payload.AllowBetRemoval
          )
         );

      }

      if (
        "wagerEditMode" in payload ||
        "WagerEditMode" in payload
      ) {

        adminSetIfColumnExists_(
          row,
          col,
          "wagerEditMode",
          adminNormalizeValue_(
            payload.wagerEditMode ||
            payload.WagerEditMode ||
            "editable_until_lock"
          )
        );

      }
  
      if ("themeColor" in payload) {
  
        adminSetIfColumnExists_(
          row,
          col,
          "themeColor",
          adminNormalizeValue_(
            payload.themeColor
          )
        );
  
      }

      if ("description" in payload) {

        adminSetIfColumnExists_(
          row,
          col,
          "description",
          adminNormalizeValue_(
            payload.description
          )
        );

      }

      if ("lockLabel" in payload) {

        adminSetIfColumnExists_(
          row,
          col,
          "lockLabel",
          adminNormalizeValue_(
            payload.lockLabel
          )
        );

      }

      if ("availableFrom" in payload) {

        adminSetIfColumnExists_(
          row,
          col,
          "availableFrom",
          adminNormalizeValue_(
            payload.availableFrom
          )
        );

      }

      if ("availableUntil" in payload) {

        adminSetIfColumnExists_(
          row,
          col,
          "availableUntil",
          adminNormalizeValue_(
            payload.availableUntil
          )
        );

      }

      if (
        "heroImageFileId" in payload ||
        "heroImageFileID" in payload
      ) {

        adminSetIfColumnExists_(
          row,
          col,
          "heroImageFileId",
          adminNormalizeValue_(
            payload.heroImageFileId ||
            payload.heroImageFileID
          )
        );

      }

      if ("heroImagePosition" in payload) {

        adminSetIfColumnExists_(
          row,
          col,
          "heroImagePosition",
          adminNormalizeValue_(
            payload.heroImagePosition || "center center"
          )
        );

      }
  
      if ("icon" in payload) {
  
        adminSetIfColumnExists_(
          row,
          col,
          "icon",
          adminNormalizeValue_(
            payload.icon
          )
        );
  
      }
  
      if ("sortOrder" in payload) {
  
        adminSetIfColumnExists_(
          row,
          col,
          "sortOrder",
          Number(payload.sortOrder) || 999
        );
  
      }
  
      if ("status" in payload) {
  
        adminSetIfColumnExists_(
          row,
          col,
          "status",
          adminNormalizeValue_(
            payload.status
          )
        );
  
      }
  
      if ("lockAllPicks" in payload) {
  
        adminSetIfColumnExists_(
          row,
          col,
          "lockAllPicks",
          adminToBoolean_(
            payload.lockAllPicks
          )
        );
  
      }

      if ("showLeaderboard" in payload) {

        adminSetIfColumnExists_(
          row,
          col,
          "showLeaderboard",
          adminToBoolean_(
            payload.showLeaderboard
          )
        );
      
      }
      
      if ("showResultsBeforeLock" in payload) {
      
        adminSetIfColumnExists_(
          row,
          col,
          "showResultsBeforeLock",
          adminToBoolean_(
            payload.showResultsBeforeLock
          )
        );
      
      }


      if ("resultsFinalized" in payload) {

  adminSetIfColumnExists_(
    row,
    col,
    "resultsFinalized",
    adminToBoolean_(
      payload.resultsFinalized
    )
  );

}

if ("votingLocked" in payload) {

  adminSetIfColumnExists_(
    row,
    col,
    "votingLocked",
    adminToBoolean_(
      payload.votingLocked
    )
  );

}
  
      if ("defaultGame" in payload) {
  
        const makeDefault =
          adminToBoolean_(
            payload.defaultGame
          );
  
        adminSetIfColumnExists_(
          row,
          col,
          "defaultGame",
          makeDefault
        );
  
        if (
          makeDefault &&
          col.defaultGame !== -1
        ) {
  
          for (let i = 1; i < data.length; i++) {
  
            const otherGameId =
              adminNormalizeValue_(
                data[i][col.gameId]
              );
  
            if (otherGameId !== gameId) {
  
              sh.getRange(
                i + 1,
                col.defaultGame + 1
              ).setValue(false);
  
            }
  
          }
  
        }
  
      }
  
      sh.getRange(
        rowIndex,
        1,
        1,
        headers.length
      ).setValues([
        row
      ]);
  
      SpreadsheetApp.flush();
  
      adminClearCaches_();
  
      return {
        success: true,
        message: "Game updated",
        gameId: gameId
      };
  
    } finally {
  
      lock.releaseLock();
  
    }
  
  }
  
  /* =========================================================
     ARCHIVE GAME
  ========================================================= */
  
  function adminArchiveGame(payload) {
  
    const gameId =
      adminNormalizeGameId_(
        payload && payload.gameId
      );
  
    if (!gameId) {
  
      throw new Error(
        "GameId is required"
      );
  
    }
  
    return adminUpdateGame({
      gameId: gameId,
      active: false,
      archived: true,
      defaultGame: false,
      status: "Archived"
    });
  
  }
  
  /* =========================================================
   CLONE GAME SETUP HELPERS
========================================================= */

function adminCloneToBooleanDefault_(
  value,
  defaultValue
) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return defaultValue;
  }

  return (
    value === true ||
    String(value)
      .trim()
      .toLowerCase() === "true"
  );

}

function adminCloneGetCategoryRowsForGame_(
  data,
  col,
  gameId
) {

  const rows = [];

  for (let i = 1; i < data.length; i++) {

    const rowGameId =
      adminNormalizeValue_(
        data[i][col.gameId]
      );

    if (rowGameId === gameId) {
      rows.push(data[i]);
    }

  }

  return rows;

}

function adminCloneGetSettingsRowsForGame_(
  data,
  col,
  gameId
) {

  const rows = [];

  for (let i = 1; i < data.length; i++) {

    const rowGameId =
      adminNormalizeValue_(
        data[i][col.gameId]
      );

    if (rowGameId === gameId) {
      rows.push(data[i]);
    }

  }

  return rows;

}

function adminCloneTargetHasSettings_(
  data,
  col,
  targetGameId
) {

  for (let i = 1; i < data.length; i++) {

    const rowGameId =
      adminNormalizeValue_(
        data[i][col.gameId]
      );

    if (rowGameId === targetGameId) {
      return true;
    }

  }

  return false;

}

function adminCloneTargetHasCategories_(
  data,
  col,
  targetGameId
) {

  for (let i = 1; i < data.length; i++) {

    const rowGameId =
      adminNormalizeValue_(
        data[i][col.gameId]
      );

    if (rowGameId === targetGameId) {
      return true;
    }

  }

  return false;

}

function adminCloneCategorySettings_(
  sourceGameId,
  targetGameId,
  options
) {

  const sh =
    getCategorySettingsSheet_();

  const data =
    sh.getDataRange().getValues();

  if (!data.length) {

    throw new Error(
      "CategorySettings sheet is empty"
    );

  }

  const headers =
    data[0].map(h =>
      String(h).trim()
    );

  const col =
    getCategorySettingsColumnMap_(
      headers
    );

  validateCategorySettingsColumns_(
    col
  );

  if (
    adminCloneTargetHasSettings_(
      data,
      col,
      targetGameId
    )
  ) {

    throw new Error(
      "Target game already has category settings: " +
      targetGameId
    );

  }

  const sourceRows =
    adminCloneGetSettingsRowsForGame_(
      data,
      col,
      sourceGameId
    );

  if (!sourceRows.length) {

    return 0;

  }

  const clearWinners =
    adminCloneToBooleanDefault_(
      options.clearWinners,
      true
    );

  const lockClonedCategories =
    adminCloneToBooleanDefault_(
      options.lockClonedCategories,
      true
    );

  const rowsToAppend =
    sourceRows.map(sourceRow => {

      const row =
        sourceRow.slice();

      row[col.gameId] =
        targetGameId;

      if (
        clearWinners &&
        col.winnerNomineeId !== -1
      ) {
        row[col.winnerNomineeId] = "";
      }

      if (
        clearWinners &&
        col.favoriteNomineeId !== -1
      ) {
        row[col.favoriteNomineeId] = "";
      }

      if (col.locked !== -1) {
        row[col.locked] =
          lockClonedCategories;
      }

      return row;

    });

  sh.getRange(
    sh.getLastRow() + 1,
    1,
    rowsToAppend.length,
    headers.length
  ).setValues(
    rowsToAppend
  );

  return rowsToAppend.length;

}

function adminCloneCategoryNominees_(
  sourceGameId,
  targetGameId,
  options
) {

  const sh =
    getCategoriesSheet_();

  const data =
    sh.getDataRange().getValues();

  if (!data.length) {

    throw new Error(
      "Categories sheet is empty"
    );

  }

  const headers =
    data[0].map(h =>
      String(h).trim()
    );

  const col =
    getCategoriesColumnMap_(
      headers
    );

  validateCategoriesColumns_(
    col
  );

  if (
    adminCloneTargetHasCategories_(
      data,
      col,
      targetGameId
    )
  ) {

    throw new Error(
      "Target game already has category rows: " +
      targetGameId
    );

  }

  const sourceRows =
    adminCloneGetCategoryRowsForGame_(
      data,
      col,
      sourceGameId
    );

  if (!sourceRows.length) {

    return 0;

  }

  const keepActiveState =
    adminCloneToBooleanDefault_(
      options.keepActiveState,
      true
    );

  const rowsToAppend =
    sourceRows.map(sourceRow => {

      const row =
        sourceRow.slice();

      row[col.gameId] =
        targetGameId;

      if (
        !keepActiveState &&
        col.active !== -1
      ) {
        row[col.active] = true;
      }

      return row;

    });

  sh.getRange(
    sh.getLastRow() + 1,
    1,
    rowsToAppend.length,
    headers.length
  ).setValues(
    rowsToAppend
  );

  return rowsToAppend.length;

}

/* =========================================================
   CLONE GAME SETUP ONLY
   Copies CategorySettings and optionally Categories rows.
========================================================= */

function adminCloneGameSetup(payload) {

  if (!payload) {

    throw new Error(
      "Clone setup payload missing"
    );

  }

  const sourceGameId =
    adminNormalizeGameId_(
      payload.sourceGameId
    );

  const targetGameId =
    adminNormalizeGameId_(
      payload.targetGameId ||
      payload.newGameId
    );

  if (!sourceGameId) {

    throw new Error(
      "Source gameId is required"
    );

  }

  if (!targetGameId) {

    throw new Error(
      "Target gameId is required"
    );

  }

  const sourceGame =
    getGame(
      sourceGameId
    );

  if (!sourceGame) {

    throw new Error(
      "Source game not found: " +
      sourceGameId
    );

  }

  const targetGame =
    getGame(
      targetGameId
    );

  if (!targetGame) {

    throw new Error(
      "Target game not found: " +
      targetGameId
    );

  }

  const cloneSettings =
    adminCloneToBooleanDefault_(
      payload.cloneSettings,
      true
    );

  const cloneNominees =
    adminCloneToBooleanDefault_(
      payload.cloneNominees,
      true
    );

  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    let settingsCopied = 0;
    let nomineesCopied = 0;

    if (cloneSettings) {

      settingsCopied =
        adminCloneCategorySettings_(
          sourceGameId,
          targetGameId,
          payload
        );

    }

    if (cloneNominees) {

      nomineesCopied =
        adminCloneCategoryNominees_(
          sourceGameId,
          targetGameId,
          payload
        );

    }

    SpreadsheetApp.flush();

    adminClearCaches_();

    return {
      success: true,
      message: "Game setup cloned",
      sourceGameId: sourceGameId,
      targetGameId: targetGameId,
      settingsCopied: settingsCopied,
      nomineesCopied: nomineesCopied
    };

  } finally {

    lock.releaseLock();

  }

}

/* =========================================================
   CLONE FULL GAME
   Creates new game row, then optionally clones setup.
========================================================= */

function adminCloneGame(payload) {

  if (!payload) {

    throw new Error(
      "Clone payload missing"
    );

  }

  const sourceGameId =
    adminNormalizeGameId_(
      payload.sourceGameId
    );

  const newGameId =
    adminNormalizeGameId_(
      payload.newGameId
    );

  if (!sourceGameId) {

    throw new Error(
      "Source gameId is required"
    );

  }

  if (!newGameId) {

    throw new Error(
      "New gameId is required"
    );

  }

  const sourceGame =
    getGame(
      sourceGameId
    );

  if (!sourceGame) {

    throw new Error(
      "Source game not found: " +
      sourceGameId
    );

  }

  const cloneSetup =
    adminCloneToBooleanDefault_(
      payload.cloneSetup,
      true
    );

  const newPayload = {
    gameId: newGameId,

    name:
      payload.newName ||
      sourceGame.name + " Copy",

    year:
      payload.newYear ||
      sourceGame.year ||
      "",

    type:
      sourceGame.type || "",

    active:
      false,

    archived:
      false,

    defaultGame:
      false,

    predictionEnabled:
      sourceGame.predictionEnabled === true,
    
    rankingEnabled:
      sourceGame.rankingEnabled === true,
    
    confidenceEnabled:
      sourceGame.confidenceEnabled === true,

    confidenceScoringMode:
      sourceGame.confidenceScoringMode || "win_only",
    
    wagerEnabled:
      sourceGame.wagerEnabled === true,
    
    startingBankroll:
      sourceGame.startingBankroll || 100,
    
    minWager:
      sourceGame.minWager || 1,
    
    maxWager:
      sourceGame.maxWager || 100,

    allowBetRemoval:
      sourceGame.allowBetRemoval === true ||
      sourceGame.AllowBetRemoval === true,

    wagerEditMode:
      sourceGame.wagerEditMode ||
      sourceGame.WagerEditMode ||
      "editable_until_lock",  
    
    showLeaderboard:
      sourceGame.showLeaderboard !== false,
    
    showResultsBeforeLock:
      false,

    themeColor:
      sourceGame.themeColor || "",

    icon:
      sourceGame.icon || "",

    sortOrder:
      payload.sortOrder ||
      sourceGame.sortOrder ||
      999,

    status:
      "Draft",

    lockAllPicks:
      true
  };

  const createResult =
    adminCreateGame(
      newPayload
    );

  if (!cloneSetup) {

    return createResult;

  }

  const setupResult =
    adminCloneGameSetup({
      sourceGameId: sourceGameId,
      targetGameId: newGameId,

      cloneSettings:
        "cloneSettings" in payload
          ? payload.cloneSettings
          : true,

      cloneNominees:
        "cloneNominees" in payload
          ? payload.cloneNominees
          : true,

      clearWinners:
        "clearWinners" in payload
          ? payload.clearWinners
          : true,

      lockClonedCategories:
        "lockClonedCategories" in payload
          ? payload.lockClonedCategories
          : true,

      keepActiveState:
        "keepActiveState" in payload
          ? payload.keepActiveState
          : true
    });

  return {
    success: true,
    message: "Game cloned",
    gameId: newGameId,
    sourceGameId: sourceGameId,
    settingsCopied:
      setupResult.settingsCopied,
    nomineesCopied:
      setupResult.nomineesCopied
  };

}