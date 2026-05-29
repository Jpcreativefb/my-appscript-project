const API_BASE =
  "https://script.google.com/macros/s/AKfycbyDdfv-1xMQTL7LGhGp48_nmWqiNSvNcKLo5IHkAQTxsQCVIPaMP8ZlxMp0ZfT_bzvo/exec";

/* ======================
   GENERIC API FETCH
====================== */

async function api(action, params = {}) {

  const url =
    new URL(API_BASE);

  url.searchParams.set(
    "action",
    action
  );

  Object.entries(params)
    .forEach(([key, value]) => {

      if (
        value !== undefined &&
        value !== null
      ) {
        url.searchParams.set(
          key,
          value
        );
      }

    });

  try {

    const response =
      await fetch(url);

    return await response.json();

  } catch (err) {

    console.error(
      "API ERROR",
      err
    );

    return {
      success: false,
      message: "Network error"
    };

  }

}

/* ======================
   LOGIN
====================== */

async function apiLogin(username, pin) {

  return api("login", {
    username,
    pin
  });

}

/* ======================
   CATEGORIES
====================== */

async function apiGetCategories(gameId) {

  return api("getCategories", {
    gameId
  });

}

/* ======================
   PICKS
====================== */

async function apiGetMyPicks(username, gameId) {

  return api("getMyPicks", {
    username,
    gameId
  });

}

async function apiSavePick(payload) {

  return api("savePick", {
    username: payload.username,
    gameId: payload.gameId,
    categoryId: payload.categoryId,
    nomineeId: payload.nomineeId
  });

}

/* ======================
   LEADERBOARD
====================== */

async function apiGetLeaderboard(gameId) {

  return api("leaderboard", {
    gameId
  });

}

/* ======================
   USER BREAKDOWN
====================== */

async function apiGetUserBreakdown(username, gameId) {

  return api("userBreakdown", {
    username,
    gameId
  });

}

/* ======================
   COMPATIBILITY WRAPPERS
   Old page names -> cleaned API names
====================== */

async function apiLeaderboard(gameId) {

  return apiGetLeaderboard(
    gameId
  );

}

async function apiGetUserProfile(username, gameId) {

  return api("getUserProfile", {
    username,
    gameId
  });

}

async function apiGetUserProfileHistory(username, gameId) {

  return api("getUserProfileHistory", {
    username,
    gameId
  });

}

async function apiGetStartupPayload() {

  const session =
    getSession();

  return api("getStartupPayload", {
    username: session.username,
    token: session.token,
    gameId: APP_STATE.gameId || ""
  });

}

/* ======================
   ADMIN
====================== */

async function apiAdminSummary() {

  const session =
    getSession();

  return api("adminSummary", {
    username: session.username,
    token: session.token,
    gameId: APP_STATE.gameId || ""
  });

}

async function apiAdminClearCaches() {

  const session =
    getSession();

  return api("adminClearCaches", {
    username: session.username,
    token: session.token
  });

}

async function apiAdminUpdateCategorySetting(categoryId, patch) {

  const session =
    getSession();

  return api("adminUpdateCategorySetting", {
    username: session.username,
    token: session.token,
    gameId: APP_STATE.gameId || "",
    categoryId: categoryId,
    locked:
      patch.locked !== undefined
        ? patch.locked
        : "",
    points:
      patch.points !== undefined
        ? patch.points
        : "",
    winnerNomineeId:
      patch.winnerNomineeId !== undefined
        ? patch.winnerNomineeId
        : ""
  });

}

async function apiAdminClearCategoryWinner(categoryId) {

  const session =
    getSession();

  return api("adminClearCategoryWinner", {
    username: session.username,
    token: session.token,
    gameId: APP_STATE.gameId || "",
    categoryId: categoryId
  });

}

async function apiAdminCreateUser(payload) {

  const session =
    getSession();

  return api("adminCreateUser", {
    username: session.username,
    token: session.token,
    newUsername: payload.username,
    pin: payload.pin,
    isAdmin: payload.isAdmin || false,
    avatar: payload.avatar || "avatar1",
    themeColor: payload.themeColor || "#ffcc00"
  });

}

async function apiAdminResetUserPin(targetUsername, pin) {

  const session =
    getSession();

  return api("adminResetUserPin", {
    username: session.username,
    token: session.token,
    targetUsername: targetUsername,
    pin: pin
  });

}

async function apiAdminToggleUserAdmin(targetUsername, isAdmin) {

  const session =
    getSession();

  return api("adminToggleUserAdmin", {
    username: session.username,
    token: session.token,
    targetUsername: targetUsername,
    isAdmin: isAdmin
  });

}

async function apiAdminToggleUserActive(targetUsername, active) {

  const session =
    getSession();

  return api("adminToggleUserActive", {
    username: session.username,
    token: session.token,
    targetUsername: targetUsername,
    active: active
  });

}