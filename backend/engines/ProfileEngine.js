/* =====================================================
   PROFILE ENGINE
   General profile + optional per-game profile overrides
   Supports avatar initials, emoji, image URL, and Drive upload

   Sheets:
   - Users: stores the general/default profile
   - UserGameProfiles: stores per-game overrides
===================================================== */

const PROFILE_ENGINE_USERS_SHEET = "Users";
const PROFILE_ENGINE_GAME_PROFILE_SHEET = "UserGameProfiles";
const PROFILE_ENGINE_SCOPED_PROFILE_SHEET = "UserProfileScopes";
const PROFILE_ENGINE_AVATAR_FOLDER_NAME = "Awards App Profile Avatars";
const PROFILE_ENGINE_MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const PROFILE_ENGINE_USER_PROFILE_HEADERS = [
  "DisplayName",
  "RealName",
  "AvatarType",
  "AvatarInitials",
  "AvatarEmoji",
  "AvatarUrl",
  "AvatarFileId",
  "ProfileColor",
  "ProfileColorMode",
  "ProfileColor2",
  "ProfileGradientAngle",
  "Bio",
  "ProfileUpdatedAt"
];

const PROFILE_ENGINE_GAME_PROFILE_HEADERS = [
  "GameId",
  "Username",
  "DisplayName",
  "RealName",
  "AvatarType",
  "AvatarInitials",
  "AvatarEmoji",
  "AvatarUrl",
  "AvatarFileId",
  "ProfileColor",
  "ProfileColorMode",
  "ProfileColor2",
  "ProfileGradientAngle",
  "Bio",
  "ProfilePromptCompleted",
  "UpdatedAt"
];

const PROFILE_ENGINE_SCOPED_PROFILE_HEADERS = [
  "ProfileScopeKey",
  "Username",
  "ProfileScopeLabel",
  "DisplayName",
  "RealName",
  "AvatarType",
  "AvatarInitials",
  "AvatarEmoji",
  "AvatarUrl",
  "AvatarFileId",
  "ProfileColor",
  "ProfileColorMode",
  "ProfileColor2",
  "ProfileGradientAngle",
  "Bio",
  "ProfilePromptCompleted",
  "UpdatedAt"
];

const PROFILE_ENGINE_FIELD_MAP = [
  {
    key: "displayName",
    header: "DisplayName"
  },
  {
    key: "realName",
    header: "RealName"
  },
  {
    key: "avatarType",
    header: "AvatarType"
  },
  {
    key: "avatarInitials",
    header: "AvatarInitials"
  },
  {
    key: "avatarEmoji",
    header: "AvatarEmoji"
  },
  {
    key: "avatarUrl",
    header: "AvatarUrl"
  },
  {
    key: "avatarFileId",
    header: "AvatarFileId"
  },
  {
    key: "profileColor",
    header: "ProfileColor"
  },
  {
    key: "profileColorMode",
    header: "ProfileColorMode"
  },
  {
    key: "profileColor2",
    header: "ProfileColor2"
  },
  {
    key: "profileGradientAngle",
    header: "ProfileGradientAngle"
  },
  {
    key: "bio",
    header: "Bio"
  }
];

/* =====================================================
   PUBLIC API FUNCTIONS
===================================================== */

function apiGetEditableProfile(
  username,
  gameId
) {

  username = profileNormalizeUsername_(username);
  gameId = profileNormalizeGameId_(gameId);

  if (!username) {
    return { success: false, message: "Missing username" };
  }

  profileEnsureSchema_();

  const generalProfile = profileGetGeneralProfile_(username);
  const config = profileGetGameProfileConfig_(gameId);

  let gameProfile = {};
  let scopedProfile = {};
  let promptCompleted = true;

  if (gameId && config.mode === "game") {
    gameProfile = profileGetGameProfile_(username, gameId);
    promptCompleted = profileGamePromptCompleted_(gameProfile);
  } else if (gameId && config.mode === "season") {
    scopedProfile = profileGetScopedProfile_(username, config.scopeKey);
    promptCompleted = profileScopedPromptCompleted_(scopedProfile);
  }

  const effectiveOverride =
    config.mode === "game"
      ? gameProfile
      : config.mode === "season"
        ? scopedProfile
        : {};

  const profile = profileMergeProfiles_(
    username,
    gameId,
    generalProfile,
    effectiveOverride
  );

  profile.profileMode = config.mode;
  profile.profileScopeKey = config.scopeKey || "";
  profile.profileScopeLabel = config.scopeLabel || "";

  return {
    success: true,
    profile: profile,
    generalProfile: generalProfile,
    gameProfile: gameProfile,
    scopedProfile: scopedProfile,
    profileMode: config.mode,
    profileScopeKey: config.scopeKey || "",
    profileScopeLabel: config.scopeLabel || "",
    profileScopeLocked: config.mode === "general",
    gameProfilePromptCompleted: promptCompleted,
    reusableProfiles: profileGetReusableProfiles_(username)
  };

}

function apiSaveEditableProfile(
  payload
) {

  payload = payload || {};

  const username = profileNormalizeUsername_(payload.username);
  const gameId = profileNormalizeGameId_(payload.gameId);
  const scope = String(payload.scope || "general").trim().toLowerCase();
  const scopeKey = profileNormalizeScopeKey_(payload.profileScopeKey);

  if (!username) {
    return { success: false, message: "Missing username" };
  }

  if (["general", "game", "season"].indexOf(scope) === -1) {
    return { success: false, message: "Invalid profile scope" };
  }

  if (scope === "game" && !gameId) {
    return { success: false, message: "Missing gameId for game profile" };
  }

  if (scope === "season" && !scopeKey) {
    return { success: false, message: "Missing league / season profile key" };
  }

  profileEnsureSchema_();

  const cleanProfile = profileCleanInput_(payload);

  if (scope === "general") {
    const updated = profileSaveGeneralProfile_(username, cleanProfile);
    if (!updated.success) return updated;
  } else if (scope === "game") {
    profileSaveGameProfile_(username, gameId, cleanProfile);
    profileSetGamePromptCompleted_(username, gameId, true);
  } else {
    profileSaveScopedProfile_(
      username,
      scopeKey,
      profileLimit_(payload.profileScopeLabel, 80),
      cleanProfile
    );
    profileSetScopedPromptCompleted_(username, scopeKey, true);
  }

  if (typeof clearAppCaches === "function") {
    clearAppCaches();
  }

  return apiGetEditableProfile(username, gameId);

}

function apiSetGameProfilePromptChoice(
  payload
) {

  payload = payload || {};

  const username = profileNormalizeUsername_(payload.username);
  const gameId = profileNormalizeGameId_(payload.gameId);
  const choice = String(payload.choice || "general").trim().toLowerCase();

  if (!username) return { success: false, message: "Missing username" };
  if (!gameId) return { success: false, message: "Missing gameId" };
  if (["general", "custom"].indexOf(choice) === -1) {
    return { success: false, message: "Invalid profile choice" };
  }

  profileEnsureSchema_();

  const config = profileGetGameProfileConfig_(gameId);

  if (config.mode === "game") {
    profileSetGamePromptCompleted_(username, gameId, true);
  } else if (config.mode === "season" && config.scopeKey) {
    profileSetScopedPromptCompleted_(username, config.scopeKey, true);
  }

  return {
    success: true,
    gameId: gameId,
    username: username,
    choice: choice,
    profileMode: config.mode,
    profileScopeKey: config.scopeKey || "",
    profileScopeLabel: config.scopeLabel || "",
    promptCompleted: true
  };

}

function apiGetReusableProfiles(username) {
  username = profileNormalizeUsername_(username);
  if (!username) return { success: false, message: "Missing username", profiles: [] };
  profileEnsureSchema_();
  return {
    success: true,
    profiles: profileGetReusableProfiles_(username)
  };
}

function apiUploadProfileAvatar(
  payload
) {

  payload =
    payload || {};

  const username =
    profileNormalizeUsername_(
      payload.username
    );

  if (!username) {

    return {
      success: false,
      message: "Missing username"
    };

  }

  const dataUrl =
    String(
      payload.dataUrl || ""
    );

  const mimeType =
    String(
      payload.mimeType || ""
    )
      .trim()
      .toLowerCase();

  const allowed = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif"
  };

  if (!allowed[mimeType]) {

    return {
      success: false,
      message: "Avatar must be a JPG, PNG, WEBP, or GIF image."
    };

  }

  const match =
    dataUrl.match(
      /^data:image\/(jpeg|jpg|png|webp|gif);base64,(.+)$/i
    );

  if (!match) {

    return {
      success: false,
      message: "Invalid avatar image data."
    };

  }

  const bytes =
    Utilities.base64Decode(
      match[2]
    );

  if (
    bytes.length >
    PROFILE_ENGINE_MAX_AVATAR_BYTES
  ) {

    return {
      success: false,
      message: "Avatar image must be 2 MB or smaller."
    };

  }

  const folder =
    profileGetAvatarFolder_();

  const gameId =
    profileNormalizeGameId_(
      payload.gameId
    );

  const stamp =
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "yyyyMMdd-HHmmss"
    );

  const extension =
    allowed[mimeType];

  const safeName =
    [
      "avatar",
      username,
      gameId || "general",
      stamp
    ]
      .join("-")
      .replace(/[^a-z0-9\-]+/gi, "-")
      .replace(/\-+/g, "-") +
      "." +
      extension;

  const blob =
    Utilities.newBlob(
      bytes,
      mimeType,
      safeName
    );

  const file =
    folder.createFile(
      blob
    );

  try {

    file.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW
    );

  } catch (err) {

    Logger.log(
      "Avatar sharing warning: " + err.message
    );

  }

  const fileId =
    file.getId();

  const avatarUrl =
    "https://drive.google.com/thumbnail?id=" +
    encodeURIComponent(fileId) +
    "&sz=w400";

  return {
    success: true,
    avatarType: "upload",
    avatarUrl: avatarUrl,
    avatarFileId: fileId
  };

}

function profileEnsureSchema() {

  profileEnsureSchema_();

  return {
    success: true,
    message: "Profile schema ready"
  };

}

/* =====================================================
   OPTIONAL POST HANDLER
   Use from backend/Api.js doPost(e): return profileDoPost(e);
===================================================== */

function profileDoPost(
  e
) {

  const body =
    e &&
    e.postData &&
    e.postData.contents
      ? e.postData.contents
      : "{}";

  const payload =
    JSON.parse(
      body
    );

  const action =
    String(
      payload.action || ""
    )
      .trim();

  if (action === "uploadProfileAvatar") {

    return json(
      apiUploadProfileAvatar(
        payload
      )
    );

  }

  return json({
    success: false,
    message: "Unknown POST action"
  });

}


function profileGetGameProfileConfig_(gameId) {

  gameId = profileNormalizeGameId_(gameId);

  if (!gameId || typeof getGame !== "function") {
    return {
      mode: "general",
      scopeKey: "",
      scopeLabel: "General Profile"
    };
  }

  const game = getGame(gameId) || {};
  let mode = String(
    game.playerProfileScope ||
    game.profileScope ||
    "game"
  ).trim().toLowerCase();

  if (["general", "season", "game"].indexOf(mode) === -1) {
    mode = "game";
  }

  const scopeKey = mode === "season"
    ? profileNormalizeScopeKey_(
        game.playerProfileGroupKey ||
        game.profileScopeKey ||
        game.parentGameId ||
        ""
      )
    : "";

  const scopeLabel = mode === "season"
    ? String(
        game.playerProfileGroupLabel ||
        game.profileScopeLabel ||
        game.playerProfileGroupKey ||
        game.name ||
        "League / Season Profile"
      ).trim()
    : mode === "game"
      ? String(game.name || game.gameId || "Game Profile").trim()
      : "General Profile";

  // A season scope without a shared key cannot actually share across games.
  if (mode === "season" && !scopeKey) {
    mode = "game";
  }

  return {
    mode: mode,
    scopeKey: mode === "season" ? scopeKey : "",
    scopeLabel: scopeLabel
  };
}

function profileNormalizeScopeKey_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9:_\-\.]/g, "")
    .slice(0, 120);
}

function profileGetScopedProfilesSheet_() {
  return profileGetOrCreateSheet_(
    PROFILE_ENGINE_SCOPED_PROFILE_SHEET,
    PROFILE_ENGINE_SCOPED_PROFILE_HEADERS
  );
}

function profileGetScopedProfile_(username, scopeKey) {

  username = profileNormalizeUsername_(username);
  scopeKey = profileNormalizeScopeKey_(scopeKey);

  if (!username || !scopeKey) return {};

  const sh = profileGetScopedProfilesSheet_();
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return {};

  const headers = profileHeaders_(data[0]);
  const col = profileColumnMap_(headers);

  const row = data.slice(1).find(function(r) {
    return (
      profileNormalizeUsername_(r[col.Username]) === username &&
      profileNormalizeScopeKey_(r[col.ProfileScopeKey]) === scopeKey
    );
  });

  if (!row) return {};

  const profile = profileRowToProfile_(row, col);
  profile.username = username;
  profile.scope = "season";
  profile.profileScopeKey = scopeKey;
  profile.profileScopeLabel =
    col.ProfileScopeLabel > -1
      ? String(row[col.ProfileScopeLabel] || "").trim()
      : "";
  profile.promptCompleted =
    col.ProfilePromptCompleted > -1
      ? profileBoolean_(row[col.ProfilePromptCompleted])
      : false;

  return profile;
}

function profileScopedPromptCompleted_(profile) {
  profile = profile || {};
  if (profile.promptCompleted === true) return true;
  return PROFILE_ENGINE_FIELD_MAP.some(function(field) {
    return String(profile[field.key] || "").trim() !== "";
  });
}

function profileSetScopedPromptCompleted_(username, scopeKey, completed) {

  username = profileNormalizeUsername_(username);
  scopeKey = profileNormalizeScopeKey_(scopeKey);
  if (!username || !scopeKey) return;

  const sh = profileGetScopedProfilesSheet_();
  const data = sh.getDataRange().getValues();
  const headers = profileHeaders_(data[0]);
  const col = profileColumnMap_(headers);
  let rowIndex = -1;

  if (data.length > 1) {
    data.slice(1).some(function(row, index) {
      if (
        profileNormalizeUsername_(row[col.Username]) === username &&
        profileNormalizeScopeKey_(row[col.ProfileScopeKey]) === scopeKey
      ) {
        rowIndex = index + 2;
        return true;
      }
      return false;
    });
  }

  if (rowIndex === -1) {
    const row = new Array(headers.length).fill("");
    row[col.ProfileScopeKey] = scopeKey;
    row[col.Username] = username;
    sh.appendRow(row);
    rowIndex = sh.getLastRow();
  }

  if (col.ProfilePromptCompleted > -1) {
    sh.getRange(rowIndex, col.ProfilePromptCompleted + 1).setValue(completed === true);
  }
  if (col.UpdatedAt > -1) {
    sh.getRange(rowIndex, col.UpdatedAt + 1).setValue(new Date());
  }

  SpreadsheetApp.flush();
}

function profileSaveScopedProfile_(username, scopeKey, scopeLabel, profile) {

  const sh = profileGetScopedProfilesSheet_();
  const data = sh.getDataRange().getValues();
  const headers = profileHeaders_(data[0]);
  const col = profileColumnMap_(headers);
  let rowIndex = -1;

  if (data.length > 1) {
    data.slice(1).some(function(row, index) {
      if (
        profileNormalizeUsername_(row[col.Username]) === username &&
        profileNormalizeScopeKey_(row[col.ProfileScopeKey]) === scopeKey
      ) {
        rowIndex = index + 2;
        return true;
      }
      return false;
    });
  }

  if (rowIndex === -1) {
    const row = new Array(headers.length).fill("");
    row[col.ProfileScopeKey] = scopeKey;
    row[col.Username] = username;
    sh.appendRow(row);
    rowIndex = sh.getLastRow();
  }

  if (col.ProfileScopeLabel > -1) {
    sh.getRange(rowIndex, col.ProfileScopeLabel + 1).setValue(scopeLabel || scopeKey);
  }

  profileSetProfileFields_(sh, rowIndex, col, profile);

  if (col.UpdatedAt > -1) {
    sh.getRange(rowIndex, col.UpdatedAt + 1).setValue(new Date());
  }

  SpreadsheetApp.flush();
}

function profileGetReusableProfiles_(username) {

  username = profileNormalizeUsername_(username);
  const profiles = [];

  const general = profileGetGeneralProfile_(username);
  profiles.push({
    sourceType: "general",
    sourceKey: "general",
    label: "My General Profile",
    profile: general
  });

  const scopedSheet = profileGetScopedProfilesSheet_();
  const scopedData = scopedSheet.getDataRange().getValues();
  if (scopedData.length > 1) {
    const headers = profileHeaders_(scopedData[0]);
    const col = profileColumnMap_(headers);

    scopedData.slice(1).forEach(function(row) {
      if (profileNormalizeUsername_(row[col.Username]) !== username) return;
      const profile = profileRowToProfile_(row, col);
      const key = profileNormalizeScopeKey_(row[col.ProfileScopeKey]);
      const label =
        col.ProfileScopeLabel > -1
          ? String(row[col.ProfileScopeLabel] || key || "League / Season Profile").trim()
          : key;
      profiles.push({
        sourceType: "season",
        sourceKey: key,
        label: label || key,
        profile: profile
      });
    });
  }

  const gameSheet = profileGetGameProfilesSheet_();
  const gameData = gameSheet.getDataRange().getValues();
  if (gameData.length > 1) {
    const headers = profileHeaders_(gameData[0]);
    const col = profileColumnMap_(headers);

    gameData.slice(1).forEach(function(row) {
      if (profileNormalizeUsername_(row[col.Username]) !== username) return;
      const gameId = profileNormalizeGameId_(row[col.GameId]);
      const profile = profileRowToProfile_(row, col);
      if (!PROFILE_ENGINE_FIELD_MAP.some(function(field) {
        return String(profile[field.key] || "").trim() !== "";
      })) return;

      let label = gameId;
      try {
        const game = typeof getGame === "function" ? getGame(gameId) : null;
        label = game && game.name ? game.name : gameId;
      } catch (err) {}

      profiles.push({
        sourceType: "game",
        sourceKey: gameId,
        label: label || gameId,
        profile: profile
      });
    });
  }

  return profiles;
}

/* =====================================================
   READ PROFILES
===================================================== */

function profileGetGeneralProfile_(
  username
) {

  const sh =
    profileGetUsersSheet_();

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {

    return profileDefaultProfile_(
      username,
      ""
    );

  }

  const headers =
    profileHeaders_(
      data[0]
    );

  const col =
    profileColumnMap_(
      headers
    );

  const usernameCol =
    col.Username;

  if (usernameCol === -1) {

    throw new Error(
      "Users sheet missing Username header"
    );

  }

  const rows =
    data.slice(1);

  const row =
    rows.find(r =>

      profileNormalizeUsername_(
        r[usernameCol]
      ) === username

    );

  if (!row) {

    return profileDefaultProfile_(
      username,
      ""
    );

  }

  const profile =
    profileRowToProfile_(
      row,
      col
    );

  profile.username =
    profileNormalizeUsername_(
      row[usernameCol]
    ) || username;

  profile.gameId = "";
  profile.scope = "general";

  profileApplyDefaults_(
    profile,
    username
  );

  return profile;

}

function profileGetGameProfile_(
  username,
  gameId
) {

  const sh =
    profileGetGameProfilesSheet_();

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length <= 1) {

    return {};

  }

  const headers =
    profileHeaders_(
      data[0]
    );

  const col =
    profileColumnMap_(
      headers
    );

  if (
    col.Username === -1 ||
    col.GameId === -1
  ) {

    throw new Error(
      "UserGameProfiles sheet missing Username or GameId"
    );

  }

  const rows =
    data.slice(1);

  const row =
    rows.find(r =>

      profileNormalizeUsername_(
        r[col.Username]
      ) === username &&
      profileNormalizeGameId_(
        r[col.GameId]
      ) === gameId

    );

  if (!row) {

    return {};

  }

  const profile =
    profileRowToProfile_(
      row,
      col
    );

  profile.username = username;
  profile.gameId = gameId;
  profile.scope = "game";
  profile.promptCompleted =
    col.ProfilePromptCompleted > -1
      ? profileBoolean_(row[col.ProfilePromptCompleted])
      : false;

  return profile;

}

function profileGamePromptCompleted_(gameProfile) {

  gameProfile = gameProfile || {};

  if (gameProfile.promptCompleted === true) {
    return true;
  }

  // Existing game-specific profiles predate the first-play prompt. If a
  // player already customized anything for this game, treat that choice as
  // complete instead of interrupting them with a retroactive prompt.
  return PROFILE_ENGINE_FIELD_MAP.some(function(field) {
    return String(gameProfile[field.key] || "").trim() !== "";
  });

}

function profileSetGamePromptCompleted_(username, gameId, completed) {

  const sh = profileGetGameProfilesSheet_();
  const data = sh.getDataRange().getValues();
  const headers = profileHeaders_(data[0]);
  const col = profileColumnMap_(headers);

  let rowIndex = -1;

  if (data.length > 1) {
    data.slice(1).some(function(row, index) {
      if (
        profileNormalizeUsername_(row[col.Username]) === username &&
        profileNormalizeGameId_(row[col.GameId]) === gameId
      ) {
        rowIndex = index + 2;
        return true;
      }
      return false;
    });
  }

  if (rowIndex === -1) {
    const row = new Array(headers.length).fill("");
    row[col.GameId] = gameId;
    row[col.Username] = username;
    sh.appendRow(row);
    rowIndex = sh.getLastRow();
  }

  if (col.ProfilePromptCompleted > -1) {
    sh.getRange(rowIndex, col.ProfilePromptCompleted + 1).setValue(completed === true);
  }

  if (col.UpdatedAt > -1) {
    sh.getRange(rowIndex, col.UpdatedAt + 1).setValue(new Date());
  }

  SpreadsheetApp.flush();

}

function profileBoolean_(value) {
  if (value === true || value === false) return value;
  const text = String(value || "").trim().toLowerCase();
  return ["true", "1", "yes", "y", "on"].indexOf(text) !== -1;
}

/* =====================================================
   SAVE PROFILES
===================================================== */

function profileSaveGeneralProfile_(
  username,
  profile
) {

  const sh =
    profileGetUsersSheet_();

  const data =
    sh.getDataRange()
      .getValues();

  if (data.length === 0) {

    return {
      success: false,
      message: "Users sheet empty"
    };

  }

  const headers =
    profileHeaders_(
      data[0]
    );

  const col =
    profileColumnMap_(
      headers
    );

  if (col.Username === -1) {

    return {
      success: false,
      message: "Users sheet missing Username header"
    };

  }

  let rowIndex = -1;

  data.slice(1).some((row, index) => {

    if (
      profileNormalizeUsername_(
        row[col.Username]
      ) === username
    ) {

      rowIndex = index + 2;
      return true;

    }

    return false;

  });

  if (rowIndex === -1) {

    return {
      success: false,
      message: "User not found"
    };

  }

  profileSetProfileFields_(
    sh,
    rowIndex,
    col,
    profile
  );

  if (col.ProfileUpdatedAt > -1) {

    sh.getRange(
      rowIndex,
      col.ProfileUpdatedAt + 1
    )
      .setValue(
        new Date()
      );

  }

  return {
    success: true
  };

}

function profileSaveGameProfile_(
  username,
  gameId,
  profile
) {

  const sh =
    profileGetGameProfilesSheet_();

  const data =
    sh.getDataRange()
      .getValues();

  const headers =
    profileHeaders_(
      data[0]
    );

  const col =
    profileColumnMap_(
      headers
    );

  let rowIndex = -1;

  if (data.length > 1) {

    data.slice(1).some((row, index) => {

      if (
        profileNormalizeUsername_(
          row[col.Username]
        ) === username &&
        profileNormalizeGameId_(
          row[col.GameId]
        ) === gameId
      ) {

        rowIndex = index + 2;
        return true;

      }

      return false;

    });

  }

  if (rowIndex === -1) {

    const row =
      new Array(headers.length)
        .fill("");

    row[col.GameId] = gameId;
    row[col.Username] = username;

    sh.appendRow(row);

    rowIndex =
      sh.getLastRow();

  }

  profileSetProfileFields_(
    sh,
    rowIndex,
    col,
    profile
  );

  if (col.UpdatedAt > -1) {

    sh.getRange(
      rowIndex,
      col.UpdatedAt + 1
    )
      .setValue(
        new Date()
      );

  }

}

/* =====================================================
   SCHEMA HELPERS
===================================================== */

function profileEnsureSchema_() {

  const usersSheet =
    profileGetUsersSheet_();

  profileEnsureColumns_(
    usersSheet,
    PROFILE_ENGINE_USER_PROFILE_HEADERS
  );

  const gameProfilesSheet =
    profileGetOrCreateSheet_(
      PROFILE_ENGINE_GAME_PROFILE_SHEET,
      PROFILE_ENGINE_GAME_PROFILE_HEADERS
    );

  profileEnsureColumns_(
    gameProfilesSheet,
    PROFILE_ENGINE_GAME_PROFILE_HEADERS
  );

  const scopedProfilesSheet =
    profileGetOrCreateSheet_(
      PROFILE_ENGINE_SCOPED_PROFILE_SHEET,
      PROFILE_ENGINE_SCOPED_PROFILE_HEADERS
    );

  profileEnsureColumns_(
    scopedProfilesSheet,
    PROFILE_ENGINE_SCOPED_PROFILE_HEADERS
  );

}

function profileGetUsersSheet_() {

  const sh =
    SpreadsheetApp
      .getActive()
      .getSheetByName(
        PROFILE_ENGINE_USERS_SHEET
      );

  if (!sh) {

    throw new Error(
      "Users sheet not found"
    );

  }

  return sh;

}

function profileGetGameProfilesSheet_() {

  return profileGetOrCreateSheet_(
    PROFILE_ENGINE_GAME_PROFILE_SHEET,
    PROFILE_ENGINE_GAME_PROFILE_HEADERS
  );

}

function profileGetOrCreateSheet_(
  sheetName,
  headers
) {

  const ss =
    SpreadsheetApp.getActive();

  let sh =
    ss.getSheetByName(
      sheetName
    );

  if (!sh) {

    sh =
      ss.insertSheet(
        sheetName
      );

    sh.getRange(
      1,
      1,
      1,
      headers.length
    )
      .setValues([
        headers
      ]);

    sh.setFrozenRows(1);

  }

  return sh;

}

function profileEnsureColumns_(
  sh,
  requiredHeaders
) {

  const lastColumn =
    Math.max(
      sh.getLastColumn(),
      1
    );

  let headers =
    profileHeaders_(
      sh.getRange(
        1,
        1,
        1,
        lastColumn
      )
        .getValues()[0]
    );

  if (
    headers.length === 1 &&
    !headers[0]
  ) {

    sh.getRange(
      1,
      1,
      1,
      requiredHeaders.length
    )
      .setValues([
        requiredHeaders
      ]);

    sh.setFrozenRows(1);
    return;

  }

  requiredHeaders.forEach(header => {

    if (headers.indexOf(header) === -1) {

      sh.getRange(
        1,
        sh.getLastColumn() + 1
      )
        .setValue(header);

      headers.push(header);

    }

  });

  sh.setFrozenRows(1);

}

/* =====================================================
   AVATAR / PROFILE HELPERS
===================================================== */

function profileGetAvatarFolder_() {

  const folders =
    DriveApp.getFoldersByName(
      PROFILE_ENGINE_AVATAR_FOLDER_NAME
    );

  if (folders.hasNext()) {

    return folders.next();

  }

  return DriveApp.createFolder(
    PROFILE_ENGINE_AVATAR_FOLDER_NAME
  );

}

function profileDefaultProfile_(
  username,
  gameId
) {

  const profile = {
    username: username,
    gameId: gameId || "",
    displayName: username,
    realName: "",
    avatarType: "initials",
    avatarInitials: "",
    avatarEmoji: "🏆",
    avatarUrl: "",
    avatarFileId: "",
    profileColor: "#facc15",
    profileColorMode: "solid",
    profileColor2: "#354785",
    profileGradientAngle: "135",
    bio: "",
    scope: "default"
  };

  profileApplyDefaults_(
    profile,
    username
  );

  return profile;

}

function profileMergeProfiles_(
  username,
  gameId,
  generalProfile,
  gameProfile
) {

  const merged =
    profileDefaultProfile_(
      username,
      gameId
    );

  profileCopyNonEmpty_(
    merged,
    generalProfile
  );

  profileCopyNonEmpty_(
    merged,
    gameProfile
  );

  merged.username = username;
  merged.gameId = gameId;
  merged.scope = gameId ? "resolved-game" : "resolved-general";

  profileApplyDefaults_(
    merged,
    username
  );

  return merged;

}

function profileCopyNonEmpty_(
  target,
  source
) {

  source =
    source || {};

  PROFILE_ENGINE_FIELD_MAP.forEach(field => {

    const value =
      source[field.key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {

      target[field.key] = value;

    }

  });

}

function profileApplyDefaults_(
  profile,
  username
) {

  if (!profile.displayName) {
    profile.displayName = username || profile.username || "Player";
  }

  if (!profile.avatarType) {

    if (profile.avatarUrl) {
      profile.avatarType = "url";
    } else if (profile.avatarEmoji) {
      profile.avatarType = "emoji";
    } else {
      profile.avatarType = "initials";
    }

  }

  profile.avatarType =
    profileSafeAvatarType_(
      profile.avatarType
    ) || "initials";

  if (!profile.avatarEmoji) {
    profile.avatarEmoji = "🏆";
  }

  if (!profile.profileColor) {
    profile.profileColor = "#facc15";
  }

  if (!profile.profileColorMode) {
    profile.profileColorMode = "solid";
  }

  if (["solid", "gradient"].indexOf(String(profile.profileColorMode).toLowerCase()) === -1) {
    profile.profileColorMode = "solid";
  }

  if (!profile.profileColor2) {
    profile.profileColor2 = "#354785";
  }

  if (!profile.profileGradientAngle && profile.profileGradientAngle !== 0) {
    profile.profileGradientAngle = "135";
  }

  if (!profile.avatarInitials) {

    profile.avatarInitials =
      profileBuildInitials_(
        profile.realName ||
        profile.displayName ||
        username
      );

  }

  return profile;

}

function profileCleanInput_(
  payload
) {

  const displayName =
    profileLimit_(
      payload.displayName,
      40
    );

  const realName =
    profileLimit_(
      payload.realName,
      60
    );

  const avatarType =
    profileSafeAvatarType_(
      payload.avatarType
    );

  let avatarInitials =
    profileLimit_(
      payload.avatarInitials,
      4
    )
      .replace(/[^a-z0-9]/gi, "")
      .toUpperCase();

  if (!avatarInitials) {

    avatarInitials =
      profileBuildInitials_(
        realName ||
        displayName ||
        payload.username
      );

  }

  return {

    displayName: displayName,

    realName: realName,

    avatarType: avatarType || "initials",

    avatarInitials: avatarInitials,

    avatarEmoji:
      profileLimit_(
        payload.avatarEmoji,
        8
      ),

    avatarUrl:
      profileSafeUrl_(
        payload.avatarUrl
      ),

    avatarFileId:
      profileLimit_(
        payload.avatarFileId,
        120
      ),

    profileColor:
      profileSafeColor_(
        payload.profileColor
      ),

    profileColorMode:
      String(payload.profileColorMode || "solid").trim().toLowerCase() === "gradient"
        ? "gradient"
        : "solid",

    profileColor2:
      profileSafeColor_(
        payload.profileColor2
      ) || "#354785",

    profileGradientAngle:
      String(Math.max(0, Math.min(360, Number(payload.profileGradientAngle || 135)))),

    bio:
      profileLimit_(
        payload.bio,
        160
      )

  };

}

function profileRowToProfile_(
  row,
  col
) {

  const profile = {};

  PROFILE_ENGINE_FIELD_MAP.forEach(field => {

    const index =
      col[field.header];

    profile[field.key] =
      index > -1
        ? String(row[index] || "").trim()
        : "";

  });

  return profile;

}

function profileSetProfileFields_(
  sh,
  rowIndex,
  col,
  profile
) {

  PROFILE_ENGINE_FIELD_MAP.forEach(field => {

    const index =
      col[field.header];

    if (index > -1) {

      sh.getRange(
        rowIndex,
        index + 1
      )
        .setValue(
          profile[field.key]
        );

    }

  });

}

function profileHeaders_(
  row
) {

  return row.map(h =>
    String(h || "").trim()
  );

}

function profileColumnMap_(
  headers
) {

  const col = {};

  headers.forEach((header, index) => {

    col[header] = index;

  });

  [
    "Username",
    "GameId",
    "DisplayName",
    "RealName",
    "AvatarType",
    "AvatarInitials",
    "AvatarEmoji",
    "AvatarUrl",
    "AvatarFileId",
    "ProfileColor",
    "ProfileColorMode",
    "ProfileColor2",
    "ProfileGradientAngle",
    "ProfileScopeKey",
    "ProfileScopeLabel",
    "Bio",
    "ProfilePromptCompleted",
    "UpdatedAt",
    "ProfileUpdatedAt"
  ].forEach(header => {

    if (col[header] === undefined) {
      col[header] = -1;
    }

  });

  return col;

}

function profileNormalizeUsername_(
  value
) {

  return String(value || "")
    .trim()
    .toLowerCase();

}

function profileNormalizeGameId_(
  value
) {

  return String(value || "")
    .trim();

}

function profileLimit_(
  value,
  maxLength
) {

  return String(value || "")
    .trim()
    .slice(
      0,
      maxLength
    );

}

function profileSafeAvatarType_(
  value
) {

  value =
    String(value || "")
      .trim()
      .toLowerCase();

  const allowed = [
    "initials",
    "emoji",
    "url",
    "upload"
  ];

  return allowed.indexOf(value) > -1
    ? value
    : "";

}

function profileSafeColor_(
  value
) {

  value =
    String(value || "")
      .trim();

  if (!value) {
    return "";
  }

  if (
    /^#[0-9a-fA-F]{6}$/.test(
      value
    )
  ) {

    return value;

  }

  return "";

}

function profileSafeUrl_(
  value
) {

  value =
    String(value || "")
      .trim()
      .slice(
        0,
        700
      );

  if (!value) {
    return "";
  }

  if (
    /^https:\/\//i.test(value)
  ) {

    return value;

  }

  return "";

}

function profileBuildInitials_(
  value
) {

  const words =
    String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (!words.length) {
    return "P";
  }

  if (words.length === 1) {

    return words[0]
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 2)
      .toUpperCase() || "P";

  }

  return (
    words[0].charAt(0) +
    words[words.length - 1].charAt(0)
  )
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase() || "P";

}
