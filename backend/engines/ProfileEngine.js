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
  "Bio",
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

  username =
    profileNormalizeUsername_(
      username
    );

  gameId =
    profileNormalizeGameId_(
      gameId
    );

  if (!username) {

    return {
      success: false,
      message: "Missing username"
    };

  }

  profileEnsureSchema_();

  const generalProfile =
    profileGetGeneralProfile_(
      username
    );

  const gameProfile =
    gameId
      ? profileGetGameProfile_(
          username,
          gameId
        )
      : {};

  const profile =
    profileMergeProfiles_(
      username,
      gameId,
      generalProfile,
      gameProfile
    );

  return {
    success: true,
    profile: profile,
    generalProfile: generalProfile,
    gameProfile: gameProfile
  };

}

function apiSaveEditableProfile(
  payload
) {

  payload =
    payload || {};

  const username =
    profileNormalizeUsername_(
      payload.username
    );

  const gameId =
    profileNormalizeGameId_(
      payload.gameId
    );

  const scope =
    String(
      payload.scope || "general"
    )
      .trim()
      .toLowerCase();

  if (!username) {

    return {
      success: false,
      message: "Missing username"
    };

  }

  if (
    scope !== "general" &&
    scope !== "game"
  ) {

    return {
      success: false,
      message: "Invalid profile scope"
    };

  }

  if (
    scope === "game" &&
    !gameId
  ) {

    return {
      success: false,
      message: "Missing gameId for game profile"
    };

  }

  profileEnsureSchema_();

  const cleanProfile =
    profileCleanInput_(
      payload
    );

  if (scope === "general") {

    const updated =
      profileSaveGeneralProfile_(
        username,
        cleanProfile
      );

    if (!updated.success) {
      return updated;
    }

  }

  if (scope === "game") {

    profileSaveGameProfile_(
      username,
      gameId,
      cleanProfile
    );

  }

  if (
    typeof clearAppCaches ===
    "function"
  ) {

    clearAppCaches();

  }

  return apiGetEditableProfile(
    username,
    gameId
  );

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

  return profile;

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
    "Bio",
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
