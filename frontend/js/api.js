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