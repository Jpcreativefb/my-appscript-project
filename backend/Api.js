/* =========================
   API POST
========================= */

function doPost(e) {

  try {

    const params =
      e && e.parameter
        ? e.parameter
        : {};

    let body = {};

    if (
      e &&
      e.postData &&
      e.postData.contents
    ) {

      body =
        JSON.parse(
          e.postData.contents
        );

    }

    const action =
      body.action ||
      params.action ||
      "";

    if (action === "adminUploadImage") {

      return json(
        adminUploadImage(
          body
        )
      );

    }

    if (action === "adminImportImageFromUrl") {

      return json(
        adminImportImageFromUrl(
          body
        )
      );
    
    }

    if (action === "adminSearchTmdbMoviePosters") {

      return json(
        adminSearchTmdbMoviePosters(
          body
        )
      );
    
    }

    if (action === "adminDeleteImageFromDrive") {

      return json(
        adminDeleteImageFromDrive(
          body
        )
      );
    
    }

    return json({
      success:
        false,

      error:
        "Unknown POST action: " + action
    });

  } catch (err) {

    Logger.log(
      "API POST ERROR: " +
      (
        err && err.stack
          ? err.stack
          : err.message
      )
    );

    return json({
      success:
        false,

      error:
        err && err.message
          ? err.message
          : String(err)
    });

  }

}

/* =========================
   API
========================= */

function doGet(e) {

  try {

    const action =
      e &&
      e.parameter
        ? e.parameter.action
        : "";

    const params =
      e && e.parameter
        ? e.parameter
        : {};

    /* =========================
       ADMIN ACTIONS
    ========================= */

    const adminActions = [
      "adminGetGames",
      "adminGetGameTypes",
      "adminGetGameConfig",
      "adminSaveGame",
      "adminCreateGame",
      "adminUpdateGame",
      "adminArchiveGame",
      "adminCloneGame",
      "adminCloneGameSetup",

      "adminGetGameSetup",
      "adminCreateCategory",
      "adminUpdateCategory",
      "adminArchiveCategory",
      "adminCreateNominee",
      "adminUpdateNominee",
      "adminArchiveNominee",

      "adminUploadImage",

      "adminRunGamePreflight",
      "adminRefreshResultsCaches",

      "adminSetupScoringAutomationSystem",
      "adminRunScoringAutomation",
      "adminGetScoringAutomationStatus",
      "adminInstallScoringAutomationTrigger",
      "adminUninstallScoringAutomationTrigger",

      "adminSetupInternetResultsSystem",
      "adminPullInternetResults",
      "adminGetLastInternetImport",
      "adminGetInternetSources",
      "adminSaveInternetSource",
      "adminGenerateResultSuggestions",
      "adminGetResultSuggestions",
      "adminApplyResultSuggestion",
      "adminRejectResultSuggestion",
      "adminApplyHighConfidenceSuggestions",
      "adminParseSportsScoreboard",

      "adminSetupLiveResultsSystem",
      "adminSetLiveWinner",
      "adminClearLiveWinner",

      "adminCreateSportsWager",
      "adminSettleSportsWagers",
      "adminRefreshSportsWagerScores",

      "adminSummary",
      "adminClearCaches",
      "adminUpdateCategorySetting",
      "adminClearCategoryWinner",
      "adminCreateUser",
      "adminResetUserPin",
      "adminToggleUserAdmin",
      "adminToggleUserActive"
    ];

    const isAdminAction =
      adminActions.indexOf(action) !== -1;

    /* =========================
       GAME ID
    ========================= */

    const gameId =
      params.gameId ||
      (
        isAdminAction
          ? ""
          : getDefaultGameId()
      );

    /* =========================
       HEALTH / DEFAULT
    ========================= */

    if (
      !action ||
      action === "health"
    ) {

      return json({
        success: true,
        message: "API running",
        gameId: gameId
      });

    }

    /* =========================
       PUBLIC GAMES
    ========================= */

    if (action === "getActiveGames") {

      return json({
        success: true,
        games:
          getPublicActiveGames(),
        defaultGameId:
          getDefaultGameId(),
        currentGameId:
          gameId
      });

    }

    /* =========================
       ADMIN: GAMES
    ========================= */

    if (action === "adminGetGames") {

      return json(
        adminGetGames()
      );

    }

    if (action === "adminGetGameTypes") {

      return json(
        adminGetGameTypes()
      );

    }

    if (action === "adminGetGameConfig") {

      return json({
        success: true,
        game:
          getGameRuntimeConfig(
            params.gameId || gameId
          )
      });

    }

    if (action === "adminSaveGame") {

      return json(
        adminSaveGame(
          params
        )
      );

    }

    if (action === "adminCreateGame") {

      return json(
        adminCreateGame(
          params
        )
      );

    }

    if (action === "adminUpdateGame") {

      return json(
        adminUpdateGame(
          params
        )
      );

    }

    if (action === "adminArchiveGame") {

      return json(
        adminArchiveGame(
          params
        )
      );

    }

    if (action === "adminCloneGame") {

      return json(
        adminCloneGame(
          params
        )
      );

    }

    if (action === "adminCloneGameSetup") {

      return json(
        adminCloneGameSetup(
          params
        )
      );

    }

    /* =========================
       ADMIN: GAME SETUP
       Categories / Questions
    ========================= */

    if (action === "adminGetGameSetup") {

      return json(
        adminGetGameSetup(
          params
        )
      );

    }

    if (action === "adminCreateCategory") {

      return json(
        adminCreateCategory(
          params
        )
      );

    }

    if (action === "adminUpdateCategory") {

      return json(
        adminUpdateCategory(
          params
        )
      );

    }

    if (action === "adminArchiveCategory") {

      return json(
        adminArchiveCategory(
          params
        )
      );

    }

    if (action === "adminCreateNominee") {

      return json(
        adminCreateNominee(
          params
        )
      );

    }

    if (action === "adminUpdateNominee") {

      return json(
        adminUpdateNominee(
          params
        )
      );

    }

    if (action === "adminArchiveNominee") {

      return json(
        adminArchiveNominee(
          params
        )
      );

    }

    if (action === "adminUploadImage") {

      return json(
        adminUploadImage(
          params
        )
      );

    }

    if (action === "adminRunGamePreflight") {

      return json(
        adminRunGamePreflight(
          params
        )
      );

    }

    if (action === "adminRefreshResultsCaches") {

      return json(
        adminRefreshResultsCaches(
          params
        )
      );

    }

    if (action === "adminSetupScoringAutomationSystem") {

      return json(
        apiAdminSetupScoringAutomationSystem({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId
        })
      );

    }

    if (action === "adminRunScoringAutomation") {

      return json(
        apiAdminRunScoringAutomation({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId
        })
      );

    }

    if (action === "adminGetScoringAutomationStatus") {

      return json(
        apiAdminGetScoringAutomationStatus({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId
        })
      );

    }

    if (action === "adminInstallScoringAutomationTrigger") {

      return json(
        apiAdminInstallScoringAutomationTrigger({
          username:
            params.username,
          token:
            params.token
        })
      );

    }

    if (action === "adminUninstallScoringAutomationTrigger") {

      return json(
        apiAdminUninstallScoringAutomationTrigger({
          username:
            params.username,
          token:
            params.token
        })
      );

    }

    if (action === "adminSetupInternetResultsSystem") {

      return json(
        apiAdminSetupInternetResultsSystem({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId
        })
      );

    }

    if (action === "adminPullInternetResults") {

      return json(
        apiAdminPullInternetResults({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId,
          sourceId:
            params.sourceId,
          name:
            params.name,
          sourceType:
            params.sourceType,
          url:
            params.url,
          parserType:
            params.parserType,
          matchMode:
            params.matchMode,
          trustLevel:
            params.trustLevel,
          manualText:
            params.manualText,
          notes:
            params.notes
        })
      );

    }

    if (action === "adminGetLastInternetImport") {

      return json(
        apiAdminGetLastInternetImport({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId
        })
      );

    }

        if (action === "adminGetInternetSources") {

      return json(
        apiAdminGetInternetSources({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId
        })
      );

    }

    if (action === "adminSaveInternetSource") {

      return json(
        apiAdminSaveInternetSource({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId,
          sourceId:
            params.sourceId,
          name:
            params.name,
          sourceType:
            params.sourceType,
          url:
            params.url,
          parserType:
            params.parserType,
          matchMode:
            params.matchMode,
          trustLevel:
            params.trustLevel,
          notes:
            params.notes,
          active:
            params.active
        })
      );

    }

    if (action === "adminGenerateResultSuggestions") {

      return json(
        apiAdminGenerateResultSuggestions({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId
        })
      );

    }

    if (action === "adminGetResultSuggestions") {

      return json(
        apiAdminGetResultSuggestions({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId
        })
      );

    }

    if (action === "adminApplyResultSuggestion") {

      return json(
        apiAdminApplyResultSuggestion({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId,
          suggestionId:
            params.suggestionId
        })
      );

    }

    if (action === "adminRejectResultSuggestion") {

      return json(
        apiAdminRejectResultSuggestion({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId,
          suggestionId:
            params.suggestionId,
          notes:
            params.notes || "Rejected by admin"
        })
      );

    }

    if (action === "adminApplyHighConfidenceSuggestions") {

      return json(
        apiAdminApplyHighConfidenceSuggestions({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId,
          minConfidence:
            params.minConfidence || 90,
          latestOnly:
            params.latestOnly === undefined
              ? true
              : params.latestOnly
        })
      );

    }

    if (action === "adminParseSportsScoreboard") {

      return json(
        apiAdminParseSportsScoreboard({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId
        })
      );

    }

    /* =========================
       LOGIN
    ========================= */

    if (action === "login") {

      return json(
        loginUser(
          params.username,
          params.pin
        )
      );

    }

    /* =========================
       STARTUP PAYLOAD
    ========================= */

    if (action === "getStartupPayload") {

      return json(
        apiGetStartupPayload({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId
        })
      );
    
    }
    
    /* =========================
       DASHBOARD GAMES HUB
    ========================= */
    
    if (action === "getDashboardGamesHub") {
    
      return json(
        apiGetDashboardGamesHub({
          username:
            params.username,
          token:
            params.token
        })
      );
    
    }
    
    /* =========================
       CATEGORIES
    ========================= */
    
    if (action === "getCategories") {
    
      return json(
        getCategories(
          gameId
        )
      );
    
    }

    if (action === "getCategorySettings") {

      return json(
        getCategorySettings(
          gameId
        )
      );

    }

    /* =========================
       PICKS
    ========================= */

    if (action === "getMyPicks") {

      return json(
        apiGetMyPicks(
          params.username,
          gameId
        )
      );

    }

    if (action === "savePick") {

      return json(
        savePick({
          username:
            params.username,

          gameId:
            gameId,

          categoryId:
            params.categoryId,

          nomineeId:
            params.nomineeId,

          confidencePoints:
            params.confidencePoints
        })
      );

    }

    /* =========================
       LIVE RESULTS / LIVE SCORING
    ========================= */

    if (action === "liveLeaderboard") {

      return json(
        apiGetLiveLeaderboard({
          gameId:
            gameId
        })
      );

    }

    if (action === "liveResults") {

      return json(
        apiGetLiveResults({
          gameId:
            gameId
        })
      );

    }

    if (action === "liveGameState") {

      return json(
        apiGetLiveGameState({
          gameId:
            gameId
        })
      );

    }

    /* =========================
       USER BREAKDOWN
    ========================= */

    if (action === "userBreakdown") {

      return json(
        getUserBreakdown(
          params.username,
          gameId
        )
      );

    }

    /* =========================
       USER PROFILE
    ========================= */

    if (action === "getUserProfile") {

      return json(
        getUserProfile(
          params.username,
          gameId
        )
      );

    }

    if (action === "saveUserProfile") {

      return json(
        saveUserProfile({
          username:
            params.username,

          gameId:
            gameId,

          displayName:
            params.displayName,

          avatar:
            params.avatar,

          themeColor:
            params.themeColor
        })
      );

    }

    if (action === "getUserProfileHistory") {

      return json(
        getUserProfileHistory(
          params.username,
          gameId
        )
      );

    }

    /* =========================
       ADMIN: SUMMARY / CACHE
    ========================= */

    if (action === "adminSummary") {

      return json(
        apiAdminSummary({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId
        })
      );

    }

    if (action === "adminClearCaches") {

      return json(
        apiAdminClearCaches({
          username:
            params.username,
          token:
            params.token
        })
      );

    }

    if (action === "adminSetupLiveResultsSystem") {

      return json(
        apiSetupLiveResultsSystem({
          username:
            params.username,
          token:
            params.token
        })
      );

    }

    /* =========================
       ADMIN: CATEGORY SETTINGS
    ========================= */

    if (action === "adminUpdateCategorySetting") {

      return json(
        apiAdminUpdateCategorySetting({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId,
          categoryId:
            params.categoryId,
          locked:
            params.locked,
          points:
            params.points,
          winnerNomineeId:
            params.winnerNomineeId,
          notes:
            params.notes || ""
        })
      );

    }

    if (action === "adminClearCategoryWinner") {

      return json(
        apiAdminClearCategoryWinner({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId,
          categoryId:
            params.categoryId,
          notes:
            params.notes || "Winner cleared"
        })
      );

    }

    if (action === "adminSetLiveWinner") {

      return json(
        apiAdminSetLiveWinner({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId,
          categoryId:
            params.categoryId,
          nomineeId:
            params.nomineeId,
          source:
            params.source || "admin",
          notes:
            params.notes || ""
        })
      );

    }

    if (action === "adminClearLiveWinner") {

      return json(
        apiAdminClearLiveWinner({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId,
          categoryId:
            params.categoryId,
          source:
            params.source || "admin",
          notes:
            params.notes || ""
        })
      );

    }

    /* =========================
       ADMIN: USERS
    ========================= */

    if (action === "adminCreateUser") {

      return json(
        apiAdminCreateUser({
          username:
            params.username,
          token:
            params.token,
          newUsername:
            params.newUsername,
          pin:
            params.pin,
          isAdmin:
            params.isAdmin,
          avatar:
            params.avatar,
          themeColor:
            params.themeColor
        })
      );

    }

    if (action === "adminResetUserPin") {

      return json(
        apiAdminResetUserPin({
          username:
            params.username,
          token:
            params.token,
          targetUsername:
            params.targetUsername,
          pin:
            params.pin
        })
      );

    }

    if (action === "adminToggleUserAdmin") {

      return json(
        apiAdminToggleUserAdmin({
          username:
            params.username,
          token:
            params.token,
          targetUsername:
            params.targetUsername,
          isAdmin:
            params.isAdmin
        })
      );

    }

    if (action === "adminToggleUserActive") {

      return json(
        apiAdminToggleUserActive({
          username:
            params.username,
          token:
            params.token,
          targetUsername:
            params.targetUsername,
          active:
            params.active
        })
      );

    }

    

        // =========================
    // BETTING OPTIONS
    // =========================

    if (action === "getBettingOptions") {

      return json(
        getBettingOptions(
          gameId
        )
      );

    }

        // =========================
    // ADMIN: SPORTS WAGERS
    // =========================

    if (action === "adminCreateSportsWager") {

      return json(
        apiAdminCreateSportsWager({

          username:
            params.username,

          token:
            params.token,

          awardsGameId:
            params.awardsGameId ||
            gameId,

          sportsGameId:
            params.sportsGameId,

          espnEventId:
            params.espnEventId,

          categoryId:
            params.categoryId,

          awayOdds:
            params.awayOdds,

          homeOdds:
            params.homeOdds

        })
      );

    }

    if (action === "adminSettleSportsWagers") {

      return json(
        apiAdminSettleSportsWagers({
    
          username:
            params.username,
    
          token:
            params.token,
    
          awardsGameId:
            params.awardsGameId ||
            gameId,
    
          force:
            params.force
    
        })
      );
    
    }
    
    if (action === "adminRefreshSportsWagerScores") {
    
      return json(
        apiAdminRefreshSportsWagerScores({
    
          username:
            params.username,
    
          token:
            params.token,
    
          awardsGameId:
            params.awardsGameId ||
            gameId
    
        })
      );
    
    }

    // =========================
    // MY BETS
    // =========================

    if (action === "getMyBets") {

      return json(
        apiGetMyBets(
          e.parameter.username,
          gameId
        )
      );

    }

    // =========================
    // SAVE BET
    // =========================

    if (action === "saveBet") {

      return json(
        saveBet({

          username:
            e.parameter.username,

          categoryId:
            e.parameter.categoryId,

          nomineeId:
            e.parameter.nomineeId,

          betAmount:
            e.parameter.betAmount,

          gameId:
            gameId

        })
      );

    }

    // =========================
    // BETTING LEADERBOARD
    // =========================

    if (action === "bettingLeaderboard") {

      return json(
        getBettingLeaderboardData(
          gameId
        )
      );

    }

    /* =========================
       UNKNOWN ACTION
    ========================= */

    return json({
      success: false,
      error:
        "Unknown action: " + action,
      gameId:
        gameId
    });

  } catch (err) {

    Logger.log(
      "API ERROR: " +
      (
        err && err.stack
          ? err.stack
          : err.message
      )
    );

    return json({
      success: false,
      error:
        err && err.message
          ? err.message
          : String(err)
    });

  }

}

/* =========================
   JSON RESPONSE
========================= */

function json(obj) {

  return ContentService
    .createTextOutput(
      JSON.stringify(obj)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}