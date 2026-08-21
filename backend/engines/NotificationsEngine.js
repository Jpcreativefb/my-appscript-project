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

  const lastColumn = Math.max(sh.getLastColumn(), 1);
  const existing = sh.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map(function(value) { return String(value || "").trim(); });

  headers.forEach(function(header) {
    if (existing.indexOf(header) === -1) {
      sh.getRange(1, sh.getLastColumn() + 1).setValue(header);
      existing.push(header);
    }
  });

  sh.setFrozenRows(1);
  return sh;
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
    sh.appendRow(new Array(headers.length).fill(""));
    rowIndex = sh.getLastRow();
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

  Object.keys(values).forEach(function(header) {
    if (col[header] !== undefined) {
      sh.getRange(rowIndex, col[header] + 1).setValue(values[header]);
    }
  });

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
    String(entry.title || "Awards App").trim(),
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
    sh.appendRow(new Array(headers.length).fill(""));
    rowIndex = sh.getLastRow();
  }

  const values = {
    Key: String(key || "").trim(),
    Value: String(value === undefined || value === null ? "" : value),
    UpdatedAt: new Date().toISOString(),
    UpdatedBy: String(adminUsername || "").trim()
  };

  Object.keys(values).forEach(function(header) {
    if (col[header] !== undefined) {
      sh.getRange(rowIndex, col[header] + 1).setValue(values[header]);
    }
  });

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
    sh.appendRow(new Array(headers.length).fill(""));
    rowIndex = sh.getLastRow();
  }

  const values = {
    GameId: gameId,
    Enabled: notificationBool_(payload.enabled, false),
    Paused: notificationBool_(payload.paused, false),
    TestOnly: notificationBool_(payload.testOnly, true),
    UpdatedAt: new Date().toISOString(),
    UpdatedBy: String(adminUsername || "").trim()
  };

  Object.keys(values).forEach(function(header) {
    if (col[header] !== undefined) {
      sh.getRange(rowIndex, col[header] + 1).setValue(values[header]);
    }
  });

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
    sh.appendRow(new Array(headers.length).fill(""));
    rowIndex = sh.getLastRow();
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

  Object.keys(values).forEach(function(header) {
    if (col[header] !== undefined) {
      sh.getRange(rowIndex, col[header] + 1).setValue(values[header]);
    }
  });

  SpreadsheetApp.flush();
  return { success: true, subscriptionId: id, enabled: true };
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

function apiGetPushSubscriptionSummary(token) {
  const username = requireUserFromToken_(token);
  const sh = notificationPushSubscriptionsSheet_();
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return { success: true, activeDevices: 0 };
  const headers = data[0].map(String);
  const col = notificationColumnMap_(headers);
  const active = data.slice(1).filter(function(row) {
    return String(row[col.Username] || "").trim().toLowerCase() === String(username || "").trim().toLowerCase() &&
      notificationBool_(row[col.Enabled], false);
  }).length;
  return { success: true, activeDevices: active };
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

  return data.slice(1).map(function(row, index) {
    const username = String(row[col.Username] || "").trim().toLowerCase();
    if (!wanted[username] || !notificationBool_(row[col.Enabled], false)) return null;
    const endpoint = String(row[col.Endpoint] || "").trim();
    const p256dh = String(row[col.P256dh] || "").trim();
    const auth = String(row[col.Auth] || "").trim();
    if (!endpoint || !p256dh || !auth) return null;
    return {
      rowIndex: index + 2,
      subscriptionId: String(row[col.SubscriptionId] || "").trim(),
      username: username,
      endpoint: endpoint,
      keys: { p256dh: p256dh, auth: auth }
    };
  }).filter(Boolean);
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

function notificationPushUserAllowsType_(username, type) {
  const sh = notificationGetOrCreateSheet_(USER_NOTIFICATION_PREFS_SHEET, USER_NOTIFICATION_PREF_HEADERS);
  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return true;
  const headers = data[0].map(String);
  const col = notificationColumnMap_(headers);
  const key = String(username || "").trim().toLowerCase();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col.Username] || "").trim().toLowerCase() !== key) continue;
    if (!notificationBool_(data[i][col.AppNotificationsEnabled], true)) return false;
    if (type === "make_picks") return notificationBool_(data[i][col.NotifyMakePicks], true);
    if (type === "lock") return notificationBool_(data[i][col.NotifyLockApproaching], true);
    if (type === "results") return notificationBool_(data[i][col.NotifyFinalResults], true);
    if (type === "new_game") return notificationBool_(data[i][col.NotifyNewGames], true);
    return true;
  }
  return true;
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
  const title = String(payload.title || "Awards App").trim().slice(0, 120);
  const message = String(payload.message || "").trim().slice(0, 500);
  const route = String(payload.route || "notifications").trim().slice(0, 80);

  if (globalMode === "OFF") {
    return { success: false, blocked: true, message: "Global notifications are OFF." };
  }
  if (!title || !message) {
    return { success: false, message: "Title and message are required." };
  }

  let gameSetting = null;
  if (gameId) {
    gameSetting = notificationPushGetGameSetting_(gameId);
    if (!gameSetting.enabled) {
      return { success: false, blocked: true, message: "Notifications are OFF for this game." };
    }
    if (gameSetting.paused) {
      return { success: false, blocked: true, message: "Notifications are paused for this game." };
    }
  }

  let recipients = [];
  const forceTestRecipient = globalMode === "TEST" || (gameSetting && gameSetting.testOnly === true);
  if (forceTestRecipient || audience === "self") {
    recipients = [adminUsername];
  } else if (audience === "game") {
    if (!gameId) return { success: false, message: "Choose a game for the Game Players audience." };
    recipients = notificationPushGameParticipants_(gameId);
  } else if (audience === "all") {
    recipients = notificationPushAllUsernames_();
  } else {
    recipients = [adminUsername];
  }

  const unique = {};
  recipients.forEach(function(username) {
    const key = String(username || "").trim().toLowerCase();
    if (key) unique[key] = true;
  });
  recipients = Object.keys(unique).filter(function(username) {
    return forceTestRecipient || notificationPushUserAllowsType_(username, type);
  });

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

  const subscriptions = notificationPushGetActiveSubscriptionsForUsers_(recipients);
  const notification = {
    title: title,
    body: message,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: gameId ? "awards-" + gameId + "-" + type : "awards-" + type,
    data: {
      url: "./app.html#notifications",
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

  notificationPushLogBatch_({
    adminUsername: adminUsername,
    globalMode: globalMode,
    gameId: gameId,
    audience: forceTestRecipient ? "self-test" : audience,
    type: type,
    title: title,
    message: message,
    recipientUsers: recipients.length,
    subscriptionsAttempted: subscriptions.length,
    sent: sent,
    failed: failed,
    expired: expired,
    status: gatewayResult.success === false ? "FAILED" : "COMPLETE",
    error: gatewayResult.success === false ? String(gatewayResult.message || gatewayResult.error || "") : ""
  });

  if (gatewayResult.success === false) {
    return {
      success: false,
      recipients: recipients.length,
      subscriptions: subscriptions.length,
      message: gatewayResult.message || "Push gateway failed."
    };
  }

  return {
    success: true,
    globalMode: globalMode,
    testDelivery: forceTestRecipient,
    recipients: recipients.length,
    subscriptions: subscriptions.length,
    sent: sent,
    failed: failed,
    expired: expired,
    message: subscriptions.length
      ? "Push complete: " + sent + " sent, " + failed + " failed."
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
