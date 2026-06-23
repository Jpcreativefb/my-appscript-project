/* =========================
   USER PROFILE DISPLAY HELPERS
   NEW DROP-IN FILE: UserProfiles.gs

   Uses:
   1) UserGameProfiles for selected GameId
   2) Users fallback
   3) raw Username fallback

   IMPORTANT:
   Picks.Username should stay as the real account key.
   This file only controls displayName/avatar/themeColor.
========================= */

const USER_GAME_PROFILES_SHEET =
  "UserGameProfiles";


function getLeaderboardUserProfile_(
  username,
  gameId
) {

  username =
    String(username || "")
      .trim();

  gameId =
    normalizeGameId_(
      gameId ||
      getDefaultGameId()
    );

  if (!username) {
    return {
      username: "",
      displayName: "",
      avatar: "",
      themeColor: ""
    };
  }

  const ss =
    SpreadsheetApp.getActive();

  const gameProfile =
    getUserGameProfileRow_(
      ss,
      username,
      gameId
    );

  if (gameProfile) {
    return {
      username: username,
      displayName:
        gameProfile.displayName ||
        username,
      avatar:
        gameProfile.avatar || "",
      themeColor:
        gameProfile.themeColor || ""
    };
  }

  const userProfile =
    getUserBaseProfileRow_(
      ss,
      username
    );

  if (userProfile) {
    return {
      username: username,
      displayName:
        userProfile.displayName ||
        userProfile.username ||
        username,
      avatar:
        userProfile.avatar || "",
      themeColor:
        userProfile.themeColor || ""
    };
  }

  return {
    username: username,
    displayName: username,
    avatar: "",
    themeColor: ""
  };

}


function getUserGameProfileRow_(
  ss,
  username,
  gameId
) {

  const sh =
    ss.getSheetByName(
      USER_GAME_PROFILES_SHEET
    );

  if (!sh) {
    return null;
  }

  const data =
    sh.getDataRange().getValues();

  if (data.length <= 1) {
    return null;
  }

  const headers =
    data[0].map(h =>
      String(h).trim()
    );

  const col = {
    username:
      headers.indexOf("Username"),
    gameId:
      headers.indexOf("GameId"),
    displayName:
      headers.indexOf("DisplayName"),
    profileName:
      headers.indexOf("ProfileName"),
    avatar:
      headers.indexOf("Avatar"),
    themeColor:
      headers.indexOf("ThemeColor")
  };

  if (
    col.username < 0 ||
    col.gameId < 0
  ) {
    return null;
  }

  const usernameKey =
    username.toLowerCase();

  const gameIdKey =
    normalizeGameId_(gameId);

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    const rowUsername =
      String(row[col.username] || "")
        .trim()
        .toLowerCase();

    const rowGameId =
      normalizeGameId_(
        row[col.gameId]
      );

    if (
      rowUsername !== usernameKey ||
      rowGameId !== gameIdKey
    ) {
      continue;
    }

    const displayName =
      col.displayName >= 0
        ? String(row[col.displayName] || "").trim()
        : col.profileName >= 0
          ? String(row[col.profileName] || "").trim()
          : "";

    return {
      username: username,
      gameId: gameId,
      displayName: displayName,
      avatar:
        col.avatar >= 0
          ? String(row[col.avatar] || "").trim()
          : "",
      themeColor:
        col.themeColor >= 0
          ? String(row[col.themeColor] || "").trim()
          : ""
    };

  }

  return null;

}


function getUserBaseProfileRow_(
  ss,
  username
) {

  const sh =
    ss.getSheetByName("Users");

  if (!sh) {
    return null;
  }

  const data =
    sh.getDataRange().getValues();

  if (data.length <= 1) {
    return null;
  }

  const headers =
    data[0].map(h =>
      String(h).trim()
    );

  const col = {
    username:
      headers.indexOf("Username"),
    displayName:
      headers.indexOf("DisplayName"),
    profileName:
      headers.indexOf("ProfileName"),
    avatar:
      headers.indexOf("Avatar"),
    themeColor:
      headers.indexOf("ThemeColor")
  };

  if (col.username < 0) {
    return null;
  }

  const usernameKey =
    String(username || "")
      .trim()
      .toLowerCase();

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    const rowUsername =
      String(row[col.username] || "")
        .trim();

    if (
      rowUsername.toLowerCase() !==
      usernameKey
    ) {
      continue;
    }

    const displayName =
      col.displayName >= 0
        ? String(row[col.displayName] || "").trim()
        : col.profileName >= 0
          ? String(row[col.profileName] || "").trim()
          : "";

    return {
      username: rowUsername,
      displayName: displayName,
      avatar:
        col.avatar >= 0
          ? String(row[col.avatar] || "").trim()
          : "",
      themeColor:
        col.themeColor >= 0
          ? String(row[col.themeColor] || "").trim()
          : ""
    };

  }

  return null;

}


function decorateLeaderboardRowsWithProfiles_(
  leaderboard,
  gameId
) {

  leaderboard =
    Array.isArray(leaderboard)
      ? leaderboard
      : [];

  gameId =
    normalizeGameId_(
      gameId ||
      getDefaultGameId()
    );

  return leaderboard.map(function(row) {

    const username =
      row.username ||
      row.Username ||
      row.user ||
      row.User ||
      "";

    const profile =
      getLeaderboardUserProfile_(
        username,
        gameId
      );

    return Object.assign(
      {},
      row,
      {
        username:
          profile.username,
        displayName:
          profile.displayName,
        avatar:
          profile.avatar,
        themeColor:
          profile.themeColor
      }
    );

  });

}
