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

  const cachedUsername =
    CacheService
      .getScriptCache()
      .get(token);

  if (
    !cachedUsername ||
    String(cachedUsername)
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

function apiAdminSummary(payload) {

  requireAdmin_(payload);

  const gameId =
    normalizeGameId_(
      payload.gameId ||
      getDefaultGameId()
    );

  validateGameId(gameId);

  const game =
    getGame(gameId);

  const games =
    getGames();

  const users =
    adminGetUsers_();

  const categories =
    getCategories(gameId);

  const settings =
    getCategorySettings(gameId);

  const settingsList =
    Object.keys(settings || {})
      .map(id => settings[id]);

  const lockedCount =
    settingsList.filter(s =>
      s.locked === true
    ).length;

  return {
    success: true,

    gameId: gameId,

    game: game,

    counts: {
      users: users.length,
      games: games.length,
      categories: categories.length,
      lockedCategories: lockedCount
    },

    games: games,

    users: users.map(u => ({
      username: u.username,
      isAdmin: u.isAdmin,
      active: u.active !== false
    })),

    categories: categories.map(c => {

      const categoryId =
        c.id || c.categoryId || "";
    
      const setting =
        settings[categoryId] || {};
    
      return {
        id: categoryId,
    
        name:
          c.name ||
          c.category ||
          c.Category ||
          categoryId,
    
        nomineesCount:
          c.nominees
            ? c.nominees.length
            : 0,
    
        nominees:
          (c.nominees || []).map(n => ({
            id:
              n.id ||
              n.nomineeId ||
              n.NomineeId ||
              "",
    
            name:
              n.name ||
              n.nominee ||
              n.Nominee ||
              n.title ||
              ""
          })),
    
        locked:
          setting.locked === true,
    
        points:
          setting.points || 0,
    
        winnerNomineeId:
          setting.winnerNomineeId || ""
      };
    
    })
  };

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

  const patch = {};

  if (payload.locked !== undefined && payload.locked !== "") {
    patch.locked =
      adminBoolean_(payload.locked);
  }

  if (payload.points !== undefined && payload.points !== "") {
    const points =
      Number(payload.points);

    if (isNaN(points)) {
      throw new Error("Invalid points value");
    }

    patch.points =
      points;
  }

  if (payload.winnerNomineeId !== undefined) {
    patch.winnerNomineeId =
      String(payload.winnerNomineeId || "")
        .trim();
  }

  updateCategorySetting(
    gameId,
    categoryId,
    patch
  );

  if (
    typeof clearAppCaches ===
    "function"
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

  updateCategorySetting(
    gameId,
    categoryId,
    {
      winnerNomineeId: ""
    }
  );

  if (
    typeof clearAppCaches ===
    "function"
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

  const newUsername =
    String(payload.newUsername || "")
      .trim();

  const pin =
    String(payload.pin || "")
      .trim();

  if (!newUsername) {
    throw new Error("Missing username");
  }

  if (!pin) {
    throw new Error("Missing PIN");
  }

  const sheet =
    getUsersSheet_();

  const data =
    sheet.getDataRange()
      .getValues();

  const headers =
    data[0].map(h =>
      String(h).trim()
    );

  const col =
    adminUsersColumnMap_(headers);

  adminValidateUsersColumns_(col);

  const existing =
    data.slice(1).some(row =>
      String(row[col.username] || "")
        .trim()
        .toLowerCase() ===
      newUsername.toLowerCase()
    );

  if (existing) {
    throw new Error(
      "User already exists: " + newUsername
    );
  }

  const row =
    new Array(headers.length).fill("");

  row[col.username] =
    newUsername;

  row[col.pin] =
    "'" + pin;

  row[col.isAdmin] =
    adminBoolean_(payload.isAdmin);

  if (col.avatar > -1) {
    row[col.avatar] =
      payload.avatar || "avatar1";
  }

  if (col.themeColor > -1) {
    row[col.themeColor] =
      payload.themeColor || "#ffcc00";
  }

  if (col.createdAt > -1) {
    row[col.createdAt] =
      new Date().toISOString();
  }

  if (col.active > -1) {
    row[col.active] =
      true;
  }

  sheet.appendRow(row);

  if (
    typeof clearAppCaches ===
    "function"
  ) {
    clearAppCaches();
  }

  return {
    success: true,
    message: "User created",
    username: newUsername
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

  found.sheet
    .getRange(
      found.rowIndex,
      found.col.pin + 1
    )
    .setValue("'" + pin);

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

  found.sheet
    .getRange(
      found.rowIndex,
      found.col.active + 1
    )
    .setValue(nextActive);

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