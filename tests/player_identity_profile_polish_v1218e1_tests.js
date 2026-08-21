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
assert(sw.includes('v1218e1-profile-polish'), 'Service worker cache token was not bumped.');
assert.strictEqual(app, appMirror, 'Frontend app mirrors are out of sync.');
console.log('v1.2.18e1 profile polish tests passed.');
