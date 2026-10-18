'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function includes(source, marker, message) {
  assert.ok(source.includes(marker), message + ' (missing: ' + marker + ')');
}

function extractFrozenStringArray(source, constantName) {
  const expression = new RegExp(
    'const\\s+' + constantName + '\\s*=\\s*Object\\.freeze\\(\\[([\\s\\S]*?)\\]\\);'
  );
  const match = source.match(expression);
  assert.ok(match, 'Unable to locate ' + constantName + ' canonical registry');
  return Array.from(match[1].matchAll(/["']([^"']+)["']/g), (entry) => entry[1]);
}

const adminShell = read('frontend/js/adminGameBuilderNavigationShellR2.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const api = read('frontend/js/api.js');
const apiMirror = read('frontend/api.js');
const dashboard = read('frontend/js/pages/dashboard.js');
const appearanceRuntime = read('frontend/js/appearanceThemeRuntime.js');
const navigationSlots = read('frontend/js/navigationSlotsR1.js');

// General / Custom: the current canonical registry is exactly these eight types.
const expectedGeneralCustomTypes = [
  'prediction',
  'head-to-head',
  'staked-prediction',
  'wager',
  'racing-wager',
  'mixed',
  'voting',
  'ranking'
];
const actualGeneralCustomTypes = extractFrozenStringArray(adminShell, 'OTHER_GAME_TYPES_R3B');
assert.deepStrictEqual(actualGeneralCustomTypes, expectedGeneralCustomTypes, 'General / Custom canonical registry changed');
assert.strictEqual(actualGeneralCustomTypes.length, 8, 'General / Custom must contain exactly eight canonical types');
assert.ok(!actualGeneralCustomTypes.includes('prediction-market'), 'Prediction Market must remain outside General / Custom');

// Accepted Sports routes and current NFL season/setup authority.
[
  'admin-games',
  'admin-team-fantasy',
  'admin-nfl-cup',
  'admin-playoff-race',
  'admin-sports-engine',
  'admin-nfl-season-setup'
].forEach((route) => includes(adminShell, route, 'Accepted Sports route must remain represented'));

// Accepted Sports organization and Game Builder choices.
[
  'Game Builder',
  'Manage Existing Games',
  'Competitions',
  'League / Season Data',
  'Operations',
  'Confidence',
  'Survivor',
  'Team Fantasy',
  'Playoff / Forecast',
  'Other Game'
].forEach((label) => includes(adminShell, label, 'Accepted Sports organization marker must remain represented'));

// Home Hub / saved-profile initialization and preservation path.
includes(app, 'renderDashboard', 'Home Hub dashboard route integration must remain present');
includes(dashboard, 'dashboardResolveProfile_', 'Home Hub profile resolver must remain present');
includes(dashboard, 'APP_STATE.profile', 'Home Hub must retain the saved profile from app state');
includes(dashboard, 'payload.profileAuthority', 'Home Hub must retain the accepted profile-authority resolution path');
includes(dashboard, 'dashboardApplyCurrentHomeProfile_', 'Resolved Home Hub identity must continue to be applied to the rendered UI');

// Appearance restoration/integration and shared Appearance runtime.
includes(app, 'appRestoreBottomNavAppearance_', 'App startup must retain the saved Appearance restoration integration point');
includes(appearanceRuntime, 'AppearanceThemeRuntime', 'Shared AppearanceThemeRuntime must remain installed');
includes(appearanceRuntime, 'confidencePresentation', 'Accepted Appearance presentation runtime must remain represented');

// Bottom navigation source of truth and app integration.
includes(navigationSlots, 'pattcBottomNavSlotsR1', 'Bottom-navigation slot source of truth must remain present');
includes(navigationSlots, 'function authoritativeRows()', 'Bottom navigation must retain authoritative persisted-row selection');
includes(navigationSlots, 'navigationSlotsR1 is authoritative', 'Bottom navigation must continue to declare navigationSlotsR1 as authority');
includes(navigationSlots, 'root.appRestoreBottomNavAppearance_ = function() { return false; };', 'Navigation authority must continue to neutralize the legacy rendered-DOM restore cache');
includes(app, 'appRestoreBottomNavAppearance_', 'App must retain bottom-navigation integration point');

// Current Loading / first-use How-To/onboarding path at this checkpoint.
includes(app, 'const APP_LOADER_STATE', 'Current role-aware Loading state must remain present');
includes(app, 'function showLoader(options)', 'Current Loading entrypoint must remain present');
includes(app, 'function setPageLoadStep(percent, adminDetail)', 'Current progressive Loading step marker must remain present');
includes(app, 'function hideLoader()', 'Current Loading completion entrypoint must remain present');
includes(app, 'profileOnboardingGeneral', 'Current first-use How-To/onboarding state marker must remain present');

// Compatibility mirrors: these are exact synchronization contracts.
assert.strictEqual(api, apiMirror, 'Compatibility mirror mismatch: frontend/js/api.js != frontend/api.js');
assert.strictEqual(app, appMirror, 'Compatibility mirror mismatch: frontend/js/app.js != frontend/app.js');

console.log('PASS release_candidate_smoke_harness_r1_tests');
