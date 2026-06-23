function loginUser(
  username,
  pin,
  rememberMe
){

  username =
    String(username || "")
      .trim();

  pin =
    String(pin || "")
      .trim();

  if (!username || !pin) {

    return {
      success: false,
      message: "Missing username/email/phone or PIN"
    };

  }

  const record =
    findUserRecordByIdentifier_(
      username
    );

  if (!record) {

    return {
      success: false,
      message: "Invalid login"
    };

  }

  const col =
    record.col;

  const status =
    col.accountStatus > -1
      ? String(record.row[col.accountStatus] || "active")
          .trim()
          .toLowerCase()
      : "active";

  if (
    status &&
    status !== "active"
  ) {

    return {
      success: false,
      message: "Account is not active"
    };

  }

  const storedPin =
    col.pin > -1
      ? String(record.row[col.pin] || "")
          .replace(/^'/, "")
          .trim()
      : "";

  if (storedPin !== pin) {

    return {
      success: false,
      message: "Invalid login"
    };

  }

  const token =
    Utilities.getUuid();

  const canonicalUsername =
    String(record.user["Username"] || username)
      .trim();

  const keepSignedIn =
    rememberMe === undefined ||
    rememberMe === true ||
    String(rememberMe || "")
      .trim()
      .toLowerCase() === "true" ||
    String(rememberMe || "")
      .trim() === "1";

  const sessionHours =
    keepSignedIn
      ? 24 * 30
      : 24;

  const sessionExpiresAt =
    new Date(
      Date.now() +
      sessionHours * 60 * 60 * 1000
    ).toISOString();

  CacheService
    .getScriptCache()
    .put(
      token,
      canonicalUsername,
      60 * 60 * 6
    );

  updateUserFields_(
    record.rowNumber,
    {
      sessionToken: token,
      sessionExpiresAt: sessionExpiresAt,
      lastLogin: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    }
  );

  const isAdminUser =
    record.user["IsAdmin"] === true ||
    String(record.user["IsAdmin"] || "")
      .trim()
      .toLowerCase() === "true" ||
    String(record.user["IsAdmin"] || "")
      .trim()
      .toLowerCase() === "yes";

  return {
    success: true,
    token: token,
    username: canonicalUsername,
    rememberMe: keepSignedIn,
    expiresAt: sessionExpiresAt,
    realName: record.user["RealName"] || "",
    displayName: record.user["DisplayName"] || record.user["RealName"] || canonicalUsername,
    email: record.user["Email"] || "",
    phone: record.user["Phone"] || "",
    isAdmin: isAdminUser,
    avatar: record.user["Avatar"] || "default",
    themeColor: record.user["ThemeColor"] || "#000000",
    preferredContactMethod:
      record.user["PreferredContactMethod"] || "none",
    notificationOptIn:
      record.user["NotificationOptIn"] === true ||
      String(record.user["NotificationOptIn"] || "")
        .trim()
        .toLowerCase() === "true",
    notificationChannel:
      record.user["NotificationChannel"] || "none"
  };

}

function getUsernameFromSessionToken_(token){

  token =
    String(token || "").trim();

  if (!token) {
    return "";
  }

  const cachedUsername =
    CacheService
      .getScriptCache()
      .get(token) || "";

  if (cachedUsername) {
    return cachedUsername;
  }

  const record =
    findUserRecordBySessionToken_(
      token
    );

  if (!record) {
    return "";
  }

  const username =
    String(record.user["Username"] || "")
      .trim();

  if (username) {

    CacheService
      .getScriptCache()
      .put(
        token,
        username,
        60 * 60 * 6
      );

  }

  return username;

}

function findUserRecordBySessionToken_(token){

  token =
    String(token || "").trim();

  if (!token) {
    return null;
  }

  const records =
    getAllUserRecords_();

  const now =
    Date.now();

  for (let i = 0; i < records.length; i++) {

    const record =
      records[i];

    const col =
      record.col;

    if (
      col.sessionToken < 0 ||
      col.sessionExpiresAt < 0
    ) {
      continue;
    }

    const rowToken =
      String(record.row[col.sessionToken] || "")
        .trim();

    if (rowToken !== token) {
      continue;
    }

    const expiresAt =
      record.row[col.sessionExpiresAt];

    const expiresMs =
      expiresAt
        ? new Date(expiresAt).getTime()
        : 0;

    if (
      !expiresMs ||
      expiresMs < now
    ) {
      return null;
    }

    const status =
      col.accountStatus > -1
        ? String(record.row[col.accountStatus] || "active")
            .trim()
            .toLowerCase()
        : "active";

    if (
      status &&
      status !== "active"
    ) {
      return null;
    }

    return record;

  }

  return null;

}

function validateSessionToken(token){

  token =
    String(token || "").trim();

  let record =
    findUserRecordBySessionToken_(
      token
    );

  if (!record) {

    const cachedUsername =
      CacheService
        .getScriptCache()
        .get(token) || "";

    if (cachedUsername) {

      record =
        findUserRecordByUsername_(
          cachedUsername
        );

    }

  }

  if (!record) {

    return {
      success: false,
      message: "Invalid or expired session"
    };

  }

  const user =
    record.user;

  const col =
    record.col;

  const expiresAt =
    col.sessionExpiresAt > -1
      ? record.row[col.sessionExpiresAt]
      : "";

  const isAdminUser =
    user["IsAdmin"] === true ||
    String(user["IsAdmin"] || "")
      .trim()
      .toLowerCase() === "true" ||
    String(user["IsAdmin"] || "")
      .trim()
      .toLowerCase() === "yes";

  return {
    success: true,
    token: String(token || "").trim(),
    username: user["Username"] || "",
    realName: user["RealName"] || "",
    displayName: user["DisplayName"] || user["RealName"] || user["Username"] || "",
    email: user["Email"] || "",
    phone: user["Phone"] || "",
    isAdmin: isAdminUser,
    avatar: user["Avatar"] || "default",
    themeColor: user["ThemeColor"] || "#000000",
    preferredContactMethod:
      user["PreferredContactMethod"] || "none",
    notificationOptIn:
      user["NotificationOptIn"] === true ||
      String(user["NotificationOptIn"] || "")
        .trim()
        .toLowerCase() === "true",
    notificationChannel:
      user["NotificationChannel"] || "none",
    expiresAt: expiresAt,
    createdAt: Date.now()
  };

}

function requireUserFromToken_(token){

  const username =
    getUsernameFromSessionToken_(
      token
    );

  if (!username) {
    throw new Error("Invalid session");
  }

  return username;

}

function requireAdminFromToken_(token){

  const username =
    requireUserFromToken_(
      token
    );

  if (!isAdmin(username)) {
    throw new Error("Invalid admin session");
  }

  return username;

}
