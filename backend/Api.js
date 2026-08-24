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

    apiSecurityAuthorizeRequest_(
      action,
      body
    );

    // =========================
    // AUTHENTICATION WRITES
    // Sensitive credentials never belong in GET/query strings.
    // =========================

    if (action === "login") {
      return json(loginUser(
        body.username,
        body.pin,
        body.rememberMe,
        body.deviceId,
        body.deviceLabel
      ));
    }

    if (action === "logout") {
      return json(logoutSessionToken(body.token));
    }

    if (action === "signup") {
      return json(createUser(
        body.username,
        body.realName,
        body.pin,
        body.email,
        body.phone,
        body.contactMethod
      ));
    }

    if (action === "requestPinReset") {
      return json(requestPinReset(body.identifier));
    }

    if (action === "resetPin") {
      return json(resetPin(
        body.identifier,
        body.resetCode,
        body.newPin
      ));
    }

    // =========================
    // PLAYER WRITES
    // =========================

    if (action === "saveEditableProfile") {
      return json(apiSaveEditableProfile(body));
    }

    if (action === "setGameProfilePromptChoice") {
      validateUserSession_(body.username, body.token);
      return json(apiSetGameProfilePromptChoice(body));
    }

    if (action === "saveNotificationPreferences") {
      return json(apiSaveNotificationPreferences(body));
    }

    if (action === "markNotificationRead") {
      return json(apiMarkNotificationRead(body));
    }

    if (action === "markAllNotificationsRead") {
      return json(apiMarkAllNotificationsRead(body));
    }

    if (action === "registerPushSubscription") {
      return json(apiRegisterPushSubscription(body));
    }

    if (action === "removePushSubscription") {
      return json(apiRemovePushSubscription(body));
    }

    if (action === "getPushSubscriptionSummary") {
      return json(
        apiGetPushSubscriptionSummary(
          body.token,
          body.deviceId,
          body.endpoint
        )
      );
    }

    if (action === "adminSavePushGatewayConfig") {
      return json(apiAdminSavePushGatewayConfig(body));
    }

    if (action === "adminSavePushSystemMode") {
      return json(apiAdminSavePushSystemMode(body));
    }

    if (action === "adminSaveGameNotificationSettings") {
      return json(apiAdminSaveGameNotificationSettings(body));
    }

    if (action === "adminSendPushNotification") {
      return json(apiAdminSendPushNotification(body));
    }

    if (action === "savePicksBatch") {
      const postGameId = body.gameId || getDefaultGameId();
      const postLeagueId = typeof normalizeLeagueId_ === "function"
        ? normalizeLeagueId_(body.leagueId || body.activeLeagueId || "")
        : String(body.leagueId || body.activeLeagueId || "").trim();
      const access = userCanAccessGameFeature_(body.username, postGameId, "makePicks", postLeagueId);
      if (!access.allowed) return json({ success: false, error: "Access denied: " + access.reason });
      return json(savePicksBatch({
        username: body.username,
        gameId: postGameId,
        picks: Array.isArray(body.picks) ? body.picks : []
      }));
    }

    if (action === "saveConfidencePicksBatch") {
      const postGameId = body.gameId || getDefaultGameId();
      const postLeagueId = typeof normalizeLeagueId_ === "function"
        ? normalizeLeagueId_(body.leagueId || body.activeLeagueId || "")
        : String(body.leagueId || body.activeLeagueId || "").trim();
      const access = userCanAccessGameFeature_(
        body.username,
        postGameId,
        "makePicks",
        postLeagueId
      );
      if (!access.allowed) {
        return json({ success: false, error: "Access denied: " + access.reason });
      }
      return json(saveConfidencePicksBatch({
        username: body.username,
        gameId: postGameId,
        picks: Array.isArray(body.picks) ? body.picks : []
      }));
    }

    if (action === "saveRanking") {
      const postGameId = body.gameId || getDefaultGameId();
      const postLeagueId = typeof normalizeLeagueId_ === "function"
        ? normalizeLeagueId_(body.leagueId || body.activeLeagueId || "")
        : String(body.leagueId || body.activeLeagueId || "").trim();
      const access = userCanAccessGameFeature_(body.username, postGameId, "makePicks", postLeagueId);
      if (!access.allowed) return json({ success: false, error: "Access denied: " + access.reason });
      return json(saveRankingBallot_({
        username: body.username,
        gameId: postGameId,
        categoryId: body.categoryId,
        rankings: Array.isArray(body.rankings) ? body.rankings : []
      }));
    }

    if (action === "saveSurvivorPick") {
      const postGameId = body.gameId || getDefaultGameId();
      const postLeagueId = typeof normalizeLeagueId_ === "function"
        ? normalizeLeagueId_(body.leagueId || body.activeLeagueId || "")
        : String(body.leagueId || body.activeLeagueId || "").trim();
      const access = userCanAccessGameFeature_(body.username, postGameId, "makePicks", postLeagueId);
      if (!access.allowed) return json({ success: false, error: "Access denied: " + access.reason });
      return json(saveSurvivorPick_({
        username: body.username,
        gameId: postGameId,
        categoryId: body.categoryId,
        nomineeId: body.nomineeId
      }));
    }

    if (action === "adminSaveRankingResults") {
      return json(adminSaveRankingResults_({
        gameId: body.gameId,
        categoryId: body.categoryId,
        rankings: Array.isArray(body.rankings) ? body.rankings : (Array.isArray(body.order) ? body.order : [])
      }));
    }

    if (action === "savePick") {
      const postGameId = body.gameId || getDefaultGameId();
      const postLeagueId = typeof normalizeLeagueId_ === "function"
        ? normalizeLeagueId_(body.leagueId || body.activeLeagueId || "")
        : String(body.leagueId || body.activeLeagueId || "").trim();
      const access = userCanAccessGameFeature_(
        body.username,
        postGameId,
        "makePicks",
        postLeagueId
      );
      if (!access.allowed) {
        return json({ success: false, error: "Access denied: " + access.reason });
      }
      return json(savePick({
        username: body.username,
        gameId: postGameId,
        categoryId: body.categoryId,
        nomineeId: body.nomineeId,
        confidencePoints: body.confidencePoints,
        stakePoints: body.stakePoints
      }));
    }

    if (action === "saveBet") {
      const postGameId = body.gameId || getDefaultGameId();
      const postLeagueId = typeof normalizeLeagueId_ === "function"
        ? normalizeLeagueId_(body.leagueId || body.activeLeagueId || "")
        : String(body.leagueId || body.activeLeagueId || "").trim();
      const access = userCanAccessGameFeature_(
        body.username,
        postGameId,
        "makeWagers",
        postLeagueId
      );
      if (!access.allowed) {
        return json({ success: false, error: "Access denied: " + access.reason });
      }
      return json(saveBet({
        username: body.username,
        gameId: postGameId,
        categoryId: body.categoryId,
        nomineeId: body.nomineeId,
        betAmount: body.betAmount
      }));
    }

    if (action === "removeBet") {
      const postGameId = body.gameId || getDefaultGameId();
      const postLeagueId = typeof normalizeLeagueId_ === "function"
        ? normalizeLeagueId_(body.leagueId || body.activeLeagueId || "")
        : String(body.leagueId || body.activeLeagueId || "").trim();
      const access = userCanAccessGameFeature_(
        body.username,
        postGameId,
        "makeWagers",
        postLeagueId
      );
      if (!access.allowed) {
        return json({ success: false, error: "Access denied: " + access.reason });
      }
      return json(removeBet({
        username: body.username,
        gameId: postGameId,
        categoryId: body.categoryId
      }));
    }

    if (action === "saveSeasonAnchorPick") {
      const postGameId = body.gameId || getDefaultGameId();
      const postLeagueId = typeof normalizeLeagueId_ === "function"
        ? normalizeLeagueId_(body.leagueId || body.activeLeagueId || "")
        : String(body.leagueId || body.activeLeagueId || "").trim();
      const access = userCanAccessGameFeature_(
        body.username,
        postGameId,
        "makePicks",
        postLeagueId
      );
      if (!access.allowed) {
        return json({ success: false, error: "Access denied: " + access.reason });
      }
      return json(apiSaveSeasonAnchorPick({
        username: body.username,
        token: body.token,
        gameId: postGameId,
        entityId: body.entityId
      }));
    }

    if (action === "saveUserProfile") {
      return json(saveUserProfile({
        username: body.username,
        gameId: body.gameId || getDefaultGameId(),
        displayName: body.displayName,
        avatar: body.avatar,
        themeColor: body.themeColor
      }));
    }

    if (action === "setNotificationPreference") {
      return json(setNotificationPreference(
        body.token,
        body.contactMethod,
        body.email,
        body.phone
      ));
    }

    // =========================
    // LEAGUE / ACCESS WRITES
    // =========================

    if (action === "createLeague") {
      return json(apiCreateLeague({
        username: body.username,
        token: body.token,
        leagueId: body.leagueId,
        leagueName: body.leagueName || body.name,
        gameId: body.gameId || "",
        gameIds: body.gameIds,
        visibility: body.visibility,
        accessMode: body.accessMode || body.gameAccessMode,
        pickScope: body.pickScope,
        joinMode: body.joinMode
      }));
    }

    if (action === "addLeagueMember") {
      return json(apiAddLeagueMember({
        username: body.username,
        token: body.token,
        leagueId: body.leagueId,
        memberUsername: body.memberUsername || body.targetUsername,
        role: body.role
      }));
    }

    if (action === "removeLeagueMember") {
      return json(apiRemoveLeagueMember({
        username: body.username,
        token: body.token,
        leagueId: body.leagueId,
        memberUsername: body.memberUsername || body.targetUsername
      }));
    }

    if (action === "assignGameToLeague") {
      return json(apiAssignGameToLeague({
        username: body.username,
        token: body.token,
        leagueId: body.leagueId,
        gameId: body.gameId || "",
        accessMode: body.accessMode || body.gameAccessMode,
        pickScope: body.pickScope
      }));
    }

    if (action === "saveLeagueFeatureAccess") {
      return json(apiSaveLeagueFeatureAccess({
        username: body.username,
        token: body.token,
        leagueId: body.leagueId,
        gameId: body.gameId || "",
        feature: body.feature,
        accessRule: body.accessRule,
        rolesAllowed: body.rolesAllowed,
        usersAllowed: body.usersAllowed,
        usersBlocked: body.usersBlocked,
        active: body.active
      }));
    }

    if (action === "setGameLeagueVisibility") {
      return json(apiSetGameLeagueVisibility({
        username: body.username,
        token: body.token,
        gameId: body.gameId || "",
        leagueId: body.leagueId,
        leagueIds: body.leagueIds,
        accessMode: body.accessMode || body.mode,
        pickScope: body.pickScope,
        replace: body.replace
      }));
    }

    if (action === "removeGameFromLeague") {
      return json(apiRemoveGameFromLeague({
        username: body.username,
        token: body.token,
        leagueId: body.leagueId,
        gameId: body.gameId || ""
      }));
    }

    if (action === "updateLeague") {
      return json(apiUpdateLeague({
        username: body.username,
        token: body.token,
        leagueId: body.leagueId,
        leagueName: body.leagueName || body.name,
        visibility: body.visibility,
        accessMode: body.accessMode || body.gameAccessMode,
        pickScope: body.pickScope,
        gameIds: body.gameIds,
        joinMode: body.joinMode,
        active: body.active,
        notes: body.notes
      }));
    }

    // =========================
    // PROFILE AVATAR UPLOAD
    // =========================

    if (action === "uploadProfileAvatar") {

      return json(
        apiUploadProfileAvatar(body)
      );

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

    if (action === "adminSetQuestionOrder") {
      return json(adminSetQuestionOrder(body));
    }

    // =========================
    // APPEARANCE PACK / THEME FOUNDATION
    // =========================

    if (action === "adminSetupAppearanceSystem") {
      return json(apiAdminSetupAppearanceSystem(body));
    }

    if (action === "adminSaveAppearanceImagePack") {
      return json(apiAdminSaveAppearanceImagePack(body));
    }

    if (action === "adminSaveAppearanceImagePackItem") {
      return json(apiAdminSaveAppearanceImagePackItem(body));
    }

    if (action === "adminDuplicateAppearanceImagePack") {
      return json(apiAdminDuplicateAppearanceImagePack(body));
    }

    if (action === "adminSaveAppearanceHubSetting") {
      return json(apiAdminSaveAppearanceHubSetting(body));
    }

    if (action === "adminSaveAppearanceThemePack") {
      return json(apiAdminSaveAppearanceThemePack(body));
    }

    if (action === "adminSaveGameAppearance") {
      return json(apiAdminSaveGameAppearance(body));
    }

    if (action === "adminSaveAppearanceOverride") {
      return json(apiAdminSaveAppearanceOverride(body));
    }

    // =========================
    // SPORTS CONFIDENCE BUILDER POST TRANSPORT
    // Keeps the full weekly selection out of JSONP/query-string URLs.
    // =========================

    if (action === "adminGetSportsConfidenceGames") {
      return json(apiAdminGetSportsConfidenceGames(body));
    }

    if (action === "adminGetSportsConfidenceBuilderScores") {
      return json(apiAdminGetSportsConfidenceBuilderScores(body));
    }

    if (action === "adminCreateSportsConfidenceQuestionsBulk") {
      return json(apiAdminCreateSportsConfidenceQuestionsBulk(body));
    }

    // =========================
    // AWARDS MANAGER WRITES
    // =========================
    if (action === "adminAwardsCreateQuestionFromMarket") {
      return json(apiAdminAwardsCreateQuestionFromMarket(body));
    }

    if (action === "adminAwardsLinkMarket") {
      return json(apiAdminAwardsLinkMarket(body));
    }

    // =========================
    // REALITY TV LARGE WRITES
    // =========================

    if (action === "adminCreateRealityTvSeason") {
      return json(apiAdminCreateRealityTvSeason(body));
    }

    if (action === "adminBulkAddRealityTvContestants") {
      return json(apiAdminBulkAddRealityTvContestants(body));
    }

    if (action === "adminPrepareRealityCastDraft") {
      return json(apiAdminPrepareRealityCastDraft(body));
    }
    if (action === "adminPreviewRealityCastDraft") {
      return json(apiAdminPreviewRealityCastDraft(body));
    }
    if (action === "adminLoadRealityCastDraft") {
      return json(apiAdminLoadRealityCastDraft(body));
    }
    if (action === "adminBulkUpdateRealityTvContestantGroups") {
      return json(apiAdminBulkUpdateRealityTvContestantGroups(body));
    }
    if (action === "adminSetRealityTvIndividualPlay") {
      return json(apiAdminSetRealityTvIndividualPlay(body));
    }
    if (action === "adminPrepareRealityCastImport") {
      return json(apiAdminPrepareRealityCastImport(body));
    }
    if (action === "adminPreviewRealityCastImport") {
      return json(apiAdminPreviewRealityCastImport(body));
    }
    if (action === "adminImportRealityCastImport") {
      return json(apiAdminImportRealityCastImport(body));
    }

    if (action === "adminUpdateRealityTvQuestionPack") {
      return json(apiAdminUpdateRealityTvQuestionPack(body));
    }

    if (action === "adminApplyRealityTvEpisodeQuestionPlan") {
      return json(apiAdminApplyRealityTvEpisodeQuestionPlan(body));
    }

    if (action === "adminAddRealityTvCustomQuestionTemplate") {
      return json(apiAdminAddRealityTvCustomQuestionTemplate(body));
    }

    if (action === "adminDeleteRealityTvCustomQuestionTemplate") {
      return json(apiAdminDeleteRealityTvCustomQuestionTemplate(body));
    }

    if (action === "adminFinalizeRealityTvEpisode") {
      return json(apiAdminFinalizeRealityTvEpisode(body));
    }

    if (action === "adminResetRealityTvApproval") {
      return json(apiAdminResetRealityTvApproval(body));
    }

    if (action === "adminSaveRealityTvEpisodeVote") {
      return json(apiAdminSaveRealityTvEpisodeVote(body));
    }

    if (action === "adminSaveRealityTvEpisodeVotesBulk") {
      return json(apiAdminSaveRealityTvEpisodeVotesBulk(body));
    }

    if (action === "adminDeleteRealityTvEpisodeVote") {
      return json(apiAdminDeleteRealityTvEpisodeVote(body));
    }

    if (action === "adminUpdateRealityTvEpisodeSchedule") {
      return json(apiAdminUpdateRealityTvEpisodeSchedule(body));
    }

    /* TEAM FANTASY v1.2.18j POST ROUTES */
    if (action === "saveTeamFantasyPick") return json(apiSaveTeamFantasyPick(body));
    if (action === "randomTeamFantasyPicks") return json(apiRandomTeamFantasyPicks(body));
    if (action === "autoPickTeamFantasy") return json(apiAutoPickTeamFantasy(body));
    if (action === "adminSaveTeamFantasySettings") return json(apiAdminSaveTeamFantasySettings(body));
    if (action === "adminSaveTeamFantasyRules") return json(apiAdminSaveTeamFantasyRules(body));
    if (action === "adminCreateTeamFantasyLeague") return json(apiAdminCreateTeamFantasyLeague(body));
    if (action === "adminAssignTeamFantasyLeagueMember") return json(apiAdminAssignTeamFantasyLeagueMember(body));
    if (action === "adminRunTeamFantasySync") return json(apiAdminRunTeamFantasySync(body));
    if (action === "adminInstallTeamFantasySyncTrigger") return json(apiAdminInstallTeamFantasySyncTrigger(body));
    if (action === "adminSendTeamFantasyReminder") return json(apiAdminSendTeamFantasyReminder(body));

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

    apiSecurityAuthorizeRequest_(
      action,
      params
    );

    if (
      action === "login" ||
      action === "logout" ||
      action === "signup" ||
      action === "requestPinReset" ||
      action === "resetPin" ||
      action === "saveEditableProfile" ||
      action === "saveUserProfile" ||
      action === "uploadProfileAvatar" ||
      action === "savePick" ||
      action === "savePicksBatch" ||
      action === "saveRanking" ||
      action === "saveSurvivorPick" ||
      action === "adminSaveRankingResults" ||
      action === "saveConfidencePicksBatch" ||
      action === "saveBet" ||
      action === "removeBet" ||
      action === "saveSeasonAnchorPick" ||
      action === "setNotificationPreference" ||
      action === "saveNotificationPreferences" ||
      action === "markNotificationRead" ||
      action === "markAllNotificationsRead" ||
      action === "registerPushSubscription" ||
      action === "removePushSubscription" ||
      action === "adminSavePushGatewayConfig" ||
      action === "adminSavePushSystemMode" ||
      action === "adminSaveGameNotificationSettings" ||
      action === "adminSendPushNotification" ||
      /* TEAM FANTASY v1.2.18j POST-ONLY ACTIONS */
      action === "saveTeamFantasyPick" ||
      action === "randomTeamFantasyPicks" ||
      action === "autoPickTeamFantasy" ||
      action === "adminSaveTeamFantasySettings" ||
      action === "adminSaveTeamFantasyRules" ||
      action === "adminCreateTeamFantasyLeague" ||
      action === "adminAssignTeamFantasyLeagueMember" ||
      action === "adminRunTeamFantasySync" ||
      action === "adminInstallTeamFantasySyncTrigger" ||
      action === "adminSendTeamFantasyReminder" ||
      action === "createLeague" ||
      action === "addLeagueMember" ||
      action === "removeLeagueMember" ||
      action === "assignGameToLeague" ||
      action === "saveLeagueFeatureAccess" ||
      action === "setGameLeagueVisibility" ||
      action === "removeGameFromLeague" ||
      action === "updateLeague"
    ) {
      return json({
        success: false,
        error: "This action requires POST."
      });
    }

    /* =========================
       REQUEST CLASSIFICATION
       All admin-prefixed actions are classified centrally.
       League-management actions also skip the default-game fallback
       because their game scope is optional or explicitly supplied.
    ========================= */

    const isAdminAction =
      apiSecurityIsAdminAction_(action);

    const skipDefaultGameActions = {
      getMyLeagues: true,
      createLeague: true,
      addLeagueMember: true,
      removeLeagueMember: true,
      assignGameToLeague: true,
      saveLeagueFeatureAccess: true,
      getLeagueMembers: true,
      setGameLeagueVisibility: true,
      removeGameFromLeague: true,
      updateLeague: true
    };

    const skipDefaultGameId =
      isAdminAction ||
      skipDefaultGameActions[action] === true;

    /* =========================
       GAME ID
    ========================= */

    const gameId =
      params.gameId ||
      (
        skipDefaultGameId
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

    if (action === "getReusableProfiles") {
      return json(
        apiGetReusableProfiles(
          params.username
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

      if (action === "adminGetSportsConfidenceGames") {

        return json(
          apiAdminGetSportsConfidenceGames(
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
            leagueId,
          accessMode:
            params.accessMode || params.gameAccessMode,
          pickScope:
            params.pickScope
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
          gameIds:
            params.gameIds,
          visibility:
            params.visibility,
          accessMode:
            params.accessMode || params.gameAccessMode,
          pickScope:
            params.pickScope,
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
            leagueId,
          accessMode:
            params.accessMode || params.gameAccessMode,
          pickScope:
            params.pickScope
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


    if (action === "adminGetLeagueAccessDashboard") {

      return json(
        apiAdminGetLeagueAccessDashboard({
          username:
            params.username,
          token:
            params.token
        })
      );

    }

    if (action === "setGameLeagueVisibility") {

      return json(
        apiSetGameLeagueVisibility({
          username:
            params.username,
          token:
            params.token,
          gameId:
            gameId,
          leagueId:
            leagueId,
          leagueIds:
            params.leagueIds,
          accessMode:
            params.accessMode || params.mode,
          pickScope:
            params.pickScope,
          replace:
            params.replace
        })
      );

    }

    if (action === "removeGameFromLeague") {

      return json(
        apiRemoveGameFromLeague({
          username:
            params.username,
          token:
            params.token,
          leagueId:
            leagueId,
          gameId:
            gameId
        })
      );

    }

    if (action === "updateLeague") {

      return json(
        apiUpdateLeague({
          username:
            params.username,
          token:
            params.token,
          leagueId:
            leagueId,
          leagueName:
            params.leagueName || params.name,
          visibility:
            params.visibility,
          accessMode:
            params.accessMode || params.gameAccessMode,
          pickScope:
            params.pickScope,
          gameIds:
            params.gameIds,
          joinMode:
            params.joinMode,
          active:
            params.active,
          notes:
            params.notes
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

    if (action === "adminSetupAppearanceSystem") {
      return json(apiAdminSetupAppearanceSystem(params));
    }

    if (action === "adminGetAppearanceDashboard") {
      return json(apiAdminGetAppearanceDashboard(params));
    }

    if (action === "getGameAppearance") {
      return json(apiGetGameAppearance({
        gameId: params.gameId || gameId
      }));
    }

    // Appearance metadata writes are intentionally allowed through the direct
    // Apps Script GET/JSONP transport. These payloads are small and the
    // frontend uses this path to avoid upload-proxy HTML/time-out responses.
    if (action === "adminSaveAppearanceImagePack") {
      return json(apiAdminSaveAppearanceImagePack(params));
    }

    if (action === "adminSaveAppearanceImagePackItem") {
      return json(apiAdminSaveAppearanceImagePackItem(params));
    }

    if (action === "adminDuplicateAppearanceImagePack") {
      return json(apiAdminDuplicateAppearanceImagePack(params));
    }

    if (action === "adminSaveAppearanceHubSetting") {
      return json(apiAdminSaveAppearanceHubSetting(params));
    }

    if (action === "adminSaveAppearanceThemePack") {
      return json(apiAdminSaveAppearanceThemePack(params));
    }

    if (action === "adminSaveGameAppearance") {
      return json(apiAdminSaveGameAppearance(params));
    }

    if (action === "adminSaveAppearanceOverride") {
      return json(apiAdminSaveAppearanceOverride(params));
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
       ADMIN: AWARDS MANAGER
    ========================= */

    if (action === "adminAwardsGetDashboard") {
      return json(apiAdminAwardsGetDashboard(params));
    }

    if (action === "adminAwardsGetGameSetup") {
      return json(apiAdminAwardsGetGameSetup(params));
    }

    if (action === "adminAwardsSearchExternalMarkets") {
      return json(apiAdminAwardsSearchExternalMarkets(params));
    }

    if (action === "adminAwardsGetExternalEvent") {
      return json(apiAdminAwardsGetExternalEvent(params));
    }

    /* =========================
       ADMIN: REALITY TV SEASON MANAGER
    ========================= */

    if (action === "adminSetupRealityTvSystem") {
      return json(apiAdminSetupRealityTvSystem(params));
    }

    if (action === "adminConfigureRealityTvHub") {
      return json(apiAdminConfigureRealityTvHub(params));
    }

    if (action === "adminSetupExternalResultsBridge") {
      return json(apiAdminSetupExternalResultsBridge(params));
    }

    if (action === "adminGetExternalResultsBridgeHealth") {
      return json(apiAdminGetExternalResultsBridgeHealth(params));
    }

    if (action === "adminRunExternalResultsBridgeNow") {
      return json(apiAdminRunExternalResultsBridgeNow(params));
    }

    if (action === "adminRetryExternalResultsBridgeFailures") {
      return json(apiAdminRetryExternalResultsBridgeFailures(params));
    }

    if (action === "adminRequeueUnverifiedExternalResultsBridgeJobs") {
      return json(apiAdminRequeueUnverifiedExternalResultsBridgeJobs(params));
    }

    if (action === "adminGetExternalResultsInboxStatus") {
      return json(apiAdminGetExternalResultsInboxStatus(params));
    }

    if (action === "adminReconcileExternalResultsInbox") {
      return json(apiAdminReconcileExternalResultsInbox(params));
    }

    if (action === "adminValidateExternalResultsInbox") {
      return json(apiAdminValidateExternalResultsInbox(params));
    }

    if (action === "adminApplyExternalResultsInbox") {
      return json(apiAdminApplyExternalResultsInbox(params));
    }

    if (action === "adminRetryExternalResultsInboxErrors") {
      return json(apiAdminRetryExternalResultsInboxErrors(params));
    }

    if (action === "adminGetRealityTvDashboard") {
      return json(apiAdminGetRealityTvDashboard(params));
    }

    if (action === "adminGetRealityTvDashboardSummary") {
      return json(apiAdminGetRealityTvDashboardSummary(params));
    }

    if (action === "adminGetRealityTvSeasonDetails") {
      return json(apiAdminGetRealityTvSeasonDetails(params));
    }

    if (action === "adminSaveRealityTvGroups") {
      return json(apiAdminSaveRealityTvGroups(params));
    }

    if (action === "adminUpdateRealityTvContestantGroup") {
      return json(apiAdminUpdateRealityTvContestantGroup(params));
    }

    if (action === "adminRepairRealityTvSetup") {
      return json(apiAdminRepairRealityTvSetup(params));
    }

    if (action === "adminCreateRealityTvSeason") {
      return json(apiAdminCreateRealityTvSeason(params));
    }

    if (action === "adminAddRealityTvContestant") {
      return json(apiAdminAddRealityTvContestant(params));
    }

    if (action === "adminBulkAddRealityTvContestants") {
      return json(apiAdminBulkAddRealityTvContestants(params));
    }

    /* REALITY CAST FORWARD FIXES v1.2.18v2 */
    if (action === "adminPrepareRealityCastDraft") {
      return json(apiAdminPrepareRealityCastDraft(params));
    }
    if (action === "adminPreviewRealityCastDraft") {
      return json(apiAdminPreviewRealityCastDraft(params));
    }
    if (action === "adminLoadRealityCastDraft") {
      return json(apiAdminLoadRealityCastDraft(params));
    }
    if (action === "adminPrepareRealityCastImport") {
      return json(apiAdminPrepareRealityCastImport(params));
    }
    if (action === "adminPreviewRealityCastImport") {
      return json(apiAdminPreviewRealityCastImport(params));
    }
    if (action === "adminImportRealityCastImport") {
      return json(apiAdminImportRealityCastImport(params));
    }

    if (action === "adminSubmitRealityTvResult") {
      return json(apiAdminSubmitRealityTvResult(params));
    }

    if (action === "adminFinalizeRealityTvEpisode") {
      return json(apiAdminFinalizeRealityTvEpisode(params));
    }

    if (action === "adminApproveRealityTvResult") {
      return json(apiAdminApproveRealityTvResult(params));
    }

    if (action === "adminContinueRealityTvApproval") {
      return json(apiAdminContinueRealityTvApproval(params));
    }

    if (action === "adminGetRealityTvApprovalState") {
      return json(apiAdminGetRealityTvApprovalState(params));
    }

    if (action === "adminResetRealityTvApproval") {
      return json(apiAdminResetRealityTvApproval(params));
    }

    if (action === "adminRejectRealityTvResult") {
      return json(apiAdminRejectRealityTvResult(params));
    }

    if (action === "adminCreateNextRealityTvEpisode") {
      return json(apiAdminCreateNextRealityTvEpisode(params));
    }

    if (action === "adminUpdateRealityTvQuestionPack") {
      return json(apiAdminUpdateRealityTvQuestionPack(params));
    }

    if (action === "adminApplyRealityTvEpisodeQuestionPlan") {
      return json(apiAdminApplyRealityTvEpisodeQuestionPlan(params));
    }

    if (action === "adminAddRealityTvCustomQuestionTemplate") {
      return json(apiAdminAddRealityTvCustomQuestionTemplate(params));
    }

    if (action === "adminDeleteRealityTvCustomQuestionTemplate") {
      return json(apiAdminDeleteRealityTvCustomQuestionTemplate(params));
    }

    if (action === "adminBuildRealityTvEpisodeQuestions") {
      return json(apiAdminBuildRealityTvEpisodeQuestions(params));
    }

    if (action === "adminContinueRealityTvQuestionPackBuild") {
      return json(apiAdminContinueRealityTvQuestionPackBuild(params));
    }

    if (action === "adminRepairRealityTvQuestionPack") {
      return json(apiAdminRepairRealityTvQuestionPack(params));
    }

    if (action === "adminSubmitRealityTvQuestionResult") {
      return json(apiAdminSubmitRealityTvQuestionResult(params));
    }

    if (action === "adminApproveRealityTvQuestionResult") {
      return json(apiAdminApproveRealityTvQuestionResult(params));
    }

    if (action === "adminContinueRealityTvQuestionApproval") {
      return json(apiAdminContinueRealityTvQuestionApproval(params));
    }

    if (action === "adminRejectRealityTvQuestionResult") {
      return json(apiAdminRejectRealityTvQuestionResult(params));
    }

    if (action === "adminSaveRealityTvEpisodeVote") {
      return json(apiAdminSaveRealityTvEpisodeVote(params));
    }

    if (action === "adminSaveRealityTvEpisodeVotesBulk") {
      return json(apiAdminSaveRealityTvEpisodeVotesBulk(params));
    }

    if (action === "adminDeleteRealityTvEpisodeVote") {
      return json(apiAdminDeleteRealityTvEpisodeVote(params));
    }

    if (action === "adminUpdateRealityTvEpisodeSchedule") {
      return json(apiAdminUpdateRealityTvEpisodeSchedule(params));
    }

    if (action === "adminSaveSeasonAnchorSettings") {
      return json(apiAdminSaveSeasonAnchorSettings(params));
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

    if (action === "adminCloneCategory") {

      return json(
        adminCloneCategory(
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

    if (action === "adminReorderQuestion") {

      return json(
        adminReorderQuestion(
          params
        )
      );

    }

    if (action === "adminSetQuestionOrder") {

      return json(
        adminSetQuestionOrder(
          params
        )
      );

    }

    if (action === "adminBulkUpdateGameSetup") {

      return json(
        adminBulkUpdateGameSetup(
          params
        )
      );

    }

    if (action === "adminDeleteCategory") {

      return json(
        adminDeleteCategory(
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

    if (action === "adminBulkCreateNominees") {

      return json(
        adminBulkCreateNominees(
          params
        )
      );

    }

    if (action === "adminCloneNominee") {

      return json(
        adminCloneNominee(
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

    if (action === "adminDeleteNominee") {

      return json(
        adminDeleteNominee(
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

    if (action === "getNotificationPreferences") {
      return json(
        apiGetNotificationPreferences(
          e.parameter.token
        )
      );
    }

    if (action === "getUserNotifications") {
      return json(
        apiGetUserNotifications(
          e.parameter.token,
          e.parameter.limit
        )
      );
    }

    if (action === "getPushSubscriptionSummary") {
      return json(
        apiGetPushSubscriptionSummary(
          e.parameter.token,
          e.parameter.deviceId,
          e.parameter.endpoint
        )
      );
    }

    if (action === "adminGetPushControlCenter") {
      return json(
        apiAdminGetPushControlCenter(
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
    
    if (action === "getGameLiveProbabilities") {
      return json(
        apiGetGameLiveProbabilities({
          username: params.username,
          token: params.token,
          gameId: gameId,
          leagueId: leagueId
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

    if (action === "getRankingState") {
      const access = userCanAccessGameFeature_(params.username, gameId, "viewGame", leagueId);
      if (!access.allowed) return json({ success: false, error: "Access denied: " + access.reason });
      return json(apiGetRankingState_({ username: params.username, gameId: gameId }));
    }

    if (action === "getSurvivorState") {
      const access = userCanAccessGameFeature_(params.username, gameId, "viewGame", leagueId);
      if (!access.allowed) return json({ success: false, error: "Access denied: " + access.reason });
      return json(apiGetSurvivorState_({ username: params.username, gameId: gameId }));
    }

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
            params.confidencePoints,

          stakePoints:
            params.stakePoints
        })
      );

    }

    if (action === "getRealityTvPlayerStats") {
      const access = userCanAccessGameFeature_(params.username, gameId, "viewGame", leagueId);
      if (!access.allowed) return json({ success: false, error: "Access denied: " + access.reason });
      return json(apiGetRealityTvPlayerStats({
        username: params.username,
        token: params.token,
        gameId: gameId
      }));
    }

    if (action === "getSeasonAnchor") {
      const access = userCanAccessGameFeature_(params.username, gameId, "viewGame", leagueId);
      if (!access.allowed) return json({ success: false, error: "Access denied: " + access.reason });
      return json(apiGetSeasonAnchor({
        username: params.username,
        token: params.token,
        gameId: gameId
      }));
    }

    if (action === "getRealityTvEpisodeComparison") {
      const access = userCanAccessGameFeature_(params.username, gameId, "viewGame", leagueId);
      if (!access.allowed) return json({ success: false, error: "Access denied: " + access.reason });
      return json(apiGetRealityTvEpisodeComparison({
        username: params.username,
        token: params.token,
        gameId: gameId
      }));
    }

    if (action === "saveSeasonAnchorPick") {
      const access = userCanAccessGameFeature_(params.username, gameId, "makePicks", leagueId);
      if (!access.allowed) return json({ success: false, error: "Access denied: " + access.reason });
      return json(apiSaveSeasonAnchorPick({
        username: params.username,
        token: params.token,
        gameId: gameId,
        entityId: params.entityId
      }));
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
          params.targetUsername || params.username,
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
          params.targetUsername || params.username,
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

      const historySession = validateSessionToken(params.token || "");

      if (!historySession || historySession.success !== true) {
        return json({
          success: false,
          error: "Valid session required for archived profile history."
        });
      }

      return json(
        getUserProfileHistory(
          params.targetUsername || params.username,
          params.gameId || ""
        )
      );

    }

    if (action === "getArchivedGameHistory") {

      const archiveGameSession = validateSessionToken(params.token || "");

      if (!archiveGameSession || archiveGameSession.success !== true) {
        return json({
          success: false,
          error: "Valid session required for archived game history."
        });
      }

      return json(
        getArchivedGameHistory(
          params.gameId || "",
          params.targetUsername || params.username || ""
        )
      );

    }

    if (action === "getArchivedGamesHistory") {

      const archiveListSession = validateSessionToken(params.token || "");

      if (!archiveListSession || archiveListSession.success !== true) {
        return json({
          success: false,
          error: "Valid session required for archived games."
        });
      }

      return json(
        getArchivedGamesHistory()
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
    // SPORTS LIVE DISPLAY
    // Batched live player/team stats plus MLB starting pitchers.
    // =========================

    if (action === "getSportsGameDetails") {

      return json(
        getSportsGameDetails({
          espnEventIds:
            params.espnEventIds || params.eventIds || params.espnEventId || "",
          eventLeaguesJSON:
            params.eventLeaguesJSON || params.eventLeagues || "",
          league:
            params.league || ""
        })
      );

    }

    if (action === "getSportsLiveQuestionStatus") {

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
        getSportsLiveQuestionStatus({
          username:
            params.username || "",
          gameId:
            gameId
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
          token: params.token,
          migrateExisting: params.migrateExisting !== "false"
        })
      );

    }

    if (action === "adminSetupNormalizedQuestionStorage") {

      return json(
        apiAdminSetupNormalizedQuestionStorage({
          username: params.username,
          token: params.token,
          migrateExisting: params.migrateExisting !== "false",
          force: params.force === "true"
        })
      );

    }

    if (action === "adminGetStorageHealth") {

      return json(
        apiAdminGetStorageHealth({
          username: params.username,
          token: params.token,
          gameId: params.gameId || gameId || ""
        })
      );

    }

    if (action === "adminGetArchiveDashboard") {

      requireAdminFromToken_(params.token || "");

      return json(
        normalizedStorageGetArchiveDashboard_()
      );

    }

    if (action === "adminArchiveGameData") {

      return json(
        apiAdminArchiveGameData({
          username: params.username,
          token: params.token,
          gameId: params.gameId || gameId,
          mode: params.mode || "COPY",
          confirmMove: params.confirmMove === "true",
          confirmRestore: params.confirmRestore === "true",
          confirmationText: params.confirmationText || "",
          notes: params.notes || "",
          phase: params.phase || "",
          jobId: params.jobId || ""
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
         params.autoOdds,

        refreshEngineFirst:
          params.refreshEngineFirst,

        scoreRefreshMode:
          params.scoreRefreshMode,

        daysBack:
          params.daysBack,

        daysForward:
          params.daysForward

      })
    );

  }


    if (action === "adminGetSportsConfidenceBuilderScores") {

      return json(
        apiAdminGetSportsConfidenceBuilderScores({

          username:
            params.username,

          token:
            params.token,

          sport:
            params.sport,

          league:
            params.league,

          dateFrom:
            params.dateFrom,

          dateTo:
            params.dateTo,

          seasonYear:
            params.seasonYear,

          seasonType:
            params.seasonType,

          seasonPhase:
            params.seasonPhase,

          week:
            params.week,

          state:
            params.state,

          team:
            params.team

        })
      );

    }


    if (action === "adminCreateSportsConfidenceQuestionsBulk") {

      return json(
        apiAdminCreateSportsConfidenceQuestionsBulk({

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
            params.selectedGames

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
            params.autoOdds,

          refreshEngineFirst:
            params.refreshEngineFirst,

          scoreRefreshMode:
            params.scoreRefreshMode,

          daysBack:
            params.daysBack,

          daysForward:
            params.daysForward

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
            params.force,

          skipRefresh:
            params.skipRefresh,

          refreshEngineFirst:
            params.refreshEngineFirst,

          scoreRefreshMode:
            params.scoreRefreshMode,

          daysBack:
            params.daysBack,

          daysForward:
            params.daysForward
    
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
            gameId,

          refreshEngineFirst:
            params.refreshEngineFirst,

          scoreRefreshMode:
            params.scoreRefreshMode,

          daysBack:
            params.daysBack,

          daysForward:
            params.daysForward
        })
      );

    }

    if (action === "adminRefreshAndSettleSportsWagers") {

      return json(
        apiAdminRefreshAndSettleSportsWagers({
          username:
            params.username,

          token:
            params.token,

          gameId:
            params.gameId ||
            gameId,

          awardsGameId:
            params.awardsGameId ||
            gameId,

          scoreRefreshMode:
            params.scoreRefreshMode ||
            "window",

          daysBack:
            params.daysBack || 2,

          daysForward:
            params.daysForward || 2,

          force:
            params.force
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

    if (action === "adminRunSportsFullSync") {

      return json(
        apiAdminRunSportsFullSync({
          username:
            params.username,

          token:
            params.token,

          refreshOddsEngineFirst:
            params.refreshOddsEngineFirst
        })
      );

    }

    if (action === "adminFinalizeSportsWagersFromSourceScores") {

      requireAdmin_({
        username:
          params.username,

        token:
          params.token
      });

      return json(
        finalizeSportsWagerResultsFromSourceScoresForAllGames_(true)
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

if (action === "adminGetSportsPlayerStatus") {

  return json(
    apiAdminGetSportsPlayerStatus({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminSyncSportsPlayers") {

  return json(
    apiAdminSyncSportsPlayers({
      username:
        params.username,

      token:
        params.token,

      league:
        params.league,

      sport:
        params.sport
    })
  );

}

if (action === "adminRefreshSportsPlayerGameStats") {

  return json(
    apiAdminRefreshSportsPlayerGameStats({
      username:
        params.username,

      token:
        params.token,

      league:
        params.league,

      sport:
        params.sport,

      daysBack:
        params.daysBack,

      daysForward:
        params.daysForward,

      maxGames:
        params.maxGames
    })
  );

}

if (action === "adminGetSportsPlayerPropPlayers") {

  return json(
    apiAdminGetSportsPlayerPropPlayers({
      username: params.username,
      token: params.token,
      league: params.league,
      sport: params.sport,
      team: params.team,
      search: params.search,
      limit: params.limit
    })
  );

}

if (action === "adminGetSportsPlayerPropStatTypes") {

  return json(
    apiAdminGetSportsPlayerPropStatTypes({
      username: params.username,
      token: params.token,
      league: params.league,
      sport: params.sport
    })
  );

}

if (action === "adminCreateSportsPlayerProp") {

  return json(
    apiAdminCreateSportsPlayerProp({
      username: params.username,
      token: params.token,
      awardsGameId: params.awardsGameId || gameId,
      gameId: params.gameId,
      sportsGameId: params.sportsGameId,
      espnEventId: params.espnEventId,
      league: params.league,
      sport: params.sport,
      sportsPlayerId: params.sportsPlayerId || params.playerId,
      espnPlayerId: params.espnPlayerId,
      sportsStatType: params.sportsStatType || params.statType,
      sportsPropLine: params.sportsPropLine !== undefined ? params.sportsPropLine : params.line,
      overOdds: params.overOdds,
      underOdds: params.underOdds,
      categoryId: params.categoryId,
      categoryName: params.categoryName
    })
  );

}


if (action === "adminCreateSportsPlayerMatchup") {

  return json(
    apiAdminCreateSportsPlayerMatchup({
      username: params.username,
      token: params.token,
      awardsGameId: params.awardsGameId || gameId,
      gameId: params.gameId,
      sportsGameId: params.sportsGameId,
      espnEventId: params.espnEventId,
      league: params.league,
      sport: params.sport,
      sportsStatType: params.sportsStatType || params.statType,
      questionMode: params.questionMode || params.mode,
      playersJSON: params.playersJSON || params.players,
      defaultOdds: params.defaultOdds,
      points: params.points,
      categoryId: params.categoryId,
      categoryName: params.categoryName
    })
  );

}

if (action === "adminGetSportsAdvancedQuestionOptions") {

  return json(
    apiAdminGetSportsAdvancedQuestionOptions({
      username: params.username,
      token: params.token,
      league: params.league,
      sport: params.sport
    })
  );

}

if (action === "adminCreateSportsAdvancedQuestion") {

  return json(
    apiAdminCreateSportsAdvancedQuestion({
      username: params.username,
      token: params.token,
      awardsGameId: params.awardsGameId || gameId,
      gameId: params.gameId,
      questionMode: params.questionMode || params.mode,
      questionKind: params.questionKind || params.kind,
      entitiesJSON: params.entitiesJSON || params.entities,
      sportsStatType: params.sportsStatType || params.statType,
      checkpointType: params.checkpointType,
      operator: params.operator || params.comparisonOperator,
      threshold: params.threshold,
      defaultOdds: params.defaultOdds,
      yesOdds: params.yesOdds,
      noOdds: params.noOdds,
      points: params.points,
      categoryId: params.categoryId,
      categoryName: params.categoryName
    })
  );

}

if (action === "adminSettleSportsAdvancedQuestions") {

  return json(
    apiAdminSettleSportsAdvancedQuestions({
      username: params.username,
      token: params.token,
      awardsGameId: params.awardsGameId || gameId,
      gameId: params.gameId,
      force: params.force,
      refreshStats: params.refreshStats
    })
  );

}

if (action === "adminSetupSportsAdvancedStats") {

  return json(
    apiAdminSetupSportsAdvancedStats({
      username: params.username,
      token: params.token
    })
  );

}

if (action === "adminRefreshSportsAdvancedStats") {

  return json(
    apiAdminRefreshSportsAdvancedStats({
      username: params.username,
      token: params.token,
      gameId: params.gameId,
      sportsGameId: params.sportsGameId,
      espnEventId: params.espnEventId,
      league: params.league,
      sport: params.sport,
      daysBack: params.daysBack,
      daysForward: params.daysForward,
      maxGames: params.maxGames
    })
  );

}

if (action === "adminGetSportsAdvancedStatsStatus") {

  return json(
    apiAdminGetSportsAdvancedStatsStatus({
      username: params.username,
      token: params.token
    })
  );

}

if (action === "adminSettleSportsPlayerMatchups") {

  return json(
    apiAdminSettleSportsPlayerMatchups({
      username: params.username,
      token: params.token,
      awardsGameId: params.awardsGameId || gameId,
      gameId: params.gameId,
      force: params.force,
      refreshStats: params.refreshStats
    })
  );

}

if (action === "adminSettleSportsPlayerProps") {

  return json(
    apiAdminSettleSportsPlayerProps({
      username: params.username,
      token: params.token,
      awardsGameId: params.awardsGameId || gameId,
      gameId: params.gameId,
      force: params.force,
      refreshStats: params.refreshStats
    })
  );

}

if (action === "adminSetSportsEngineSmartAutomation") {

  return json(
    apiAdminSetSportsEngineSmartAutomation({
      username:
        params.username,

      token:
        params.token,

      enabled:
        params.enabled,

      oddsHour:
        params.oddsHour,

      archiveHour:
        params.archiveHour
    })
  );

}

if (action === "adminRefreshSportsScoresNow") {

  return json(
    apiAdminRefreshSportsScoresNow({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminRefreshSportsScoresWindow") {

  return json(
    apiAdminRefreshSportsScoresWindow({
      username:
        params.username,

      token:
        params.token,

      daysBack:
        params.daysBack,

      daysForward:
        params.daysForward
    })
  );

}

if (action === "adminInstallSportsScoresWindowTrigger") {

  return json(
    apiAdminInstallSportsScoresWindowTrigger({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminRemoveSportsScoresWindowTrigger") {

  return json(
    apiAdminRemoveSportsScoresWindowTrigger({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminInstallSportsWagerAutoSyncTrigger") {

  return json(
    apiAdminInstallSportsWagerAutoSyncTrigger({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminRemoveSportsWagerAutoSyncTrigger") {

  return json(
    apiAdminRemoveSportsWagerAutoSyncTrigger({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminGetSportsWagerAutoSyncStatus") {

  return json(
    apiAdminGetSportsWagerAutoSyncStatus({
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
        params.espnScoreboardUrl,

      season:
        params.season,

      seasonTitle:
        params.seasonTitle,

      seasonYear:
        params.seasonYear,

      scheduleSource:
        params.scheduleSource,

      espnSeasonTypesEnabled:
        params.espnSeasonTypesEnabled,

      espnPreseasonType:
        params.espnPreseasonType,

      espnRegularSeasonType:
        params.espnRegularSeasonType,

      espnPostseasonType:
        params.espnPostseasonType,

      espnTournamentType:
        params.espnTournamentType,

      espnBowlType:
        params.espnBowlType,

      collegeCoverageMode:
        params.collegeCoverageMode,

      espnGroupIds:
        params.espnGroupIds,

      espnResultLimit:
        params.espnResultLimit,

      selectedTeamIds:
        params.selectedTeamIds,

      seasonActive:
        params.seasonActive,

      seasonStartDate:
        params.seasonStartDate,

      seasonEndDate:
        params.seasonEndDate,

      preseasonEnabled:
        params.preseasonEnabled,

      preseasonStartDate:
        params.preseasonStartDate,

      preseasonEndDate:
        params.preseasonEndDate,

      regularSeasonStartDate:
        params.regularSeasonStartDate,

      regularSeasonEndDate:
        params.regularSeasonEndDate,

      postseasonEnabled:
        params.postseasonEnabled,

      postseasonStartDate:
        params.postseasonStartDate,

      postseasonEndDate:
        params.postseasonEndDate,

      tournamentEnabled:
        params.tournamentEnabled,

      tournamentStartDate:
        params.tournamentStartDate,

      tournamentEndDate:
        params.tournamentEndDate,

      bowlEnabled:
        params.bowlEnabled,

      bowlStartDate:
        params.bowlStartDate,

      bowlEndDate:
        params.bowlEndDate,

      oddsEnabled:
        params.oddsEnabled,

      oddsCooldownMinutes:
        params.oddsCooldownMinutes,

      oddsDailyMaxPulls:
        params.oddsDailyMaxPulls,

      oddsMonthlyMaxPulls:
        params.oddsMonthlyMaxPulls,

      snapshotRetentionDays:
        params.snapshotRetentionDays,

      archiveEnabled:
        params.archiveEnabled,

      archiveAfterDays:
        params.archiveAfterDays,

      archiveMode:
        params.archiveMode,

      keepSnapshotsDays:
        params.keepSnapshotsDays,

      keepLogsDays:
        params.keepLogsDays
    })
  );

}

if (action === "adminPreviewSportsLeagueArchive") {

  return json(
    apiAdminPreviewSportsLeagueArchive({
      username:
        params.username,

      token:
        params.token,

      league:
        params.league
    })
  );

}

if (action === "adminRunSportsArchiveNow") {

  return json(
    apiAdminRunSportsArchiveNow({
      username:
        params.username,

      token:
        params.token,

      league:
        params.league
    })
  );

}

if (action === "adminRepairSportsScoreDisplay") {

  return json(
    apiAdminRepairSportsScoreDisplay({
      username:
        params.username,

      token:
        params.token
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


if (action === "adminInstallSmartSportsAutomation") {

  return json(
    apiAdminInstallSmartSportsAutomation({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminRemoveSmartSportsAutomation") {

  return json(
    apiAdminRemoveSmartSportsAutomation({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminGetSmartSportsAutomationStatus") {

  return json(
    apiAdminGetSmartSportsAutomationStatus({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminFinalizeAllSportsWagerResults") {

  return json(
    apiAdminFinalizeAllSportsWagerResults({
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
        params.batchDays,

      league:
        params.league,

      sport:
        params.sport,

      season:
        params.season,

      seasonYear:
        params.seasonYear,

      scheduleSource:
        params.scheduleSource,

      seasonName:
        params.seasonName
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

if (action === "adminRunSportsScheduleReconcile") {

  return json(
    apiAdminRunSportsScheduleReconcile({
      username:
        params.username,

      token:
        params.token,

      league:
        params.league || "",

      daysBack:
        params.daysBack || 1,

      daysForward:
        params.daysForward || 21
    })
  );

}

if (action === "adminInstallSportsScheduleReconcileTrigger") {

  return json(
    apiAdminInstallSportsScheduleReconcileTrigger({
      username:
        params.username,

      token:
        params.token
    })
  );

}

if (action === "adminRemoveSportsScheduleReconcileTrigger") {

  return json(
    apiAdminRemoveSportsScheduleReconcileTrigger({
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

      oddsWindow:
        params.oddsWindow,

      stopAtMonthlyCalls:
        params.stopAtMonthlyCalls,

      defaultMarkets:
        params.defaultMarkets,

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

    /* TEAM FANTASY v1.2.18j GET ROUTES */
    if (action === "getTeamFantasyState") return json(apiGetTeamFantasyState(params));
    if (action === "getTeamFantasyGameDayState") return json(apiGetTeamFantasyGameDayState(params));
    if (action === "adminGetTeamFantasyTestLab") return json(apiAdminGetTeamFantasyTestLab(params));
    if (action === "getTeamFantasyStandings") return json(apiGetTeamFantasyStandings(params));
    if (action === "getTeamFantasyHeadToHead") return json(apiGetTeamFantasyHeadToHead(params));
    if (action === "adminGetTeamFantasyDashboard") return json(apiAdminGetTeamFantasyDashboard(params));

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
