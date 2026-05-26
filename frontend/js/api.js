/* ======================
   API BASE
====================== */

function getApiBase() {

  if (
    typeof CONFIG === "undefined" ||
    !CONFIG.API_URL
  ) {

    throw new Error(
      "CONFIG.API_URL is missing"
    );

  }

  return CONFIG.API_URL;

}

/* ======================
   DEFAULT GAME ID
====================== */

function getFrontendGameId() {

  return (
    CONFIG.DEFAULT_GAME_ID ||
    "oscars-2026"
  );

}

/* ======================
   GENERIC API FETCH
====================== */

async function api(action, params = {}) {

  const url =
    new URL(
      getApiBase()
    );

  url.searchParams.set(
    "action",
    action
  );

  Object.entries(params)
    .forEach(([key, value]) => {

      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {

        url.searchParams.set(
          key,
          value
        );

      }

    });

  try {

    debugLog(
      "API REQUEST",
      action,
      Object.fromEntries(
        url.searchParams.entries()
      )
    );

    const response =
      await fetch(url);

    const text =
      await response.text();

    try {

      return JSON.parse(text);

    } catch (jsonErr) {

      console.error(
        "API NON-JSON RESPONSE",
        text
      );

      return {
        success: false,
        message: "Invalid API response",
        raw: text
      };

    }

  } catch (err) {

    console.error(
      "API ERROR",
      action,
      err
    );

    return {
      success: false,
      message: "Network error",
      error: String(err)
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
   GET CATEGORIES
====================== */

async function apiGetCategories(
  gameId = getFrontendGameId()
) {

  return api("getCategories", {
    gameId
  });

}

/* ======================
   GET MY PICKS
====================== */

async function apiGetMyPicks(
  username,
  gameId = getFrontendGameId()
) {

  return api("getMyPicks", {
    username,
    gameId
  });

}

/* ======================
   GET USER PROFILE
====================== */

async function apiGetUserProfile(
  username,
  gameId = getFrontendGameId()
) {

  return api("getUserProfile", {
    username,
    gameId
  });

}

/* ======================
   SAVE USER PROFILE
====================== */

async function apiSaveUserProfile(
  profile
) {

  return api("saveUserProfile", {
    username:
      profile.username,

    gameId:
      profile.gameId ||
      getFrontendGameId(),

    displayName:
      profile.displayName,

    avatar:
      profile.avatar,

    themeColor:
      profile.themeColor
  });

}

/* ======================
   GET USER PROFILE HISTORY
====================== */

async function apiGetUserProfileHistory(
  username
) {

  return api("getUserProfileHistory", {
    username
  });

}

/* ======================
   SAVE PICK
====================== */

async function apiSavePick(
  username,
  categoryId,
  nomineeId,
  gameId = getFrontendGameId()
) {

  return api("savePick", {
    username,
    categoryId,
    nomineeId,
    gameId
  });

}

/* ======================
   LEADERBOARD
====================== */

async function apiLeaderboard(
  gameId = getFrontendGameId()
) {

  return api("leaderboard", {
    gameId
  });

}

/* ======================
   LEGACY ALIAS
   Temporary compatibility only
====================== */

async function getPicks(username) {

  return apiGetMyPicks(
    username,
    getFrontendGameId()
  );

}