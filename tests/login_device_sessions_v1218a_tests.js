'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const auth = read('backend/AuthEngine.js');
const device = read('backend/engines/DeviceSessionEngine.js');
const api = read('backend/Api.js');
const security = read('backend/core/ApiSecurity.js');
const frontendApi = read('frontend/js/api.js');
const frontendApiMirror = read('frontend/api.js');
const state = read('frontend/js/state.js');
const authUi = read('frontend/js/auth.js');
const authPage = read('frontend/js/pages/auth.js');
const index = read('frontend/index.html');
const app = read('frontend/js/app.js');
const appMirror = read('frontend/app.js');
const css = read('frontend/css/styles.css');
const pwa = read('frontend/js/pwa.js');
const sw = read('frontend/sw.js');
const schema = read('backend/Schema.js');
const users = read('backend/engines/UsersEngine.js');
const admin = read('backend/admin/AdminTools.js');

assert(schema.includes('UserSessions:'), 'UserSessions schema marker is missing.');
assert(device.includes('var USER_SESSIONS_SHEET = "UserSessions"'), 'Persistent UserSessions sheet is missing.');
assert(device.includes('TokenHash'), 'Device sessions must store hashed tokens.');
assert(device.includes('hashSessionTokenForStorage_(token)'), 'Raw session tokens must not be stored in UserSessions.');
assert(device.includes('authSessionDurationMs_'), 'Device-session expiry helper is missing.');
assert(device.includes('(rememberMe ? 90 : 1)'), 'Remembered device sessions should use a 90-day window.');
assert(device.includes('authRevokeDeviceSession_'), 'Current-device logout revocation is missing.');
assert(device.includes('authRevokeAllDeviceSessionsForUser_'), 'All-device revocation helper is missing.');
assert(device.includes('LastUsedAt'), 'Device sessions must track last use.');
assert(device.includes('sliding 90-day window'), 'Remembered sessions should extend on activity.');

assert(auth.includes('deviceId'), 'Login must accept device identity metadata.');
assert(auth.includes('deviceLabel'), 'Login must accept a friendly device label.');
assert(auth.includes('authCreateDeviceSession_'), 'Successful login must create a device session.');
assert(auth.includes('? 24 * 90'), 'Remember-me login must no longer expire after only 30 days.');
assert(auth.includes('findLegacyUserRecordBySessionToken_'), 'Pre-v1.2.18a sessions need a migration fallback.');
assert(auth.includes('authFindDeviceSession_'), 'Session validation must use per-device sessions.');
assert(auth.includes('function logoutSessionToken'), 'Backend logout route helper is missing.');

assert(api.includes('if (action === "logout")'), 'POST logout route is missing.');
assert(api.includes('logoutSessionToken(body.token)'), 'Logout must revoke the supplied session token.');
assert(api.includes('action === "logout" ||'), 'GET logout must be rejected as a write.');
assert(security.includes('persisted device-session store'), 'API security comment/contract should reflect device sessions.');

assert(frontendApi.includes('function apiGetOrCreateDeviceId_'), 'Frontend device ID helper is missing.');
assert(frontendApi.includes('deviceId: apiGetOrCreateDeviceId_()'), 'Login must send the device ID.');
assert(frontendApi.includes('async function apiLogout'), 'Frontend logout API is missing.');
assert.strictEqual(frontendApi, frontendApiMirror, 'Frontend API mirrors are out of sync.');

assert(state.includes('window.sessionStorage'), 'Unchecked remember-me must use sessionStorage.');
assert(state.includes('normalizedSession.rememberMe === false'), 'Storage selection must honor rememberMe=false.');
assert(state.includes('window.localStorage.removeItem("session")'), 'setSession must prevent stale remembered sessions from winning.');
assert(state.includes('window.sessionStorage.removeItem("session")'), 'clearSession must clear session-only logins too.');

assert(authUi.includes('AUTH_LOGIN_IN_FLIGHT'), 'Login double-submit guard is missing.');
assert(authUi.includes('Signing in…'), 'Login button needs an immediate signing-in state.');
assert(authUi.includes('Signed in ✓ Opening app…'), 'Successful login feedback is missing.');
assert(authUi.includes('redirectRememberedSession_'), 'Remembered-device auto-login is missing from the loaded auth script.');
assert(authUi.includes('window.location.replace("./app.html")'), 'Remembered login should enter the app without a second tap.');
assert.strictEqual(authUi, authPage, 'Auth compatibility files are out of sync.');

assert(index.includes('id="authBoot"'), 'Login page must start with a no-flash device-check shell.');
assert(index.includes('id="loginButton"'), 'Login button needs a stable busy-state target.');
assert(index.includes('id="loginForm"'), 'Login should be a form so Enter and taps share one guarded path.');
assert(index.includes('Keep me signed in on this device'), 'Remember-device option disappeared.');
assert(index.includes('v1218a-device-login'), 'Login page cache marker is missing.');

assert(app.includes('recentlyValidated'), 'App should avoid immediately validating the same token twice.');
assert(app.includes('apiLogout(session.token)'), 'Logout must revoke the current device session before clearing local storage.');
assert(app.includes('window.location.replace("./index.html")'), 'Logout/session failure should replace history rather than bounce back.');
assert.strictEqual(app, appMirror, 'Frontend app mirrors are out of sync.');

assert(css.includes('.auth-boot-screen'), 'Branded startup/device-check screen styles are missing.');
assert(css.includes('.auth-login-button.is-loading'), 'Login busy-state styling is missing.');
assert(css.includes('min-height:100dvh'), 'Mobile login screen should use the dynamic viewport.');
assert(pwa.includes('v1218a-device-login'), 'PWA registration version was not bumped.');
assert(sw.includes('awards-app-v327-question-drag-order-v1216-v328-appearance-manager-v1217d-v1217g-iphone-pwa-recovery-v1217h-appearance-images-v1217i-appearance-runtime-v1217k-appearance-studio-v1217l-advanced-layout-v1217m-studio-canvas-v1217n-layout-repair-v1217o-team-canvas-v1217p-image-modes-v1217q-score-style-v1217r-page-question-designer-v1217s-preview-runtime-sync-v1217t-studio-refinement-v1217u-admin-help-v1217v-studio-control-fixes-v1217x-pack-selection-compact-actions-v1217x-pack-media-workflow-v1217y-pack-visibility-v1218a-device-login-v1218a1-auth-tabs-v1218b-home-hub-v1218c-player-hubs-v1218c1-home-identity-v1218c2-hub-media-gradients-v1218c3-live-preview-v1218c4-image-tone-league-cards-v1218c5-subhub-profile-alias-v1218c6-hub-nav-cleanup-v1218d-scoreboard-leaderboard-v1218d1-career-stats-cleanup-v1218e-player-identity-notifications-v1218e1-profile-polish-v1218f-push-notifications-v1218f1-global-mode-persistence-v1218f2-push-registration-v1218f3-registration-verification-v1218f4-notification-sheet-repair-v1218f5-vapid-alignment-v1218f6-pattc-predicts'), 'Service-worker cache version was not bumped.');

assert(users.includes('authRevokeAllDeviceSessionsForUser_'), 'PIN reset must revoke remembered device sessions.');
assert(admin.includes('authRevokeAllDeviceSessionsForUser_'), 'Admin reset/deactivation must revoke remembered device sessions.');

console.log('v1.2.18a login/device-session tests passed.');
