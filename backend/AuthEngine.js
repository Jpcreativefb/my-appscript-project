function loginUser(
  username,
  pin
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

  return CacheService
    .getScriptCache()
    .get(token) || "";

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
