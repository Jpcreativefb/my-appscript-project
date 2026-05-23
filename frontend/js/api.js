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

      url.searchParams.set(
        key,
        value
      );

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
   GET PICKS
====================== */

async function getPicks(username, token) {

  return api("getPicks", {
    username,
    token
  });
}

/* ======================
   GET CATEGORIES
====================== */

async function apiGetCategories(gameId) {

  return api("getCategories", {
    gameId
  });
}

/* ======================
   SAVE PICK
====================== */

async function apiSavePick(
  username,
  categoryId,
  nomineeId,
  gameId
) {

  return api("savePick", {
    username,
    categoryId,
    nomineeId,
    gameId
  });
}

/* ======================
   GET MY PICKS
====================== */

async function apiGetMyPicks(
  username,
  gameId
) {

  return api("getMyPicks", {
    username,
    gameId
  });
}

/* ======================
   LEADERBOARD
====================== */

async function apiLeaderboard(gameId) {

  return api("leaderboard", {
    gameId
  });
}