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
    set("pin", "'" + pin);
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
      pin: "'" + newPin,
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
