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

