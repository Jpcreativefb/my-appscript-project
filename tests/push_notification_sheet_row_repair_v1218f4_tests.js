const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

class MockRange {
  constructor(sheet, row, col, numRows = 1, numCols = 1) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      for (let c = 0; c < this.numCols; c++) {
        row.push(this.sheet.getCell_(this.row + r, this.col + c));
      }
      out.push(row);
    }
    return out;
  }
  setValues(values) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet.setCell_(this.row + r, this.col + c, values[r][c]);
      }
    }
    return this;
  }
  setValue(value) {
    this.sheet.setCell_(this.row, this.col, value);
    return this;
  }
  clearContent() {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet.setCell_(this.row + r, this.col + c, "");
      }
    }
    return this;
  }
}

class MockSheet {
  constructor(name) {
    this.name = name;
    this.rows = [];
  }
  ensure_(row, col) {
    while (this.rows.length < row) this.rows.push([]);
    while (this.rows[row - 1].length < col) this.rows[row - 1].push("");
  }
  getCell_(row, col) {
    if (!this.rows[row - 1] || this.rows[row - 1][col - 1] === undefined) return "";
    return this.rows[row - 1][col - 1];
  }
  setCell_(row, col, value) {
    this.ensure_(row, col);
    this.rows[row - 1][col - 1] = value;
  }
  getRange(row, col, numRows = 1, numCols = 1) {
    return new MockRange(this, row, col, numRows, numCols);
  }
  getDataRange() {
    return new MockRange(this, 1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1));
  }
  getLastRow() {
    let last = 0;
    this.rows.forEach((row, index) => {
      if (row.some(value => value !== "" && value !== null && value !== undefined)) last = index + 1;
    });
    return last;
  }
  getLastColumn() {
    let last = 0;
    this.rows.forEach(row => {
      row.forEach((value, index) => {
        if (value !== "" && value !== null && value !== undefined) last = Math.max(last, index + 1);
      });
    });
    return last;
  }
  insertRowAfter(row) {
    this.rows.splice(row, 0, []);
  }
  appendRow(values) {
    this.rows.push(values.slice());
  }
  setFrozenRows() {}
}

class MockSpreadsheet {
  constructor() { this.sheets = {}; }
  getSheetByName(name) { return this.sheets[name] || null; }
  insertSheet(name) {
    const sheet = new MockSheet(name);
    this.sheets[name] = sheet;
    return sheet;
  }
}

const spreadsheet = new MockSpreadsheet();
const scriptProps = new Map();
const context = {
  console,
  Date,
  Math,
  JSON,
  String,
  Number,
  Boolean,
  Array,
  Object,
  RegExp,
  Error,
  SpreadsheetApp: {
    getActive: () => spreadsheet,
    flush: () => {}
  },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: key => scriptProps.get(key) || "",
      setProperty: (key, value) => scriptProps.set(key, String(value))
    })
  },
  Utilities: {
    DigestAlgorithm: { SHA_256: "SHA_256" },
    Charset: { UTF_8: "UTF_8" },
    computeDigest: (_alg, value) => Array.from(crypto.createHash("sha256").update(String(value), "utf8").digest()),
    getUuid: () => "uuid-test"
  },
  requireUserFromToken_: token => {
    if (token !== "token") throw new Error("Invalid session");
    return "testuser";
  },
  requireAdminFromToken_: token => {
    if (token !== "token") throw new Error("Invalid admin session");
    return "testuser";
  },
  isAdmin: username => username === "testuser",
  getGames: () => []
};
vm.createContext(context);

const enginePath = path.join(__dirname, "..", "backend", "engines", "NotificationsEngine.js");
const source = fs.readFileSync(enginePath, "utf8");
assert(!source.includes('appendRow(new Array(headers.length).fill(""))'), "Unsafe blank appendRow pattern must be removed");
assert(source.includes("notificationRepairCanonicalHeaderRow_"));
assert(source.includes("notificationNextDataRow_"));
assert(source.includes("Push subscription write could not be verified"));
vm.runInContext(source, context, { filename: enginePath });

const pushHeaders = vm.runInContext("PUSH_SUBSCRIPTION_HEADERS.slice()", context);
const endpoint = "https://push.example.test/subscription/abc";
const id = vm.runInContext(`notificationPushSubscriptionId_("testuser", ${JSON.stringify(endpoint)})`, context);
const pushSheet = spreadsheet.insertSheet("PushSubscriptions");
const corruptedRow = new Array(pushHeaders.length).fill("");
const idx = Object.fromEntries(pushHeaders.map((h, i) => [h, i]));
corruptedRow[idx.SubscriptionId] = id;
corruptedRow[idx.Username] = "testuser";
corruptedRow[idx.DeviceId] = "device-old";
corruptedRow[idx.DeviceLabel] = "Old Device";
corruptedRow[idx.Endpoint] = endpoint;
corruptedRow[idx.P256dh] = "old-p256dh";
corruptedRow[idx.Auth] = "old-auth";
corruptedRow[idx.Enabled] = true;
corruptedRow[idx.CreatedAt] = "2026-08-21T00:00:00.000Z";
pushSheet.getRange(1, 1, 1, pushHeaders.length).setValues([corruptedRow]);

const result = vm.runInContext(`apiRegisterPushSubscription(${JSON.stringify({
  token: "token",
  deviceId: "device-1",
  deviceLabel: "Test iPhone",
  userAgent: "test-agent",
  subscription: {
    endpoint,
    keys: { p256dh: "new-p256dh", auth: "new-auth" }
  }
})})`, context);
assert.strictEqual(result.success, true);
assert.strictEqual(result.verified, true);
assert.strictEqual(result.thisDeviceActive, true);
assert.strictEqual(result.activeDevices, 1);
assert.strictEqual(JSON.stringify(pushSheet.getRange(1, 1, 1, pushHeaders.length).getValues()[0]), JSON.stringify(Array.from(pushHeaders)), "PushSubscriptions headers must be restored");
assert.strictEqual(pushSheet.getLastRow(), 2, "Corrupted header data should be salvaged into row 2, not duplicated");
const stored = pushSheet.getRange(2, 1, 1, pushHeaders.length).getValues()[0];
assert.strictEqual(stored[idx.SubscriptionId], id);
assert.strictEqual(stored[idx.Username], "testuser");
assert.strictEqual(stored[idx.DeviceId], "device-1");
assert.strictEqual(stored[idx.Endpoint], endpoint);
assert.strictEqual(stored[idx.Enabled], true);

const summary = vm.runInContext(`apiGetPushSubscriptionSummary("token", "device-1", ${JSON.stringify(endpoint)})`, context);
assert.strictEqual(summary.success, true);
assert.strictEqual(summary.activeDevices, 1);
assert.strictEqual(summary.thisDeviceActive, true);
assert(["endpoint", "deviceId"].includes(summary.matchedBy));

// New rows for the other notification settings must start at row 2 and leave headers intact.
vm.runInContext(`apiSaveNotificationPreferences({token:"token", appNotificationsEnabled:true, notifyMakePicks:true, notifyLockApproaching:true, notifyFinalResults:true, notifyNewGames:true})`, context);
const prefsHeaders = vm.runInContext("USER_NOTIFICATION_PREF_HEADERS.slice()", context);
const prefsSheet = spreadsheet.getSheetByName("NotificationPreferences");
assert.strictEqual(JSON.stringify(prefsSheet.getRange(1,1,1,prefsHeaders.length).getValues()[0]), JSON.stringify(Array.from(prefsHeaders)));
assert.strictEqual(prefsSheet.getLastRow(), 2);

vm.runInContext(`notificationPushSetSystemSetting_("GlobalMode", "TEST", "testuser")`, context);
const sysHeaders = vm.runInContext("PUSH_SYSTEM_SETTING_HEADERS.slice()", context);
const sysSheet = spreadsheet.getSheetByName("NotificationSystemSettings");
assert.strictEqual(JSON.stringify(sysSheet.getRange(1,1,1,sysHeaders.length).getValues()[0]), JSON.stringify(Array.from(sysHeaders)));
assert.strictEqual(sysSheet.getLastRow(), 2);

vm.runInContext(`notificationPushSaveGameSetting_({gameId:"game-1", enabled:true, paused:false, testOnly:true}, "testuser")`, context);
const gameHeaders = vm.runInContext("PUSH_GAME_SETTING_HEADERS.slice()", context);
const gameSheet = spreadsheet.getSheetByName("GameNotificationSettings");
assert.strictEqual(JSON.stringify(gameSheet.getRange(1,1,1,gameHeaders.length).getValues()[0]), JSON.stringify(Array.from(gameHeaders)));
assert.strictEqual(gameSheet.getLastRow(), 2);

console.log("push-notification-sheet-row-repair-v1218f4-tests: PASS");
