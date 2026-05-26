function doGet(e) {

  try {

    const action =
      e.parameter.action;

    // =========================
    // GAME ID
    // =========================

    const gameId =
      e.parameter.gameId ||
      getDefaultGameId();

    // =========================
    // PICKS
    // =========================

    if (action === "getMyPicks") {

      return json(
        apiGetMyPicks(
          e.parameter.username,
          gameId
        )
      );

    }

    // =========================
    // CATEGORIES
    // =========================

    if (action === "getCategories") {

      return json(
        getCategories(
          gameId
        )
      );

    }

    // =========================
    // CATEGORY SETTINGS
    // =========================

    if (action === "getCategorySettings") {

      return json(
        getCategorySettings(
          gameId
        )
      );

    }

    // =========================
    // LOGIN
    // =========================

    if (action === "login") {

      return json(
        loginUser(
          e.parameter.username,
          e.parameter.pin
        )
      );

    }

    // =========================
    // SAVE PICK
    // =========================

    if (action === "savePick") {

      return json(
        savePick({

          username:
            e.parameter.username,

          categoryId:
            e.parameter.categoryId,

          nomineeId:
            e.parameter.nomineeId,

          gameId:
            gameId

        })
      );

    }

    // =========================
    // LEADERBOARD
    // =========================

    if (action === "leaderboard") {

      return json(
        getLeaderboardData(
          gameId
        )
      );

    }

    // =========================
    // USER BREAKDOWN
    // =========================

    if (action === "userBreakdown") {

      return json(
        getUserBreakdown(
          e.parameter.username,
          gameId
        )
      );

    }

    // =========================
    // USER PROFILE
    // =========================

    if (action === "getUserProfile") {

      return json(
        getUserProfile(
          e.parameter.username,
          gameId
        )
      );

    }

    // =========================
    // SAVE USER PROFILE
    // =========================

    if (action === "saveUserProfile") {

      return json(
        saveUserProfile({

          username:
            e.parameter.username,

          gameId:
            gameId,  

          displayName:
            e.parameter.displayName,

          avatar:
            e.parameter.avatar,

          themeColor:
            e.parameter.themeColor

        })
      );

    }

    // =========================
    // USER PROFILE HISTORY
    // =========================

    if (action === "getUserProfileHistory") {

        return json(
          getUserProfileHistory(
            e.parameter.username
          )
        );

    }

    // =========================
    // DEFAULT
    // =========================

    return json({
      success: true,
      message: "API running",
      gameId: gameId
    });

  } catch (err) {

    Logger.log(
      "API ERROR: " + err.message
    );

    return json({
      success: false,
      error: err.message
    });

  }

}

function json(obj) {

  return ContentService
    .createTextOutput(
      JSON.stringify(obj)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}