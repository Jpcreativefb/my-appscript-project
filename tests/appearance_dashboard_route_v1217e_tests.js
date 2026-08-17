const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const api = fs.readFileSync(path.join(root, 'backend', 'Api.js'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'backend', 'engines', 'AppearanceEngine.js'), 'utf8');

assert(
  api.includes('if (action === "adminGetAppearanceDashboard")') &&
  api.includes('apiAdminGetAppearanceDashboard(params)'),
  'GET router must expose adminGetAppearanceDashboard.'
);
assert(
  api.includes('if (action === "getGameAppearance")') &&
  api.includes('apiGetGameAppearance({'),
  'GET router must expose getGameAppearance.'
);
assert(
  engine.includes('function apiAdminGetAppearanceDashboard(payload)') &&
  engine.includes('function apiGetGameAppearance(payload)'),
  'AppearanceEngine must expose dashboard and player appearance wrappers.'
);
console.log('PASS: Appearance dashboard API routes are wired.');
