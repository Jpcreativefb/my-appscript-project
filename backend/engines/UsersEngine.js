/* =========================================================
   USERS ENGINE
   Signup, username normalization, email recovery,
   optional phone storage, free notification preferences
========================================================= */

function getUsersColumnMap_(headers){

  function idx(names){

    for (let i = 0; i < names.length; i++) {

      const found =
        headers.findIndex(h =>
          String(h || "")
            .trim()
            .toLowerCase() ===
          String(names[i] || "")
            .trim()
            .toLowerCase()
        );

      if (found > -1) {
        return found;
      }

    }

    return -1;

  }

  return {

    username: idx(["Username"]),
    pin: idx(["PIN", "Pin"]),
    isAdmin: idx(["IsAdmin"]),
    avatar: idx(["Avatar"]),
    themeColor: idx(["ThemeColor"]),
    createdAt: idx(["CreatedAt"]),

    usernameKey: idx(["UsernameKey"]),
    email: idx(["Email"]),
    emailKey: idx(["EmailKey"]),
    phone: idx(["Phone"]),
    phoneKey: idx(["PhoneKey"]),
    displayName: idx(["DisplayName"]),
    realName: idx(["RealName", "Real Name", "Name"]),
    accountStatus: idx(["AccountStatus"]),
    active: idx(["Active"]),

    preferredContactMethod: idx(["PreferredContactMethod"]),
    notificationOptIn: idx(["NotificationOptIn"]),
    notificationChannel: idx(["NotificationChannel"]),
    notificationEmail: idx(["NotificationEmail"]),
    notificationPhone: idx(["NotificationPhone"]),
    notificationOptInAt: idx(["NotificationOptInAt"]),
    notificationOptOutAt: idx(["NotificationOptOutAt"]),

    resetCodeHash: idx(["ResetCodeHash"]),
    resetCodeExpiresAt: idx(["ResetCodeExpiresAt"]),
    resetRequestedAt: idx(["ResetRequestedAt"]),

    sessionToken: idx(["SessionToken"]),
    sessionExpiresAt: idx(["SessionExpiresAt"]),

    lastLogin: idx(["LastLogin"]),
    lastUpdated: idx(["LastUpdated"])

  };

}

function getUsersFieldIndex_(col, field){

  const map = {
    username: col.username,
    pin: col.pin,
    isAdmin: col.isAdmin,
    avatar: col.avatar,
    themeColor: col.themeColor,
    createdAt: col.createdAt,
    usernameKey: col.usernameKey,
    email: col.email,
    emailKey: col.emailKey,
    phone: col.phone,
    phoneKey: col.phoneKey,
    displayName: col.displayName,
    realName: col.realName,
    accountStatus: col.accountStatus,
    active: col.active,
    preferredContactMethod: col.preferredContactMethod,
    notificationOptIn: col.notificationOptIn,
    notificationChannel: col.notificationChannel,
    notificationEmail: col.notificationEmail,
    notificationPhone: col.notificationPhone,
    notificationOptInAt: col.notificationOptInAt,
    notificationOptOutAt: col.notificationOptOutAt,
    resetCodeHash: col.resetCodeHash,
    resetCodeExpiresAt: col.resetCodeExpiresAt,
    resetRequestedAt: col.resetRequestedAt,
    sessionToken: col.sessionToken,
    sessionExpiresAt: col.sessionExpiresAt,
    lastLogin: col.lastLogin,
    lastUpdated: col.lastUpdated
  };

  return map[field] === undefined
    ? -1
    : map[field];

}

function validateUsersColumns_(col){

  const required = [
    "username",
    "pin"
  ];

  const missing =
    required.filter(
      key => col[key] === -1
    );

  if (missing.length) {

    throw new Error(
      "Missing Users headers: " +
      missing.join(", ")
    );

  }

}

function normalizeUsername_(value){

  return String(value || "")
    .trim()
    .toLowerCase();

}

function normalizeRealName_(value){

  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");

}

function buildUsernameKey_(value){

  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

}

function normalizeEmail_(value){

  return String(value || "")
    .trim()
    .toLowerCase();

}

function buildPhoneKey_(value){

  return String(value || "")
    .replace(/\D/g, "");

}

function normalizePhone_(value){

  let digits =
    buildPhoneKey_(value);

  if (
    digits.length === 11 &&
    digits.charAt(0) === "1"
  ) {
    digits = digits.slice(1);
  }

  if (digits.length === 10) {
    return "+1" + digits;
  }

  return String(value || "").trim();

}

function normalizeBooleanParam_(value){

  return (
    value === true ||
    value === 1 ||
    String(value || "")
      .trim()
      .toLowerCase() === "true" ||
    String(value || "")
      .trim()
      .toLowerCase() === "yes" ||
    String(value || "")
      .trim()
      .toLowerCase() === "on"
  );

}

function normalizeContactMethod_(value){

  const method =
    String(value || "")
      .trim()
      .toLowerCase();

  if (
    method === "email" ||
    method === "phone" ||
    method === "none"
  ) {
    return method;
  }

  return "none";

}

function validatePin_(pin){

  return /^\d{4}$/.test(
    String(pin || "").trim()
  );

}

/* =========================
   CREDENTIAL STORAGE
   PINs are peppered + salted before being stored in Sheets.
   Legacy plaintext PINs remain readable only long enough to migrate
   automatically after a successful login.
========================= */

function getAuthPinPepper_(){

  const props = PropertiesService.getScriptProperties();
  const key = "AUTH_PIN_PEPPER_V1";
  let pepper = String(props.getProperty(key) || "").trim();

  if (!pepper) {
    pepper = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty(key, pepper);
  }

  return pepper;

}

function authBytesToText_(bytes){
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, "");
}

function authConstantTimeEquals_(left, right){

  left = String(left || "");
  right = String(right || "");

  let mismatch = left.length ^ right.length;
  const maxLength = Math.max(left.length, right.length);

  for (let i = 0; i < maxLength; i++) {
    mismatch |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  }

  return mismatch === 0;

}

function hashUserPinForStorage_(pin){

  pin = String(pin || "").trim();

  if (!validatePin_(pin)) {
    throw new Error("PIN must be 4 digits");
  }

  const salt = Utilities.getUuid().replace(/-/g, "");
  const signature = Utilities.computeHmacSha256Signature(
    salt + ":" + pin,
    getAuthPinPepper_()
  );

  return "hmac-sha256-v1$" + salt + "$" + authBytesToText_(signature);

}

function verifyStoredUserPin_(storedPin, candidatePin){

  const stored = String(storedPin || "").replace(/^'/, "").trim();
  const candidate = String(candidatePin || "").trim();

  if (stored.indexOf("hmac-sha256-v1$") === 0) {
    const parts = stored.split("$");
    if (parts.length !== 3 || !parts[1] || !parts[2]) {
      return false;
    }

    const signature = Utilities.computeHmacSha256Signature(
      parts[1] + ":" + candidate,
      getAuthPinPepper_()
    );

    return authConstantTimeEquals_(
      parts[2],
      authBytesToText_(signature)
    );
  }

  // Backward-compatible migration path for pre-v1.2.16 Users rows.
  return authConstantTimeEquals_(stored, candidate);

}

function isLegacyStoredUserPin_(storedPin){
  const stored = String(storedPin || "").replace(/^'/, "").trim();
  return !!stored && stored.indexOf("hmac-sha256-v1$") !== 0;
}

function hashSessionTokenForStorage_(token){

  token = String(token || "").trim();
  if (!token) {
    return "";
  }

  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    token
  );

  return "sha256$" + authBytesToText_(bytes);

}

function migrateLegacyUserCredentialsV1216_(){

  const props = PropertiesService.getScriptProperties();
  const migrationKey = "USER_CREDENTIAL_STORAGE_V1216_MIGRATED";

  if (String(props.getProperty(migrationKey) || "") === "true") {
    return { migratedPins: 0, migratedSessions: 0, alreadyComplete: true };
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1)) {
    return { migratedPins: 0, migratedSessions: 0, deferred: true };
  }

  try {
    const sheet = getUsersSheet_();
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();

    if (lastRow <= 1 || lastColumn <= 0) {
      props.setProperty(migrationKey, "true");
      return { migratedPins: 0, migratedSessions: 0 };
    }

    const headers = sheet
      .getRange(1, 1, 1, lastColumn)
      .getValues()[0]
      .map(h => String(h || "").trim());
    const col = getUsersColumnMap_(headers);
    const rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();

    let migratedPins = 0;
    let migratedSessions = 0;

    rows.forEach((row, index) => {
      const sheetRow = index + 2;

      if (col.pin > -1) {
        const storedPin = String(row[col.pin] || "").replace(/^'/, "").trim();
        if (isLegacyStoredUserPin_(storedPin) && validatePin_(storedPin)) {
          sheet.getRange(sheetRow, col.pin + 1)
            .setValue(hashUserPinForStorage_(storedPin));
          migratedPins += 1;
        }
      }

      if (col.sessionToken > -1) {
        const storedToken = String(row[col.sessionToken] || "").trim();
        if (storedToken && storedToken.indexOf("sha256$") !== 0) {
          sheet.getRange(sheetRow, col.sessionToken + 1)
            .setValue(hashSessionTokenForStorage_(storedToken));
          migratedSessions += 1;
        }
      }
    });

    props.setProperty(migrationKey, "true");

    return {
      migratedPins: migratedPins,
      migratedSessions: migratedSessions,
      alreadyComplete: false
    };

  } finally {
    lock.releaseLock();
  }

}

function storedSessionTokenMatches_(storedToken, rawToken){

  const stored = String(storedToken || "").trim();
  const raw = String(rawToken || "").trim();

  if (!stored || !raw) {
    return false;
  }

  if (stored.indexOf("sha256$") === 0) {
    return authConstantTimeEquals_(
      stored,
      hashSessionTokenForStorage_(raw)
    );
  }

  // Legacy v1.2.15 and older session rows.
  return authConstantTimeEquals_(stored, raw);

}

function validateEmail_(email){

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalizeEmail_(email)
  );

}

function validatePhoneOptional_(phone){

  if (!String(phone || "").trim()) {
    return true;
  }

  const digits =
    buildPhoneKey_(phone);

  return (
    digits.length === 10 ||
    (
      digits.length === 11 &&
      digits.charAt(0) === "1"
    )
  );

}

function hashResetCode_(email, code){

  const raw =
    normalizeEmail_(email) +
    ":" +
    String(code || "").trim();

  const bytes =
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      raw
    );

  return bytes
    .map(b => {
      const v = (b < 0 ? b + 256 : b);
      return ("0" + v.toString(16)).slice(-2);
    })
    .join("");

}

function getUsers(){

  const records =
    getAllUserRecords_();

  return records
    .map(record =>
      String(record.user["Username"] || "").trim()
    )
    .filter(username => username !== "");

}

function isUserRecordActive_(record) {

  if (!record || !record.col) {
    return false;
  }

  const col = record.col;
  const row = record.row || [];

  if (col.accountStatus > -1) {
    const status = String(row[col.accountStatus] || "").trim().toLowerCase();
    if (status && status !== "active") {
      return false;
    }
  }

  if (col.active > -1) {
    const value = row[col.active];
    const text = String(value === undefined || value === null ? "" : value)
      .trim()
      .toLowerCase();
    if (
      value === false ||
      text === "false" ||
      text === "no" ||
      text === "0" ||
      text === "inactive" ||
      text === "disabled"
    ) {
      return false;
    }
  }

  return true;

}

function isAdmin(username) {

  const record =
    findUserRecordByUsername_(
      username
    );

  if (!record) {
    return false;
  }

  return (
    record.user["IsAdmin"] === true ||
    String(record.user["IsAdmin"] || "")
      .trim()
      .toLowerCase() === "true" ||
    String(record.user["IsAdmin"] || "")
      .trim()
      .toLowerCase() === "yes"
  );

}

function createUser(
  username,
  realName,
  pin,
  email,
  phone,
  contactMethod
){

  username =
    String(username || "").trim();

  realName =
    normalizeRealName_(realName);

  pin =
    String(pin || "").trim();

  email =
    normalizeEmail_(email);

  phone =
    normalizePhone_(phone);

  const phoneKey =
    buildPhoneKey_(phone);

  const preferredContactMethod =
    normalizeContactMethod_(
      contactMethod
    );

  const wantsNotifications =
    preferredContactMethod !== "none";

  if (!username) {

    return {
      success: false,
      message: "Username cannot be empty"
    };

  }

  const usernameKey =
    buildUsernameKey_(username);

  if (
    usernameKey.length < 3 ||
    usernameKey.length > 24
  ) {

    return {
      success: false,
      message: "Username must be 3-24 letters or numbers"
    };

  }

  if (
    realName &&
    realName.length > 80
  ) {

    return {
      success: false,
      message: "Real name must be 80 characters or less"
    };

  }

  if (!validatePin_(pin)) {

    return {
      success: false,
      message: "PIN must be 4 digits"
    };

  }

  if (
    email &&
    !validateEmail_(email)
  ) {

    return {
      success: false,
      message: "Enter a valid email"
    };

  }

  if (!validatePhoneOptional_(phone)) {

    return {
      success: false,
      message: "Enter a valid 10-digit phone number"
    };

  }

  if (
    preferredContactMethod === "email" &&
    !email
  ) {

    return {
      success: false,
      message: "Email is required for free automatic notifications and PIN recovery"
    };

  }

  if (
    preferredContactMethod === "phone" &&
    !phoneKey
  ) {

    return {
      success: false,
      message: "Phone number is required when phone is selected"
    };

  }

  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    ensureUsersColumns_();

    if (
      findUserRecordByUsername_(
        username
      )
    ) {

      return {
        success: false,
        message: "Username already exists"
      };

    }

    if (
      email &&
      findUserRecordByEmail_(
        email
      )
    ) {

      return {
        success: false,
        message: "Email already has an account"
      };

    }

    if (
      phoneKey &&
      findUserRecordByPhone_(
        phone
      )
    ) {

      return {
        success: false,
        message: "Phone number already has an account"
      };

    }

    const headers =
      getUsersHeaders_();

    const col =
      getUsersColumnMap_(headers);

    const row =
      new Array(headers.length).fill("");

    const now =
      new Date().toISOString();

    function set(field, value){

      const idx =
        getUsersFieldIndex_(
          col,
          field
        );

      if (idx > -1) {
        row[idx] = value;
      }

    }

    set("username", username);
    set("pin", hashUserPinForStorage_(pin));
    set("isAdmin", false);
    set("avatar", "default");
    set("themeColor", "#000000");
    set("createdAt", now);
    set("usernameKey", usernameKey);
    set("email", email);
    set("emailKey", email);
    set("phone", phone);
    set("phoneKey", phoneKey);
    set("displayName", realName || username);
    set("realName", realName);
    set("accountStatus", "active");
    set("active", true);
    set("preferredContactMethod", preferredContactMethod);
    set("notificationOptIn", wantsNotifications);
    set("notificationChannel", preferredContactMethod);
    set("notificationEmail", preferredContactMethod === "email" ? email : "");
    set("notificationPhone", preferredContactMethod === "phone" ? phone : "");
    set("notificationOptInAt", wantsNotifications ? now : "");
    set("notificationOptOutAt", wantsNotifications ? "" : now);
    set("lastUpdated", now);

    appendUserRow_(row);

    if (
      typeof clearAppCaches === "function"
    ) {
      clearAppCaches();
    }

    return {
      success: true,
      user: {
        username: username,
        realName: realName,
        displayName: realName || username,
        email: email,
        phone: phone,
        isAdmin: false,
        preferredContactMethod: preferredContactMethod,
        notificationOptIn: wantsNotifications
      }
    };

  } finally {

    lock.releaseLock();

  }

}

function requestPinReset(identifier){

  identifier =
    String(identifier || "").trim();

  const genericResponse = {
    success: true,
    message: "If that account exists and has an email on file, a reset code was sent. Phone-only accounts need an admin reset in the free version."
  };

  if (!identifier) {
    return genericResponse;
  }

  if (
    typeof authAllowResetRequest_ === "function" &&
    !authAllowResetRequest_(identifier)
  ) {
    return genericResponse;
  }

  const record =
    findUserRecordByIdentifier_(
      identifier
    );

  if (!record) {
    return genericResponse;
  }

  const col =
    record.col;

  const email =
    col.email > -1
      ? normalizeEmail_(record.row[col.email])
      : "";

  if (!validateEmail_(email)) {
    return genericResponse;
  }

  const code =
    String(
      Math.floor(
        100000 + Math.random() * 900000
      )
    );

  const expiresAt =
    new Date(
      Date.now() + 20 * 60 * 1000
    ).toISOString();

  updateUserFields_(
    record.rowNumber,
    {
      resetCodeHash: hashResetCode_(email, code),
      resetCodeExpiresAt: expiresAt,
      resetRequestedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    }
  );

  MailApp.sendEmail(
    email,
    "Awards App PIN reset code",
    "Your Awards App PIN reset code is: " + code +
      "\n\nThis code expires in 20 minutes. " +
      "If you did not request this, you can ignore this email."
  );

  return genericResponse;

}

function resetPin(identifier, resetCode, newPin){

  identifier =
    String(identifier || "").trim();

  resetCode =
    String(resetCode || "").trim();

  newPin =
    String(newPin || "").trim();

  if (!identifier || !resetCode || !newPin) {

    return {
      success: false,
      message: "Missing reset information"
    };

  }

  if (!validatePin_(newPin)) {

    return {
      success: false,
      message: "New PIN must be 4 digits"
    };

  }

  const record =
    findUserRecordByIdentifier_(
      identifier
    );

  if (!record) {

    return {
      success: false,
      message: "Invalid or expired reset code"
    };

  }

  const col =
    record.col;

  const email =
    col.email > -1
      ? normalizeEmail_(record.row[col.email])
      : "";

  const expiresAt =
    col.resetCodeExpiresAt > -1
      ? new Date(record.row[col.resetCodeExpiresAt]).getTime()
      : 0;

  const storedHash =
    col.resetCodeHash > -1
      ? String(record.row[col.resetCodeHash] || "").trim()
      : "";

  if (
    !email ||
    !storedHash ||
    !expiresAt ||
    Date.now() > expiresAt ||
    storedHash !== hashResetCode_(email, resetCode)
  ) {

    return {
      success: false,
      message: "Invalid or expired reset code"
    };

  }

  updateUserFields_(
    record.rowNumber,
    {
      pin: hashUserPinForStorage_(newPin),
      sessionToken: "",
      sessionExpiresAt: "",
      resetCodeHash: "",
      resetCodeExpiresAt: "",
      resetRequestedAt: "",
      lastUpdated: new Date().toISOString()
    }
  );

  return {
    success: true,
    message: "PIN reset successfully"
  };

}
