const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const api = fs.readFileSync(path.join(root, 'backend', 'Api.js'), 'utf8');
const frontendApi = fs.readFileSync(path.join(root, 'frontend', 'js', 'api.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const getRouterStart = api.indexOf('if (action === "adminGetGames")');
const getRouterEnd = api.indexOf('if (action === "adminSaveGame")', getRouterStart);
assert(getRouterStart >= 0 && getRouterEnd > getRouterStart, 'Could not locate GET admin router.');
const getRouter = api.slice(getRouterStart, getRouterEnd);

[
  'adminSaveAppearanceImagePack',
  'adminSaveAppearanceImagePackItem',
  'adminSaveAppearanceThemePack',
  'adminSaveGameAppearance',
  'adminSaveAppearanceOverride'
].forEach((action) => {
  assert(getRouter.includes(`if (action === "${action}")`), `${action} missing from direct GET router.`);
});

assert(
  frontendApi.includes('return api("adminSaveAppearanceImagePackItem"'),
  'Frontend image-pack item save is not using the direct Apps Script transport.'
);

console.log('PASS appearance direct write routes v1.2.17j');
