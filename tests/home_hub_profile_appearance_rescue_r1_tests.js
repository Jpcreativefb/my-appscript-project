'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const dashboard = read('frontend/js/pages/dashboard.js');
const appData = read('backend/engines/AppDataEngine.js');
const profilePage = read('frontend/js/pages/profile.js');

function extractFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, name + ' is missing');
  const next = source.indexOf('\nfunction ', start + 10);
  return source.slice(start, next >= 0 ? next : source.length);
}

const resolverSource = [
  'dashboardProfileCandidate_',
  'dashboardProfileHasData_',
  'dashboardProfileQuality_',
  'dashboardResolveProfile_'
].map(name => extractFunction(dashboard, name)).join('\n');
const context = {};
vm.createContext(context);
vm.runInContext(resolverSource, context);

const stale = {
  username: 'alice',
  displayName: 'alice',
  avatarType: 'initials',
  avatarInitials: 'A',
  profileColor: '#354785'
};
const saved = {
  username: 'alice',
  scope: 'general',
  displayName: 'Alice Champ',
  avatarType: 'emoji',
  avatarEmoji: '⭐',
  bio: 'Defending champ',
  profileColor: '#123456',
  profileColorMode: 'gradient',
  profileColor2: '#654321',
  profileGradientAngle: '90'
};
const resolved = vm.runInContext(
  'dashboardResolveProfile_(' + JSON.stringify(stale) + ',' + JSON.stringify(saved) + ',"alice","saved-general")',
  context
);
assert.strictEqual(resolved.displayName, 'Alice Champ', 'richer authoritative payload must replace stale APP_STATE.profile');
assert.strictEqual(resolved.avatarEmoji, '⭐');
assert.strictEqual(resolved.bio, 'Defending champ');
assert.strictEqual(resolved.profileColor, '#123456');
assert.strictEqual(resolved.profileColor2, '#654321');

const preserved = vm.runInContext(
  'dashboardResolveProfile_(' + JSON.stringify(saved) + ',{},"alice","saved-general")',
  context
);
assert.strictEqual(preserved.displayName, 'Alice Champ', 'empty payload must not erase a valid APP_STATE.profile');
const usernameOnly = vm.runInContext(
  'dashboardResolveProfile_(' + JSON.stringify(saved) + ',{"username":"alice"},"alice","saved-general")',
  context
);
assert.strictEqual(usernameOnly.displayName, 'Alice Champ', 'username-only payload must not erase a valid APP_STATE.profile');

const fastStart = appData.indexOf('  if (fastStartup) {');
const fastEnd = appData.indexOf('\n  // Home used to calculate category/pick/wager progress', fastStart);
assert(fastStart >= 0 && fastEnd > fastStart, 'fast Home block not found');
const fastBlock = appData.slice(fastStart, fastEnd);
assert(fastBlock.includes('profile: profile'), 'fast Home must include the lightweight saved profile');
assert(fastBlock.includes('profileAuthority: "saved-general"'), 'fast Home must identify saved-general profile authority');
assert(fastBlock.includes('hubAppearance: hubAppearance'), 'fast Home must include Hub Appearance rows');
assert(!fastBlock.includes('profile: {}'), 'fast Home must not hard-code an empty profile');
assert(!fastBlock.includes('hubAppearance: []'), 'fast Home must not hard-code empty Hub Appearance');
assert(appData.includes('const profile = appDashboardGeneralProfile_(username);'), 'Dashboard must use the lightweight general-profile reader');
assert(appData.includes('const hubAppearance = appDashboardHubAppearance_();'), 'Dashboard must use the lightweight Hub Appearance reader');
assert(appData.includes('if (!fastStartup && dashboardCacheKey)'), 'fast Home must not consume the richer Dashboard payload cache');
assert(!appData.includes('getUserProfileHistory'), 'Dashboard first paint must not call profile/career history');

const renderStart = dashboard.indexOf('async function renderDashboardPage(options)');
const renderEnd = dashboard.indexOf('\nfunction renderDashboardProfileAvatar_', renderStart);
const renderBlock = dashboard.slice(renderStart, renderEnd);
assert.strictEqual((renderBlock.match(/apiGetDashboardGamesHub\(\{ fastStartup: true \}\)/g) || []).length, 1, 'Home first paint must make one compact Dashboard request');
assert(!renderBlock.includes('apiGetUserProfileHistory'), 'Home renderer must not add career history');
assert(!renderBlock.includes('apiGetEditableProfile'), 'Home renderer must not add a second profile API call');
assert(renderBlock.includes('APP_STATE.profile = profile;'), 'resolved Home profile must replace APP_STATE.profile');
assert(dashboard.includes('dashboardApplyCurrentHomeProfile_(profile, username);'), 'authoritative Home profile must repaint visible UI');
assert(dashboard.includes('mainAvatar.outerHTML = avatarHtml'), 'visible avatar must update with authoritative profile');
assert(dashboard.includes('heading.textContent = displayName'), 'visible display name must update with authoritative profile');
assert(dashboard.includes('note.textContent = bio'), 'visible bio must update with authoritative profile');
assert(dashboard.includes('--profile-theme-fill'), 'profile colors must update with authoritative profile');

assert(dashboard.includes('data-dashboard-hub-category='), 'Home Hub cards need an appearance repaint hook');
assert(dashboard.includes('dashboardApplyCurrentHomeAppearance_();'), 'late valid Appearance must repaint visible Home UI');
assert(dashboard.includes('card.style.setProperty("--dashboard-hub-color", colors.color)'), 'late Appearance must replace fallback Home color');
assert(dashboard.includes('card.style.setProperty("--dashboard-hub-fill", colors.fill)'), 'late Appearance must replace fallback Home fill');
assert(dashboard.includes('if (!list.length && typeof APP_STATE !== "undefined" && APP_STATE.dashboardHubAppearanceMap && Object.keys(APP_STATE.dashboardHubAppearanceMap).length)'), 'empty hubAppearance must preserve the last valid appearance map');

assert(profilePage.includes('APP_STATE.dashboardHomePayload = null;'), 'profile save must invalidate stale Home payload data');
assert(profilePage.includes('APP_STATE.dashboardHomePayloadLoadedAt = 0;'), 'profile save must invalidate stale Home payload timestamp');

console.log('Home Hub profile + appearance rescue R1: PASS');
