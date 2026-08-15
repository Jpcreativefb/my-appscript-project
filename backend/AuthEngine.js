/* =========================================================
   AUTH RATE LIMITING — v1.2.16
========================================================= */

function authRateLimitKey_(prefix, identifier){
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(identifier || "").trim().toLowerCase()
  );
  return String(prefix || "auth") + ":" + authBytesToText_(bytes).slice(0, 32);
}

function authLoginRateState_(identifier){
  const cache = CacheService.getScriptCache();
  const key = authRateLimitKey_("auth-login", identifier);
  const raw = cache.get(key);
  let state = { failures: 0, blockedUntil: 0 };
  if (raw) {
    try { state = JSON.parse(raw) || state; } catch (err) {}
  }
  return { cache: cache, key: key, state: state };
}

function authCheckLoginRate_(identifier){
  const item = authLoginRateState_(identifier);
  return Number(item.state.blockedUntil || 0) <= Date.now();
}

function authRecordLoginFailure_(identifier){
  const item = authLoginRateState_(identifier);
  const failures = Number(item.state.failures || 0) + 1;
  const blockedUntil = failures >= 5
    ? Date.now() + 15 * 60 * 1000
    : Number(item.state.blockedUntil || 0);
  item.cache.put(
    item.key,
    JSON.stringify({ failures: failures, blockedUntil: blockedUntil }),
    60 * 60
  );
}

function authClearLoginFailures_(identifier){
  CacheService.getScriptCache().remove(
    authRateLimitKey_("auth-login", identifier)
  );
}

function authAllowResetRequest_(identifier){
  const cache = CacheService.getScriptCache();
  const key = authRateLimitKey_("auth-reset", identifier);
  const count = Number(cache.get(key) || 0);
  if (count >= 3) {
    return false;
  }
  cache.put(key, String(count + 1), 30 * 60);
  return true;
}

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

  if (!authCheckLoginRate_(username)) {
    return {
      success: false,
      message: "Too many login attempts. Try again in about 15 minutes."
    };
  }

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

    authRecordLoginFailure_(username);

    return {
      success: false,
      message: "Invalid login"
    };

  }

  const col =
    record.col;

  if (!isUserRecordActive_(record)) {

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

  if (!verifyStoredUserPin_(storedPin, pin)) {

    authRecordLoginFailure_(username);

    return {
      success: false,
      message: "Invalid login"
    };

  }

  authClearLoginFailures_(username);

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

  const loginUpdates = {
    sessionToken: hashSessionTokenForStorage_(token),
    sessionExpiresAt: sessionExpiresAt,
    lastLogin: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };

  if (isLegacyStoredUserPin_(storedPin)) {
    loginUpdates.pin = hashUserPinForStorage_(pin);
  }

  updateUserFields_(
    record.rowNumber,
    loginUpdates
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

    if (!storedSessionTokenMatches_(rowToken, token)) {
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

    if (!isUserRecordActive_(record)) {
      return null;
    }

    if (rowToken && rowToken.indexOf("sha256$") !== 0) {
      updateUserFields_(
        record.rowNumber,
        {
          sessionToken: hashSessionTokenForStorage_(token),
          lastUpdated: new Date().toISOString()
        }
      );
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
