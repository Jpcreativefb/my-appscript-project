'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const profile = read('frontend/js/pages/profile.js');
const dashboard = read('frontend/js/pages/dashboard.js');
const profileEngine = read('backend/engines/ProfileEngine.js');
const profileCss = read('frontend/css/profile.css');
const pagesCss = read('frontend/css/pages.css');
const stylesCss = read('frontend/css/styles.css');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');

assert(profile.indexOf('renderProfileNotificationPreferences_(APP_STATE.notificationPreferences)') < profile.indexOf('renderProfileHistorySection_(historyRes, username)'), 'Notifications must render above Career History.');
assert(profile.includes('Use emoji just like texting'), 'Emoji picker guidance is missing.');
assert(profile.includes('Copy Image Address / Copy Image Link'), 'Internet-image instructions are missing.');
assert(profile.includes('Take Photo / Camera') && profile.includes('Photo Library') && profile.includes('Choose File / Files'), 'Phone photo picker guidance is incomplete.');
assert(profile.includes('prepareProfileAvatarFile_'), 'Client photo preparation helper is missing.');
assert(profile.includes('const maxDimensions = [1200, 1000, 850]'), 'Profile photos are not capped/resized for upload.');
assert(profile.includes('Preparing photo…') && profile.includes('Uploading photo…') && profile.includes('Photo uploaded ✓'), 'Photo upload progress states are missing.');
assert(profile.includes('profileUploadFullPreview'), 'Full photo upload preview is missing.');
assert(!profile.includes('<img'), 'Profile page must keep all image rendering on the shared platform image engine.');
assert(profile.includes('platformImgHtml(value, {'), 'Upload preview must render through platformImgHtml.');
assert(profileCss.includes('.profile-upload-full-preview img') && profileCss.includes('object-fit:contain'), 'Full upload preview must preserve the full image.');
assert(profileEngine.includes('payload.avatarEmoji,\n        32'), 'Compound emoji storage limit was not expanded.');

assert(dashboard.includes('dashboardProfileColorSpec_'), 'Home player card does not normalize full profile gradients.');
assert(dashboard.includes('--profile-theme-fill'), 'Home player card does not receive the saved gradient fill.');
assert(pagesCss.includes('var(--profile-theme-fill, var(--profile-theme-color, #354785))'), 'Home player card CSS does not display the saved gradient.');
assert(profile.includes('profilePreviewBackground_(resolvedProfile)'), 'Header avatar does not use the saved gradient.');

assert(stylesCss.includes('v1.2.18e1 — global bottom breathing room'), 'Global bottom-spacing fix is missing.');
assert(stylesCss.includes('calc(118px + env(safe-area-inset-bottom, 0px))'), 'Global bottom spacing does not include the phone safe area.');

assert(app.includes('v1218e1-profile-polish'), 'App cache token was not bumped.');
assert(pwa.includes('v1218e1-profile-polish'), 'PWA cache token was not bumped.');
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'), 'Service worker cache token was not bumped.');
assert.strictEqual(app, appMirror, 'Frontend app mirrors are out of sync.');
console.log('v1.2.18e1 profile polish tests passed.');
