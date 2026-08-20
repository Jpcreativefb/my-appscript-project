/* =========================================================
   DEVICE SESSION ENGINE — v1.2.18a
   Persistent, revocable per-device sessions. Raw bearer
   tokens are never stored in Sheets.
========================================================= */

var USER_SESSIONS_SHEET = "UserSessions";
var USER_SESSION_HEADERS = [
  "SessionId",
  "Username",
  "TokenHash",
  "DeviceId",
  "DeviceLabel",
  "RememberMe",
  "CreatedAt",
  "LastUsedAt",
  "ExpiresAt",
  "RevokedAt",
  "LastUpdated"
];

function authGetDeviceSessionsSheet_() {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(USER_SESSIONS_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(USER_SESSIONS_SHEET);
    sheet.getRange(1, 1, 1, USER_SESSION_HEADERS.length)
      .setValues([USER_SESSION_HEADERS]);
    sheet.setFrozenRows(1);
  }

  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var existing = sheet.getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(function(value) { return String(value || "").trim(); });

  USER_SESSION_HEADERS.forEach(function(header) {
    if (existing.indexOf(header) !== -1) return;
    existing.push(header);
    sheet.getRange(1, existing.length).setValue(header);
  });

  return sheet;
}

function authDeviceSessionColumnMap_(headers) {
  var map = {};
  (headers || []).forEach(function(header, index) {
    map[String(header || "").trim()] = index;
  });
  return map;
}

function authReadDeviceSessions_() {
  var sheet = authGetDeviceSessionsSheet_();
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  var values = sheet.getRange(1, 1, Math.max(lastRow, 1), lastColumn).getValues();
  var headers = values[0].map(function(value) { return String(value || "").trim(); });
  var col = authDeviceSessionColumnMap_(headers);

  return {
    sheet: sheet,
    headers: headers,
    col: col,
    rows: values.slice(1)
  };
}

function authSessionDurationMs_(rememberMe) {
  return (rememberMe ? 90 : 1) * 24 * 60 * 60 * 1000;
}

function authCreateDeviceSession_(username, token, rememberMe, deviceId, deviceLabel) {
  username = String(username || "").trim();
  token = String(token || "").trim();
  deviceId = String(deviceId || "").trim();
  deviceLabel = String(deviceLabel || "").trim().slice(0, 160);

  if (!username || !token) {
    throw new Error("Cannot create an empty device session");
  }

  var now = new Date();
  var expiresAt = new Date(now.getTime() + authSessionDurationMs_(rememberMe));
  var sheet = authGetDeviceSessionsSheet_();
  var tokenHash = hashSessionTokenForStorage_(token);

  sheet.appendRow([
    Utilities.getUuid(),
    username,
    tokenHash,
    deviceId,
    deviceLabel,
    rememberMe === true,
    now.toISOString(),
    now.toISOString(),
    expiresAt.toISOString(),
    "",
    now.toISOString()
  ]);

  SpreadsheetApp.flush();

  return {
    username: username,
    rememberMe: rememberMe === true,
    deviceId: deviceId,
    deviceLabel: deviceLabel,
    expiresAt: expiresAt.toISOString()
  };
}

function authFindDeviceSession_(token) {
  token = String(token || "").trim();
  if (!token) return null;

  var data = authReadDeviceSessions_();
  var col = data.col;
  var now = Date.now();

  for (var i = 0; i < data.rows.length; i++) {
    var row = data.rows[i];
    var storedToken = String(row[col.TokenHash] || "").trim();

    if (!storedSessionTokenMatches_(storedToken, token)) continue;

    var revokedAt = String(row[col.RevokedAt] || "").trim();
    if (revokedAt) return null;

    var expiresAt = row[col.ExpiresAt];
    var expiresMs = expiresAt ? new Date(expiresAt).getTime() : 0;
    if (!expiresMs || expiresMs <= now) return null;

    var username = String(row[col.Username] || "").trim();
    var userRecord = findUserRecordByUsername_(username);
    if (!userRecord || !isUserRecordActive_(userRecord)) return null;

    return {
      sheet: data.sheet,
      col: col,
      row: row,
      rowNumber: i + 2,
      username: username,
      rememberMe:
        row[col.RememberMe] === true ||
        String(row[col.RememberMe] || "").toLowerCase() === "true",
      deviceId: String(row[col.DeviceId] || "").trim(),
      deviceLabel: String(row[col.DeviceLabel] || "").trim(),
      createdAt: row[col.CreatedAt],
      lastUsedAt: row[col.LastUsedAt],
      expiresAt: expiresAt,
      userRecord: userRecord
    };
  }

  return null;
}

function authTouchDeviceSession_(session) {
  if (!session || !session.sheet || !session.col || !session.rowNumber) return session;

  var now = new Date();
  var nextExpiry = session.rememberMe
    ? new Date(now.getTime() + authSessionDurationMs_(true))
    : new Date(session.expiresAt);

  var updates = {
    LastUsedAt: now.toISOString(),
    LastUpdated: now.toISOString()
  };

  // Remembered sessions use a sliding 90-day window. A session-only login
  // never gets silently promoted into a remembered login.
  if (session.rememberMe) {
    updates.ExpiresAt = nextExpiry.toISOString();
    session.expiresAt = updates.ExpiresAt;
  }

  Object.keys(updates).forEach(function(header) {
    var index = session.col[header];
    if (index === undefined || index < 0) return;
    session.sheet.getRange(session.rowNumber, index + 1).setValue(updates[header]);
  });

  SpreadsheetApp.flush();
  return session;
}

function authRevokeDeviceSession_(token) {
  var session = authFindDeviceSession_(token);
  if (!session) {
    return { success: true, revoked: false };
  }

  var now = new Date().toISOString();
  session.sheet.getRange(session.rowNumber, session.col.RevokedAt + 1).setValue(now);
  session.sheet.getRange(session.rowNumber, session.col.LastUpdated + 1).setValue(now);
  SpreadsheetApp.flush();

  CacheService.getScriptCache().remove(String(token || "").trim());

  return {
    success: true,
    revoked: true,
    username: session.username
  };
}

function authRevokeAllDeviceSessionsForUser_(username) {
  username = String(username || "").trim().toLowerCase();
  if (!username) return 0;

  var data = authReadDeviceSessions_();
  var now = new Date().toISOString();
  var count = 0;

  data.rows.forEach(function(row, index) {
    var rowUsername = String(row[data.col.Username] || "").trim().toLowerCase();
    var revokedAt = String(row[data.col.RevokedAt] || "").trim();
    if (rowUsername !== username || revokedAt) return;

    data.sheet.getRange(index + 2, data.col.RevokedAt + 1).setValue(now);
    data.sheet.getRange(index + 2, data.col.LastUpdated + 1).setValue(now);
    count += 1;
  });

  if (count) SpreadsheetApp.flush();
  return count;
}
