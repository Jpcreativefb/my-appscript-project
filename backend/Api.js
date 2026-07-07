var API_JSON_CALLBACK_ = "";

/* =========================
   API POST
========================= */

function doPost(e) {

  API_JSON_CALLBACK_ = "";

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

    // =========================
    // PROFILE AVATAR UPLOAD
    // =========================

    if (action === "uploadProfileAvatar") {

      return profileDoPost(e);

    }

    // =========================
    // ADMIN IMAGE UPLOADS
    // =========================

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

    API_JSON_CALLBACK_ =
      String(
        params.callback ||
        params.jsonp ||
        ""
      ).trim();

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

      "adminSetupUniversalQuestionSystem",

      "adminCreateSportsWager",
      "adminCreateSportsWagersBulk",
      "adminSettleSportsWagers",
      "adminRefreshSportsWagerScores",
      "adminAutoSetSportsWagerOdds",

      "adminSetupRacingWagerSystem",
      "adminCreateRacingWager",
      "adminRefreshRacingWagerScores",
      "adminSettleRacingWagers",

      "adminSetupSportsControls",
      "adminGetSportsControlDashboard",

      "adminGetSportsLeagueSettings",
      "adminUpdateSportsLeagueSetting",
      "adminInstallSportsScoresTrigger",
      "adminRemoveSportsScoresTrigger",

      "adminCreateSportsSeasonJobs",
      "adminRunSportsSeasonBatch",
      "adminUpdateSportsSeasonJobStatus",
      "adminInstallSportsSeasonBatchTrigger",
      "adminRemoveSportsSeasonBatchTrigger",

      "adminGetSportsOddsSettings",
      "adminUpdateSportsOddsSetting",
      "adminRefreshSportsOddsLeague",
      "adminRunSportsOddsHybridRefresh",
      "adminInstallSportsOddsHybridTrigger",
      "adminRemoveSportsOddsHybridTrigger",

      "adminSummary",
      "adminClearCaches",
      "adminUpdateCategorySetting",
      "adminClearCategoryWinner",
      "adminCreateUser",
      "adminResetUserPin",
      "adminToggleUserAdmin",
      "adminToggleUserActive",
      "getLeagueMembers",
      "saveLeagueFeatureAccess",
      "assignGameToLeague",
      "removeLeagueMember",
      "addLeagueMember",
      "getMyLeagues",
      "createLeague",
      "adminSetupLeagueAccessSystem"
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

    const leagueId =
      typeof normalizeLeagueId_ === "function"
        ? normalizeLeagueId_(
            params.leagueId ||
            params.activeLeagueId ||
            ""
          )
        : String(
            params.leagueId ||
            params.activeLeagueId ||
            ""
          ).trim();

    /* =========================
       PROFILE
    ========================= */

    if (action === "getEditableProfile") {

      return json(
        apiGetEditableProfile(
          params.username,
          gameId
        )
      );

    }

    if (action === "saveEditableProfile") {

      return json(
        apiSaveEditableProfile({
          username:
            params.username,

          gameId:
            gameId,

          scope:
            params.scope,

          displayName:
            params.displayName,

          realName:
            params.realName,

          avatarType:
            params.avatarType,

          avatarInitials:
            params.avatarInitials,

          avatarEmoji:
            params.avatarEmoji,

          avatarUrl:
            params.avatarUrl,

          avatarFileId:
            params.avatarFileId,

          profileColor:
            params.profileColor,

          bio:
            params.bio
        })
      );

    }
    
    // =========================
   // ADMIN SPORTS USAGE
    // =========================

      if (action === "adminGetSportsUsage") {

         return json(
          adminGetSportsUsage()
        );

      }

    // =========================
   // ADMIN SPORTS WAGER GAMES
    // =========================

      if (action === "adminGetSportsWagerGames") {

        return json(
          apiAdminGetSportsWagerGames(
            e.parameter
          )
        );

      }

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

      const activeGamesUsername =
        params.username ||
        "";

      return json({
        success: true,
        games:
          activeGamesUsername &&
          typeof getPublicActiveGamesForUser_ === "function"
            ? getPublicActiveGamesForUser_(
                activeGamesUsername
              )
            : getPublicActiveGames(),
        defaultGameId:
          getDefaultGameId(),
        currentGameId:
          gameId
      });

    }


    /* =========================
       LEAGUES / ACCESS
    ========================= */

    if (action === "adminSetupLeagueAccessSystem") {

      return json(
        apiSetupLeagueAccessSystem({
          username:
            params.username,
          token:
            params.token
        })
      );

    }

    if (action === "getMyLeagues") {

      return json(
        apiGetMyLeagues({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId,
          leagueId:
            leagueId
        })
      );

    }

    if (action === "createLeague") {

      return json(
        apiCreateLeague({
          username:
            params.username,
          token:
            params.token,
          leagueId:
            params.leagueId,
          leagueName:
            params.leagueName || params.name,
          gameId:
            gameId,
          visibility:
            params.visibility,
          joinMode:
            params.joinMode
        })
      );

    }

    if (action === "addLeagueMember") {

      return json(
        apiAddLeagueMember({
          username:
            params.username,
          token:
            params.token,
          leagueId:
            leagueId,
          memberUsername:
            params.memberUsername || params.targetUsername,
          role:
            params.role
        })
      );

    }

    if (action === "removeLeagueMember") {

      return json(
        apiRemoveLeagueMember({
          username:
            params.username,
          token:
            params.token,
          leagueId:
            leagueId,
          memberUsername:
            params.memberUsername || params.targetUsername
        })
      );

    }

    if (action === "assignGameToLeague") {

      return json(
        apiAssignGameToLeague({
          username:
            params.username,
          token:
            params.token,
          leagueId:
            leagueId,
          gameId:
            gameId,
          leagueId:
            leagueId
        })
      );

    }

    if (action === "saveLeagueFeatureAccess") {

      return json(
        apiSaveLeagueFeatureAccess({
          username:
            params.username,
          token:
            params.token,
          leagueId:
            leagueId,
          gameId:
            gameId,
          feature:
            params.feature,
          accessRule:
            params.accessRule,
          rolesAllowed:
            params.rolesAllowed,
          usersAllowed:
            params.usersAllowed,
          usersBlocked:
            params.usersBlocked,
          active:
            params.active
        })
      );

    }

    if (action === "getLeagueMembers") {

      return json(
        apiGetLeagueMembers({
          username:
            params.username,
          token:
            params.token,
          leagueId:
            leagueId
        })
      );

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
          params.pin,
          params.rememberMe
        )
      );

    }


    if (action === "validateSession") {

      return json(
        validateSessionToken(
          params.token
        )
      );

    }

       // =========================
    // SIGNUP
    // =========================

    if (action === "signup") {

      return json(
        createUser(
          e.parameter.username,
          e.parameter.realName,
          e.parameter.pin,
          e.parameter.email,
          e.parameter.phone,
          e.parameter.contactMethod
        )
      );

    }

    // =========================
    // PIN RESET REQUEST
    // =========================

    if (action === "requestPinReset") {

      return json(
        requestPinReset(
          e.parameter.identifier
        )
      );

    }

    // =========================
    // PIN RESET CONFIRM
    // =========================

    if (action === "resetPin") {

      return json(
        resetPin(
          e.parameter.identifier,
          e.parameter.resetCode,
          e.parameter.newPin
        )
      );

    }

    // =========================
    // NOTIFICATION PREFERENCE
    // =========================

    if (action === "getNotificationPreference") {

      return json(
        getNotificationPreference(
          e.parameter.token
        )
      );

    }

    if (action === "setNotificationPreference") {

      return json(
        setNotificationPreference(
          e.parameter.token,
          e.parameter.contactMethod,
          e.parameter.email,
          e.parameter.phone
        )
      );

    }

    // =========================
    // ADMIN MASS NOTIFICATION
    // Free version sends email only.
    // Phone users are logged/skipped for manual contact.
    // =========================

    if (action === "adminSendMassNotification") {

      return json(
        adminSendMassNotification(
          e.parameter.token,
          e.parameter.subject,
          e.parameter.message,
          e.parameter.gameId || gameId
        )
      );

    }

    if (action === "adminGetPhoneNotificationList") {

      return json(
        adminGetPhoneNotificationList(
          e.parameter.token
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
            params.token,
          leagueId:
            leagueId
        })
      );
    
    }
    
    /* =========================
       CATEGORIES
    ========================= */
    
    if (action === "getCategories") {

      const access =
        userCanAccessGameFeature_(
          params.username || "",
          gameId,
          "viewGame",
          leagueId
        );

      if (!access.allowed) {
        return json({
          success: false,
          error: "Access denied: " + access.reason
        });
      }

      return json(
        getCategories(
          gameId
        )
      );
    
    }

    if (action === "getCategorySettings") {

      const access =
        userCanAccessGameFeature_(
          params.username || "",
          gameId,
          "viewGame",
          leagueId
        );

      if (!access.allowed) {
        return json({
          success: false,
          error: "Access denied: " + access.reason
        });
      }

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

      const access =
        userCanAccessGameFeature_(
          params.username,
          gameId,
          "makePicks",
          leagueId
        );

      if (!access.allowed) {
        return json({
          success: false,
          error: "Access denied: " + access.reason
        });
      }

      return json(
        apiGetMyPicks(
          params.username,
          gameId
        )
      );

    }

    if (action === "savePick") {

      const access =
        userCanAccessGameFeature_(
          params.username,
          gameId,
          "makePicks",
          leagueId
        );

      if (!access.allowed) {
        return json({
          success: false,
          error: "Access denied: " + access.reason
        });
      }

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
       STANDARD LEADERBOARD
       Lightweight rows-only endpoint for the leaderboard page.
    ========================= */

    if (action === "leaderboard") {

      const leaderboard =
        typeof getLeaderboardCached === "function"
          ? getLeaderboardCached(
              gameId,
              false
            )
          : getLeaderboardData(
              gameId
            );

      const access =
        userCanAccessGameFeature_(
          params.username || "",
          gameId,
          "viewLeaderboard",
          leagueId
        );

      if (!access.allowed) {
        return json({
          success: false,
          error: "Access denied: " + access.reason,
          gameId: gameId
        });
      }

      const filteredLeaderboard =
        filterLeaderboardRowsForLeague_(
          leaderboard,
          gameId,
          access.leagueId || leagueId
        );

      return json({
        success: true,
        gameId: gameId,
        leagueId: access.leagueId || leagueId || "",
        leagueName: access.leagueName || "",
        leaderboard: filteredLeaderboard,
        updatedAt: new Date().toISOString()
      });

    }

    /* =========================
       LIVE RESULTS / LIVE SCORING
    ========================= */

    if (action === "liveLeaderboard") {

      const access =
        userCanAccessGameFeature_(
          params.username || "",
          gameId,
          "viewLeaderboard",
          leagueId
        );

      if (!access.allowed) {
        return json({
          success: false,
          error: "Access denied: " + access.reason,
          gameId: gameId
        });
      }

      const liveRes =
        apiGetLiveLeaderboard({
          gameId:
            gameId
        });

      if (
        liveRes &&
        Array.isArray(liveRes.leaderboard)
      ) {
        liveRes.leaderboard =
          filterLeaderboardRowsForLeague_(
            liveRes.leaderboard,
            gameId,
            access.leagueId || leagueId
          );
      }

      if (liveRes) {
        liveRes.leagueId = access.leagueId || leagueId || "";
        liveRes.leagueName = access.leagueName || "";
      }

      return json(liveRes);

    }

    if (action === "liveResults") {

      const access =
        userCanAccessGameFeature_(
          params.username || "",
          gameId,
          "viewResults",
          leagueId
        );

      if (!access.allowed) {
        return json({
          success: false,
          error: "Access denied: " + access.reason
        });
      }

      return json(
        apiGetLiveResults({
          gameId:
            gameId
        })
      );

    }

    if (action === "liveGameState") {

      const access =
        userCanAccessGameFeature_(
          params.username || "",
          gameId,
          "viewGame",
          leagueId
        );

      if (!access.allowed) {
        return json({
          success: false,
          error: "Access denied: " + access.reason
        });
      }

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

      const access =
        userCanAccessGameFeature_(
          params.username,
          gameId,
          "viewLeaderboard",
          leagueId
        );

      if (!access.allowed) {
        return json({
          success: false,
          error: "Access denied: " + access.reason
        });
      }

      return json(
        getUserBreakdown(
          params.username,
          gameId
        )
      );

    }

    /* =========================
   COMPARE USER PICKS
========================= */

if (action === "compareUserPicks") {

  const access =
    userCanAccessGameFeature_(
      params.username,
      gameId,
      "comparePicks",
      leagueId
    );

  if (!access.allowed) {
    return json({
      success: false,
      error: "Access denied: " + access.reason
    });
  }

  return json(
    apiCompareUserPicks({
      username:
        params.username,

      otherUsername:
        params.otherUsername ||
        params.targetUsername,

      gameId:
        gameId,

      leagueId:
        access.leagueId || leagueId
    })
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
    // BETTING PAGE PAYLOAD
    // One-call wager page load: options + user bets + leaderboard.
    // =========================

    if (action === "getBettingPagePayload") {

      const access =
        userCanAccessGameFeature_(
          params.username || "",
          gameId,
          "makeWagers",
          leagueId
        );

      if (!access.allowed) {
        return json({
          success: false,
          error: "Access denied: " + access.reason
        });
      }

      return json(
        apiGetBettingPagePayload({
          username:
            params.username,
          gameId:
            gameId,
          offset:
            params.offset,
          limit:
            params.limit,
          includeSummary:
            params.includeSummary,
          includeLeaderboard:
            params.includeLeaderboard,
          leagueId:
            leagueId
        })
      );

    }

        // =========================
    // BETTING OPTIONS
    // =========================

    if (action === "getBettingOptions") {

      const access =
        userCanAccessGameFeature_(
          params.username || "",
          gameId,
          "makeWagers",
          leagueId
        );

      if (!access.allowed) {
        return json({
          success: false,
          error: "Access denied: " + access.reason
        });
      }

      return json(
        getBettingOptions(
          gameId
        )
      );

    }

    // =========================
    // ADMIN: UNIVERSAL QUESTION SYSTEM
    // =========================

    if (action === "adminSetupUniversalQuestionSystem") {

      return json(
        apiAdminSetupUniversalQuestionSystem({
          username: params.username,
          token: params.token
        })
      );

    }

    // =========================
    // ADMIN: RACING WAGERS
    // =========================

    if (action === "adminSetupRacingWagerSystem") {

      return json(
        apiAdminSetupRacingWagerSystem({
          username: params.username,
          token: params.token
        })
      );

    }

    if (action === "adminCreateRacingWager") {

      return json(
        apiAdminCreateRacingWager({
          username: params.username,
          token: params.token,
          awardsGameId: params.awardsGameId || gameId,
          gameId: params.gameId,
          racingGameId: params.racingGameId || params.sportsGameId,
          sportsGameId: params.sportsGameId || params.racingGameId,
          espnEventId: params.espnEventId,
          league: params.league || params.racingLeague,
          racingLeague: params.racingLeague || params.league,
          racingMarket: params.racingMarket || params.market,
          market: params.market || params.racingMarket,
          categoryId: params.categoryId,
          categoryName: params.categoryName,
          raceName: params.raceName,
          oddsMode: params.oddsMode,
          oddsByDriverJson: params.oddsByDriverJson
        })
      );

    }

    if (action === "adminRefreshRacingWagerScores") {

      return json(
        apiAdminRefreshRacingWagerScores({
          username: params.username,
          token: params.token,
          awardsGameId: params.awardsGameId || gameId,
          gameId: params.gameId
        })
      );

    }

    if (action === "adminSettleRacingWagers") {

      return json(
        apiAdminSettleRacingWagers({
          username: params.username,
          token: params.token,
          awardsGameId: params.awardsGameId || gameId,
          gameId: params.gameId,
          force: params.force
        })
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

        gameId:
          params.gameId,

        sportsGameId:
          params.sportsGameId,

        espnEventId:
          params.espnEventId,

        wagerMarket:
          params.wagerMarket ||
          params.market,

        oddsMode:
          params.oddsMode,

        awayLine:
          params.awayLine,

        homeLine:
          params.homeLine,

        totalPoints:
          params.totalPoints,

        awayOdds:
          params.awayOdds,

        homeOdds:
          params.homeOdds,

        drawOdds:
          params.drawOdds,

        overOdds:
          params.overOdds,
  
        underOdds:
          params.underOdds,

        autoOdds:
         params.autoOdds

      })
    );

  }


    if (action === "adminCreateSportsWagersBulk") {

      return json(
        apiAdminCreateSportsWagersBulk({

          username:
            params.username,

          token:
            params.token,

          awardsGameId:
            params.awardsGameId ||
            gameId,

          gameId:
            params.gameId,

          selectedGamesJson:
            params.selectedGamesJson ||
            params.selectedGames,

          wagerMarket:
            params.wagerMarket ||
            params.market,

          market:
            params.market ||
            params.wagerMarket,

          oddsMode:
            params.oddsMode,

          awayLine:
            params.awayLine,

          homeLine:
            params.homeLine,

          totalPoints:
            params.totalPoints,

          awayOdds:
            params.awayOdds,

          homeOdds:
            params.homeOdds,

          drawOdds:
            params.drawOdds,

          overOdds:
            params.overOdds,

          underOdds:
            params.underOdds,

          autoOdds:
            params.autoOdds

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

    if (action === "adminAutoSetSportsWagerOdds") {

      return json(
        apiAdminAutoSetSportsWagerOdds({
          username:
            params.username,

          token:
            params.token,

          awardsGameId:
            params.awardsGameId ||
            gameId,

          force:
            params.force,

          oddsMode:
            params.oddsMode ||
            params.mode
        })
      );

    }

    // =========================
// ADMIN: SPORTS CONTROL BRIDGE
// =========================

if (action === "adminSetupSportsControls") {

  return json(
    apiAdminSetupSportsControls({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminGetSportsControlDashboard") {

  return json(
    apiAdminGetSportsControlDashboard({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminGetSportsLeagueSettings") {

  return json(
    apiAdminGetSportsLeagueSettings({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminUpdateSportsLeagueSetting") {

  return json(
    apiAdminUpdateSportsLeagueSetting({
      username:
        params.username,

      token:
        params.token,

      sport:
        params.sport,

      league:
        params.league,

      enabled:
        params.enabled,

      pollPreGameMinutes:
        params.pollPreGameMinutes,

      pollLiveMinutes:
        params.pollLiveMinutes,

      pollFinalMinutes:
        params.pollFinalMinutes,

      savePeriodSnapshots:
        params.savePeriodSnapshots,

      espnScoreboardUrl:
        params.espnScoreboardUrl
    })
  );

}

if (action === "adminInstallSportsScoresTrigger") {

  return json(
    apiAdminInstallSportsScoresTrigger({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminRemoveSportsScoresTrigger") {

  return json(
    apiAdminRemoveSportsScoresTrigger({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminCreateSportsSeasonJobs") {

  return json(
    apiAdminCreateSportsSeasonJobs({
      username:
        params.username,

      token:
        params.token,

      startDate:
        params.startDate,

      endDate:
        params.endDate,

      batchDays:
        params.batchDays
    })
  );

}

if (action === "adminRunSportsSeasonBatch") {

  return json(
    apiAdminRunSportsSeasonBatch({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminUpdateSportsSeasonJobStatus") {

  return json(
    apiAdminUpdateSportsSeasonJobStatus({
      username:
        params.username,

      token:
        params.token,

      jobId:
        params.jobId,

      league:
        params.league,

      status:
        params.status
    })
  );

}

if (action === "adminInstallSportsSeasonBatchTrigger") {

  return json(
    apiAdminInstallSportsSeasonBatchTrigger({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminRemoveSportsSeasonBatchTrigger") {

  return json(
    apiAdminRemoveSportsSeasonBatchTrigger({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminGetSportsOddsSettings") {

  return json(
    apiAdminGetSportsOddsSettings({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminUpdateSportsOddsSetting") {

  return json(
    apiAdminUpdateSportsOddsSetting({
      username:
        params.username,

      token:
        params.token,

      league:
        params.league,

      oddsEnabled:
        params.oddsEnabled,

      autoRefreshEnabled:
        params.autoRefreshEnabled,

      manualRefreshEnabled:
        params.manualRefreshEnabled,

      maxRefreshesPerDay:
        params.maxRefreshesPerDay,

      monthlyBudget:
        params.monthlyBudget,

      stopAtMonthlyCalls:
        params.stopAtMonthlyCalls,

      notes:
        params.notes
    })
  );

}

if (action === "adminRefreshSportsOddsLeague") {

  return json(
    apiAdminRefreshSportsOddsLeague({
      username:
        params.username,

      token:
        params.token,

      league:
        params.league
    })
  );

}

if (action === "adminRunSportsOddsHybridRefresh") {

  return json(
    apiAdminRunSportsOddsHybridRefresh({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminInstallSportsOddsHybridTrigger") {

  return json(
    apiAdminInstallSportsOddsHybridTrigger({
      username:
        params.username,

      token:
        params.token,

      hour:
        params.hour
    })
  );

}

if (action === "adminRemoveSportsOddsHybridTrigger") {

  return json(
    apiAdminRemoveSportsOddsHybridTrigger({
      username:
        params.username,

      token:
        params.token
    })
  );

}

    // =========================
    // MY BETS
    // =========================

    if (action === "getMyBets") {

      const access =
        userCanAccessGameFeature_(
          e.parameter.username,
          gameId,
          "makeWagers",
          leagueId
        );

      if (!access.allowed) {
        return json({
          success: false,
          error: "Access denied: " + access.reason
        });
      }

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

      const access =
        userCanAccessGameFeature_(
          e.parameter.username,
          gameId,
          "makeWagers",
          leagueId
        );

      if (!access.allowed) {
        return json({
          success: false,
          error: "Access denied: " + access.reason
        });
      }

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

    if (action === "removeBet") {

      const access =
        userCanAccessGameFeature_(
          e.parameter.username,
          gameId,
          "makeWagers",
          leagueId
        );

      if (!access.allowed) {
        return json({
          success: false,
          error: "Access denied: " + access.reason
        });
      }

      return json(
        removeBet({
          username:
            e.parameter.username,

          gameId:
            gameId,

          categoryId:
            e.parameter.categoryId
        })
      );

    }

    // =========================
    // BETTING LEADERBOARD
    // =========================

    if (action === "bettingLeaderboard") {

      const access =
        userCanAccessGameFeature_(
          params.username || "",
          gameId,
          "viewWagerLeaderboard",
          leagueId
        );

      if (!access.allowed) {
        return json({
          success: false,
          error: "Access denied: " + access.reason,
          gameId: gameId
        });
      }

      const bettingRows =
        filterLeaderboardRowsForLeague_(
          getBettingLeaderboardData(
            gameId
          ),
          gameId,
          access.leagueId || leagueId
        );

      return json({
        success: true,
        gameId: gameId,
        leagueId: access.leagueId || leagueId || "",
        leagueName: access.leagueName || "",
        leaderboard: bettingRows
      });

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

  const callback =
    String(
      typeof API_JSON_CALLBACK_ !== "undefined"
        ? API_JSON_CALLBACK_
        : ""
    ).trim();

  if (callback) {

    const safeCallback =
      /^[A-Za-z_$][0-9A-Za-z_$]*(\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(callback)
        ? callback
        : "";

    if (safeCallback) {

      return ContentService
        .createTextOutput(
          safeCallback + "(" + JSON.stringify(obj) + ");"
        )
        .setMimeType(
          ContentService.MimeType.JAVASCRIPT
        );

    }

  }

  return ContentService
    .createTextOutput(
      JSON.stringify(obj)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}