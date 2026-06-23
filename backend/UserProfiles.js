/* =========================
   USER PROFILE DISPLAY HELPERS
   DROP-IN FILE: backend/UserProfiles.gs

   Uses:
   1) UserGameProfiles for selected GameId
   2) Users fallback
   3) raw Username fallback

   Supports the newer Profile page columns:
   - DisplayName
   - AvatarType
   - AvatarInitials
   - AvatarEmoji
   - AvatarUrl
   - AvatarFileId
   - ProfileColor

   Also supports older columns:
   - Avatar
   - ThemeColor

   IMPORTANT:
   Picks.Username stays as the real account key.
   This file only controls display profile fields.
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
      avatarType: "",
      avatarInitials: "",
      avatarEmoji: "",
      avatarUrl: "",
      avatarFileId: "",
      themeColor: "",
      profileColor: ""
    };
  }

  const ss =
    SpreadsheetApp.getActive();

  const baseProfile =
    getLeaderboardBaseProfileRow_(
      ss,
      username
    ) || {};

  const gameProfile =
    getLeaderboardGameProfileRow_(
      ss,
      username,
      gameId
    ) || {};

  const merged =
    mergeLeaderboardProfiles_(
      baseProfile,
      gameProfile
    );

  const displayName =
    merged.displayName ||
    merged.profileName ||
    username;

  const profileColor =
    merged.profileColor ||
    merged.themeColor ||
    "#354785";

  const avatar =
    buildLeaderboardAvatarValue_(
      merged,
      displayName,
      username
    );

  return {
    username:
      username,

    displayName:
      displayName,

    avatar:
      avatar,

    avatarType:
      merged.avatarType || "",

    avatarInitials:
      merged.avatarInitials || "",

    avatarEmoji:
      merged.avatarEmoji || "",

    avatarUrl:
      merged.avatarUrl || "",

    avatarFileId:
      merged.avatarFileId || "",

    themeColor:
      profileColor,

    profileColor:
      profileColor
  };

}


function getLeaderboardGameProfileRow_(
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
      String(h || "").trim()
    );

  const col =
    getLeaderboardProfileColumnMap_(
      headers
    );

  if (
    col.Username < 0 ||
    col.GameId < 0
  ) {
    return null;
  }

  const usernameKey =
    String(username || "")
      .trim()
      .toLowerCase();

  const gameIdKey =
    normalizeGameId_(gameId);

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    const rowUsername =
      String(row[col.Username] || "")
        .trim()
        .toLowerCase();

    const rowGameId =
      normalizeGameId_(
        row[col.GameId]
      );

    if (
      rowUsername !== usernameKey ||
      rowGameId !== gameIdKey
    ) {
      continue;
    }

    return buildLeaderboardProfileObject_(
      row,
      col
    );

  }

  return null;

}


function getLeaderboardBaseProfileRow_(
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
      String(h || "").trim()
    );

  const col =
    getLeaderboardProfileColumnMap_(
      headers
    );

  if (col.Username < 0) {
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
      String(row[col.Username] || "")
        .trim()
        .toLowerCase();

    if (rowUsername !== usernameKey) {
      continue;
    }

    return buildLeaderboardProfileObject_(
      row,
      col
    );

  }

  return null;

}


function getLeaderboardProfileColumnMap_(
  headers
) {

  const names = [
    "Username",
    "GameId",
    "DisplayName",
    "ProfileName",
    "Avatar",
    "AvatarType",
    "AvatarInitials",
    "AvatarEmoji",
    "AvatarUrl",
    "AvatarFileId",
    "ThemeColor",
    "ProfileColor"
  ];

  const col = {};

  names.forEach(function(name) {
    col[name] =
      headers.indexOf(name);
  });

  return col;

}


function buildLeaderboardProfileObject_(
  row,
  col
) {

  function read(header) {

    return col[header] >= 0
      ? String(row[col[header]] || "").trim()
      : "";

  }

  return {
    username:
      read("Username"),

    gameId:
      read("GameId"),

    displayName:
      read("DisplayName"),

    profileName:
      read("ProfileName"),

    avatar:
      read("Avatar"),

    avatarType:
      read("AvatarType"),

    avatarInitials:
      read("AvatarInitials"),

    avatarEmoji:
      read("AvatarEmoji"),

    avatarUrl:
      read("AvatarUrl"),

    avatarFileId:
      read("AvatarFileId"),

    themeColor:
      read("ThemeColor"),

    profileColor:
      read("ProfileColor")
  };

}


function mergeLeaderboardProfiles_(
  baseProfile,
  gameProfile
) {

  const merged = {};

  [
    "username",
    "gameId",
    "displayName",
    "profileName",
    "avatar",
    "avatarType",
    "avatarInitials",
    "avatarEmoji",
    "avatarUrl",
    "avatarFileId",
    "themeColor",
    "profileColor"
  ].forEach(function(key) {

    merged[key] =
      baseProfile && baseProfile[key]
        ? baseProfile[key]
        : "";

    if (
      gameProfile &&
      gameProfile[key] !== undefined &&
      gameProfile[key] !== null &&
      String(gameProfile[key]).trim() !== ""
    ) {
      merged[key] =
        gameProfile[key];
    }

  });

  return merged;

}


function buildLeaderboardAvatarValue_(
  profile,
  displayName,
  username
) {

  profile =
    profile || {};

  const avatarType =
    String(profile.avatarType || "")
      .trim()
      .toLowerCase();

  if (
    avatarType === "url" &&
    profile.avatarUrl
  ) {
    return profile.avatarUrl;
  }

  if (
    avatarType === "upload" &&
    profile.avatarUrl
  ) {
    return profile.avatarUrl;
  }

  if (
    avatarType === "upload" &&
    profile.avatarFileId
  ) {
    return "https://drive.google.com/thumbnail?id=" +
      encodeURIComponent(profile.avatarFileId) +
      "&sz=w160-h160";
  }

  if (
    avatarType === "emoji" &&
    profile.avatarEmoji
  ) {
    return profile.avatarEmoji;
  }

  if (
    avatarType === "initials" &&
    profile.avatarInitials
  ) {
    return profile.avatarInitials;
  }

  if (profile.avatar) {
    return profile.avatar;
  }

  if (profile.avatarEmoji) {
    return profile.avatarEmoji;
  }

  if (profile.avatarInitials) {
    return profile.avatarInitials;
  }

  return buildLeaderboardInitials_(
    displayName ||
    username
  );

}


function buildLeaderboardInitials_(
  value
) {

  value =
    String(value || "")
      .trim();

  if (!value) {
    return "👤";
  }

  const parts =
    value
      .split(/\s+/)
      .filter(Boolean);

  if (!parts.length) {
    return "👤";
  }

  return parts
    .slice(0, 2)
    .map(function(part) {
      return part.charAt(0).toUpperCase();
    })
    .join("");

}

/* =========================
   LEADERBOARD ROW DECORATOR
   Compatibility helper for Scoring.gs
========================= */

function decorateLeaderboardRowsWithProfiles_(
  leaderboard,
  gameId
) {

  leaderboard =
    Array.isArray(leaderboard)
      ? leaderboard
      : [];

  let resolvedGameId =
    gameId ||
    (
      typeof getDefaultGameId === "function"
        ? getDefaultGameId()
        : ""
    );

  if (
    typeof normalizeGameId_ === "function"
  ) {

    resolvedGameId =
      normalizeGameId_(
        resolvedGameId
      );

  } else if (
    typeof normalizeScoreGameId_ === "function"
  ) {

    resolvedGameId =
      normalizeScoreGameId_(
        resolvedGameId
      );

  }

  return leaderboard.map(function(row) {

    row =
      row || {};

    const username =
      row.username ||
      row.user ||
      row.Username ||
      row.User ||
      "";

    const profile =
      getLeaderboardUserProfile_(
        username,
        resolvedGameId
      ) || {};

    return Object.assign(
      {},
      row,
      {
        user:
          username,

        username:
          username,

        displayName:
          profile.displayName ||
          row.displayName ||
          username,

        avatar:
          profile.avatar ||
          row.avatar ||
          "👤",

        avatarType:
          profile.avatarType ||
          row.avatarType ||
          "",

        avatarInitials:
          profile.avatarInitials ||
          row.avatarInitials ||
          "",

        avatarEmoji:
          profile.avatarEmoji ||
          row.avatarEmoji ||
          "",

        avatarUrl:
          profile.avatarUrl ||
          row.avatarUrl ||
          "",

        avatarFileId:
          profile.avatarFileId ||
          row.avatarFileId ||
          "",

        themeColor:
          profile.themeColor ||
          profile.profileColor ||
          row.themeColor ||
          row.profileColor ||
          "#354785",

        profileColor:
          profile.profileColor ||
          profile.themeColor ||
          row.profileColor ||
          row.themeColor ||
          "#354785"
      }
    );

  });

}
