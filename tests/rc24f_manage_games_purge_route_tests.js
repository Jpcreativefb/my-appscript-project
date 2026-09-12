const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const api = read('backend/Api.js');
const jsApp = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const shell = read('frontend/app.html');

assert(api.includes('return json(apiAdminPermanentGamePurgeDryRun(params));'));
assert(api.includes('return json(apiAdminPermanentGamePurge(params));'));
assert(!api.includes('return json(apiAdminPermanentGamePurgeDryRun(body));'));
assert(!api.includes('return json(apiAdminPermanentGamePurge(body));'));

assert.strictEqual(jsApp, appMirror, 'frontend app.js mirrors must match');
assert(jsApp.includes('"admin-games": ["admin", "adminUi", "adminGamesRc24e"]'));
const route = jsApp.slice(jsApp.indexOf('case "admin-games":'), jsApp.indexOf('case "admin-awards":'));
assert(
  route.includes('renderAdminGamesPage()') || route.includes('renderAdminGamesPanel()'),
  'Manage Games route must invoke an installed renderer'
);
assert(
  route.includes('Manage Games page script is not loaded.') ||
  route.includes('Manage Games full editor script is not loaded.'),
  'Manage Games route guard missing'
);

assert(shell.includes('routefix=rc24f-manage-games-purge-route-r1'));

console.log('RC24F Manage Games + purge route tests: PASS');
