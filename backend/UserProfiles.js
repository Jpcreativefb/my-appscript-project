/* =========================
   USER PROFILE DISPLAY HELPERS
   REPLACE FILE: backend/UserProfiles.gs

   This version matches your NEW Profile page system.

   Your profile engine stores:
   - Users:
     DisplayName, AvatarType, AvatarInitials, AvatarEmoji,
     AvatarUrl, AvatarFileId, ProfileColor
   - UserGameProfiles:
     GameId, Username, DisplayName, AvatarType, AvatarInitials,
     AvatarEmoji, AvatarUrl, AvatarFileId, ProfileColor

   Leaderboard lookup order:
   1) UserGameProfiles for selected GameId
   2) Users fallback
   3) raw Username fallback
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
    normalizeLeaderboardProfileGameId_(
      gameId ||
      getDefaultGameId()
    );

  if (!username) {
    return getLeaderboardProfileFallback_(
      "",
      gameId
    );
  }

  /*
    Best path:
    Use the real ProfileEngine function if it exists.
    This keeps leaderboard in sync with the Profile page.
  */
  if (
    typeof apiGetEditableProfile ===
    "function"
  ) {

    try {

      const response =
        apiGetEditableProfile(
          username,
          gameId
        );

      if (
        response &&
        response.success !== false &&
        response.profile
      ) {

        return normalizeLeaderboardProfileResult_(
          username,
          gameId,
          response.profile
        );

      }

    } catch (err) {

      Logger.log(
        "Leaderboard profile engine lookup failed for " +
        username +
        ": " +
        (
          err && err.message
            ? err.message
            : String(err)
        )
      );

    }

  }

  /*
    Fallback path:
    Read sheets directly if ProfileEngine is unavailable.
  */
  const ss =
    SpreadsheetApp.getActive();

  const gameProfile =
    getUserGameProfileRow_(
      ss,
      username,
      gameId
    );

  if (gameProfile) {
    return normalizeLeaderboardProfileResult_(
      username,
      gameId,
      gameProfile
    );
  }

  const userProfile =
    getUserBaseProfileRow_(
      ss,
      username
    );

  if (userProfile) {
    return normalizeLeaderboardProfileResult_(
      username,
      gameId,
      userProfile
    );
  }

  return getLeaderboardProfileFallback_(
    username,
    gameId
  );

}


function normalizeLeaderboardProfileResult_(
  username,
  gameId,
  profile
) {

  profile =
    profile || {};

  const displayName =
    String(
      profile.displayName ||
      profile.profileName ||
      profile.DisplayName ||
      profile.ProfileName ||
      username ||
      ""
    ).trim();

  const profileColor =
    String(
      profile.profileColor ||
      profile.themeColor ||
      profile.ProfileColor ||
      profile.ThemeColor ||
      ""
    ).trim();

  return {
    username:
      username,

    gameId:
      gameId,

    displayName:
      displayName ||
      username,

    avatar:
      buildLeaderboardAvatarValue_(
        profile,
        displayName || username
      ),

    themeColor:
      profileColor ||
      "#354785",

    profileColor:
      profileColor ||
      "#354785",

    profileColorMode:
      String(
        profile.profileColorMode ||
        profile.ProfileColorMode ||
        "solid"
      ).trim().toLowerCase() === "gradient"
        ? "gradient"
        : "solid",

    profileColor2:
      String(
        profile.profileColor2 ||
        profile.ProfileColor2 ||
        "#354785"
      ).trim() || "#354785",

    profileGradientAngle:
      String(
        profile.profileGradientAngle ||
        profile.ProfileGradientAngle ||
        "135"
      ).trim() || "135",

    avatarType:
      profile.avatarType ||
      profile.AvatarType ||
      "",

    avatarUrl:
      profile.avatarUrl ||
      profile.AvatarUrl ||
      "",

    avatarEmoji:
      profile.avatarEmoji ||
      profile.AvatarEmoji ||
      "",

    avatarInitials:
      profile.avatarInitials ||
      profile.AvatarInitials ||
      ""
  };

}


function buildLeaderboardAvatarValue_(
  profile,
  nameForInitials
) {

  profile =
    profile || {};

  const avatarType =
    String(
      profile.avatarType ||
      profile.AvatarType ||
      ""
    )
      .trim()
      .toLowerCase();

  const avatarUrl =
    String(
      profile.avatarUrl ||
      profile.AvatarUrl ||
      ""
    ).trim();

  const avatarEmoji =
    String(
      profile.avatarEmoji ||
      profile.AvatarEmoji ||
      ""
    ).trim();

  const avatarInitials =
    String(
      profile.avatarInitials ||
      profile.AvatarInitials ||
      ""
    ).trim();

  if (
    (
      avatarType === "url" ||
      avatarType === "upload"
    ) &&
    avatarUrl
  ) {
    return avatarUrl;
  }

  if (
    avatarType === "emoji" &&
    avatarEmoji
  ) {
    return avatarEmoji;
  }

  if (
    avatarType === "initials" &&
    avatarInitials
  ) {
    return avatarInitials;
  }

  if (avatarUrl) {
    return avatarUrl;
  }

  if (avatarEmoji) {
    return avatarEmoji;
  }

  if (avatarInitials) {
    return avatarInitials;
  }

  return buildLeaderboardInitials_(
    nameForInitials
  );

}


function buildLeaderboardInitials_(
  value
) {

  const words =
    String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (!words.length) {
    return "👤";
  }

  if (words.length === 1) {

    return words[0]
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 2)
      .toUpperCase() || "👤";

  }

  return (
    words[0].charAt(0) +
    words[words.length - 1].charAt(0)
  )
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase() || "👤";

}


function getLeaderboardProfileFallback_(
  username,
  gameId
) {

  username =
    String(username || "")
      .trim();

  return {
    username:
      username,
    gameId:
      gameId || "",
    displayName:
      username || "Player",
    avatar:
      buildLeaderboardInitials_(username),
    themeColor:
      "#354785",
    profileColor:
      "#354785",
    profileColorMode:
      "solid",
    profileColor2:
      "#354785",
    profileGradientAngle:
      "135"
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
    sh.getDataRange()
      .getValues();

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
    normalizeLeaderboardProfileGameId_(
      gameId
    );

  for (let i = 1; i < data.length; i++) {

    const row =
      data[i];

    const rowUsername =
      String(row[col.Username] || "")
        .trim()
        .toLowerCase();

    const rowGameId =
      normalizeLeaderboardProfileGameId_(
        row[col.GameId]
      );

    if (
      rowUsername !== usernameKey ||
      rowGameId !== gameIdKey
    ) {
      continue;
    }

    return leaderboardProfileRowToObject_(
      row,
      col,
      username,
      gameId
    );

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
    sh.getDataRange()
      .getValues();

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
        .trim();

    if (
      rowUsername.toLowerCase() !==
      usernameKey
    ) {
      continue;
    }

    return leaderboardProfileRowToObject_(
      row,
      col,
      rowUsername || username,
      ""
    );

  }

  return null;

}


function leaderboardProfileRowToObject_(
  row,
  col,
  username,
  gameId
) {

  return {
    username:
      username,
    gameId:
      gameId || "",
    displayName:
      getLeaderboardProfileCell_(
        row,
        col.DisplayName
      ) ||
      getLeaderboardProfileCell_(
        row,
        col.ProfileName
      ),
    profileName:
      getLeaderboardProfileCell_(
        row,
        col.ProfileName
      ),
    avatar:
      getLeaderboardProfileCell_(
        row,
        col.Avatar
      ),
    themeColor:
      getLeaderboardProfileCell_(
        row,
        col.ThemeColor
      ),
    profileColor:
      getLeaderboardProfileCell_(
        row,
        col.ProfileColor
      ),
    avatarType:
      getLeaderboardProfileCell_(
        row,
        col.AvatarType
      ),
    avatarInitials:
      getLeaderboardProfileCell_(
        row,
        col.AvatarInitials
      ),
    avatarEmoji:
      getLeaderboardProfileCell_(
        row,
        col.AvatarEmoji
      ),
    avatarUrl:
      getLeaderboardProfileCell_(
        row,
        col.AvatarUrl
      ),
    avatarFileId:
      getLeaderboardProfileCell_(
        row,
        col.AvatarFileId
      )
  };

}


function getLeaderboardProfileCell_(
  row,
  index
) {

  if (index < 0) {
    return "";
  }

  return String(row[index] || "")
    .trim();

}


function getLeaderboardProfileColumnMap_(
  headers
) {

  const map = {};

  headers.forEach(function(header, index) {
    map[header] = index;
  });

  [
    "Username",
    "GameId",
    "DisplayName",
    "ProfileName",
    "Avatar",
    "ThemeColor",
    "ProfileColor",
    "AvatarType",
    "AvatarInitials",
    "AvatarEmoji",
    "AvatarUrl",
    "AvatarFileId"
  ].forEach(function(header) {

    if (map[header] === undefined) {
      map[header] = -1;
    }

  });

  return map;

}


function normalizeLeaderboardProfileGameId_(
  value
) {

  if (
    typeof normalizeGameId_ ===
    "function"
  ) {

    return normalizeGameId_(value);

  }

  if (
    typeof normalizeScoreGameId_ ===
    "function"
  ) {

    return normalizeScoreGameId_(value);

  }

  return String(value || "")
    .trim();

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
    normalizeLeaderboardProfileGameId_(
      gameId ||
      getDefaultGameId()
    );

  return leaderboard.map(function(row) {

    row =
      row || {};

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
        user:
          username,
        username:
          username,
        displayName:
          profile.displayName ||
          username,
        avatar:
          profile.avatar ||
          "👤",
        themeColor:
          profile.themeColor ||
          profile.profileColor ||
          "#354785",
        profileColor:
          profile.profileColor ||
          profile.themeColor ||
          "#354785",
        profileColorMode:
          profile.profileColorMode || "solid",
        profileColor2:
          profile.profileColor2 || "#354785",
        profileGradientAngle:
          profile.profileGradientAngle || "135"
      }
    );

  });

}
