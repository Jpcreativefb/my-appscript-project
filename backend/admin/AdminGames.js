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
  
  function adminResolveGameTypeFeatureFlags_(
    type,
    payload,
    existing
  ) {

    payload = payload || {};
    existing = existing || {};

    const normalizedType =
      typeof normalizeGameType_ === "function"
        ? normalizeGameType_(type || "prediction")
        : adminNormalizeValue_(type || "prediction").toLowerCase();

    const config =
      typeof getGameTypeConfig === "function"
        ? getGameTypeConfig(normalizedType)
        : {
            predictionEnabled: normalizedType !== "wager",
            rankingEnabled: normalizedType === "ranking",
            confidenceEnabled: normalizedType === "confidence",
            wagerEnabled: normalizedType === "wager",
            fixedPointsEnabled: normalizedType === "prediction",
            stakedPointsEnabled: normalizedType === "staked-prediction",
            mixedGame: normalizedType === "mixed"
          };

    const isHybrid = config.mixedGame === true || normalizedType === "mixed";

    const resolveHybridFlag = function(key, fallback) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        return adminToBoolean_(payload[key]);
      }

      if (Object.prototype.hasOwnProperty.call(existing, key)) {
        return adminToBoolean_(existing[key]);
      }

      return fallback === true;
    };

    if (isHybrid) {
      // Standard Predictions and fixed-point scoring are one Hybrid method.
      // Older rows and cached frontends may have saved only one of these flags,
      // so treat either true value as enabling the complete method.
      const standardPredictionsEnabled =
        resolveHybridFlag("fixedPointsEnabled", config.fixedPointsEnabled) ||
        resolveHybridFlag("predictionEnabled", config.predictionEnabled);

      return {
        predictionEnabled: standardPredictionsEnabled,
        rankingEnabled: resolveHybridFlag("rankingEnabled", config.rankingEnabled),
        confidenceEnabled: resolveHybridFlag("confidenceEnabled", config.confidenceEnabled),
        wagerEnabled: resolveHybridFlag("wagerEnabled", config.wagerEnabled),
        fixedPointsEnabled: standardPredictionsEnabled,
        stakedPointsEnabled: resolveHybridFlag("stakedPointsEnabled", config.stakedPointsEnabled),
        mixedGame: true
      };
    }

    return {
      predictionEnabled: config.predictionEnabled === true,
      rankingEnabled: config.rankingEnabled === true,
      confidenceEnabled: config.confidenceEnabled === true,
      wagerEnabled: config.wagerEnabled === true,
      fixedPointsEnabled: config.fixedPointsEnabled === true,
      stakedPointsEnabled: config.stakedPointsEnabled === true,
      mixedGame: false
    };

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

    const required = [
      "GameId",
      "Name",
      "Year",
      "Type",
      "Active",
      "Archived",
      "DefaultGame",
      "PredictionEnabled",
      "RankingEnabled",
      "ConfidenceEnabled",
      "ConfidenceScoringMode",
      "WagerEnabled",
      "StartingBankroll",
      "MinWager",
      "MaxWager",
      "AllowBetRemoval",
      "WagerEditMode",
      "MixedGame",
      "ScoringMode",
      "ScoringEngine",
      "GameRole",
      "HubMode",
      "ShowMiniGameLinks",
      "IncludeParentQuestions",
      "ParentGameId",
      "IncludeInParent",
      "ParentContributionMode",
      "ParentContributionWeight",
      "ParentBestCount",
      "PlacementPointsJSON",
      "LeaderboardScoreMode",
      "FixedPointsEnabled",
      "StakedPointsEnabled",
      "StartingPoints",
      "MinStake",
      "MaxStake",
      "StakeIncrement",
      "StakeWinMultiplier",
      "StakeLossMultiplier",
      "RacingLeague",
      "RacingSeriesId",
      "RacingMarket",
      "ThemeColor",
      "Icon",
      "SortOrder",
      "Status",
      "LockAllPicks",
      "ShowLeaderboard",
      "ShowResultsBeforeLock",
      "ResultsFinalized",
      "VotingLocked",
      "Description",
      "LockLabel",
      "AvailableFrom",
      "AvailableUntil",
      "HeroImageFileID",
      "HeroImagePosition",
      "PlayerProfileScope",
      "PlayerProfileGroupKey",
      "PlayerProfileGroupLabel"
    ];

    const lastColumn =
      sh.getLastColumn();

    if (lastColumn < 1) {

      sh
        .getRange(
          1,
          1,
          1,
          required.length
        )
        .setValues([
          required
        ]);

      return required;

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

    const lowerHeaders =
      headers.map(function(header) {
        return header.toLowerCase();
      });

    const missing =
      required.filter(function(header) {
        return lowerHeaders.indexOf(
          header.toLowerCase()
        ) === -1;
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
  
  function adminApplyHybridGameFields_(
    row,
    col,
    payload,
    onlyProvided
  ) {

    payload = payload || {};

    const fields = [
      {
        key: "mixedGame",
        value: function() {
          return adminToBoolean_(payload.mixedGame);
        },
        fallback: false
      },
      {
        key: "scoringMode",
        value: function() {
          const raw =
            payload.gameFormat ||
            payload.scoringMode ||
            "standard";

          return typeof normalizeGameFormat_ === "function"
            ? normalizeGameFormat_(raw)
            : adminNormalizeValue_(raw);
        },
        fallback: "standard",
        aliases: ["gameFormat"]
      },
      {
        key: "scoringEngine",
        value: function() {
          return adminNormalizeValue_(
            payload.scoringEngine || "manual"
          );
        },
        fallback: "manual"
      },
      {
        key: "gameRole",
        value: function() {
          return typeof normalizeGameRole_ === "function"
            ? normalizeGameRole_(payload.gameRole)
            : adminNormalizeValue_(payload.gameRole || "standalone");
        },
        fallback: "standalone"
      },
      {
        key: "hubMode",
        value: function() {
          return typeof normalizeSeasonHubMode_ === "function"
            ? normalizeSeasonHubMode_(payload.hubMode)
            : adminNormalizeValue_(payload.hubMode || "playable-aggregate");
        },
        fallback: "playable-aggregate"
      },
      {
        key: "showMiniGameLinks",
        value: function() {
          return payload.showMiniGameLinks === undefined
            ? true
            : adminToBoolean_(payload.showMiniGameLinks);
        },
        fallback: true
      },
      {
        key: "includeParentQuestions",
        value: function() {
          return payload.includeParentQuestions === undefined
            ? true
            : adminToBoolean_(payload.includeParentQuestions);
        },
        fallback: true
      },
      {
        key: "parentGameId",
        value: function() {
          return adminNormalizeGameId_(
            payload.parentGameId
          );
        },
        fallback: ""
      },
      {
        key: "includeInParent",
        value: function() {
          return payload.includeInParent === undefined
            ? true
            : adminToBoolean_(payload.includeInParent);
        },
        fallback: true
      },
      {
        key: "parentContributionMode",
        value: function() {
          return typeof normalizeParentContributionMode_ === "function"
            ? normalizeParentContributionMode_(
                payload.parentContributionMode
              )
            : adminNormalizeValue_(
                payload.parentContributionMode || "add-points"
              );
        },
        fallback: "add-points"
      },
      {
        key: "parentContributionWeight",
        value: function() {
          return adminToNumber_(
            payload.parentContributionWeight,
            1
          );
        },
        fallback: 1
      },
      {
        key: "parentBestCount",
        value: function() {
          return Math.max(
            0,
            Math.floor(
              adminToNumber_(
                payload.parentBestCount,
                0
              )
            )
          );
        },
        fallback: 0
      },
      {
        key: "placementPointsJSON",
        value: function() {
          return adminNormalizeValue_(
            payload.placementPointsJSON
          );
        },
        fallback: ""
      },
      {
        key: "leaderboardScoreMode",
        value: function() {
          return typeof normalizeLeaderboardScoreMode_ === "function"
            ? normalizeLeaderboardScoreMode_(
                payload.leaderboardScoreMode
              )
            : adminNormalizeValue_(
                payload.leaderboardScoreMode || "combined-net"
              );
        },
        fallback: "combined-net"
      },
      {
        key: "fixedPointsEnabled",
        value: function() {
          return payload.fixedPointsEnabled === undefined
            ? true
            : adminToBoolean_(payload.fixedPointsEnabled);
        },
        fallback: true
      },
      {
        key: "stakedPointsEnabled",
        value: function() {
          return adminToBoolean_(
            payload.stakedPointsEnabled
          );
        },
        fallback: false
      },
      {
        key: "startingPoints",
        value: function() {
          return Math.max(
            0,
            adminToNumber_(
              payload.startingPoints,
              1000
            )
          );
        },
        fallback: 1000
      },
      {
        key: "minStake",
        value: function() {
          return Math.max(
            1,
            adminToNumber_(
              payload.minStake,
              10
            )
          );
        },
        fallback: 10
      },
      {
        key: "maxStake",
        value: function() {
          return Math.max(
            1,
            adminToNumber_(
              payload.maxStake,
              100
            )
          );
        },
        fallback: 100
      },
      {
        key: "stakeIncrement",
        value: function() {
          return Math.max(
            1,
            adminToNumber_(
              payload.stakeIncrement,
              10
            )
          );
        },
        fallback: 10
      },
      {
        key: "stakeWinMultiplier",
        value: function() {
          return Math.max(
            0,
            adminToNumber_(
              payload.stakeWinMultiplier,
              1
            )
          );
        },
        fallback: 1
      },
      {
        key: "stakeLossMultiplier",
        value: function() {
          return Math.max(
            0,
            adminToNumber_(
              payload.stakeLossMultiplier,
              1
            )
          );
        },
        fallback: 1
      },
      {
        key: "racingLeague",
        value: function() {
          return adminNormalizeValue_(payload.racingLeague);
        },
        fallback: ""
      },
      {
        key: "racingSeriesId",
        value: function() {
          return adminNormalizeValue_(payload.racingSeriesId);
        },
        fallback: ""
      },
      {
        key: "racingMarket",
        value: function() {
          return adminNormalizeValue_(
            payload.racingMarket || "race-winner"
          );
        },
        fallback: "race-winner"
      }
    ];

    fields.forEach(function(field) {

      const aliases =
        [field.key].concat(field.aliases || []);

      const provided =
        aliases.some(function(key) {
          return Object.prototype.hasOwnProperty.call(
            payload,
            key
          );
        });

      if (onlyProvided === true && !provided) {
        return;
      }

      adminSetIfColumnExists_(
        row,
        col,
        field.key,
        provided || onlyProvided !== true
          ? field.value()
          : field.fallback
      );

    });

    /*
      A mini game must point to a different parent game.
      Invalid/self parent IDs are cleared rather than saved.
    */
    if (
      col.parentGameId !== -1 &&
      col.gameId !== -1 &&
      adminNormalizeValue_(row[col.parentGameId]) ===
        adminNormalizeValue_(row[col.gameId])
    ) {
      row[col.parentGameId] = "";
    }

    const role =
      col.gameRole !== -1
        ? adminNormalizeValue_(row[col.gameRole])
        : "standalone";

    const parentGameId =
      col.parentGameId !== -1
        ? adminNormalizeGameId_(row[col.parentGameId])
        : "";

    if (role === "mini" && !parentGameId) {
      throw new Error(
        "A mini game must have a parent game."
      );
    }

    if (role === "mini" && parentGameId) {

      const parentGame =
        typeof getGame === "function"
          ? getGame(parentGameId)
          : null;

      if (
        !parentGame ||
        parentGame.gameRole !== "parent"
      ) {
        throw new Error(
          "The selected parent must be an existing Parent Game."
        );
      }

    }

    if (role !== "mini" && col.parentGameId !== -1) {
      row[col.parentGameId] = "";
    }

    if (role === "parent") {
      const hubMode =
        col.hubMode !== -1
          ? (typeof normalizeSeasonHubMode_ === "function"
              ? normalizeSeasonHubMode_(row[col.hubMode])
              : adminNormalizeValue_(row[col.hubMode] || "playable-aggregate"))
          : "playable-aggregate";

      if (col.hubMode !== -1) {
        row[col.hubMode] = hubMode;
      }

      if (
        hubMode === "leaderboard-only" &&
        col.includeParentQuestions !== -1
      ) {
        row[col.includeParentQuestions] = false;
      }
    }

    if (col.minStake !== -1 && col.maxStake !== -1) {
      const minStake = Math.max(
        1,
        Math.floor(
          adminToNumber_(row[col.minStake], 10)
        )
      );

      const maxStake = Math.max(
        minStake,
        Math.floor(
          adminToNumber_(row[col.maxStake], 100)
        )
      );

      row[col.minStake] = minStake;
      row[col.maxStake] = maxStake;
    }

    if (col.stakeIncrement !== -1) {
      row[col.stakeIncrement] = Math.max(
        1,
        Math.floor(
          adminToNumber_(row[col.stakeIncrement], 10)
        )
      );
    }

    if (
      col.minStake !== -1 &&
      col.maxStake !== -1 &&
      col.stakeIncrement !== -1 &&
      (row[col.maxStake] - row[col.minStake]) %
        row[col.stakeIncrement] !== 0
    ) {
      throw new Error(
        "Maximum stake must align with the minimum stake and stake increment."
      );
    }

    if (col.startingPoints !== -1) {
      row[col.startingPoints] = Math.max(
        0,
        adminToNumber_(row[col.startingPoints], 1000)
      );
    }

    if (col.stakeWinMultiplier !== -1) {
      row[col.stakeWinMultiplier] = Math.max(
        0,
        adminToNumber_(row[col.stakeWinMultiplier], 1)
      );
    }

    if (col.stakeLossMultiplier !== -1) {
      row[col.stakeLossMultiplier] = Math.max(
        0,
        adminToNumber_(row[col.stakeLossMultiplier], 1)
      );
    }

    if (col.parentContributionWeight !== -1) {
      row[col.parentContributionWeight] = Math.max(
        0,
        adminToNumber_(row[col.parentContributionWeight], 1)
      );
    }

    if (col.placementPointsJSON !== -1) {
      const placementPointsJSON =
        adminNormalizeValue_(row[col.placementPointsJSON]);

      if (placementPointsJSON) {
        let parsed;

        try {
          parsed = JSON.parse(placementPointsJSON);
        } catch (err) {
          throw new Error(
            "PlacementPointsJSON must be valid JSON."
          );
        }

        if (
          !Array.isArray(parsed) &&
          (!parsed || typeof parsed !== "object")
        ) {
          throw new Error(
            "PlacementPointsJSON must be an array or object."
          );
        }
      }
    }

    return row;

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
  
    const featureFlags =
      adminResolveGameTypeFeatureFlags_(
        type,
        payload,
        null
      );
  
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
      featureFlags.predictionEnabled
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "rankingEnabled",
      featureFlags.rankingEnabled
    );
  
    adminSetIfColumnExists_(
      row,
      col,
      "confidenceEnabled",
      featureFlags.confidenceEnabled
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
      featureFlags.wagerEnabled
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
      "playerProfileScope",
      adminNormalizeValue_(
        payload.playerProfileScope || "game"
      ).toLowerCase()
    );

    adminSetIfColumnExists_(
      row,
      col,
      "playerProfileGroupKey",
      adminNormalizeValue_(
        payload.playerProfileGroupKey
      )
    );

    adminSetIfColumnExists_(
      row,
      col,
      "playerProfileGroupLabel",
      adminNormalizeValue_(
        payload.playerProfileGroupLabel
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

    const hybridPayload =
      Object.assign(
        {},
        payload,
        {
          mixedGame: featureFlags.mixedGame === true,
          gameFormat: featureFlags.mixedGame === true ? "hybrid" : "standard",
          scoringMode: featureFlags.mixedGame === true ? "hybrid" : "standard",
          stakedPointsEnabled: featureFlags.stakedPointsEnabled === true,
          fixedPointsEnabled: featureFlags.fixedPointsEnabled === true
        }
      );

    adminApplyHybridGameFields_(
      row,
      col,
      hybridPayload,
      false
    );
  
    return row;
  
  }
  
  function adminClearGamesOnlyCaches_() {

    try {
      if (typeof APP_RUNTIME_CACHE !== "undefined") {
        APP_RUNTIME_CACHE = {};
      }
    } catch (err) {
      Logger.log("Could not clear runtime cache: " + err);
    }

    if (typeof clearGamesCache === "function") {
      clearGamesCache();
    }

    try {
      CacheService
        .getScriptCache()
        .remove("sheet_Games");
    } catch (err) {
      Logger.log("Could not clear sheet_Games cache: " + err);
    }

  }

  function adminClearAllCaches_() {

    if (typeof clearAppCaches === "function") {
      clearAppCaches();
      return;
    }

    adminClearGamesOnlyCaches_();

  }

  function adminClearCaches_() {

    adminClearGamesOnlyCaches_();

  }

 /* =========================================================
   GET ADMIN GAMES
========================================================= */

function adminGetGames() {

  adminEnsureGameOptionalHeaders_();

  const games = (getGames() || []).map(function(game) {
    if (typeof survivorGetSettings_ !== "function") return game;
    const type = String(game && (game.type || game.Type) || "").trim().toLowerCase();
    if (type !== "survivor") return game;
    return Object.assign({}, game, {
      survivorSettings: survivorGetSettings_(game.gameId || game.GameId || "")
    });
  });

  return {
    success: true,
    games: games,
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
      ((typeof LockService.getDocumentLock === "function" ? LockService.getDocumentLock() : null) || LockService.getScriptLock());
  
    const gotLock =
      lock.tryLock(5000);

    if (!gotLock) {
      throw new Error(
        "Could not save game: another admin save is still running. Please wait a few seconds and try again."
      );
    }
  
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

        return {
          success: true,
          message: "Game already exists",
          gameId: gameId,
          duplicate: true
        };

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
              )
          }
        );

      if (Object.prototype.hasOwnProperty.call(payload, "predictionEnabled")) {
        safePayload.predictionEnabled =
          adminToBoolean_(payload.predictionEnabled);
      } else {
        delete safePayload.predictionEnabled;
      }

      if (Object.prototype.hasOwnProperty.call(payload, "rankingEnabled")) {
        safePayload.rankingEnabled =
          adminToBoolean_(payload.rankingEnabled);
      } else {
        delete safePayload.rankingEnabled;
      }
  
      const row =
        adminBuildGameRow_(
          headers,
          col,
          safePayload
        );
  
      sh.appendRow(row);

      const survivorType = typeof normalizeGameType_ === "function"
        ? normalizeGameType_(safePayload.type || "prediction")
        : adminNormalizeValue_(safePayload.type || "prediction").toLowerCase();
      if (survivorType === "survivor" && typeof survivorSaveSettings_ === "function") {
        survivorSaveSettings_(gameId, typeof sportsSurvivorSettingsFromPayload_ === "function"
          ? sportsSurvivorSettingsFromPayload_(payload)
          : (payload.survivorSettings || {}));
      }
  
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

      const resolvedType =
        typeof normalizeGameType_ === "function"
          ? normalizeGameType_(
              Object.prototype.hasOwnProperty.call(payload, "type")
                ? payload.type
                : (col.type !== -1 ? row[col.type] : "prediction")
            )
          : adminNormalizeValue_(
              Object.prototype.hasOwnProperty.call(payload, "type")
                ? payload.type
                : (col.type !== -1 ? row[col.type] : "prediction")
            ).toLowerCase();

      const existingFeatureFlags = {
        predictionEnabled: col.predictionEnabled !== -1 ? row[col.predictionEnabled] : undefined,
        rankingEnabled: col.rankingEnabled !== -1 ? row[col.rankingEnabled] : undefined,
        confidenceEnabled: col.confidenceEnabled !== -1 ? row[col.confidenceEnabled] : undefined,
        wagerEnabled: col.wagerEnabled !== -1 ? row[col.wagerEnabled] : undefined,
        fixedPointsEnabled: col.fixedPointsEnabled !== -1 ? row[col.fixedPointsEnabled] : undefined,
        stakedPointsEnabled: col.stakedPointsEnabled !== -1 ? row[col.stakedPointsEnabled] : undefined
      };

      const featureFlags =
        adminResolveGameTypeFeatureFlags_(
          resolvedType,
          payload,
          existingFeatureFlags
        );
  
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
          resolvedType
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

      /*
        Game Type is the single source of truth for non-Hybrid games.
        Hybrid games preserve the administrator's selected combination.
      */
      adminSetIfColumnExists_(row, col, "predictionEnabled", featureFlags.predictionEnabled);
      adminSetIfColumnExists_(row, col, "rankingEnabled", featureFlags.rankingEnabled);
      adminSetIfColumnExists_(row, col, "confidenceEnabled", featureFlags.confidenceEnabled);
      adminSetIfColumnExists_(row, col, "wagerEnabled", featureFlags.wagerEnabled);
      
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
  
      const normalizedHybridPayload =
        Object.assign(
          {},
          payload,
          {
            mixedGame: featureFlags.mixedGame === true,
            gameFormat: featureFlags.mixedGame === true ? "hybrid" : "standard",
            scoringMode: featureFlags.mixedGame === true ? "hybrid" : "standard",
            fixedPointsEnabled: featureFlags.fixedPointsEnabled === true,
            stakedPointsEnabled: featureFlags.stakedPointsEnabled === true
          }
        );

      adminApplyHybridGameFields_(
        row,
        col,
        normalizedHybridPayload,
        true
      );

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

      if ("playerProfileScope" in payload) {
        adminSetIfColumnExists_(
          row,
          col,
          "playerProfileScope",
          adminNormalizeValue_(payload.playerProfileScope || "game").toLowerCase()
        );
      }

      if ("playerProfileGroupKey" in payload) {
        adminSetIfColumnExists_(
          row,
          col,
          "playerProfileGroupKey",
          adminNormalizeValue_(payload.playerProfileGroupKey)
        );
      }

      if ("playerProfileGroupLabel" in payload) {
        adminSetIfColumnExists_(
          row,
          col,
          "playerProfileGroupLabel",
          adminNormalizeValue_(payload.playerProfileGroupLabel)
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
          col.defaultGame !== -1 &&
          data.length > 1
        ) {

          const defaultValues =
            data.slice(1).map(function(dataRow) {

              const otherGameId =
                adminNormalizeValue_(
                  dataRow[col.gameId]
                );

              return [
                otherGameId === gameId
              ];

            });

          sh.getRange(
            2,
            col.defaultGame + 1,
            defaultValues.length,
            1
          ).setValues(
            defaultValues
          );

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

      if (resolvedType === "survivor" && typeof survivorSaveSettings_ === "function") {
        survivorSaveSettings_(gameId, typeof sportsSurvivorSettingsFromPayload_ === "function"
          ? sportsSurvivorSettingsFromPayload_(payload)
          : (payload.survivorSettings || {}));
      }
  
      adminClearCaches_();
  
      return {
        success: true,
        message: "Game updated",
        gameId: gameId
      };
  
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
    ((typeof LockService.getDocumentLock === "function" ? LockService.getDocumentLock() : null) || LockService.getScriptLock());

  const gotLock =
    lock.tryLock(5000);

  if (!gotLock) {
    throw new Error(
      "Could not clone game setup: another admin save is still running. Please wait a few seconds and try again."
    );
  }

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

    adminClearAllCaches_();

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

    mixedGame:
      sourceGame.mixedGame === true ||
      sourceGame.gameFormat === "hybrid",

    gameFormat:
      sourceGame.gameFormat ||
      sourceGame.scoringMode ||
      "standard",

    scoringMode:
      sourceGame.gameFormat ||
      sourceGame.scoringMode ||
      "standard",

    scoringEngine:
      sourceGame.scoringEngine || "manual",

    gameRole:
      sourceGame.gameRole || "standalone",

    parentGameId:
      sourceGame.parentGameId || "",

    includeInParent:
      sourceGame.includeInParent !== false,

    hubMode:
      sourceGame.hubMode || "playable-aggregate",

    showMiniGameLinks:
      sourceGame.showMiniGameLinks !== false,

    includeParentQuestions:
      sourceGame.includeParentQuestions !== false,

    parentContributionMode:
      sourceGame.parentContributionMode || "add-points",

    parentContributionWeight:
      sourceGame.parentContributionWeight === undefined
        ? 1
        : sourceGame.parentContributionWeight,

    parentBestCount:
      sourceGame.parentBestCount || 0,

    placementPointsJSON:
      sourceGame.placementPointsJSON || "",

    leaderboardScoreMode:
      sourceGame.leaderboardScoreMode || "combined-net",

    fixedPointsEnabled:
      sourceGame.fixedPointsEnabled !== false,

    stakedPointsEnabled:
      sourceGame.stakedPointsEnabled === true,

    startingPoints:
      sourceGame.startingPoints === undefined
        ? 1000
        : sourceGame.startingPoints,

    minStake:
      sourceGame.minStake || 10,

    maxStake:
      sourceGame.maxStake || 100,

    stakeIncrement:
      sourceGame.stakeIncrement || 10,

    stakeWinMultiplier:
      sourceGame.stakeWinMultiplier === undefined
        ? 1
        : sourceGame.stakeWinMultiplier,

    stakeLossMultiplier:
      sourceGame.stakeLossMultiplier === undefined
        ? 1
        : sourceGame.stakeLossMultiplier,

    racingLeague:
      sourceGame.racingLeague || "",

    racingSeriesId:
      sourceGame.racingSeriesId || "",

    racingMarket:
      sourceGame.racingMarket || "race-winner",
    
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