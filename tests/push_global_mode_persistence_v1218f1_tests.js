const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const engine = read('backend/engines/NotificationsEngine.js');
const notifications = read('frontend/js/pages/notifications.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');
const appHtml = read('frontend/app.html');
const indexHtml = read('frontend/index.html');

assert.strictEqual(app, appMirror, 'frontend app mirrors must stay identical');
assert(engine.includes('getProperty("PUSH_GLOBAL_MODE")'), 'global mode must read canonical Script Property');
assert(engine.includes('setProperty("PUSH_GLOBAL_MODE", mode)'), 'global mode save must write canonical Script Property');
assert(engine.includes('const persistedMode = notificationPushGetSystemMode_();'), 'backend save must read back persisted mode');
assert(engine.includes('if (persistedMode !== mode)'), 'backend save must reject persistence mismatch');
assert(engine.includes('notificationPushSetSystemSetting_("GlobalMode", mode, adminUsername)'), 'sheet audit mirror must remain');

assert(notifications.includes('const requestedMode ='), 'frontend must preserve requested global mode');
assert(notifications.includes('const persistedMode = String(res.persistedMode || res.mode || "")'), 'frontend must check server-returned mode');
assert(notifications.includes('const verify = await apiAdminGetPushControlCenter()'), 'frontend must verify saved mode with fresh control-center read');
assert(notifications.includes('verifiedMode !== persistedMode'), 'frontend must reject verification mismatch');
assert(notifications.includes('button.textContent = "Saving…"'), 'save button must show progress');

[
  app,
  pwa,
  sw,
  appHtml,
  indexHtml
].forEach((source, i) => {
  assert(source.includes('v1218f1-global-mode-persistence'), '18f1 cache marker missing in shell file #' + i);
});

console.log('v1.2.18f1 global notification mode persistence tests passed.');
