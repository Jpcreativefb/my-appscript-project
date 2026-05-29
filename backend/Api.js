function doGet(e) {

  try {

    const action =
      e.parameter.action;

    // =========================
    // GAME ID
    // =========================

    const adminActions = [
      "adminGetGames",
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
      "adminArchiveNominee"
    ];
    
    const isAdminGameAction =
      adminActions.indexOf(action) !== -1;
    
    const gameId =
      e.parameter.gameId ||
      (
        isAdminGameAction
          ? ""
          : getDefaultGameId()
      );

    // =========================
// ADMIN GAMES
// =========================

if (action === "adminGetGames") {

  return json(
    adminGetGames()
  );

}

if (action === "adminCreateGame") {

  return json(
    adminCreateGame(
      e.parameter
    )
  );

}

if (action === "adminUpdateGame") {

  return json(
    adminUpdateGame(
      e.parameter
    )
  );

}

if (action === "adminArchiveGame") {

  return json(
    adminArchiveGame(
      e.parameter
    )
  );

}

if (action === "adminCloneGame") {

  return json(
    adminCloneGame(
      e.parameter
    )
  );

}

if (action === "adminCloneGameSetup") {

  return json(
    adminCloneGameSetup(
      e.parameter
    )
  );

}

   // =========================
// ADMIN CATEGORY / QUESTION SETUP
// =========================

if (action === "adminGetGameSetup") {

  return json(
    adminGetGameSetup(
      e.parameter
    )
  );

}

if (action === "adminCreateCategory") {

  return json(
    adminCreateCategory(
      e.parameter
    )
  );

}

if (action === "adminUpdateCategory") {

  return json(
    adminUpdateCategory(
      e.parameter
    )
  );

}

if (action === "adminArchiveCategory") {

  return json(
    adminArchiveCategory(
      e.parameter
    )
  );

}

if (action === "adminCreateNominee") {

  return json(
    adminCreateNominee(
      e.parameter
    )
  );

}

if (action === "adminUpdateNominee") {

  return json(
    adminUpdateNominee(
      e.parameter
    )
  );

}

if (action === "adminArchiveNominee") {

  return json(
    adminArchiveNominee(
      e.parameter
    )
  );

}

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
            e.parameter.username,
            gameId
          )
        );

    }

    // =========================
// STARTUP PAYLOAD
// =========================

if (action === "getStartupPayload") {

  return json(
    apiGetStartupPayload({
      username: e.parameter.username,
      token: e.parameter.token,
      gameId: gameId
    })
  );

}

    // =========================
    // ADMIN SUMMARY
// =========================

if (action === "adminSummary") {

  return json(
    apiAdminSummary({
      username: e.parameter.username,
      token: e.parameter.token,
      gameId: gameId
    })
  );

}

// =========================
// ADMIN CLEAR CACHES
// =========================

if (action === "adminClearCaches") {

  return json(
    apiAdminClearCaches({
      username: e.parameter.username,
      token: e.parameter.token
    })
  );

}  

// =========================
// ADMIN UPDATE CATEGORY SETTING
// =========================

if (action === "adminUpdateCategorySetting") {

  return json(
    apiAdminUpdateCategorySetting({
      username: e.parameter.username,
      token: e.parameter.token,
      gameId: gameId,
      categoryId: e.parameter.categoryId,
      locked: e.parameter.locked,
      points: e.parameter.points,
      winnerNomineeId: e.parameter.winnerNomineeId
    })
  );

}

// =========================
// ADMIN CLEAR CATEGORY WINNER
// =========================

if (action === "adminClearCategoryWinner") {

  return json(
    apiAdminClearCategoryWinner({
      username: e.parameter.username,
      token: e.parameter.token,
      gameId: gameId,
      categoryId: e.parameter.categoryId
    })
  );

}

    // =========================
// ADMIN CREATE USER
// =========================

if (action === "adminCreateUser") {

  return json(
    apiAdminCreateUser({
      username: e.parameter.username,
      token: e.parameter.token,
      newUsername: e.parameter.newUsername,
      pin: e.parameter.pin,
      isAdmin: e.parameter.isAdmin,
      avatar: e.parameter.avatar,
      themeColor: e.parameter.themeColor
    })
  );

}

// =========================
// ADMIN RESET USER PIN
// =========================

if (action === "adminResetUserPin") {

  return json(
    apiAdminResetUserPin({
      username: e.parameter.username,
      token: e.parameter.token,
      targetUsername: e.parameter.targetUsername,
      pin: e.parameter.pin
    })
  );

}

// =========================
// ADMIN TOGGLE USER ADMIN
// =========================

if (action === "adminToggleUserAdmin") {

  return json(
    apiAdminToggleUserAdmin({
      username: e.parameter.username,
      token: e.parameter.token,
      targetUsername: e.parameter.targetUsername,
      isAdmin: e.parameter.isAdmin
    })
  );

}

// =========================
// ADMIN TOGGLE USER ACTIVE
// =========================

if (action === "adminToggleUserActive") {

  return json(
    apiAdminToggleUserActive({
      username: e.parameter.username,
      token: e.parameter.token,
      targetUsername: e.parameter.targetUsername,
      active: e.parameter.active
    })
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