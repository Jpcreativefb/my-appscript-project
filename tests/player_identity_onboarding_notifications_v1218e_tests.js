'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const profile = read('frontend/js/pages/profile.js');
const profileEngine = read('backend/engines/ProfileEngine.js');
const gamesEngine = read('backend/engines/GamesEngine.js');
const adminGames = read('frontend/js/pages/adminGames.js');
const adminGamesBackend = read('backend/admin/AdminGames.js');
const notificationsEngine = read('backend/engines/NotificationsEngine.js');
const notificationsPage = read('frontend/js/pages/notifications.js');
const apiBackend = read('backend/Api.js');
const apiFrontend = read('frontend/js/api.js');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const auth = read('frontend/js/auth.js');
const authPage = read('frontend/js/pages/auth.js');
const dashboard = read('frontend/js/pages/dashboard.js');
const leaderboard = read('frontend/js/pages/leaderboard.js');
const userProfiles = read('backend/UserProfiles.js');
const pagesCss = read('frontend/css/pages.css');
const profileCss = read('frontend/css/profile.css');
const stylesCss = read('frontend/css/styles.css');
const appHtml = read('frontend/app.html');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');

// Exact new-game profile editing + return path.
assert(app.includes('profileEditContext'), 'New-game profile edit context is missing.');
assert(app.includes('Customize for This Game') || app.includes('Customize League / Season Profile'), 'New-game custom profile choice is missing.');
assert(profile.includes('Save & Continue to '), 'Game-specific Profile save does not clearly return to the selected game.');
assert(profile.includes('enterGame('), 'Game-specific Profile save does not return through the game entry flow.');
assert(profile.includes('Save Profile & Return Home'), 'General Profile save return-home action is missing.');
assert(profile.includes('navigate("dashboard")'), 'General Profile save does not return Home.');
assert(profile.includes('profileOnboardingGeneral'), 'First-registration General Profile onboarding context is missing.');
assert(auth.includes('profileOnboardingGeneral') && authPage.includes('profileOnboardingGeneral'), 'Signup does not start General Profile onboarding in both auth mirrors.');

// Profile design, reuse and preview.
assert(profile.includes('Reuse an Old Profile'), 'Old-profile reuse selector is missing.');
assert(profile.includes('Profile Style'), 'Profile Style editor is missing.');
assert(profile.includes('profileColorMode'), 'Solid/gradient profile style mode is missing.');
assert(profile.includes('profileColor2'), 'Second gradient color is missing.');
assert(profile.includes('profileGradientAngle'), 'Profile gradient angle is missing.');
assert(profile.includes('profileLeaderboardPreviewMini'), 'Leaderboard identity preview is missing.');
assert(profile.includes('profileCompactPreviewMini'), 'Compact identity preview is missing.');
assert(profileCss.includes('.profile-preview-variants'), 'Profile preview styling is missing.');
assert(profile.indexOf('class="card profile-form-card"') < profile.indexOf('renderProfileHistorySection_'), 'Career History must render below Profile to Edit.');

// Shared league/season profile support and Admin controls.
assert(profileEngine.includes('UserProfileScopes'), 'Shared league/season profile storage is missing.');
assert(profileEngine.includes('profileGetReusableProfiles_'), 'Reusable profile history API is missing.');
assert(profileEngine.includes('profileColorMode') && profileEngine.includes('profileColor2'), 'Profile gradient fields are not persisted by ProfileEngine.');
assert(gamesEngine.includes('PlayerProfileScope'), 'Games engine is missing PlayerProfileScope.');
assert(adminGames.includes('League / season shared profile'), 'Admin Player Profile Scope selector is missing league/season mode.');
assert(adminGames.includes('adminGamePlayerProfileGroupKey_'), 'Admin shared profile key control is missing.');
assert(adminGamesBackend.includes('playerProfileGroupKey'), 'Admin backend does not save the shared profile key.');

// In-app notification preferences + center.
assert(notificationsEngine.includes('NotificationPreferences'), 'Notification preference storage is missing.');
assert(notificationsEngine.includes('UserNotifications'), 'Notification Center storage is missing.');
assert(notificationsEngine.includes('apiGetUserNotifications'), 'Notification Center read API is missing.');
assert(notificationsEngine.includes('apiMarkNotificationRead'), 'Notification read-state API is missing.');
assert(notificationsEngine.includes('apiMarkAllNotificationsRead'), 'Mark-all-read API is missing.');
assert(notificationsEngine.includes('NotifyMakePicks'), 'Make-picks notification preference is missing.');
assert(notificationsEngine.includes('NotifyLockApproaching'), 'Lock notification preference is missing.');
assert(notificationsEngine.includes('NotifyFinalResults'), 'Final-results notification preference is missing.');
assert(notificationsEngine.includes('NotifyNewGames'), 'New-games notification preference is missing.');
assert(apiBackend.includes('getUserNotifications') && apiBackend.includes('saveNotificationPreferences'), 'Notification API routes are missing.');
assert(apiFrontend.includes('apiGetUserNotifications') && apiFrontend.includes('apiSaveNotificationPreferences'), 'Frontend notification API helpers are missing.');
assert(notificationsPage.includes('Notification Center'), 'Notification Center page is missing.');
assert(notificationsPage.includes('Mark all read'), 'Notification Center read-state UI is missing.');
assert(app.includes('"notifications": ["notifications"]'), 'Notification Center lazy route is missing.');
assert(dashboard.includes("navigate('notifications')"), 'More page does not expose Notification Center.');
assert(appHtml.includes('headerNotificationBadge'), 'Header unread badge is missing.');
assert(stylesCss.includes('.header-notification-badge'), 'Header unread badge styling is missing.');

// Career stats compact secondary expansion.
assert(pagesCss.includes('18e: secondary career stats should be half-height'), '18e compact secondary Career Stats override is missing.');
assert(pagesCss.includes('.dashboard-career-extra strong { font-size:14px!important'), 'Secondary Career Stats are not compact enough.');

// Profile gradient identity reaches actual leaderboard avatar presentation.
assert(userProfiles.includes('profileColorMode'), 'Leaderboard profile normalization does not carry profile gradient mode.');
assert(userProfiles.includes('profileGradientAngle'), 'Leaderboard profile normalization does not carry profile gradient angle.');
assert(leaderboard.includes('leaderboardProfileBackground_'), 'Leaderboard does not consume player profile gradients.');

// Cache/PWA + mirrors.
assert(app.includes('v1218e-player-identity-notifications'), 'App cache version was not bumped for v1.2.18e.');
assert(pwa.includes('v1218e-player-identity-notifications'), 'PWA version was not bumped for v1.2.18e.');
assert(sw.includes('v1218e-player-identity-notifications'), 'Service worker cache was not bumped for v1.2.18e.');
assert.strictEqual(app, appMirror, 'Frontend app mirrors are out of sync.');

console.log('v1.2.18e player identity / onboarding / notification center tests passed.');
