const fs = require('fs');
const path = require('path');
const assert = require('assert');

const projectRoot = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(projectRoot, 'frontend/js/app.js'), 'utf8');
const mirror = fs.readFileSync(path.join(projectRoot, 'frontend/app.js'), 'utf8');
const pwa = fs.readFileSync(path.join(projectRoot, 'frontend/js/pwa.js'), 'utf8');
const sw = fs.readFileSync(path.join(projectRoot, 'frontend/sw.js'), 'utf8');
const html = fs.readFileSync(path.join(projectRoot, 'frontend/app.html'), 'utf8');

assert(fs.existsSync(path.join(projectRoot, 'frontend/js/pages/adminGames.js')), 'adminGames.js must exist');
assert(app.includes('305-platform-image-engine'));
assert(app.includes('APP_MAIN_SCRIPT_URL'));
assert(app.includes('APP_PAGE_SCRIPT_BASE_URL'));
assert(app.includes('retryToken'));
assert(app.includes('Confirm this file exists:'));
assert(mirror.includes('new URL("./js/pages/", APP_MAIN_SCRIPT_URL)'));
assert(pwa.includes('isLocalDevelopment'));
assert(pwa.includes('registration.unregister()'));
assert(pwa.includes('window.caches.delete'));
assert(sw.includes('"./js/pages/adminGames.js"'));
assert(html.includes('305-platform-image-engine'));

console.log('Admin Games lazy loader tests passed.');
