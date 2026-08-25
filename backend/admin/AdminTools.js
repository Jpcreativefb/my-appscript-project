/* =========================================================
   ADMIN TOOLS
   Production-safe admin helpers
========================================================= */

/* =========================
   ADMIN AUTH GUARD
========================= */

function requireAdmin_(payload) {

  payload = payload || {};

  const username =
    String(payload.username || "")
      .trim();

  const token =
    String(payload.token || "")
      .trim();

  if (!username || !token) {
    throw new Error("Admin auth missing");
  }

  const sessionUsername =
    typeof getUsernameFromSessionToken_ === "function"
      ? getUsernameFromSessionToken_(token)
      : "";

  if (
    !sessionUsername ||
    String(sessionUsername)
      .trim()
      .toLowerCase() !==
    username.toLowerCase()
  ) {
    throw new Error("Invalid admin session");
  }

  if (!isAdmin(username)) {
    throw new Error("Admin access denied");
  }

  return true;

}

/* =========================
   ADMIN SUMMARY API
========================= */

function adminQuickSheetRowCount_(sheetName) {

  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
    if (!sheet) return 0;
    return Math.max(0, Number(sheet.getLastRow() || 0) - 1);
  } catch (err) {
    return 0;
  }

}

function adminQuickGameRowCount_(sheetName, gameId) {

  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return 0;

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map(function(value) { return String(value || "").trim(); });
    const gameIdCol = headers.indexOf("GameId");
    if (gameIdCol < 0) return 0;

    const wanted = normalizeGameId_(gameId);
    const rowCount = sheet.getLastRow() - 1;
    const values = sheet.getRange(2, gameIdCol + 1, rowCount, 1).getValues();
    let count = 0;
    values.forEach(function(row) {
      if (normalizeGameId_(row[0]) === wanted) count++;
    });
    return count;
  } catch (err) {
    return 0;
  }

}

function adminQuickLockedCategoryCount_(gameId) {

  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName(CATEGORY_SETTINGS_SHEET);
    if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return 0;

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map(function(value) { return String(value || "").trim(); });
    const gameIdCol = headers.indexOf("GameId");
    let lockedCol = headers.indexOf("Locked");
    if (lockedCol < 0) lockedCol = headers.indexOf("IsLocked");
    if (gameIdCol < 0 || lockedCol < 0) return 0;

    const firstCol = Math.min(gameIdCol, lockedCol);
    const lastCol = Math.max(gameIdCol, lockedCol);
    const rowCount = sheet.getLastRow() - 1;
    const values = sheet.getRange(2, firstCol + 1, rowCount, lastCol - firstCol + 1).getValues();
    const wanted = normalizeGameId_(gameId);
    let count = 0;

    values.forEach(function(row) {
      const rowGame = row[gameIdCol - firstCol];
      const locked = row[lockedCol - firstCol];
      const isLocked = locked === true || String(locked || "").trim().toLowerCase() === "true" || String(locked || "").trim().toLowerCase() === "yes" || Number(locked) === 1;
      if (normalizeGameId_(rowGame) === wanted && isLocked) count++;
    });

    return count;
  } catch (err) {
    return 0;
  }

}

function adminBuildCategoryDetails_(gameId) {

  const categories = getCategories(gameId);
  const settings = getCategorySettings(gameId);

  return categories.map(function(c) {
    const categoryId = c.id || c.categoryId || "";
    const setting = settings[categoryId] || {};
    const settlementStatus = String(setting.settlementStatus || "").trim().toLowerCase();
    const wagerResultType = String(setting.wagerResultType || "").trim().toLowerCase();
    let resultStatus = "pending";

    if (
      settlementStatus === "push" || settlementStatus === "pushed" || settlementStatus === "void" || settlementStatus === "refund" ||
      wagerResultType === "push" || wagerResultType === "void" || wagerResultType === "refund"
    ) {
      resultStatus = "push";
    } else if (
      settlementStatus === "cancelled" || settlementStatus === "canceled" || settlementStatus === "no-contest" || settlementStatus === "no_contest" ||
      wagerResultType === "cancelled" || wagerResultType === "canceled" || wagerResultType === "no-contest" || wagerResultType === "no_contest"
    ) {
      resultStatus = "cancelled";
    } else if (String(setting.winnerNomineeId || "").trim()) {
      resultStatus = "winner";
    }

    return {
      id: categoryId,
      name: c.name || c.category || c.Category || categoryId,
      nomineesCount: c.nominees ? c.nominees.length : 0,
      nominees: (c.nominees || []).map(function(n) {
        return {
          id: n.id || n.nomineeId || n.NomineeId || "",
          name: n.name || n.nominee || n.Nominee || n.title || ""
        };
      }),
      locked: setting.locked === true,
      points: setting.points || 0,
      winnerNomineeId: setting.winnerNomineeId || "",
      settlementStatus: settlementStatus,
      wagerResultType: wagerResultType,
      resultStatus: resultStatus
    };
  });

}

function apiAdminSummary(payload) {

  requireAdmin_(payload);
  payload = payload || {};

  const gameId = normalizeGameId_(payload.gameId || getDefaultGameId());
  validateGameId(gameId);

  // One game-table read is enough for both the current game and game count.
  // Heavy user/category/nominee data is loaded only when the admin explicitly
  // opens those panels.
  const games = getGames();
  const game = (games || []).filter(function(item) {
    return normalizeGameId_(item.gameId || item.GameId || item.id || "") === gameId;
  })[0] || getGame(gameId);

  const includeDetails = payload.includeDetails === true || String(payload.includeDetails || "").trim().toLowerCase() === "true";
  const counts = {
    users: adminQuickSheetRowCount_(USERS_SHEET),
    games: (games || []).length,
    categories: adminQuickGameRowCount_(CATEGORIES_SHEET, gameId),
    lockedCategories: adminQuickLockedCategoryCount_(gameId)
  };

  const result = {
    success: true,
    gameId: gameId,
    game: game,
    counts: counts,
    detailsLoaded: includeDetails
  };

  if (!includeDetails) {
    return result;
  }

  const users = adminGetUsers_();
  result.games = games;
  result.users = users.map(function(u) {
    return {
      username: u.username,
      isAdmin: u.isAdmin,
      active: u.active !== false
    };
  });
  result.categories = adminBuildCategoryDetails_(gameId);

  return result;

}

/* =========================
   CLEAR CACHE API
========================= */

function apiAdminClearCaches(payload) {

  requireAdmin_(payload);

  if (
    typeof clearAppCaches ===
    "function"
  ) {
    clearAppCaches();
  }

  return {
    success: true,
    message: "App caches cleared"
  };

}

/* =========================
   ADMIN UPDATE CATEGORY SETTING
========================= */

function apiAdminUpdateCategorySetting(payload) {

  requireAdmin_(payload);

  payload =
    payload || {};

  const gameId =
    normalizeGameId_(
      payload.gameId ||
      getDefaultGameId()
    );

  validateGameId(gameId);

  const categoryId =
    String(payload.categoryId || "")
      .trim()
      .toLowerCase();

  if (!categoryId) {
    throw new Error("Missing categoryId");
  }

  const oldWinnerNomineeId =
    typeof getLiveResultsCurrentWinnerId_ === "function"
      ? getLiveResultsCurrentWinnerId_(
          gameId,
          categoryId
        )
      : "";

  const patch = {};

  if (
    payload.locked !== undefined &&
    payload.locked !== ""
  ) {

    patch.locked =
      adminBoolean_(payload.locked);

  }

  if (
    payload.points !== undefined &&
    payload.points !== ""
  ) {

    const points =
      Number(payload.points);

    if (isNaN(points)) {
      throw new Error("Invalid points value");
    }

    patch.points =
      points;

  }

  /*
    Important:
    Do NOT treat a blank winnerNomineeId as a normal update.
    Blank winner updates are handled only by apiAdminClearCategoryWinner().
    This prevents points/lock changes from accidentally clearing winners.
  */
  if (
    payload.winnerNomineeId !== undefined &&
    payload.winnerNomineeId !== ""
  ) {

    patch.winnerNomineeId =
      String(payload.winnerNomineeId || "")
        .trim()
        .toLowerCase();

    if (
      patch.locked === undefined
    ) {

      patch.locked = true;

    }

  }

  if (
    Object.keys(patch).length === 0
  ) {

    return {
      success: true,
      noChange: true,
      message: "No category setting changes received",
      gameId: gameId,
      categoryId: categoryId
    };

  }

  updateCategorySetting(
    gameId,
    categoryId,
    patch
  );

  const newWinnerNomineeId =
    "winnerNomineeId" in patch
      ? patch.winnerNomineeId
      : oldWinnerNomineeId;

  if (
    "winnerNomineeId" in patch &&
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
        newWinnerNomineeId,

      source:
        "admin",

      updatedBy:
        payload.username || "",

      notes:
        payload.notes || ""
    });

  }

  if (
    typeof clearLiveResultsCaches === "function"
  ) {

    clearLiveResultsCaches(gameId);

  } else if (
    typeof clearAppCaches === "function"
  ) {

    clearAppCaches();

  }

  return {
    success: true,
    message: "Category setting updated",
    gameId: gameId,
    categoryId: categoryId,
    patch: patch
  };

}

/* =========================
   ADMIN CLEAR CATEGORY WINNER
========================= */

function apiAdminClearCategoryWinner(payload) {

  requireAdmin_(payload);

  payload =
    payload || {};

  const gameId =
    normalizeGameId_(
      payload.gameId ||
      getDefaultGameId()
    );

  validateGameId(gameId);

  const categoryId =
    String(payload.categoryId || "")
      .trim()
      .toLowerCase();

  if (!categoryId) {
    throw new Error("Missing categoryId");
  }

  const oldWinnerNomineeId =
    typeof getLiveResultsCurrentWinnerId_ === "function"
      ? getLiveResultsCurrentWinnerId_(
          gameId,
          categoryId
        )
      : "";

  updateCategorySetting(
    gameId,
    categoryId,
    {
      winnerNomineeId:
        ""
    }
  );

  if (
    oldWinnerNomineeId &&
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
        "",

      source:
        "admin",

      updatedBy:
        payload.username || "",

      notes:
        payload.notes || "Winner cleared"
    });

  }

  if (
    typeof clearLiveResultsCaches === "function"
  ) {

    clearLiveResultsCaches(gameId);

  } else if (
    typeof clearAppCaches === "function"
  ) {

    clearAppCaches();

  }

  return {
    success: true,
    message: "Category winner cleared",
    gameId: gameId,
    categoryId: categoryId
  };

}
/* =========================
   ADMIN BOOLEAN HELPER
========================= */

function adminBoolean_(value) {

  return (
    value === true ||
    value === 1 ||
    String(value || "")
      .trim()
      .toLowerCase() === "true" ||
    String(value || "")
      .trim()
      .toLowerCase() === "yes" ||
    String(value || "")
      .trim()
      .toLowerCase() === "locked"
  );

}

/* =========================
   USERS FOR ADMIN
========================= */

function adminGetUsers_() {

  const data =
    getAllUsersData_();

  if (data.length <= 1) {
    return [];
  }

  const headers =
    data[0].map(h =>
      String(h).trim()
    );

  const rows =
    data.slice(1);

  const col =
    adminUsersColumnMap_(
      headers
    );

  if (col.username === -1) {
    throw new Error(
      "Users sheet missing Username column"
    );
  }

  return rows
    .map(row => {

      const username =
        String(row[col.username] || "")
          .trim();

      if (!username) {
        return null;
      }

      const isAdmin =
        col.isAdmin > -1 &&
        (
          row[col.isAdmin] === true ||
          row[col.isAdmin] === 1 ||
          String(row[col.isAdmin] || "")
            .trim()
            .toLowerCase() === "true" ||
          String(row[col.isAdmin] || "")
            .trim()
            .toLowerCase() === "yes" ||
          String(row[col.isAdmin] || "")
            .trim()
            .toLowerCase() === "admin"
        );

      const activeRaw =
        col.active > -1
          ? row[col.active]
          : true;

      const activeText =
        String(activeRaw || "")
          .trim()
          .toLowerCase();

      const isActive =
        col.active === -1 ||
        activeRaw === "" ||
        activeRaw === true ||
        activeRaw === 1 ||
        activeText === "true" ||
        activeText === "yes" ||
        activeText === "active";

      return {
        username: username,
        isAdmin: isAdmin,
        active: isActive
      };

    })
    .filter(Boolean);

}

/* =========================
   USER CLEANUP
   Manual admin utility
========================= */

function adminCleanUsersSheet() {

  const sheet =
    getUsersSheet_();

  const data =
    sheet.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return;
  }

  const headers =
    data[0];

  const rows =
    data.slice(1);

  const cleaned =
    rows.map(row => {

      let [
        username,
        pin,
        isAdminValue,
        avatar,
        themeColor,
        createdAt
      ] = row;

      username =
        String(username || "")
          .trim();

      pin =
        String(pin || "")
          .replace(/^'/, "")
          .trim();

      const isAdmin =
        isAdminValue === true ||
        String(isAdminValue)
          .trim()
          .toLowerCase() === "true" ||
        String(isAdminValue)
          .trim()
          .toLowerCase() === "yes";

      avatar =
        avatar
          ? String(avatar).trim()
          : "";

      themeColor =
        themeColor
          ? String(themeColor).trim()
          : "";

      if (!createdAt) {
        createdAt =
          new Date().toISOString();
      }

      return [
        username,
        "'" + pin,
        isAdmin,
        avatar,
        themeColor,
        createdAt
      ];

    });

  sheet
    .getRange(
      2,
      1,
      cleaned.length,
      headers.length
    )
    .setValues(cleaned);

  if (
    typeof clearAppCaches ===
    "function"
  ) {
    clearAppCaches();
  }

  Logger.log(
    "Users sheet cleaned"
  );

}

/* =========================
   ADMIN CREATE USER
========================= */

function apiAdminCreateUser(payload) {

  requireAdmin_(payload);

  payload =
    payload || {};

  const newUsername =
    String(
      payload.newUsername ||
      payload.username ||
      ""
    ).trim();

  const pin =
    String(payload.pin || "")
      .trim();

  if (!newUsername) {
    throw new Error("Missing username");
  }

  if (!pin) {
    throw new Error("Missing PIN");
  }

  const result =
    createUser(
      newUsername,
      payload.realName || payload.displayName || "",
      pin,
      payload.email || "",
      payload.phone || "",
      payload.contactMethod || "none"
    );

  if (!result || result.success === false) {
    throw new Error(
      result && (result.message || result.error)
        ? result.message || result.error
        : "Could not create user"
    );
  }

  const record =
    findUserRecordByUsername_(
      newUsername
    );

  if (record) {

    updateUserFields_(
      record.rowNumber,
      {
        isAdmin:
          adminBoolean_(payload.isAdmin),
        avatar:
          payload.avatar || "default",
        themeColor:
          payload.themeColor || "#000000",
        accountStatus:
          "active",
        lastUpdated:
          new Date().toISOString()
      }
    );

  }

  if (
    typeof clearAppCaches ===
    "function"
  ) {
    clearAppCaches();
  }

  return {
    success: true,
    message: "User created",
    username: newUsername,
    user: result.user || null
  };

}

/* =========================
   ADMIN RESET USER PIN
========================= */

function apiAdminResetUserPin(payload) {

  requireAdmin_(payload);

  const targetUsername =
    String(payload.targetUsername || "")
      .trim();

  const pin =
    String(payload.pin || "")
      .trim();

  if (!targetUsername) {
    throw new Error("Missing target username");
  }

  if (!pin) {
    throw new Error("Missing new PIN");
  }

  const found =
    adminFindUserRow_(
      targetUsername
    );

  if (!found) {
    throw new Error(
      "User not found: " + targetUsername
    );
  }

  if (found.col.pin === -1) {
    throw new Error(
      "Users sheet missing PIN column"
    );
  }

  const userRecord =
    typeof findUserRecordByUsername_ === "function"
      ? findUserRecordByUsername_(targetUsername)
      : null;

  if (userRecord && typeof updateUserFields_ === "function") {
    updateUserFields_(
      userRecord.rowNumber,
      {
        pin: hashUserPinForStorage_(pin),
        sessionToken: "",
        sessionExpiresAt: "",
        lastUpdated: new Date().toISOString()
      }
    );
  } else {
    found.sheet
      .getRange(
        found.rowIndex,
        found.col.pin + 1
      )
      .setValue(hashUserPinForStorage_(pin));
  }

  if (typeof authRevokeAllDeviceSessionsForUser_ === "function") {
    authRevokeAllDeviceSessionsForUser_(targetUsername);
  }

  if (
    typeof clearAppCaches ===
    "function"
  ) {
    clearAppCaches();
  }

  return {
    success: true,
    message: "PIN reset",
    username: targetUsername
  };

}

/* =========================
   ADMIN TOGGLE USER ADMIN
========================= */

function apiAdminToggleUserAdmin(payload) {

  requireAdmin_(payload);

  const targetUsername =
    String(payload.targetUsername || "")
      .trim();

  if (!targetUsername) {
    throw new Error("Missing target username");
  }

  const nextIsAdmin =
    adminBoolean_(payload.isAdmin);

  const found =
    adminFindUserRow_(
      targetUsername
    );

  if (!found) {
    throw new Error(
      "User not found: " + targetUsername
    );
  }

  if (found.col.isAdmin === -1) {
    throw new Error(
      "Users sheet missing IsAdmin column"
    );
  }

  found.sheet
    .getRange(
      found.rowIndex,
      found.col.isAdmin + 1
    )
    .setValue(nextIsAdmin);

  if (
    typeof clearAppCaches ===
    "function"
  ) {
    clearAppCaches();
  }

  return {
    success: true,
    message: "Admin access updated",
    username: targetUsername,
    isAdmin: nextIsAdmin
  };

}

/* =========================
   ADMIN TOGGLE USER ACTIVE
========================= */

function apiAdminToggleUserActive(payload) {

  requireAdmin_(payload);

  const targetUsername =
    String(payload.targetUsername || "")
      .trim();

  if (!targetUsername) {
    throw new Error("Missing target username");
  }

  const nextActive =
    adminBoolean_(payload.active);

  const found =
    adminFindUserRow_(
      targetUsername
    );

  if (!found) {
    throw new Error(
      "User not found: " + targetUsername
    );
  }

  if (found.col.active === -1) {
    throw new Error(
      "Users sheet missing Active column"
    );
  }

  const userRecord =
    typeof findUserRecordByUsername_ === "function"
      ? findUserRecordByUsername_(targetUsername)
      : null;

  if (userRecord && typeof updateUserFields_ === "function") {
    updateUserFields_(
      userRecord.rowNumber,
      {
        active: nextActive,
        accountStatus: nextActive ? "active" : "inactive",
        sessionToken: nextActive ? String(userRecord.user["SessionToken"] || "") : "",
        sessionExpiresAt: nextActive ? String(userRecord.user["SessionExpiresAt"] || "") : "",
        lastUpdated: new Date().toISOString()
      }
    );
  } else {
    found.sheet
      .getRange(
        found.rowIndex,
        found.col.active + 1
      )
      .setValue(nextActive);
  }

  if (!nextActive && typeof authRevokeAllDeviceSessionsForUser_ === "function") {
    authRevokeAllDeviceSessionsForUser_(targetUsername);
  }

  if (
    typeof clearAppCaches ===
    "function"
  ) {
    clearAppCaches();
  }

  return {
    success: true,
    message: nextActive
      ? "User reactivated"
      : "User deactivated",
    username: targetUsername,
    active: nextActive
  };

}

/* =========================
   ADMIN USER HELPERS
========================= */

function adminUsersColumnMap_(headers) {

  return {
    username:
      headers.indexOf("Username"),

    pin:
      headers.indexOf("PIN"),

    isAdmin:
      headers.indexOf("IsAdmin"),

    avatar:
      headers.indexOf("Avatar"),

    themeColor:
      headers.indexOf("ThemeColor"),

    createdAt:
      headers.indexOf("CreatedAt"),

    active:
      headers.indexOf("Active")
  };

}

function adminValidateUsersColumns_(col) {

  const missing = [];

  if (col.username === -1) {
    missing.push("Username");
  }

  if (col.pin === -1) {
    missing.push("PIN");
  }

  if (col.isAdmin === -1) {
    missing.push("IsAdmin");
  }

  if (missing.length) {
    throw new Error(
      "Users sheet missing columns: " +
      missing.join(", ")
    );
  }

}

function adminFindUserRow_(username) {

  const sheet =
    getUsersSheet_();

  const data =
    sheet.getDataRange()
      .getValues();

  if (data.length <= 1) {
    return null;
  }

  const headers =
    data[0].map(h =>
      String(h).trim()
    );

  const col =
    adminUsersColumnMap_(headers);

  adminValidateUsersColumns_(col);

  const target =
    String(username || "")
      .trim()
      .toLowerCase();

  for (let i = 1; i < data.length; i++) {

    const rowUsername =
      String(data[i][col.username] || "")
        .trim()
        .toLowerCase();

    if (rowUsername === target) {
      return {
        sheet: sheet,
        data: data,
        headers: headers,
        col: col,
        row: data[i],
        rowIndex: i + 1
      };
    }

  }

  return null;

}