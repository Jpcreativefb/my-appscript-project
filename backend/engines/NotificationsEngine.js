/* =========================================================
   NOTIFICATIONS ENGINE
   Free version: automatic email notifications only.
   Phone preference is stored for manual contact/export.
========================================================= */

const NOTIFICATION_LOG_SHEET =
  "NotificationLog";

function getNotificationLogSheet_(){

  const ss =
    SpreadsheetApp.getActive();

  let sh =
    ss.getSheetByName(
      NOTIFICATION_LOG_SHEET
    );

  if (!sh) {

    sh = ss.insertSheet(
      NOTIFICATION_LOG_SHEET
    );

    sh.appendRow([
      "Timestamp",
      "AdminUsername",
      "GameId",
      "Subject",
      "Message",
      "RecipientEmail",
      "RecipientPhone",
      "RecipientUsername",
      "Channel",
      "Status",
      "Error"
    ]);

  }

  return sh;

}

function logNotification_(entry){

  getNotificationLogSheet_()
    .appendRow([
      new Date().toISOString(),
      entry.adminUsername || "",
      entry.gameId || "",
      entry.subject || "",
      entry.message || "",
      entry.recipientEmail || "",
      entry.recipientPhone || "",
      entry.recipientUsername || "",
      entry.channel || "",
      entry.status || "",
      entry.error || ""
    ]);

}

function getNotificationPreference(token){

  const username =
    requireUserFromToken_(
      token
    );

  const record =
    findUserRecordByUsername_(
      username
    );

  if (!record) {
    throw new Error("User not found");
  }

  return {
    success: true,
    username: username,
    email: record.user["Email"] || "",
    phone: record.user["Phone"] || "",
    preferredContactMethod:
      record.user["PreferredContactMethod"] || "none",
    notificationOptIn:
      record.user["NotificationOptIn"] === true ||
      String(record.user["NotificationOptIn"] || "")
        .trim()
        .toLowerCase() === "true",
    notificationChannel:
      record.user["NotificationChannel"] || "none",
    note:
      "Free version sends automatic notifications by email only. Phone is stored only."
  };

}

function setNotificationPreference(
  token,
  contactMethod,
  email,
  phone
){

  const username =
    requireUserFromToken_(
      token
    );

  const record =
    findUserRecordByUsername_(
      username
    );

  if (!record) {
    throw new Error("User not found");
  }

  const method =
    normalizeContactMethod_(
      contactMethod
    );

  email =
    normalizeEmail_(
      email || record.user["Email"]
    );

  phone =
    normalizePhone_(
      phone || record.user["Phone"]
    );

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
    method === "email" &&
    !email
  ) {
    return {
      success: false,
      message: "Email is required for automatic notifications"
    };
  }

  if (
    method === "phone" &&
    !phone
  ) {
    return {
      success: false,
      message: "Phone is required when phone is selected"
    };
  }

  const now =
    new Date().toISOString();

  const optIn =
    method !== "none";

  updateUserFields_(
    record.rowNumber,
    {
      email: email,
      emailKey: email,
      phone: phone,
      phoneKey: buildPhoneKey_(phone),
      preferredContactMethod: method,
      notificationOptIn: optIn,
      notificationChannel: method,
      notificationEmail: method === "email" ? email : "",
      notificationPhone: method === "phone" ? phone : "",
      notificationOptInAt: optIn ? now : "",
      notificationOptOutAt: optIn ? "" : now,
      lastUpdated: now
    }
  );

  return {
    success: true,
    preferredContactMethod: method,
    notificationOptIn: optIn,
    notificationChannel: method,
    message:
      method === "email"
        ? "Email notifications enabled"
        : method === "phone"
          ? "Phone saved. Automatic text messages are disabled in the free version."
          : "Notifications turned off"
  };

}

function adminSendMassNotification(
  token,
  subject,
  message,
  gameId
){

  const adminUsername =
    requireAdminFromToken_(
      token
    );

  subject =
    String(subject || "").trim();

  message =
    String(message || "").trim();

  if (!subject || !message) {

    return {
      success: false,
      message: "Subject and message are required"
    };

  }

  const records =
    getAllUserRecords_();

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let phoneOnly = 0;

  records.forEach(record => {

    const user =
      record.user;

    const optIn =
      user["NotificationOptIn"] === true ||
      String(user["NotificationOptIn"] || "")
        .trim()
        .toLowerCase() === "true";

    const channel =
      normalizeContactMethod_(
        user["NotificationChannel"] ||
        user["PreferredContactMethod"]
      );

    const email =
      normalizeEmail_(
        user["NotificationEmail"] ||
        user["Email"]
      );

    const phone =
      normalizePhone_(
        user["NotificationPhone"] ||
        user["Phone"]
      );

    const username =
      String(user["Username"] || "").trim();

    if (!optIn || channel === "none") {

      skipped++;

      return;

    }

    if (channel === "phone") {

      phoneOnly++;

      logNotification_({
        adminUsername: adminUsername,
        gameId: gameId,
        subject: subject,
        message: message,
        recipientPhone: phone,
        recipientUsername: username,
        channel: "phone",
        status: "SKIPPED_FREE_VERSION",
        error: "Automatic SMS requires a paid provider"
      });

      return;

    }

    if (!validateEmail_(email)) {

      failed++;

      logNotification_({
        adminUsername: adminUsername,
        gameId: gameId,
        subject: subject,
        message: message,
        recipientEmail: email,
        recipientUsername: username,
        channel: "email",
        status: "FAILED",
        error: "Missing or invalid email"
      });

      return;

    }

    try {

      MailApp.sendEmail(
        email,
        subject,
        message
      );

      sent++;

      logNotification_({
        adminUsername: adminUsername,
        gameId: gameId,
        subject: subject,
        message: message,
        recipientEmail: email,
        recipientUsername: username,
        channel: "email",
        status: "SENT",
        error: ""
      });

    } catch (err) {

      failed++;

      logNotification_({
        adminUsername: adminUsername,
        gameId: gameId,
        subject: subject,
        message: message,
        recipientEmail: email,
        recipientUsername: username,
        channel: "email",
        status: "FAILED",
        error: err.message || String(err)
      });

    }

  });

  return {
    success: true,
    sent: sent,
    skipped: skipped,
    phoneOnly: phoneOnly,
    failed: failed,
    message:
      "Email notifications sent: " + sent +
      ". Phone-only users skipped: " + phoneOnly +
      ". Failed: " + failed + "."
  };

}

function adminGetPhoneNotificationList(token){

  requireAdminFromToken_(
    token
  );

  const records =
    getAllUserRecords_();

  const users =
    records
      .map(record => record.user)
      .filter(user => {

        const optIn =
          user["NotificationOptIn"] === true ||
          String(user["NotificationOptIn"] || "")
            .trim()
            .toLowerCase() === "true";

        const channel =
          normalizeContactMethod_(
            user["NotificationChannel"] ||
            user["PreferredContactMethod"]
          );

        return optIn && channel === "phone";

      })
      .map(user => ({
        username: user["Username"] || "",
        phone: user["NotificationPhone"] || user["Phone"] || ""
      }));

  return {
    success: true,
    users: users
  };

}


/* =========================================================
   v1.2.18e IN-APP NOTIFICATION CENTER + PREFERENCES
========================================================= */

const USER_NOTIFICATION_PREFS_SHEET = "NotificationPreferences";
const USER_NOTIFICATION_CENTER_SHEET = "UserNotifications";

const USER_NOTIFICATION_PREF_HEADERS = [
  "Username",
  "AppNotificationsEnabled",
  "NotifyMakePicks",
  "NotifyLockApproaching",
  "NotifyFinalResults",
  "NotifyNewGames",
  "UpdatedAt"
];

const USER_NOTIFICATION_CENTER_HEADERS = [
  "NotificationId",
  "Username",
  "Type",
  "Title",
  "Message",
  "GameId",
  "Route",
  "IsRead",
  "CreatedAt",
  "ReadAt"
];

function notificationGetOrCreateSheet_(name, headers) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    return sh;
  }

  notificationRepairCanonicalHeaderRow_(sh, headers);
  sh.setFrozenRows(1);
  return sh;
}

/*
  v1.2.18f4 durability repair. Earlier notification writers created a new
  record by appendRow(["", ...]) and then used getLastRow(). A fully blank
  appended row is not a safe row locator in Google Sheets; it can leave
  getLastRow() pointing at row 1 and allow the following field writes to
  overwrite the header row. If that happened in production, preserve the
  first row as a candidate data row and restore the canonical headers.
*/
function notificationRepairCanonicalHeaderRow_(sh, headers) {
  const width = Math.max(Number(sh.getLastColumn() || 0), headers.length, 1);
  const firstRow = sh.getRange(1, 1, 1, width).getValues()[0];
  const canonical = firstRow.slice(0, headers.length).map(function(value) {
    return String(value === undefined || value === null ? "" : value).trim();
  });

  const healthy = headers.every(function(header, index) {
    return canonical[index] === header;
  });
  if (healthy) return false;

  const nonBlank = canonical.filter(function(value) { return value !== ""; }).length;
  const headerMatches = canonical.filter(function(value) {
    return headers.indexOf(value) !== -1;
  }).length;
  const looksLikeData = nonBlank > 0 && headerMatches < Math.ceil(headers.length / 2);

  if (looksLikeData) {
    sh.insertRowAfter(1);
    sh.getRange(2, 1, 1, headers.length).setValues([firstRow.slice(0, headers.length)]);
  }

  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (width > headers.length) {
    sh.getRange(1, headers.length + 1, 1, width - headers.length).clearContent();
  }
  SpreadsheetApp.flush();
  return true;
}

function notificationNextDataRow_(sh) {
  return Math.max(2, Number(sh.getLastRow() || 0) + 1);
}

function notificationWriteObjectRow_(sh, headers, rowIndex, values) {
  const col = notificationColumnMap_(headers);
  let row = new Array(headers.length).fill("");
  if (rowIndex <= sh.getLastRow()) {
    row = sh.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  }

  Object.keys(values || {}).forEach(function(header) {
    if (col[header] !== undefined) {
      row[col[header]] = values[header];
    }
  });

  sh.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
}

function notificationColumnMap_(headers) {
  const map = {};
  headers.forEach(function(header, index) {
    map[String(header || "").trim()] = index;
  });
  return map;
}

function notificationBool_(value, fallback) {
  if (value === true || value === false) return value;
  const text = String(value === undefined || value === null ? "" : value).trim().toLowerCase();
  if (!text) return fallback === true;
  return ["true", "1", "yes", "y", "on"].indexOf(text) !== -1;
}

function notificationPrefsDefaults_(username) {
  return {
    username: username,
    appNotificationsEnabled: true,
    notifyMakePicks: true,
    notifyLockApproaching: true,
    notifyFinalResults: true,
    notifyNewGames: true
  };
}

function apiGetNotificationPreferences(token) {
  const username = requireUserFromToken_(token);
  const defaults = notificationPrefsDefaults_(username);
  const sh = notificationGetOrCreateSheet_(
    USER_NOTIFICATION_PREFS_SHEET,
    USER_NOTIFICATION_PREF_HEADERS
  );
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, preferences: defaults };
  }

  const headers = data[0].map(String);
  const col = notificationColumnMap_(headers);
  const row = data.slice(1).find(function(r) {
    return String(r[col.Username] || "").trim().toLowerCase() === String(username || "").trim().toLowerCase();
  });

  if (!row) {
    return { success: true, preferences: defaults };
  }

  return {
    success: true,
    preferences: {
      username: username,
      appNotificationsEnabled: notificationBool_(row[col.AppNotificationsEnabled], true),
      notifyMakePicks: notificationBool_(row[col.NotifyMakePicks], true),
      notifyLockApproaching: notificationBool_(row[col.NotifyLockApproaching], true),
      notifyFinalResults: notificationBool_(row[col.NotifyFinalResults], true),
      notifyNewGames: notificationBool_(row[col.NotifyNewGames], true)
    }
  };
}

function apiSaveNotificationPreferences(payload) {
  payload = payload || {};
  const username = requireUserFromToken_(payload.token);
  const sh = notificationGetOrCreateSheet_(
    USER_NOTIFICATION_PREFS_SHEET,
    USER_NOTIFICATION_PREF_HEADERS
  );
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(String);
  const col = notificationColumnMap_(headers);
  let rowIndex = -1;

  data.slice(1).some(function(row, index) {
    if (String(row[col.Username] || "").trim().toLowerCase() === String(username || "").trim().toLowerCase()) {
      rowIndex = index + 2;
      return true;
    }
    return false;
  });

  if (rowIndex === -1) {
    rowIndex = notificationNextDataRow_(sh);
  }

  const values = {
    Username: username,
    AppNotificationsEnabled: notificationBool_(payload.appNotificationsEnabled, true),
    NotifyMakePicks: notificationBool_(payload.notifyMakePicks, true),
    NotifyLockApproaching: notificationBool_(payload.notifyLockApproaching, true),
    NotifyFinalResults: notificationBool_(payload.notifyFinalResults, true),
    NotifyNewGames: notificationBool_(payload.notifyNewGames, true),
    UpdatedAt: new Date().toISOString()
  };

  notificationWriteObjectRow_(sh, headers, rowIndex, values);
  SpreadsheetApp.flush();

  return {
    success: true,
    preferences: {
      username: username,
      appNotificationsEnabled: values.AppNotificationsEnabled,
      notifyMakePicks: values.NotifyMakePicks,
      notifyLockApproaching: values.NotifyLockApproaching,
      notifyFinalResults: values.NotifyFinalResults,
      notifyNewGames: values.NotifyNewGames
    }
  };
}

function createUserNotification_(entry) {
  entry = entry || {};
  const username = String(entry.username || "").trim().toLowerCase();
  if (!username) return { success: false, message: "Missing username" };

  const sh = notificationGetOrCreateSheet_(
    USER_NOTIFICATION_CENTER_SHEET,
    USER_NOTIFICATION_CENTER_HEADERS
  );

  const id = String(entry.notificationId || Utilities.getUuid()).trim();
  sh.appendRow([
    id,
    username,
    String(entry.type || "info").trim(),
    String(entry.title || "PATTC Predicts").trim(),
    String(entry.message || "").trim(),
    String(entry.gameId || "").trim(),
    String(entry.route || "").trim(),
    false,
    new Date().toISOString(),
    ""
  ]);

  return { success: true, notificationId: id };
}

function apiGetUserNotifications(token, limit) {
  const username = requireUserFromToken_(token);
  const sh = notificationGetOrCreateSheet_(
    USER_NOTIFICATION_CENTER_SHEET,
    USER_NOTIFICATION_CENTER_HEADERS
  );
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, notifications: [], unreadCount: 0 };
  }

  const headers = data[0].map(String);
  const col = notificationColumnMap_(headers);
  const max = Math.max(1, Math.min(100, Number(limit || 50)));

  const rows = data.slice(1)
    .filter(function(row) {
      return String(row[col.Username] || "").trim().toLowerCase() === String(username || "").trim().toLowerCase();
    })
    .map(function(row) {
      return {
        notificationId: String(row[col.NotificationId] || "").trim(),
        type: String(row[col.Type] || "info").trim(),
        title: String(row[col.Title] || "").trim(),
        message: String(row[col.Message] || "").trim(),
        gameId: String(row[col.GameId] || "").trim(),
        route: String(row[col.Route] || "").trim(),
        isRead: notificationBool_(row[col.IsRead], false),
        createdAt: row[col.CreatedAt] || "",
        readAt: row[col.ReadAt] || ""
      };
    })
    .sort(function(a, b) {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    })
    .slice(0, max);

  return {
    success: true,
    notifications: rows,
    unreadCount: rows.filter(function(item) { return item.isRead !== true; }).length
  };
}

function apiMarkNotificationRead(payload) {
  payload = payload || {};
  const username = requireUserFromToken_(payload.token);
  const id = String(payload.notificationId || "").trim();
  if (!id) return { success: false, message: "Missing notificationId" };

  const sh = notificationGetOrCreateSheet_(
    USER_NOTIFICATION_CENTER_SHEET,
    USER_NOTIFICATION_CENTER_HEADERS
  );
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(String);
  const col = notificationColumnMap_(headers);

  let updated = false;
  data.slice(1).some(function(row, index) {
    if (
      String(row[col.NotificationId] || "").trim() === id &&
      String(row[col.Username] || "").trim().toLowerCase() === String(username || "").trim().toLowerCase()
    ) {
      const rowIndex = index + 2;
      sh.getRange(rowIndex, col.IsRead + 1).setValue(true);
      sh.getRange(rowIndex, col.ReadAt + 1).setValue(new Date().toISOString());
      updated = true;
      return true;
    }
    return false;
  });

  if (updated) SpreadsheetApp.flush();
  return { success: updated, notificationId: id };
}

function apiMarkAllNotificationsRead(payload) {
  payload = payload || {};
  const username = requireUserFromToken_(payload.token);
  const sh = notificationGetOrCreateSheet_(
    USER_NOTIFICATION_CENTER_SHEET,
    USER_NOTIFICATION_CENTER_HEADERS
  );
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return { success: true, updated: 0 };

  const headers = data[0].map(String);
  const col = notificationColumnMap_(headers);
  let updated = 0;
  const now = new Date().toISOString();

  data.slice(1).forEach(function(row, index) {
    if (
      String(row[col.Username] || "").trim().toLowerCase() === String(username || "").trim().toLowerCase() &&
      !notificationBool_(row[col.IsRead], false)
    ) {
      const rowIndex = index + 2;
      sh.getRange(rowIndex, col.IsRead + 1).setValue(true);
      sh.getRange(rowIndex, col.ReadAt + 1).setValue(now);
      updated++;
    }
  });

  if (updated) SpreadsheetApp.flush();
  return { success: true, updated: updated };
}


/* =========================================================
   v1.2.18f WEB PUSH INFRASTRUCTURE + ADMIN CONTROLS
   Safe defaults:
   - Global mode starts OFF.
   - New per-game rows start disabled + test-only.
   - TEST mode always targets the signed-in admin only.
========================================================= */

const PUSH_SUBSCRIPTIONS_SHEET = "PushSubscriptions";
const PUSH_SYSTEM_SETTINGS_SHEET = "NotificationSystemSettings";
const PUSH_GAME_SETTINGS_SHEET = "GameNotificationSettings";
const PUSH_DELIVERY_LOG_SHEET = "PushDeliveryLog";

const PUSH_SUBSCRIPTION_HEADERS = [
  "SubscriptionId",
  "Username",
  "DeviceId",
  "DeviceLabel",
  "Endpoint",
  "P256dh",
  "Auth",
  "UserAgent",
  "Enabled",
  "CreatedAt",
  "UpdatedAt",
  "LastSuccessAt",
  "FailureCount",
  "LastError",
  "DisabledAt"
];

const PUSH_SYSTEM_SETTING_HEADERS = [
  "Key",
  "Value",
  "UpdatedAt",
  "UpdatedBy"
];

const PUSH_GAME_SETTING_HEADERS = [
  "GameId",
  "Enabled",
  "Paused",
  "TestOnly",
  "UpdatedAt",
  "UpdatedBy"
];

const PUSH_DELIVERY_LOG_HEADERS = [
  "Timestamp",
  "AdminUsername",
  "GlobalMode",
  "GameId",
  "Audience",
  "Type",
  "Title",
  "Message",
  "RecipientUsers",
  "SubscriptionsAttempted",
  "Sent",
  "Failed",
  "Expired",
  "Status",
  "Error"
];

function notificationPushNormalizeMode_(value) {
  const mode = String(value || "OFF").trim().toUpperCase();
  return ["OFF", "TEST", "LIVE"].indexOf(mode) !== -1 ? mode : "OFF";
}

function notificationPushNormalizeType_(value) {
  const type = String(value || "custom").trim().toLowerCase();
  const allowed = ["custom", "make_picks", "lock", "results", "new_game"];
  return allowed.indexOf(type) !== -1 ? type : "custom";
}

function notificationPushSafeHttpsUrl_(value) {
  const url = String(value || "").trim().slice(0, 900);
  return /^https:\/\//i.test(url) ? url : "";
}

function notificationPushSystemSettingsSheet_() {
  return notificationGetOrCreateSheet_(
    PUSH_SYSTEM_SETTINGS_SHEET,
    PUSH_SYSTEM_SETTING_HEADERS
  );
}

function notificationPushGameSettingsSheet_() {
  return notificationGetOrCreateSheet_(
    PUSH_GAME_SETTINGS_SHEET,
    PUSH_GAME_SETTING_HEADERS
  );
}

function notificationPushSubscriptionsSheet_() {
  return notificationGetOrCreateSheet_(
    PUSH_SUBSCRIPTIONS_SHEET,
    PUSH_SUBSCRIPTION_HEADERS
  );
}

function notificationPushDeliveryLogSheet_() {
  return notificationGetOrCreateSheet_(
    PUSH_DELIVERY_LOG_SHEET,
    PUSH_DELIVERY_LOG_HEADERS
  );
}

function notificationPushGetSystemMode_() {
  // Script Properties are the canonical runtime setting. They are a better fit
  // for a single global safety switch than a spreadsheet row and avoid stale or
  // duplicated sheet rows ever turning TEST/LIVE back to OFF after a save.
  const props = PropertiesService.getScriptProperties();
  const stored = String(props.getProperty("PUSH_GLOBAL_MODE") || "").trim();
  if (stored) {
    return notificationPushNormalizeMode_(stored);
  }

  // Backward-compatible fallback for the initial v1.2.18f sheet-backed value.
  const sh = notificationPushSystemSettingsSheet_();
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return "OFF";
  const headers = data[0].map(String);
  const col = notificationColumnMap_(headers);
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col.Key] || "").trim() === "GlobalMode") {
      const mode = notificationPushNormalizeMode_(data[i][col.Value]);
      props.setProperty("PUSH_GLOBAL_MODE", mode);
      return mode;
    }
  }
  return "OFF";
}

function notificationPushSetSystemSetting_(key, value, adminUsername) {
  const sh = notificationPushSystemSettingsSheet_();
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(String);
  const col = notificationColumnMap_(headers);
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col.Key] || "").trim() === String(key || "").trim()) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    rowIndex = notificationNextDataRow_(sh);
  }

  const values = {
    Key: String(key || "").trim(),
    Value: String(value === undefined || value === null ? "" : value),
    UpdatedAt: new Date().toISOString(),
    UpdatedBy: String(adminUsername || "").trim()
  };

  notificationWriteObjectRow_(sh, headers, rowIndex, values);
  SpreadsheetApp.flush();
}

function notificationPushGetGameSetting_(gameId) {
  gameId = String(gameId || "").trim();
  const defaults = {
    gameId: gameId,
    enabled: false,
    paused: false,
    testOnly: true
  };
  if (!gameId) return defaults;

  const sh = notificationPushGameSettingsSheet_();
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return defaults;
  const headers = data[0].map(String);
  const col = notificationColumnMap_(headers);

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col.GameId] || "").trim() === gameId) {
      return {
        gameId: gameId,
        enabled: notificationBool_(data[i][col.Enabled], false),
        paused: notificationBool_(data[i][col.Paused], false),
        testOnly: notificationBool_(data[i][col.TestOnly], true)
      };
    }
  }
  return defaults;
}

function notificationPushSaveGameSetting_(payload, adminUsername) {
  payload = payload || {};
  const gameId = String(payload.gameId || "").trim();
  if (!gameId) throw new Error("Game is required");

  const sh = notificationPushGameSettingsSheet_();
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(String);
  const col = notificationColumnMap_(headers);
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col.GameId] || "").trim() === gameId) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    rowIndex = notificationNextDataRow_(sh);
  }

  const values = {
    GameId: gameId,
    Enabled: notificationBool_(payload.enabled, false),
    Paused: notificationBool_(payload.paused, false),
    TestOnly: notificationBool_(payload.testOnly, true),
    UpdatedAt: new Date().toISOString(),
    UpdatedBy: String(adminUsername || "").trim()
  };

  notificationWriteObjectRow_(sh, headers, rowIndex, values);
  SpreadsheetApp.flush();

  return {
    gameId: gameId,
    enabled: values.Enabled,
    paused: values.Paused,
    testOnly: values.TestOnly
  };
}

function notificationPushGetGatewayConfig_() {
  const props = PropertiesService.getScriptProperties();
  const url = notificationPushSafeHttpsUrl_(props.getProperty("PUSH_GATEWAY_URL") || "");
  const token = String(props.getProperty("PUSH_GATEWAY_TOKEN") || "").trim();
  return {
    url: url,
    token: token,
    configured: !!(url && token)
  };
}

function apiAdminSavePushGatewayConfig(payload) {
  payload = payload || {};
  const adminUsername = requireAdminFromToken_(payload.token);
  const props = PropertiesService.getScriptProperties();

  const url = notificationPushSafeHttpsUrl_(payload.gatewayUrl);
  if (!url) {
    return { success: false, message: "Enter a valid HTTPS push gateway URL." };
  }

  const rawToken = String(payload.gatewayToken || "").trim();
  if (!rawToken && !props.getProperty("PUSH_GATEWAY_TOKEN")) {
    return { success: false, message: "Gateway token is required the first time." };
  }

  props.setProperty("PUSH_GATEWAY_URL", url);
  if (rawToken) props.setProperty("PUSH_GATEWAY_TOKEN", rawToken);

  notificationPushSetSystemSetting_("GatewayConfiguredAt", new Date().toISOString(), adminUsername);

  return {
    success: true,
    gatewayUrl: url,
    hasGatewayToken: true,
    message: "Cloudflare push gateway saved."
  };
}

function apiAdminSavePushSystemMode(payload) {
  payload = payload || {};
  const adminUsername = requireAdminFromToken_(payload.token);
  const mode = notificationPushNormalizeMode_(payload.mode);

  // Canonical write first. The sheet remains a readable admin/audit mirror.
  PropertiesService.getScriptProperties().setProperty("PUSH_GLOBAL_MODE", mode);
  notificationPushSetSystemSetting_("GlobalMode", mode, adminUsername);

  const persistedMode = notificationPushGetSystemMode_();
  if (persistedMode !== mode) {
    throw new Error(
      "Global notification mode did not persist. Requested " + mode +
      " but server read back " + persistedMode + "."
    );
  }

  return {
    success: true,
    mode: persistedMode,
    persistedMode: persistedMode,
    message: "Global notification mode saved: " + persistedMode
  };
}

function apiAdminSaveGameNotificationSettings(payload) {
  payload = payload || {};
  const adminUsername = requireAdminFromToken_(payload.token);
  const setting = notificationPushSaveGameSetting_(payload, adminUsername);
  return { success: true, setting: setting };
}

function notificationPushSubscriptionId_(username, endpoint) {
  const raw = String(username || "").trim().toLowerCase() + "|" + String(endpoint || "").trim();
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return digest.map(function(byte) {
    const n = byte < 0 ? byte + 256 : byte;
    return ("0" + n.toString(16)).slice(-2);
  }).join("").slice(0, 40);
}

function apiRegisterPushSubscription(payload) {
  payload = payload || {};
  const username = requireUserFromToken_(payload.token);
  const subscription = payload.subscription && typeof payload.subscription === "object"
    ? payload.subscription
    : {};
  const endpoint = notificationPushSafeHttpsUrl_(subscription.endpoint);
  const keys = subscription.keys && typeof subscription.keys === "object" ? subscription.keys : {};
  const p256dh = String(keys.p256dh || "").trim().slice(0, 600);
  const auth = String(keys.auth || "").trim().slice(0, 300);

  if (!endpoint || !p256dh || !auth) {
    return { success: false, message: "Push subscription is incomplete." };
  }

  const sh = notificationPushSubscriptionsSheet_();
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(String);
  const col = notificationColumnMap_(headers);
  const id = notificationPushSubscriptionId_(username, endpoint);
  let rowIndex = -1;
  let createdAt = "";

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col.SubscriptionId] || "").trim() === id) {
      rowIndex = i + 1;
      createdAt = data[i][col.CreatedAt] || "";
      break;
    }
  }

  if (rowIndex === -1) {
    rowIndex = notificationNextDataRow_(sh);
  }

  const now = new Date().toISOString();
  const values = {
    SubscriptionId: id,
    Username: String(username || "").trim().toLowerCase(),
    DeviceId: String(payload.deviceId || "").trim().slice(0, 120),
    DeviceLabel: String(payload.deviceLabel || "").trim().slice(0, 160),
    Endpoint: endpoint,
    P256dh: p256dh,
    Auth: auth,
    UserAgent: String(payload.userAgent || "").trim().slice(0, 500),
    Enabled: true,
    CreatedAt: createdAt || now,
    UpdatedAt: now,
    LastSuccessAt: "",
    FailureCount: 0,
    LastError: "",
    DisabledAt: ""
  };

  notificationWriteObjectRow_(sh, headers, rowIndex, values);
  SpreadsheetApp.flush();

  // Verify the same row inside this write execution. A registration is not
  // reported as successful unless the exact user/device/endpoint is durable.
  const stored = sh.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  const storedId = String(stored[col.SubscriptionId] || "").trim();
  const storedUser = String(stored[col.Username] || "").trim().toLowerCase();
  const storedDeviceId = String(stored[col.DeviceId] || "").trim();
  const storedEndpoint = String(stored[col.Endpoint] || "").trim();
  const storedEnabled = notificationBool_(stored[col.Enabled], false);
  const expectedUser = String(username || "").trim().toLowerCase();
  const expectedDeviceId = String(payload.deviceId || "").trim().slice(0, 120);

  const verified =
    storedId === id &&
    storedUser === expectedUser &&
    storedEndpoint === endpoint &&
    storedEnabled &&
    (!expectedDeviceId || storedDeviceId === expectedDeviceId);

  if (!verified) {
    throw new Error(
      "Push subscription write could not be verified in PushSubscriptions. " +
      "The notification sheet was repaired, but the device row did not read back correctly."
    );
  }

  const summary = apiGetPushSubscriptionSummary(payload.token, expectedDeviceId, endpoint);
  return {
    success: true,
    subscriptionId: id,
    enabled: true,
    verified: summary && summary.thisDeviceActive === true,
    thisDeviceActive: summary && summary.thisDeviceActive === true,
    activeDevices: summary ? Number(summary.activeDevices || 0) : 0,
    matchedBy: summary ? String(summary.matchedBy || "") : ""
  };
}

function apiRemovePushSubscription(payload) {
  payload = payload || {};
  const username = requireUserFromToken_(payload.token);
  const endpoint = String(payload.endpoint || "").trim();
  const deviceId = String(payload.deviceId || "").trim();
  const sh = notificationPushSubscriptionsSheet_();
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return { success: true, updated: 0 };
  const headers = data[0].map(String);
  const col = notificationColumnMap_(headers);
  const now = new Date().toISOString();
  let updated = 0;

  data.slice(1).forEach(function(row, index) {
    const sameUser = String(row[col.Username] || "").trim().toLowerCase() === String(username || "").trim().toLowerCase();
    const sameEndpoint = endpoint && String(row[col.Endpoint] || "").trim() === endpoint;
    const sameDevice = deviceId && String(row[col.DeviceId] || "").trim() === deviceId;
    if (sameUser && (sameEndpoint || sameDevice)) {
      const rowIndex = index + 2;
      sh.getRange(rowIndex, col.Enabled + 1).setValue(false);
      sh.getRange(rowIndex, col.UpdatedAt + 1).setValue(now);
      sh.getRange(rowIndex, col.DisabledAt + 1).setValue(now);
      updated++;
    }
  });

  if (updated) SpreadsheetApp.flush();
  return { success: true, updated: updated };
}

function apiGetPushSubscriptionSummary(token, deviceId, endpoint) {
  const username = requireUserFromToken_(token);
  const requestedDeviceId = String(deviceId || "").trim();
  const requestedEndpoint = String(endpoint || "").trim();
  const sh = notificationPushSubscriptionsSheet_();
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) {
    return {
      success: true,
      activeDevices: 0,
      thisDeviceActive: false,
      matchedBy: ""
    };
  }
  const headers = data[0].map(String);
  const col = notificationColumnMap_(headers);
  const activeRows = data.slice(1).filter(function(row) {
    return String(row[col.Username] || "").trim().toLowerCase() === String(username || "").trim().toLowerCase() &&
      notificationBool_(row[col.Enabled], false);
  });

  let matchedBy = "";
  const thisDeviceActive = activeRows.some(function(row) {
    const rowDeviceId = String(row[col.DeviceId] || "").trim();
    const rowEndpoint = String(row[col.Endpoint] || "").trim();
    if (requestedEndpoint && rowEndpoint === requestedEndpoint) {
      matchedBy = "endpoint";
      return true;
    }
    if (requestedDeviceId && rowDeviceId === requestedDeviceId) {
      matchedBy = "deviceId";
      return true;
    }
    return false;
  });

  return {
    success: true,
    activeDevices: activeRows.length,
    thisDeviceActive: thisDeviceActive,
    matchedBy: matchedBy
  };
}

function notificationPushGetActiveSubscriptionsForUsers_(usernames) {
  const wanted = {};
  (usernames || []).forEach(function(username) {
    const key = String(username || "").trim().toLowerCase();
    if (key) wanted[key] = true;
  });

  const sh = notificationPushSubscriptionsSheet_();
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0].map(String);
  const col = notificationColumnMap_(headers);
  const seenEndpoints = {};
  const subscriptions = [];

  // Newest row owns an endpoint even if it belongs to a different user or
  // is disabled. This prevents a stale older registration from receiving a
  // notification after the same browser/device has been reassigned.
  for (let index = data.length - 1; index >= 1; index--) {
    const row = data[index];
    const endpoint = String(row[col.Endpoint] || "").trim();
    if (!endpoint || seenEndpoints[endpoint]) continue;
    seenEndpoints[endpoint] = true;

    const username = String(row[col.Username] || "").trim().toLowerCase();
    if (!wanted[username] || !notificationBool_(row[col.Enabled], false)) continue;
    const p256dh = String(row[col.P256dh] || "").trim();
    const auth = String(row[col.Auth] || "").trim();
    if (!p256dh || !auth) continue;
    subscriptions.push({
      rowIndex: index + 1,
      subscriptionId: String(row[col.SubscriptionId] || "").trim(),
      username: username,
      endpoint: endpoint,
      keys: { p256dh: p256dh, auth: auth }
    });
  }

  return subscriptions.reverse();
}

function notificationPushCollectUsernamesFromSheet_(sheetName, gameId) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return [];
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0].map(function(value) { return String(value || "").trim(); });
  const col = notificationColumnMap_(headers);
  if (col.Username === undefined || col.GameId === undefined) return [];
  const wantedGame = String(gameId || "").trim();
  return data.slice(1).filter(function(row) {
    return String(row[col.GameId] || "").trim() === wantedGame;
  }).map(function(row) {
    return String(row[col.Username] || "").trim().toLowerCase();
  }).filter(Boolean);
}

function notificationPushGameParticipants_(gameId) {
  const unique = {};
  ["UserGameProfiles", "Picks", "Bets"].forEach(function(sheetName) {
    notificationPushCollectUsernamesFromSheet_(sheetName, gameId).forEach(function(username) {
      unique[username] = true;
    });
  });
  return Object.keys(unique);
}

function notificationPushAllUsernames_() {
  return getAllUserRecords_().map(function(record) {
    return String(record.user["Username"] || "").trim().toLowerCase();
  }).filter(Boolean);
}

function notificationPushPreferenceSnapshot_() {
  const sh = notificationGetOrCreateSheet_(USER_NOTIFICATION_PREFS_SHEET, USER_NOTIFICATION_PREF_HEADERS);
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return {};
  const headers = data[0].map(String);
  const col = notificationColumnMap_(headers);
  const snapshot = {};

  data.slice(1).forEach(function(row) {
    const username = String(row[col.Username] || "").trim().toLowerCase();
    if (!username) return;
    snapshot[username] = {
      app: notificationBool_(row[col.AppNotificationsEnabled], true),
      makePicks: notificationBool_(row[col.NotifyMakePicks], true),
      lock: notificationBool_(row[col.NotifyLockApproaching], true),
      results: notificationBool_(row[col.NotifyFinalResults], true),
      newGame: notificationBool_(row[col.NotifyNewGames], true)
    };
  });

  return snapshot;
}

function notificationPushUserAllowsType_(username, type, preferenceSnapshot) {
  const key = String(username || "").trim().toLowerCase();
  const prefs = preferenceSnapshot && preferenceSnapshot[key];
  if (!prefs) return true;
  if (prefs.app === false) return false;
  if (type === "make_picks") return prefs.makePicks !== false;
  if (type === "lock") return prefs.lock !== false;
  if (type === "results") return prefs.results !== false;
  if (type === "new_game") return prefs.newGame !== false;
  return true;
}

function notificationPushUniqueUsernames_(usernames) {
  const unique = {};
  (usernames || []).forEach(function(username) {
    const key = String(username || "").trim().toLowerCase();
    if (key) unique[key] = true;
  });
  return Object.keys(unique);
}


/* =========================================================
   v1.2.18h OUTSTANDING PICK REMINDER TARGETING
========================================================= */

function notificationPushNormalizeKey_(value) {
  return String(value === undefined || value === null ? "" : value)
    .trim()
    .toLowerCase();
}


function notificationPushUniqueIds_(values) {
  const seen = {};
  const result = [];
  (values || []).forEach(function(value) {
    const text = String(value || "").trim();
    const key = text.toLowerCase();
    if (!text || seen[key]) return;
    seen[key] = true;
    result.push(text);
  });
  return result;
}

function notificationPushColumnIndex_(headers, names) {
  const normalized = {};
  (headers || []).forEach(function(header, index) {
    normalized[notificationPushNormalizeKey_(header)] = index;
  });
  for (let i = 0; i < (names || []).length; i++) {
    const key = notificationPushNormalizeKey_(names[i]);
    if (Object.prototype.hasOwnProperty.call(normalized, key)) {
      return normalized[key];
    }
  }
  return -1;
}

function notificationPushValueFalse_(value) {
  if (value === false) return true;
  const text = notificationPushNormalizeKey_(value);
  return text === "false" || text === "0" || text === "no" || text === "off";
}

function notificationPushValueTrue_(value) {
  if (value === true) return true;
  const text = notificationPushNormalizeKey_(value);
  return text === "true" || text === "1" || text === "yes" || text === "on";
}

function notificationPushCategoryId_(category) {
  category = category || {};
  return String(
    category.categoryId ||
    category.CategoryId ||
    category.id ||
    category.Id ||
    ""
  ).trim();
}

function notificationPushCategoryScoreMode_(category, setting) {
  category = category || {};
  setting = setting || {};
  const nested = category.settings || category.Settings || {};
  let raw = notificationPushNormalizeKey_(
    setting.scoreMode ||
    setting.ScoreMode ||
    nested.scoreMode ||
    nested.ScoreMode ||
    category.scoreMode ||
    category.ScoreMode ||
    "correct-pick"
  ).replace(/_/g, "-");

  if (raw === "wager-odds" || raw === "sports-wager") raw = "wager";
  if (raw === "ranked") raw = "ranking";
  if (raw === "staked" || raw === "stake") raw = "staked-points";
  if (raw === "confidence" || raw === "confidence-pool") raw = "confidence-points";
  return raw;
}

function notificationPushCategoryIsLocked_(category, setting, nowMs) {
  category = category || {};
  setting = setting || {};
  const nested = category.settings || category.Settings || {};

  if (
    notificationPushValueTrue_(setting.locked) ||
    notificationPushValueTrue_(setting.Locked) ||
    notificationPushValueTrue_(nested.locked) ||
    notificationPushValueTrue_(nested.Locked) ||
    notificationPushValueTrue_(category.locked) ||
    notificationPushValueTrue_(category.Locked)
  ) {
    return true;
  }

  const lockValue =
    setting.lockDateTime ||
    setting.LockDateTime ||
    nested.lockDateTime ||
    nested.LockDateTime ||
    category.lockDateTime ||
    category.LockDateTime ||
    "";

  if (lockValue) {
    const parsed = new Date(lockValue).getTime();
    if (!isNaN(parsed) && parsed <= Number(nowMs || Date.now())) return true;
  }

  return false;
}

function notificationPushGamePicksClosed_(gameId) {
  try {
    if (typeof getGameById_ !== "function") return false;
    const game = getGameById_(gameId);
    if (!game) return false;
    if (
      notificationPushValueTrue_(game.lockAllPicks) ||
      notificationPushValueTrue_(game.LockAllPicks) ||
      notificationPushValueTrue_(game.archived) ||
      notificationPushValueTrue_(game.Archived)
    ) {
      return true;
    }
    const status = notificationPushNormalizeKey_(game.status || game.Status || "");
    return ["finished", "complete", "completed", "closed", "archived"].indexOf(status) !== -1;
  } catch (err) {
    return false;
  }
}

function notificationPushOpenPickQuestionIds_(gameId) {
  gameId = String(gameId || "").trim();
  if (!gameId || notificationPushGamePicksClosed_(gameId)) return [];

  const categories = typeof getCategories === "function" ? (getCategories(gameId) || []) : [];
  const settings = typeof getCategorySettings === "function" ? (getCategorySettings(gameId) || {}) : {};
  const nowMs = Date.now();
  const ids = [];

  (categories || []).forEach(function(category) {
    category = category || {};
    const categoryId = notificationPushCategoryId_(category);
    if (!categoryId) return;
    const setting = settings[categoryId] || {};

    if (
      notificationPushValueFalse_(category.active) ||
      notificationPushValueFalse_(category.Active) ||
      notificationPushValueTrue_(category.archived) ||
      notificationPushValueTrue_(category.Archived) ||
      notificationPushValueTrue_(setting.archived) ||
      notificationPushValueTrue_(setting.Archived)
    ) {
      return;
    }

    if (notificationPushCategoryIsLocked_(category, setting, nowMs)) return;

    const scoreMode = notificationPushCategoryScoreMode_(category, setting);
    if (scoreMode === "wager" || scoreMode === "ranking") return;

    const nominees = category.nominees || category.Nominees || [];
    const hasActiveChoice = (nominees || []).some(function(nominee) {
      nominee = nominee || {};
      if (notificationPushValueFalse_(nominee.active) || notificationPushValueFalse_(nominee.Active)) {
        return false;
      }
      return !!String(
        nominee.nomineeId || nominee.NomineeId || nominee.id || nominee.Id || nominee.nominee || nominee.name || ""
      ).trim();
    });
    if (!hasActiveChoice) return;

    ids.push(categoryId);
  });

  return notificationPushUniqueIds_(ids);
}

function notificationPushPickedQuestionMapByUser_(gameId) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Picks");
  if (!sh) return {};
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return {};
  const headers = data[0].map(function(value) { return String(value || "").trim(); });
  const gameCol = notificationPushColumnIndex_(headers, ["GameId"]);
  const userCol = notificationPushColumnIndex_(headers, ["Username"]);
  const categoryCol = notificationPushColumnIndex_(headers, ["CategoryId", "QuestionId"]);
  const nomineeCol = notificationPushColumnIndex_(headers, ["NomineeId", "AnswerId", "PickId", "Nominee"]);
  if (gameCol < 0 || userCol < 0 || categoryCol < 0) return {};

  const wantedGame = String(gameId || "").trim();
  const result = {};

  data.slice(1).forEach(function(row) {
    if (String(row[gameCol] || "").trim() !== wantedGame) return;
    const username = notificationPushNormalizeKey_(row[userCol]);
    const categoryId = String(row[categoryCol] || "").trim();
    if (!username || !categoryId) return;
    if (nomineeCol >= 0 && !String(row[nomineeCol] || "").trim()) return;
    if (!result[username]) result[username] = {};
    result[username][categoryId] = true;
  });

  return result;
}

function notificationPushOutstandingPickSummary_(gameId, participants) {
  const roster = notificationPushUniqueUsernames_(participants || []);
  const requiredIds = notificationPushOpenPickQuestionIds_(gameId);
  const pickedByUser = notificationPushPickedQuestionMapByUser_(gameId);
  const missingUsers = [];
  const noPicksUsers = [];
  const incompleteUsers = [];
  const completeUsers = [];
  const details = {};

  roster.forEach(function(username) {
    const picked = pickedByUser[username] || {};
    let answered = 0;
    requiredIds.forEach(function(categoryId) {
      if (picked[categoryId]) answered++;
    });
    const missing = Math.max(0, requiredIds.length - answered);
    details[username] = {
      answered: answered,
      required: requiredIds.length,
      missing: missing
    };

    if (!requiredIds.length || missing === 0) {
      completeUsers.push(username);
    } else if (answered === 0) {
      noPicksUsers.push(username);
      missingUsers.push(username);
    } else {
      incompleteUsers.push(username);
      missingUsers.push(username);
    }
  });

  return {
    requiredQuestionIds: requiredIds,
    requiredQuestions: requiredIds.length,
    rosterUsers: roster.length,
    noPicksUsers: noPicksUsers,
    incompleteUsers: incompleteUsers,
    completeUsers: completeUsers,
    missingUsers: missingUsers,
    details: details
  };
}


/* =========================================================
   v1.2.18i NOTIFICATION TEST LAB
   Dry-run helpers. These functions never write Picks or create
   synthetic users/subscriptions in the spreadsheet.
========================================================= */

function notificationPushTestLabState_(answered, required) {
  answered = Math.max(0, Number(answered || 0));
  required = Math.max(0, Number(required || 0));
  if (!required) return "no_open_questions";
  if (answered <= 0) return "no_picks";
  if (answered >= required) return "complete";
  return "incomplete";
}

function notificationPushTestLabRow_(options) {
  options = options || {};
  const required = Math.max(0, Number(options.required || 0));
  const answered = Math.min(required, Math.max(0, Number(options.answered || 0)));
  const missing = Math.max(0, required - answered);
  const allowsAlert = options.allowsAlert !== false;
  const activeDevices = Math.max(0, Number(options.activeDevices || 0));
  const state = notificationPushTestLabState_(answered, required);
  const owesPicks = required > 0 && missing > 0;
  const reminderEligible = owesPicks && allowsAlert;
  const wouldReceiveLive = reminderEligible && activeDevices > 0;

  let reason = "";
  if (!required) reason = "No open pick questions to remind about.";
  else if (!owesPicks) reason = "Excluded — picks complete.";
  else if (!allowsAlert) reason = "Excluded — player disabled Make Picks alerts.";
  else if (!activeDevices) reason = "Eligible — but no active push device is registered.";
  else if (state === "no_picks") reason = "Included — no picks have been made.";
  else reason = "Included — picks are incomplete.";

  return {
    username: String(options.username || "").trim(),
    label: String(options.label || options.username || "Test player").trim(),
    answered: answered,
    required: required,
    missing: missing,
    state: state,
    allowsAlert: allowsAlert,
    activeDevices: activeDevices,
    reminderEligible: reminderEligible,
    wouldReceiveLive: wouldReceiveLive,
    reason: reason
  };
}

function notificationPushTestLabSummary_(rows, requiredQuestions, mode, gameId) {
  rows = Array.isArray(rows) ? rows : [];
  const count = function(test) {
    return rows.filter(test).length;
  };
  const activeDevices = rows.reduce(function(total, row) {
    return total + Number(row.activeDevices || 0);
  }, 0);
  const liveDevices = rows.reduce(function(total, row) {
    return total + (row.wouldReceiveLive ? Number(row.activeDevices || 0) : 0);
  }, 0);

  return {
    success: true,
    testLab: true,
    mode: String(mode || "real"),
    gameId: String(gameId || ""),
    requiredPickQuestions: Math.max(0, Number(requiredQuestions || 0)),
    players: rows.length,
    noPicksUsers: count(function(row) { return row.state === "no_picks"; }),
    incompletePicksUsers: count(function(row) { return row.state === "incomplete"; }),
    completePicksUsers: count(function(row) { return row.state === "complete"; }),
    reminderEligibleUsers: count(function(row) { return row.reminderEligible; }),
    wouldReceiveLiveUsers: count(function(row) { return row.wouldReceiveLive; }),
    activeDevices: activeDevices,
    wouldReceiveLiveDevices: liveDevices,
    rows: rows
  };
}

function notificationPushTestLabSynthetic_(requiredCount) {
  const required = Math.max(1, Math.min(50, Math.round(Number(requiredCount || 5))));
  const partial = required > 1 ? Math.max(1, Math.floor(required / 2)) : 0;
  const rows = [
    notificationPushTestLabRow_({
      username: "synthetic-no-picks",
      label: "Synthetic — No picks",
      answered: 0,
      required: required,
      allowsAlert: true,
      activeDevices: 1
    }),
    notificationPushTestLabRow_({
      username: "synthetic-incomplete",
      label: "Synthetic — Incomplete",
      answered: partial,
      required: required,
      allowsAlert: true,
      activeDevices: 1
    }),
    notificationPushTestLabRow_({
      username: "synthetic-complete",
      label: "Synthetic — Complete",
      answered: required,
      required: required,
      allowsAlert: true,
      activeDevices: 1
    }),
    notificationPushTestLabRow_({
      username: "synthetic-no-device",
      label: "Synthetic — Missing picks / no device",
      answered: partial,
      required: required,
      allowsAlert: true,
      activeDevices: 0
    }),
    notificationPushTestLabRow_({
      username: "synthetic-opted-out",
      label: "Synthetic — Missing picks / alerts off",
      answered: partial,
      required: required,
      allowsAlert: false,
      activeDevices: 1
    })
  ];

  const result = notificationPushTestLabSummary_(rows, required, "synthetic", "");
  result.message =
    "Synthetic dry run: " + result.players + " test players · " +
    result.requiredPickQuestions + " required pick(s) · " +
    result.reminderEligibleUsers + " reminder-eligible · " +
    result.wouldReceiveLiveUsers + " would receive LIVE push · " +
    result.wouldReceiveLiveDevices + " target device(s).";
  return result;
}

function notificationPushTestLabReal_(gameId) {
  gameId = String(gameId || "").trim();
  if (!gameId) {
    return { success: false, testLab: true, message: "Choose a game for the real-game dry run." };
  }

  const participants = notificationPushUniqueUsernames_(notificationPushGameParticipants_(gameId));
  const pickSummary = notificationPushOutstandingPickSummary_(gameId, participants);
  const preferences = notificationPushPreferenceSnapshot_();
  const subscriptions = notificationPushGetActiveSubscriptionsForUsers_(participants);
  const devicesByUser = {};
  subscriptions.forEach(function(item) {
    const key = notificationPushNormalizeKey_(item.username);
    if (!key) return;
    devicesByUser[key] = Number(devicesByUser[key] || 0) + 1;
  });

  const rows = participants.map(function(username) {
    const detail = pickSummary.details[username] || {
      answered: 0,
      required: pickSummary.requiredQuestions,
      missing: pickSummary.requiredQuestions
    };
    return notificationPushTestLabRow_({
      username: username,
      label: username,
      answered: detail.answered,
      required: detail.required,
      allowsAlert: notificationPushUserAllowsType_(username, "make_picks", preferences),
      activeDevices: Number(devicesByUser[username] || 0)
    });
  });

  const result = notificationPushTestLabSummary_(rows, pickSummary.requiredQuestions, "real", gameId);
  result.requiredQuestionIds = pickSummary.requiredQuestionIds || [];
  result.message =
    "Real-game dry run: " + result.players + " player(s) · " +
    result.requiredPickQuestions + " open pick question(s) · " +
    result.noPicksUsers + " no picks · " +
    result.incompletePicksUsers + " incomplete · " +
    result.completePicksUsers + " complete · " +
    result.reminderEligibleUsers + " reminder-eligible · " +
    result.wouldReceiveLiveUsers + " would receive LIVE push on " +
    result.wouldReceiveLiveDevices + " device(s).";
  if (!result.players) result.message += " No players are currently attached to this game.";
  if (!result.requiredPickQuestions) result.message += " No currently open pick questions are available yet.";
  return result;
}

function notificationPushTestLabPreview_(payload, globalMode, gameSetting) {
  payload = payload || {};
  const mode = notificationPushNormalizeKey_(payload.testLabMode || "real");
  const result = mode === "synthetic"
    ? notificationPushTestLabSynthetic_(payload.syntheticRequiredPicks)
    : notificationPushTestLabReal_(payload.gameId);

  result.globalMode = String(globalMode || "OFF");
  result.gameEnabled = gameSetting ? gameSetting.enabled === true : null;
  result.gamePaused = gameSetting ? gameSetting.paused === true : null;
  result.gameTestOnly = gameSetting ? gameSetting.testOnly === true : null;
  result.dryRunOnly = true;
  result.wrotePicks = false;
  result.sentPush = false;
  return result;
}

function notificationPushAudienceResolution_(options) {
  options = options || {};
  const adminUsername = String(options.adminUsername || "").trim().toLowerCase();
  const gameId = String(options.gameId || "").trim();
  const audience = String(options.audience || "self").trim().toLowerCase();
  const type = notificationPushNormalizeType_(options.type);
  const forceTestRecipient = options.forceTestRecipient === true;
  const preferences = notificationPushPreferenceSnapshot_();
  const gameParticipants = gameId
    ? notificationPushUniqueUsernames_(notificationPushGameParticipants_(gameId))
    : [];
  const gameEligible = gameParticipants.filter(function(username) {
    return notificationPushUserAllowsType_(username, type, preferences);
  });
  const gameSubscriptions = notificationPushGetActiveSubscriptionsForUsers_(gameEligible);
  const gameActiveUsers = {};
  gameSubscriptions.forEach(function(item) { gameActiveUsers[item.username] = true; });

  const pickReminder = gameId
    ? notificationPushOutstandingPickSummary_(gameId, gameParticipants)
    : {
        requiredQuestionIds: [],
        requiredQuestions: 0,
        rosterUsers: 0,
        noPicksUsers: [],
        incompleteUsers: [],
        completeUsers: [],
        missingUsers: [],
        details: {}
      };
  const missingPickEligible = pickReminder.missingUsers.filter(function(username) {
    return notificationPushUserAllowsType_(username, type, preferences);
  });
  const missingPickSubscriptions = notificationPushGetActiveSubscriptionsForUsers_(missingPickEligible);
  const missingPickActiveUsers = {};
  missingPickSubscriptions.forEach(function(item) { missingPickActiveUsers[item.username] = true; });

  let requestedRecipients = [];
  if (audience === "game") requestedRecipients = gameParticipants;
  else if (audience === "missing_picks") requestedRecipients = pickReminder.missingUsers;
  else if (audience === "all") requestedRecipients = notificationPushAllUsernames_();
  else requestedRecipients = [adminUsername];

  requestedRecipients = notificationPushUniqueUsernames_(requestedRecipients).filter(function(username) {
    return notificationPushUserAllowsType_(username, type, preferences);
  });

  const recipients = forceTestRecipient
    ? notificationPushUniqueUsernames_([adminUsername])
    : requestedRecipients;
  const subscriptions = notificationPushGetActiveSubscriptionsForUsers_(recipients);
  const activeUsers = {};
  subscriptions.forEach(function(item) { activeUsers[item.username] = true; });

  return {
    requestedAudience: audience,
    effectiveAudience: forceTestRecipient ? "self-test" : audience,
    gameParticipants: gameParticipants.length,
    gameEligibleUsers: gameEligible.length,
    gameActiveUsers: Object.keys(gameActiveUsers).length,
    gameActiveDevices: gameSubscriptions.length,
    requiredPickQuestions: pickReminder.requiredQuestions,
    noPicksUsers: pickReminder.noPicksUsers.length,
    incompletePicksUsers: pickReminder.incompleteUsers.length,
    completePicksUsers: pickReminder.completeUsers.length,
    missingPicksUsers: pickReminder.missingUsers.length,
    missingPicksEligibleUsers: missingPickEligible.length,
    missingPicksActiveUsers: Object.keys(missingPickActiveUsers).length,
    missingPicksActiveDevices: missingPickSubscriptions.length,
    recipientUsers: recipients.length,
    activeUsers: Object.keys(activeUsers).length,
    activeDevices: subscriptions.length,
    recipients: recipients,
    subscriptions: subscriptions
  };
}

function notificationPushMarkDeliveryResult_(result) {
  result = result || {};
  const id = String(result.subscriptionId || "").trim();
  if (!id) return;
  const sh = notificationPushSubscriptionsSheet_();
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return;
  const headers = data[0].map(String);
  const col = notificationColumnMap_(headers);
  const now = new Date().toISOString();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col.SubscriptionId] || "").trim() !== id) continue;
    const rowIndex = i + 1;
    if (result.ok === true) {
      sh.getRange(rowIndex, col.LastSuccessAt + 1).setValue(now);
      sh.getRange(rowIndex, col.FailureCount + 1).setValue(0);
      sh.getRange(rowIndex, col.LastError + 1).setValue("");
    } else {
      const oldFailures = Number(data[i][col.FailureCount] || 0);
      sh.getRange(rowIndex, col.FailureCount + 1).setValue(oldFailures + 1);
      sh.getRange(rowIndex, col.LastError + 1).setValue(String(result.error || ("HTTP " + (result.statusCode || ""))).slice(0, 500));
      if (result.expired === true || Number(result.statusCode) === 404 || Number(result.statusCode) === 410) {
        sh.getRange(rowIndex, col.Enabled + 1).setValue(false);
        sh.getRange(rowIndex, col.DisabledAt + 1).setValue(now);
      }
    }
    sh.getRange(rowIndex, col.UpdatedAt + 1).setValue(now);
    break;
  }
}

function notificationPushGatewaySend_(subscriptions, notification) {
  const gateway = notificationPushGetGatewayConfig_();
  if (!gateway.configured) {
    return {
      success: false,
      message: "Cloudflare push gateway is not configured.",
      results: []
    };
  }

  const cleanSubscriptions = (subscriptions || []).map(function(item) {
    return {
      subscriptionId: item.subscriptionId,
      subscription: {
        endpoint: item.endpoint,
        keys: item.keys
      }
    };
  });

  if (!cleanSubscriptions.length) {
    return { success: true, sent: 0, failed: 0, expired: 0, results: [] };
  }

  const response = UrlFetchApp.fetch(gateway.url, {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    headers: {
      Authorization: "Bearer " + gateway.token
    },
    payload: JSON.stringify({
      subscriptions: cleanSubscriptions,
      notification: notification || {}
    })
  });

  const status = response.getResponseCode();
  let parsed = null;
  try {
    parsed = JSON.parse(response.getContentText() || "{}");
  } catch (err) {
    parsed = null;
  }

  if (status < 200 || status >= 300 || !parsed) {
    return {
      success: false,
      message: parsed && (parsed.message || parsed.error)
        ? parsed.message || parsed.error
        : "Cloudflare push gateway returned HTTP " + status + ".",
      results: []
    };
  }

  return parsed;
}

function notificationPushLogBatch_(entry) {
  entry = entry || {};
  notificationPushDeliveryLogSheet_().appendRow([
    new Date().toISOString(),
    entry.adminUsername || "",
    entry.globalMode || "",
    entry.gameId || "",
    entry.audience || "",
    entry.type || "",
    entry.title || "",
    entry.message || "",
    Number(entry.recipientUsers || 0),
    Number(entry.subscriptionsAttempted || 0),
    Number(entry.sent || 0),
    Number(entry.failed || 0),
    Number(entry.expired || 0),
    entry.status || "",
    entry.error || ""
  ]);
}

function apiAdminSendPushNotification(payload) {
  payload = payload || {};
  const adminUsername = String(requireAdminFromToken_(payload.token) || "").trim().toLowerCase();
  const globalMode = notificationPushGetSystemMode_();
  const gameId = String(payload.gameId || "").trim();
  const audience = String(payload.audience || "self").trim().toLowerCase();
  const type = notificationPushNormalizeType_(payload.type);
  const title = String(payload.title || "PATTC Predicts").trim().slice(0, 120);
  const message = String(payload.message || "").trim().slice(0, 500);
  const route = String(payload.route || "notifications").trim().slice(0, 80);
  const previewOnly = payload.previewOnly === true;
  const testLabPreview = payload.testLabPreview === true;
  const testLabSendToSelf = payload.testLabSendToSelf === true;

  let gameSetting = null;
  if (gameId) gameSetting = notificationPushGetGameSetting_(gameId);

  if (testLabPreview) {
    return notificationPushTestLabPreview_(payload, globalMode, gameSetting);
  }

  if (testLabSendToSelf && globalMode !== "TEST") {
    return {
      success: false,
      blocked: true,
      message: "Test Lab phone delivery requires Global Mode = TEST."
    };
  }

  if ((audience === "game" || audience === "missing_picks") && !gameId) {
    return {
      success: false,
      message: audience === "missing_picks"
        ? "Choose a game for the Players Missing Picks audience."
        : "Choose a game for the Game Players audience."
    };
  }

  const forceTestRecipient = testLabSendToSelf || globalMode === "TEST" || (gameSetting && gameSetting.testOnly === true);
  const resolution = notificationPushAudienceResolution_({
    adminUsername: adminUsername,
    gameId: gameId,
    audience: audience,
    type: type,
    forceTestRecipient: forceTestRecipient
  });

  let blockedMessage = "";
  if (globalMode === "OFF") blockedMessage = "Global notifications are OFF.";
  else if (!testLabSendToSelf && gameSetting && !gameSetting.enabled) blockedMessage = "Notifications are OFF for this game.";
  else if (!testLabSendToSelf && gameSetting && gameSetting.paused) blockedMessage = "Notifications are paused for this game.";

  if (previewOnly) {
    let previewMessage = "";
    if (audience === "missing_picks") {
      previewMessage = resolution.gameParticipants + " player(s) · " +
        resolution.requiredPickQuestions + " open pick question(s) · " +
        resolution.noPicksUsers + " no picks · " +
        resolution.incompletePicksUsers + " incomplete · " +
        resolution.completePicksUsers + " complete · " +
        resolution.missingPicksUsers + " still owe picks · " +
        resolution.missingPicksEligibleUsers + " eligible for this alert · " +
        resolution.missingPicksActiveDevices + " active device(s).";
      if (resolution.requiredPickQuestions === 0) {
        previewMessage += " No currently open pick questions need a reminder.";
      } else if (resolution.missingPicksUsers === 0) {
        previewMessage += " Everyone is caught up.";
      }
    } else if (audience === "game") {
      previewMessage = resolution.gameParticipants + " player(s) entered · " +
        resolution.gameEligibleUsers + " eligible for this alert · " +
        resolution.gameActiveDevices + " active device(s).";
    } else {
      previewMessage = resolution.recipientUsers + " eligible user(s) · " +
        resolution.activeDevices + " active device(s).";
    }
    if (forceTestRecipient) {
      previewMessage += " TEST delivery will go only to your signed-in admin account.";
    }
    if (blockedMessage) previewMessage += " Currently blocked: " + blockedMessage;

    return {
      success: true,
      preview: true,
      blocked: !!blockedMessage,
      blockReason: blockedMessage,
      globalMode: globalMode,
      testDelivery: forceTestRecipient,
      requestedAudience: resolution.requestedAudience,
      effectiveAudience: resolution.effectiveAudience,
      gameParticipants: resolution.gameParticipants,
      gameEligibleUsers: resolution.gameEligibleUsers,
      gameActiveUsers: resolution.gameActiveUsers,
      gameActiveDevices: resolution.gameActiveDevices,
      requiredPickQuestions: resolution.requiredPickQuestions,
      noPicksUsers: resolution.noPicksUsers,
      incompletePicksUsers: resolution.incompletePicksUsers,
      completePicksUsers: resolution.completePicksUsers,
      missingPicksUsers: resolution.missingPicksUsers,
      missingPicksEligibleUsers: resolution.missingPicksEligibleUsers,
      missingPicksActiveUsers: resolution.missingPicksActiveUsers,
      missingPicksActiveDevices: resolution.missingPicksActiveDevices,
      recipients: resolution.recipientUsers,
      activeUsers: resolution.activeUsers,
      subscriptions: resolution.activeDevices,
      message: previewMessage
    };
  }

  if (blockedMessage) {
    return { success: false, blocked: true, message: blockedMessage };
  }
  if (!title || !message) {
    return { success: false, message: "Title and message are required." };
  }
  if ((audience === "game" || audience === "missing_picks") && resolution.gameParticipants === 0) {
    return { success: false, blocked: true, message: "No players have entered this game yet." };
  }
  if (audience === "missing_picks" && resolution.requiredPickQuestions === 0) {
    return {
      success: false,
      blocked: true,
      message: "There are no currently open pick questions that need a reminder."
    };
  }
  if (audience === "missing_picks" && resolution.missingPicksUsers === 0) {
    return {
      success: false,
      blocked: true,
      message: "Everyone in this game has completed the currently open picks."
    };
  }
  if (audience === "missing_picks" && !forceTestRecipient && resolution.recipientUsers === 0) {
    return {
      success: false,
      blocked: true,
      message: "Players still owe picks, but none are eligible for this alert based on notification preferences."
    };
  }
  if (audience === "game" && !forceTestRecipient && resolution.recipientUsers === 0) {
    return {
      success: false,
      blocked: true,
      message: "Players have entered this game, but none are eligible for this alert based on notification preferences."
    };
  }

  const recipients = resolution.recipients;
  const subscriptions = resolution.subscriptions;

  recipients.forEach(function(username) {
    createUserNotification_({
      username: username,
      type: type,
      title: title,
      message: message,
      gameId: gameId,
      route: route
    });
  });

  const notification = {
    title: title,
    body: message,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: gameId ? "awards-" + gameId + "-" + type : "awards-" + type,
    data: {
      url: "./app.html#" + (route || "notifications"),
      route: route,
      gameId: gameId,
      type: type
    }
  };

  const gatewayResult = notificationPushGatewaySend_(subscriptions, notification);
  const results = Array.isArray(gatewayResult.results) ? gatewayResult.results : [];
  results.forEach(notificationPushMarkDeliveryResult_);
  if (results.length) SpreadsheetApp.flush();

  const sent = Number(gatewayResult.sent || results.filter(function(item) { return item.ok === true; }).length || 0);
  const failed = Number(gatewayResult.failed || results.filter(function(item) { return item.ok !== true; }).length || 0);
  const expired = Number(gatewayResult.expired || results.filter(function(item) { return item.expired === true; }).length || 0);
  const failureDetails = results.filter(function(item) { return item && item.ok !== true; }).slice(0, 3).map(function(item) {
    const statusCode = Number(item.statusCode || 0);
    const error = String(item.error || "").trim();
    return (statusCode ? "HTTP " + statusCode + (error ? ": " : "") : "") + (error || "Push delivery failed.");
  });
  const failureSummary = failureDetails.join(" | ").slice(0, 500);

  notificationPushLogBatch_({
    adminUsername: adminUsername,
    globalMode: globalMode,
    gameId: gameId,
    audience: resolution.effectiveAudience,
    type: type,
    title: title,
    message: message,
    recipientUsers: recipients.length,
    subscriptionsAttempted: subscriptions.length,
    sent: sent,
    failed: failed,
    expired: expired,
    status: gatewayResult.success === false || failed > 0 ? "FAILED" : "COMPLETE",
    error: gatewayResult.success === false
      ? String(gatewayResult.message || gatewayResult.error || "")
      : failureSummary
  });

  if (gatewayResult.success === false) {
    return {
      success: false,
      recipients: recipients.length,
      subscriptions: subscriptions.length,
      gameParticipants: resolution.gameParticipants,
      gameEligibleUsers: resolution.gameEligibleUsers,
      gameActiveDevices: resolution.gameActiveDevices,
      requiredPickQuestions: resolution.requiredPickQuestions,
      noPicksUsers: resolution.noPicksUsers,
      incompletePicksUsers: resolution.incompletePicksUsers,
      completePicksUsers: resolution.completePicksUsers,
      missingPicksUsers: resolution.missingPicksUsers,
      missingPicksEligibleUsers: resolution.missingPicksEligibleUsers,
      missingPicksActiveDevices: resolution.missingPicksActiveDevices,
      message: gatewayResult.message || "Push gateway failed."
    };
  }

  return {
    success: true,
    globalMode: globalMode,
    testDelivery: forceTestRecipient,
    requestedAudience: resolution.requestedAudience,
    effectiveAudience: resolution.effectiveAudience,
    gameParticipants: resolution.gameParticipants,
    gameEligibleUsers: resolution.gameEligibleUsers,
    gameActiveUsers: resolution.gameActiveUsers,
    gameActiveDevices: resolution.gameActiveDevices,
    requiredPickQuestions: resolution.requiredPickQuestions,
    noPicksUsers: resolution.noPicksUsers,
    incompletePicksUsers: resolution.incompletePicksUsers,
    completePicksUsers: resolution.completePicksUsers,
    missingPicksUsers: resolution.missingPicksUsers,
    missingPicksEligibleUsers: resolution.missingPicksEligibleUsers,
    missingPicksActiveUsers: resolution.missingPicksActiveUsers,
    missingPicksActiveDevices: resolution.missingPicksActiveDevices,
    recipients: recipients.length,
    activeUsers: resolution.activeUsers,
    subscriptions: subscriptions.length,
    sent: sent,
    failed: failed,
    expired: expired,
    failureDetails: failureDetails,
    message: subscriptions.length
      ? (failed > 0 && failureSummary
          ? "Push complete: " + sent + " sent, " + failed + " failed. " + failureSummary
          : "Push complete: " + sent + " sent, " + failed + " failed.")
      : "In-app notification created, but no active push subscription matched the audience."
  };
}

function notificationPushRecentLog_() {
  const sh = notificationPushDeliveryLogSheet_();
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0].map(String);
  const col = notificationColumnMap_(headers);
  return data.slice(1).slice(-25).reverse().map(function(row) {
    return {
      timestamp: row[col.Timestamp] || "",
      adminUsername: row[col.AdminUsername] || "",
      globalMode: row[col.GlobalMode] || "",
      gameId: row[col.GameId] || "",
      audience: row[col.Audience] || "",
      type: row[col.Type] || "",
      title: row[col.Title] || "",
      recipientUsers: Number(row[col.RecipientUsers] || 0),
      subscriptionsAttempted: Number(row[col.SubscriptionsAttempted] || 0),
      sent: Number(row[col.Sent] || 0),
      failed: Number(row[col.Failed] || 0),
      status: row[col.Status] || ""
    };
  });
}

function apiAdminGetPushControlCenter(token) {
  requireAdminFromToken_(token);
  const gateway = notificationPushGetGatewayConfig_();
  const games = typeof getGames === "function" ? (getGames() || []) : [];
  const sh = notificationPushSubscriptionsSheet_();
  const data = sh.getDataRange().getValues();
  let activeSubscriptions = 0;
  let activeUsers = {};
  if (data.length > 1) {
    const headers = data[0].map(String);
    const col = notificationColumnMap_(headers);
    data.slice(1).forEach(function(row) {
      if (notificationBool_(row[col.Enabled], false)) {
        activeSubscriptions++;
        const username = String(row[col.Username] || "").trim().toLowerCase();
        if (username) activeUsers[username] = true;
      }
    });
  }

  return {
    success: true,
    globalMode: notificationPushGetSystemMode_(),
    gateway: {
      configured: gateway.configured,
      url: gateway.url,
      hasToken: !!gateway.token
    },
    subscriptionStats: {
      activeSubscriptions: activeSubscriptions,
      activeUsers: Object.keys(activeUsers).length
    },
    games: games.map(function(game) {
      const gameId = String(game.gameId || game.id || "").trim();
      const setting = notificationPushGetGameSetting_(gameId);
      return {
        gameId: gameId,
        gameName: String(game.gameName || game.name || game.title || gameId).trim(),
        enabled: setting.enabled,
        paused: setting.paused,
        testOnly: setting.testOnly
      };
    }).filter(function(game) { return !!game.gameId; }),
    recent: notificationPushRecentLog_()
  };
}
